import { NextResponse } from "next/server"
import { submitExit } from "@/server/parent-form-store"
import { recordInboundMessage } from "@/server/line-store"
import type { ExitAnswers } from "@/domain/types"

// Parent page: send the exit form (one time per link). Leaves a message in the family's Inbox thread when it came from LINE.
export async function POST(req: Request) {
  let body: { token?: string; answers?: ExitAnswers }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.token || !body.answers?.reasonId) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  const r = await submitExit(body.token, body.answers)
  if (!r.ok) return NextResponse.json(r)
  const lineUserId = r.token.conversationId?.startsWith("line_") ? r.token.conversationId.slice(5) : null
  // shows in the Inbox thread as the parent's message, so the admin sees it came back
  if (lineUserId) await recordInboundMessage(lineUserId, null, `📋 ส่งแบบฟอร์มแจ้งออกของ ${r.token.students.map((s) => s.nickname).join(", ")} แล้ว`).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
