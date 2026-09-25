import { NextResponse } from "next/server"
import { submitForm } from "@/server/form-store"

// Called from the LIFF page after a parent fills in the Test/Trial form.
export async function POST(req: Request) {
  let body: {
    token?: string; lineUserId?: string; parentName?: string; parentPhone?: string
    studentName?: string; studentGrade?: string; subject?: string; preferredTime?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const { token, lineUserId, parentName, parentPhone, studentName, studentGrade, subject, preferredTime } = body
  if (!token || !lineUserId || !parentName || !parentPhone || !studentName || !studentGrade || !subject || !preferredTime) {
    return NextResponse.json({ ok: false, error: "กรอกข้อมูลให้ครบทุกช่อง" }, { status: 400 })
  }
  const result = await submitForm({ token, lineUserId, parentName, parentPhone, studentName, studentGrade, subject, preferredTime })
  return NextResponse.json(result)
}
