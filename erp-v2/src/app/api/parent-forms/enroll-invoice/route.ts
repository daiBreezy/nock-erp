import { NextResponse } from "next/server"
import { setEnrollInvoiceStatus } from "@/server/parent-form-store"

// Staff side: an invoice that travelled with an enroll form was voided (or paid) — the links carrying it must say so.
export async function POST(req: Request) {
  let body: { invoiceId?: string; status?: "void" | "paid" | "open" }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.invoiceId || !body.status) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  return NextResponse.json({ ok: true, links: await setEnrollInvoiceStatus(body.invoiceId, body.status) })
}
