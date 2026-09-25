// CRM lead pipeline (Phase 2 rebuild). Spec ref: new-erp/js/crm.js (stage list + grouping).

import type { Lead, LeadStage, Result } from "../types"

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
  walkin: "Walk-in",
  website: "เว็บไซต์",
  referral: "คนแนะนำ",
  other: "อื่นๆ",
}

export interface PipelineGroup {
  key: string
  label: string
  stages: LeadStage[]
}

/** Sub-stages folded into columns so the board reads as one funnel (test_scheduled+tested = "นัดสอบ", etc). */
export const PIPELINE_GROUPS: PipelineGroup[] = [
  { key: "new", label: "ลูกค้าใหม่", stages: ["new"] },
  { key: "contacting", label: "กำลังติดต่อ", stages: ["contacting"] },
  { key: "test", label: "นัดสอบ", stages: ["test_scheduled", "tested"] },
  { key: "trial", label: "ทดลองเรียน", stages: ["trial_scheduled", "trialed"] },
  { key: "payment_pending", label: "รอชำระเงิน", stages: ["payment_pending"] },
  { key: "enrolled", label: "ลงทะเบียนแล้ว", stages: ["enrolled"] },
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

/** Drag-and-drop only moves between working stages; enrolling/archiving go through their own actions (need a record / a reason). */
export function canSetStage(current: LeadStage, target: LeadStage): Result {
  if (current === "archived") return { ok: false, error: "Lead นี้เก็บเข้าคลังแล้ว — เปิดรายละเอียดเพื่อกู้คืนก่อน" }
  if (target === "enrolled") return { ok: false, error: "ใช้ปุ่ม “แปลงเป็นนักเรียน” เพื่อบันทึกลงทะเบียน" }
  if (target === "archived") return { ok: false, error: "ใช้ปุ่ม “เก็บเข้าคลัง” เพื่อใส่เหตุผล" }
  return { ok: true, value: undefined }
}

export function validateLead(l: Pick<Lead, "name" | "childGrade" | "subject" | "phone">): string | null {
  if (!l.name.trim()) return "ใส่ชื่อผู้ปกครองหรือผู้ติดต่อ"
  if (!l.childGrade.trim()) return "ใส่ระดับชั้นของลูก"
  if (!l.subject.trim()) return "เลือกวิชาที่สนใจ"
  if (!l.phone.trim()) return "ใส่เบอร์โทรติดต่อ"
  return null
}
