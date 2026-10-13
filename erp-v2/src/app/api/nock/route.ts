import { NextResponse } from "next/server"

// Nock's AI call (owner 2026-10-13). The browser builds the prompt from the asker's permissions, the handbook and the
// team's answers (domain/rules/nock.ts); this route only forwards it to whichever model has a key — Google Gemini
// (GEMINI_API_KEY) or OpenAI (OPENAI_API_KEY). Keys stay server-side. No key → { ok: false, reason: "no_key" } and
// Nock answers from the handbook / knowledge bank instead.

type Reply = { answer: string; confident: boolean; links: { label: string; href: string }[] }

function provider() {
  if (process.env.GEMINI_API_KEY) return { name: "gemini" as const, key: process.env.GEMINI_API_KEY, model: process.env.NOCK_MODEL || "gemini-2.5-flash" }
  if (process.env.OPENAI_API_KEY) return { name: "openai" as const, key: process.env.OPENAI_API_KEY, model: process.env.NOCK_MODEL || "gpt-4o-mini" }
  return null
}

/** which model is connected — the Nock panel shows it */
export async function GET() {
  const p = provider()
  return NextResponse.json({ provider: p?.name ?? null, model: p?.model ?? null })
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
  const p = provider()
  if (!p) return NextResponse.json({ ok: false, reason: "no_key" })
  let body: { system?: string; question?: string; history?: { role: "user" | "assistant"; text: string }[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 })
  }
  const question = body.question?.trim()
  if (!question || !body.system) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 })
  const history = (body.history ?? []).slice(-6)

  try {
    let text = ""
    if (p.name === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": p.key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: body.system }] },
          contents: [...history.map((h) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })), { role: "user", parts: [{ text: question }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(20000),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) return NextResponse.json({ ok: false, reason: "provider_error", error: data?.error?.message ?? `Gemini ${res.status}` })
      text = data?.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text ?? "").join("") ?? ""
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({
          model: p.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: body.system }, ...history.map((h) => ({ role: h.role, content: h.text })), { role: "user", content: question }],
        }),
        signal: AbortSignal.timeout(20000),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) return NextResponse.json({ ok: false, reason: "provider_error", error: data?.error?.message ?? `OpenAI ${res.status}` })
      text = data?.choices?.[0]?.message?.content ?? ""
    }
    const reply = parse(text)
    if (!reply) return NextResponse.json({ ok: false, reason: "bad_reply" })
    return NextResponse.json({ ok: true, provider: p.name, ...reply })
  } catch {
    return NextResponse.json({ ok: false, reason: "network" })
  }
}
