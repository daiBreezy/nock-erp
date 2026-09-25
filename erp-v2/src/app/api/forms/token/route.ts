import { NextResponse } from "next/server"
import { checkToken, createToken } from "@/server/form-store"
import type { FormType } from "@/domain/types"

// Staff side: mint a one-time link for a lead ("ส่งฟอร์ม" button in LeadSheet).
export async function POST(req: Request) {
  let body: { type?: FormType; leadId?: string; branchId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  if (!body.type || !body.leadId || !body.branchId) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  const token = await createToken(body.type, body.leadId, body.branchId)
  return NextResponse.json({ ok: true, token: token.token })
}

// LIFF page side: look up what a token is for before rendering the form.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 })
  const check = await checkToken(token)
  if (!check.ok) return NextResponse.json(check)
  return NextResponse.json({ ok: true, type: check.token.type })
}
