// Shared Inbox — conversations linked to a Family (customer), a CRM Lead, or neither (contact).
// Spec ref: new-erp/js/inbox.js (conversation types, "//" internal-note convention).

import { addDays, fmtDate, toDateStr } from "../dates"
import type { ChatMessage, Conversation, DateStr, Family, GroupMemberRole, Lead, Student } from "../types"

/** the name a chat shows — the linked family's / lead's CURRENT name (owner 2026-10-14: renaming the family didn't
 *  change the Inbox, because the name was copied when the chat was linked); unlinked chats keep the LINE name */
export function conversationName(c: Pick<Conversation, "name" | "familyId" | "leadId" | "group">, families: Pick<Family, "id" | "name">[], leads: Pick<Lead, "id" | "name">[]): string {
  if (c.group) return c.name // a LINE group keeps its own name — the family it is linked to shows as a tag, not as the title
  return (c.familyId && families.find((f) => f.id === c.familyId)?.name) || (c.leadId && leads.find((l) => l.id === c.leadId)?.name) || c.name
}

export type ConversationType = "customer" | "lead" | "contact"

export const CONVERSATION_TYPE_LABEL: Record<ConversationType, string> = {
  customer: "ลูกค้า",
  lead: "ลีด",
  contact: "ผู้ติดต่อ",
}

/** the one-letter status in the chat list (owner 2026-11-12): C = Customer, L = Lead; an unlinked contact has none */
export const CONVERSATION_TYPE_LETTER: Record<ConversationType, "C" | "L" | null> = { customer: "C", lead: "L", contact: null }
export const CONVERSATION_TYPE_LETTER_LABEL = { C: "Customer · ลูกค้า", L: "Lead · ลีด" } as const

/** time column of a chat row: today → clock time, yesterday → "เมื่อวาน", older → "12 พ.ย." (owner 2026-11-12: it showed only the month) */
export function chatListTime(iso: string, now: Date): string {
  const d = new Date(iso)
  const day = toDateStr(d)
  const today = toDateStr(now)
  if (day === today) return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  if (day === addDays(today, -1)) return "เมื่อวาน"
  return fmtDate(day).replace(/\s?\d{4}$/, "")
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

/** owner 2026-10-15: every form we send shows as the same card in the chat. Test / Trial carry meta (form_request);
 *  the exit, enroll and survey links go out as text — recognised here by the link's token + our fixed wording. */
export type FormLinkKind = "exit" | "enroll" | "survey" | "custom"
export const FORM_LINK_LABEL: Record<FormLinkKind, string> = { exit: "ส่งฟอร์มแจ้งลาออก", enroll: "ส่งใบสมัครเรียน", survey: "ส่งแบบสอบถามความพึงพอใจ", custom: "ส่งฟอร์ม" }
/** owner 2026-10-22: recognised by the link's token prefix first (pf_ exit · pe_ enroll · ps_ survey · pc_ a form made in
 *  the builder) — the enroll message's wording didn't match the old text check, so it showed as a raw link */
export function formLinkOf(m: { author: string; text?: string }): { form: FormLinkKind; token: string; url: string; who?: string } | null {
  if (m.author !== "staff" || !m.text) return null
  const url = m.text.match(/https?:\/\/\S+[?&]token=[\w-]+/)?.[0]
  const token = url?.match(/[?&]token=([\w-]+)/)?.[1]
  if (!url || !token) return null
  const who = m.text.match(/การหยุดเรียนของ(.+?)ค่ะ/)?.[1]
  if (token.startsWith("pf_")) return { form: "exit", token, url, who }
  if (token.startsWith("pe_")) return { form: "enroll", token, url }
  if (token.startsWith("ps_")) return { form: "survey", token, url }
  if (token.startsWith("pc_")) return { form: "custom", token, url, who: m.text.match(/“(.+?)”/)?.[1] }
  if (m.text.includes("หยุดเรียน")) return { form: "exit", token, url, who }
  if (m.text.includes("สมัครเรียน")) return { form: "enroll", token, url }
  if (m.text.includes("แบบสอบถาม")) return { form: "survey", token, url }
  return null
}

// ---------- LINE groups ----------
// One LINE group belongs to ONE family, but the people in it are a mix: guardians and students who are in the ERP, and
// relatives (an uncle, an aunt) who only want the news and never become family members. The role is therefore kept per
// LINE userId on the conversation, never forced onto the family.

export const MEMBER_ROLE_LABEL = { parent: "ผู้ปกครอง", student: "นักเรียน", follower: "ผู้ติดตาม" } as const

/** the people who wrote in a group, one row per LINE userId, in order of first message */
export function groupSenders(messages: Pick<ChatMessage, "conversationId" | "sender" | "at">[], conversationId: string): { userId: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const m of [...messages].filter((x) => x.conversationId === conversationId && x.sender).sort((a, b) => a.at.localeCompare(b.at))) {
    seen.set(m.sender!.userId, m.sender!.name) // later messages carry the newest name
  }
  return [...seen].map(([userId, name]) => ({ userId, name }))
}

/** what to show for one LINE member of a group: the ERP name once staff said who they are, else the LINE name */
export function groupMemberLabel(
  conv: Pick<Conversation, "members" | "familyId">, sender: { userId: string; name: string },
  family: Pick<Family, "parents"> | undefined, students: Pick<Student, "id" | "nickname" | "name">[],
): { name: string; role: keyof typeof MEMBER_ROLE_LABEL | null } {
  const role: GroupMemberRole | undefined = conv.members?.[sender.userId]
  if (!role) return { name: sender.name, role: null }
  if (role.kind === "parent") {
    const p = family?.parents.find((x) => x.lineUserId === sender.userId)
    return { name: p?.name || sender.name, role: "parent" }
  }
  if (role.kind === "student") {
    const st = students.find((x) => x.id === role.studentId)
    return { name: st ? st.nickname || st.name : sender.name, role: "student" }
  }
  return { name: sender.name, role: "follower" }
}

/**
 * A LINE group links itself to a family when the people who wrote in it are already known (owner 2026-11-12: "ถ้า ID นั้น
 * ERP รู้จักอยู่แล้ว ก็ Auto select แทน Admin"). A person is known when their LINE account is a guardian's own `lineUserId`,
 * or the account the family was linked through (`Family.lineUserId` → the primary guardian).
 *  - everyone known points at ONE family → link the group + mark each of them as that family's guardian
 *  - known people point at DIFFERENT families → do nothing here (`groupFamilyCandidates` suggests, staff pick)
 *  - staff's own choices (a linked family, a role already set) are never overridden
 * Strangers (an uncle) stay "ยังไม่ระบุ" for staff.
 */
export function knownFamilyOf(userId: string, families: Pick<Family, "id" | "lineUserId" | "parents" | "archived">[]): { familyId: string; parentIndex: number } | null {
  for (const f of families) {
    if (f.archived) continue
    const own = f.parents.findIndex((p) => p.lineUserId === userId)
    if (own >= 0) return { familyId: f.id, parentIndex: own }
  }
  for (const f of families) {
    if (f.archived || f.lineUserId !== userId || !f.parents.length) continue
    const primary = f.parents.findIndex((p) => p.primary)
    return { familyId: f.id, parentIndex: primary >= 0 ? primary : 0 }
  }
  return null
}

/** families the group's known writers point at — more than one = staff must choose */
export function groupFamilyCandidates(senders: { userId: string }[], families: Pick<Family, "id" | "lineUserId" | "parents" | "archived">[]): string[] {
  return [...new Set(senders.map((s) => knownFamilyOf(s.userId, families)?.familyId).filter((x): x is string => !!x))]
}

export function autoGroupLinks(
  conversations: Conversation[], messages: Pick<ChatMessage, "conversationId" | "sender" | "at">[], families: Family[],
): { conversations: Conversation[]; families: Family[]; changed: boolean } {
  let changed = false
  let fams = families
  const out = conversations.map((c) => {
    if (!c.group) return c
    const senders = groupSenders(messages, c.id)
    const famId = c.familyId ?? (() => { const one = groupFamilyCandidates(senders, fams); return one.length === 1 ? one[0] : null })()
    if (!famId) return c
    let members = c.members
    for (const s of senders) {
      const k = knownFamilyOf(s.userId, fams)
      if (!k || k.familyId !== famId || members?.[s.userId]) continue
      members = { ...(members ?? {}), [s.userId]: { kind: "parent" } }
      // remember the account on the guardian itself, so their own chats and every group find the family the same way
      fams = fams.map((f) => (f.id !== famId ? f : { ...f, parents: f.parents.map((p, i) => (i === k.parentIndex && !p.lineUserId ? { ...p, lineUserId: s.userId, lineLinked: true } : p)) }))
    }
    if (famId === c.familyId && members === c.members) return c
    changed = true
    return { ...c, familyId: famId, leadId: null, members }
  })
  return { conversations: out, families: fams, changed: changed || fams !== families }
}
