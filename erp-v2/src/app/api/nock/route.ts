import { NextResponse } from "next/server"
import { activeAiConfig, callModel } from "@/server/ai-config"

// Nock's AI call (owner 2026-10-13). The browser builds the prompt from the asker's permissions, the handbook and the
// team's answers (domain/rules/nock.ts); this route forwards it to the model set in Settings › ระบบ › AI (or the
// .env.local keys). Keys stay server-side. No model → { ok: false, reason: "no_key" } and Nock answers from the
// handbook / knowledge bank instead.

type Reply = { answer: string; confident: boolean; links: { label: string; href: string }[] }

/** which model is connected — the Nock panel shows it */
export async function GET() {
  const p = await activeAiConfig()
  return NextResponse.json({ provider: p?.provider ?? null, model: p?.model ?? null })
}

function parse(text: string): Reply | null {
  try {
    const j = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""))
    if (typeof j.answer !== "string") return null
    const links = Array.isArray(j.links) ? j.links.filter((l: { label?: unknown; href?: unknown }) => typeof l?.label === "string" && typeof l?.href === "string" && l.href.startsWith("/")) : []
    return { answer: j.answer, confident: j.confident !== false, links }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const p = await activeAiConfig()
  if (!p) return NextResponse.json({ ok: false, reason: "no_key" })
  let body: { system?: string; question?: string; history?: { role: "user" | "assistant"; text: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 })
  }
  const question = body.question?.trim()
  if (!question || !body.system) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 })
  const r = await callModel(p, body.system, [...(body.history ?? []).slice(-6), { role: "user", text: question }])
  if (!r.ok) return NextResponse.json({ ok: false, reason: "provider_error", error: r.error })
  const reply = parse(r.text)
  if (!reply) return NextResponse.json({ ok: false, reason: "bad_reply" })
  return NextResponse.json({ ok: true, provider: p.provider, ...reply })
}
