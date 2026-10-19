import { NextResponse } from "next/server"
import { allEvents } from "@/server/driver-store"

// staff side only: what the drivers reported (the transport page polls this)
export async function GET() {
  return NextResponse.json({ ok: true, events: await allEvents() })
}
