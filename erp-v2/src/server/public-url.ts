import { readFileSync } from "fs"
import path from "path"
import { DATA_DIR } from "./data-dir"

/** The https address LINE can reach (owner 2026-10-15) — written by `npm run line` (scripts/line-up.mjs) whenever the
 *  tunnel opens, or LINE_PUBLIC_URL for a fixed domain. Falls back to the request's own origin. */
export function publicOrigin(req?: Request): string {
  if (process.env.LINE_PUBLIC_URL) return process.env.LINE_PUBLIC_URL.replace(/\/$/, "")
  try {
    const { url } = JSON.parse(readFileSync(path.join(DATA_DIR, "public-url.json"), "utf8")) as { url?: string }
    if (url?.startsWith("https://")) return url
  } catch { /* not opened yet */ }
  return req ? new URL(req.url).origin : ""
}
