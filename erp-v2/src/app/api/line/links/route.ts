import { NextResponse } from "next/server"
import { readLinks, upsertLinks } from "@/server/line-links"

// staff only (not in the tunnel's parent list): the ERP keeps its LINE ↔ family links here and reads them back
export async function GET() {
  return NextResponse.json({ ok: true, links: await readLinks() })
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { links?: { lineUserId?: string; familyId?: string; familyName?: string }[] }
  const links = (b.links ?? []).slice(0, 2000).map((l) => ({ lineUserId: String(l.lineUserId ?? ""), familyId: String(l.familyId ?? ""), familyName: String(l.familyName ?? "") }))
  return NextResponse.json({ ok: true, changed: await upsertLinks(links) })
}
