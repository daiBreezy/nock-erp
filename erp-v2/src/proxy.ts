import { NextResponse, type NextRequest } from "next/server"

/**
 * Parents' pages, LINE and the files they load — the only things open to someone who isn't staff
 * (no password: LINE and parents can't type one).
 */
const PARENT_PATHS = [
  /^\/liff(\/|$)/,
  /^\/api\/line\/webhook$/,
  /^\/api\/forms\/(token|submit)$/,
  /^\/api\/parent-forms\/(token|submit|enroll|enroll-submit|survey|survey-submit|custom-token|custom-submit)$/,
  // owner 2026-10-22: the course catalog — the parent's taps (reading the catalog is GET-only, below)
  /^\/api\/catalog\/request$/,
  /^\/api\/parent-view\/(me|requests)$/,
  // owner 2026-10-19: the driver app — its own trips by the secret in its link, and its taps
  /^\/api\/driver\/(me|event)$/,
  /^\/_next\//,
  /^\/brand\//,
  /^\/favicon\.ico$/,
]
/** a picture staff sent a parent — LINE fetches it by its id (GET only; uploading stays staff-only) */
const PARENT_MEDIA = /^\/api\/line\/media\/[^/]+$/
/** the catalog itself — read by its link (GET); creating / refreshing a branch's link stays staff-only */
const PARENT_GET = [PARENT_MEDIA, /^\/api\/catalog$/]
const isParentPath = (req: NextRequest) => PARENT_PATHS.some((r) => r.test(req.nextUrl.pathname)) || (req.method === "GET" && PARENT_GET.some((r) => r.test(req.nextUrl.pathname)))

/** came in through the internet tunnel (`npm run line`), not from this Mac or the office Wi-Fi */
function viaTunnel(req: NextRequest) {
  if (process.env.VERCEL) return false
  if (req.headers.get("cf-connecting-ip") || req.headers.get("cf-ray")) return true
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "").replace(/^\[|\]$/g, "")
  return !(host === "localhost" || host === "::1" || host.endsWith(".localhost") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host))
}

/**
 * 1. Through the tunnel (owner 2026-10-15): only the parents' pages + LINE answer — everything staff use (pages,
 *    Inbox, Settings, the send-to-LINE APIs) is 404, so a leaked tunnel link shows nothing but what parents see anyway.
 *    Staff keep using http://localhost:3310.
 * 2. Password on the shared demo link (owner 2026-10-07). Off unless DEMO_PASSWORD is set — so local dev is unchanged;
 *    on Vercel set DEMO_PASSWORD (and optionally DEMO_USER, default "nock") under Settings → Environment Variables.
 *    The browser shows its own sign-in box (HTTP Basic auth) and remembers it for the session.
 */
export function proxy(req: NextRequest) {
  if (viaTunnel(req)) {
    if (isParentPath(req)) return NextResponse.next()
    return new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }

  const password = process.env.DEMO_PASSWORD
  if (!password || isParentPath(req) || /^\/api\/(parent-forms|parent-view|forms)\//.test(req.nextUrl.pathname)) return NextResponse.next()
  const user = process.env.DEMO_USER || "nock"
  const auth = req.headers.get("authorization") ?? ""
  if (auth.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(auth.slice(6)).split(":")
      if (u === user && rest.join(":") === password) return NextResponse.next()
    } catch {
      // bad header → ask again
    }
  }
  return new NextResponse("ต้องใส่ชื่อผู้ใช้และรหัสผ่านเพื่อดู NockERP prototype", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="NockERP prototype", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" },
  })
}

export const config = {
  // everything except Next's own static files — the tunnel check has to see every page and API
  matcher: ["/((?!_next/static|_next/image).*)"],
}
