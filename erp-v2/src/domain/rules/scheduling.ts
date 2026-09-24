// Scheduling rules: class → sessions, session state by time, conflicts, class validation & edits.
// Test IDs in comments refer to NockERP-Staging-Test-2026-09-24.xlsx.

import { addDays, at, endTime, nextWeekday, overlaps, toMinutes, weekdayOf } from "../dates"
import type { Attendance, Branch, DateStr, Holiday, ID, Klass, Session, Staff, TimeStr } from "../types"

export const GENERATE_WEEKS = 8
export const CAPACITY = { single: 1, group: 6 } as const

export function isHoliday(date: DateStr, branchId: ID, holidays: Holiday[]) {
  return holidays.find((h) => h.date === date && (h.branchId === null || h.branchId === branchId))
}

/** A1/A12: learning classes repeat weekly for 8 weeks skipping holidays; other kinds are one-off. */
export function generateSessions(k: Klass, holidays: Holiday[], newId: () => ID, weeks = GENERATE_WEEKS): Session[] {
  const first = nextWeekday(k.startDate, k.weekday)
  const dates = k.kind === "learning" ? Array.from({ length: weeks }, (_, i) => addDays(first, i * 7)) : [first]
  return dates
    .filter((d) => !isHoliday(d, k.branchId, holidays))
    .map((date) => sessionFromClass(k, date, newId()))
}

export function sessionFromClass(k: Klass, date: DateStr, id: ID): Session {
  return {
    id,
    branchId: k.branchId,
    classId: k.id,
    subject: k.subject,
    date,
    start: k.start,
    minutes: k.minutes,
    teacherId: k.teacherId,
    roomId: k.roomId,
    studentIds: [...k.studentIds], // B1: sessions always carry the class roster
    trial: false,
    customized: false,
    cancelled: false,
  }
}

// ---------- state by time (B5, B6, C2) ----------

export type SessionState = "upcoming" | "live" | "ended" | "closed" | "cancelled"

/** Purely time-derived: no button press can make a future session "Live" or "Ended". */
export function sessionState(s: Session, now: Date): SessionState {
  if (s.cancelled) return "cancelled"
  const start = at(s.date, s.start)
  const end = at(s.date, endTime(s.start, s.minutes))
  if (now < start) return "upcoming"
  if (now < end) return "live"
  // closes at midnight after the session day
  const closeAt = at(addDays(s.date, 1), "00:00")
  return now < closeAt ? "ended" : "closed"
}

export const STATE_LABEL: Record<SessionState, string> = {
  upcoming: "กำลังจะถึง",
  live: "กำลังเรียน",
  ended: "จบแล้ว",
  closed: "ปิดแล้ว",
  cancelled: "ยกเลิก",
}

// ---------- conflicts (A5, A6, E4, E5) ----------

export interface Conflict {
  kind: "teacher" | "room" | "rooms_full"
  sessionIds: ID[]
  message: string
}

function span(s: { start: TimeStr; minutes: number }) {
  const a = toMinutes(s.start)
  return [a, a + s.minutes] as const
}

export function findConflicts(sessions: Session[], branch: Branch, staff: Staff[]): Conflict[] {
  const live = sessions.filter((s) => !s.cancelled && s.branchId === branch.id)
  const out: Conflict[] = []
  const byDate = new Map<DateStr, Session[]>()
  live.forEach((s) => byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]))

  for (const list of byDate.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]
        const [as, ae] = span(a), [bs, be] = span(b)
        if (!overlaps(as, ae, bs, be)) continue
        if (a.teacherId && a.teacherId === b.teacherId) {
          const t = staff.find((x) => x.id === a.teacherId)
          out.push({ kind: "teacher", sessionIds: [a.id, b.id], message: `ครู ${t?.nickname ?? "?"} สอนชนเวลา ${a.start}` })
        }
        if (a.roomId && a.roomId === b.roomId) {
          const r = branch.rooms.find((x) => x.id === a.roomId)
          out.push({ kind: "room", sessionIds: [a.id, b.id], message: `ห้อง ${r?.name ?? "?"} ถูกจองซ้ำเวลา ${a.start}` })
        }
      }
    }
    // more parallel sessions than rooms in the branch
    for (const s of list) {
      const [ss, se] = span(s)
      const parallel = list.filter((o) => overlaps(ss, se, ...span(o)))
      if (parallel.length > branch.rooms.length) {
        const ids = parallel.map((p) => p.id).sort()
        if (!out.some((c) => c.kind === "rooms_full" && c.sessionIds.join() === ids.join()))
          out.push({ kind: "rooms_full", sessionIds: ids, message: `${parallel.length} คาบพร้อมกัน แต่สาขามี ${branch.rooms.length} ห้อง` })
      }
    }
  }
  return out
}

// ---------- class validation (A3, A4, A5, A6, A7) ----------

export interface ClassDraft {
  branchId: ID
  subject: string
  kind: Klass["kind"]
  type: Klass["type"]
  teacherId: ID | null
  roomId: ID | null
  weekday: Klass["weekday"]
  start: TimeStr
  minutes: number
  startDate: DateStr
  studentIds: ID[]
  /** required to proceed past overridable blockers (closed day, teacher subject) */
  overrideReason?: string
}

export interface Issue {
  field: string
  message: string
  /** "block" = cannot save · "override" = can save with a reason · "warn" = info only */
  level: "block" | "override" | "warn"
}

export function validateClass(d: ClassDraft, ctx: { branch: Branch; staff: Staff[]; sessions: Session[]; holidays: Holiday[]; ignoreClassId?: ID; now?: Date }): Issue[] {
  const issues: Issue[] = []
  const { branch } = ctx
  if (!d.subject) issues.push({ field: "subject", message: "เลือกวิชา", level: "block" })
  if (d.minutes < 15) issues.push({ field: "minutes", message: "ความยาวคาบอย่างน้อย 15 นาที", level: "block" })

  const cap = CAPACITY[d.type]
  if (d.studentIds.length > cap)
    issues.push({ field: "studentIds", message: `คลาสแบบ ${d.type === "single" ? "เดี่ยว" : "กลุ่ม"} รับได้ไม่เกิน ${cap} คน (ตอนนี้ ${d.studentIds.length})`, level: "block" })

  const hours = branch.hours[d.weekday]
  const [s, e] = [toMinutes(d.start), toMinutes(d.start) + d.minutes]
  if (!hours) issues.push({ field: "weekday", message: "สาขาปิดวันนี้", level: "override" })
  else if (s < toMinutes(hours.open) || e > toMinutes(hours.close))
    issues.push({ field: "start", message: `อยู่นอกเวลาเปิดสาขา (${hours.open}–${hours.close})`, level: "override" })

  const teacher = ctx.staff.find((t) => t.id === d.teacherId)
  if (d.teacherId && teacher && !teacher.active) issues.push({ field: "teacherId", message: "ครูคนนี้ไม่ได้ทำงานแล้ว", level: "block" })
  if (teacher && !teacher.subjects.includes(d.subject))
    issues.push({ field: "teacherId", message: `ครู ${teacher.nickname} ไม่ได้สอนวิชา ${d.subject}`, level: "override" })
  if (!d.teacherId) issues.push({ field: "teacherId", message: "ยังไม่ได้กำหนดครู", level: "warn" })

  // check every date the class will occupy
  const first = nextWeekday(d.startDate, d.weekday)
  const dates = d.kind === "learning" ? Array.from({ length: GENERATE_WEEKS }, (_, i) => addDays(first, i * 7)) : [first]
  const others = ctx.sessions.filter((x) => !x.cancelled && x.branchId === d.branchId && x.classId !== ctx.ignoreClassId)
  const teacherClash = new Set<DateStr>(), roomClash = new Set<DateStr>(), full = new Set<DateStr>()
  for (const date of dates) {
    if (isHoliday(date, d.branchId, ctx.holidays)) continue
    const same = others.filter((x) => x.date === date && overlaps(s, e, ...span(x)))
    if (d.teacherId && same.some((x) => x.teacherId === d.teacherId)) teacherClash.add(date)
    if (d.roomId && same.some((x) => x.roomId === d.roomId)) roomClash.add(date)
    if (same.length + 1 > branch.rooms.length) full.add(date)
  }
  const list = (set: Set<DateStr>) => [...set].slice(0, 3).join(", ") + (set.size > 3 ? ` +${set.size - 3}` : "")
  if (teacherClash.size) issues.push({ field: "teacherId", message: `ครูมีสอนชนเวลา: ${list(teacherClash)}`, level: "block" })
  if (roomClash.size) issues.push({ field: "roomId", message: `ห้องนี้ถูกใช้แล้ว: ${list(roomClash)}`, level: "block" })
  if (full.size) issues.push({ field: "roomId", message: `ห้องเต็มทุกห้อง (${branch.rooms.length} ห้อง): ${list(full)}`, level: "block" })
  if (ctx.now && at(first, d.start) < ctx.now) issues.push({ field: "start", message: "เวลาเริ่มคาบแรกผ่านไปแล้ว — เลือกวัน/เวลาที่ยังไม่ถึง", level: "block" })
  if (d.weekday !== weekdayOf(first)) issues.push({ field: "weekday", message: "วันที่เริ่มไม่ตรงกับวันเรียน", level: "block" })
  return issues
}

export function canSave(issues: Issue[], overrideReason?: string) {
  if (issues.some((i) => i.level === "block")) return false
  if (issues.some((i) => i.level === "override")) return !!overrideReason?.trim()
  return true
}

// ---------- class edits (A8, A9, B3) ----------

/** Only sessions that haven't started, aren't individually customized and have no attendance are updated by class edits. */
export function editableByClass(s: Session, now: Date, attendance: Attendance[]) {
  return sessionState(s, now) === "upcoming" && !s.customized && !attendance.some((a) => a.sessionId === s.id)
}

export function applyClassEdit(
  k: Klass,
  patch: Partial<Pick<Klass, "teacherId" | "roomId" | "start" | "minutes" | "weekday">>,
  sessions: Session[],
  now: Date,
  attendance: Attendance[],
): { klass: Klass; sessions: Session[]; changed: number; kept: number } {
  const next = { ...k, ...patch }
  let changed = 0, kept = 0
  const updated = sessions.map((s) => {
    if (s.classId !== k.id) return s
    if (!editableByClass(s, now, attendance)) {
      kept++
      return s
    }
    changed++
    const dayShift = patch.weekday !== undefined ? (patch.weekday - k.weekday + 7) % 7 : 0
    return {
      ...s,
      date: dayShift ? addDays(s.date, dayShift) : s.date,
      start: next.start,
      minutes: next.minutes,
      teacherId: next.teacherId,
      roomId: next.roomId,
    }
  })
  return { klass: next, sessions: updated, changed, kept }
}

/** B3: editing one session updates that record in place — never creates a second session. */
export function editSingleSession(s: Session, patch: Partial<Pick<Session, "date" | "start" | "minutes" | "teacherId" | "roomId">>): Session {
  return { ...s, ...patch, customized: true }
}
