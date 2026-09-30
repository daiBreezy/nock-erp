"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CakeIcon, CalendarClockIcon, CheckCircle2Icon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardCheckIcon, HeartIcon, LoaderCircleIcon,
  MailIcon, MapPinIcon, MessageCircleIcon, PencilIcon, PhoneIcon, PlusIcon, ReceiptIcon, SchoolIcon, SendIcon, StickyNoteIcon, TrashIcon, UserRoundIcon, UsersIcon, XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addDays, endTime, toDateStr } from "@/domain/dates"
import { commonSlots } from "@/domain/rules/forms"
import { gradeLabel, subjectLabel } from "@/domain/rules/settings"
import type { Brand, FormLang, FormToken, FormOfferSlot, FormPrefill, FormSubjectOffer, FormType, LeadSource } from "@/domain/types"
import { cn } from "@/lib/utils"
import { MapPin } from "./map-pin"
import { DICT, fmtBirth, fmtFormDate, LANGS, REL_KEYS, relFromStored, relToStored, SOURCE_KEYS, type RelKey } from "./i18n"

type Phase = "init" | "invalid" | "ready" | "submitting" | "done"
type Step = "parent" | "student" | "summary"
const STEP_KEYS: Step[] = ["parent", "student", "summary"]

interface ParentBlock { first: string; last: string; phones: string[]; email: string; lineId: string; rel: RelKey | ""; birthDate: string; editing: boolean }
interface StudentBlock { key: string; first: string; last: string; nickname: string; grade: string; birthDate: string; school: string; note: string; activeSubjects: string[]; chosen: Record<string, FormOfferSlot>; editing: boolean }

let seq = 0
const splitName = (full = "") => { const t = full.trim().split(/\s+/); return t.length > 1 ? { first: t.slice(0, -1).join(" "), last: t[t.length - 1] } : { first: full.trim(), last: "" } }
const emptyParent = (name = ""): ParentBlock => ({ ...splitName(name), phones: [""], email: "", lineId: "", rel: "", birthDate: "", editing: true })
const emptyStudent = (grade: string): StudentBlock => ({ key: `st${seq++}`, first: "", last: "", nickname: "", grade, birthDate: "", school: "", note: "", activeSubjects: [], chosen: {}, editing: true })
const fullName = (x: { first: string; last: string }) => `${x.first} ${x.last}`.trim()
/** the one visit a child's picks make up: same date+start for every subject, 2 h when 2+ subjects */
const visitOf = (s: Pick<StudentBlock, "chosen">) => {
  const slots = Object.values(s.chosen)
  return slots.length ? { date: slots[0].date, start: slots[0].start, minutes: slots.length > 1 ? 120 : slots[0].minutes } : null
}
const ageOf = (birth: string) => { if (!birth) return null; const b = new Date(birth), n = new Date(); return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0) }

/** Sample data so the owner/staff can open /liff/form?preview=test|trial without LINE (nothing is sent). */
function previewData(type: FormType): { offers: FormSubjectOffer[]; grades: string[]; prefill: FormPrefill | null } {
  const days = [1, 2, 4].map((n) => addDays(toDateStr(new Date()), n))
  const slots = (subject: string) => days.flatMap((d, i) => ["10:00", "13:00", "16:00"].map((start, j) => ({ id: `${subject}-${i}-${j}`, date: d, start, minutes: 60, source: "generic" as const, teacherId: null, roomId: null, classId: null, sessionId: null })))
  const offers = ["คณิต", "อังกฤษ", "วิทย์"].map((subject) => ({ subject, slots: slots(subject) }))
  const prefill: FormPrefill | null = type === "trial" ? {
    parents: [{ name: "สมชาย ใจดี", phone: "089-555-1212", altPhones: ["02-111-2222"], relationship: "คุณพ่อ", lineId: "@somchai", email: "somchai@mail.com", primary: true }],
    address: "123/45 ถ.สุขุมวิท แขวงคลองตันเหนือ เขตวัฒนา", province: "กรุงเทพฯ", postcode: "10110", acquisitions: ["walkin", "facebook"],
    location: { lat: 13.7309, lng: 100.5849 }, addressNote: "หมู่บ้านพฤกษา ซอย 2 หลังซ้ายมือ ประตูสีเขียว",
    students: [{ name: "ภูมิ ใจดี", nickname: "ภูมิ", grade: "ป.5", birthDate: "2015-03-12", school: "โรงเรียนสาธิต", note: "ชอบคณิต แต่ยังไม่มั่นใจเรื่องโจทย์ปัญหา", interests: ["คณิต"] }],
  } : null
  return { offers, grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"], prefill }
}

export default function LiffFormPage() {
  return (
    <Suspense fallback={<Centered><Spinner /></Centered>}>
      <LiffForm />
    </Suspense>
  )
}

function LiffForm() {
  const params = useSearchParams()
  const initialToken = params.get("token") ?? ""
  const preview = params.get("preview") as FormType | null
  const liffRef = useRef<{ closeWindow: () => void } | null>(null)
  const [token, setToken] = useState(initialToken)
  const [phase, setPhase] = useState<Phase>("init")
  const [step, setStep] = useState<Step>("parent")
  const [error, setError] = useState("")
  const [lang, setLang] = useState<FormLang>((params.get("lang") as FormLang) || "th")
  const [formType, setFormType] = useState<FormType>("test")
  const [offers, setOffers] = useState<FormSubjectOffer[]>([])
  const [grades, setGrades] = useState<string[]>([])
  const [branchName, setBranchName] = useState("")
  const [lineUserId, setLineUserId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [known, setKnown] = useState(false)
  const [subjectNames, setSubjectNames] = useState<FormToken["subjectNames"]>({})

  const [parents, setParents] = useState<ParentBlock[]>([emptyParent()])
  const [primaryIdx, setPrimaryIdx] = useState(0)
  const [address, setAddress] = useState("")
  const [province, setProvince] = useState("")
  const [postcode, setPostcode] = useState("")
  const [acquisitions, setAcquisitions] = useState<LeadSource[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>()
  const [addressNote, setAddressNote] = useState("")
  const [wantTax, setWantTax] = useState(false)
  const [tax, setTax] = useState({ customerName: "", taxId: "", address: "" })
  const [students, setStudents] = useState<StudentBlock[]>([])
  const t = DICT[lang]
  // parents read subjects/grades in their language; what we store stays the Thai name
  const names: Names = { subject: (x) => subjectLabel(x, lang, subjectNames), grade: (g) => gradeLabel(g, lang) }

  /** what we already know → cards the parent only checks (owner 2026-09-29: never type it twice) */
  const applyPrefill = (p: FormPrefill | null, gradeList: string[], offerList: FormSubjectOffer[], lineName: string) => {
    if (p?.parents.length) {
      setParents(p.parents.map((x) => ({ ...splitName(x.name), phones: [x.phone, ...(x.altPhones ?? [])], email: x.email ?? "", lineId: x.lineId ?? "", rel: relFromStored(x.relationship), birthDate: x.birthDate ?? "", editing: false })))
      setPrimaryIdx(Math.max(0, p.parents.findIndex((x) => x.primary)))
      setAddress(p.address ?? ""); setProvince(p.province ?? ""); setPostcode(p.postcode ?? ""); setAcquisitions(p.acquisitions ?? [])
      setLocation(p.location); setAddressNote(p.addressNote ?? "")
      if (p.taxInfo) { setWantTax(true); setTax(p.taxInfo) }
      setKnown(true)
    } else setParents([emptyParent(lineName)])
    const subjects = offerList.map((o) => o.subject)
    setStudents(p?.students.length
      ? p.students.map((s) => ({ ...emptyStudent(s.grade), ...splitName(s.name), nickname: s.nickname ?? "", birthDate: s.birthDate ?? "", school: s.school ?? "", note: s.note ?? "", activeSubjects: (s.interests ?? []).filter((x) => subjects.includes(x)), editing: false }))
      : [emptyStudent(gradeList[0] ?? "")])
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (preview) {
        const d = previewData(preview)
        setFormType(preview); setOffers(d.offers); setGrades(d.grades); setDisplayName("ผู้ปกครอง"); setLineUserId("preview")
        setSubjectNames({ "คณิต": { en: "Math", ja: "数学" }, "อังกฤษ": { en: "English", ja: "英語" }, "วิทย์": { en: "Science", ja: "理科" } })
        const b = (params.get("brand") as Brand) || (preview === "trial" ? "liclass" : "nockacademy")
        setBranchName(b === "liclass" ? "Liclass บางนา" : "ทองหล่อ")
        applyPrefill(d.prefill, d.grades, d.offers, "")
        setPhase("ready")
        return
      }
      try {
        // liff SDK is browser-only — dynamic import keeps it out of the server bundle
        const liff = (await import("@line/liff")).default
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) throw new Error("ยังไม่ได้ตั้งค่า LIFF ID")
        await liff.init({ liffId })
        liffRef.current = liff
        // liff.init() restores the original query string after the LINE Login redirect — re-read `token` after init
        const currentToken = new URLSearchParams(window.location.search).get("token") ?? initialToken
        if (cancelled) return
        setToken(currentToken)
        if (!currentToken) { setError("ลิงก์นี้ไม่ถูกต้อง — ไม่มีรหัสฟอร์ม"); setPhase("invalid"); return }
        if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return }
        const profile = await liff.getProfile()
        if (cancelled) return
        setLineUserId(profile.userId)
        setDisplayName(profile.displayName)
        const res = await fetch(`/api/forms/token?token=${encodeURIComponent(currentToken)}`)
        const data = await res.json()
        if (cancelled) return
        if (!data.ok) { setError(data.error ?? "ลิงก์นี้ใช้ไม่ได้แล้ว"); setPhase("invalid"); return }
        if (!data.offers?.length) { setError("ยังไม่มีช่วงเวลาให้เลือก — ติดต่อสถาบันโดยตรง"); setPhase("invalid"); return }
        setFormType(data.type); setOffers(data.offers); setGrades(data.grades ?? []); setBranchName(data.branchName ?? ""); setSubjectNames(data.subjectNames ?? {})
        if (!params.get("lang") && data.lang) setLang(data.lang)
        applyPrefill(data.prefill, data.grades ?? [], data.offers, profile.displayName)
        setPhase("ready")
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "เปิดฟอร์มไม่สำเร็จ — ลองเปิดลิงก์นี้จากแอป LINE อีกครั้ง")
        setPhase("invalid")
      }
    }
    run()
    return () => { cancelled = true }
  }, [initialToken, preview]) // eslint-disable-line react-hooks/exhaustive-deps

  const setParent = (i: number, patch: Partial<ParentBlock>) => setParents((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const setStudent = (key: string, patch: Partial<StudentBlock>) => setStudents((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  const parentsValid = parents.length > 0 && parents.every((p) => p.first.trim() && p.phones[0]?.trim())
  const studentsValid = students.length > 0 && students.every((s) => s.first.trim() && s.grade && s.activeSubjects.length > 0 && s.activeSubjects.every((subj) => s.chosen[subj]))

  const submit = async () => {
    if (!parentsValid || !studentsValid) return
    setPhase("submitting")
    if (preview) { setPhase("done"); return }
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, lineUserId,
          parents: parents.map((p, i) => ({
            name: fullName(p), phone: p.phones[0], altPhones: p.phones.slice(1).filter((x) => x.trim()),
            email: p.email || undefined, lineId: p.lineId || undefined, relationship: p.rel ? relToStored(p.rel) : undefined, birthDate: p.birthDate || undefined, primary: i === primaryIdx,
          })),
          familyAddress: address || undefined, familyPostcode: postcode || undefined, familyProvince: province || undefined, acquisitions: acquisitions.length ? acquisitions : undefined,
          familyLocation: location, familyAddressNote: addressNote || undefined,
          taxInfo: wantTax ? tax : undefined,
          students: students.map((s) => ({
            name: fullName(s), nickname: s.nickname || undefined, grade: s.grade, birthDate: s.birthDate || undefined, school: s.school || undefined, note: s.note || undefined,
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

  if (phase === "init") return <Centered><Spinner /><p className="mt-3 text-sm text-muted-foreground">{t.opening}</p></Centered>
  if (phase === "invalid") return <Centered><XCircleIcon className="size-10 text-red-500" /><p className="mt-3 text-center text-sm text-muted-foreground">{error}</p></Centered>

  const stepIndex = STEP_KEYS.indexOf(step)
  const summary = (
    <Summary t={t} lang={lang} names={names} parents={parents} primaryIdx={primaryIdx} address={address} province={province} postcode={postcode} addressNote={addressNote} pinned={!!location} acquisitions={acquisitions} linked={lineUserId ? displayName : undefined}
      tax={wantTax ? tax : null} students={students} onEdit={phase === "done" ? undefined : (s) => setStep(s)} />
  )

  return (
    <div className="min-h-screen bg-muted/40 pb-28">
      <div className="mx-auto max-w-lg space-y-4 p-4">
        {/* header: logo · branch · language */}
        <header className="flex items-center gap-2 rounded-3xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand file */}
          <img src="/brand/logo-full.png" alt="NockAcademy" className="h-7 w-auto" />
          {branchName && <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"><MapPinIcon className="size-3.5" />{branchName}</span>}
          <span className={cn("flex overflow-hidden rounded-full border text-xs", !branchName && "ml-auto")}>
            {LANGS.map((l) => <button key={l.key} type="button" onClick={() => setLang(l.key)} className={cn("px-2 py-1", lang === l.key ? "bg-foreground text-background" : "text-muted-foreground")}>{l.label}</button>)}
          </span>
        </header>
        {preview && <p className="rounded-2xl bg-amber-100 px-3 py-2 text-center text-xs text-amber-900">{t.previewBadge}</p>}
        {phase === "done" && <p className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-3 py-2.5 text-sm text-emerald-900"><CheckCircle2Icon className="size-4 shrink-0" />{t.sent(formType)} · {t.sentSub}</p>}

        <div>
          <h1 className="text-xl font-semibold">{t.formTitle(formType)}</h1>
          {displayName && phase !== "done" && <p className="text-sm text-muted-foreground">{t.hello(displayName)}</p>}
        </div>

        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {t.steps.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              {i > 0 && <span className="h-px w-3 bg-border" />}
              <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1", phase === "done" || i < stepIndex ? "bg-primary/10 text-primary" : i === stepIndex ? "bg-primary text-primary-foreground" : "border text-muted-foreground")}>
                {phase === "done" || i < stepIndex ? <CheckIcon className="size-3" /> : <PencilIcon className="size-3" />}{label}
              </span>
            </li>
          ))}
        </ol>

        {phase === "done" ? summary : step === "parent" ? (
          <section className="space-y-3">
            <SectionHead icon={UsersIcon} title={t.parentTitle} sub={t.parentSub} action={<Button size="sm" variant="secondary" onClick={() => setParents((ps) => [...ps, emptyParent()])}><PlusIcon /> {t.addParent}</Button>} />
            {known && <p className="text-xs text-muted-foreground">{t.known}</p>}
            {parents.map((p, i) => p.editing ? (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t.parentN(i + 1)}</p>
                  <span className="flex items-center gap-2">
                    {parents.length > 1 && <Button size="icon-xs" variant="ghost" className="text-red-600" aria-label={t.remove} onClick={() => { setParents((ps) => ps.filter((_, j) => j !== i)); setPrimaryIdx(0) }}><TrashIcon /></Button>}
                    {known && <Button size="xs" variant="outline" disabled={!p.first.trim() || !p.phones[0]?.trim()} onClick={() => setParent(i, { editing: false })}><CheckIcon /> {t.done}</Button>}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={`${t.firstName} *`}><Input value={p.first} onChange={(e) => setParent(i, { first: e.target.value })} /></Field>
                  <Field label={t.lastName}><Input value={p.last} onChange={(e) => setParent(i, { last: e.target.value })} /></Field>
                  <Field label={t.relationship}>
                    <select className={selectCls} value={p.rel} onChange={(e) => setParent(i, { rel: e.target.value as RelKey })}>
                      <option value="">{t.select}</option>
                      {REL_KEYS.map((k) => <option key={k} value={k}>{t.rel[k]}</option>)}
                    </select>
                  </Field>
                  <Field label={t.birthDate}><Input type="date" value={p.birthDate} onChange={(e) => setParent(i, { birthDate: e.target.value })} /></Field>
                  {/* opened from LINE → this parent's LINE is already linked (LINE never exposes the @ID itself); others type theirs */}
                  {i === 0 && lineUserId
                    ? <Field label={t.lineId}><p className="flex h-9 items-center gap-1.5 rounded-3xl bg-emerald-50 px-3 text-sm text-emerald-800"><CheckIcon className="size-4" />{t.lineLinked(displayName)}</p></Field>
                    : <Field label={t.lineId}><Input value={p.lineId} onChange={(e) => setParent(i, { lineId: e.target.value })} placeholder="@line_id" /></Field>}
                  <Field label={t.email}><Input type="email" value={p.email} onChange={(e) => setParent(i, { email: e.target.value })} /></Field>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t.phone} *</Label>
                  {p.phones.map((ph, k) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <Input inputMode="tel" value={ph} placeholder="081-234-5678" onChange={(e) => setParent(i, { phones: p.phones.map((x, j) => (j === k ? e.target.value : x)) })} />
                      {k === 0 ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">{t.defaultTag}</span> : (
                        <>
                          <Button size="xs" variant="ghost" className="shrink-0" onClick={() => setParent(i, { phones: [ph, ...p.phones.filter((_, j) => j !== k)] })}>{t.makeDefault}</Button>
                          <Button size="icon-xs" variant="ghost" className="shrink-0 text-red-600" aria-label={t.remove} onClick={() => setParent(i, { phones: p.phones.filter((_, j) => j !== k) })}><TrashIcon /></Button>
                        </>
                      )}
                    </div>
                  ))}
                  <Button size="xs" variant="secondary" onClick={() => setParent(i, { phones: [...p.phones, ""] })}><PlusIcon /> {t.addPhone}</Button>
                </div>
                {parents.length > 1 && (
                  <label className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-sm"><Checkbox checked={primaryIdx === i} onCheckedChange={() => setPrimaryIdx(i)} /> {t.primaryParent}</label>
                )}
              </Card>
            ) : (
              <ParentCard key={i} t={t} lang={lang} p={p} linked={i === 0 && lineUserId ? displayName : undefined} primary={primaryIdx === i && parents.length > 1} onEdit={() => setParent(i, { editing: true })} />
            ))}

            <Card>
              <div>
                <p className="text-sm font-semibold">{t.acquisition}</p>
                <p className="mb-2 text-xs text-muted-foreground">{t.acquisitionSub}</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {SOURCE_KEYS.map((k) => {
                    const on = acquisitions.includes(k)
                    return (
                      <label key={k} className={cn("flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm", on ? "border-primary bg-primary/10" : "text-muted-foreground")}>
                        <Checkbox checked={on} onCheckedChange={() => setAcquisitions((xs) => (on ? xs.filter((x) => x !== k) : [...xs, k]))} /> {t.src[k]}
                      </label>
                    )
                  })}
                </div>
              </div>
              {/* both brands (owner 2026-09-30) — whether the family rides the bus is decided on the invoice, not here */}
              <div className="space-y-2 border-t pt-3">
                  <div><p className="text-sm font-semibold">{t.address}</p><p className="text-xs text-muted-foreground">{t.addressSub} · {t.pinSub}</p></div>
                  <MapPin value={location} onChange={setLocation} locateLabel={t.locate} />
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.addressLine} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder={t.province} />
                    <Input inputMode="numeric" maxLength={5} value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder={t.postcode} />
                  </div>
                  <Field label={t.addressNote}><Textarea rows={2} value={addressNote} onChange={(e) => setAddressNote(e.target.value)} placeholder={t.addressNotePh} /></Field>
                </div>
              <div className="border-t pt-3">
                <label className="flex items-start gap-2 text-sm"><Checkbox checked={wantTax} onCheckedChange={(v) => setWantTax(!!v)} className="mt-0.5" /><span><span className="font-semibold">{t.tax}</span><span className="block text-xs text-muted-foreground">{t.taxSub}</span></span></label>
                {wantTax && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Field label={t.taxName}><Input value={tax.customerName} onChange={(e) => setTax({ ...tax, customerName: e.target.value })} /></Field>
                    <Field label={t.taxId}><Input inputMode="numeric" value={tax.taxId} onChange={(e) => setTax({ ...tax, taxId: e.target.value })} /></Field>
                    <div className="col-span-2"><Field label={t.taxAddress}><Input value={tax.address} onChange={(e) => setTax({ ...tax, address: e.target.value })} /></Field></div>
                  </div>
                )}
              </div>
            </Card>
          </section>
        ) : step === "student" ? (
          <section className="space-y-3">
            <SectionHead icon={UserRoundIcon} title={t.studentTitle} sub={t.studentSub} action={<Button size="sm" variant="secondary" onClick={() => setStudents((ss) => [...ss, emptyStudent(grades[0] ?? "")])}><PlusIcon /> {t.addStudent}</Button>} />
            {students.map((s, i) => (
              <StudentCard key={s.key} t={t} lang={lang} names={names} n={i + 1} formType={formType} student={s} grades={grades} offers={offers}
                onChange={(patch) => setStudent(s.key, patch)} onRemove={students.length > 1 ? () => setStudents((ss) => ss.filter((x) => x.key !== s.key)) : undefined} />
            ))}
          </section>
        ) : (
          <section className="space-y-3">
            <SectionHead icon={ClipboardCheckIcon} title={t.summaryTitle} sub={t.summarySub} />
            {summary}
          </section>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {phase !== "done" && (
        <footer className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-2 p-3">
            <Button variant="ghost" onClick={() => (liffRef.current ? liffRef.current.closeWindow() : setStep("parent"))}>{t.cancel}</Button>
            <span className="ml-auto" />
            {stepIndex > 0 && <Button variant="secondary" onClick={() => setStep(STEP_KEYS[stepIndex - 1])}><ChevronLeftIcon /> {t.back}</Button>}
            {step === "parent" && <Button disabled={!parentsValid} onClick={() => { setParents((ps) => ps.map((p) => ({ ...p, editing: p.editing && !(p.first.trim() && p.phones[0]?.trim()) }))); setStep("student") }}>{t.next} <ChevronRightIcon /></Button>}
            {step === "student" && <Button disabled={!studentsValid} onClick={() => setStep("summary")}>{t.next} <ChevronRightIcon /></Button>}
            {step === "summary" && <Button disabled={phase === "submitting"} onClick={submit}>{phase === "submitting" ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />} {t.submit}</Button>}
          </div>
          {((step === "parent" && !parentsValid) || (step === "student" && !studentsValid)) && <p className="pb-2 text-center text-[11px] text-muted-foreground">{t.required}</p>}
        </footer>
      )}
    </div>
  )
}

type T = (typeof DICT)["th"]
type Names = { subject: (x: string) => string; grade: (g: string) => string }
const selectCls = "h-9 w-full rounded-3xl border bg-input/50 px-3 text-sm"

function ParentCard({ t, lang, p, primary, linked, onEdit }: { t: T; lang: FormLang; p: ParentBlock; primary: boolean; linked?: string; onEdit?: () => void }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">{p.first.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{fullName(p)}</p>
          <p className="text-xs text-muted-foreground">{[p.rel ? t.rel[p.rel] : "", primary ? t.primaryParent : ""].filter(Boolean).join(" · ")}</p>
        </div>
        {onEdit && <Button size="icon-sm" variant="outline" aria-label={t.edit} onClick={onEdit}><PencilIcon /></Button>}
      </div>
      <div className="grid gap-1.5 text-sm sm:grid-cols-2">
        {p.phones.filter(Boolean).map((ph, k) => <Line key={k} icon={PhoneIcon}>{ph}{k === 0 && p.phones.length > 1 && <span className="ml-1 text-xs text-muted-foreground">({t.defaultTag})</span>}</Line>)}
        {linked ? <Line icon={MessageCircleIcon}><span className="text-emerald-700">{t.lineLinked(linked)}</span></Line> : p.lineId && <Line icon={MessageCircleIcon}>{p.lineId}</Line>}
        {p.email && <Line icon={MailIcon}>{p.email}</Line>}
        {p.birthDate && <Line icon={CakeIcon}>{fmtBirth(p.birthDate, lang)}</Line>}
      </div>
    </Card>
  )
}

function StudentCard({ t, lang, names, n, formType, student: s, grades, offers, onChange, onRemove }: {
  t: T; lang: FormLang; names: Names; n: number; formType: FormType; student: StudentBlock; grades: string[]; offers: FormSubjectOffer[]
  onChange: (patch: Partial<StudentBlock>) => void; onRemove?: () => void
}) {
  // changing the subjects changes which times fit them all → the old pick is cleared
  const toggleSubject = (subject: string) =>
    onChange({ activeSubjects: s.activeSubjects.includes(subject) ? s.activeSubjects.filter((x) => x !== subject) : [...s.activeSubjects, subject], chosen: {} })
  // one list: only times every chosen subject is free at together (owner 2026-09-30) — 2+ subjects = one 2-hour visit
  const times = commonSlots(offers, s.activeSubjects)
  const picked = visitOf(s)
  const age = ageOf(s.birthDate)

  return (
    <Card>
      {s.editing ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t.studentN(n)}</p>
            <span className="flex items-center gap-2">
              {onRemove && <Button size="icon-xs" variant="ghost" className="text-red-600" aria-label={t.remove} onClick={onRemove}><TrashIcon /></Button>}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={`${t.firstName} *`}><Input value={s.first} onChange={(e) => onChange({ first: e.target.value })} /></Field>
            <Field label={t.lastName}><Input value={s.last} onChange={(e) => onChange({ last: e.target.value })} /></Field>
            <Field label={t.nickname}><Input value={s.nickname} onChange={(e) => onChange({ nickname: e.target.value })} /></Field>
            <Field label={`${t.grade} *`}>
              <select className={selectCls} value={s.grade} onChange={(e) => onChange({ grade: e.target.value })}>{grades.map((g) => <option key={g} value={g}>{names.grade(g)}</option>)}</select>
            </Field>
            <Field label={`${t.birthDate}${age !== null ? ` · ${t.age(age)}` : ""}`}><Input type="date" value={s.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} /></Field>
            <Field label={t.school}><Input value={s.school} onChange={(e) => onChange({ school: e.target.value })} /></Field>
          </div>
          <Field label={t.note}><Textarea rows={2} maxLength={250} value={s.note} onChange={(e) => onChange({ note: e.target.value })} placeholder={t.notePh} /></Field>
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">{(s.nickname || s.first).slice(0, 1)}</span>
            <p className="min-w-0 flex-1 truncate font-semibold">{fullName(s)}{s.nickname && <span className="font-normal text-muted-foreground"> ({s.nickname})</span>}</p>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{names.grade(s.grade)}</span>
            <Button size="icon-sm" variant="outline" aria-label={t.edit} onClick={() => onChange({ editing: true })}><PencilIcon /></Button>
          </div>
          {s.birthDate && <Line icon={CakeIcon}>{fmtBirth(s.birthDate, lang)}{age !== null && ` · ${t.age(age)}`}</Line>}
          {s.school && <Line icon={SchoolIcon}>{s.school}</Line>}
          {s.note && <Line icon={StickyNoteIcon}>{s.note}</Line>}
        </div>
      )}

      <div className="space-y-2 border-t pt-3">
        <p className="text-sm font-semibold">{t.subjects} *</p>
        <p className="-mt-1.5 text-xs text-muted-foreground">{t.subjectsSub}</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {offers.map((o) => {
            const on = s.activeSubjects.includes(o.subject)
            return (
              <label key={o.subject} className={cn("flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm", on ? "border-primary bg-primary/10" : "text-muted-foreground")}>
                <Checkbox checked={on} onCheckedChange={() => toggleSubject(o.subject)} /> {names.subject(o.subject)}
              </label>
            )
          })}
        </div>
      </div>

      {s.activeSubjects.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <div>
            <p className="text-sm font-semibold">{t.schedule(formType)} *</p>
            <p className="text-xs text-muted-foreground">{t.commonTimes(s.activeSubjects.length)}</p>
          </div>
          {times.length === 0 && <p className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">{t.noCommon}</p>}
          <div className="space-y-1">
            {times.map((x) => {
              const active = picked?.date === x.date && picked.start === x.start
              return (
                <button key={x.date + x.start} type="button" onClick={() => onChange({ chosen: x.bySubject })}
                  className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition", active ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted")}>
                  <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", active ? "border-primary" : "border-muted-foreground/50")}>{active && <span className="size-2 rounded-full bg-primary" />}</span>
                  <span>
                    <span className="block text-sm font-medium tabular-nums">{x.start}–{endTime(x.start, x.minutes)}</span>
                    <span className="block text-xs text-muted-foreground">{fmtFormDate(x.date, lang)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

function Summary({ t, lang, names, parents, primaryIdx, address, province, postcode, addressNote, pinned, acquisitions, linked, tax, students, onEdit }: {
  t: T; lang: FormLang; names: Names; parents: ParentBlock[]; primaryIdx: number; address: string; province: string; postcode: string; addressNote: string; pinned: boolean; acquisitions: LeadSource[]; linked?: string
  tax: { customerName: string; taxId: string; address: string } | null; students: StudentBlock[]; onEdit?: (s: Step) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t.parentTitle}</p>
      <Card>
        <div className="flex items-center gap-2">
          <UsersIcon className="size-5 text-primary" />
          <p className="flex-1 font-semibold">{t.family} {parents[0]?.last || fullName(parents[0] ?? { first: "", last: "" })}</p>
          {onEdit && <Button size="icon-sm" variant="outline" aria-label={t.edit} onClick={() => onEdit("parent")}><PencilIcon /></Button>}
        </div>
        {parents.map((p, i) => (
          <div key={i} className="space-y-1 border-t pt-2 text-sm">
            <p className="font-medium">{fullName(p)} <span className="font-normal text-muted-foreground">{[p.rel ? t.rel[p.rel] : "", i === primaryIdx && parents.length > 1 ? t.primaryParent : ""].filter(Boolean).join(" · ")}</span></p>
            <div className="grid gap-1 sm:grid-cols-2">
              {p.phones.filter(Boolean).map((ph, k) => <Line key={k} icon={PhoneIcon}>{ph}{k === 0 && p.phones.filter(Boolean).length > 1 && <span className="ml-1 text-xs text-muted-foreground">({t.defaultTag})</span>}</Line>)}
              {i === 0 && linked ? <Line icon={MessageCircleIcon}><span className="text-emerald-700">{t.lineLinked(linked)}</span></Line> : p.lineId && <Line icon={MessageCircleIcon}>{p.lineId}</Line>}
              {p.email && <Line icon={MailIcon}>{p.email}</Line>}
            </div>
          </div>
        ))}
        {(address || province || postcode || pinned) && (
          <div className="space-y-1 border-t pt-2">
            <Line icon={MapPinIcon}>{[address, province, postcode].filter(Boolean).join(" ")}{pinned && <span className="ml-1 text-xs text-emerald-700">· 📍</span>}</Line>
            {addressNote && <Line icon={StickyNoteIcon}>{addressNote}</Line>}
          </div>
        )}
        {acquisitions.length > 0 && <Line icon={UserRoundIcon}>{acquisitions.map((k) => t.src[k]).join(", ")}</Line>}
        {tax && (tax.customerName || tax.taxId) && <div className="border-t pt-2"><Line icon={ReceiptIcon}>{tax.customerName} · {tax.taxId}{tax.address && ` · ${tax.address}`}</Line></div>}
      </Card>

      <p className="text-sm font-semibold">{t.studentTitle}</p>
      {students.map((s) => {
        const age = ageOf(s.birthDate)
        return (
          <Card key={s.key}>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">{(s.nickname || s.first).slice(0, 1)}</span>
              <p className="min-w-0 flex-1 truncate font-semibold">{fullName(s)}{s.nickname && <span className="font-normal text-muted-foreground"> ({s.nickname})</span>}</p>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">{names.grade(s.grade)}</span>
              {onEdit && <Button size="icon-sm" variant="outline" aria-label={t.edit} onClick={() => onEdit("student")}><PencilIcon /></Button>}
            </div>
            {s.birthDate && <Line icon={CakeIcon}>{fmtBirth(s.birthDate, lang)}{age !== null && ` · ${t.age(age)}`}</Line>}
            {s.school && <Line icon={SchoolIcon}>{s.school}</Line>}
            {s.note && <Line icon={StickyNoteIcon}>{s.note}</Line>}
            {visitOf(s) && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <HeartIcon className="size-4 fill-red-500 text-red-500" /> <span className="font-medium">{Object.keys(s.chosen).map(names.subject).join(" + ")}</span>
                <span className="mx-1 h-px min-w-6 flex-1 border-t border-dashed" />
                <CalendarClockIcon className="size-4 text-primary" />
                <span className="rounded-full border px-2 py-0.5 text-xs">{fmtFormDate(visitOf(s)!.date, lang)}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs tabular-nums">{visitOf(s)!.start}–{endTime(visitOf(s)!.start, visitOf(s)!.minutes)}</span>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function SectionHead({ icon: Icon, title, sub, action }: { icon: React.ComponentType<{ className?: string }>; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
      <div className="min-w-0 flex-1"><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
      {action}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">{children}</div>
}

function Line({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <p className="flex items-start gap-2 text-sm"><Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words">{children}</span></p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center p-6">{children}</div>
}

function Spinner() {
  return <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
}
