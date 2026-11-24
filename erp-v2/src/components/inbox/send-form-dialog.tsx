"use client"

import { familyDisplay } from "@/domain/rules/people"
import { tx } from "@/lib/i18n"
import { catalogInterests } from "@/domain/rules/catalog"
import { useMemo, useState } from "react"
import { CalendarClockIcon, CalendarRangeIcon, CheckIcon, ChevronLeftIcon, PlusIcon, SendIcon, TriangleAlertIcon, UsersIcon, XIcon } from "lucide-react"
import { addDays, fmtDate, fromMinutes, TH_DAYS_FULL, toDateStr, toMinutes } from "@/domain/dates"
import { siblingLead } from "@/domain/rules/crm"
import { buildFormPrefill, COMBINED_MINUTES, commonSlots, visitTeachersAt, visitOffers, repeatTrials, findOfferSlots, FORM_TYPE_LABEL, freeTeachersAt } from "@/domain/rules/forms"
import { SOURCE_OF_CHANNEL } from "@/domain/rules/inbox"
import type { FormOfferSlot, FormSubjectOffer, FormType, ID } from "@/domain/types"
import { sendTestTrialForm } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { NativeSelect } from "@/components/app/native-select"
import { DateRangePicker } from "@/components/app/date-range-picker"
import { subjectHex } from "@/components/app/subject-color"
import { uid } from "@/data/seed"
import { Button } from "@/components/ui/button"
import { Empty } from "@/components/app/empty"
import { Segmented } from "@/components/app/page-layout"
import { CoursePicker } from "@/components/billing/course-picker"

const TYPES: FormType[] = ["test", "trial"]

/**
 * Send a Test / Trial form (owner 2026-10-22 redesign): pick the subjects, then the times to offer.
 * Test with 2+ subjects asks first: one visit (one 2-hour slot where every subject is free — picked once from one
 * list) or separate days (times per subject). Trial always offers times per subject (a trial is a real class of that
 * subject — they can't be merged). The slots come from the same engine as everywhere (free hours with a free teacher
 * and room, or a real class with a seat).
 */
export function SendFormDialog({
  leadId, branchId, conversationId, lineUserId, onClose, initialType, initialSubjects, initialCourseId, initialCourseIds, initialClassId, initialKids,
}: {
  /** null = a family that is already a customer (owner 2026-10-19: e.g. a second child) — a lead is made for the child on send */
  leadId: ID | null; branchId: ID; conversationId: ID; lineUserId: string; onClose: () => void
  /** picked already (Inbox "+" menu → Test / Trial) — skips the type step */
  initialType?: FormType
  /** owner 2026-10-22: from a catalog request — that class's subjects start picked */
  initialSubjects?: string[]
  /** owner 2026-11-19: the course / class the parent tapped in the catalog — that course starts ticked and that class's time starts offered */
  initialCourseId?: ID
  /** owner 2026-11-20: several courses ticked in the Lead panel — all start picked (so ONE form covers them) */
  initialCourseIds?: ID[]
  /** owner 2026-11-20: the children this form is for (ticked in the Lead panel) — one form, one link: it opens with each child's name and grade */
  initialKids?: { name: string; grade: string; subjects?: string[] }[]
  initialClassId?: ID
}) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const courses = useStore((s) => s.courses)
  const holidays = useStore((s) => s.holidays)
  const lead = useStore((s) => s.leads.find((l) => l.id === leadId))
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const assessments = useStore((s) => s.assessments)
  const conversations = useStore((s) => s.conversations)
  const lang = useStore((s) => s.system.preferences.language)
  const subjectNames = useStore((s) => s.system.subjectNames)
  const now = useNow(60_000)
  // what we already know about this family → pre-filled in the form, never typed twice
  const trialStudent = students.find((x) => x.id === lead?.trialStudentId)
  const family = families.find((f) => f.id === trialStudent?.familyId)
    ?? families.find((f) => f.id === conversations.find((c) => c.id === conversationId)?.familyId)
    ?? (lead?.lineUserId ? families.find((f) => f.lineUserId === lead.lineUserId) : undefined)
  const knownStudents = family ? students.filter((x) => x.familyId === family.id && !x.archived) : trialStudent ? [trialStudent] : []

  const [step, setStep] = useState<"type" | "offers" | "confirm">(initialType ? "offers" : "type")
  const [type, setType] = useState<FormType>(initialType ?? "test")
  const tappedClass = classes.find((c) => c.id === initialClassId)
  const tappedCourse = courses.find((c) => c.id === (initialCourseId || tappedClass?.courseId) && c.branchId === branchId && c.active)
  const startCourses = (initialCourseIds?.length ? initialCourseIds.map((id) => courses.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c && c.branchId === branchId && c.active) : tappedCourse ? [tappedCourse] : [])
  const [subjects, setSubjects] = useState<string[]>(initialCourseIds?.length && startCourses.length ? [...new Set(startCourses.flatMap((c) => c.subjects))].filter((x) => branch.subjects.includes(x)) : initialSubjects?.filter((x) => branch.subjects.includes(x)).length ? initialSubjects.filter((x) => branch.subjects.includes(x)) : lead?.subject && branch.subjects.includes(lead.subject) ? [lead.subject] : branch.subjects.slice(0, 1))
  const [visit, setVisit] = useState<"same" | "separate">("same")
  // owner 2026-11-19: pick by Course or by Subject — Liclass opens on Course, NockAcademy on Subject, switchable any time.
  // A course is just its subjects here (the times offered still come from each subject); its classes are shown so the admin sees what it leads to
  const [by, setBy] = useState<"course" | "subject">(startCourses.length || branch.brand === "liclass" ? "course" : "subject")
  const [courseIds, setCourseIds] = useState<string[]>(startCourses.map((c) => c.id))
  const [from, setFrom] = useState(toDateStr(now))
  const [to, setTo] = useState(addDays(toDateStr(now), 14))
  // picks: one visit → keys "date start" of combined slots · per subject → slot ids per subject
  const [visitPicks, setVisitPicks] = useState<Set<string>>(new Set())
  const [subjectPicks, setSubjectPicks] = useState<Record<string, Set<string>>>({})
  const [sending, setSending] = useState(false)
  // owner 2026-11-19: who takes each offered time — the admin can change it from the list of picked times (key: subject|slot id)
  const [teacherPick, setTeacherPick] = useState<Record<string, ID>>({})
  const [childGrade, setChildGrade] = useState(initialKids?.[0]?.grade ?? "")
  const me = useStore((s) => s.userId)
  const saveLead = useStore((s) => s.saveLead)

  // owner 2026-11-20: one form for several children = they come together by default (one visit: one teacher, one room, every child in it); "แยก" is possible but not advised
  const kidCount = initialKids?.length ?? 1
  const sharedVisit = type === "test" && (subjects.length > 1 || kidCount > 1)
  const oneVisit = sharedVisit && visit === "same"
  // every subject's free times in the range (same engine as the calendar's conflict check)
  // owner 2026-11-20: a Trial is offered in REAL classes first — free times (opening a one-off class just for a trial) are optional and not recommended, so they start hidden
  const [showFree, setShowFree] = useState(false)
  const freeShown = type !== "trial" || showFree
  const offers: FormSubjectOffer[] = useMemo(() => subjects.map((subject) => {
    // "by course": only the picked courses' own classes are offered (owner 2026-11-20)
    const classIds = by === "course" ? classes.filter((k) => k.courseId && courseIds.includes(k.courseId)).map((k) => k.id) : undefined
    const all = findOfferSlots({ branch, staff, sessions, classes, holidays, subject, from, to, now, courses, classIds })
    return { subject, slots: freeShown ? all : all.filter((x) => x.source === "class") }
  }), [subjects, branch, staff, sessions, classes, holidays, from, to, now, courses, freeShown, by, courseIds])
  // one visit = ONE teacher for every subject (owner 2026-11-20): only times when a single free teacher teaches them all are offered
  const combined = useMemo(() => (oneVisit ? commonSlots(visitOffers(offers, subjects), subjects).filter((c) => visitTeachersAt(staff, sessions, branchId, subjects, c.date, c.start, c.minutes).length > 0) : []), [oneVisit, offers, subjects, staff, sessions, branchId])
  // owner 2026-11-20: the courses this family tapped "interested" on in the catalog — marked (and first) in the course picker
  const chatMessages = useStore((s) => s.messages)
  const interestedIds = useMemo(() => catalogInterests(chatMessages.filter((m) => m.conversationId === conversationId), { classes, courses }).map((i) => i.courseId).filter((x): x is string => !!x), [chatMessages, conversationId, classes, courses])
  const [visitTeacher, setVisitTeacher] = useState<Record<string, ID>>({})

  // owner 2026-11-19: courses are picked in the same modal as an invoice (many at once). NockAcademy sells subjects, so a bundle can be tested in part —
  // each subject of a picked course can be switched off. Liclass runs ONE class for all of a course's subjects, so a course is tested as a whole.
  const [pickingCourses, setPickingCourses] = useState(false)
  const [skipped, setSkipped] = useState<string[]>([])
  const wholeCourse = branch.brand === "liclass"
  const applyCourses = (ids: string[], skips: string[]) => {
    setCourseIds(ids)
    setSkipped(skips)
    setSubjects([...new Set(ids.flatMap((cid) => (courses.find((c) => c.id === cid)?.subjects ?? []).filter((sj) => wholeCourse || !skips.includes(`${cid}|${sj}`))))].filter((x) => branch.subjects.includes(x)))
  }
  const addCourses = (picked: { id: string }[]) => applyCourses([...new Set([...courseIds, ...picked.map((c) => c.id)])], skipped)
  const removeCourse = (id: string) => applyCourses(courseIds.filter((x) => x !== id), skipped.filter((k) => !k.startsWith(`${id}|`)))
  const toggleCourseSubject = (id: string, sj: string) => {
    const key = `${id}|${sj}`
    const next = skipped.includes(key) ? skipped.filter((k) => k !== key) : [...skipped, key]
    // never switch off the last subject of a course — remove the course instead
    const left = (courses.find((c) => c.id === id)?.subjects ?? []).filter((x) => !next.includes(`${id}|${x}`))
    if (!left.length) return
    applyCourses(courseIds, next)
  }
  const toggleSubject = (s: string) => setSubjects((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]))
  // the class the parent tapped: its next time is offered already until the admin touches the list (one subject — a 2-subject course is combined into visits, left to the admin)
  const tappedSlot = initialClassId && subjects.length === 1 ? offers[0]?.slots.find((x) => x.classId === initialClassId)?.id : undefined
  const picksOf = (subject: string): Set<string> => subjectPicks[subject] ?? new Set(tappedSlot && subject === subjects[0] ? [tappedSlot] : [])
  const togglePick = (subject: string, id: string) => setSubjectPicks((p) => { const n = new Set(p[subject] ?? picksOf(subject)); if (n.has(id)) n.delete(id); else n.add(id); return { ...p, [subject]: n } })
  const toggleVisit = (key: string) => setVisitPicks((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })

  // what goes out: per subject, the offered slots (one visit → each subject gets its part of every picked visit)
  const withTeacher = (subject: string, x: FormOfferSlot): FormOfferSlot => (teacherPick[`${subject}|${x.id}`] ? { ...x, teacherId: teacherPick[`${subject}|${x.id}`] } : x)
  /** the single teacher of a picked visit: the admin's choice (if still free for all) else the first free one */
  const commonOf = (c: { date: string; start: string; minutes: number }) => visitTeachersAt(staff, sessions, branchId, subjects, c.date, c.start, c.minutes)
  const visitTeacherOf = (c: { date: string; start: string; minutes: number }): ID | null => {
    const list = commonOf(c)
    const want = visitTeacher[`${c.date} ${c.start}`]
    return (list.find((t) => t.id === want) ?? list[0])?.id ?? null
  }
  const chosen: FormSubjectOffer[] = (oneVisit
    ? subjects.map((s) => ({ subject: s, slots: combined.filter((c) => visitPicks.has(`${c.date} ${c.start}`)).map((c) => ({ ...c.bySubject[s], teacherId: visitTeacherOf(c) })) }))
    : offers.map((o) => ({ subject: o.subject, slots: o.slots.filter((x) => picksOf(o.subject).has(x.id)) }))
  ).map((o) => ({ ...o, slots: o.slots.map((x) => withTeacher(o.subject, x)) }))
  /** teachers free for a time (a 2-hour stretch when the subjects come in one visit) */
  const freeAt = (subject: string, date: string, start: string, minutes: number) => freeTeachersAt(staff, sessions, branchId, subject, date, start, oneVisit ? COMBINED_MINUTES : minutes)
  const freeCount = (subject: string, date: string, start: string, minutes: number) => freeAt(subject, date, start, minutes).length
  const pickedRows = chosen.flatMap((o) => o.slots.map((x) => ({ subject: o.subject, slot: x }))).sort((a, b) => (a.slot.date + a.slot.start).localeCompare(b.slot.date + b.slot.start))
  const pickedVisits = combined.filter((c) => visitPicks.has(`${c.date} ${c.start}`))
  const pickedCount = chosen.reduce((a, o) => a + o.slots.length, 0)
  // owner 2026-11-20: "by course" with no course picked offers NO times — the times follow the picked courses, never a leftover subject from the catalog tap / lead
  const repeatList = type === "trial" ? repeatTrials(assessments, sessions, { leadId, studentId: lead?.trialStudentId }, subjects) : []
  const noCourse = by === "course" && courseIds.length === 0
  const offersReady = !noCourse && subjects.length > 0 && chosen.every((o) => o.slots.length > 0) && (lead ? !!(lead.childGrade || knownStudents.length || childGrade) : !!childGrade)
  const missing = oneVisit ? (visitPicks.size ? [] : [subjects.join(" + ")]) : chosen.filter((o) => !o.slots.length).map((o) => o.subject)

  const send = async () => {
    setSending(true)
    try {
      let useLead = lead
      // a lead added from the chat has only a name + LINE — the grade the admin picks here goes onto it (owner 2026-11-18)
      if (lead && !lead.childGrade && childGrade) {
        const saved = saveLead({ ...lead, childGrade, subject: lead.subject || subjects[0] }, { quick: true })
        if (!saved.ok) return report(saved, "")
        useLead = saved.value
      }
      if (!useLead && family) {
        const made = saveLead(siblingLead(family, { id: uid("ld"), branchId, childGrade, subject: subjects[0], by: me, now: now.toISOString() }))
        if (!made.ok) return report(made, "")
        useLead = made.value
      }
      if (!useLead) {
        // owner 2026-11-18: a Visitor (no Lead, no family) can be sent the form too — only the id is minted here; the Lead is made from
        // the answers when the form comes back (approve → "อนุมัติ / สร้าง Lead", or decline → "เก็บเป็น Lead ไว้ไหม?")
        const conv = conversations.find((c) => c.id === conversationId)
        useLead = {
          id: uid("ld"), branchId, name: conv?.name ?? "", childGrade, subject: subjects[0], subjects, source: conv ? SOURCE_OF_CHANNEL[conv.channel] : "line", stage: "new",
          assigneeId: conv?.assigneeId ?? null, phone: "", lineId: "", createdAt: now.toISOString(), notes: [], convertedStudentId: null, ...(lineUserId ? { lineUserId } : {}),
        }
      }
      const r = await sendTestTrialForm({
        leadId: useLead.id, branchId, conversationId, lineUserId, type,
        offers: chosen,
        visit: type === "test" && (oneVisit || subjects.length === 1) ? "same" : "separate",
        grades: branch.grades,
        branchName: branch.name, brand: branch.brand, lang,
        subjectNames: Object.fromEntries(subjects.map((s) => [s, subjectNames?.[s] ?? {}])),
        prefill: (() => {
          const base = buildFormPrefill({ lead: useLead, family, students: knownStudents, assessments })
          if (!initialKids?.length) return base
          // this form is for these children: one already on file keeps their record, a new one opens with the name + grade staff wrote down
          const students = initialKids.map((k) => {
            const key = k.name.trim().toLowerCase()
            const known = key ? knownStudents.find((x) => x.name.trim().toLowerCase() === key || x.nickname.trim().toLowerCase() === key) : undefined
            return known ? base.students.find((x) => x.name === known.name) ?? { name: known.name, nickname: known.nickname, grade: known.grade } : { name: k.name, nickname: "", grade: k.grade, interests: k.subjects ?? subjects }
          })
          return { ...base, childGrade: initialKids[0].grade || base.childGrade, students }
        })(),
      })
      if (report(r, `ส่งฟอร์ม${FORM_TYPE_LABEL[type]}ทาง LINE แล้ว`)) onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <>
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 lg:max-w-2xl">
        <DialogHeader className="border-b px-5 pb-3 pt-5">
          <DialogTitle>ส่งฟอร์ม{step !== "type" ? FORM_TYPE_LABEL[type] : ""}</DialogTitle>
          <DialogDescription>
            {step === "type" && "เลือกประเภทฟอร์มที่จะส่งให้ผู้ปกครอง"}
            {step === "offers" && (type === "test" ? "เลือกวิชาที่จะสอบ แล้วเลือกเวลาที่จะเสนอให้ผู้ปกครองเลือก" : "เลือกวิชาที่จะทดลอง แล้วเลือกเวลาของแต่ละวิชา")}
            {step === "confirm" && "ตรวจสอบก่อนส่งจริง"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
          {step === "type" && (
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => (
                <Button variant="ghost" size="inline" key={t} type="button" onClick={() => setType(t)} className={cn("rounded-2xl border p-4 text-left transition-colors", type === t ? "border-foreground/40 bg-muted" : "hover:bg-muted")}>
                  <p className="font-medium">{FORM_TYPE_LABEL[t]}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t === "test" ? "สอบวัดระดับ — หลายวิชามาวันเดียวได้" : "ทดลองเรียนในคลาสจริง — เวลาแยกตามวิชา"}</p>
                </Button>
              ))}
            </div>
          )}

          {step === "offers" && (
            <>
              {!leadId && (
                <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/60 p-3">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    {family ? (<>
                      <p className="text-sm font-medium">ลูกค้าเดิม — นักเรียนคนใหม่ของครอบครัว</p>
                      <p className="text-xs text-muted-foreground">{familyDisplay(family.name)} · สร้าง Lead ให้นักเรียนคนนี้ตอนส่ง · อนุมัติแล้วเข้าครอบครัวเดิม</p>
                    </>) : (<>
                      <p className="text-sm font-medium">ยังไม่มี Lead — ส่งฟอร์มได้เลย</p>
                      <p className="text-xs text-muted-foreground">ผู้ปกครองกรอกกลับมาแล้ว ระบบสร้าง Lead จากข้อมูลในฟอร์มให้ตอนอนุมัติ</p>
                    </>)}
                  </div>
                  <NativeSelect className="h-9 w-36 bg-background" value={childGrade} onChange={(e) => setChildGrade(e.target.value)} placeholder="ชั้นของนักเรียน *" options={branch.grades.map((g) => ({ value: g, label: g }))} />
                </section>
              )}

              {lead && !lead.childGrade && !knownStudents.length && (
                <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/60 p-3">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  <p className="min-w-0 flex-1 text-sm font-medium">ชั้นของนักเรียน — ผู้ปกครองเห็นเลือกไว้ให้แล้ว</p>
                  <NativeSelect className="h-9 w-36 bg-background" value={childGrade} onChange={(e) => setChildGrade(e.target.value)} placeholder="ชั้นของนักเรียน *" options={branch.grades.map((g) => ({ value: g, label: g }))} />
                </section>
              )}

              {/* owner 2026-11-19: the way of picking is the very first thing */}
              <Segmented value={by} onChange={setBy} options={[{ value: "course", label: "ตามคอร์ส" }, { value: "subject", label: "ตามวิชา" }]} label="เลือกตาม" />
              <section className="space-y-1.5">
                <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
                  <StepTitle n={1} title={by === "course" ? "คอร์ส" : "วิชา"} hint={by === "course" ? "เลือกได้หลายคอร์ส" : "เลือกได้หลายวิชา"} />
                  {by === "course" && <Button variant="outline" size="sm" type="button" onClick={() => setPickingCourses(true)}><PlusIcon /> {courseIds.length ? "เพิ่มคอร์ส" : "เลือกคอร์ส"}</Button>}
                </div>
                {by === "course" && (
                  <div className="space-y-1.5">
                    {courseIds.map((id) => {
                      const c = courses.find((x) => x.id === id)
                      if (!c) return null
                      const cls = classes.filter((k) => k.courseId === c.id && k.active)
                      return (
                        <div key={id} className="rounded-2xl border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                            {(wholeCourse || c.subjects.length < 2) && <span className="shrink-0 text-xs text-muted-foreground">{c.subjects.join(" + ")}</span>}
                            <Button variant="ghost" size="icon-sm" type="button" aria-label="เอาคอร์สนี้ออก" onClick={() => removeCourse(id)}><XIcon /></Button>
                          </div>
                          {!wholeCourse && c.subjects.length > 1 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">สอบวิชา</span>
                              {c.subjects.map((sj) => {
                                const on = !skipped.includes(`${id}|${sj}`)
                                return (
                                  <Button key={sj} variant="ghost" size="inline" type="button" aria-pressed={on} onClick={() => toggleCourseSubject(id, sj)}
                                    className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors", on ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted")}>
                                    {on ? <CheckIcon className="size-3.5" /> : <span className="size-2 rounded-full" style={{ background: subjectHex(sj) }} />}{sj}
                                  </Button>
                                )
                              })}
                            </div>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {cls.length ? cls.map((k) => <span key={k.id} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{k.name}{` · ${TH_DAYS_FULL[k.weekday]} ${k.start}`}</span>) : <span className="text-xs text-muted-foreground">ยังไม่มีคลาสของคอร์สนี้</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {by === "subject" && <div className="flex flex-wrap gap-2">
                  {branch.subjects.map((s) => {
                    const on = subjects.includes(s)
                    return (
                      <Button variant="ghost" size="inline" key={s} type="button" onClick={() => toggleSubject(s)}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted")}>
                        {on ? <CheckIcon className="size-3.5" /> : <span className="size-2 rounded-full" style={{ background: subjectHex(s) }} />}{s}
                      </Button>
                    )
                  })}
                </div>}
              </section>

              {sharedVisit && !noCourse && (
                <section className="space-y-1.5">
                  <StepTitle n={2} title={kidCount > 1 ? "ลูกมาสอบเวลาเดียวกันไหม" : "มาสอบวันเดียวกันไหม"} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <VisitCard on={visit === "same"} onClick={() => setVisit("same")} icon={CalendarClockIcon} title={kidCount > 1 ? "มาพร้อมกัน (แนะนำ)" : "มาวันเดียว"} sub={kidCount > 1 ? tx("ลูก {0} คนสอบพร้อมกัน ครูคนเดียว ห้องเดียว — เลือกเวลาครั้งเดียว", [kidCount]) : `สอบ ${subjects.length} วิชาต่อกัน 2 ชม. — เลือกเวลาครั้งเดียว`} />
                    <VisitCard on={visit === "separate"} onClick={() => setVisit("separate")} icon={CalendarRangeIcon} title={kidCount > 1 ? "แยกเวลา (ไม่แนะนำ)" : "แยกวัน"} sub={kidCount > 1 ? "ผู้ปกครองเลือกเวลาของลูกแต่ละคนเอง" : "เลือกเวลาของแต่ละวิชาเอง"} />
                  </div>
                </section>
              )}

              {/* owner 2026-11-20: one Trial per subject — warn before sending; a repeat needs a reason when approving */}
              {type === "trial" && repeatList.length > 0 && (
                <p className="flex items-start gap-1.5 rounded-xl border border-warning/40 bg-warning-soft/60 px-3 py-2 text-xs text-warning-ink">
                  <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>{tx("Lead นี้เคย Trial วิชา {0} ไปแล้ว — ถ้าจะให้ Trial อีกครั้ง ต้องใส่เหตุผลตอนอนุมัติ", [repeatList.map((r) => r.subject).join(", ")])}</span>
                </p>
              )}

              <section className="space-y-2">
                <div className="flex min-h-9 flex-wrap items-center gap-3">
                  <StepTitle n={sharedVisit ? 3 : 2} title="เวลาที่จะเสนอ" hint="ผู้ปกครองจะเลือก 1 เวลาจากที่เสนอ" />
                  <DateRangePicker className="ml-auto border-border bg-input/50 hover:bg-input/70" plain from={from} to={to} min={toDateStr(now)} onChange={(r) => { setFrom(r.from); setTo(r.to) }} />
                </div>
                {!noCourse && pickedRows.length > 0 && (
                  <div className="rounded-2xl border">
                    <p className="border-b px-3 py-1.5 text-xs font-medium text-muted-foreground">{oneVisit ? tx("เวลาที่เลือก ({0}) · {1} · ครูคนเดียวทุกวิชา", [pickedVisits.length, subjects.join(" + ")]) : `เวลาที่เลือก (${pickedRows.length}) · เลือกครูที่จะรับผิดชอบ`}</p>
                    <ul className="divide-y">
                      {/* owner 2026-11-20: subjects taken in one visit have ONE teacher — one row per visit, the teachers who are free and teach every subject */}
                      {oneVisit && pickedVisits.map((c) => {
                        const key = `${c.date} ${c.start}`
                        return (
                          <li key={key} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                            <span className="tabular-nums">{fmtDate(c.date, { weekday: true })} {c.start}–{fromMinutes(toMinutes(c.start) + c.minutes)}</span>
                            {/* the subjects are in the header above — a row is just time + teacher; one possible teacher = plain text, no dropdown */}
                            {commonOf(c).length > 1
                              ? <NativeSelect className="ml-auto h-8 w-32 shrink-0" aria-label="ครูที่รับผิดชอบ" value={visitTeacherOf(c) ?? ""} onChange={(e) => setVisitTeacher((p) => ({ ...p, [key]: e.target.value }))} options={commonOf(c).map((t) => ({ value: t.id, label: t.nickname }))} />
                              : <span className="ml-auto text-muted-foreground">{commonOf(c)[0]?.nickname ?? "—"}</span>}
                            <Button variant="ghost" size="icon-sm" type="button" aria-label="เอาเวลานี้ออก" onClick={() => toggleVisit(key)}><XIcon /></Button>
                          </li>
                        )
                      })}
                      {!oneVisit && pickedRows.map(({ subject, slot }) => {
                        const free = freeAt(subject, slot.date, slot.start, slot.minutes)
                        const teacher = staff.find((t) => t.id === slot.teacherId)
                        const ids = new Set(free.map((t) => t.id))
                        const options = [...(teacher && !ids.has(teacher.id) ? [teacher] : []), ...free].map((t) => ({ value: t.id, label: t.nickname }))
                        return (
                          <li key={`${subject}|${slot.id}`} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                            <span className="size-2 shrink-0 rounded-full" style={{ background: subjectHex(subject) }} />
                            <span className="w-20 shrink-0 truncate">{subject}</span>
                            <span className="tabular-nums">{fmtDate(slot.date, { weekday: true })} {slot.start}–{fromMinutes(toMinutes(slot.start) + (oneVisit ? COMBINED_MINUTES : slot.minutes))}</span>
                            {slot.source === "class"
                              ? <span className="ml-auto truncate text-xs text-muted-foreground">{teacher?.nickname ?? "ยังไม่ระบุครู"} · {classLabel(slot)}</span>
                              : <NativeSelect className="ml-auto h-8 w-36" aria-label="ครูที่รับผิดชอบ" value={slot.teacherId ?? ""} onChange={(e) => setTeacherPick((p) => ({ ...p, [`${subject}|${slot.id}`]: e.target.value }))} options={options} />}
                            <Button variant="ghost" size="icon-sm" type="button" aria-label="เอาเวลานี้ออก" onClick={() => (oneVisit ? toggleVisit(`${slot.date} ${slot.start}`) : togglePick(subject, slot.id))}><XIcon /></Button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
                {!noCourse && <Legend freeOn={type === "trial" ? showFree : undefined} onToggleFree={type === "trial" ? () => setShowFree(!showFree) : undefined} />}
                {noCourse ? <Empty>เลือกคอร์สก่อน แล้วจะแสดงเวลาที่เสนอได้</Empty>
                  : !subjects.length ? <Empty>เลือกวิชาก่อน</Empty>
                  : oneVisit ? (
                    <SlotDays
                      title={kidCount > 1 ? tx("{0} · ลูก {1} คนมาพร้อมกัน", [subjects.join(" + "), kidCount]) : `${subjects.join(" + ")} · มาวันเดียว 2 ชม.`}
                      items={combined.map((c) => ({ key: `${c.date} ${c.start}`, date: c.date, start: c.start, end: fromMinutes(toMinutes(c.start) + c.minutes), kind: "free" as const, free: commonOf(c).length }))}
                      picked={visitPicks} onToggle={toggleVisit}
                      empty="ไม่มีเวลาที่ทุกวิชาว่างพร้อมกันในช่วงนี้ — ลองขยายวันที่ หรือเลือก “แยกวัน”" />
                  ) : offers.map((o) => (
                    <SlotDays key={o.subject} title={o.subject} color={subjectHex(o.subject)}
                      items={o.slots.map((x) => ({ key: x.id, date: x.date, start: x.start, end: fromMinutes(toMinutes(x.start) + x.minutes), kind: x.source === "class" ? "class" as const : "free" as const, label: x.source === "class" ? classLabel(x) : undefined, free: x.source === "class" ? undefined : freeCount(o.subject, x.date, x.start, x.minutes) }))}
                      picked={picksOf(o.subject)} onToggle={(k) => togglePick(o.subject, k)}
                      empty={freeShown ? "ไม่มีเวลาว่างในช่วงนี้ — ลองขยายวันที่" : "ไม่มีคลาสที่เปิดอยู่ในช่วงนี้ — ลองขยายวันที่ หรือกด “+ เวลาว่าง” เพื่อเปิดคาบพิเศษ"} />
                  ))}
              </section>
            </>
          )}

          {step === "confirm" && (
            <div className="space-y-2 text-sm">
              {!lineUserId && <p className="rounded-xl bg-danger-soft/60 p-3 text-danger">ยังไม่ได้ผูก LINE — ผูกได้จากหน้า Inbox ก่อนถึงจะส่งฟอร์มได้</p>}
              {oneVisit && <p className="text-muted-foreground">{kidCount > 1 ? tx("ลูก {0} คนมาพร้อมกัน: สอบ {1}", [kidCount, subjects.join(" + ")]) : `มาวันเดียว: สอบ ${subjects.join(" + ")} ต่อกัน 2 ชม.`}</p>}
              {(oneVisit ? [{ subject: subjects.join(" + "), slots: chosen[0]?.slots ?? [] }] : chosen).map((o) => (
                <div key={o.subject} className="rounded-2xl border p-3">
                  <p className="font-medium">{o.subject}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">{o.slots.map((s) => <span key={s.id} className="rounded-full bg-muted px-2.5 py-1 text-xs">{fmtDate(s.date, { weekday: true })} {s.start}</span>)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="items-center border-t px-6 py-4">
          {step === "offers" && (
            <p className={cn("mr-auto text-xs", missing.length ? "text-warning" : "text-muted-foreground")}>
              {noCourse ? "ยังไม่ได้เลือกคอร์ส" : !subjects.length ? "ยังไม่ได้เลือกวิชา" : missing.length ? `ยังไม่ได้เลือกเวลา: ${missing.join(", ")}` : `เสนอ ${oneVisit ? visitPicks.size : pickedCount} เวลา`}
            </p>
          )}
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          {step === "type" && <Button onClick={() => setStep("offers")}>ถัดไป</Button>}
          {step === "offers" && (
            <>
              {!initialType && <Button variant="outline" onClick={() => setStep("type")}><ChevronLeftIcon /> ย้อนกลับ</Button>}
              <Button disabled={!offersReady} onClick={() => setStep("confirm")}>ถัดไป</Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("offers")}><ChevronLeftIcon /> ย้อนกลับ</Button>
              <Button disabled={!lineUserId || sending} onClick={send}><SendIcon /> ส่ง</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {pickingCourses && (
        <CoursePicker branch={branch} today={toDateStr(now)} studentGrade={lead?.childGrade || childGrade || undefined} onInvoice={courseIds} interestedIds={interestedIds} forForm
          onClose={() => setPickingCourses(false)} onConfirm={(picked) => { addCourses(picked); setPickingCourses(false) }} />
    )}
    </>
  )

  function classLabel(x: FormOfferSlot) {
    const k = classes.find((c) => c.id === x.classId)
    return `${k?.name ?? "คลาสเดิม"} · ${staff.find((t) => t.id === x.teacherId)?.nickname ?? "ยังไม่มีครู"}`
  }
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="grid size-5 place-items-center self-center rounded-full bg-muted text-2xs font-semibold">{n}</span>
      <p className="font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function VisitCard({ on, onClick, icon: Icon, title, sub }: { on: boolean; onClick: () => void; icon: typeof CalendarClockIcon; title: string; sub: string }) {
  return (
    <Button variant="ghost" size="inline" type="button" onClick={onClick} className={cn("flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors", on ? "border-foreground/40 bg-muted" : "hover:bg-muted")}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", on ? "text-foreground" : "text-muted-foreground")} />
      <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{sub}</span></span>
    </Button>
  )
}

/** Test: just the colour key. Trial (`onToggleFree`): the free-time chip is a switch — off by default, a one-off class for a trial is not recommended (owner 2026-11-20) */
function Legend({ freeOn, onToggleFree }: { freeOn?: boolean; onToggleFree?: () => void }) {
  const chip = "inline-flex items-center gap-1.5 rounded-full border border-border bg-input/50 px-2.5 py-1"
  return (
    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
      {onToggleFree
        ? <Button variant="ghost" size="inline" type="button" aria-pressed={freeOn} onClick={onToggleFree} title="ไม่แนะนำ — เปิดคาบพิเศษสำหรับ Trial" className={cn(chip, "hover:bg-input/70", freeOn && "border-foreground")}><span className="size-3 rounded border border-border bg-background" />{freeOn ? "แสดงเวลาว่าง (เปิดคาบพิเศษ)" : "+ เวลาว่าง (เปิดคาบพิเศษ — ไม่แนะนำ)"}</Button>
        : <span className={chip}><span className="size-3 rounded border border-border bg-background" />ว่าง — เปิดคาบใหม่</span>}
      <span className={chip}><span className="size-3 rounded border border-special/40 bg-special-soft/50" />เข้าคลาสที่มีอยู่</span>
    </div>
  )
}

/** a subject's (or the one-visit) offerable times — one row per day, time buttons in a tidy grid */
/** day rows of same-size time buttons — also the Inbox Calendar Preview's list (`tall`: no height cap, the panel scrolls) */
export function SlotDays({ title, color, items, picked, onToggle, empty, tall }: {
  title: string; color?: string; tall?: boolean
  items: { key: string; date: string; start: string; end: string; kind: "free" | "class"; label?: string; /** teachers free then (owner 2026-11-19) */ free?: number }[]
  picked: Set<string>; onToggle: (key: string) => void; empty: string
}) {
  const days = useMemo(() => {
    const m = new Map<string, typeof items>()
    for (const it of [...items].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))) m.set(it.date, [...(m.get(it.date) ?? []), it])
    return [...m.entries()]
  }, [items])
  const count = items.filter((x) => picked.has(x.key)).length
  return (
    <div className="rounded-2xl border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {color && <span className="size-2.5 rounded-full" style={{ background: color }} />}
        <p className="text-sm font-medium">{title}</p>
        <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs", count ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>เลือกแล้ว {count}</span>
      </div>
      {!items.length ? <p className="p-4 text-center text-xs text-muted-foreground">{empty}</p> : (
        <div className={cn("divide-y", !tall && "max-h-72 overflow-y-auto")}>
          {days.map(([date, list]) => (
            <div key={date} className={cn("grid gap-3 px-3 py-2.5", tall ? "gap-1.5" : "grid-cols-[6.5rem_1fr]")}>
              <p className={cn("text-xs font-medium text-muted-foreground", !tall && "pt-1.5")}>{fmtDate(date, { weekday: true })}</p>
              {/* owner 2026-10-22: every time button the same size — a class's name sits on its second line (cut short, full on hover) */}
              <div className={cn("grid gap-1.5", tall ? "grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))]")}>
                {list.map((it) => {
                  const on = picked.has(it.key)
                  return (
                    <Button variant="ghost" size="inline" key={it.key} type="button" onClick={() => onToggle(it.key)} title={it.label}
                      className={cn("relative flex h-11 flex-col justify-center rounded-xl border px-2.5 text-left text-xs tabular-nums transition-colors",
                        on ? "border-foreground bg-foreground text-background" : it.kind === "class" ? "border-special/40 bg-special-soft/40 hover:bg-special-soft/60" : "border-border bg-background hover:bg-muted")}>
                      <span className="block font-medium">{it.start}–{it.end}</span>
                      {it.label ? <span className={cn("block truncate text-2xs", on ? "text-background/75" : "text-special-ink")}>{it.label}</span> : <span className={cn("block text-2xs", on ? "text-background/75" : "text-muted-foreground")}>{it.free === undefined ? "ว่าง" : `ว่าง ${it.free} ครู`}</span>}
                      {on && <CheckIcon className="absolute right-1.5 top-1.5 size-3" />}
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
