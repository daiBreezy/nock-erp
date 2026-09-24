// Attendance, entitlements and student status (C1–C7, F4, F7, F8).

import { addDays, fmtDate } from "../dates"
import type { Attendance, AttendanceStatus, Course, Entitlement, ID, Klass, Result, Session, Student } from "../types"
import { sessionState } from "./scheduling"

/** C2: present/absent only once the session has started; leave may be recorded in advance. */
export function canMark(s: Session, status: AttendanceStatus, now: Date): Result {
  const st = sessionState(s, now)
  if (st === "cancelled") return { ok: false, error: "คาบนี้ถูกยกเลิกแล้ว" }
  if (st === "closed") return { ok: false, error: "คาบนี้ปิดแล้ว แก้ไขการเช็คชื่อไม่ได้" }
  if (st === "upcoming" && status !== "leave") return { ok: false, error: "ยังไม่ถึงเวลาเรียน — บันทึกล่วงหน้าได้เฉพาะ \"ลา\"" }
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
export function packageCovers(e: Entitlement, s: Pick<Session, "classId" | "subject" | "date">) {
  if (s.date < e.from || s.date > e.to) return false
  return s.classId ? s.classId === e.classId : s.subject === e.subject
}

/** Which paid package pays for this student's seat in this session (null = unpaid). */
export function coveringEntitlement(studentId: ID, s: Pick<Session, "classId" | "subject" | "date">, ents: Entitlement[]) {
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
}

/** C4: one definition of "remaining" used by every screen. */
export function balance(e: Entitlement, sessions: Session[], attendance: Attendance[]): Balance {
  const used = usedSessions(e, sessions, attendance)
  return { kind: e.kind, used, total: e.sessionsTotal, remaining: Math.max(0, e.sessionsTotal - used), until: e.to }
}

/** C5: leave quota = 1 per 4 sessions bought (min 1 for packs of 4+). Pending owner confirmation. */
export function leaveQuota(e: Entitlement) {
  return Math.floor(e.sessionsTotal / 4)
}

export function leavesUsed(e: Entitlement, sessions: Session[], attendance: Attendance[]) {
  const ids = new Set(sessions.filter((s) => packageCovers(e, s)).map((s) => s.id))
  return attendance.filter((a) => a.studentId === e.studentId && ids.has(a.sessionId) && a.status === "leave").length
}

export type StudentStatus = "active" | "expiring" | "inactive"

/** F7: status derived from entitlements, never stored. */
export function studentStatus(studentId: ID, ents: Entitlement[], today: string): StudentStatus {
  const active = activeEntitlements(studentId, ents, today)
  if (!active.length) return "inactive"
  const soon = addDays(today, 7)
  return active.every((e) => e.to <= soon) ? "expiring" : "active"
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
