import { NextResponse } from "next/server"
import { publicOrigin } from "@/server/public-url"

// Reads LINE credentials from server-only env vars (.env.local — never sent to the client bundle)
// and reports connection status. The Settings page polls this instead of holding the token itself.
export async function GET() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  const channelId = process.env.LINE_CHANNEL_ID ?? ""

  if (!token) {
    return NextResponse.json({ configured: false, channelId })
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      return NextResponse.json({ configured: true, connected: false, channelId, error: data?.message ?? `LINE ตอบกลับผิดพลาด (${res.status})` })
    }
    // owner 2026-10-15: show where LINE actually sends events (set by `npm run line`)
    const wh = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) })
      .then((r) => r.json() as Promise<{ endpoint?: string; active?: boolean }>).catch(() => null)
    return NextResponse.json({
      configured: true, connected: true, channelId,
      webhook: wh?.endpoint ?? null, webhookActive: !!wh?.active, publicUrl: publicOrigin() || null,
      displayName: data.displayName, basicId: data.basicId,
      maskedToken: `••••${token.slice(-4)}`,
    })
  } catch {
    return NextResponse.json({ configured: true, connected: false, channelId, error: "เชื่อมต่อ LINE API ไม่ได้ (เครือข่ายมีปัญหา หรือ timeout)" })
  }
}
