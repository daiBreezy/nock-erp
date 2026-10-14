import { NextResponse } from "next/server"
import { activeAiConfig, maskKey, readSavedAiConfig, saveAiConfig, type AiProvider } from "@/server/ai-config"

// Settings › ระบบ › AI (owner 2026-10-14). GET never returns the key itself — only a masked hint.
export async function GET() {
  const active = await activeAiConfig()
  const saved = await readSavedAiConfig()
  return NextResponse.json({
    configured: !!active,
    source: active?.source ?? null,
    provider: active?.provider ?? null,
    model: active?.model ?? null,
    maskedKey: active ? maskKey(active.apiKey) : null,
    saved: saved ? { provider: saved.provider, model: saved.model } : null,
  })
}

export async function POST(req: Request) {
  let body: { provider?: AiProvider; apiKey?: string; model?: string }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (body.provider !== "gemini" && body.provider !== "openai") return NextResponse.json({ ok: false, error: "เลือกผู้ให้บริการ" }, { status: 400 })
  const saved = await readSavedAiConfig()
  // an empty key field keeps the key already saved for the same provider
  const apiKey = body.apiKey?.trim() || (saved?.provider === body.provider ? saved.apiKey : "")
  if (!apiKey) return NextResponse.json({ ok: false, error: "ใส่ API key" }, { status: 400 })
  await saveAiConfig({ provider: body.provider, apiKey, model: body.model?.trim() || "" })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await saveAiConfig(null)
  return NextResponse.json({ ok: true })
}
