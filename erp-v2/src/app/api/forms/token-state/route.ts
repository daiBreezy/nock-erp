import { NextResponse } from "next/server"
import { tokenStates } from "@/server/form-store"
import { enrollTokenStates } from "@/server/parent-form-store"

// Staff: where each sent link stands — waiting for the parent · answered · expired · cancelled.
export async function POST(req: Request) {
  let body: { tokens?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  const tokens = (body.tokens ?? []).filter((t) => typeof t === "string").slice(0, 50)
  const [a, b] = await Promise.all([tokenStates(tokens.filter((t) => !t.startsWith("pe_"))), enrollTokenStates(tokens.filter((t) => t.startsWith("pe_")))])
  return NextResponse.json({ ok: true, states: { ...a, ...b } })
}
