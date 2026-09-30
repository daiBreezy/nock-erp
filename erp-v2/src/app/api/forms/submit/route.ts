import { NextResponse } from "next/server"
import type { FormParentInput, LeadSource } from "@/domain/types"
import { submitForm } from "@/server/form-store"

// Called from the LIFF page after a parent fills in the 3-step wizard (Parent info → Student info →
// Summary) and submits. One or more students, each with one or more subject/slot picks — 2+ picks on
// the same date+time for the SAME student get merged into a single shared booking at approve time.
export async function POST(req: Request) {
  let body: {
    token?: string; lineUserId?: string
    parents?: FormParentInput[]
    familyAddress?: string; familyPostcode?: string; familyProvince?: string; acquisition?: LeadSource
    taxInfo?: { customerName: string; taxId: string; address: string }
    students?: { name: string; nickname?: string; grade: string; birthDate?: string; note?: string; picks?: { chosenSubject: string; chosenSlotId: string }[] }[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const { token, lineUserId, parents, familyAddress, familyPostcode, familyProvince, acquisition, taxInfo, students } = body
  if (!token || !lineUserId || !parents?.length || !students?.length) {
    return NextResponse.json({ ok: false, error: "กรอกข้อมูลให้ครบทุกช่อง" }, { status: 400 })
  }
  if (parents.some((p) => !p.name?.trim() || !p.phone?.trim())) {
    return NextResponse.json({ ok: false, error: "ใส่ชื่อและเบอร์โทรผู้ปกครองให้ครบ" }, { status: 400 })
  }
  if (students.some((s) => !s.name?.trim() || !s.grade || !s.picks?.length)) {
    return NextResponse.json({ ok: false, error: "ใส่ชื่อ ระดับชั้น และเลือกวิชา/เวลาให้นักเรียนทุกคน" }, { status: 400 })
  }
  const result = await submitForm({
    token, lineUserId, parents, familyAddress, familyPostcode, familyProvince, acquisition,
    taxInfo: taxInfo?.customerName?.trim() || taxInfo?.taxId?.trim() ? taxInfo : undefined,
    students: students.map((s) => ({ name: s.name, nickname: s.nickname, grade: s.grade, birthDate: s.birthDate, note: s.note, picks: s.picks! })),
  })
  return NextResponse.json(result)
}
