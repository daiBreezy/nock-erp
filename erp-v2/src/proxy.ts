import { NextResponse, type NextRequest } from "next/server"

/**
 * Password on the shared demo link (owner 2026-10-07). Off unless DEMO_PASSWORD is set — so local dev is unchanged;
 * on Vercel set DEMO_PASSWORD (and optionally DEMO_USER, default "nock") under Settings → Environment Variables.
 * The browser shows its own sign-in box (HTTP Basic auth) and remembers it for the session.
 * Parents' pages (/liff) and the LINE webhook stay open — LINE and parents can't type a password.
 */
export function proxy(req: NextRequest) {
  const password = process.env.DEMO_PASSWORD
  if (!password) return NextResponse.next()
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
  // everything except Next's own files, the brand images, parents' forms and the LINE webhook
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|liff|api/line/webhook|api/parent-forms|api/forms).*)"],
}
