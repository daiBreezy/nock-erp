import { NextResponse } from "next/server"
import { checkEnrollToken, upsertEnrollToken } from "@/server/parent-form-store"
import type { EnrollToken } from "@/domain/types"

// Staff: create / refresh an enroll-now link (Rich Menu = reusable, keeps its token). Parent page: read the link.
export async function POST(req: Request) {
  let body: Partial<EnrollToken>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.branchId || !body.courses?.length || !body.grades?.length) return NextResponse.json({ ok: false, error: "สาขานี้ยังไม่มีคอร์สหรือระดับชั้น" }, { status: 400 })
  const token = await upsertEnrollToken({
    token: body.token, reusable: !!body.reusable, branchId: body.branchId, branchName: body.branchName ?? "", brand: body.brand ?? "nockacademy", lang: body.lang ?? "th",
    grades: body.grades, subjects: body.subjects ?? [], subjectNames: body.subjectNames, courses: body.courses, leadId: body.leadId, conversationId: body.conversationId ?? null, prefill: body.prefill,
  })
  return NextResponse.json({ ok: true, token })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "ลิงก์นี้ไม่ถูกต้อง" }, { status: 400 })
  return NextResponse.json(await checkEnrollToken(token))
}
