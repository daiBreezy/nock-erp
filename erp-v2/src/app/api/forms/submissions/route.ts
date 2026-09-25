import { NextResponse } from "next/server"
import { getAll } from "@/server/form-store"

// Polled by the CRM lead sheet to show pending Test/Trial submissions.
export async function GET() {
  const { submissions } = await getAll()
  return NextResponse.json({ submissions })
}
