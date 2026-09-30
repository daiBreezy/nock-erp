// Attendance, entitlements and student status (C1–C7, F4, F7, F8).

import { minutesCharged, seatOf } from "./seats"
import { addDays, daysBetween, fmtDate, weekdayOf } from "../dates"
import type { Attendance, AttendanceStatus, Course, DateStr, Entitlement, Holiday, ID, Klass, Result, Session, Staff, Student, StudentLeave } from "../types"
import { can } from "./permissions"
import { isHoliday, sessionState, subjectsOf } from "./scheduling"

/** Attendance can be prepared any time before the session closes, even before it starts (owner 2026-09-29 —
 *  replaces staging's C2 "leave only in advance"). Closed/cancelled sessions stay locked. */
export function canMark(s: Session, _status: AttendanceStatus, now: Date): Result {
  const st = sessionState(s, now)
  if (st === "cancelled") return { ok: false, error: "คาบนี้ถูกยกเลิกแล้ว" }
  if (st === "closed") return { ok: false, error: "คาบนี้ปิดแล้ว แก้ไขการเช็คชื่อไม่ได้" }
  return { ok: true, value: undefined }
}

/** C3: clearing a mark is allowed while the session is still open. */
export function canClear(s: Session, now: Date): Result {
  return sessionState(s, now) === "closed" ? { ok: false, error: "คาบนี้ปิดแล้ว" } : { ok: true, value: undefined }
}

export function activeEntitlements(studentId: ID, ents: Entitlement[], date: string) {
  return ents.filter((e) => e.studentId === studentId && e.from <= date && date <= e.to)
}

/** A session belongs to a package if it is a session of the package's class, or a one-off (make-up / extra) session of the same subject. */
export function packageCovers(e: Entitlement, s: Pick<Session, "classId" | "subject" | "subjects" | "date" | "rescheduledIn">) {
  if (s.date < e.from || s.date > e.to) return false
  const sameSubjects = subjectsOf(s).every((x) => e.subjects.includes(x))
  // a session the student was re-scheduled into (another class, same week) still draws from their package
  if (s.rescheduledIn?.includes(e.studentId)) return sameSubjects
  // multi-subject sessions (monthly only): the student's course must include every subject taught
  return s.classId ? e.classIds.includes(s.classId) : sameSubjects
}

/** Which paid package pays for this student's seat in this session (null = unpaid). */
export function coveringEntitlement(studentId: ID, s: Pick<Session, "classId" | "subject" | "subjects" | "date" | "rescheduledIn">, ents: Entitlement[]) {
  return ents.find((e) => e.studentId === studentId && packageCovers(e, s)) ?? null
}

/** Sessions used = present + absent (leave does not consume). */
export function usedSessions(e: Entitlement, sessions: Session[], attendance: Attendance[]) {
  const ids = new Set(sessions.filter((s) => packageCovers(e, s)).map((s) => s.id))
  return attendance.filter((a) => a.studentId === e.studentId && ids.has(a.sessionId) && a.status !== "leave").length
}

export interface Balance {
  kind: Entitlement["kind"]
  used: number
  total: number
  remaining: number
  until: string
  /** hour packs counted in minutes (Entitlement.minutesTotal) */
  remainingMinutes?: number
  totalMinutes?: number
}

/** C4: one definition of "remaining" used by every screen. Hour packs with `minutesTotal` are used up by the minutes
 *  really attended (a 1-hour visit to a 2-hour class takes 1 hour) and "sessions left" = minutes left ÷ the
 *  student's usual class length (owner 2026-09-30). */
export function balance(e: Entitlement, sessions: Session[], attendance: Attendance[], classes: Pick<Klass, "id" | "minutes" | "seats">[] = []): Balance {
  const used = usedSessions(e, sessions, attendance)
  if (!e.minutesTotal) return { kind: e.kind, used, total: e.sessionsTotal, remaining: Math.max(0, e.sessionsTotal - used), until: e.to }
  const byId = new Map(sessions.filter((s) => packageCovers(e, s)).map((s) => [s.id, s]))
  const klass = (id: string | null) => classes.find((k) => k.id === id)
  const usedMinutes = attendance
    .filter((a) => a.studentId === e.studentId && byId.has(a.sessionId))
    .reduce((m, a) => { const se = byId.get(a.sessionId)!; return m + minutesCharged(a, seatOf(se, e.studentId, klass(se.classId))) }, 0)
  const first = classes.find((k) => e.classIds.includes(k.id))
  const usual = (first && seatOf({ minutes: first.minutes }, e.studentId, first).minutes) || [...byId.values()][0]?.minutes || 60
  const remainingMinutes = Math.max(0, e.minutesTotal - usedMinutes)
  const remaining = Math.floor(remainingMinutes / usual)
  return { kind: e.kind, used, total: used + remaining, remaining, until: e.to, remainingMinutes, totalMinutes: e.minutesTotal }
}

/** C5: leave quota = 1 per 4 sessions bought (min 1 for packs of 4+). Pending owner confirmation. */
export function leaveQuota(e: Entitlement) {
  return Math.floor(e.sessionsTotal / 4)
}

/** Leave marks whose session date falls inside an active no-quota leave range don't count toward the quota. */
export function leavesUsed(e: Entitlement, sessions: Session[], attendance: Attendance[], leaves: StudentLeave[] = []) {
  const byId = new Map(sessions.map((s) => [s.id, s]))
  const ids = new Set(sessions.filter((s) => packageCovers(e, s)).map((s) => s.id))
  return attendance.filter((a) => {
    if (a.studentId !== e.studentId || !ids.has(a.sessionId) || a.status !== "leave") return false
    const sess = byId.get(a.sessionId)
    return !sess || !activeLeave(e.studentId, sess.date, leaves)
  }).length
}

export function leaveDays(l: Pick<StudentLeave, "from" | "to">) {
  return daysBetween(l.from, l.to) + 1 // inclusive
}

function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string) {
  return aFrom <= bTo && bFrom <= aTo
}

/** New: a no-quota leave pushes out the coverage window of every entitlement it overlaps, so a student never loses paid sessions to time away. */
export function effectiveTo(e: Entitlement, leaves: StudentLeave[]): DateStr {
  const extra = leaves.filter((l) => l.studentId === e.studentId && rangesOverlap(l.from, l.to, e.from, e.to)).reduce((sum, l) => sum + leaveDays(l), 0)
  return extra > 0 ? addDays(e.to, extra) : e.to
}

export interface MakeUpCtx {
  sessions: Session[]
  attendance: Attendance[]
  classes: Pick<Klass, "id" | "weekday" | "branchId">[]
  holidays: Holiday[]
}

/**
 * Leave with quota left (owner 2026-09-29): the quota is used and the package runs one class longer, so the
 * student never loses the session and the parent can be told the real last day. Leave after the quota is gone
 * adds nothing. Returns the leave sessions in date order, flagged whether the quota covered them.
 */
export function leaveLedger(e: Entitlement, ctx: MakeUpCtx, leaves: StudentLeave[] = []): { sessionId: ID; date: DateStr; quota: boolean }[] {
  const byId = new Map(ctx.sessions.map((s) => [s.id, s]))
  const q = leaveQuota(e)
  return ctx.attendance
    .filter((a) => a.studentId === e.studentId && a.status === "leave")
    .map((a) => byId.get(a.sessionId))
    .filter((s): s is Session => !!s && packageCovers(e, s) && !activeLeave(e.studentId, s.date, leaves))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map((s, i) => ({ sessionId: s.id, date: s.date, quota: i < q }))
}

/** the next `n` class meetings after `after` across the package's classes (skipping the branch's holidays) */
export function nextClassDates(klasses: Pick<Klass, "weekday" | "branchId">[], after: DateStr, n: number, holidays: Holiday[]): DateStr[] {
  const out: DateStr[] = []
  for (let d = addDays(after, 1), guard = 0; out.length < n && guard < 3660; d = addDays(d, 1), guard++) {
    for (const k of klasses) if (out.length < n && weekdayOf(d) === k.weekday && !isHoliday(d, k.branchId, holidays)) out.push(d)
  }
  return out
}

/** Resolve entitlements with their real end date — long leave pushes it out by days, each quota leave by one
 *  more class — so every coverage/balance/status/renewal check works against the real last day. */
export function resolveEntitlements(ents: Entitlement[], leaves: StudentLeave[], ctx?: MakeUpCtx): Entitlement[] {
  return ents.map((e) => {
    const base = leaves.length ? { ...e, to: effectiveTo(e, leaves) } : e
    const klasses = ctx ? ctx.classes.filter((k) => e.classIds.includes(k.id)) : []
    if (!ctx || !klasses.length) return base
    const n = leaveLedger(base, ctx, leaves).filter((l) => l.quota).length
    return n ? { ...base, to: nextClassDates(klasses, base.to, n, ctx.holidays)[n - 1] } : base
  })
}

export function activeLeave(studentId: ID, date: DateStr, leaves: StudentLeave[]): StudentLeave | undefined {
  return leaves.find((l) => l.studentId === studentId && l.from <= date && date <= l.to)
}

/** New: long leave (abroad/illness/accident) excluded from the leave quota, extends course end dates — remark always required; Admin/Manager approve directly, no escalation. */
export function canSaveLeave(user: Staff, from: DateStr, to: DateStr, reason: string): Result {
  if (!can(user, "attendance.leave_override")) return { ok: false, error: "คุณไม่มีสิทธิ์บันทึกการลาแบบนี้" }
  if (!from || !to || to < from) return { ok: false, error: "เลือกช่วงวันที่ให้ถูกต้อง" }
  if (!reason.trim()) return { ok: false, error: "กรอกหมายเหตุการลา" }
  return { ok: true, value: undefined }
}

/** active = has a running package · renewal = every package ends soon · inactive = automatic (no package, or on a
 *  long leave) · archived = left the school (set by hand only) — owner 2026-09-28 */
export type StudentStatus = "active" | "renewal" | "inactive" | "archived"

/** F7: status derived from entitlements, never stored. */
export interface StudentState {
  status: StudentStatus
  /** why inactive */
  reason?: "leave" | "no_package"
  /** since when the current status holds (inactive/archived) */
  since?: DateStr
  /** paid, first class still ahead — Active from payment confirmation (owner 2026-09-28) */
  startsOn?: DateStr
}

export function studentState(
  stu: Pick<Student, "id" | "archived">, ents: Entitlement[], leaves: StudentLeave[], today: string, renewalDays = 7,
): StudentState {
  if (stu.archived) return { status: "archived", since: stu.archived.at.slice(0, 10) }
  const onLeave = activeLeave(stu.id, today, leaves)
  if (onLeave) return { status: "inactive", reason: "leave", since: onLeave.from }
  const active = activeEntitlements(stu.id, ents, today)
  const upcoming = ents.filter((e) => e.studentId === stu.id && e.from > today).sort((a, b) => a.from.localeCompare(b.from))[0]
  if (!active.length && upcoming) return { status: "active", startsOn: upcoming.from }
  if (!active.length) {
    const last = ents.filter((e) => e.studentId === stu.id && e.to < today).sort((a, b) => b.to.localeCompare(a.to))[0]
    return { status: "inactive", reason: "no_package", since: last ? addDays(last.to, 1) : undefined }
  }
  const soon = addDays(today, renewalDays)
  return { status: active.every((e) => e.to <= soon) ? "renewal" : "active" }
}

/** Status only — for lists and filters. */
export function studentStatus(stu: Pick<Student, "id" | "archived">, ents: Entitlement[], leaves: StudentLeave[], today: string, renewalDays = 7): StudentStatus {
  return studentState(stu, ents, leaves, today, renewalDays).status
}

/** F4: low-balance alerts only for session packs — subscriptions alert on expiry instead. */
export function lowBalanceAlert(e: Entitlement, b: Balance, today: string, opts: { low?: number; days?: number } = {}): string | null {
  if (e.kind === "sessions") {
    if (b.remaining === 0) return "ใช้คาบหมดแล้ว"
    if (b.remaining <= (opts.low ?? 2)) return `เหลือ ${b.remaining} คาบ`
    return null
  }
  const soon = addDays(today, opts.days ?? 7)
  return e.to <= soon ? `แพ็กเกจหมดอายุ ${fmtDate(e.to)}` : null
}

/** F8: grade mismatch is a warning with override, not silent. */
export function gradeMismatch(student: Student, target: Pick<Course | Klass, "grades">) {
  return target.grades.length > 0 && !target.grades.includes(student.grade)
}

/** F1: removing a student from a class also removes them from all future sessions of it. */
export function removeFromClass(k: Klass, studentId: ID, sessions: Session[], now: Date): { klass: Klass; sessions: Session[]; removedFrom: number } {
  let removedFrom = 0
  const updated = sessions.map((s) => {
    if (s.classId !== k.id || sessionState(s, now) !== "upcoming" || !s.studentIds.includes(studentId)) return s
    removedFrom++
    return { ...s, studentIds: s.studentIds.filter((x) => x !== studentId) }
  })
  return { klass: { ...k, studentIds: k.studentIds.filter((x) => x !== studentId) }, sessions: updated, removedFrom }
}
