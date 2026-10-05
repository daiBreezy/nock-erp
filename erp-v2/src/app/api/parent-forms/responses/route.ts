import { NextResponse } from "next/server"
import { listExitResponses } from "@/server/parent-form-store"

// Staff: exit-form answers (optionally for one link).
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? undefined
  return NextResponse.json({ ok: true, responses: await listExitResponses(token) })
}
