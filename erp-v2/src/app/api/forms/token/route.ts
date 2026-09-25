import { NextResponse } from "next/server"
import { checkToken, createToken } from "@/server/form-store"
import type { FormSubjectOffer, FormType } from "@/domain/types"

// Staff side: mint a one-time link for a lead, carrying the offered slots the admin picked
// ("ส่งฟอร์ม" flow in LeadSheet / Inbox).
export async function POST(req: Request) {
  let body: { type?: FormType; leadId?: string; branchId?: string; conversationId?: string | null; offers?: FormSubjectOffer[]; grades?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  if (!body.type || !body.leadId || !body.branchId || !body.offers?.length) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  const token = await createToken({
    type: body.type, leadId: body.leadId, branchId: body.branchId,
    conversationId: body.conversationId ?? null, offers: body.offers, grades: body.grades ?? [],
  })
  return NextResponse.json({ ok: true, token })
}

// LIFF page side: look up what a token is for + its offered slots before rendering the form.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 })
  const check = await checkToken(token)
  if (!check.ok) return NextResponse.json(check)
  return NextResponse.json({ ok: true, type: check.token.type, offers: check.token.offers, grades: check.token.grades })
}
