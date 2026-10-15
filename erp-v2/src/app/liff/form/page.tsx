"use client"

import { ParentLiff } from "@/components/parent/parent-liff"
import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CakeIcon, CalendarClockIcon, CheckCircle2Icon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardCheckIcon, HeartIcon, LoaderCircleIcon,
  MailIcon, MapPinIcon, MessageCircleIcon, PencilIcon, PhoneIcon, PlusIcon, ReceiptIcon, SchoolIcon, SendIcon, StickyNoteIcon, TrashIcon, UserRoundIcon, UsersIcon, XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { addDays, endTime, toDateStr } from "@/domain/dates"
import { commonSlots } from "@/domain/rules/forms"
import { gradeLabel, subjectLabel } from "@/domain/rules/settings"
import type { Brand, EnrollCourseOption, EnrollToken, FormLang, FormToken, FormOfferSlot, FormPrefill, FormSubjectOffer, FormType } from "@/domain/types"
import { cn } from "@/lib/utils"
import { emptyFamilyDraft, emptyParentDraft, emptyStudentDraft, FamilyFields, ParentFields, parentDraftOf, parentInputOf, StudentFields, studentDraftOf, studentInputOf, type FamilyDraft, type ParentDraft, type StudentDraft } from "@/components/people/person-fields"
import { joinName } from "@/domain/rules/people"
import { DICT, fmtBirth, fmtFormDate, LANGS } from "./i18n"
import { courseLine, ENROLL_DICT, EnrollFields, enrollValid, timeLabel, type EnrollFieldsValue } from "./enroll"

type Phase = "init" | "invalid" | "ready" | "submitting" | "done"
type Step = "parent" | "student" | "summary"
const STEP_KEYS: Step[] = ["parent", "student", "summary"]

// owner 2026-10-15: the parent / family / child fields are shared with the admin panels (components/people/person-fields)
type ParentBlock = ParentDraft & { editing: boolean }
type StudentBlock = StudentDraft & { key: string; activeSubjects: string[]; chosen: Record<string, FormOfferSlot>; editing: boolean; enroll: EnrollFieldsValue }
/** what the enroll-now form needs from the link (courses, subjects…) — null on a Test/Trial link */
interface EnrollInfo { courses: EnrollCourseOption[]; subjects: string[]; busOffered: boolean }

let seq = 0
const emptyParent = (name = ""): ParentBlock => ({ ...emptyParentDraft(name), editing: true })
const emptyEnroll = (): EnrollFieldsValue => ({ subjects: [], courseIds: [], pkg: "month", times: [], startDate: "", bus: false, placement: true })
const emptyStudent = (grade: string): StudentBlock => ({ ...emptyStudentDraft(grade), key: `st${seq++}`, activeSubjects: [], chosen: {}, editing: true, enroll: emptyEnroll() })
const fullName = joinName
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
  // owner 2026-10-15: every preview comes filled in, so you can click through without typing
  const prefill: FormPrefill | null = type === "trial" || type === "test" ? {
    parents: [{ name: "สมชาย ใจดี", phone: "089-555-1212", altPhones: ["02-111-2222"], relationship: "คุณพ่อ", email: "somchai@mail.com", primary: true }],
    address: "123/45 ถ.สุขุมวิท แขวงคลองตันเหนือ เขตวัฒนา", province: "กรุงเทพฯ", postcode: "10110", acquisitions: ["walkin", "facebook"],
    location: { lat: 13.7309, lng: 100.5849 }, addressNote: "หมู่บ้านพฤกษา ซอย 2 หลังซ้ายมือ ประตูสีเขียว",
    students: [{ name: "ภูมิ ใจดี", nickname: "ภูมิ", grade: "ป.5", birthDate: "2015-03-12", school: "โรงเรียนสาธิต", note: "ชอบคณิต แต่ยังไม่มั่นใจเรื่องโจทย์ปัญหา", interests: ["คณิต"] }],
  } : null
  return { offers, grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"], prefill }
}

export default function LiffFormPage() {
  return (
    <Suspense fallback={<Centered><Spinner /></Centered>}>
      <LiffEntry />
    </Suspense>
  )
}

/** One LIFF app for everything parents open: ?app=parent = the parent app (owner 2026-10-09), else a form.
 *  LINE first opens the endpoint with ?liff.state=<original query> — read `app` from there too. */
function LiffEntry() {
  const params = useSearchParams()
  const state = new URLSearchParams((params.get("liff.state") ?? "").replace(/^[^?]*\?/, ""))
  return params.get("app") === "parent" || state.get("app") === "parent" ? <ParentLiff /> : <LiffForm />
}

function LiffForm() {
  const params = useSearchParams()
  const initialToken = params.get("token") ?? ""
  const previewParam = params.get("preview")
  const preview = previewParam === "enroll" ? null : (previewParam as FormType | null)
  const previewEnroll = previewParam === "enroll"
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
  const [fam, setFam] = useState<FamilyDraft>(emptyFamilyDraft)
  const [students, setStudents] = useState<StudentBlock[]>([])
  const [enroll, setEnroll] = useState<EnrollInfo | null>(null)
  const [terms, setTerms] = useState(false)
  const t = DICT[lang]
  const te = ENROLL_DICT[lang]
  // parents read subjects/grades in their language; what we store stays the Thai name
  const names: Names = { subject: (x) => subjectLabel(x, lang, subjectNames), grade: (g) => gradeLabel(g, lang) }

  /** what we already know → cards the parent only checks (owner 2026-09-29: never type it twice) */
  const applyPrefill = (p: FormPrefill | null, gradeList: string[], offerList: FormSubjectOffer[], lineName: string) => {
    if (p?.parents.length) {
      setParents(p.parents.map((x) => ({ ...parentDraftOf(x), editing: false })))
      setPrimaryIdx(Math.max(0, p.parents.findIndex((x) => x.primary)))
      setFam({
        name: p.familyName ?? "", nameEn: p.familyNameEn ?? "", acquisitions: p.acquisitions ?? [],
        address: p.address ?? "", province: p.province ?? "", postcode: p.postcode ?? "", location: p.location, addressNote: p.addressNote ?? "",
        wantTax: !!p.taxInfo, tax: p.taxInfo ?? { customerName: "", taxId: "", address: "" },
      })
      setKnown(true)
    } else setParents([emptyParent(lineName)])
    const subjects = offerList.map((o) => o.subject)
    setStudents(p?.students.length
      ? p.students.map((s) => ({ ...emptyStudent(s.grade), ...studentDraftOf(s), activeSubjects: (s.interests ?? []).filter((x) => subjects.includes(x)), editing: false }))
      : [emptyStudent(gradeList[0] ?? "")])
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      // one LIFF app for every parent form: exit-form links ("pf_" tokens) live on their own page
      const pf = initialToken || new URLSearchParams(window.location.search).get("token") || ""
      if (pf.startsWith("pf_")) { window.location.replace(`/liff/exit?token=${encodeURIComponent(pf)}`); return }
      if (pf.startsWith("ps_")) { window.location.replace(`/liff/survey?token=${encodeURIComponent(pf)}`); return }
      // enroll-now (owner 2026-10-05): from the Rich Menu or a link an admin sent — LINE login only when opened inside LINE
      if (pf.startsWith("pe_") || previewEnroll) {
        let tk: EnrollToken
        if (previewEnroll) {
          tk = { token: "preview", kind: "enroll", reusable: true, branchId: "", branchName: "ทองหล่อ", brand: (params.get("brand") as Brand) || "nockacademy", lang: "th", grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"], subjects: ["คณิต", "อังกฤษ", "วิทย์"],
            subjectNames: { "คณิต": { en: "Math", ja: "数学" }, "อังกฤษ": { en: "English", ja: "英語" }, "วิทย์": { en: "Science", ja: "理科" } }, conversationId: null, createdAt: "", used: false,
            courses: [{ id: "c1", name: "คณิต ป.5 รายเดือน", subjects: ["คณิต"], grades: ["ป.5"], unit: "month", duration: 1, price: 4400 }, { id: "c2", name: "อังกฤษ ป.6 24 ชม.", subjects: ["อังกฤษ"], grades: ["ป.6"], unit: "hour", duration: 24, price: 6300 }] }
          setLineUserId("preview")
        } else {
          const res = await fetch(`/api/parent-forms/enroll?token=${encodeURIComponent(pf)}`).then((r) => r.json()).catch(() => ({ ok: false }))
          if (cancelled) return
          if (!res.ok) { setError(res.error ?? "ลิงก์นี้ใช้ไม่ได้แล้ว"); setPhase("invalid"); return }
          tk = res.token
          try {
            const liff = (await import("@line/liff")).default
            const liffId = process.env.NEXT_PUBLIC_LIFF_ID
            if (liffId) {
              await liff.init({ liffId })
              liffRef.current = liff
              if (liff.isInClient() && liff.isLoggedIn()) { const pr = await liff.getProfile(); setLineUserId(pr.userId); setDisplayName(pr.displayName) }
            }
          } catch { /* outside LINE: the form still works, just without the LINE link */ }
        }
        if (cancelled) return
        setToken(pf)
        setEnroll({ courses: tk.courses, subjects: tk.subjects, busOffered: tk.brand === "liclass" })
        setGrades(tk.grades); setBranchName(tk.branchName); setSubjectNames(tk.subjectNames ?? {})
        if (!params.get("lang") && tk.lang) setLang(tk.lang)
        applyPrefill(tk.prefill ?? (previewEnroll ? previewData("trial").prefill : null), tk.grades, [], "")
        if (previewEnroll) setStudents((ss) => ss.map((st) => ({ ...st, enroll: { subjects: ["คณิต"], courseIds: ["c1"], pkg: "month", times: ["1-pm", "3-eve", "6-am"], startDate: addDays(toDateStr(new Date()), 7), bus: false, placement: true } })))
        setPhase("ready")
        return
      }
      if (preview) {
        const d = previewData(preview)
        setFormType(preview); setOffers(d.offers); setGrades(d.grades); setDisplayName("ผู้ปกครอง"); setLineUserId("preview")
        setSubjectNames({ "คณิต": { en: "Math", ja: "数学" }, "อังกฤษ": { en: "English", ja: "英語" }, "วิทย์": { en: "Science", ja: "理科" } })
        const b = (params.get("brand") as Brand) || (preview === "trial" ? "liclass" : "nockacademy")
        setBranchName(b === "liclass" ? "Liclass บางนา" : "ทองหล่อ")
        applyPrefill(d.prefill, d.grades, d.offers, "")
        // and a time already picked for each subject they're interested in
        setStudents((ss) => ss.map((st) => ({ ...st, chosen: Object.fromEntries(st.activeSubjects.map((sub) => [sub, d.offers.find((o) => o.subject === sub)!.slots[1]])) })))
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
  const studentsValid = students.length > 0 && students.every((s) => s.first.trim() && s.grade && (enroll ? enrollValid(s.enroll) : s.activeSubjects.length > 0 && s.activeSubjects.every((subj) => s.chosen[subj])))

  const parentsPayload = () => parents.map((p, i) => parentInputOf(p, i === primaryIdx))
  /** the household answers, as both submit APIs take them */
  const familyPayload = () => ({
    familyName: fam.name.trim() || undefined, familyNameEn: fam.nameEn.trim() || undefined,
    familyAddress: fam.address || undefined, familyPostcode: fam.postcode || undefined, familyProvince: fam.province || undefined, acquisitions: fam.acquisitions.length ? fam.acquisitions : undefined,
    familyLocation: fam.location, familyAddressNote: fam.addressNote || undefined, taxInfo: fam.wantTax ? fam.tax : undefined,
  })
  const submit = async () => {
    if (!parentsValid || !studentsValid) return
    if (enroll && !terms) { setError(te.termsNeed); return }
    setError("")
    setPhase("submitting")
    if (preview || previewEnroll) { setPhase("done"); return }
    if (enroll) {
      const res = await fetch("/api/parent-forms/enroll-submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, lineUserId: lineUserId || undefined, lineName: displayName || undefined, parents: parentsPayload(), lang, acceptedTerms: true,
          ...familyPayload(),
          children: students.map((s) => ({ ...studentInputOf(s), ...s.enroll })),
        }),
      }).then((r) => r.json()).catch(() => ({ ok: false, error: "ส่งไม่สำเร็จ — เครือข่ายมีปัญหา ลองอีกครั้ง" }))
      if (!res.ok) { setError(res.error ?? "ส่งไม่สำเร็จ"); setPhase("ready"); return }
      setPhase("done")
      return
    }
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, lineUserId,
          parents: parentsPayload(),
          ...familyPayload(),
          students: students.map((s) => ({
            ...studentInputOf(s),
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
    <Summary t={t} lang={lang} names={names} parents={parents} primaryIdx={primaryIdx} fam={fam} linked={lineUserId ? displayName : undefined}
      students={students} onEdit={phase === "done" ? undefined : (s) => setStep(s)} enroll={enroll} />
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
        {phase === "done" && <p className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-3 py-2.5 text-sm text-emerald-900"><CheckCircle2Icon className="size-4 shrink-0" />{enroll ? `${te.sent} · ${te.sentSub}` : `${t.sent(formType)} · ${t.sentSub}`}</p>}

        <div>
          <h1 className="text-xl font-semibold">{enroll ? te.title : t.formTitle(formType)}</h1>
          {displayName && phase !== "done" && <p className="text-sm text-muted-foreground">{t.hello(displayName)}</p>}
        </div>

        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {t.steps.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              {i > 0 && <span className="h-px w-3 bg-border" />}
              {/* owner 2026-10-15: in a preview the steps are buttons — jump anywhere, no typing needed */}
              <button type="button" disabled={!(preview || previewEnroll) || phase === "done"} onClick={() => setStep(STEP_KEYS[i])}
                className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 disabled:cursor-default", (preview || previewEnroll) && phase !== "done" && "hover:ring-2 hover:ring-primary/30",
                  phase === "done" || i < stepIndex ? "bg-primary/10 text-primary" : i === stepIndex ? "bg-primary text-primary-foreground" : "border text-muted-foreground")}>
                {phase === "done" || i < stepIndex ? <CheckIcon className="size-3" /> : <PencilIcon className="size-3" />}{label}
              </button>
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
                <ParentFields t={t} value={p} onChange={(patch) => setParent(i, patch)} linked={i === 0 && lineUserId ? displayName : undefined} />
                {parents.length > 1 && (
                  <label className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-sm"><Checkbox checked={primaryIdx === i} onCheckedChange={() => setPrimaryIdx(i)} /> {t.primaryParent}</label>
                )}
              </Card>
            ) : (
              <ParentCard key={i} t={t} lang={lang} p={p} linked={i === 0 && lineUserId ? displayName : undefined} primary={primaryIdx === i && parents.length > 1} onEdit={() => setParent(i, { editing: true })} />
            ))}

            <Card>
              <FamilyFields t={t} value={fam} onChange={(patch) => setFam((x) => ({ ...x, ...patch }))} parentLast={parents[primaryIdx]?.last ?? ""} />
            </Card>
          </section>
        ) : step === "student" ? (
          <section className="space-y-3">
            <SectionHead icon={UserRoundIcon} title={t.studentTitle} sub={enroll ? te.studentSub : t.studentSub} action={<Button size="sm" variant="secondary" onClick={() => setStudents((ss) => [...ss, emptyStudent(grades[0] ?? "")])}><PlusIcon /> {t.addStudent}</Button>} />
            {students.map((s, i) => (
              <StudentCard key={s.key} t={t} lang={lang} names={names} n={i + 1} formType={formType} student={s} grades={grades} offers={offers} enroll={enroll}
                onChange={(patch) => setStudent(s.key, patch)} onRemove={students.length > 1 ? () => setStudents((ss) => ss.filter((x) => x.key !== s.key)) : undefined} />
            ))}
          </section>
        ) : (
          <section className="space-y-3">
            <SectionHead icon={ClipboardCheckIcon} title={t.summaryTitle} sub={t.summarySub} />
            {summary}
            {enroll && <label className={cn("flex items-start gap-2 rounded-2xl bg-card p-3 text-sm ring-1", terms ? "ring-foreground/5" : "ring-amber-300")}><Checkbox className="mt-0.5" checked={terms} onCheckedChange={(v) => setTerms(!!v)} />{te.terms}</label>}
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
        {linked && <Line icon={MessageCircleIcon}><span className="text-emerald-700">{t.lineLinked(linked)}</span></Line>}
        {p.email && <Line icon={MailIcon}>{p.email}</Line>}
        {p.birthDate && <Line icon={CakeIcon}>{fmtBirth(p.birthDate, lang)}</Line>}
      </div>
    </Card>
  )
}

function StudentCard({ t, lang, names, n, formType, student: s, grades, offers, onChange, onRemove, enroll }: {
  t: T; lang: FormLang; names: Names; n: number; formType: FormType; student: StudentBlock; grades: string[]; offers: FormSubjectOffer[]; enroll: EnrollInfo | null
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
          <StudentFields t={t} value={s} onChange={onChange} grades={grades} gradeLabel={names.grade} />
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

      {enroll ? (
        <EnrollFields t={ENROLL_DICT[lang]} lang={lang} grade={s.grade} subjects={enroll.subjects} subjectLabel={names.subject} courses={enroll.courses} busOffered={enroll.busOffered}
          value={s.enroll} onChange={(patch) => onChange({ enroll: { ...s.enroll, ...patch } })} minDate={toDateStr(new Date())} />
      ) : (<>
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
      </>)}
    </Card>
  )
}

function Summary({ t, lang, names, parents, primaryIdx, fam, linked, students, onEdit, enroll }: {
  t: T; lang: FormLang; names: Names; parents: ParentBlock[]; primaryIdx: number; fam: FamilyDraft; linked?: string
  students: StudentBlock[]; onEdit?: (s: Step) => void; enroll?: EnrollInfo | null
}) {
  const te = ENROLL_DICT[lang]
  const { address, province, postcode, addressNote, acquisitions } = fam
  const pinned = !!fam.location
  const tax = fam.wantTax ? fam.tax : null
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t.parentTitle}</p>
      <Card>
        <div className="flex items-center gap-2">
          <UsersIcon className="size-5 text-primary" />
          <p className="flex-1 font-semibold">{fam.name.trim() || t.familyNamePh(parents[primaryIdx]?.last ?? "")}{fam.nameEn.trim() && <span className="font-normal text-muted-foreground"> · {fam.nameEn}</span>}</p>
          {onEdit && <Button size="icon-sm" variant="outline" aria-label={t.edit} onClick={() => onEdit("parent")}><PencilIcon /></Button>}
        </div>
        {parents.map((p, i) => (
          <div key={i} className="space-y-1 border-t pt-2 text-sm">
            <p className="font-medium">{fullName(p)} <span className="font-normal text-muted-foreground">{[p.rel ? t.rel[p.rel] : "", i === primaryIdx && parents.length > 1 ? t.primaryParent : ""].filter(Boolean).join(" · ")}</span></p>
            <div className="grid gap-1 sm:grid-cols-2">
              {p.phones.filter(Boolean).map((ph, k) => <Line key={k} icon={PhoneIcon}>{ph}{k === 0 && p.phones.filter(Boolean).length > 1 && <span className="ml-1 text-xs text-muted-foreground">({t.defaultTag})</span>}</Line>)}
              {i === 0 && linked && <Line icon={MessageCircleIcon}><span className="text-emerald-700">{t.lineLinked(linked)}</span></Line>}
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
            {enroll && (
              <div className="space-y-1 border-t pt-2 text-sm">
                <Line icon={HeartIcon}>{[...s.enroll.subjects.map(names.subject), ...s.enroll.courseIds.map((id) => enroll.courses.find((c) => c.id === id)).filter((c): c is EnrollCourseOption => !!c).map((c) => `${c.name} (${courseLine(c, te)})`)].join(" · ")}</Line>
                <Line icon={ReceiptIcon}>{te.pkgs[s.enroll.pkg]}</Line>
                <Line icon={CalendarClockIcon}>{s.enroll.times.map((k) => timeLabel(k, te)).join(", ")} · {te.start} {fmtFormDate(s.enroll.startDate, lang)}</Line>
                {(s.enroll.bus || s.enroll.placement) && <Line icon={CheckIcon}>{[s.enroll.bus && te.bus, s.enroll.placement && te.placement].filter(Boolean).join(" · ")}</Line>}
              </div>
            )}
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


function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center p-6">{children}</div>
}

function Spinner() {
  return <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
}
