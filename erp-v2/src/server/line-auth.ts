// LINE helpers for the parent side (owner 2026-10-09 / 10-14): LINE proves who opened the parent app (LIFF ID token),
// and the school can push a short message back to that parent.

/** the LINE user behind a LIFF ID token — null when LINE doesn't vouch for it */
export async function lineUserFromIdToken(idToken: string): Promise<{ sub: string; name?: string } | null> {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!idToken || !liffId) return null
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: liffId.split("-")[0] }),
  }).catch(() => null)
  const who = res?.ok ? ((await res.json()) as { sub?: string; name?: string }) : null
  return who?.sub ? { sub: who.sub, name: who.name } : null
}

/** push one text message to a LINE user — false when LINE isn't configured or refuses */
export async function pushLineText(to: string, text: string): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return false
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  return !!res?.ok
}
