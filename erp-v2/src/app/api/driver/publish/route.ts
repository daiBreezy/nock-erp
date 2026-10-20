import { NextResponse } from "next/server"
import { publishTrips, type DriverTrip } from "@/server/driver-store"

// staff side only (the tunnel gate keeps it off the internet): the ERP sends the approved trips
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { trips?: DriverTrip[]; source?: string; drivers?: Record<string, string> }
  // each ERP browser publishes under its own id — one with nothing approved can't wipe another's trips
  const n = await publishTrips(Array.isArray(b.trips) ? b.trips : [], String(b.source ?? "default").slice(0, 64), b.drivers && typeof b.drivers === "object" ? Object.fromEntries(Object.entries(b.drivers).slice(0, 200).map(([k, v]) => [String(k), String(v).slice(0, 60)])) : {})
  return NextResponse.json({ ok: true, count: n })
}
