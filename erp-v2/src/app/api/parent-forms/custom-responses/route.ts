import { NextResponse } from "next/server"
import { listCustomResponses } from "@/server/parent-form-store"

// Staff: answers to custom forms (the ERP pulls them into its own data).
export async function GET() {
  return NextResponse.json({ ok: true, responses: await listCustomResponses() })
}
