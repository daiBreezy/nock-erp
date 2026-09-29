"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2Icon, ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon, PlusIcon, SendIcon, TrashIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate } from "@/domain/dates"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormOfferSlot, FormSubjectOffer, FormType } from "@/domain/types"
import { cn } from "@/lib/utils"

type Phase = "init" | "invalid" | "ready" | "submitting" | "done"
type Step = "parent" | "student" | "summary"
const STEPS: { key: Step; label: string }[] = [{ key: "parent", label: "ผู้ปกครอง" }, { key: "student", label: "นักเรียน" }, { key: "summary", label: "ตรวจสอบ" }]

interface ParentBlock { name: string; phone: string; email: string; relationship: string; birthDate: string }
const emptyParent = (name = ""): ParentBlock => ({ name, phone: "", email: "", relationship: "", birthDate: "" })

interface StudentBlock { key: string; name: string; nickname: string; grade: string; birthDate: string; note: string; activeSubjects: string[]; chosen: Record<string, FormOfferSlot> }
let studentSeq = 0
const emptyStudent = (grade: string): StudentBlock => ({ key: `st${studentSeq++}`, name: "", nickname: "", grade, birthDate: "", note: "", activeSubjects: [], chosen: {} })

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
  const [step, setStep] = useState<Step>("parent")
  const [error, setError] = useState("")
  const [formType, setFormType] = useState<FormType>("test")
  const [offers, setOffers] = useState<FormSubjectOffer[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [lineUserId, setLineUserId] = useState("")
  const [displayName, setDisplayName] = useState("")

  const [parents, setParents] = useState<ParentBlock[]>([emptyParent()])
  const [familyAddress, setFamilyAddress] = useState("")
  const [familyPostcode, setFamilyPostcode] = useState("")
  const [students, setStudents] = useState<StudentBlock[]>([])

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
        setParents([emptyParent(profile.displayName)])

        const res = await fetch(`/api/forms/token?token=${encodeURIComponent(currentToken)}`)
        const data = await res.json()
        if (cancelled) return
        if (!data.ok) { setError(data.error ?? "ลิงก์นี้ใช้ไม่ได้แล้ว"); setPhase("invalid"); return }
        if (!data.offers?.length) { setError("ยังไม่มีช่วงเวลาให้เลือก — ติดต่อสถาบันโดยตรง"); setPhase("invalid"); return }
        setFormType(data.type)
        setOffers(data.offers)
        setGrades(data.grades ?? [])
        setStudents([emptyStudent(data.grades?.[0] ?? "")])
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

  const setParent = (i: number, patch: Partial<ParentBlock>) => setParents((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const setStudent = (key: string, patch: Partial<StudentBlock>) => setStudents((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  const parentsValid = parents.length > 0 && parents.every((p) => p.name.trim() && p.phone.trim())
  const studentsValid = students.length > 0 && students.every((s) => s.name.trim() && s.grade && s.activeSubjects.length > 0 && s.activeSubjects.every((subj) => s.chosen[subj]))

  const submit = async () => {
    if (!parentsValid || !studentsValid) return
    setPhase("submitting")
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, lineUserId,
          parents: parents.map((p) => ({ name: p.name, phone: p.phone, email: p.email || undefined, relationship: p.relationship || undefined, birthDate: p.birthDate || undefined })),
          familyAddress: familyAddress || undefined, familyPostcode: familyPostcode || undefined,
          students: students.map((s) => ({
            name: s.name, nickname: s.nickname || undefined, grade: s.grade, birthDate: s.birthDate || undefined, note: s.note || undefined,
            picks: Object.entries(s.chosen).map(([subject, slot]) => ({ chosenSubject: subject, chosenSlotId: slot.id })),
          })),
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

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="mx-auto max-w-md space-y-4 p-5">
      <div className="text-center">
        <h1 className="text-lg font-semibold">แบบฟอร์ม{FORM_TYPE_LABEL[formType]}</h1>
        <p className="text-xs text-muted-foreground">สวัสดีค่ะ คุณ{displayName} — กรอกข้อมูลด้านล่างเพื่อนัด{FORM_TYPE_LABEL[formType]}</p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs">
        {STEPS.map((s, i) => (
          <div key={s.key} className={cn("flex items-center gap-1.5", i > 0 && "ml-1.5")}>
            {i > 0 && <span className="text-muted-foreground">—</span>}
            <span className={cn("rounded-full px-2.5 py-1", i === stepIndex ? "bg-primary text-primary-foreground" : i < stepIndex ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>{s.label}</span>
          </div>
        ))}
      </div>

      {step === "parent" && (
        <div className="space-y-4">
          {parents.map((p, i) => (
            <div key={i} className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">ผู้ปกครองคนที่ {i + 1}</p>
                {parents.length > 1 && <button type="button" className="text-red-600" aria-label="ลบผู้ปกครองคนนี้" onClick={() => setParents((ps) => ps.filter((_, j) => j !== i))}><TrashIcon className="size-3.5" /></button>}
              </div>
              <Field label="ชื่อ-นามสกุล *"><Input value={p.name} onChange={(e) => setParent(i, { name: e.target.value })} /></Field>
              <Field label="เบอร์โทรติดต่อ *"><Input inputMode="tel" value={p.phone} onChange={(e) => setParent(i, { phone: e.target.value })} placeholder="081-234-5678" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="ความสัมพันธ์"><Input value={p.relationship} onChange={(e) => setParent(i, { relationship: e.target.value })} placeholder="คุณแม่ / คุณพ่อ" /></Field>
                <Field label="อีเมล"><Input type="email" value={p.email} onChange={(e) => setParent(i, { email: e.target.value })} /></Field>
              </div>
            </div>
          ))}
          <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-sm text-primary" onClick={() => setParents((ps) => [...ps, emptyParent()])}>
            <PlusIcon className="size-4" /> เพิ่มผู้ปกครอง
          </button>

          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <Field label="ที่อยู่ (สำหรับรถรับส่ง — ไม่บังคับ)"><Input value={familyAddress} onChange={(e) => setFamilyAddress(e.target.value)} /></Field>
            <Field label="รหัสไปรษณีย์"><Input inputMode="numeric" maxLength={5} value={familyPostcode} onChange={(e) => setFamilyPostcode(e.target.value)} /></Field>
          </div>
        </div>
      )}

      {step === "student" && (
        <div className="space-y-4">
          {students.map((s) => (
            <StudentCard key={s.key} student={s} grades={grades} offers={offers} onChange={(patch) => setStudent(s.key, patch)} onRemove={students.length > 1 ? () => setStudents((ss) => ss.filter((x) => x.key !== s.key)) : undefined} />
          ))}
          <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-sm text-primary" onClick={() => setStudents((ss) => [...ss, emptyStudent(grades[0] ?? "")])}>
            <PlusIcon className="size-4" /> เพิ่มนักเรียน
          </button>
        </div>
      )}

      {step === "summary" && (
        <div className="space-y-4">
          <div className="rounded-xl border p-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">ผู้ปกครอง</p>
            <div className="space-y-1 text-sm">
              {parents.map((p, i) => <p key={i}>{p.name} · {p.phone}{p.relationship && ` (${p.relationship})`}</p>)}
              {(familyAddress || familyPostcode) && <p className="text-xs text-muted-foreground">{[familyAddress, familyPostcode].filter(Boolean).join(" ")}</p>}
            </div>
          </div>
          {students.map((s) => (
            <div key={s.key} className="rounded-xl border p-3">
              <p className="text-sm font-medium">{s.name}{s.nickname && ` (${s.nickname})`} · {s.grade}</p>
              {s.note && <p className="mt-0.5 text-xs text-muted-foreground">{s.note}</p>}
              <div className="mt-1.5 space-y-0.5 text-xs">
                {Object.entries(s.chosen).map(([subject, slot]) => <p key={subject}>{subject} · {fmtDate(slot.date, { weekday: true })} {slot.start} น.</p>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between pt-1">
        {stepIndex > 0 ? <Button variant="ghost" onClick={() => setStep(STEPS[stepIndex - 1].key)}><ChevronLeftIcon /> ย้อนกลับ</Button> : <span />}
        {step === "parent" && <Button disabled={!parentsValid} onClick={() => setStep("student")}>ถัดไป <ChevronRightIcon /></Button>}
        {step === "student" && <Button disabled={!studentsValid} onClick={() => setStep("summary")}>ถัดไป <ChevronRightIcon /></Button>}
        {step === "summary" && (
          <Button disabled={phase === "submitting"} onClick={submit}>
            {phase === "submitting" ? <LoaderCircleIcon className="animate-spin" /> : <><SendIcon /> ส่งฟอร์ม</>}
          </Button>
        )}
      </div>
    </div>
  )
}

function StudentCard({ student: s, grades, offers, onChange, onRemove }: { student: StudentBlock; grades: string[]; offers: FormSubjectOffer[]; onChange: (patch: Partial<StudentBlock>) => void; onRemove?: () => void }) {
  // a subject is "active" (its slot list shown) as soon as its chip is toggled on, even before a time
  // is picked yet — separate from `chosen`, which only holds subjects that have an actual slot picked
  const toggleSubject = (subject: string) => {
    if (s.activeSubjects.includes(subject)) {
      const next = { ...s.chosen }; delete next[subject]
      onChange({ activeSubjects: s.activeSubjects.filter((x) => x !== subject), chosen: next })
    } else {
      onChange({ activeSubjects: [...s.activeSubjects, subject] })
    }
  }
  // if another subject THIS student already picked landed on this same date, only its exact start time
  // stays pickable for this subject too — same-day multi-subject still merges into one visit (unchanged rule)
  const lockedTimeFor = (subject: string, date: string): string | null => {
    for (const [otherSubject, slot] of Object.entries(s.chosen)) {
      if (otherSubject !== subject && slot.date === date) return slot.start
    }
    return null
  }

  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">นักเรียน</p>
        {onRemove && <button type="button" className="text-red-600" aria-label="ลบนักเรียนคนนี้" onClick={onRemove}><TrashIcon className="size-3.5" /></button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="ชื่อ-นามสกุล *"><Input value={s.name} onChange={(e) => onChange({ name: e.target.value })} /></Field>
        <Field label="ชื่อเล่น"><Input value={s.nickname} onChange={(e) => onChange({ nickname: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="ระดับชั้น *">
          <select className="h-9 w-full rounded-lg border bg-background px-2 text-sm" value={s.grade} onChange={(e) => onChange({ grade: e.target.value })}>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="วันเกิด"><Input type="date" value={s.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} /></Field>
      </div>
      <Field label="หมายเหตุ (ไม่บังคับ)"><Textarea rows={2} maxLength={250} value={s.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="เช่น จุดที่อยากเน้น หรือข้อมูลที่ควรรู้ก่อน" /></Field>

      <div className="space-y-2 pt-1">
        <Label className="text-xs">เลือกวิชา * (เลือกได้มากกว่า 1 วิชา)</Label>
        <div className="flex flex-wrap gap-1.5">
          {offers.map((o) => {
            const on = s.activeSubjects.includes(o.subject)
            return (
              <button key={o.subject} type="button" onClick={() => toggleSubject(o.subject)} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10" : "text-muted-foreground")}>
                {o.subject}
              </button>
            )
          })}
        </div>
        {offers.filter((o) => s.activeSubjects.includes(o.subject)).map((offer) => {
          const mine = s.chosen[offer.subject]
          return (
            <div key={offer.subject}>
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">{offer.subject} — เลือกวัน-เวลา *</p>
              <div className="grid grid-cols-2 gap-1.5">
                {offer.slots.map((slot) => {
                  const locked = lockedTimeFor(offer.subject, slot.date)
                  const disabled = locked !== null && locked !== slot.start
                  const active = mine?.id === slot.id
                  return (
                    <button
                      key={slot.id} type="button" disabled={disabled}
                      onClick={() => onChange({ chosen: { ...s.chosen, [offer.subject]: slot } })}
                      className={cn("rounded-lg border px-2 py-1.5 text-left text-xs transition-colors", disabled ? "cursor-not-allowed opacity-40" : active ? "border-primary bg-primary/10" : "hover:bg-muted")}
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
