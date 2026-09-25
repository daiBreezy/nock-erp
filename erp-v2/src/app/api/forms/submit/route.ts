import { NextResponse } from "next/server"
import { submitForm } from "@/server/form-store"

// Called from the LIFF page after a parent picks one of the offered slots and submits.
export async function POST(req: Request) {
  let body: {
    token?: string; lineUserId?: string; parentName?: string; parentPhone?: string
    studentName?: string; studentGrade?: string; chosenSubject?: string; chosenSlotId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const { token, lineUserId, parentName, parentPhone, studentName, studentGrade, chosenSubject, chosenSlotId } = body
  if (!token || !lineUserId || !parentName || !parentPhone || !studentName || !studentGrade || !chosenSubject || !chosenSlotId) {
    return NextResponse.json({ ok: false, error: "กรอกข้อมูลให้ครบทุกช่อง" }, { status: 400 })
  }
  const result = await submitForm({ token, lineUserId, parentName, parentPhone, studentName, studentGrade, chosenSubject, chosenSlotId })
  return NextResponse.json(result)
}
