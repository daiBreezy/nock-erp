import { NextResponse } from "next/server"
import { checkSurveyToken, createSurveyTokens } from "@/server/parent-form-store"
import type { SurveyToken } from "@/domain/types"

// Staff: mint one survey link per family for a year's send-out. Parent page: read what a link is for.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { tokens?: Omit<SurveyToken, "token" | "kind" | "createdAt" | "used">[] }
  if (!body.tokens?.length) return NextResponse.json({ ok: false, error: "ไม่มีครอบครัวที่จะส่ง" }, { status: 400 })
  return NextResponse.json({ ok: true, tokens: await createSurveyTokens(body.tokens) })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  return NextResponse.json(await checkSurveyToken(token))
}
