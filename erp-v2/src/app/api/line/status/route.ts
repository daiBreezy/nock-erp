import { NextResponse } from "next/server"

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
    return NextResponse.json({
      configured: true, connected: true, channelId,
      displayName: data.displayName, basicId: data.basicId,
      maskedToken: `••••${token.slice(-4)}`,
    })
  } catch {
    return NextResponse.json({ configured: true, connected: false, channelId, error: "เชื่อมต่อ LINE API ไม่ได้ (เครือข่ายมีปัญหา หรือ timeout)" })
  }
}
