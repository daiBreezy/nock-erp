import { NextResponse } from "next/server"
import { tripsForToken } from "@/server/driver-store"

// driver side (open through the tunnel): the secret in the driver's link is the key — only their own trips
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? ""
  if (token.length < 8) return NextResponse.json({ ok: false, error: "link" }, { status: 401 })
  const r = await tripsForToken(token)
  return NextResponse.json({ ok: true, ...r })
}
