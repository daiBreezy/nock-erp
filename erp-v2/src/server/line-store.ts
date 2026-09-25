import { promises as fs } from "fs"
import path from "path"
import type { ChatMessage, Conversation } from "@/domain/types"

// File-based store for real LINE conversations received via webhook. erp-v2 has no real database
// (by design — see erp-v2/CLAUDE.md), and this data must live server-side (a webhook handler has no
// access to the browser's localStorage), so a small JSON file is the pragmatic middle ground for a
// prototype demo. Conversation ids are "line_<LINE userId>" throughout so the client can tell a live
// conversation apart from the seeded mock ones and route actions (send/read) accordingly.

const DATA_DIR = path.join(process.cwd(), ".data")
const DATA_FILE = path.join(DATA_DIR, "line-inbox.json")

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

export function findOrCreateConversation(store: Store, lineUserId: string, displayName: string | null): Conversation {
  const id = convId(lineUserId)
  const existing = store.conversations.find((c) => c.id === id)
  if (existing) return existing
  const conv: Conversation = {
    id, branchId: "", name: displayName ?? lineUserId, familyId: null, leadId: null,
    channel: "line", assigneeId: null, lastMessageAt: new Date().toISOString(), unread: false,
  }
  store.conversations.push(conv)
  return conv
}

/** One webhook "message" event → find/create the conversation, append the message, flag unread. */
export async function recordInboundMessage(lineUserId: string, displayName: string | null, text: string): Promise<void> {
  await mutate((store) => {
    const conv = findOrCreateConversation(store, lineUserId, displayName)
    const at = new Date().toISOString()
    conv.lastMessageAt = at
    conv.unread = true
    if (displayName && conv.name !== displayName) conv.name = displayName
    store.messages.push({ id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, conversationId: conv.id, author: "parent", senderId: null, text, at })
  })
}

/** Staff reply, sent via the Messaging API and recorded here so a page refresh still shows it. */
export async function recordOutboundMessage(lineUserId: string, text: string): Promise<ChatMessage> {
  return mutate((store) => {
    const conv = findOrCreateConversation(store, lineUserId, null)
    const at = new Date().toISOString()
    conv.lastMessageAt = at
    const message: ChatMessage = { id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, conversationId: conv.id, author: "staff", senderId: null, text, at }
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
