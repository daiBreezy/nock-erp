import { NextResponse } from "next/server"
import { handleRequest, listRequests } from "@/server/parent-request-store"
import { pushLineText } from "@/server/line-auth"
import { recordOutboundMessage } from "@/server/line-store"

// Staff side (behind the demo password): every แจ้งลา / แจ้งลาออก from parents, and closing one — the parent is told.
export async function GET() {
  return NextResponse.json({ ok: true, requests: await listRequests() })
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; status?: "done" | "declined"; result?: string; by?: string; reply?: string }
  if (!b.id || (b.status !== "done" && b.status !== "declined")) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  const r = await handleRequest(b.id, { status: b.status, result: b.result?.trim() || undefined, handledBy: b.by })
  if (!r) return NextResponse.json({ ok: false, error: "ไม่พบคำขอนี้" }, { status: 404 })
  const reply = b.reply?.trim()
  const sent = reply ? await pushLineText(r.lineUserId, reply) : false
  if (sent && reply) await recordOutboundMessage(r.lineUserId, reply).catch(() => undefined)
  return NextResponse.json({ ok: true, request: r, sent })
}
