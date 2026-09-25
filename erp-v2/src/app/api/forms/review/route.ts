import { NextResponse } from "next/server"
import { reviewSubmission } from "@/server/form-store"

export async function POST(req: Request) {
  let body: { id?: string; status?: "approved" | "rejected"; sessionId?: string; studentId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  if (!body.id || (body.status !== "approved" && body.status !== "rejected")) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  await reviewSubmission(body.id, body.status, { sessionId: body.sessionId, studentId: body.studentId })
  return NextResponse.json({ ok: true })
}
