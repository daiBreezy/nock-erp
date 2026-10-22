import { NextResponse } from "next/server"
import { getCatalogToken, upsertCatalogToken } from "@/server/parent-form-store"
import type { CatalogToken } from "@/domain/types"

// Staff: create / refresh the branch's catalog link (owner 2026-10-22). Parent page: read it.
export async function POST(req: Request) {
  let body: Partial<CatalogToken>
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 }) }
  if (!body.branchId || !body.courses || !body.classes) return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 })
  const token = await upsertCatalogToken({
    token: body.token, branchId: body.branchId, branchName: body.branchName ?? "", brand: body.brand ?? "nockacademy", lang: body.lang ?? "th",
    grades: body.grades ?? [], subjects: body.subjects ?? [], subjectNames: body.subjectNames, courses: body.courses, classes: body.classes,
  })
  return NextResponse.json({ ok: true, token })
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  return NextResponse.json(await getCatalogToken(token))
}
