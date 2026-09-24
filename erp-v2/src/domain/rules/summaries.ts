// Lesson summary workflow (D1–D8).

import type { Attendance, LessonSummary, Parent, Result, Staff } from "../types"
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
