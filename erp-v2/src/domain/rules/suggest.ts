// Conflict resolver: proposes concrete, pre-validated fixes instead of making the admin puzzle it out.
// Order = least disruptive first: room → teacher → time same day → another day.

import { addDays, endTime, fmtDate, fromMinutes, toMinutes } from "../dates"
import type { Attendance, Branch, Holiday, ID, Session, Staff } from "../types"
import { findConflicts, hoursFor, introducedConflicts, isHoliday, moveSession, sessionState, slotProblem, type MoveTarget } from "./scheduling"

export type FixKind = "room" | "teacher" | "time" | "day"

export interface FixSuggestion {
  kind: FixKind
  label: string
  detail: string
  target: MoveTarget
  /** true = this session has no conflicts left afterwards */
  clearsAll: boolean
}

interface Ctx {
  sessions: Session[]
  branch: Branch
  staff: Staff[]
  holidays: Holiday[]
  now: Date
  attendance: Attendance[]
}

const involving = (id: ID, sessions: Session[], ctx: Ctx) =>
  findConflicts(sessions.filter((x) => x.date === sessions.find((s) => s.id === id)?.date), ctx.branch, ctx.staff).filter((c) => c.sessionIds.includes(id))

export function suggestFixes(sessionId: ID, ctx: Ctx, perKind = 2): FixSuggestion[] {
  const s = ctx.sessions.find((x) => x.id === sessionId)
  if (!s || sessionState(s, ctx.now) !== "upcoming") return []
  const before = involving(sessionId, ctx.sessions, ctx).length
  if (!before) return []

  /** a target is good if it creates no new problem and leaves this session with fewer conflicts */
  const evaluate = (target: MoveTarget) => {
    if (isHoliday(target.date, s.branchId, ctx.holidays)) return null
    if (slotProblem(ctx.branch, target.date, target.start, s.minutes)) return null
    const start = new Date(`${target.date}T${target.start}:00`)
    if (start < ctx.now) return null
    const r = moveSession(ctx.sessions, sessionId, target, "one", ctx.now, ctx.attendance)
    if (introducedConflicts(ctx.sessions, r.sessions, r.movedIds, ctx.branch, ctx.staff, ["teacher", "room", "rooms_full"]).added.length) return null
    const left = involving(sessionId, r.sessions, ctx).length
    return left < before ? { clearsAll: left === 0 } : null
  }
  /** for time/day moves the old room may be taken — fall back to any free room */
  const withRoom = (base: MoveTarget) => {
    for (const roomId of [s.roomId, ...ctx.branch.rooms.map((r) => r.id).filter((r) => r !== s.roomId)]) {
      const t = { ...base, roomId }
      const ok = evaluate(t)
      if (ok) return { t, ok }
    }
    return null
  }
  const room = (id: ID | null | undefined) => ctx.branch.rooms.find((r) => r.id === id)?.name ?? "ไม่ระบุห้อง"
  const out: FixSuggestion[] = []
  const push = (kind: FixKind, label: string, detail: string, target: MoveTarget, clearsAll: boolean) => {
    if (out.filter((x) => x.kind === kind).length < perKind) out.push({ kind, label, detail, target, clearsAll })
  }

  // 1. another room, same time and teacher — parents don't need to know
  for (const r of ctx.branch.rooms) {
    if (r.id === s.roomId) continue
    const t = { date: s.date, start: s.start, roomId: r.id }
    const ok = evaluate(t)
    if (ok) push("room", `ย้ายไป${r.name}`, "เวลาเดิม · ครูเดิม · ไม่ต้องแจ้งผู้ปกครอง", t, ok.clearsAll)
  }

  // 2. another teacher who teaches the subject and is free
  const teachers = ctx.staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(s.branchId) && t.subjects.includes(s.subject) && t.id !== s.teacherId && !s.coTeacherIds.includes(t.id))
  for (const t of teachers) {
    const target = { date: s.date, start: s.start, teacherId: t.id }
    const ok = evaluate(target)
    if (ok) push("teacher", `ให้${t.nickname}สอนแทน`, `เวลาเดิม · ${room(s.roomId)}`, target, ok.clearsAll)
  }

  // 3. nearest free time on the same day
  const h = hoursFor(ctx.branch, s.date)
  if (h) {
    const cur = toMinutes(s.start)
    const slots: number[] = []
    for (let m = toMinutes(h.open); m + s.minutes <= toMinutes(h.close); m += 30) if (m !== cur) slots.push(m)
    slots.sort((a, b) => Math.abs(a - cur) - Math.abs(b - cur))
    for (const m of slots) {
      const found = withRoom({ date: s.date, start: fromMinutes(m) })
      if (found) push("time", `เลื่อนเป็น ${fromMinutes(m)}–${endTime(fromMinutes(m), s.minutes)}`, `วันเดิม · ${room(found.t.roomId)}`, found.t, found.ok.clearsAll)
      if (out.filter((x) => x.kind === "time").length >= perKind) break
    }
  }

  // 4. same time on another day (next two weeks)
  for (let i = 1; i <= 13 && out.filter((x) => x.kind === "day").length < perKind; i++) {
    const date = addDays(s.date, i)
    const found = withRoom({ date, start: s.start })
    if (found) push("day", `ย้ายไป ${fmtDate(date, { weekday: true })} ${s.start}`, `เวลาเดิม · ${room(found.t.roomId)} · ต้องแจ้งผู้ปกครอง`, found.t, found.ok.clearsAll)
  }

  // things that fix everything first, then the least disruptive kind
  const order: FixKind[] = ["room", "teacher", "time", "day"]
  return out.sort((a, b) => Number(b.clearsAll) - Number(a.clearsAll) || order.indexOf(a.kind) - order.indexOf(b.kind))
}
