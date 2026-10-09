import { NextResponse } from "next/server"
import type { ParentView } from "@/domain/rules/parent-view"
import { publishViews } from "@/server/parent-app-store"

// Staff side (behind the demo password): the ERP pushes what each LINE-linked family may see.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { views?: ParentView[] }
  if (!Array.isArray(body.views)) return NextResponse.json({ ok: false, error: "ไม่มีข้อมูล" }, { status: 400 })
  const views = body.views.filter((v) => v && typeof v.familyId === "string" && Array.isArray(v.lineUserIds) && v.lineUserIds.length > 0)
  return NextResponse.json({ ok: true, published: await publishViews(views) })
}
