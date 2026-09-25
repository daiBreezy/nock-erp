import { NextResponse } from "next/server"
import { submitForm } from "@/server/form-store"

// Called from the LIFF page after a parent picks one or more offered slots (one per subject —
// 2+ on the same date+time get merged into a single shared booking at approve time) and submits.
export async function POST(req: Request) {
  let body: {
    token?: string; lineUserId?: string; parentName?: string; parentPhone?: string
    studentName?: string; studentGrade?: string; picks?: { chosenSubject: string; chosenSlotId: string }[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const { token, lineUserId, parentName, parentPhone, studentName, studentGrade, picks } = body
  if (!token || !lineUserId || !parentName || !parentPhone || !studentName || !studentGrade || !picks?.length) {
    return NextResponse.json({ ok: false, error: "กรอกข้อมูลให้ครบทุกช่อง" }, { status: 400 })
  }
  const result = await submitForm({ token, lineUserId, parentName, parentPhone, studentName, studentGrade, picks })
  return NextResponse.json(result)
}
