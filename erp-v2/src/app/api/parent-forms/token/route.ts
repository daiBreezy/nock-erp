import { NextResponse } from "next/server"
import { checkExitToken, createExitToken } from "@/server/parent-form-store"
import type { ExitToken } from "@/domain/types"

// Staff: mint the exit-form link for a family (owner 2026-10-05). Parent page: read what the link is for.
export async function POST(req: Request) {
  let body: Partial<ExitToken>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.branchId || !body.students?.length || !body.lastDate || !body.reasons?.length) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  const token = await createExitToken({
    branchId: body.branchId, branchName: body.branchName ?? "", brand: body.brand ?? "nockacademy", lang: body.lang ?? "th",
    conversationId: body.conversationId ?? null, familyName: body.familyName ?? "", students: body.students, lastDate: body.lastDate, reasons: body.reasons,
  })
  return NextResponse.json({ ok: true, token })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  return NextResponse.json(await checkExitToken(token))
}
