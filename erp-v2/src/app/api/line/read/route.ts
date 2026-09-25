import { NextResponse } from "next/server"
import { markRead } from "@/server/line-store"

export async function POST(req: Request) {
  let body: { conversationId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  if (!body.conversationId) return NextResponse.json({ ok: false, error: "missing conversationId" }, { status: 400 })
  await markRead(body.conversationId)
  return NextResponse.json({ ok: true })
}
