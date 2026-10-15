#!/usr/bin/env node
// npm run line — keeps LINE working with one command (owner 2026-10-15: "ทำไมฉันต้องคอยทำใหม่ตลอด")
//
// 1. opens a public URL to the dev server (cloudflared quick tunnel — or LINE_PUBLIC_URL if you have a fixed domain)
// 2. points the Messaging API webhook at it and runs LINE's webhook test
// 3. points the LIFF app (parent forms + parent app) at it — needs LINE_LOGIN_CHANNEL_SECRET in .env.local
// 4. writes the URL to .data/public-url.json (links / images the server sends use it)
// 5. watches the tunnel: if it drops, it opens a new one and does 2–4 again
//
// Rich menu links use https://liff.line.me/<LIFF_ID> — they never change, so nothing to do there.
import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const PORT = Number(process.env.PORT ?? 3310)

function loadEnv() {
  const file = join(root, ".env.local")
  const env = {}
  if (existsSync(file)) for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return { ...env, ...process.env }
}
const env = loadEnv()
const log = (...a) => console.log(`[line ${new Date().toLocaleTimeString("th-TH")}]`, ...a)

async function line(path, init = {}, token = env.LINE_CHANNEL_ACCESS_TOKEN) {
  const r = await fetch(`https://api.line.me${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } })
  const text = await r.text()
  if (!r.ok) throw new Error(`${r.status} ${text}`)
  return text ? JSON.parse(text) : {}
}

async function devServerUp() {
  try { await fetch(`http://localhost:${PORT}/api/line/status`); return true } catch { return false }
}

async function setWebhook(base) {
  const endpoint = `${base}/api/line/webhook`
  await line("/v2/bot/channel/webhook/endpoint", { method: "PUT", body: JSON.stringify({ endpoint }) })
  // the tunnel's DNS can take a few seconds to answer — retry LINE's test a few times
  for (let i = 0; i < 6; i++) {
    try {
      const t = await line("/v2/bot/channel/webhook/test", { method: "POST", body: JSON.stringify({ endpoint }) })
      if (t.success) return log("✓ Webhook", endpoint)
      log(`… webhook test: ${t.statusCode ?? ""} ${t.reason ?? ""} — retrying`)
    } catch (e) { log("… webhook test failed:", e.message) }
    await new Promise((r) => setTimeout(r, 5000))
  }
  log("⚠ Webhook set, but LINE's test didn't pass yet:", endpoint)
}

async function setLiff(base) {
  const liffId = env.NEXT_PUBLIC_LIFF_ID
  const secret = env.LINE_LOGIN_CHANNEL_SECRET
  if (!liffId) return log("⚠ NEXT_PUBLIC_LIFF_ID missing in .env.local — skipped LIFF")
  const url = `${base}/liff/form`
  if (!secret) return log(`⚠ LIFF not updated automatically — add LINE_LOGIN_CHANNEL_SECRET to .env.local (LINE Developers › LINE Login channel ${liffId.split("-")[0]} › Basic settings › Channel secret). For now set the LIFF Endpoint URL by hand: ${url}`)
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: liffId.split("-")[0], client_secret: secret })
  const tr = await fetch("https://api.line.me/v2/oauth/accessToken", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body })
  if (!tr.ok) return log("⚠ LIFF: couldn't get a LINE Login token —", tr.status, await tr.text())
  const { access_token } = await tr.json()
  await line(`/liff/v1/apps/${liffId}`, { method: "PUT", body: JSON.stringify({ view: { type: "full", url } }) }, access_token)
  log("✓ LIFF endpoint", url)
}

function savePublicUrl(base) {
  const dir = join(root, ".data")
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "public-url.json"), JSON.stringify({ url: base, at: new Date().toISOString() }, null, 2))
}

async function syncAll(base) {
  log("Public URL:", base)
  savePublicUrl(base)
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) { log("⚠ LINE_CHANNEL_ACCESS_TOKEN missing in .env.local — skipped webhook"); return }
  try { await setWebhook(base) } catch (e) { log("✗ Webhook:", e.message) }
  try { await setLiff(base) } catch (e) { log("✗ LIFF:", e.message) }
  log("พร้อมใช้งาน — เปิด LINE OA ได้เลย (ปิดหน้าต่างนี้ = LINE ใช้ไม่ได้)")
}

function cloudflaredBin() {
  for (const p of [join(homedir(), ".local/bin/cloudflared"), "/opt/homebrew/bin/cloudflared", "/usr/local/bin/cloudflared"]) if (existsSync(p)) return p
  return "cloudflared"
}

function startTunnel() {
  const cf = spawn(cloudflaredBin(), ["tunnel", "--url", `http://localhost:${PORT}`, "--no-autoupdate"], { stdio: ["ignore", "pipe", "pipe"] })
  let url = null, synced = false, lastError = 0
  const onData = (buf) => {
    const s = buf.toString()
    const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
    if (m && !url) { url = m[0]; setTimeout(() => syncAll(url).then(() => { synced = true }), 3000) }
    // a quick tunnel that Cloudflare forgot never comes back — start a fresh one
    if (/Tunnel not found|failed to sufficiently increase receive buffer|Unauthorized/.test(s) && synced && Date.now() - lastError > 60_000) {
      lastError = Date.now()
      log("tunnel lost — opening a new one")
      cf.kill()
    }
  }
  cf.stdout.on("data", onData)
  cf.stderr.on("data", onData)
  cf.on("exit", (code) => { log(`cloudflared exited (${code}) — restarting in 5 s`); setTimeout(startTunnel, 5000) })
  // also check from outside every 2 minutes: if the public URL stops answering, restart
  const watch = setInterval(async () => {
    if (!url || !synced) return
    try {
      const r = await fetch(`${url}/api/line/status`, { signal: AbortSignal.timeout(15000) })
      if (r.status >= 500 && r.status !== 503) throw new Error(String(r.status))
    } catch (e) {
      log("public URL not answering —", e.message, "— restarting tunnel"); clearInterval(watch); cf.kill()
    }
  }, 120_000)
  cf.on("exit", () => clearInterval(watch))
}

if (!(await devServerUp())) log(`⚠ dev server isn't answering on http://localhost:${PORT} — start it (npm run dev -- -p ${PORT}); LINE will work as soon as it's up`)
if (env.LINE_PUBLIC_URL) {
  // a fixed domain (e.g. ngrok static domain / Cloudflare named tunnel) — set it once, nothing changes later
  await syncAll(env.LINE_PUBLIC_URL.replace(/\/$/, ""))
} else {
  startTunnel()
}
