"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2Icon, LoaderCircleIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FormType } from "@/domain/types"

const GRADES = ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"]
const SUBJECTS = ["คณิต", "อังกฤษ", "วิทย์", "ไทย", "สังคม"]
const TYPE_LABEL: Record<FormType, string> = { test: "สอบวัดระดับ", trial: "ทดลองเรียน" }

type Phase = "init" | "invalid" | "ready" | "submitting" | "done"

export default function LiffFormPage() {
  return (
    <Suspense fallback={<Centered><Spinner /></Centered>}>
      <LiffForm />
    </Suspense>
  )
}

function LiffForm() {
  const token = useSearchParams().get("token") ?? ""
  const [phase, setPhase] = useState<Phase>("init")
  const [error, setError] = useState("")
  const [formType, setFormType] = useState<FormType>("test")
  const [lineUserId, setLineUserId] = useState("")
  const [displayName, setDisplayName] = useState("")

  const [parentName, setParentName] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [studentName, setStudentName] = useState("")
  const [studentGrade, setStudentGrade] = useState(GRADES[0])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [preferredTime, setPreferredTime] = useState("")

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!token) return setError("ลิงก์นี้ไม่ถูกต้อง — ไม่มีรหัสฟอร์ม"), setPhase("invalid")
      try {
        // liff SDK is browser-only — dynamic import keeps it out of the server bundle
        const liff = (await import("@line/liff")).default
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) throw new Error("ยังไม่ได้ตั้งค่า LIFF ID")
        await liff.init({ liffId })
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return // login() navigates away; this component unmounts
        }
        const profile = await liff.getProfile()
        if (cancelled) return
        setLineUserId(profile.userId)
        setDisplayName(profile.displayName)
        setParentName(profile.displayName)

        const res = await fetch(`/api/forms/token?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (cancelled) return
        if (!data.ok) { setError(data.error ?? "ลิงก์นี้ใช้ไม่ได้แล้ว"); setPhase("invalid"); return }
        setFormType(data.type)
        setPhase("ready")
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "เปิดฟอร์มไม่สำเร็จ — ลองเปิดลิงก์นี้จากแอป LINE อีกครั้ง")
        setPhase("invalid")
      }
    }
    run()
    return () => { cancelled = true }
  }, [token])

  const submit = async () => {
    if (!parentName.trim() || !parentPhone.trim() || !studentName.trim() || !preferredTime.trim()) return
    setPhase("submitting")
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lineUserId, parentName, parentPhone, studentName, studentGrade, subject, preferredTime }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? "ส่งไม่สำเร็จ"); setPhase("ready"); return }
      setPhase("done")
    } catch {
      setError("ส่งไม่สำเร็จ — เครือข่ายมีปัญหา ลองอีกครั้ง")
      setPhase("ready")
    }
  }

  if (phase === "init") return <Centered><Spinner /><p className="mt-3 text-sm text-muted-foreground">กำลังเปิดฟอร์ม…</p></Centered>

  if (phase === "invalid") return (
    <Centered>
      <XCircleIcon className="size-10 text-red-500" />
      <p className="mt-3 text-center text-sm text-muted-foreground">{error}</p>
    </Centered>
  )

  if (phase === "done") return (
    <Centered>
      <CheckCircle2Icon className="size-10 text-emerald-500" />
      <p className="mt-3 text-center text-lg font-semibold">ส่งข้อมูลแล้ว!</p>
      <p className="mt-1 text-center text-sm text-muted-foreground">ขอบคุณค่ะ ทางสถาบันจะติดต่อกลับทาง LINE เร็วๆ นี้</p>
    </Centered>
  )

  return (
    <div className="mx-auto max-w-md space-y-4 p-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold">แบบฟอร์ม{TYPE_LABEL[formType]}</h1>
        <p className="text-xs text-muted-foreground">สวัสดีค่ะ คุณ{displayName} — กรอกข้อมูลด้านล่างเพื่อนัด{TYPE_LABEL[formType]}</p>
      </div>

      <Field label="ชื่อผู้ปกครอง *"><Input value={parentName} onChange={(e) => setParentName(e.target.value)} /></Field>
      <Field label="เบอร์โทรติดต่อ *"><Input inputMode="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="081-234-5678" /></Field>
      <Field label="ชื่อนักเรียน *"><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ระดับชั้น *">
          <select className="h-9 w-full rounded-lg border bg-background px-2 text-sm" value={studentGrade} onChange={(e) => setStudentGrade(e.target.value)}>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="วิชาที่สนใจ *">
          <select className="h-9 w-full rounded-lg border bg-background px-2 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="วัน-เวลาที่สะดวก *"><Input value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} placeholder="เช่น เสาร์บ่าย, อาทิตย์เช้า" /></Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button className="w-full" disabled={phase === "submitting" || !parentName.trim() || !parentPhone.trim() || !studentName.trim() || !preferredTime.trim()} onClick={submit}>
        {phase === "submitting" ? <LoaderCircleIcon className="animate-spin" /> : "ส่งฟอร์ม"}
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center p-6">{children}</div>
}

function Spinner() {
  return <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
}
