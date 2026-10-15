// Shared Inbox — conversations linked to a Family (customer), a CRM Lead, or neither (contact).
// Spec ref: new-erp/js/inbox.js (conversation types, "//" internal-note convention).

import { addDays, fmtDate, toDateStr } from "../dates"
import type { Conversation, DateStr, Family, Lead } from "../types"

/** the name a chat shows — the linked family's / lead's CURRENT name (owner 2026-10-14: renaming the family didn't
 *  change the Inbox, because the name was copied when the chat was linked); unlinked chats keep the LINE name */
export function conversationName(c: Pick<Conversation, "name" | "familyId" | "leadId">, families: Pick<Family, "id" | "name">[], leads: Pick<Lead, "id" | "name">[]): string {
  return (c.familyId && families.find((f) => f.id === c.familyId)?.name) || (c.leadId && leads.find((l) => l.id === c.leadId)?.name) || c.name
}

export type ConversationType = "customer" | "lead" | "contact"

export const CONVERSATION_TYPE_LABEL: Record<ConversationType, string> = {
  customer: "ลูกค้า",
  lead: "ลีด",
  contact: "ผู้ติดต่อ",
}

export const CHANNEL_LABEL: Record<Conversation["channel"], string> = {
  line: "LINE",
  walkin: "Walk-in",
  phone: "โทรศัพท์",
  other: "อื่นๆ",
}

export function conversationType(c: Pick<Conversation, "familyId" | "leadId">): ConversationType {
  if (c.familyId) return "customer"
  if (c.leadId) return "lead"
  return "contact"
}

/** a lead created from a chat starts with the chat's channel as its source (E2E 2026-09-28: phone chats became "LINE") */
export const SOURCE_OF_CHANNEL: Record<Conversation["channel"], Lead["source"]> = { line: "line", walkin: "walkin", phone: "phone", other: "other" }

/** "// note text" is staff-only — never delivered to the parent (matches legacy inbox.js convention). */
export function parseComposerInput(raw: string): { isNote: boolean; text: string } {
  const trimmed = raw.trim()
  const isNote = trimmed.startsWith("//")
  return { isNote, text: isNote ? trimmed.slice(2).trim() : trimmed }
}

export function unreadCount(conversations: Conversation[]): number {
  return conversations.filter((c) => c.unread).length
}

/** owner 2026-10-15: the chat shows a date separator instead of a time on every bubble — "วันนี้" / "เมื่อวาน" /
 *  the date (with the weekday; with the year only when it isn't this year) */
export function chatDayLabel(day: DateStr, today: DateStr): string {
  if (day === today) return "วันนี้"
  if (day === addDays(today, -1)) return "เมื่อวาน"
  return fmtDate(day, { weekday: true, year: day.slice(0, 4) !== today.slice(0, 4) })
}

/** messages grouped by the local day they were sent — one separator per group, in thread order */
export function groupByDay<T extends { at: string }>(thread: T[]): { day: DateStr; items: T[] }[] {
  const out: { day: DateStr; items: T[] }[] = []
  for (const m of thread) {
    const day = toDateStr(new Date(m.at))
    const last = out[out.length - 1]
    if (last?.day === day) last.items.push(m)
    else out.push({ day, items: [m] })
  }
  return out
}

/** one-click replies above the type box (AI Elements "Suggestion") — they fill the box, staff still press send */
export const QUICK_REPLIES = [
  "สวัสดีค่ะ ยินดีให้บริการค่ะ 🙏",
  "รับทราบค่ะ เดี๋ยวเช็คให้นะคะ",
  "ขอบคุณค่ะ 😊",
  "รบกวนแจ้งชื่อนักเรียนด้วยนะคะ",
  "ได้รับสลิปแล้วค่ะ ขอบคุณค่ะ",
]
