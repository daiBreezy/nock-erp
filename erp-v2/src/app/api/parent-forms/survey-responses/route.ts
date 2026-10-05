import { NextResponse } from "next/server"
import { listSurveyResponses } from "@/server/parent-form-store"

// Staff: survey answers (the ERP pulls them into its own data).
export async function GET() {
  return NextResponse.json({ ok: true, responses: await listSurveyResponses() })
}
