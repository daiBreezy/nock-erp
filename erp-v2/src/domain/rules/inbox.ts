// Shared Inbox — conversations linked to a Family (customer), a CRM Lead, or neither (contact).
// Spec ref: new-erp/js/inbox.js (conversation types, "//" internal-note convention).

import type { Conversation, Lead } from "../types"

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
