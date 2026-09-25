import { NextResponse } from "next/server"
import { getAll } from "@/server/line-store"

// Polled by the Inbox page every few seconds to pick up messages the webhook has recorded.
export async function GET() {
  const store = await getAll()
  return NextResponse.json(store)
}
