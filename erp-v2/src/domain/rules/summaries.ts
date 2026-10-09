// Lesson summary workflow (D1–D8).

import { addDays, daysBetween, toDateStr } from "../dates"
import type { Attendance, DateStr, Entitlement, ID, LessonSummary, Parent, Result, Session, Staff } from "../types"
import { requireForceRemark } from "./notifications"
import { can } from "./permissions"
import { LOST_AFTER_DAYS } from "./reports"

/** D1: a summary slot exists only for students marked present. */
export function needsSummary(a: Attendance) {
  return a.status === "present"
}

/** Shape shared by LessonSummary and CourseSummary — lets the maker–checker rules below work on either. */
type SummaryLike = Pick<LessonSummary, "status" | "authorId" | "lastEditorId">

export function canEdit(s: SummaryLike, user: Staff): Result {
  if (s.status === "sent") return { ok: false, error: "ส่งถึงผู้ปกครองแล้ว แก้ไม่ได้" }
  // D4 (owner 2026-10-09): once approved a summary is locked for good
  if (s.status === "approved") return { ok: false, error: "สรุปนี้อนุมัติแล้ว แก้ไม่ได้อีก" }
  if (s.status === "submitted") return { ok: false, error: "สรุปนี้รออนุมัติ — ผู้อนุมัติกด \"ขอแก้ไข\" เพื่อส่งกลับก่อน" }
  if (s.authorId !== user.id && !can(user, "summary.approve")) return { ok: false, error: "แก้ได้เฉพาะครูผู้เขียน" }
  return { ok: true, value: undefined }
}

/** D4 (owner 2026-10-09): only a summary still waiting for approval can be sent back — approved / sent are locked. */
export function canRequestChanges(s: SummaryLike, user: Staff): Result {
  if (!can(user, "summary.approve")) return { ok: false, error: "คุณไม่มีสิทธิ์" }
  if (s.status !== "submitted") return { ok: false, error: s.status === "approved" || s.status === "sent" ? "สรุปนี้อนุมัติแล้ว แก้ไม่ได้อีก" : "สรุปนี้ไม่ได้รออนุมัติ" }
  return { ok: true, value: undefined }
}

/** D8: approver must not be the author or the last editor (maker–checker, same as invoices). */
export function canApprove(s: SummaryLike, user: Staff): Result {
  if (s.status !== "submitted") return { ok: false, error: "สรุปนี้ไม่ได้รออนุมัติ" }
  if (!can(user, "summary.approve")) return { ok: false, error: "คุณไม่มีสิทธิ์อนุมัติสรุปการเรียน" }
  if (s.authorId === user.id || s.lastEditorId === user.id) return { ok: false, error: "คนเขียน/แก้ล่าสุดอนุมัติเองไม่ได้" }
  return { ok: true, value: undefined }
}

/** Force: author/last editor approves their own summary — remark required, branch + Director notified. */
export function canForceApprove(s: SummaryLike, user: Staff, remark: string): Result {
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
export function canSend(s: Pick<SummaryLike, "status">, parents: Parent[]): Result<{ delivered: boolean }> {
  if (s.status !== "approved") return { ok: false, error: "ต้องอนุมัติก่อนส่งผู้ปกครอง" }
  return { ok: true, value: { delivered: parents.some((p) => p.lineLinked) } }
}

export interface EntitlementRound {
  entitlementIds: ID[]
  /** the round's own CourseSummary is keyed on this — its latest entitlement */
  representativeId: ID
  courseId: ID
  studentId: ID
  from: DateStr
  to: DateStr
}

/**
 * Owner 2026-10-06: a "round" for Course Summary purposes is a continuous run of entitlements for the same
 * course — a monthly package renewed back-to-back month after month is still ONE round, so it gets one
 * Course Summary, not one per billing cycle. A gap longer than LOST_AFTER_DAYS (the same threshold Reports
 * already uses to call a student "lost, then returning" in studentEvents) starts a new round instead.
 */
export function entitlementRounds(ents: Pick<Entitlement, "id" | "studentId" | "courseId" | "from" | "to">[]): EntitlementRound[] {
  const byKey = new Map<string, typeof ents>()
  ents.forEach((e) => {
    const key = `${e.studentId}:${e.courseId}`
    byKey.set(key, [...(byKey.get(key) ?? []), e])
  })
  const rounds: EntitlementRound[] = []
  byKey.forEach((list) => {
    const sorted = [...list].sort((a, b) => a.from.localeCompare(b.from))
    let chain: typeof sorted = []
    const flush = () => {
      if (!chain.length) return
      rounds.push({
        entitlementIds: chain.map((x) => x.id), representativeId: chain[chain.length - 1].id,
        courseId: chain[0].courseId, studentId: chain[0].studentId, from: chain[0].from, to: chain[chain.length - 1].to,
      })
      chain = []
    }
    sorted.forEach((e) => {
      if (chain.length && e.from > addDays(chain[chain.length - 1].to, LOST_AFTER_DAYS)) flush()
      chain.push(e)
    })
    flush()
  })
  return rounds
}

/** Owner 2026-10-06: a course summary is written looking back at the whole round, so it only makes sense once
 *  the package is ending soon or already over — not partway through. One per round (see entitlementRounds),
 *  never merged across a student's genuinely separate purchases of the same course. */
export function courseSummaryDue(e: Pick<Entitlement, "to">, today: DateStr, renewalDays: number): boolean {
  return e.to <= addDays(today, renewalDays)
}

/** Owner 2026-10-06: a course summary should reach the parent within 7 days of the round ending. */
export const COURSE_SUMMARY_DEADLINE_DAYS = 7

export function courseSummaryDeadline(e: Pick<Entitlement, "to">, now: Date): { deadline: DateStr; overdue: boolean; daysLeft: number } {
  const deadline = addDays(e.to, COURSE_SUMMARY_DEADLINE_DAYS)
  const daysLeft = daysBetween(toDateStr(now), deadline)
  return { deadline, overdue: daysLeft < 0, daysLeft }
}

/** Owner 2026-10-06: fixed keyword lists for sorting a session note into Strengths vs To Improve — not
 *  sentiment analysis, just a word match, so it's exactly as auditable as the rest of this file's rules. */
const STRENGTH_WORDS = ["ดี", "เก่ง", "มั่นใจ", "คล่อง", "แม่นยำ", "ชำนาญ", "รวดเร็ว", "ตั้งใจ", "เรียบร้อย", "ยอดเยี่ยม", "พัฒนาขึ้น", "ดีขึ้น"]
const IMPROVE_WORDS = ["ควร", "ต้องฝึก", "ยังไม่", "พลาด", "ผิด", "ช้า", "สับสน", "ไม่เข้าใจ", "อ่อน", "ปรับปรุง", "ทบทวน", "ลืม", "เพิ่ม"]

/**
 * "Generate Summary" (owner 2026-10-06) — a fixed rule, not a real AI: the Course Summary IS the N session
 * summaries of this round, gathered into one — Overall Progress strings all of them together (nothing
 * invented), while Strengths / To Improve sort the same notes by a fixed keyword match (same "no numbers/text
 * invented" principle as domain/rules/insights.ts — a note that matches neither list just stays out of both).
 */
export function draftCourseSummary(sessionTexts: Pick<LessonSummary, "text">[]): { overallProgress: string; toImprove: string; strengths: string } {
  const notes = sessionTexts.map((x) => x.text.trim()).filter(Boolean)
  const overallProgress = notes.length ? `สรุปจาก ${notes.length} คาบ: ${notes.join(" · ")}` : ""
  const strengths = notes.filter((n) => STRENGTH_WORDS.some((w) => n.includes(w)))
  const toImprove = notes.filter((n) => IMPROVE_WORDS.some((w) => n.includes(w)))
  return { overallProgress, strengths: strengths.join(" · "), toImprove: toImprove.join(" · ") }
}

export const SUMMARY_STATUS_LABEL: Record<LessonSummary["status"], string> = {
  draft: "ร่าง",
  submitted: "รออนุมัติ",
  changes_requested: "ขอแก้ไข",
  approved: "อนุมัติแล้ว · ยังไม่ส่ง",
  sent: "ส่งแล้ว",
}
