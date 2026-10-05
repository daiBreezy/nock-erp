import { NextResponse } from "next/server"
import { checkSurveyToken, submitSurvey } from "@/server/parent-form-store"
import { recordInboundMessage } from "@/server/line-store"
import type { SurveyAnswers } from "@/domain/types"

// Parent page: send the yearly survey (one time per family link).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; answers?: SurveyAnswers }
  if (!body.token || !body.answers) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  const check = await checkSurveyToken(body.token)
  if (!check.ok) return NextResponse.json(check)
  // teacher scores go to the teachers of each child at the time it was sent
  const teachers = Object.fromEntries(check.token.children.map((c) => [c.id, c.teacherIds]))
  const r = await submitSurvey(body.token, body.answers, teachers)
  if (!r.ok) return NextResponse.json(r)
  const lineUserId = r.token.conversationId?.startsWith("line_") ? r.token.conversationId.slice(5) : null
  if (lineUserId) await recordInboundMessage(lineUserId, null, `⭐ ตอบแบบสอบถามความพึงพอใจประจำปีแล้ว`).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
