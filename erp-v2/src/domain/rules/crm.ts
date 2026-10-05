// CRM lead pipeline (Phase 2 rebuild). Spec ref: new-erp/js/crm.js (stage list + grouping).

import { daysBetween, fmtDate, toDateStr } from "../dates"
import type { DateStr, Lead, LeadStage, Result } from "../types"

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: "ลูกค้าใหม่",
  contacting: "กำลังติดต่อ",
  test_scheduled: "นัดสอบวัดระดับ",
  tested: "สอบแล้ว",
  trial_scheduled: "นัดทดลองเรียน",
  trialed: "ทดลองเรียนแล้ว",
  payment_pending: "รอชำระเงิน",
  enrolled: "ลงทะเบียนแล้ว",
  archived: "เก็บเข้าคลัง",
}

export const LEAD_SOURCE_LABEL: Record<Lead["source"], string> = {
  line: "LINE OA",
  facebook: "Facebook",
  walkin: "Walk-in",
  phone: "โทรศัพท์",
  website: "เว็บไซต์",
  referral: "คนแนะนำ",
  other: "อื่นๆ",
}

export interface PipelineGroup {
  key: string
  label: string
  stages: LeadStage[]
}

/** Sub-stages folded into columns so the board reads as one funnel, not nine near-empty ones
 *  (owner 2026-09-29: 5 columns max — matches the reference board). Each card still shows its exact
 *  sub-stage as a chip when a column covers more than one (see `leadDetail`/LeadCard). */
export const PIPELINE_GROUPS: PipelineGroup[] = [
  { key: "contact", label: "ติดต่อ", stages: ["new", "contacting"] },
  { key: "test", label: "นัดสอบ", stages: ["test_scheduled", "tested"] },
  { key: "trial", label: "ทดลองเรียน", stages: ["trial_scheduled", "trialed"] },
  { key: "closing", label: "ปิดการขาย", stages: ["payment_pending", "enrolled"] },
  { key: "archived", label: "เก็บเข้าคลัง", stages: ["archived"] },
]

export function groupOf(stage: LeadStage): PipelineGroup {
  return PIPELINE_GROUPS.find((g) => g.stages.includes(stage))!
}

/** Stages the board can drag a card onto directly — enrolled/archived need a dedicated action (student record / reason). */
export const DRAGGABLE_STAGES: LeadStage[] = ["new", "contacting", "test_scheduled", "tested", "trial_scheduled", "trialed", "payment_pending"]

export function daysAgo(createdAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86400000))
}

export function daysAgoLabel(createdAt: string, now: Date): string {
  const d = daysAgo(createdAt, now)
  return d === 0 ? "วันนี้" : `${d} วันก่อน`
}

const STAGE_ORDER: LeadStage[] = ["new", "contacting", "test_scheduled", "tested", "trial_scheduled", "trialed", "payment_pending", "enrolled"]

/** Automatic moves (form approved, child attended, invoice sent, payment confirmed) only ever push a lead forward —
 *  a late event never drags it back, and archived leads stay put. */
export function advanceStage(current: LeadStage, target: LeadStage): LeadStage {
  if (current === "archived") return current
  return STAGE_ORDER.indexOf(target) > STAGE_ORDER.indexOf(current) ? target : current
}

/** Drag-and-drop only moves between working stages; enrolling/archiving go through their own actions (need a record / a reason). */
export function canSetStage(current: LeadStage, target: LeadStage): Result {
  if (current === "archived") return { ok: false, error: "Lead นี้เก็บเข้าคลังแล้ว — เปิดรายละเอียดเพื่อกู้คืนก่อน" }
  if (target === "enrolled") return { ok: false, error: "เป็นนักเรียนเองเมื่อยืนยันยอดเงินของใบแจ้งหนี้" }
  if (target === "archived") return { ok: false, error: "ใช้ปุ่ม “เก็บเข้าคลัง” เพื่อใส่เหตุผล" }
  return { ok: true, value: undefined }
}

/** Where "กู้คืนจากคลัง" sends a lead back to — the stage it was archived from, or "new" when that's unknown
 *  (older data / archived from "archived" itself shouldn't happen, but never trap a lead there). */
export function restoreStage(l: Pick<Lead, "archivedFrom">): LeadStage {
  return l.archivedFrom && l.archivedFrom !== "archived" ? l.archivedFrom : "new"
}

export function validateLead(l: Pick<Lead, "name" | "childGrade" | "subject" | "phone">): string | null {
  if (!l.name.trim()) return "ใส่ชื่อผู้ปกครองหรือผู้ติดต่อ"
  if (!l.childGrade.trim()) return "ใส่ระดับชั้นของลูก"
  if (!l.subject.trim()) return "เลือกวิชาที่สนใจ"
  if (!l.phone.trim()) return "ใส่เบอร์โทรติดต่อ"
  return null
}

/** Last time staff actually reached out — the most recent note, or creation if nothing's logged yet.
 *  "days ago" on a "กำลังติดต่อ" card must count from here, not from createdAt (that's just when the lead arrived). */
export function lastContactAt(l: Pick<Lead, "notes" | "createdAt" | "followUps">): string {
  return [l.createdAt, ...l.notes.map((n) => n.at), ...(l.followUps ?? []).map((f) => f.at)].sort().at(-1)!
}

/** Countdown to a test/trial appointment — same day-math as `sendDeadline` in summaries.ts (calendar days, not ms). */
export function scheduleInfo(scheduledAt: string, now: Date): { date: DateStr; daysLeft: number; overdue: boolean } {
  const date = toDateStr(new Date(scheduledAt))
  const daysLeft = daysBetween(toDateStr(now), date)
  return { date, daysLeft, overdue: daysLeft < 0 }
}

export interface LeadDetail {
  text: string
  /** same fact, without the weekday prefix — fits the Kanban card's narrower row (table/sheet use `text`). */
  shortText: string
  /** severity only — no UI/colour knowledge in domain/rules; the component maps this to a Pill tone. */
  level: "muted" | "info" | "warn" | "danger"
}

/** The one glanceable fact each pipeline stage needs — shared by the Kanban card, the table row and the
 *  lead sheet so the three views can never drift out of sync with each other. */
export function leadDetail(l: Pick<Lead, "stage" | "createdAt" | "notes" | "scheduledAt" | "archiveReason" | "archivedFrom" | "followUps">, now: Date): LeadDetail {
  const plain = (text: string, level: LeadDetail["level"]): LeadDetail => ({ text, shortText: text, level })

  if (l.stage === "archived") {
    const from = l.archivedFrom && l.archivedFrom !== "archived" ? LEAD_STAGE_LABEL[l.archivedFrom] : null
    const reason = l.archiveReason || "ไม่ระบุเหตุผล"
    return plain(from ? `จาก "${from}" · ${reason}` : reason, "muted")
  }
  if (l.stage === "enrolled") return plain("ลงทะเบียนแล้ว", "info")

  if (l.stage === "test_scheduled" || l.stage === "trial_scheduled") {
    if (!l.scheduledAt) return plain("ยังไม่นัดวัน", "warn")
    const { date, daysLeft, overdue } = scheduleInfo(l.scheduledAt, now)
    const long = fmtDate(date, { weekday: true })
    const short = fmtDate(date)
    if (overdue) { const suffix = `เลยนัด ${-daysLeft} วัน`; return { text: `${long} · ${suffix}`, shortText: `${short} · ${suffix}`, level: "danger" } }
    const suffix = daysLeft === 0 ? "วันนี้" : daysLeft === 1 ? "พรุ่งนี้" : `อีก ${daysLeft} วัน`
    return { text: `${long} · ${suffix}`, shortText: `${short} · ${suffix}`, level: daysLeft <= 1 ? "warn" : "info" }
  }
  if (l.stage === "tested") return plain("สอบแล้ว · รอนัดทดลองเรียน", "info")
  if (l.stage === "trialed") return plain("ทดลองเรียนแล้ว · รอออกใบแจ้งหนี้", "info")
  if (l.stage === "payment_pending") return plain("รอผู้ปกครองชำระเงิน", "warn")

  // new / contacting: how long since we actually talked to them, not since the lead first arrived
  const days = daysAgo(lastContactAt(l), now)
  if (l.stage === "new") return days === 0 ? plain("เพิ่งเข้ามาวันนี้", "info") : plain(`รอติดต่อมา ${days} วัน`, days >= 2 ? "warn" : "info")
  return days === 0 ? plain("ติดต่อวันนี้", "muted") : plain(`ติดต่อล่าสุด ${days} วันก่อน`, days >= 3 ? "warn" : "muted")
}

export interface CrmKpis {
  total: number
  /** not yet enrolled or archived */
  active: number
  /** test/trial appointment due today or tomorrow */
  dueSoon: number
  /** test/trial appointment date already passed without a result */
  overdue: number
  enrolled: number
  /** enrolled ÷ total, rounded to the nearest percent */
  conversionRate: number
}

export function crmKpis(leads: Lead[], now: Date): CrmKpis {
  const total = leads.length
  const active = leads.filter((l) => l.stage !== "enrolled" && l.stage !== "archived").length
  const appointments = leads
    .filter((l) => l.scheduledAt && (l.stage === "test_scheduled" || l.stage === "trial_scheduled"))
    .map((l) => scheduleInfo(l.scheduledAt!, now))
  const overdue = appointments.filter((a) => a.overdue).length
  const dueSoon = appointments.filter((a) => !a.overdue && a.daysLeft <= 1).length
  const enrolled = leads.filter((l) => l.stage === "enrolled").length
  return { total, active, dueSoon, overdue, enrolled, conversionRate: total ? Math.round((enrolled / total) * 100) : 0 }
}
