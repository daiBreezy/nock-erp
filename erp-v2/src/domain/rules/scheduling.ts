// Scheduling rules: class → sessions, session state by time, conflicts, class validation & edits.
// Test IDs in comments refer to NockERP-Staging-Test-2026-09-24.xlsx.

import { addDays, at, endTime, fmtDate, fromMinutes, nextWeekday, overlaps, parseDate, toMinutes, weekdayOf } from "../dates"
import type { ClassBlock, DayBlocks, Attendance, Branch, DateStr, Holiday, ID, Klass, Result, Session, Staff, TimeStr, Weekday } from "../types"

export const GENERATE_WEEKS = 8
/** Soft limits only (owner 2026-09-30): a class takes any number of students — the app warns above 6, and above 3 for a
 *  class tagged "เรียนเดี่ยว" (private). Never blocks. */
export const CAPACITY = { single: 3, group: 6 } as const

const PRIORITY_RANK = { high: 3, medium: 2, low: 1 } as const

/** The active special period (e.g. Summer) covering this date — the highest priority wins when several overlap. */
export function periodOn(branch: Branch, date: DateStr) {
  return (branch.specialPeriods ?? [])
    .filter((p) => p.active && p.from <= date && date <= p.to)
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])[0]
}

/** Active special periods overlapping a date range — for banners on the calendar / holiday board. */
export function periodsIn(branch: Branch, from: DateStr, to: DateStr) {
  return (branch.specialPeriods ?? []).filter((p) => p.active && p.from <= to && from <= p.to).sort((a, b) => a.from.localeCompare(b.from))
}

/** Opening hours on a specific date: an active special period overrides the weekly hours */
export function hoursFor(branch: Branch, date: DateStr) {
  const sp = periodOn(branch, date)
  return (sp ? sp.hours : branch.hours)[weekdayOf(date)]
}

/** Why a slot can't be used on a date (closed / outside hours / break), or null */
export function slotProblem(branch: Branch, date: DateStr, start: TimeStr, minutes: number): string | null {
  const h = hoursFor(branch, date)
  const [s, e] = [toMinutes(start), toMinutes(start) + minutes]
  if (!h) return "สาขาปิด"
  if (s < toMinutes(h.open) || e > toMinutes(h.close)) return `นอกเวลาเปิด (${h.open}–${h.close})`
  return null
}

/** A company-wide holiday closes every branch except those that toggled it off (openBranchIds). */
export function closesBranch(h: Holiday, branchId: ID) {
  return h.branchId === branchId || (h.branchId === null && !h.openBranchIds?.includes(branchId))
}

export function isHoliday(date: DateStr, branchId: ID, holidays: Holiday[]) {
  return holidays.find((h) => h.date === date && closesBranch(h, branchId))
}

/** A1/A12: learning classes repeat weekly for 8 weeks skipping holidays; other kinds are one-off. */
/** Every subject of a class/session (multi-subject classes list several; otherwise just the primary one). */
export function subjectsOf(x: { subject: string; subjects?: string[] }): string[] {
  return x.subjects?.length ? x.subjects : [x.subject]
}

/** Rows of one Create Class form that overlap each other (same weekday, times overlap) — they would clash
 *  with each other once created, which the existing-session check cannot see yet. */
export function overlappingRows(rows: { weekday: Weekday; start: TimeStr; minutes: number }[]): [number, number][] {
  const out: [number, number][] = []
  rows.forEach((a, i) => rows.forEach((b, j) => {
    if (j <= i || a.weekday !== b.weekday) return
    if (overlaps(toMinutes(a.start), toMinutes(a.start) + a.minutes, toMinutes(b.start), toMinutes(b.start) + b.minutes)) out.push([i, j])
  }))
  return out
}

export function generateSessions(k: Klass, holidays: Holiday[], newId: () => ID, weeks = GENERATE_WEEKS, until?: DateStr): Session[] {
  const first = nextWeekday(k.startDate, k.weekday)
  // a special-period class runs every week to the end of its period (`until`), however long that is
  const count = until ? Math.max(0, Math.floor((parseDate(until).getTime() - parseDate(first).getTime()) / (7 * 86_400_000)) + 1) : weeks
  const dates = k.kind === "learning" ? Array.from({ length: count }, (_, i) => addDays(first, i * 7)) : [first]
  return dates
    .filter((d) => !until || d <= until)
    .filter((d) => !isHoliday(d, k.branchId, holidays))
    .map((date) => sessionFromClass(k, date, newId()))
}

export function sessionFromClass(k: Klass, date: DateStr, id: ID): Session {
  return {
    id,
    branchId: k.branchId,
    classId: k.id,
    subject: k.subject,
    subjects: k.subjects,
    date,
    start: k.start,
    minutes: k.minutes,
    teacherId: k.teacherId,
    coTeacherIds: [...k.coTeacherIds],
    roomId: k.roomId,
    studentIds: [...k.studentIds], // B1: sessions always carry the class roster
    trial: false,
    customized: false,
    cancelled: false,
  }
}

/** Primary + co-teachers of a session/class */
export function teachersOf(s: { teacherId: ID | null; coTeacherIds?: ID[] }): ID[] {
  return [s.teacherId, ...(s.coTeacherIds ?? [])].filter((x): x is ID => !!x)
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
  /** teacher nickname / room name / parallel count — for compact grouping in the UI */
  label: string
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
        const shared = teachersOf(a).filter((t) => teachersOf(b).includes(t))
        for (const tid of shared) {
          const t = staff.find((x) => x.id === tid)
          out.push({ kind: "teacher", sessionIds: [a.id, b.id], message: `${t?.nickname ?? "ครู"} สอนชนเวลา ${a.start}`, label: t?.nickname ?? "ครู" })
        }
        if (a.roomId && a.roomId === b.roomId) {
          const r = branch.rooms.find((x) => x.id === a.roomId)
          out.push({ kind: "room", sessionIds: [a.id, b.id], message: `${r?.name ?? "ห้อง"} ถูกจองซ้ำเวลา ${a.start}`, label: r?.name ?? "ห้อง" })
        }
      }
    }
    // more sessions running at the same instant than rooms in the branch (sweep over start times)
    for (const p of [...new Set(list.map((x) => toMinutes(x.start)))]) {
      const parallel = list.filter((o) => { const [os, oe] = span(o); return os <= p && p < oe })
      if (parallel.length > branch.rooms.length) {
        const ids = parallel.map((x) => x.id).sort()
        if (!out.some((c) => c.kind === "rooms_full" && c.sessionIds.join() === ids.join()))
          out.push({ kind: "rooms_full", sessionIds: ids, message: `${parallel.length} คาบพร้อมกัน แต่สาขามี ${branch.rooms.length} ห้อง`, label: String(parallel.length) })
      }
    }
  }
  return out
}

/**
 * Conflicts a change would CREATE. Problems that already existed before the change are not the change's fault —
 * otherwise an admin could never move a class out of a clash one step at a time.
 */
export function introducedConflicts(before: Session[], after: Session[], changedIds: ID[], branch: Branch, staff: Staff[], kinds: Conflict["kind"][] = ["teacher", "room"]) {
  const key = (c: Conflict) => `${c.kind}|${c.label}|${[...c.sessionIds].sort().join()}`
  const old = new Set(findConflicts(before, branch, staff).map(key))
  const touches = (c: Conflict) => kinds.includes(c.kind) && c.sessionIds.some((x) => changedIds.includes(x))
  const now = findConflicts(after, branch, staff).filter(touches)
  return { added: now.filter((c) => !old.has(key(c))), remaining: now.filter((c) => old.has(key(c))) }
}

// ---------- class validation (A3, A4, A5, A6, A7) ----------

export interface ClassDraft {
  branchId: ID
  subject: string
  subjects?: string[]
  kind: Klass["kind"]
  courseId?: ID | null
  type: Klass["type"]
  layout?: Klass["layout"]
  teacherId: ID | null
  coTeacherIds?: ID[]
  roomId: ID | null
  weekday: Klass["weekday"]
  start: TimeStr
  minutes: number
  startDate: DateStr
  studentIds: ID[]
  /** special-period class: runs only inside that period */
  periodId?: ID
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
  // owner 2026-09-28: session length is free, in 5-minute steps (it drives hour-package counting)
  if (!(d.minutes >= 5) || d.minutes % 5 !== 0) issues.push({ field: "minutes", message: "ความยาวคาบต้องอย่างน้อย 5 นาที และลงตัวทีละ 5 นาที", level: "block" })

  const cap = CAPACITY[d.type]
  if (d.studentIds.length > cap)
    issues.push({ field: "studentIds", message: `${d.type === "single" ? "คลาสเรียนเดี่ยว" : "คลาส"}มี ${d.studentIds.length} คน — แนะนำไม่เกิน ${cap} คน`, level: "warn" })

  const [s, e] = [toMinutes(d.start), toMinutes(d.start) + d.minutes]

  const teacher = ctx.staff.find((t) => t.id === d.teacherId)
  const allTeachers = teachersOf(d)
  for (const tid of allTeachers) {
    const t = ctx.staff.find((x) => x.id === tid)
    if (t && !t.active) issues.push({ field: "teacherId", message: `${t.nickname} ไม่ได้ทำงานแล้ว`, level: "block" })
  }
  const missing = teacher ? subjectsOf(d).filter((x) => !teacher.subjects.includes(x)) : []
  if (missing.length)
    issues.push({ field: "teacherId", message: `ครูหลัก ${teacher!.nickname} ไม่ได้สอนวิชา ${missing.join(", ")}`, level: "override" })
  if (!d.teacherId) issues.push({ field: "teacherId", message: allTeachers.length ? "ยังไม่ได้เลือกครูหลัก" : "ยังไม่ได้กำหนดครู", level: allTeachers.length ? "block" : "warn" })

  // check every date the class will occupy
  const first = nextWeekday(d.startDate, d.weekday)
  const dates = d.kind === "learning" ? Array.from({ length: GENERATE_WEEKS }, (_, i) => addDays(first, i * 7)) : [first]
  const others = ctx.sessions.filter((x) => !x.cancelled && x.branchId === d.branchId && x.classId !== ctx.ignoreClassId)
  const teacherClash = new Set<DateStr>(), roomClash = new Set<DateStr>(), full = new Set<DateStr>(), clashNames = new Set<string>()
  // opening hours / special periods are checked per date (no break times — owner 2026-09-28: staff handle breaks themselves)
  const slotIssues = new Map<string, DateStr[]>()
  for (const date of dates) {
    if (isHoliday(date, d.branchId, ctx.holidays)) continue
    const p = slotProblem(branch, date, d.start, d.minutes)
    if (p) slotIssues.set(p, [...(slotIssues.get(p) ?? []), date])
  }
  slotIssues.forEach((ds, p) =>
    issues.push({ field: "start", message: `${p}: ${ds.slice(0, 3).map((x) => fmtDate(x, { weekday: true })).join(", ")}${ds.length > 3 ? ` +${ds.length - 3} วัน` : ""}`, level: "override" }),
  )
  for (const date of dates) {
    if (isHoliday(date, d.branchId, ctx.holidays)) continue
    const same = others.filter((x) => x.date === date && overlaps(s, e, ...span(x)))
    for (const x of same)
      for (const t of teachersOf(x).filter((t) => allTeachers.includes(t))) {
        teacherClash.add(date)
        clashNames.add(ctx.staff.find((st) => st.id === t)?.nickname ?? "ครู")
      }
    if (d.roomId && same.some((x) => x.roomId === d.roomId)) roomClash.add(date)
    if (same.length + 1 > branch.rooms.length) full.add(date)
  }
  const list = (set: Set<DateStr>) => [...set].slice(0, 3).map((x) => fmtDate(x, { weekday: true })).join(", ") + (set.size > 3 ? ` +${set.size - 3} วัน` : "")
  if (teacherClash.size) issues.push({ field: "teacherId", message: `${[...clashNames].join(", ")} มีสอนชนเวลา: ${list(teacherClash)}`, level: "block" })
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
  patch: Partial<Pick<Klass, "teacherId" | "coTeacherIds" | "roomId" | "start" | "minutes" | "weekday">>,
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
      coTeacherIds: next.coTeacherIds,
      roomId: next.roomId,
    }
  })
  return { klass: next, sessions: updated, changed, kept }
}

/** B3: editing one session updates that record in place — never creates a second session. */
export function editSingleSession(s: Session, patch: Partial<Pick<Session, "date" | "start" | "minutes" | "teacherId" | "coTeacherIds" | "roomId">>): Session {
  return { ...s, ...patch, customized: true }
}

// ---------- drag & drop moves ----------

export type MoveScope = "one" | "following"

export interface MoveTarget {
  date: DateStr
  start: TimeStr
  /** undefined = keep */
  teacherId?: ID | null
  roomId?: ID | null
}

/**
 * Move a session (drag & drop). "one" edits only this session (marked customized);
 * "following" shifts this and every later editable session of the same class by the same day delta,
 * and updates the class template so future generation follows the new slot.
 */
export function moveSession(
  sessions: Session[],
  sessionId: ID,
  target: MoveTarget,
  scope: MoveScope,
  now: Date,
  attendance: Attendance[],
): { sessions: Session[]; movedIds: ID[]; kept: number; classPatch?: Partial<Klass> } {
  const src = sessions.find((s) => s.id === sessionId)!
  const dayDelta = Math.round((parseDate(target.date).getTime() - parseDate(src.date).getTime()) / 86400000)
  const who = (s: Session) => ({
    teacherId: target.teacherId === undefined ? s.teacherId : target.teacherId,
    coTeacherIds: target.teacherId === undefined ? s.coTeacherIds : s.coTeacherIds.filter((c) => c !== target.teacherId),
    roomId: target.roomId === undefined ? s.roomId : target.roomId,
  })
  if (scope === "one" || !src.classId) {
    const moved = { ...src, ...who(src), date: target.date, start: target.start, customized: true }
    return { sessions: sessions.map((s) => (s.id === sessionId ? moved : s)), movedIds: [sessionId], kept: 0 }
  }
  let kept = 0
  const movedIds: ID[] = []
  const updated = sessions.map((s) => {
    if (s.classId !== src.classId || s.date < src.date) return s
    if (s.id !== src.id && !editableByClass(s, now, attendance)) {
      kept++
      return s
    }
    movedIds.push(s.id)
    return { ...s, ...who(s), date: addDays(s.date, dayDelta), start: target.start }
  })
  const w = who(src)
  return {
    sessions: updated,
    movedIds,
    kept,
    classPatch: { weekday: weekdayOf(target.date), start: target.start, teacherId: w.teacherId, coTeacherIds: w.coTeacherIds, roomId: w.roomId },
  }
}

// ---------- work state for scanning the calendar ----------

export type WorkState = "scheduled" | "live" | "needs_attendance" | "needs_summary" | "done" | "cancelled"

export interface WorkInfo {
  state: WorkState
  marked: number
  present: number
  summariesDone: number
  /** minutes until start (scheduled) or elapsed fraction 0..1 (live) */
  startsInMin?: number
  progress?: number
  overdue?: boolean
}

/**
 * The single status shown on a calendar card, from the admin's point of view:
 * รอเริ่ม → กำลังเรียน → รอเช็คชื่อ → รอสรุป → เสร็จแล้ว. Overdue = still unfinished after the session day.
 */
export function workState(s: Session, now: Date, attendance: Attendance[], summaries: { sessionId: ID; studentId: ID; status: string }[]): WorkInfo {
  const t = sessionState(s, now)
  const att = attendance.filter((a) => a.sessionId === s.id)
  const present = att.filter((a) => a.status === "present")
  const summariesDone = present.filter((a) => summaries.some((x) => x.sessionId === s.id && x.studentId === a.studentId && x.status !== "draft" && x.status !== "changes_requested")).length
  const base = { marked: att.length, present: present.length, summariesDone }
  if (t === "cancelled") return { state: "cancelled", ...base }
  const start = at(s.date, s.start).getTime()
  if (t === "upcoming") return { state: "scheduled", ...base, startsInMin: Math.round((start - now.getTime()) / 60000) }
  if (t === "live") return { state: "live", ...base, progress: (now.getTime() - start) / (s.minutes * 60000) }
  const overdue = t === "closed"
  if (att.length < s.studentIds.length) return { state: "needs_attendance", ...base, overdue }
  if (summariesDone < present.length) return { state: "needs_summary", ...base, overdue }
  return { state: "done", ...base }
}

export const WORK_LABEL: Record<WorkState, string> = {
  scheduled: "รอเริ่ม",
  live: "กำลังเรียน",
  needs_attendance: "รอเช็คชื่อ",
  needs_summary: "รอสรุป",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
}

// ---------- apply a change to one / following sessions (teachers, students) ----------

/**
 * Apply `change` to this session only, or to this and every later session of the same class
 * that `eligible` allows. Used for teacher changes and adding students from the session panel.
 */
/** A deleted class's leftover sessions (cancelled when the class was closed) — hidden from calendars and lists;
 *  a single session cancelled on its own stays visible (greyed) so the team knows to call the parents. */
export function removedWithClass(s: Pick<Session, "cancelled" | "classId">, classes: Pick<Klass, "id" | "active">[]) {
  return s.cancelled && !!s.classId && classes.find((k) => k.id === s.classId)?.active === false
}

/** Monday of the week a date falls in (weeks start Monday everywhere in this app) */
export function mondayOf(d: DateStr): DateStr {
  const wd = weekdayOf(d)
  return addDays(d, wd === 0 ? -6 : 1 - wd)
}

/**
 * Re-schedule (owner 2026-09-29): a student may move to another session of the same subject only inside the same
 * week (Mon→Tue ok, Mon→next Mon no — that is a leave). Admin decides after talking to the parent.
 */
export function canRescheduleStudent(from: Session, to: Session, studentId: ID, now: Date, capacity: number): Result {
  if (from.id === to.id) return { ok: false, error: "เลือกคาบอื่นที่ไม่ใช่คาบนี้" }
  if (!from.studentIds.includes(studentId)) return { ok: false, error: "นักเรียนไม่ได้อยู่ในคาบนี้" }
  if (sessionState(from, now) === "closed" || from.cancelled) return { ok: false, error: "คาบเดิมปิดหรือยกเลิกแล้ว" }
  if (to.cancelled || sessionState(to, now) !== "upcoming") return { ok: false, error: "ย้ายไปได้เฉพาะคาบที่ยังไม่เริ่ม" }
  if (mondayOf(from.date) !== mondayOf(to.date)) return { ok: false, error: "เลื่อนได้ภายในสัปดาห์เดียวกันเท่านั้น — ถ้าข้ามสัปดาห์ให้บันทึกเป็นการลา" }
  if (!subjectsOf(from).some((x) => subjectsOf(to).includes(x))) return { ok: false, error: "ย้ายได้เฉพาะคาบวิชาเดียวกัน" }
  if (to.studentIds.includes(studentId)) return { ok: false, error: "นักเรียนอยู่ในคาบนั้นแล้ว" }
  // capacity is a soft limit — moving in is allowed, the admin just gets told (owner 2026-09-30)
  return to.studentIds.length >= capacity ? { ok: true, value: undefined, warnings: [`คาบนั้นมี ${to.studentIds.length} คนแล้ว (แนะนำไม่เกิน ${capacity})`] } : { ok: true, value: undefined }
}

/** Teachers change only before class — except a session that started with NO teacher may still get one,
 *  otherwise nobody can take attendance or write the summaries (E2E 2026-09-28). Closed/cancelled stay locked. */
export function canChangeTeachers(s: Session, now: Date): Result {
  const st = sessionState(s, now)
  if (st === "upcoming") return { ok: true, value: undefined }
  if (st === "cancelled" || st === "closed") return { ok: false, error: "คาบนี้ปิดหรือยกเลิกแล้ว" }
  if (!s.teacherId) return { ok: true, value: undefined }
  return { ok: false, error: "เปลี่ยนครูได้เฉพาะคาบที่ยังไม่เริ่ม" }
}

export function applyToSessions(
  sessions: Session[],
  sessionId: ID,
  scope: MoveScope,
  change: (s: Session) => Session,
  eligible: (s: Session) => boolean,
): { sessions: Session[]; changedIds: ID[]; kept: number } {
  const src = sessions.find((s) => s.id === sessionId)!
  let kept = 0
  const changedIds: ID[] = []
  const out = sessions.map((s) => {
    const inScope = s.id === src.id || (scope === "following" && !!src.classId && s.classId === src.classId && s.date > src.date)
    if (!inScope) return s
    if (s.id !== src.id && !eligible(s)) {
      kept++
      return s
    }
    changedIds.push(s.id)
    return scope === "one" ? { ...change(s), customized: true } : change(s)
  })
  return { sessions: out, changedIds, kept }
}

/** A10: sessions hit by a new holiday */
/** Sessions a holiday would cancel — for a company holiday, only at branches that stay closed. */
export function holidayImpact(date: DateStr, branchId: ID | null, sessions: Session[], openBranchIds: ID[] = []) {
  return sessions.filter((s) => !s.cancelled && s.date === date && (branchId === null ? !openBranchIds.includes(s.branchId) : s.branchId === branchId))
}

const PRIO = { high: 3, medium: 2, low: 1 } as const

/** Active special periods covering a date, most important first (equal → the one added later). */
export function periodsOn(branch: Pick<Branch, "specialPeriods">, date: DateStr) {
  return branch.specialPeriods
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.active && p.from <= date && date <= p.to)
    .sort((a, b) => PRIO[b.p.priority] - PRIO[a.p.priority] || b.i - a.i)
    .map(({ p }) => p)
}

/**
 * The class blocks (rows of the teacher board) for a date (owner 2026-10-01):
 * 1. an active special period covering the date — its "this day only" blocks, else its blocks for that weekday
 * 2. a "this day only" change on a normal day
 * 3. the latest weekday plan that started on/before the date
 */
export function blocksOn(branch: Pick<Branch, "specialPeriods" | "blockDays" | "blockPlans">, date: DateStr): ClassBlock[] {
  const wd = weekdayOf(date)
  for (const p of periodsOn(branch, date)) {
    const own = p.blockDays?.[date] ?? p.blocks?.[wd]
    if (own) return sortBlocks(own)
  }
  if (branch.blockDays?.[date]) return sortBlocks(branch.blockDays[date])
  const plan = [...(branch.blockPlans ?? [])].filter((x) => x.from <= date).sort((a, b) => b.from.localeCompare(a.from))[0]
  return sortBlocks(plan?.byDay[wd] ?? [])
}

const sortBlocks = (b: ClassBlock[]) => [...b].sort((x, y) => x.start.localeCompare(y.start))

/** Which block a session starting at `time` belongs to. */
export function blockFor(blocks: ClassBlock[], time: TimeStr): ClassBlock | null {
  const m = toMinutes(time)
  return blocks.find((b) => m >= toMinutes(b.start) && m < toMinutes(b.end)) ?? null
}

export function validateBlocks(blocks: ClassBlock[]): string | null {
  const s = sortBlocks(blocks)
  for (const b of s) if (!b.start || !b.end || toMinutes(b.end) <= toMinutes(b.start)) return `ช่วง ${b.start || "?"}–${b.end || "?"} เวลาจบต้องหลังเวลาเริ่ม`
  for (let i = 1; i < s.length; i++) if (toMinutes(s[i].start) < toMinutes(s[i - 1].end)) return `ช่วง ${s[i - 1].start}–${s[i - 1].end} ทับกับ ${s[i].start}–${s[i].end}`
  return null
}

export type BlockScope = "day" | "following"
export type BlockDays = "same" | "weekdays" | "weekend" | "all"

const DAY_GROUP: Record<BlockDays, (wd: Weekday) => Weekday[]> = {
  same: (wd) => [wd],
  weekdays: () => [1, 2, 3, 4, 5],
  weekend: () => [6, 0],
  all: () => [0, 1, 2, 3, 4, 5, 6],
}

/**
 * Save blocks from a date (owner 2026-10-01). Inside an active special period the change stays in that period;
 * on normal days "day" = only that date, "following" = a new plan from that date for the chosen weekdays.
 */
export function applyBlocks(branch: Pick<Branch, "specialPeriods" | "blockDays" | "blockPlans">, date: DateStr, blocks: ClassBlock[], scope: BlockScope, days: BlockDays) {
  const clean = sortBlocks(blocks)
  const wds = DAY_GROUP[days](weekdayOf(date))
  const period = periodsOn(branch, date)[0]
  if (period) {
    const specialPeriods = branch.specialPeriods.map((p) => p.id !== period.id ? p
      : scope === "day" ? { ...p, blockDays: { ...p.blockDays, [date]: clean } }
      : { ...p, blocks: { ...p.blocks, ...Object.fromEntries(wds.map((w) => [w, clean])) } })
    return { specialPeriods, blockPlans: branch.blockPlans, blockDays: branch.blockDays, periodName: period.name }
  }
  if (scope === "day") return { specialPeriods: branch.specialPeriods, blockPlans: branch.blockPlans, blockDays: { ...branch.blockDays, [date]: clean }, periodName: null }
  const plans = branch.blockPlans ?? []
  const base = [...plans].filter((x) => x.from <= date).sort((a, b) => b.from.localeCompare(a.from))[0]
  const byDay: DayBlocks = { ...base?.byDay, ...Object.fromEntries(wds.map((w) => [w, clean])) }
  // later plans keep their own days but take this change for the same weekdays
  const later = plans.filter((x) => x.from > date).map((x) => ({ ...x, byDay: { ...x.byDay, ...Object.fromEntries(wds.map((w) => [w, clean])) } }))
  return { specialPeriods: branch.specialPeriods, blockPlans: [...plans.filter((x) => x.from < date), { from: date, byDay }, ...later], blockDays: branch.blockDays, periodName: null }
}

/** Which dates a block change from `date` reaches: that day, or every chosen weekday ahead (inside the period, if any). */
export function blockChangeReaches(branch: Pick<Branch, "specialPeriods">, date: DateStr, scope: BlockScope, days: BlockDays) {
  const wds = DAY_GROUP[days](weekdayOf(date))
  const period = periodsOn(branch, date)[0]
  return (d: DateStr) => scope === "day" ? d === date : d >= date && wds.includes(weekdayOf(d)) && (!period || d <= period.to)
}

/** Old block → new block, matched by position, only where the time actually moved. */
export function blockShifts(before: ClassBlock[], after: ClassBlock[]): { from: ClassBlock; to: ClassBlock }[] {
  const a = sortBlocks(before), b = sortBlocks(after)
  return a.slice(0, b.length).map((x, i) => ({ from: x, to: b[i] })).filter(({ from, to }) => from.start !== to.start || from.end !== to.end)
}

/**
 * Where a session/class at `start` (for `minutes`) goes when its block moves: same offset inside the block; one that
 * filled the whole old block fills the whole new one. null = its block didn't move.
 */
export function shiftInBlock(start: TimeStr, minutes: number, before: ClassBlock[], after: ClassBlock[]): { start: TimeStr; minutes: number } | null {
  const from = blockFor(before, start)
  if (!from) return null
  const m = blockShifts(before, after).find((x) => x.from.start === from.start)
  if (!m) return null
  const oldLen = toMinutes(m.from.end) - toMinutes(m.from.start)
  const newLen = toMinutes(m.to.end) - toMinutes(m.to.start)
  const at = toMinutes(m.to.start) + (toMinutes(start) - toMinutes(m.from.start))
  return { start: fromMinutes(at), minutes: minutes === oldLen && start === m.from.start ? newLen : minutes }
}

// ---------- special-period classes (owner 2026-10-01) ----------

/** Why a session sits out because of a special period — the period's id, or null when it runs. */
export function periodPause(s: Pick<Session, "date">, klass: Pick<Klass, "periodId"> | undefined, branch: Pick<Branch, "specialPeriods">): ID | null {
  if (!klass) return null // tests / trials / one-offs without a class are never paused
  if (klass.periodId) {
    const p = branch.specialPeriods.find((x) => x.id === klass.periodId)
    return !p || !p.active || s.date < p.from || s.date > p.to ? klass.periodId : null
  }
  return periodsOn(branch, s.date).find((p) => p.pauseRegular)?.id ?? null
}

/**
 * Bring sessions from today on in line with the branch's special periods: pause the ones that must sit out, bring back
 * the ones a period paused that may run again. Sessions cancelled for other reasons are left alone.
 */
export function syncPeriodSessions(sessions: Session[], classes: Klass[], branch: Branch, today: DateStr) {
  let paused = 0, restored = 0
  const out = sessions.map((s) => {
    if (s.branchId !== branch.id || s.date < today) return s
    const why = periodPause(s, classes.find((k) => k.id === s.classId), branch)
    if (why && !s.cancelled) { paused++; return { ...s, cancelled: true, pausedBy: why, cancelReason: `หยุดช่วง ${branch.specialPeriods.find((p) => p.id === why)?.name ?? "พิเศษ"}` } }
    if (!why && s.pausedBy) { restored++; return { ...s, cancelled: false, pausedBy: undefined, cancelReason: undefined } }
    return s
  })
  return { sessions: out, paused, restored }
}

/** Special classes of a period that still have students — asked about before the period is switched off or removed. */
export function periodClassesWithStudents(periodId: ID, classes: Klass[]) {
  return classes.filter((k) => k.periodId === periodId && k.active && k.studentIds.length > 0)
}
