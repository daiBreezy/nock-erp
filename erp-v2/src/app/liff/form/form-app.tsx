"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  CakeIcon, CalendarClockIcon, CheckCircle2Icon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardCheckIcon, HeartIcon, LoaderCircleIcon,
  MailIcon, MapPinIcon, MessageCircleIcon, PencilIcon, PhoneIcon, PlusIcon, ReceiptIcon, SchoolIcon, SendIcon, StickyNoteIcon, TrashIcon, UserRoundIcon, UsersIcon, XCircleIcon, BusIcon, CameraIcon } from "lucide-react"
import { ShrinkHeader } from "@/components/forms/shrink-header"
import { BrandScope, brandLang } from "@/components/forms/brand-theme"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { addDays, endTime, toDateStr } from "@/domain/dates"
import { commonSlots, picksClash, slotClashes } from "@/domain/rules/forms"
import { phoneIssue, validEmail } from "@/domain/rules/people"
import { CatalogApp } from "../catalog/catalog-app"
import { gradeLabel, subjectLabel } from "@/domain/rules/settings"
import type { Brand, FormSubmission, EnrollClassOffer, EnrollInvoiceSnap, EnrollCourseOption, EnrollPlan, EnrollToken, FormLang, FormToken, FormOfferSlot, FormPrefill, FormSubjectOffer, FormType } from "@/domain/types"
import { cn } from "@/lib/utils"
import { addressPartsOf, emptyFamilyDraft, emptyParentDraft, emptyStudentDraft, FamilyAcquisition, FamilyBus, FamilyPdpa, FamilyTax, ParentFields, parentDraftOf, parentInputOf, StudentFields, studentDraftOf, studentInputOf, type FamilyDraft, type ParentDraft, type StudentDraft } from "@/components/people/person-fields"
import { joinName } from "@/domain/rules/people"
import { DICT, fmtBirth, fmtFormDate } from "./i18n"
import { classTimeLabel, courseLine, ENROLL_DICT, EnrollFields, enrollValid, InvoicePay, PREVIEW_INVOICE, timeLabel, type EnrollFieldsValue } from "./enroll"
import { enrollClassValid } from "@/domain/rules/forms"
import { Empty } from "@/components/app/empty"

type Phase = "init" | "invalid" | "ready" | "submitting" | "done"
type Step = "parent" | "student" | "summary"
const STEP_KEYS: Step[] = ["parent", "student", "summary"]

// owner 2026-10-15: the parent / family / child fields are shared with the admin panels (components/people/person-fields)
type ParentBlock = ParentDraft & { editing: boolean }
type StudentBlock = StudentDraft & { key: string; activeSubjects: string[]; chosen: Record<string, FormOfferSlot>; editing: boolean; enroll: EnrollFieldsValue }
/** what the enroll-now form needs from the link (courses, subjects…) — null on a Test/Trial link */
interface EnrollInfo { courses: EnrollCourseOption[]; subjects: string[]; busOffered: boolean; classOffers?: EnrollClassOffer[]; plan?: EnrollPlan }

let seq = 0
const emptyParent = (name = "", sf = false): ParentBlock => ({ ...emptyParentDraft(name, sf), editing: true })
const emptyEnroll = (): EnrollFieldsValue => ({ subjects: [], courseIds: [], pkg: "month", times: [], startDate: "", bus: false, placement: true, classIds: [] })
/** the subjects are the ones the admin offered from the chat (owner 2026-11-18) — every child starts with all of them, the parent only picks a time */
const emptyStudent = (grade: string, subjects: string[] = [], sf = false): StudentBlock => ({ ...emptyStudentDraft(grade, sf), key: `st${seq++}`, activeSubjects: subjects, chosen: {}, editing: true, enroll: emptyEnroll() })
const fullName = joinName
/** the one visit a child's picks make up: same date+start for every subject, 2 h when 2+ subjects */
const visitOf = (s: Pick<StudentBlock, "chosen">) => {
  const slots = Object.values(s.chosen)
  return slots.length ? { date: slots[0].date, start: slots[0].start, minutes: slots.length > 1 ? 120 : slots[0].minutes } : null
}
const ageOf = (birth: string) => { if (!birth) return null; const b = new Date(birth), n = new Date(); return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0) }

/** owner 2026-11-24: the Parent forms page previews a branch's own "how did you hear about us" list — passed as ?sources=a|b|c (empty = the standard channels) */
function previewSources(params: URLSearchParams): string[] | undefined {
  const list = (params.get("sources") ?? "").split("|").map((x) => x.trim()).filter(Boolean)
  return list.length ? list : undefined
}

/** Sample data so the owner/staff can open /liff/form?preview=test|trial without LINE (nothing is sent). */
function previewData(type: FormType, fresh = false): { offers: FormSubjectOffer[]; grades: string[]; prefill: FormPrefill | null } {
  const days = [1, 2, 4].map((n) => addDays(toDateStr(new Date()), n))
  const slots = (subject: string) => days.flatMap((d, i) => ["10:00", "13:00", "16:00"].map((start, j) => ({ id: `${subject}-${i}-${j}`, date: d, start, minutes: 60, source: "generic" as const, teacherId: null, roomId: null, classId: null, sessionId: null })))
  // the admin offered 2 subjects from the chat — that is all the parent sees
  const offers = ["คณิต", "อังกฤษ"].map((subject) => ({ subject, slots: slots(subject) }))
  // owner 2026-10-15: every preview comes filled in, so you can click through without typing
  // a first-time parent: nothing on file, but the admin already chose the child's grade when making the form
  const prefill: FormPrefill | null = fresh ? { parents: [], students: [], childGrade: "ป.5" } : type === "trial" || type === "test" ? {
    parents: [{ name: "สมชาย ใจดี", phone: "089-555-1212", altPhones: ["02-111-2222"], relationship: "คุณพ่อ", email: "somchai@mail.com", primary: true }],
    address: "123/45 ถ.สุขุมวิท แขวงคลองตันเหนือ เขตวัฒนา", province: "กรุงเทพฯ", postcode: "10110", acquisitions: ["walkin", "facebook"],
    location: { lat: 13.7309, lng: 100.5849 }, addressNote: "หมู่บ้านพฤกษา ซอย 2 หลังซ้ายมือ ประตูสีเขียว",
    students: [{ name: "ภูมิ ใจดี", nickname: "ภูมิ", grade: "ป.5", birthDate: "2015-03-12", school: "โรงเรียนสาธิต", note: "ชอบคณิต แต่ยังไม่มั่นใจเรื่องโจทย์ปัญหา", interests: ["คณิต", "อังกฤษ"] }],
  } : null
  return { offers, grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"], prefill }
}

export function LiffForm() {
  const params = useSearchParams()
  const initialToken = params.get("token") ?? ""
  const previewParam = params.get("preview")
  const preview = previewParam === "enroll" ? null : (previewParam as FormType | null)
  const previewEnroll = previewParam === "enroll"
  /** owner 2026-11-20: staff correct a submitted answer sheet IN the real parent form (the inbox opens this page in a dialog) — "บันทึก" saves, nothing is sent to the parent */
  const editSubId = params.get("submission")
  const [editSub, setEditSub] = useState<FormSubmission | null>(null)
  const liffRef = useRef<{ closeWindow: () => void } | null>(null)
  const [token, setToken] = useState(initialToken)
  const [phase, setPhase] = useState<Phase>("init")
  // owner 2026-10-22: the course catalog opens inside this LIFF page (so LINE tells it who is looking)
  const [catalogToken, setCatalogToken] = useState("")
  const [step, setStep] = useState<Step>("parent")
  const [error, setError] = useState("")
  const [lang, setLang] = useState<FormLang>((params.get("lang") as FormLang) || "th")
  const [formType, setFormType] = useState<FormType>("test")
  const [offers, setOffers] = useState<FormSubjectOffer[]>([])
  // owner 2026-10-22: Trial (and a Test the admin split into separate days) = a time per subject, not one shared visit
  const [separate, setSeparate] = useState(false)
  const [grades, setGrades] = useState<string[]>([])
  const [branchName, setBranchName] = useState("")
  const [brandId, setBrandId] = useState<Brand>("nockacademy")
  /** owner 2026-11-19: the branch runs a school bus (Settings) — Liclass by default */
  const [busOffered, setBusOffered] = useState(false)
  /** the branch's own "how did you hear about us" list (owner 2026-11-19) */
  const [sourceOptions, setSourceOptions] = useState<string[] | undefined>()
  const brandName = brandId === "liclass" ? "Liclass" : "NockAcademy"
  const [lineUserId, setLineUserId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [known, setKnown] = useState(false)
  const [subjectNames, setSubjectNames] = useState<FormToken["subjectNames"]>({})

  const [parents, setParents] = useState<ParentBlock[]>([emptyParent()])
  const [primaryIdx, setPrimaryIdx] = useState(0)
  const [fam, setFam] = useState<FamilyDraft>(emptyFamilyDraft)
  const [students, setStudents] = useState<StudentBlock[]>([])
  const [enroll, setEnroll] = useState<EnrollInfo | null>(null)
  /** owner 2026-11-19: the invoice sent with this form + the pay slip the parent attaches */
  const [invoice, setInvoice] = useState<EnrollInvoiceSnap | null>(null)
  const [slip, setSlip] = useState("")
  const [terms, setTerms] = useState(false)
  const t = DICT[lang]
  const te = ENROLL_DICT[lang]
  // parents read subjects/grades in their language; what we store stays the Thai name
  const names: Names = { subject: (x) => subjectLabel(x, lang, subjectNames), grade: (g) => gradeLabel(g, lang) }

  /** what we already know → cards the parent only checks (owner 2026-09-29: never type it twice) */
  const applyPrefill = (p: FormPrefill | null, gradeList: string[], offerList: FormSubjectOffer[], lineName: string, sf = false) => {
    if (p?.parents.length) {
      // owner 2026-11-20: only a parent we already hold complete details for (name + phone) is shown folded — anyone new opens expanded
      setParents(p.parents.map((x) => { const d = parentDraftOf(x, sf); return { ...d, editing: !(d.first.trim() && d.phones[0]?.trim()) } }))
      setPrimaryIdx(Math.max(0, p.parents.findIndex((x) => x.primary)))
      setFam({
        ...emptyFamilyDraft(), referral: p.referral ?? "", pdpa: p.pdpa ?? "",
        name: p.familyName ?? "", nameEn: p.familyNameEn ?? "", acquisitions: p.acquisitions ?? [],
        address: p.address ?? "", parts: addressPartsOf(p.address, p.addressParts), province: p.province ?? "", postcode: p.postcode ?? "", location: p.location, addressNote: p.addressNote ?? "",
        wantTax: !!p.taxInfo, tax: p.taxInfo ?? { customerName: "", taxId: "", address: "" },
      })
      setKnown(p.parents.some((x) => { const d = parentDraftOf(x, sf); return !!(d.first.trim() && d.phones[0]?.trim()) }))
    } else setParents([emptyParent(lineName, sf)])
    const subjects = offerList.map((o) => o.subject)
    setStudents(p?.students.length
      // owner 2026-11-20: a child sees only the subjects the admin set for THEM (their `interests`), when those are on offer — else every offered subject
      ? p.students.map((s) => { const own = (s.interests ?? []).filter((x) => subjects.includes(x)); const d = studentDraftOf(s, sf); return { ...emptyStudent(s.grade, own.length ? own : subjects, sf), ...d, editing: !(d.first.trim() && d.grade) } })
      : [emptyStudent(p?.childGrade ?? "", subjects, sf)])
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      // one LIFF app for every parent form: exit-form links ("pf_" tokens) live on their own page
      const pf = initialToken || new URLSearchParams(window.location.search).get("token") || ""
      if (pf.startsWith("pf_")) { window.location.replace(`/liff/exit?token=${encodeURIComponent(pf)}`); return }
      if (pf.startsWith("ps_")) { window.location.replace(`/liff/survey?token=${encodeURIComponent(pf)}`); return }
      // form builder (owner 2026-10-22): a form the company made
      if (pf.startsWith("pc_")) { window.location.replace(`/liff/custom?token=${encodeURIComponent(pf)}`); return }
      if (pf.startsWith("pk_")) { setCatalogToken(pf); return }
      // enroll-now (owner 2026-10-05): from the Rich Menu or a link an admin sent — LINE login only when opened inside LINE
      if (pf.startsWith("pe_") || previewEnroll) {
        let tk: EnrollToken
        if (previewEnroll) {
          tk = { token: "preview", kind: "enroll", reusable: true, branchId: "", branchName: params.get("branchName") || "ทองหล่อ", sources: previewSources(params), brand: (params.get("brand") as Brand) || "nockacademy", lang: "th", grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"], subjects: ["คณิต", "อังกฤษ", "วิทย์"],
            subjectNames: { "คณิต": { en: "Math", ja: "数学" }, "อังกฤษ": { en: "English", ja: "英語" }, "วิทย์": { en: "Science", ja: "理科" } }, conversationId: null, createdAt: "", used: false,
            courses: [{ id: "c1", name: "คณิต ป.5 รายเดือน", subjects: ["คณิต"], grades: ["ป.5"], unit: "month", duration: 1, price: 4400 }, { id: "c2", name: "อังกฤษ ป.6 24 ชม.", subjects: ["อังกฤษ"], grades: ["ป.6"], unit: "hour", duration: 24, price: 6300 }],
            // owner 2026-10-16: the admin picks course + classes on the invoice — the form only asks for details
            classOffers: [] }
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
        setBusOffered(tk.bus ?? tk.brand === "liclass"); setSourceOptions(tk.sources)
        setInvoice(tk.invoice ?? (previewEnroll ? PREVIEW_INVOICE : null))
        setEnroll({ courses: tk.courses, subjects: tk.subjects, busOffered: false, classOffers: tk.classOffers, plan: tk.plan })
        setGrades(tk.grades); setBranchName(tk.branchName); setBrandId(tk.brand); setSubjectNames(tk.subjectNames ?? {})
        if (!params.get("lang")) setLang(brandLang(tk.brand))
        applyPrefill(tk.prefill ?? (previewEnroll ? previewData("trial").prefill : null), tk.grades, [], "", tk.brand === "liclass")
        if (previewEnroll) setStudents((ss) => ss.map((st) => ({ ...st, enroll: { ...emptyEnroll(), classIds: ["k1", "k3"], startDate: addDays(toDateStr(new Date()), 7) } })))
        setPhase("ready")
        return
      }
      if (editSubId) {
        const subs = await fetch("/api/forms/submissions").then((r) => r.json()).catch(() => ({ submissions: [] }))
        const sub = (subs.submissions as FormSubmission[] | undefined)?.find((x) => x.id === editSubId)
        if (!sub) { setError("ไม่พบฟอร์มนี้"); setPhase("invalid"); return }
        const tk = await fetch(`/api/forms/token?token=${encodeURIComponent(sub.token)}&peek=1`).then((r) => r.json()).catch(() => ({ ok: false }))
        if (cancelled) return
        const brand: Brand = tk.brand ?? "nockacademy"
        const subjects = [...new Set(sub.picks.map((p) => p.chosenSubject))]
        const offersOf: FormSubjectOffer[] = subjects.map((subject) => ({ subject, slots: sub.picks.filter((p) => p.chosenSubject === subject).map((p) => p.chosenSlot) }))
        setEditSub(sub); setFormType(sub.type); setOffers(offersOf); setGrades(tk.grades?.length ? tk.grades : [sub.studentGrade]); setDisplayName(sub.parents[0]?.name ?? ""); setLineUserId("preview")
        setSeparate(new Set(sub.picks.map((p) => `${p.chosenSlot.date} ${p.chosenSlot.start}`)).size > 1)
        setSubjectNames(tk.subjectNames ?? {}); setBranchName(tk.branchName ?? ""); setBrandId(brand); setBusOffered(tk.bus ?? brand === "liclass"); setSourceOptions(tk.sources)
        if (!params.get("lang")) setLang(tk.lang ?? brandLang(brand))
        applyPrefill({
          parents: sub.parents, address: sub.familyAddress, addressParts: sub.familyAddressParts, postcode: sub.familyPostcode, province: sub.familyProvince, location: sub.familyLocation, addressNote: sub.familyAddressNote,
          acquisitions: sub.acquisitions, familyName: sub.familyName, familyNameEn: sub.familyNameEn, taxInfo: sub.taxInfo, referral: sub.referral, pdpa: sub.pdpa,
          students: [{ name: sub.studentName, nickname: sub.studentNickname, nameEn: sub.studentNameEn, nicknameEn: sub.studentNicknameEn, gender: sub.studentGender, grade: sub.studentGrade, birthDate: sub.studentBirthDate, school: sub.studentSchool, schoolId: sub.studentSchoolId, targetSchools: sub.studentTargetSchools, note: sub.studentNote }],
        } as FormPrefill, tk.grades ?? [], offersOf, "", brand === "liclass")
        setFam((x) => ({ ...x, sourceLabels: sub.acquisitionLabels ?? [], busUse: !!sub.familyBusLeg, busLeg: sub.familyBusLeg ?? "both" }))
        setStudents((ss) => ss.map((st) => ({ ...st, editing: true, activeSubjects: subjects, chosen: Object.fromEntries(sub.picks.map((p) => [p.chosenSubject, p.chosenSlot])) })))
        setParents((ps) => ps.map((p) => ({ ...p, editing: true })))
        setPhase("ready")
        return
      }
      if (preview) {
        const d = previewData(preview, params.get("fresh") === "1")
        setFormType(preview); setOffers(d.offers); setGrades(d.grades); setDisplayName("ผู้ปกครอง"); setLineUserId("preview"); setSeparate(preview === "trial")
        setSubjectNames({ "คณิต": { en: "Math", ja: "数学" }, "อังกฤษ": { en: "English", ja: "英語" }, "วิทย์": { en: "Science", ja: "理科" } })
        const b = (params.get("brand") as Brand) || (preview === "trial" ? "liclass" : "nockacademy")
        setBranchName(params.get("branchName") || (b === "liclass" ? "Liclass บางนา" : "ทองหล่อ")); setBrandId(b); setBusOffered(b === "liclass"); setSourceOptions(previewSources(params))
        if (!params.get("lang")) setLang(brandLang(b))
        applyPrefill(d.prefill, d.grades, d.offers, "", b === "liclass")
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
        setFormType(data.type); setOffers(data.offers); setGrades(data.grades ?? []); setBranchName(data.branchName ?? ""); if (data.brand) setBrandId(data.brand); setBusOffered(data.bus ?? data.brand === "liclass"); setSourceOptions(data.sources); setSubjectNames(data.subjectNames ?? {}); setSeparate(data.visit === "separate")
        if (!params.get("lang")) setLang(brandLang(data.brand ?? brandId))
        applyPrefill(data.prefill, data.grades ?? [], data.offers, profile.displayName, data.brand === "liclass")
        setPhase("ready")
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "เปิดฟอร์มไม่สำเร็จ — ลองเปิดลิงก์นี้จากแอป LINE อีกครั้ง")
        setPhase("invalid")
      }
    }
    run()
    return () => { cancelled = true }
  }, [initialToken, preview, editSubId]) // eslint-disable-line react-hooks/exhaustive-deps

  const setParent = (i: number, patch: Partial<ParentBlock>) => setParents((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const setStudent = (key: string, patch: Partial<StudentBlock>) => setStudents((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  // owner 2026-11-20: several children on a Test that is ONE visit come together — the time is picked once (on child 1) and every child gets it
  const together = formType === "test" && !separate && students.length > 1
  const unionSubjects = [...new Set(students.flatMap((x) => x.activeSubjects))]
  const pickVisit = (bySubject: Record<string, FormOfferSlot>) => setStudents((ss) => ss.map((st) => ({ ...st, chosen: Object.fromEntries(st.activeSubjects.filter((sj) => bySubject[sj]).map((sj) => [sj, bySubject[sj]])) })))
  const parentsValid = parents.length > 0 && parents.every((p) => p.first.trim() && !phoneIssue(p.phones[0] ?? "") && (!p.email.trim() || validEmail(p.email))) && !!fam.pdpa
  const studentsValid = students.length > 0 && students.every((s) => s.first.trim() && s.grade && (enroll ? (enroll.classOffers ? (enroll.classOffers.length ? enrollClassValid(s.enroll) : !!s.enroll.startDate) : enrollValid(s.enroll)) : s.activeSubjects.length > 0 && s.activeSubjects.every((subj) => s.chosen[subj]) && !(separate && picksClash(s.chosen))))
  /** owner 2026-11-20: a field that is missing or wrong turns red with the reason in words. Wrong-looking input (stray characters, too many digits) shows at once;
   *  "empty" and "not finished yet" wait until the parent presses Next — nobody gets shouted at while still typing */
  const [attempt, setAttempt] = useState<Record<string, boolean>>({})
  const flagStep = (k: string) => { setAttempt((a) => ({ ...a, [k]: true })); setTimeout(() => document.querySelector("[data-invalid]")?.scrollIntoView({ block: "center", behavior: "smooth" }), 60) }
  const phoneMsg = (v: string, strict: boolean) => {
    const i = phoneIssue(v)
    if (!i) return undefined
    if (i === "chars") return t.errPhoneChars
    if (i === "long") return t.errPhoneLong
    if (!strict) return undefined
    return i === "empty" ? t.errRequired : i === "short" ? t.errPhoneShort : t.errPhoneZero
  }
  const parentErrs = parents.map((p) => ({
    name: attempt.parent && !p.first.trim() ? t.errRequired : undefined,
    phone: phoneMsg(p.phones[0] ?? "", !!attempt.parent),
    email: attempt.parent && p.email.trim() && !validEmail(p.email) ? t.errEmail : undefined,
  }))

  /** the child's surname box left empty = the main parent's surname (owner 2026-11-18) */
  const parentLast = parents[primaryIdx]?.last.trim() ?? ""
  const withLast = (s: StudentBlock): StudentBlock => (s.last.trim() ? s : { ...s, last: parentLast })
  const parentsPayload = () => parents.map((p, i) => parentInputOf(p, i === primaryIdx))
  /** the household answers, as both submit APIs take them */
  const familyPayload = () => ({
    familyName: fam.name.trim() || undefined, familyNameEn: fam.nameEn.trim() || undefined,
    familyAddress: fam.address || undefined, familyAddressParts: fam.address ? fam.parts : undefined, familyPostcode: fam.postcode || undefined, familyProvince: fam.province || undefined, acquisitions: fam.acquisitions.length ? fam.acquisitions : undefined, acquisitionLabels: sourceOptions?.length && fam.sourceLabels.length ? fam.sourceLabels : undefined,
    familyLocation: fam.location, familyAddressNote: fam.addressNote || undefined, taxInfo: fam.wantTax ? fam.tax : undefined,
    familyBusLeg: busOffered && fam.busUse ? fam.busLeg : undefined, referral: fam.referral.trim() || undefined, pdpa: fam.pdpa || undefined,
  })
  const submit = async () => {
    if (!parentsValid || !studentsValid) return
    if (enroll && !terms) { setError(te.termsNeed); return }
    if (invoice?.status === "void") { setError(te.invoiceVoid); return }
    setError("")
    setPhase("submitting")
    if (preview || previewEnroll) { setPhase("done"); return }
    if (editSubId && editSub) {
      // staff correction: write the answers back (a field cleared in the form is cleared in the answer sheet), then tell the inbox
      const sd = studentInputOf(withLast(students[0]))
      const fp = familyPayload() as Record<string, unknown>
      const nul = (v: unknown) => (v === undefined || v === "" ? null : v)
      const answers: Record<string, unknown> = {
        studentName: sd.name, studentNickname: nul(sd.nickname), studentNameEn: nul(sd.nameEn), studentNicknameEn: nul(sd.nicknameEn), studentGender: nul(sd.gender), studentGrade: sd.grade,
        studentBirthDate: nul(sd.birthDate), studentSchool: nul(sd.school), studentSchoolId: nul(sd.schoolId), studentTargetSchools: nul(sd.targetSchools), studentNote: nul(sd.note),
        parents: parentsPayload().map((p, i) => ({ ...p, lineId: editSub.parents[i]?.lineId })),
      }
      for (const k of ["familyName", "familyNameEn", "familyAddress", "familyAddressParts", "familyPostcode", "familyProvince", "familyLocation", "familyAddressNote", "acquisitions", "acquisitionLabels", "taxInfo", "familyBusLeg", "referral", "pdpa"]) answers[k] = nul(fp[k])
      const res = await fetch("/api/forms/edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editSubId, answers }) }).then((r) => r.json()).catch(() => ({ ok: false, error: "บันทึกไม่สำเร็จ — เครือข่ายมีปัญหา" }))
      if (!res.ok) { setError(res.error ?? "บันทึกไม่สำเร็จ"); setPhase("ready"); return }
      window.parent.postMessage({ type: "nock-submission-saved" }, window.location.origin)
      setPhase("done")
      return
    }
    if (enroll) {
      const res = await fetch("/api/parent-forms/enroll-submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, lineUserId: lineUserId || undefined, lineName: displayName || undefined, parents: parentsPayload(), lang, acceptedTerms: true,
          ...familyPayload(),
          invoiceId: invoice?.invoiceId, slip: slip || undefined,
          children: students.map((s) => ({ ...studentInputOf(withLast(s)), ...s.enroll, bus: busOffered && fam.busUse, busLeg: busOffered && fam.busUse ? fam.busLeg : undefined, ...(enroll.plan ? { courseIds: [enroll.plan.course.id], periods: enroll.plan.periods } : {}) })),
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
            ...studentInputOf(withLast(s)),
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

  if (catalogToken) return <CatalogApp token={catalogToken} />
  if (phase === "init") return <Centered><Spinner /><p className="mt-3 text-sm text-muted-foreground">{t.opening}</p></Centered>
  if (phase === "invalid") return <Centered><XCircleIcon className="size-10 text-danger" /><p className="mt-3 text-center text-sm text-muted-foreground">{error}</p></Centered>

  const stepIndex = STEP_KEYS.indexOf(step)
  const summary = (
    <Summary t={t} lang={lang} names={names} separate={separate} parents={parents} primaryIdx={primaryIdx} fam={fam} linked={lineUserId ? displayName : undefined}
      students={students.map(withLast)} onEdit={phase === "done" ? undefined : (s) => setStep(s)} enroll={enroll} />
  )

  return (
    <BrandScope brand={brandId} className="min-h-screen bg-background pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <ShrinkHeader className="-mx-4 -mt-4" title={enroll ? te.title : t.formTitle(formType)} subtitle={`${brandName}${branchName ? ` · ${branchName}` : ""}`} lang={lang} onLang={setLang} />
        {invoice?.status === "void" && phase !== "done" && <p className="flex items-center gap-2 rounded-2xl bg-danger-soft px-3 py-2.5 text-sm text-danger-ink"><XCircleIcon className="size-4 shrink-0" />{te.invoiceVoid}</p>}
        {phase === "done" && <p className="flex items-center gap-2 rounded-2xl bg-success-soft px-3 py-2.5 text-sm text-success-ink"><CheckCircle2Icon className="size-4 shrink-0" />{enroll ? `${te.sent} · ${te.sentSub}` : `${t.sent(formType)} · ${t.sentSub}`}</p>}


        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {t.steps.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              {i > 0 && <span className="h-px w-3 bg-border" />}
              {/* owner 2026-10-15: in a preview the steps are buttons — jump anywhere, no typing needed */}
              <Button variant="ghost" size="inline" type="button" disabled={!(preview || previewEnroll || editSubId) || phase === "done"} onClick={() => setStep(STEP_KEYS[i])}
                className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 disabled:cursor-default", (preview || previewEnroll || editSubId) && phase !== "done" && "hover:ring-2 hover:ring-primary/30",
                  phase === "done" || i < stepIndex ? "bg-primary/10 text-primary" : i === stepIndex ? "bg-primary text-primary-foreground" : "border text-muted-foreground")}>
                {phase === "done" || i < stepIndex ? <CheckIcon className="size-3" /> : <PencilIcon className="size-3" />}{label}
              </Button>
            </li>
          ))}
        </ol>

        {phase === "done" ? summary : step === "parent" ? (
          <section className="space-y-3">
            <SectionHead icon={UsersIcon} title={t.parentTitle} sub={t.parentSub} action={<Button size="sm" variant="secondary" onClick={() => setParents((ps) => [...ps, emptyParent("", brandId === "liclass")])}><PlusIcon /> {t.addParent}</Button>} />
            <Section t={t} n={1} total={SEC_TOTAL} title={t.secParent} required>
              {known && <p className="text-xs text-muted-foreground">{t.known}</p>}
            {parents.map((p, i) => p.editing ? (
              <div key={i} className={cn("space-y-3", i > 0 && "border-t pt-4")}>
                {(parents.length > 1 || known) && (
                  <div className="flex items-center justify-between">
                    {parents.length > 1 ? <p className="text-sm font-semibold">{t.parentN(i + 1)}</p> : <span />}
                    <span className="flex items-center gap-2">
                      {parents.length > 1 && <Button size="icon-xs" variant="ghost" className="text-danger" aria-label={t.remove} onClick={() => { setParents((ps) => ps.filter((_, j) => j !== i)); setPrimaryIdx(0) }}><TrashIcon /></Button>}
                      {known && <Button size="xs" variant="outline" disabled={!p.first.trim() || !p.phones[0]?.trim()} onClick={() => setParent(i, { editing: false })}><CheckIcon /> {t.done}</Button>}
                    </span>
                  </div>
                )}
                <ParentFields bareName errors={parentErrs[i]} t={t} value={p} onChange={(patch) => setParent(i, patch)} linked={i === 0 && lineUserId ? displayName : undefined} />
                {parents.length > 1 && (
                  <label className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2 text-sm"><Checkbox checked={primaryIdx === i} onCheckedChange={() => setPrimaryIdx(i)} /> {t.primaryParent}</label>
                )}
              </div>
            ) : (
              <ParentCard key={i} t={t} lang={lang} p={p} linked={i === 0 && lineUserId ? displayName : undefined} primary={primaryIdx === i && parents.length > 1} onEdit={() => setParent(i, { editing: true })} />
            ))}
            </Section>
            <Section t={t} n={2} total={SEC_TOTAL} title={t.secSource}>
              <FamilyAcquisition t={t} f={fam} onChange={(patch) => setFam((x) => ({ ...x, ...patch }))} sourceOptions={sourceOptions} extras first />
            </Section>
            <Section t={t} n={3} total={SEC_TOTAL} title={busOffered ? t.secBus : t.secAddress}>
              <FamilyBus t={t} f={fam} onChange={(patch) => setFam((x) => ({ ...x, ...patch }))} busOffered={busOffered} first />
            </Section>
            <Section t={t} n={4} total={SEC_TOTAL} title={t.secPdpa} required error={attempt.parent && !fam.pdpa ? t.errPdpa : undefined}>
              <FamilyPdpa t={t} f={fam} onChange={(patch) => setFam((x) => ({ ...x, ...patch }))} noTitle />
            </Section>
            <Section t={t} n={5} total={SEC_TOTAL} title={t.secTax}>
              <FamilyTax t={t} f={fam} onChange={(patch) => setFam((x) => ({ ...x, ...patch }))} first />
            </Section>
          </section>
        ) : step === "student" ? (
          <section className="space-y-3">
            <SectionHead icon={UserRoundIcon} title={t.studentTitle} sub={enroll ? te.studentSub : t.studentSub} action={<Button size="sm" variant="secondary" onClick={() => setStudents((ss) => [...ss, emptyStudent("", offers.map((o) => o.subject), brandId === "liclass")])}><PlusIcon /> {t.addStudent}</Button>} />
            {students.map((s, i) => (
              <StudentCard key={s.key} lastPh={parentLast} t={t} lang={lang} names={names} n={i + 1} formType={formType} student={s} grades={grades} offers={offers} enroll={enroll} separate={separate} together={together} unionSubjects={unionSubjects} pickVisit={pickVisit} showErr={!!attempt.student}
                onChange={(patch) => setStudent(s.key, patch)} onRemove={students.length > 1 ? () => setStudents((ss) => ss.filter((x) => x.key !== s.key)) : undefined} />
            ))}
          </section>
        ) : (
          <section className="space-y-3">
            <SectionHead icon={ClipboardCheckIcon} title={t.summaryTitle} sub={t.summarySub} />
            {summary}
            {enroll && invoice && <InvoicePay t={te} inv={invoice} slip={slip} onSlip={setSlip} />}
            {enroll && <label className={cn("flex items-start gap-2 rounded-2xl bg-card p-3 text-sm ring-1", terms ? "ring-foreground/5" : "ring-warning/40")}><Checkbox className="mt-0.5" checked={terms} onCheckedChange={(v) => setTerms(!!v)} />{te.terms}</label>}
          </section>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {phase !== "done" && (
        <footer className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button variant="ghost" onClick={() => (editSubId ? window.parent.postMessage({ type: "nock-submission-cancel" }, window.location.origin) : liffRef.current ? liffRef.current.closeWindow() : setStep("parent"))}>{t.cancel}</Button>
            <span className="ml-auto" />
            {stepIndex > 0 && <Button variant="secondary" onClick={() => setStep(STEP_KEYS[stepIndex - 1])}><ChevronLeftIcon /> {t.back}</Button>}
            {step === "parent" && <Button onClick={() => { if (!parentsValid) { flagStep("parent"); return } setParents((ps) => ps.map((p) => ({ ...p, editing: p.editing && !(p.first.trim() && p.phones[0]?.trim()) }))); setStep("student") }}>{t.next} <ChevronRightIcon /></Button>}
            {step === "student" && <Button onClick={() => { if (!studentsValid) { flagStep("student"); return } setStep("summary") }}>{t.next} <ChevronRightIcon /></Button>}
            {step === "summary" && <Button disabled={phase === "submitting" || invoice?.status === "void"} onClick={submit}>{phase === "submitting" ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />} {editSubId ? "บันทึก" : t.submit}</Button>}
          </div>
        </footer>
      )}
    </BrandScope>
  )
}

type T = (typeof DICT)["th"]
type Names = { subject: (x: string) => string; grade: (g: string) => string }

function ParentCard({ t, lang, p, primary, linked, onEdit }: { t: T; lang: FormLang; p: ParentBlock; primary: boolean; linked?: string; onEdit?: () => void }) {
  return (
    <Card done>
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
        {linked && <Line icon={MessageCircleIcon}><span className="text-success">{t.lineLinked(linked)}</span></Line>}
        {p.email && <Line icon={MailIcon}>{p.email}</Line>}
        {p.birthDate && <Line icon={CakeIcon}>{fmtBirth(p.birthDate, lang)}</Line>}
      </div>
    </Card>
  )
}

function StudentCard({ t, lang, names, n, formType, student: s, grades, offers, onChange, onRemove, enroll, separate, lastPh, together, unionSubjects, pickVisit, showErr }: {
  showErr?: boolean;
  together?: boolean; unionSubjects: string[]; pickVisit: (b: Record<string, FormOfferSlot>) => void; lastPh?: string; t: T; lang: FormLang; names: Names; n: number; formType: FormType; student: StudentBlock; grades: string[]; offers: FormSubjectOffer[]; enroll: EnrollInfo | null; separate?: boolean
  onChange: (patch: Partial<StudentBlock>) => void; onRemove?: () => void
}) {
  // one list: only times every chosen subject is free at together (owner 2026-09-30) — 2+ subjects = one 2-hour visit
  const times = commonSlots(offers, together ? unionSubjects : s.activeSubjects)
  const picked = visitOf(s)
  const follower = !!together && n > 1
  const age = ageOf(s.birthDate)

  return (
    <div className="space-y-3">
      <Section t={t} n={1} total={2} title={t.studentN(n)} required>
      {s.editing ? (
        <>
          {onRemove && (
            <div className="flex justify-end">
              <Button size="icon-xs" variant="ghost" className="text-danger" aria-label={t.remove} onClick={onRemove}><TrashIcon /></Button>
            </div>
          )}
          <StudentFields bareName t={t} value={s} onChange={onChange} grades={grades} gradeLabel={names.grade} lastPh={lastPh} errors={{ name: showErr && !s.first.trim() ? t.errRequired : undefined, grade: showErr && !s.grade ? t.errGrade : undefined }} />
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">{(s.nickname || s.first).slice(0, 1)}</span>
            <p className="min-w-0 flex-1 truncate font-semibold">{fullName(s)}{s.nickname && <span className="font-normal text-muted-foreground"> ({s.nickname})</span>}</p>
            <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-ink">{names.grade(s.grade)}</span>
            <Button size="icon-sm" variant="outline" aria-label={t.edit} onClick={() => onChange({ editing: true })}><PencilIcon /></Button>
          </div>
          {s.birthDate && <Line icon={CakeIcon}>{fmtBirth(s.birthDate, lang)}{age !== null && ` · ${t.age(age)}`}</Line>}
          {s.school && <Line icon={SchoolIcon}>{s.school}</Line>}
          {s.note && <Line icon={StickyNoteIcon}>{s.note}</Line>}
        </div>
      )}

      </Section>
      <Section t={t} n={2} total={2} title={enroll ? ENROLL_DICT[lang].title : t.secTime} required error={showErr && !enroll && s.activeSubjects.some((sj) => !s.chosen[sj]) ? t.errTime : undefined}>
      {enroll ? (
        <EnrollFields t={ENROLL_DICT[lang]} lang={lang} grade={s.grade} subjects={enroll.subjects} subjectLabel={names.subject} courses={enroll.courses} classOffers={enroll.classOffers} plan={enroll.plan && { ...enroll.plan, bus: false }} busOffered={false}
          value={s.enroll} onChange={(patch) => onChange({ enroll: { ...s.enroll, ...patch } })} minDate={toDateStr(new Date())} />
      ) : (<>
      {/* owner 2026-11-18: the admin chose the subjects from the chat — the parent sees them (no ticking) and only picks a time */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t.subjectsFor(formType)}</p>
        <div className="flex flex-wrap gap-1.5">
          {s.activeSubjects.map((subject) => <span key={subject} className="rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium">{names.subject(subject)}</span>)}
        </div>
      </div>

      {separate && s.activeSubjects.map((subject) => (
        // owner 2026-10-22: a time per subject (Trial / separate test days)
        <div key={subject} className="space-y-2 border-t pt-3">
          <p className="text-sm font-semibold">{t.schedule(formType)} · {names.subject(subject)} *</p>
          {/* owner 2026-11-20: wide enough (card width, not screen) = two columns */}
          <div className="@container"><div className="grid gap-1 @sm:grid-cols-2">
            {(offers.find((o) => o.subject === subject)?.slots ?? []).toSorted((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map((x) => {
              const active = s.chosen[subject]?.id === x.id
              // Trial: several subjects on one day is fine, two at the same time is not (owner 2026-11-18)
              const clash = !active && slotClashes(x, s.chosen, subject)
              return (
                <Button variant="row" size="inline" key={x.id} type="button" disabled={clash} onClick={() => onChange({ chosen: { ...s.chosen, [subject]: x } })}
                  className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition disabled:opacity-40", active ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted")}>
                  <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", active ? "border-primary" : "border-muted-foreground/50")}>{active && <span className="size-2 rounded-full bg-primary" />}</span>
                  <span>
                    <span className="block text-sm font-medium tabular-nums">{x.start}–{endTime(x.start, x.minutes)}</span>
                    <span className="block text-xs text-muted-foreground">{fmtFormDate(x.date, lang)}{clash && ` · ${t.clash}`}</span>
                  </span>
                </Button>
              )
            })}
          </div></div>
        </div>
      ))}
      {follower && (
        <p className="border-t pt-3 text-sm text-muted-foreground">{lang === "ja" ? "1人目と同じ日時で一緒に受けます" : lang === "en" ? "Comes together with child 1 — same time" : "มาพร้อมกับลูกคนที่ 1 — เวลาเดียวกัน"}{picked && <b className="ml-1 tabular-nums text-foreground">{fmtFormDate(picked.date, lang)} {picked.start}–{endTime(picked.start, picked.minutes)}</b>}</p>
      )}
      {!separate && !follower && s.activeSubjects.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-semibold">{t.schedule(formType)} *</p>
          {times.length === 0 && <Empty>{t.noCommon}</Empty>}
          {/* owner 2026-11-20: wide enough (card width, not screen) = two columns */}
          <div className="@container"><div className="grid gap-1 @sm:grid-cols-2">
            {times.map((x) => {
              const active = picked?.date === x.date && picked.start === x.start
              return (
                <Button variant="row" size="inline" key={x.date + x.start} type="button" onClick={() => (together ? pickVisit(x.bySubject) : onChange({ chosen: x.bySubject }))}
                  className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition", active ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted")}>
                  <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", active ? "border-primary" : "border-muted-foreground/50")}>{active && <span className="size-2 rounded-full bg-primary" />}</span>
                  <span>
                    <span className="block text-sm font-medium tabular-nums">{x.start}–{endTime(x.start, x.minutes)}</span>
                    <span className="block text-xs text-muted-foreground">{fmtFormDate(x.date, lang)}</span>
                  </span>
                </Button>
              )
            })}
          </div></div>
        </div>
      )}
      </>)}
      </Section>
    </div>
  )
}

function Summary({ t, lang, names, parents, primaryIdx, fam, linked, students, onEdit, enroll, separate }: {
  t: T; lang: FormLang; names: Names; separate?: boolean; parents: ParentBlock[]; primaryIdx: number; fam: FamilyDraft; linked?: string
  students: StudentBlock[]; onEdit?: (s: Step) => void; enroll?: EnrollInfo | null
}) {
  const te = ENROLL_DICT[lang]
  const { address, province, postcode, addressNote, acquisitions } = fam
  const pinned = !!fam.location
  const tax = fam.wantTax ? fam.tax : null
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t.parentTitle}</p>
      <Card done>
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
              {i === 0 && linked && <Line icon={MessageCircleIcon}><span className="text-success">{t.lineLinked(linked)}</span></Line>}
              {p.email && <Line icon={MailIcon}>{p.email}</Line>}
            </div>
          </div>
        ))}
        {(address || province || postcode || pinned) && (
          <div className="space-y-1 border-t pt-2">
            <Line icon={MapPinIcon}>{[address, province, postcode].filter(Boolean).join(" ")}{pinned && <span className="ml-1 text-xs text-success">· 📍</span>}</Line>
            {addressNote && <Line icon={StickyNoteIcon}>{addressNote}</Line>}
          </div>
        )}
        {(fam.sourceLabels.length > 0 ? fam.sourceLabels : acquisitions.map((k) => t.src[k])).length > 0 && <Line icon={UserRoundIcon}>{(fam.sourceLabels.length > 0 ? fam.sourceLabels : acquisitions.map((k) => t.src[k])).join(", ")}</Line>}
        {fam.referral.trim() && <Line icon={UserRoundIcon}>{t.referral}: {fam.referral.trim()}</Line>}
        {fam.busUse && <Line icon={BusIcon}>{t.busUse} · {t.busLeg[fam.busLeg]}</Line>}
        {fam.pdpa && <Line icon={CameraIcon}>{t.pdpa[fam.pdpa]}</Line>}
        {tax && (tax.customerName || tax.taxId) && <div className="border-t pt-2"><Line icon={ReceiptIcon}>{tax.customerName} · {tax.taxId}{tax.address && ` · ${tax.address}`}</Line></div>}
      </Card>

      <p className="text-sm font-semibold">{t.studentTitle}</p>
      {students.map((s) => {
        const age = ageOf(s.birthDate)
        return (
          <Card key={s.key} done>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">{(s.nickname || s.first).slice(0, 1)}</span>
              <p className="min-w-0 flex-1 truncate font-semibold">{fullName(s)}{s.nickname && <span className="font-normal text-muted-foreground"> ({s.nickname})</span>}</p>
              <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-ink">{names.grade(s.grade)}</span>
              {onEdit && <Button size="icon-sm" variant="outline" aria-label={t.edit} onClick={() => onEdit("student")}><PencilIcon /></Button>}
            </div>
            {s.birthDate && <Line icon={CakeIcon}>{fmtBirth(s.birthDate, lang)}{age !== null && ` · ${t.age(age)}`}</Line>}
            {s.school && <Line icon={SchoolIcon}>{s.school}</Line>}
            {s.note && <Line icon={StickyNoteIcon}>{s.note}</Line>}
            {enroll && (
              <div className="space-y-1 border-t pt-2 text-sm">
                {enroll.classOffers ? (
                  <Line icon={CalendarClockIcon}>{[(s.enroll.classIds ?? []).map((id) => enroll.classOffers!.find((o) => o.id === id)).filter((o): o is EnrollClassOffer => !!o).map((o) => `${classTimeLabel(o, te)} · ${o.subjects.map(names.subject).join(" + ")}`).join(" / "), `${te.start} ${fmtFormDate(s.enroll.startDate, lang)}`].filter(Boolean).join(" · ")}</Line>
                ) : <>
                <Line icon={HeartIcon}>{[...s.enroll.subjects.map(names.subject), ...s.enroll.courseIds.map((id) => enroll.courses.find((c) => c.id === id)).filter((c): c is EnrollCourseOption => !!c).map((c) => `${c.name} (${courseLine(c, te)})`)].join(" · ")}</Line>
                <Line icon={ReceiptIcon}>{te.pkgs[s.enroll.pkg]}</Line>
                <Line icon={CalendarClockIcon}>{s.enroll.times.map((k) => timeLabel(k, te)).join(", ")} · {te.start} {fmtFormDate(s.enroll.startDate, lang)}</Line>
                </>}
                {(s.enroll.bus || s.enroll.placement) && <Line icon={CheckIcon}>{[s.enroll.bus && te.bus, s.enroll.placement && te.placement].filter(Boolean).join(" · ")}</Line>}
              </div>
            )}
            {separate && Object.entries(s.chosen).map(([subject, x]) => (
              <div key={subject} className="flex flex-wrap items-center gap-2 text-sm">
                <HeartIcon className="size-4 fill-red-500 text-danger" /> <span className="font-medium">{names.subject(subject)}</span>
                <span className="mx-1 h-px min-w-6 flex-1 border-t border-dashed" />
                <CalendarClockIcon className="size-4 text-primary" />
                <span className="rounded-full border px-2 py-0.5 text-xs">{fmtFormDate(x.date, lang)}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs tabular-nums">{x.start}–{endTime(x.start, x.minutes)}</span>
              </div>
            ))}
            {!separate && visitOf(s) && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <HeartIcon className="size-4 fill-red-500 text-danger" /> <span className="font-medium">{Object.keys(s.chosen).map(names.subject).join(" + ")}</span>
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

/** a section being filled = flat, divider above; a section already filled in (`done`) = a card (owner 2026-11-09) */
function Card({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return <div className={done ? "space-y-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/5" : "space-y-3 border-t pt-4 first:border-t-0 first:pt-0"}>{children}</div>
}

const SEC_TOTAL = 5

/** owner 2026-11-20: every part of the form is its own card with a clear numbered title (n/total) — nothing hidden, nothing run together */
function Section({ t, n, total, title, required, error, children }: { t: T; n: number; total: number; title: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div data-invalid={error ? "" : undefined} className={cn("space-y-3 rounded-2xl bg-card p-4 shadow-sm ring-1", error ? "ring-2 ring-destructive" : "ring-foreground/5")}>
      <div className="flex items-center gap-2">
        <span aria-label={t.secN(n, total)} className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-2xs font-semibold tabular-nums text-primary-foreground">{n}/{total}</span>
        <p className="min-w-0 flex-1 text-sm font-semibold">{title}</p>
        <span className={cn("shrink-0 text-2xs", required ? "font-medium text-primary" : "text-muted-foreground")}>{required ? t.req : t.optional}</span>
      </div>
      {error && <p className="text-xs font-medium text-danger">{error}</p>}
      {children}
    </div>
  )
}

function Line({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <p className="flex items-start gap-2 text-sm"><Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words">{children}</span></p>
}


export function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center p-6">{children}</div>
}

export function Spinner() {
  return <LoaderCircleIcon className="size-8 animate-spin text-muted-foreground" />
}
