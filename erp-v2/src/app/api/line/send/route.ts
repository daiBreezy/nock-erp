import { NextResponse } from "next/server"
import { lineUserIdOf, recordOutboundMessage } from "@/server/line-store"
import type { ChatMessageMeta, MessageKind } from "@/domain/types"

// Sends a staff reply to a real LINE conversation via the Messaging API's push endpoint, then records
// it in the same store the webhook writes to — so a page refresh still shows what was sent.
export async function POST(req: Request) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN not configured" }, { status: 500 })

  let body: { conversationId?: string; text?: string; kind?: MessageKind; meta?: ChatMessageMeta }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const lineUserId = body.conversationId ? lineUserIdOf(body.conversationId) : null
  const text = body.text?.trim()
  if (!lineUserId) return NextResponse.json({ ok: false, error: "invalid conversationId" }, { status: 400 })
  if (!text) return NextResponse.json({ ok: false, error: "ข้อความว่าง" }, { status: 400 })

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: lineUserId, messages: [{ type: "text", text }] }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      return NextResponse.json({ ok: false, error: data?.message ?? `LINE ตอบกลับผิดพลาด (${res.status})` })
    }
  } catch {
    return NextResponse.json({ ok: false, error: "เรียก LINE API ไม่ได้ (เครือข่ายมีปัญหา หรือ timeout)" })
  }

  const message = await recordOutboundMessage(lineUserId, text, { kind: body.kind, meta: body.meta })
  return NextResponse.json({ ok: true, message })
}
