import { NextResponse } from "next/server"
import { publishTrips, type DriverTrip } from "@/server/driver-store"

// staff side only (the tunnel gate keeps it off the internet): the ERP sends the approved trips
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { trips?: DriverTrip[] }
  const n = await publishTrips(Array.isArray(b.trips) ? b.trips : [])
  return NextResponse.json({ ok: true, count: n })
}
