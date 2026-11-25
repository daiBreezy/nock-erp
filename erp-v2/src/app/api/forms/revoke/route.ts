import { NextResponse } from "next/server"
import { revokeToken } from "@/server/form-store"
import { revokeEnrollToken } from "@/server/parent-form-store"

// Staff: cancel a form link that was sent (Test / Trial / enroll) — the link then opens as "cancelled" and takes no answer.
export async function POST(req: Request) {
  let body: { token?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.token) return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 })
  return NextResponse.json(body.token.startsWith("pe_") ? await revokeEnrollToken(body.token) : await revokeToken(body.token))
}
