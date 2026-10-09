import { NextResponse } from "next/server"
import { viewForLineUser } from "@/server/parent-app-store"

// Parent side (open — parents can't type the demo password): LINE must prove who is asking. The page sends the LIFF
// ID token; LINE verifies it and tells us the user id, so nobody can read another family's data by guessing an id.
export async function GET(req: Request) {
  const idToken = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "")
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!idToken || !liffId) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 })
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: liffId.split("-")[0] }),
  }).catch(() => null)
  const who = res?.ok ? ((await res.json()) as { sub?: string; name?: string }) : null
  if (!who?.sub) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 })
  const view = await viewForLineUser(who.sub)
  if (!view) return NextResponse.json({ ok: false, error: "not_linked", name: who.name ?? "" })
  return NextResponse.json({ ok: true, view })
}
