import crypto from "crypto"
import { NextResponse } from "next/server"
import { getAll, recordInboundMessage, saveLineImage } from "@/server/line-store"

interface LineWebhookEvent {
  type: string
  message?: { id?: string; type: string; text?: string }
  /** type "user" = 1:1 chat · "group" / "room" = shared chat (groupId/roomId set; userId = who wrote it, may be absent) */
  source?: { type?: string; userId?: string; groupId?: string; roomId?: string }
}
interface LineWebhookBody {
  events?: LineWebhookEvent[]
}

async function fetchDisplayName(userId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = (await res.json()) as { displayName?: string }
    return data.displayName ?? null
  } catch {
    return null
  }
}

/** group / room name — only groups have one (rooms don't) */
async function fetchGroupName(groupId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = (await res.json()) as { groupName?: string }
    return data.groupName ?? null
  } catch {
    return null
  }
}

/** who wrote a message in a group/room — the plain profile endpoint can't see group members, this one can (null if they never accepted the OA's terms) */
async function fetchMemberName(kind: "group" | "room", chatId: string, userId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/${kind}/${chatId}/member/${userId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = (await res.json()) as { displayName?: string }
    return data.displayName ?? null
  } catch {
    return null
  }
}

// LINE requires a fast 200 response (a few seconds, or it retries/flags the endpoint as failing), so
// this stays minimal: verify signature, persist text messages and photos (pay slips), skip everything else
// (stickers, files, follow/unfollow, etc. — out of scope for this prototype's Inbox).
export async function POST(req: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!secret) return NextResponse.json({ ok: false, error: "LINE_CHANNEL_SECRET not configured" }, { status: 500 })

  const signature = req.headers.get("x-line-signature")
  const body = await req.text()
  const expected = crypto.createHmac("SHA256", secret).update(body).digest("base64")
  if (!signature || signature !== expected) return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 })

  let payload: LineWebhookBody
  try {
    payload = JSON.parse(body || "{}") as LineWebhookBody
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }

  const known = new Set((await getAll()).conversations.map((c) => c.id))
  for (const event of payload.events ?? []) {
    const msg = event.message
    const isText = msg?.type === "text" && !!msg.text
    const isImage = msg?.type === "image" && !!msg.id
    if (event.type !== "message" || (!isText && !isImage)) continue
    const src = event.source
    const groupKind = src?.type === "group" && src.groupId ? "group" : src?.type === "room" && src.roomId ? "room" : null
    // a group's messages key on the group (one thread for everyone in it); a 1:1 chat keys on the person
    const chatId = groupKind === "group" ? src!.groupId : groupKind === "room" ? src!.roomId : src?.userId
    if (!chatId) continue
    const isNew = !known.has(`line_${chatId}`)
    let displayName: string | null = null
    let group: { sender: { userId: string; name: string | null } | null } | undefined
    if (groupKind) {
      if (isNew && token && groupKind === "group") displayName = await fetchGroupName(chatId, token)
      if (isNew && !displayName) displayName = groupKind === "group" ? "กลุ่ม LINE" : "ห้องแชท LINE"
      const senderId = src?.userId
      group = { sender: senderId ? { userId: senderId, name: token ? (await fetchMemberName(groupKind, chatId, senderId, token)) ?? (await fetchDisplayName(senderId, token)) : null } : null }
    } else {
      displayName = isNew && token ? await fetchDisplayName(chatId, token) : null
    }
    if (isText) await recordInboundMessage(chatId, displayName, msg!.text!, undefined, group)
    else {
      const saved = token ? await saveLineImage(msg!.id!, token) : false
      await recordInboundMessage(chatId, displayName, saved ? "📷 ส่งรูปภาพ" : "📷 ส่งรูปภาพ (ดึงรูปจาก LINE ไม่สำเร็จ)", saved ? { kind: "image", meta: { formKind: "image", mediaId: msg!.id! } } : undefined, group)
    }
    known.add(`line_${chatId}`)
  }

  return NextResponse.json({ ok: true })
}

// LINE's "Verify" button in the console sends a GET-less health check via POST with an empty event
// list — handled by the loop above (no-op). A GET is provided too so visiting the URL in a browser
// doesn't just 405.
export async function GET() {
  return NextResponse.json({ ok: true, note: "LINE webhook endpoint — POST only from LINE's servers" })
}
