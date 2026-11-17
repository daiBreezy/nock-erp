import { promises as fs } from "fs"
import path from "path"
import type { ChatMessage, ChatMessageMeta, Conversation, MessageKind } from "@/domain/types"
import { DATA_DIR } from "./data-dir"

// File-based store for real LINE conversations received via webhook. erp-v2 has no real database
// (by design — see erp-v2/CLAUDE.md), and this data must live server-side (a webhook handler has no
// access to the browser's localStorage), so a small JSON file is the pragmatic middle ground for a
// prototype demo. Conversation ids are "line_<LINE userId>" throughout so the client can tell a live
// conversation apart from the seeded mock ones and route actions (send/read) accordingly.

const DATA_FILE = path.join(DATA_DIR, "line-inbox.json")
const MEDIA_DIR = path.join(DATA_DIR, "line-media")

/** LINE message ids are digits — anything else never touches the filesystem */
const mediaPath = (id: string) => (/^\d{1,30}$/.test(id) ? path.join(MEDIA_DIR, `${id}.jpg`) : null)

/** downloads a photo the parent sent (LINE keeps it only for a while) and stores it next to the inbox data */
export async function saveLineImage(messageId: string, token: string): Promise<boolean> {
  const file = mediaPath(messageId)
  if (!file) return false
  try {
    const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return false
    await fs.mkdir(MEDIA_DIR, { recursive: true })
    await fs.writeFile(file, Buffer.from(await res.arrayBuffer()))
    return true
  } catch {
    return false
  }
}

/** a photo staff attach in the Inbox — digits-only id so it shares the media folder and route with LINE photos */
export async function saveUploadedImage(data: Buffer): Promise<string> {
  const id = `9${Date.now()}${Math.floor(Math.random() * 1e6).toString().padStart(6, "0")}`
  await fs.mkdir(MEDIA_DIR, { recursive: true })
  await fs.writeFile(mediaPath(id)!, data)
  return id
}

export async function readLineImage(messageId: string): Promise<Buffer | null> {
  const file = mediaPath(messageId)
  if (!file) return null
  return fs.readFile(file).catch(() => null)
}

interface Store {
  conversations: Conversation[]
  messages: ChatMessage[]
}

let writeQueue: Promise<unknown> = Promise.resolve()

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8")
    return JSON.parse(raw) as Store
  } catch {
    return { conversations: [], messages: [] }
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8")
}

/** Serializes writes so two near-simultaneous webhook events can't clobber each other (single-process dev server). */
function mutate<T>(fn: (store: Store) => T): Promise<T> {
  const result = writeQueue.then(async () => {
    const store = await readStore()
    const value = fn(store)
    await writeStore(store)
    return value
  })
  writeQueue = result.catch(() => undefined)
  return result
}

export async function getAll(): Promise<Store> {
  return readStore()
}

const convId = (lineUserId: string) => `line_${lineUserId}`

export function findOrCreateConversation(store: Store, lineUserId: string, displayName: string | null, group = false): Conversation {
  const id = convId(lineUserId)
  const existing = store.conversations.find((c) => c.id === id)
  if (existing) return existing
  const conv: Conversation = {
    id, branchId: "", name: displayName ?? lineUserId, familyId: null, leadId: null,
    channel: "line", assigneeId: null, lastMessageAt: new Date().toISOString(), unread: false,
    ...(group && { group: true }),
  }
  store.conversations.push(conv)
  return conv
}

export interface MessageExtra {
  kind?: MessageKind
  meta?: ChatMessageMeta
}

export interface GroupSender {
  userId: string
  /** null when LINE won't reveal it (member never accepted the OA's terms) */
  name: string | null
}

/**
 * One webhook "message" event → find/create the conversation, append the message, flag unread.
 * `chatId` = the LINE userId (1:1) or the groupId/roomId (group). For a group, `displayName` is the group's name and
 * `sender` says who in it wrote the message — a member whose name LINE hides gets a stable "สมาชิก #n" per group.
 */
export async function recordInboundMessage(chatId: string, displayName: string | null, text: string, extra?: MessageExtra, group?: { sender: GroupSender | null }): Promise<void> {
  await mutate((store) => {
    const conv = findOrCreateConversation(store, chatId, displayName, !!group)
    const at = new Date().toISOString()
    conv.lastMessageAt = at
    conv.unread = true
    if (displayName && conv.name !== displayName) conv.name = displayName
    let sender: ChatMessage["sender"]
    if (group?.sender) {
      const { userId, name } = group.sender
      const mine = store.messages.filter((m) => m.conversationId === conv.id && m.sender)
      const known = [...mine].reverse().find((m) => m.sender!.userId === userId)?.sender?.name
      const seen = new Set(mine.map((m) => m.sender!.userId))
      const order = [...seen]
      // LINE hid the name → the same person's own 1:1 chat with us (same userId) already knows it
      const direct = store.conversations.find((c) => c.id === convId(userId) && !c.group)?.name
      const resolved = name ?? (direct && direct !== userId ? direct : null)
      sender = { userId, name: resolved ?? known ?? `สมาชิก #${(order.includes(userId) ? order.indexOf(userId) : order.length) + 1}` }
      // a real name arrived after earlier "สมาชิก #n" messages from the same person → fix those too
      if (resolved) for (const m of mine) if (m.sender!.userId === userId) m.sender!.name = resolved
    }
    store.messages.push({ id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, conversationId: conv.id, author: "parent", senderId: null, text, at, ...(sender && { sender }), ...extra })
  })
}

/** Staff reply, sent via the Messaging API and recorded here so a page refresh still shows it. */
export async function recordOutboundMessage(lineUserId: string, text: string, extra?: MessageExtra): Promise<ChatMessage> {
  return mutate((store) => {
    const conv = findOrCreateConversation(store, lineUserId, null)
    const at = new Date().toISOString()
    conv.lastMessageAt = at
    const message: ChatMessage = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, conversationId: conv.id, author: "staff", senderId: null, text, at, ...extra }
    store.messages.push(message)
    return message
  })
}

export async function markRead(conversationId: string): Promise<void> {
  await mutate((store) => {
    const conv = store.conversations.find((c) => c.id === conversationId)
    if (conv) conv.unread = false
  })
}

export function lineUserIdOf(conversationId: string): string | null {
  return conversationId.startsWith("line_") ? conversationId.slice(5) : null
}
