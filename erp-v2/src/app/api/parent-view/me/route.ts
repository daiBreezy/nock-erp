import { NextResponse } from "next/server"
import { viewForLineUser } from "@/server/parent-app-store"
import { lineUserFromIdToken } from "@/server/line-auth"

// Parent side (open — parents can't type the demo password): LINE must prove who is asking. The page sends the LIFF
// ID token; LINE verifies it and tells us the user id, so nobody can read another family's data by guessing an id.
export async function GET(req: Request) {
  const who = await lineUserFromIdToken((req.headers.get("authorization") ?? "").replace(/^Bearer /, ""))
  if (!who) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 })
  const view = await viewForLineUser(who.sub)
  if (!view) return NextResponse.json({ ok: false, error: "not_linked", name: who.name ?? "" })
  return NextResponse.json({ ok: true, view })
}
