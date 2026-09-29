import { NextResponse } from "next/server"
import { editSubmissionSlot } from "@/server/form-store"
import type { FormOfferSlot } from "@/domain/types"

// Staff correction — admin can change one of a child's subject/date/time picks freely, not limited to
// what was originally offered. Does not touch status; Approve is still the only action that books.
export async function POST(req: Request) {
  let body: { id?: string; pickIndex?: number; subject?: string; slot?: FormOfferSlot }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  if (!body.id || body.pickIndex === undefined || !body.subject || !body.slot) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  const result = await editSubmissionSlot(body.id, body.pickIndex, body.subject, body.slot)
  return NextResponse.json(result)
}
