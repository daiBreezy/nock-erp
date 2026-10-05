import { NextResponse } from "next/server"
import { listEnrollSubmissions, reviewEnroll } from "@/server/parent-form-store"

// Staff: enroll-now applications, and marking one approved / rejected.
export async function GET() {
  return NextResponse.json({ ok: true, submissions: await listEnrollSubmissions() })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: "approved" | "rejected"; createdStudentIds?: string[] }
  if (!body.id || !body.status) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  return NextResponse.json({ ok: await reviewEnroll(body.id, body.status, body.createdStudentIds) })
}
