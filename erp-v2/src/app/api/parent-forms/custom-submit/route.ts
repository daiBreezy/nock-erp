import { NextResponse } from "next/server"
import { submitCustom } from "@/server/parent-form-store"
import { recordInboundMessage } from "@/server/line-store"
import type { CustomFormResponse } from "@/domain/types"

// Parent page: send the answers to a custom form (one time per link; checked again here).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; answers?: CustomFormResponse["answers"] }
  if (!body.token || !body.answers) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  const r = await submitCustom(body.token, body.answers)
  if (!r.ok) return NextResponse.json(r)
  const lineUserId = r.token.conversationId?.startsWith("line_") ? r.token.conversationId.slice(5) : null
  if (lineUserId) await recordInboundMessage(lineUserId, null, `📝 ตอบฟอร์ม “${r.token.form.name}” แล้ว`).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
