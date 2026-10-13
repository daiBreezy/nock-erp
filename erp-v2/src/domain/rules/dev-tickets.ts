// เรื่องถึง Dev (owner 2026-10-13): any staff member sends a bug / help request / suggestion / question to the developers
// from Nock; the developers see and answer every one inside the ERP; the reporter sees only their own and follows its status.

import type { DevTicket, DevTicketKind, DevTicketStatus, Result, Staff } from "../types"
import { can } from "./permissions"

export const DEV_KIND_LABEL: Record<DevTicketKind, string> = { bug: "แจ้งปัญหา / บั๊ก", help: "ขอความช่วยเหลือ", idea: "ข้อเสนอแนะ / ขอฟีเจอร์", question: "คำถามถึง Dev" }
export const DEV_STATUS_LABEL: Record<DevTicketStatus, string> = { new: "ใหม่", acknowledged: "Dev รับเรื่องแล้ว", in_progress: "กำลังแก้ / กำลังทำ", done: "เสร็จแล้ว", wont_do: "ไม่ทำ" }
/** still waiting on the developers */
export const OPEN_STATUSES: DevTicketStatus[] = ["new", "acknowledged", "in_progress"]

/** Developers see every ticket; everyone else only the ones they sent */
export const seesAllTickets = (me: Staff) => can(me, "dev.manage")
export const visibleTickets = (all: DevTicket[], me: Staff) => (seesAllTickets(me) ? all : all.filter((t) => t.by === me.id))

/** DEV-0001, DEV-0002 … */
export function nextTicketNumber(all: Pick<DevTicket, "number">[]): string {
  const n = all.reduce((m, t) => Math.max(m, Number(t.number.replace(/\D/g, "")) || 0), 0) + 1
  return `DEV-${String(n).padStart(4, "0")}`
}

export function validateTicket(t: Pick<DevTicket, "title" | "detail" | "locations">): Result {
  if (!t.title.trim()) return { ok: false, error: "ใส่หัวเรื่องสั้นๆ" }
  if (!t.detail.trim()) return { ok: false, error: "เล่ารายละเอียด — ทำอะไรอยู่ เกิดอะไรขึ้น อยากได้อะไร" }
  if (!t.locations.length) return { ok: false, error: "เลือกว่าเกี่ยวกับส่วนไหนของระบบ" }
  return { ok: true, value: undefined }
}

/** the reporter and the developers talk in the ticket; only developers change its status */
export const canReplyTicket = (me: Staff, t: Pick<DevTicket, "by">) => t.by === me.id || seesAllTickets(me)
export function canSetTicketStatus(me: Staff, status: DevTicketStatus, note: string): Result {
  if (!seesAllTickets(me)) return { ok: false, error: "เฉพาะ Developer เปลี่ยนสถานะได้" }
  if (status === "wont_do" && !note.trim()) return { ok: false, error: "บอกเหตุผลที่ไม่ทำ" }
  return { ok: true, value: undefined }
}
