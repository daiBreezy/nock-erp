import crypto from "crypto"
import { NextResponse } from "next/server"
import { getAll, recordInboundMessage, saveLineImage } from "@/server/line-store"

interface LineWebhookEvent {
  type: string
  message?: { id?: string; type: string; text?: string }
  source?: { userId?: string }
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
    const userId = event.source?.userId
    if (!userId) continue
    const isNew = !known.has(`line_${userId}`)
    const displayName = isNew && token ? await fetchDisplayName(userId, token) : null
    if (isText) await recordInboundMessage(userId, displayName, msg!.text!)
    else {
      const saved = token ? await saveLineImage(msg!.id!, token) : false
      await recordInboundMessage(userId, displayName, saved ? "📷 ส่งรูปภาพ" : "📷 ส่งรูปภาพ (ดึงรูปจาก LINE ไม่สำเร็จ)", saved ? { kind: "image", meta: { formKind: "image", mediaId: msg!.id! } } : undefined)
    }
  }

  return NextResponse.json({ ok: true })
}

// LINE's "Verify" button in the console sends a GET-less health check via POST with an empty event
// list — handled by the loop above (no-op). A GET is provided too so visiting the URL in a browser
// doesn't just 405.
export async function GET() {
  return NextResponse.json({ ok: true, note: "LINE webhook endpoint — POST only from LINE's servers" })
}
