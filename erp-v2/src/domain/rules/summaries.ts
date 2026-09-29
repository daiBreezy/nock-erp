// Lesson summary workflow (D1–D8).

import { addDays, daysBetween, toDateStr } from "../dates"
import type { Attendance, DateStr, LessonSummary, Parent, Result, Session, Staff } from "../types"
import { requireForceRemark } from "./notifications"
import { can } from "./permissions"

/** D1: a summary slot exists only for students marked present. */
export function needsSummary(a: Attendance) {
  return a.status === "present"
}

export function canEdit(s: LessonSummary, user: Staff): Result {
  if (s.status === "sent") return { ok: false, error: "ส่งถึงผู้ปกครองแล้ว แก้ไม่ได้" }
  if (s.status === "approved" || s.status === "submitted") {
    return { ok: false, error: "สรุปนี้รออนุมัติ/อนุมัติแล้ว — กด \"ขอแก้ไข\" เพื่อส่งกลับก่อน" }
  }
  if (s.authorId !== user.id && !can(user, "summary.approve")) return { ok: false, error: "แก้ได้เฉพาะครูผู้เขียน" }
  return { ok: true, value: undefined }
}

/** D8: approver must not be the author or the last editor (maker–checker, same as invoices). */
export function canApprove(s: LessonSummary, user: Staff): Result {
  if (s.status !== "submitted") return { ok: false, error: "สรุปนี้ไม่ได้รออนุมัติ" }
  if (!can(user, "summary.approve")) return { ok: false, error: "คุณไม่มีสิทธิ์อนุมัติสรุปการเรียน" }
  if (s.authorId === user.id || s.lastEditorId === user.id) return { ok: false, error: "คนเขียน/แก้ล่าสุดอนุมัติเองไม่ได้" }
  return { ok: true, value: undefined }
}

/** Force: author/last editor approves their own summary — remark required, branch + Director notified. */
export function canForceApprove(s: LessonSummary, user: Staff, remark: string): Result {
  const r = canApprove(s, user)
  if (r.ok) return { ok: false, error: "อนุมัติแบบปกติได้ — ไม่ต้อง Force" }
  if (s.status !== "submitted" || !can(user, "summary.approve")) return r
  const miss = requireForceRemark(remark)
  return miss ? { ok: false, error: miss } : { ok: true, value: undefined }
}

/** Owner 2026-09-29: a summary must reach the parent within 7 days after the class ended. */
export const SEND_WITHIN_DAYS = 7

/** last moment to send (end of the 7th day after the session) and whether it has passed */
export function sendDeadline(se: Pick<Session, "date">, now: Date): { deadline: DateStr; overdue: boolean; daysLeft: number } {
  const deadline = addDays(se.date, SEND_WITHIN_DAYS)
  const daysLeft = daysBetween(toDateStr(now), deadline)
  return { deadline, overdue: daysLeft < 0, daysLeft }
}

/** D5: send only after approval; tells the truth when no parent is linked to LINE. */
export function canSend(s: LessonSummary, parents: Parent[]): Result<{ delivered: boolean }> {
  if (s.status !== "approved") return { ok: false, error: "ต้องอนุมัติก่อนส่งผู้ปกครอง" }
  return { ok: true, value: { delivered: parents.some((p) => p.lineLinked) } }
}

export const SUMMARY_STATUS_LABEL: Record<LessonSummary["status"], string> = {
  draft: "ร่าง",
  submitted: "รออนุมัติ",
  changes_requested: "ขอแก้ไข",
  approved: "อนุมัติแล้ว · ยังไม่ส่ง",
  sent: "ส่งแล้ว",
}
