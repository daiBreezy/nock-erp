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
export const COURSE_SUMMARY_FIELD_MAX = 250

/** the most recent distinct notes that fit `max` characters joined with " · ", back in date order (owner 2026-10-14:
 *  a long course gave 700 characters of the same note repeated — each field holds 250) */
function fitNotes(notes: string[], max: number, prefix = ""): string {
  const unique = [...new Set(notes)]
  const picked: string[] = []
  let len = prefix.length
  for (let i = unique.length - 1; i >= 0; i--) {
    const add = unique[i].length + (picked.length ? 3 : 0)
    if (len + add > max) continue
    picked.unshift(unique[i])
    len += add
  }
  return picked.length ? prefix + picked.join(" · ") : ""
}

export function draftCourseSummary(sessionTexts: Pick<LessonSummary, "text">[], max = COURSE_SUMMARY_FIELD_MAX): { overallProgress: string; toImprove: string; strengths: string } {
  const notes = sessionTexts.map((x) => x.text.trim()).filter(Boolean)
  const overallProgress = notes.length ? fitNotes(notes, max, `สรุปจาก ${notes.length} คาบ: `) : ""
  const strengths = notes.filter((n) => STRENGTH_WORDS.some((w) => n.includes(w)))
  const toImprove = notes.filter((n) => IMPROVE_WORDS.some((w) => n.includes(w)))
  return { overallProgress, strengths: fitNotes(strengths, max), toImprove: fitNotes(toImprove, max) }
}

/** "คณิต: … · อังกฤษ: …" in one session note → the part for one subject (a whole note when it names no subject) */
export function noteForSubject(text: string, subject: string, subjects: string[]): string {
  const marks = subjects.map((x) => ({ x, i: text.indexOf(`${x}:`) })).filter((m) => m.i >= 0).sort((a, b) => a.i - b.i)
  if (!marks.length) return text
  const k = marks.findIndex((m) => m.x === subject)
  if (k < 0) return ""
  const end = k + 1 < marks.length ? marks[k + 1].i : text.length
  return text.slice(marks[k].i + subject.length + 1, end).replace(/[\s·|,]+$/, "").trim()
}

/** Owner 2026-10-13: a Bundle course gets one summary written per subject — each line starts with its subject.
 *  A note that covers several subjects ("คณิต: … · อังกฤษ: …") is split so each subject gets only its own part. */
export function draftBundleCourseSummary(groups: { subject: string; texts: Pick<LessonSummary, "text">[] }[]): { overallProgress: string; toImprove: string; strengths: string } {
  const subjects = groups.map((g) => g.subject)
  const parts = groups.map((g) => ({ subject: g.subject, texts: g.texts.map((t) => ({ text: noteForSubject(t.text, g.subject, subjects) })).filter((t) => t.text.trim()) }))
    .filter((g) => g.texts.length)
  // each subject gets an equal share of the field, its "วิชา: " label and line break included
  const share = (g: { subject: string }) => Math.floor(COURSE_SUMMARY_FIELD_MAX / Math.max(1, parts.length)) - g.subject.length - 3
  const drafted = parts.map((g) => ({ subject: g.subject, d: draftCourseSummary(g.texts, share(g)) }))
  const join = (k: "overallProgress" | "toImprove" | "strengths") => drafted.filter((p) => p.d[k]).map((p) => `${p.subject}: ${p.d[k]}`).join("\n")
  return { overallProgress: join("overallProgress"), toImprove: join("toImprove"), strengths: join("strengths") }
}

export const SUMMARY_STATUS_LABEL: Record<LessonSummary["status"], string> = {
  draft: "ร่าง",
  submitted: "รออนุมัติ",
  changes_requested: "ขอแก้ไข",
  approved: "อนุมัติแล้ว · ยังไม่ส่ง",
  sent: "ส่งแล้ว",
}

// ---------- Course Summary progress (owner 2026-10-14: "อยากเห็น Graph / Chart ที่ช่วยให้เห็นภาพพัฒนาการ") ----------

/** ความเข้าใจวันนี้ 1–5 — the teacher picks one when writing a session summary (owner 2026-10-14) */
export const LEVEL_LABEL: Record<number, string> = { 1: "ยังไม่เข้าใจ", 2: "เข้าใจบางส่วน", 3: "พอเข้าใจ", 4: "เข้าใจดี", 5: "เข้าใจดีมาก" }

export type Insight = { tone: "good" | "watch" | "info"; text: string }

export interface ProgressRow { date: DateStr; attended: "present" | "leave" | "absent" | null; level?: number; text?: string }

/** the numbers behind the Course Summary charts + the plain-language reading of them (the "AI" box without a model) */
export function courseProgress(rows: ProgressRow[]) {
  const done = rows.filter((r) => r.attended)
  const present = done.filter((r) => r.attended === "present").length
  const leave = done.filter((r) => r.attended === "leave").length
  const levels = rows.filter((r) => r.level).map((r) => r.level!)
  const third = Math.max(1, Math.floor(levels.length / 3))
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const first = avg(levels.slice(0, third))
  const last = avg(levels.slice(-third))
  const trend = first !== null && last !== null && levels.length >= 3 ? last - first : null
  const notes = rows.filter((r) => r.text?.trim()).map((r) => r.text!)
  const strengths = notes.filter((n) => STRENGTH_WORDS.some((w) => n.includes(w))).length
  const improves = notes.filter((n) => IMPROVE_WORDS.some((w) => n.includes(w))).length
  const rate = done.length ? present / done.length : null
  const insights: Insight[] = []
  if (rate !== null) insights.push(rate >= 0.9 ? { tone: "good", text: `มาเรียนสม่ำเสมอ ${Math.round(rate * 100)}% (${present}/${done.length} คาบ)` } : rate >= 0.75 ? { tone: "info", text: `มาเรียน ${Math.round(rate * 100)}% · ลา ${leave} คาบ` } : { tone: "watch", text: `มาเรียนแค่ ${Math.round(rate * 100)}% — ลา ${leave} คาบ ควรคุยกับผู้ปกครอง` })
  if (trend !== null) insights.push(trend >= 0.5 ? { tone: "good", text: `ความเข้าใจดีขึ้นชัดเจน จาก ${first!.toFixed(1)} เป็น ${last!.toFixed(1)} (เต็ม 5)` } : trend <= -0.5 ? { tone: "watch", text: `ความเข้าใจลดลง จาก ${first!.toFixed(1)} เหลือ ${last!.toFixed(1)} — ควรทบทวนพื้นฐาน` } : { tone: "info", text: `ความเข้าใจคงที่ราว ${last!.toFixed(1)} / 5` })
  if (notes.length) insights.push(strengths >= improves ? { tone: "good", text: `ครูบันทึกจุดเด่น ${strengths} ครั้ง มากกว่าเรื่องที่ต้องฝึก (${improves})` } : { tone: "watch", text: `เรื่องที่ต้องฝึก (${improves}) ยังมากกว่าจุดเด่น (${strengths}) — เน้นทบทวนก่อนต่อคอร์ส` })
  return { sessions: rows.length, attended: done.length, present, leave, rate, avgLevel: avg(levels), first, last, trend, strengths, improves, insights }
}
