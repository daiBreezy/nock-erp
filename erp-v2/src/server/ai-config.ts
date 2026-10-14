import { promises as fs } from "fs"
import path from "path"
import { DATA_DIR } from "./data-dir"

// Nock's AI model settings (owner 2026-10-14: set in Settings › ระบบ › AI, like LINE Integration). Saved server-side in
// .data/ (git-ignored) so the key never goes back to the browser. Settings saved here win over the .env.local keys.

export type AiProvider = "gemini" | "openai"
export interface AiConfig { provider: AiProvider; apiKey: string; model: string }

const FILE = path.join(DATA_DIR, "ai-config.json")
export const DEFAULT_MODEL: Record<AiProvider, string> = { gemini: "gemini-2.5-flash", openai: "gpt-4o-mini" }

export async function readSavedAiConfig(): Promise<AiConfig | null> {
  try { return JSON.parse(await fs.readFile(FILE, "utf8")) as AiConfig } catch { return null }
}

export async function saveAiConfig(c: AiConfig | null) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  if (c) await fs.writeFile(FILE, JSON.stringify(c, null, 2))
  else await fs.rm(FILE, { force: true })
}

/** the model Nock uses now — Settings first, then .env.local */
export async function activeAiConfig(): Promise<(AiConfig & { source: "settings" | "env" }) | null> {
  const saved = await readSavedAiConfig()
  if (saved?.apiKey) return { ...saved, model: saved.model || DEFAULT_MODEL[saved.provider], source: "settings" }
  if (process.env.GEMINI_API_KEY) return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY, model: process.env.NOCK_MODEL || DEFAULT_MODEL.gemini, source: "env" }
  if (process.env.OPENAI_API_KEY) return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.NOCK_MODEL || DEFAULT_MODEL.openai, source: "env" }
  return null
}

export const maskKey = (k: string) => (k.length > 8 ? `${k.slice(0, 4)}…${k.slice(-4)}` : "••••")

/** one call to the model: system + messages in, text out */
export async function callModel(c: AiConfig, system: string, messages: { role: "user" | "assistant"; text: string }[], json = true): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    if (c.provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${c.model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": c.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
          generationConfig: { ...(json ? { responseMimeType: "application/json" } : {}), temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(25000),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) return { ok: false, error: data?.error?.message ?? `Gemini ${res.status}` }
      return { ok: true, text: data?.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text ?? "").join("") ?? "" }
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.apiKey}` },
      body: JSON.stringify({ model: c.model, temperature: 0.2, ...(json ? { response_format: { type: "json_object" } } : {}), messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.text }))] }),
      signal: AbortSignal.timeout(25000),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.error?.message ?? `OpenAI ${res.status}` }
    return { ok: true, text: data?.choices?.[0]?.message?.content ?? "" }
  } catch {
    return { ok: false, error: "เรียก AI ไม่ได้ (เครือข่ายมีปัญหา หรือ timeout)" }
  }
}
