import { NextResponse } from "next/server"
import { editSubmissionAnswers, editSubmissionSlot } from "@/server/form-store"
import type { FormOfferSlot } from "@/domain/types"

// Staff correction — admin can change one of a child's subject/date/time picks freely, not limited to
// what was originally offered. Does not touch status; Approve is still the only action that books.
export async function POST(req: Request) {
  let body: { id?: string; pickIndex?: number; subject?: string; slot?: FormOfferSlot; answers?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  // owner 2026-11-20: the admin corrects what the parent typed (the "Preview Form" → แก้ไข)
  if (body.id && body.answers) return NextResponse.json(await editSubmissionAnswers(body.id, body.answers))
  if (!body.id || body.pickIndex === undefined || !body.subject || !body.slot) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  const result = await editSubmissionSlot(body.id, body.pickIndex, body.subject, body.slot)
  return NextResponse.json(result)
}
