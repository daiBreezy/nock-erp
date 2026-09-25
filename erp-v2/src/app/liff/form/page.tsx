"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2Icon, LoaderCircleIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtDate } from "@/domain/dates"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormOfferSlot, FormSubjectOffer, FormType } from "@/domain/types"
import { cn } from "@/lib/utils"

type Phase = "init" | "invalid" | "ready" | "submitting" | "done"

export default function LiffFormPage() {
  return (
    <Suspense fallback={<Centered><Spinner /></Centered>}>
      <LiffForm />
    </Suspense>
  )
}

function LiffForm() {
  const initialToken = useSearchParams().get("token") ?? ""
  const [token, setToken] = useState(initialToken)
  const [phase, setPhase] = useState<Phase>("init")
  const [error, setError] = useState("")
  const [formType, setFormType] = useState<FormType>("test")
  const [offers, setOffers] = useState<FormSubjectOffer[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [lineUserId, setLineUserId] = useState("")
  const [displayName, setDisplayName] = useState("")

  const [parentName, setParentName] = useState("")
  const [parentPhone, setParentPhone] = useState("")
  const [studentName, setStudentName] = useState("")
  const [studentGrade, setStudentGrade] = useState("")
  // one pick per subject — 2+ picked for the same date must share the same start time (enforced
  // below by disabling non-matching options), and get merged into one 2-hour visit at approve time
  const [chosen, setChosen] = useState<Record<string, FormOfferSlot>>({})

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        // liff SDK is browser-only — dynamic import keeps it out of the server bundle
        const liff = (await import("@line/liff")).default
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) throw new Error("ยังไม่ได้ตั้งค่า LIFF ID")
        await liff.init({ liffId })
        // liff.init() decodes the "liff.state" param (used after the LINE Login redirect) and
        // restores the original query string via history.replaceState — so re-read `token` from
        // the URL only *after* init, not from the pre-init useSearchParams() snapshot above.
        const currentToken = new URLSearchParams(window.location.search).get("token") ?? initialToken
        if (cancelled) return
        setToken(currentToken)
        if (!currentToken) { setError("ลิงก์นี้ไม่ถูกต้อง — ไม่มีรหัสฟอร์ม"); setPhase("invalid"); return }
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return // login() navigates away; this component unmounts
        }
        const profile = await liff.getProfile()
        if (cancelled) return
        setLineUserId(profile.userId)
        setDisplayName(profile.displayName)
        setParentName(profile.displayName)

        const res = await fetch(`/api/forms/token?token=${encodeURIComponent(currentToken)}`)
        const data = await res.json()
        if (cancelled) return
        if (!data.ok) { setError(data.error ?? "ลิงก์นี้ใช้ไม่ได้แล้ว"); setPhase("invalid"); return }
        if (!data.offers?.length) { setError("ยังไม่มีช่วงเวลาให้เลือก — ติดต่อสถาบันโดยตรง"); setPhase("invalid"); return }
        setFormType(data.type)
        setOffers(data.offers)
        setGrades(data.grades ?? [])
        setStudentGrade(data.grades?.[0] ?? "")
        setPhase("ready")
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "เปิดฟอร์มไม่สำเร็จ — ลองเปิดลิงก์นี้จากแอป LINE อีกครั้ง")
        setPhase("invalid")
      }
    }
    run()
    return () => { cancelled = true }
  }, [initialToken])

  const picks = Object.entries(chosen)

  const submit = async () => {
    if (!parentName.trim() || !parentPhone.trim() || !studentName.trim() || !studentGrade || !picks.length) return
    setPhase("submitting")
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, lineUserId, parentName, parentPhone, studentName, studentGrade,
          picks: picks.map(([subject, slot]) => ({ chosenSubject: subject, chosenSlotId: slot.id })),
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? "ส่งไม่สำเร็จ"); setPhase("ready"); return }
      setPhase("done")
    } catch {
      setError("ส่งไม่สำเร็จ — เครือข่ายมีปัญหา ลองอีกครั้ง")
      setPhase("ready")
    }
  }

  /** if another already-picked subject landed on this same date, only its exact start time stays
   *  pickable for this subject too — different dates stay fully independent */
  const lockedTimeFor = (subject: string, date: string): string | null => {
    for (const [otherSubject, slot] of picks) {
      if (otherSubject !== subject && slot.date === date) return slot.start
    }
    return null
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
        <h1 className="text-lg font-semibold">แบบฟอร์ม{FORM_TYPE_LABEL[formType]}</h1>
        <p className="text-xs text-muted-foreground">สวัสดีค่ะ คุณ{displayName} — กรอกข้อมูลด้านล่างเพื่อนัด{FORM_TYPE_LABEL[formType]}</p>
      </div>

      <Field label="ชื่อผู้ปกครอง *"><Input value={parentName} onChange={(e) => setParentName(e.target.value)} /></Field>
      <Field label="เบอร์โทรติดต่อ *"><Input inputMode="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="081-234-5678" /></Field>
      <Field label="ชื่อนักเรียน *"><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} /></Field>
      <Field label="ระดับชั้น *">
        <select className="h-9 w-full rounded-lg border bg-background px-2 text-sm" value={studentGrade} onChange={(e) => setStudentGrade(e.target.value)}>
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>

      <div className="space-y-3">
        <Label className="text-xs">เลือกวันเวลา * (เลือกได้มากกว่า 1 วิชา)</Label>
        {offers.length > 1 && <p className="text-[11px] text-muted-foreground">ถ้าเลือกหลายวิชาในวันเดียวกัน ต้องเป็นเวลาเริ่มเดียวกัน (รวมเป็นนัดเดียว ไม่เกิน 2 ชม.)</p>}
        {offers.map((offer) => {
          const mine = chosen[offer.subject]
          return (
            <div key={offer.subject}>
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">{offer.subject}</p>
                {mine && (
                  <button type="button" className="text-[11px] text-red-600 underline" onClick={() => setChosen((c) => { const next = { ...c }; delete next[offer.subject]; return next })}>
                    ยกเลิก
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {offer.slots.map((slot) => {
                  const locked = lockedTimeFor(offer.subject, slot.date)
                  const disabled = locked !== null && locked !== slot.start
                  const active = mine?.id === slot.id
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setChosen((c) => ({ ...c, [offer.subject]: slot }))}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-left text-xs transition-colors",
                        disabled ? "cursor-not-allowed opacity-40" : active ? "border-primary bg-primary/10" : "hover:bg-muted",
                      )}
                    >
                      {fmtDate(slot.date, { weekday: true })} · {slot.start} น.
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button className="w-full" disabled={phase === "submitting" || !parentName.trim() || !parentPhone.trim() || !studentName.trim() || !studentGrade || !picks.length} onClick={submit}>
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
