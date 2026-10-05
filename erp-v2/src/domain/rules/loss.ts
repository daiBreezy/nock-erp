// Why customers stop (owner 2026-10-05): one reason list for leads that never enrolled AND students who leave, so
// Reports can line up "lost before" and "lost after" side by side. Plus the follow-up log that tells a quiet lead
// from a gone one.

import type { ContactChannel, ContactResult, DateStr, ExitAnswers, ID, Lead, LeadLost, LeadStage, LossReason } from "../types"

export const DEFAULT_LOSS_REASONS: LossReason[] = [
  // couldn't get to talk to them (leads only)
  { id: "lr_unreachable", label: "ติดต่อไม่ได้ / ไม่รับสาย", en: "Could not reach", ja: "連絡がつかない", for: "lead", contactOnly: true, active: true },
  { id: "lr_no_reply", label: "ไม่ตอบ LINE", en: "No reply on LINE", ja: "LINEの返信なし", for: "lead", contactOnly: true, active: true },
  { id: "lr_wrong_contact", label: "เบอร์ / LINE ผิด", en: "Wrong contact", ja: "連絡先の誤り", for: "lead", contactOnly: true, active: true },
  { id: "lr_not_interested", label: "ไม่สนใจแล้ว", en: "No longer interested", ja: "興味がなくなった", for: "lead", active: true },
  // the same reasons on both sides
  { id: "lr_price", label: "ค่าใช้จ่าย / ราคา", en: "Cost", ja: "費用", for: "both", active: true },
  { id: "lr_schedule", label: "ตารางเวลาไม่ลงตัว", en: "Schedule doesn't fit", ja: "時間が合わない", for: "both", active: true },
  { id: "lr_travel", label: "การเดินทาง / รถรับส่ง", en: "Travel / school bus", ja: "通学・送迎", for: "both", active: true },
  { id: "lr_moved", label: "ย้ายบ้าน / ย้ายโรงเรียน", en: "Moved home / school", ja: "引っ越し・転校", for: "both", active: true },
  { id: "lr_competitor", label: "ไปเรียนที่อื่น", en: "Chose another school", ja: "他の塾に決めた", for: "both", active: true },
  { id: "lr_results", label: "ผลการเรียน / ระดับไม่ตรงที่หวัง", en: "Results / level not as hoped", ja: "成績・レベルが期待と違う", for: "both", active: true },
  { id: "lr_teacher", label: "ครู / วิธีสอน", en: "Teacher / teaching style", ja: "講師・教え方", for: "both", active: true },
  { id: "lr_child", label: "ลูกไม่อยากเรียน / เหนื่อย", en: "Child doesn't want to / too tired", ja: "子どもが行きたがらない・疲れている", for: "both", active: true },
  // leads only
  { id: "lr_no_course", label: "ไม่มีวิชา / ระดับที่ต้องการ", en: "No suitable course", ja: "希望のコースがない", for: "lead", active: true },
  { id: "lr_not_ready", label: "ยังไม่พร้อม / ขอคิดก่อน", en: "Not ready yet", ja: "まだ検討中", for: "lead", active: true },
  // students only
  { id: "lr_goal_met", label: "ถึงเป้าแล้ว (สอบติด / จบหลักสูตร)", en: "Goal reached (passed / finished)", ja: "目標達成（合格・修了）", for: "student", active: true },
  { id: "lr_other", label: "อื่นๆ", en: "Other", ja: "その他", for: "both", active: true },
]

export const lossReasonsOf = (list: LossReason[] | undefined) => (list?.length ? list : DEFAULT_LOSS_REASONS)

export function reasonLabel(id: ID | undefined, list: LossReason[] | undefined, lang: "th" | "en" | "ja" = "th") {
  const r = lossReasonsOf(list).find((x) => x.id === id)
  if (!r) return "ไม่ระบุ"
  return (lang === "en" ? r.en : lang === "ja" ? r.ja : undefined) || r.label
}

/** Reasons a lead closed at this step can have: before we ever talked → "couldn't reach" first, then the rest. */
export function reasonsForLead(stage: LeadStage, list: LossReason[] | undefined): LossReason[] {
  const all = lossReasonsOf(list).filter((r) => r.active && r.for !== "student")
  const early = stage === "new" || stage === "contacting"
  return early ? [...all.filter((r) => r.contactOnly), ...all.filter((r) => !r.contactOnly)] : all.filter((r) => !r.contactOnly)
}

export const reasonsForStudent = (list: LossReason[] | undefined) => lossReasonsOf(list).filter((r) => r.active && r.for !== "lead")

export const CHANNEL_LABEL: Record<ContactChannel, string> = { call: "โทร", line: "LINE", other: "อื่นๆ" }
export const RESULT_LABEL: Record<ContactResult, string> = {
  talked: "คุยแล้ว", replied: "ตอบกลับ", no_answer: "ไม่รับสาย", no_reply: "ไม่ตอบ", call_back: "ให้ติดต่อใหม่", wrong_number: "เบอร์ / LINE ผิด",
}
/** results that mean the parent is still there */
export const REACHED: ContactResult[] = ["talked", "replied", "call_back"]

/** Last time anything happened with this lead: a note, a follow-up, or when it came in. */
export function lastTouchAt(l: Pick<Lead, "notes" | "createdAt" | "followUps">): string {
  return [l.createdAt, ...l.notes.map((n) => n.at), ...(l.followUps ?? []).map((f) => f.at)].sort().at(-1)!
}

/**
 * How quiet a lead is (owner 2026-10-05: the admin follows up by call / LINE, records what happened, then decides):
 * days since we last heard back, tries since then, and whether it is time to suggest closing it.
 */
export function followUpState(l: Pick<Lead, "notes" | "createdAt" | "followUps">, now: Date) {
  const ups = [...(l.followUps ?? [])].sort((a, b) => a.at.localeCompare(b.at))
  const lastReach = [...ups].reverse().find((f) => REACHED.includes(f.result))
  const tries = ups.filter((f) => !lastReach || f.at > lastReach.at).length
  const heardAt = lastReach?.at ?? l.createdAt
  const silentDays = Math.max(0, Math.floor((now.getTime() - new Date(heardAt).getTime()) / 86_400_000))
  const wrong = ups.at(-1)?.result === "wrong_number"
  return { tries, silentDays, lastReach, total: ups.length, suggestClose: wrong || tries >= 3 || (silentDays >= 14 && tries >= 1) }
}

export type LeadLostInput = Omit<LeadLost, "at" | "by">

export function validateLeadLost(x: LeadLostInput, list: LossReason[] | undefined): string | null {
  if (!x.reasonId) return "เลือกเหตุผลหลัก"
  if (!lossReasonsOf(list).some((r) => r.id === x.reasonId)) return "ไม่พบเหตุผลนี้"
  if (x.reasonId === "lr_other" && !x.note?.trim()) return "เหตุผล \"อื่นๆ\" ต้องใส่หมายเหตุ"
  if (x.reasonId === "lr_competitor" && !x.competitor?.trim()) return "ระบุว่าไปเรียนที่ไหน (ถ้าไม่รู้ พิมพ์ \"ไม่ทราบ\")"
  return null
}

export type ExitCloseInput = { answers?: ExitAnswers; reasonId: ID; otherReasonIds: ID[]; money: "refund" | "credit" | "none"; note?: string; lastDate: DateStr }

export function validateExitClose(x: ExitCloseInput, list: LossReason[] | undefined): string | null {
  if (!x.reasonId) return "เลือกเหตุผลหลัก"
  if (!reasonsForStudent(list).some((r) => r.id === x.reasonId) && !lossReasonsOf(list).some((r) => r.id === x.reasonId)) return "ไม่พบเหตุผลนี้"
  if (!x.lastDate) return "ใส่วันเรียนวันสุดท้าย"
  if (x.reasonId === "lr_other" && !x.note?.trim() && !x.answers?.comment) return "เหตุผล \"อื่นๆ\" ต้องใส่หมายเหตุ"
  return null
}

/** Closed leads whose "try again on" day has come — they go back to the admin (Need Attention). */
export function followUpDue(leads: Pick<Lead, "stage" | "lost">[], today: DateStr) {
  return leads.filter((l) => l.stage === "archived" && l.lost?.followUpOn && l.lost.followUpOn <= today)
}
