import { NextResponse } from "next/server"
import { checkCustomToken, createCustomToken } from "@/server/parent-form-store"
import type { CustomFormToken } from "@/domain/types"

// Staff: mint a link to a form made in the form builder, for one family (owner 2026-10-22). Parent page: read the form.
export async function POST(req: Request) {
  let body: Partial<CustomFormToken>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.formId || !body.form?.fields?.length || !body.familyId || !body.branchId) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  const token = await createCustomToken({ formId: body.formId, form: body.form, familyId: body.familyId, branchId: body.branchId, conversationId: body.conversationId })
  return NextResponse.json({ ok: true, token })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  return NextResponse.json(await checkCustomToken(token))
}
