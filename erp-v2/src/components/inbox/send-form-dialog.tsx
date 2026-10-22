"use client"

import { useMemo, useState } from "react"
import { CalendarClockIcon, CalendarRangeIcon, CheckIcon, ChevronLeftIcon, SendIcon, UsersIcon } from "lucide-react"
import { addDays, fmtDate, fromMinutes, toDateStr, toMinutes } from "@/domain/dates"
import { siblingLead } from "@/domain/rules/crm"
import { buildFormPrefill, commonSlots, findOfferSlots, FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormOfferSlot, FormSubjectOffer, FormType, ID } from "@/domain/types"
import { sendTestTrialForm } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { NativeSelect } from "@/components/app/native-select"
import { DateRangePicker } from "@/components/app/date-range-picker"
import { subjectHex } from "@/components/app/subject-color"
import { uid } from "@/data/seed"

const TYPES: FormType[] = ["test", "trial"]

/**
 * Send a Test / Trial form (owner 2026-10-22 redesign): pick the subjects, then the times to offer.
 * Test with 2+ subjects asks first: one visit (one 2-hour slot where every subject is free — picked once from one
 * list) or separate days (times per subject). Trial always offers times per subject (a trial is a real class of that
 * subject — they can't be merged). The slots come from the same engine as everywhere (free hours with a free teacher
 * and room, or a real class with a seat).
 */
export function SendFormDialog({
  leadId, branchId, conversationId, lineUserId, onClose, initialType,
}: {
  /** null = a family that is already a customer (owner 2026-10-19: e.g. a second child) — a lead is made for the child on send */
  leadId: ID | null; branchId: ID; conversationId: ID; lineUserId: string; onClose: () => void
  /** picked already (Inbox "+" menu → Test / Trial) — skips the type step */
  initialType?: FormType
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
  const [subjects, setSubjects] = useState<string[]>(lead?.subject && branch.subjects.includes(lead.subject) ? [lead.subject] : branch.subjects.slice(0, 1))
  const [visit, setVisit] = useState<"same" | "separate">("same")
  const [from, setFrom] = useState(toDateStr(now))
  const [to, setTo] = useState(addDays(toDateStr(now), 14))
  // picks: one visit → keys "date start" of combined slots · per subject → slot ids per subject
  const [visitPicks, setVisitPicks] = useState<Set<string>>(new Set())
  const [subjectPicks, setSubjectPicks] = useState<Record<string, Set<string>>>({})
  const [sending, setSending] = useState(false)
  const [childGrade, setChildGrade] = useState("")
  const me = useStore((s) => s.userId)
  const saveLead = useStore((s) => s.saveLead)

  const oneVisit = type === "test" && subjects.length > 1 && visit === "same"
  // every subject's free times in the range (same engine as the calendar's conflict check)
  const offers: FormSubjectOffer[] = useMemo(() => subjects.map((subject) => ({
    subject, slots: findOfferSlots({ branch, staff, sessions, classes, holidays, subject, from, to, now, courses }),
  })), [subjects, branch, staff, sessions, classes, holidays, from, to, now, courses])
  const combined = useMemo(() => (oneVisit ? commonSlots(offers, subjects) : []), [oneVisit, offers, subjects])

  const toggleSubject = (s: string) => setSubjects((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]))
  const togglePick = (subject: string, id: string) => setSubjectPicks((p) => { const n = new Set(p[subject] ?? []); if (n.has(id)) n.delete(id); else n.add(id); return { ...p, [subject]: n } })
  const toggleVisit = (key: string) => setVisitPicks((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })

  // what goes out: per subject, the offered slots (one visit → each subject gets its part of every picked visit)
  const chosen: FormSubjectOffer[] = oneVisit
    ? subjects.map((s) => ({ subject: s, slots: combined.filter((c) => visitPicks.has(`${c.date} ${c.start}`)).map((c) => c.bySubject[s]) }))
    : offers.map((o) => ({ subject: o.subject, slots: o.slots.filter((x) => subjectPicks[o.subject]?.has(x.id)) }))
  const pickedCount = chosen.reduce((a, o) => a + o.slots.length, 0)
  const offersReady = subjects.length > 0 && chosen.every((o) => o.slots.length > 0) && (!!leadId || !!childGrade)
  const missing = oneVisit ? (visitPicks.size ? [] : [subjects.join(" + ")]) : chosen.filter((o) => !o.slots.length).map((o) => o.subject)

  const send = async () => {
    setSending(true)
    try {
      let useLead = lead
      if (!useLead) {
        if (!family) return report({ ok: false, error: "ผูกแชทนี้กับครอบครัวก่อน" }, "")
        const made = saveLead(siblingLead(family, { id: uid("ld"), branchId, childGrade, subject: subjects[0], by: me, now: now.toISOString() }))
        if (!made.ok) return report(made, "")
        useLead = made.value
      }
      const r = await sendTestTrialForm({
        leadId: useLead.id, branchId, conversationId, lineUserId, type,
        offers: chosen,
        visit: type === "test" && (oneVisit || subjects.length === 1) ? "same" : "separate",
        grades: branch.grades,
        branchName: branch.name, brand: branch.brand, lang,
        subjectNames: Object.fromEntries(subjects.map((s) => [s, subjectNames?.[s] ?? {}])),
        prefill: buildFormPrefill({ lead: useLead, family, students: knownStudents, assessments }),
      })
      if (report(r, `ส่งฟอร์ม${FORM_TYPE_LABEL[type]}ทาง LINE แล้ว`)) onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>ส่งฟอร์ม{step !== "type" ? FORM_TYPE_LABEL[type] : ""}</DialogTitle>
          <DialogDescription>
            {step === "type" && "เลือกประเภทฟอร์มที่จะส่งให้ผู้ปกครอง"}
            {step === "offers" && (type === "test" ? "เลือกวิชาที่จะสอบ แล้วเลือกเวลาที่จะเสนอให้ผู้ปกครองเลือก" : "เลือกวิชาที่จะทดลอง แล้วเลือกเวลาของแต่ละวิชา")}
            {step === "confirm" && "ตรวจสอบก่อนส่งจริง"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {step === "type" && (
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} className={cn("rounded-2xl border p-4 text-left transition-colors", type === t ? "border-foreground/40 bg-muted" : "hover:bg-muted")}>
                  <p className="font-medium">{FORM_TYPE_LABEL[t]}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t === "test" ? "สอบวัดระดับ — หลายวิชามาวันเดียวได้" : "ทดลองเรียนในคลาสจริง — เวลาแยกตามวิชา"}</p>
                </button>
              ))}
            </div>
          )}

          {step === "offers" && (
            <>
              {!leadId && (
                <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/60 p-3">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">ลูกค้าเดิม — นักเรียนคนใหม่ของครอบครัว</p>
                    <p className="text-xs text-muted-foreground">{family?.name} · สร้าง Lead ให้นักเรียนคนนี้ตอนส่ง · อนุมัติแล้วเข้าครอบครัวเดิม</p>
                  </div>
                  <NativeSelect className="h-9 w-36 bg-background" value={childGrade} onChange={(e) => setChildGrade(e.target.value)} placeholder="ชั้นของนักเรียน *" options={branch.grades.map((g) => ({ value: g, label: g }))} />
                </section>
              )}

              <section className="space-y-2">
                <StepTitle n={1} title="วิชา" hint="เลือกได้หลายวิชา" />
                <div className="flex flex-wrap gap-2">
                  {branch.subjects.map((s) => {
                    const on = subjects.includes(s)
                    return (
                      <button key={s} type="button" onClick={() => toggleSubject(s)}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted")}>
                        {on ? <CheckIcon className="size-3.5" /> : <span className="size-2 rounded-full" style={{ background: subjectHex(s) }} />}{s}
                      </button>
                    )
                  })}
                </div>
              </section>

              {type === "test" && subjects.length > 1 && (
                <section className="space-y-2">
                  <StepTitle n={2} title="มาสอบวันเดียวกันไหม" />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <VisitCard on={visit === "same"} onClick={() => setVisit("same")} icon={CalendarClockIcon} title="มาวันเดียว" sub={`สอบ ${subjects.length} วิชาต่อกัน 2 ชม. — เลือกเวลาครั้งเดียว`} />
                    <VisitCard on={visit === "separate"} onClick={() => setVisit("separate")} icon={CalendarRangeIcon} title="แยกวัน" sub="เลือกเวลาของแต่ละวิชาเอง" />
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <StepTitle n={type === "test" && subjects.length > 1 ? 3 : 2} title="เวลาที่จะเสนอ" hint="ผู้ปกครองจะเลือก 1 เวลาจากที่เสนอ" />
                  <DateRangePicker className="ml-auto" plain from={from} to={to} min={toDateStr(now)} onChange={(r) => { setFrom(r.from); setTo(r.to) }} />
                </div>
                <Legend />
                {!subjects.length ? <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">เลือกวิชาก่อน</p>
                  : oneVisit ? (
                    <SlotDays
                      title={`${subjects.join(" + ")} · มาวันเดียว 2 ชม.`}
                      items={combined.map((c) => ({ key: `${c.date} ${c.start}`, date: c.date, start: c.start, end: fromMinutes(toMinutes(c.start) + c.minutes), kind: "free" as const }))}
                      picked={visitPicks} onToggle={toggleVisit}
                      empty="ไม่มีเวลาที่ทุกวิชาว่างพร้อมกันในช่วงนี้ — ลองขยายวันที่ หรือเลือก “แยกวัน”" />
                  ) : offers.map((o) => (
                    <SlotDays key={o.subject} title={o.subject} color={subjectHex(o.subject)}
                      items={o.slots.map((x) => ({ key: x.id, date: x.date, start: x.start, end: fromMinutes(toMinutes(x.start) + x.minutes), kind: x.source === "class" ? "class" as const : "free" as const, label: x.source === "class" ? classLabel(x) : undefined }))}
                      picked={subjectPicks[o.subject] ?? new Set()} onToggle={(k) => togglePick(o.subject, k)}
                      empty="ไม่มีเวลาว่างในช่วงนี้ — ลองขยายวันที่" />
                  ))}
              </section>
            </>
          )}

          {step === "confirm" && (
            <div className="space-y-2 text-sm">
              {!lineUserId && <p className="rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/40">ยังไม่ได้ผูก LINE — ผูกได้จากหน้า Inbox ก่อนถึงจะส่งฟอร์มได้</p>}
              {oneVisit && <p className="text-muted-foreground">มาวันเดียว: สอบ {subjects.join(" + ")} ต่อกัน 2 ชม.</p>}
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
            <p className={cn("mr-auto text-xs", missing.length ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
              {!subjects.length ? "ยังไม่ได้เลือกวิชา" : missing.length ? `ยังไม่ได้เลือกเวลา: ${missing.join(", ")}` : `เสนอ ${oneVisit ? visitPicks.size : pickedCount} เวลา`}
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
  )

  function classLabel(x: FormOfferSlot) {
    const k = classes.find((c) => c.id === x.classId)
    return `${k?.name ?? "คลาสเดิม"} · ${staff.find((t) => t.id === x.teacherId)?.nickname ?? "ยังไม่มีครู"}`
  }
}

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="grid size-5 place-items-center self-center rounded-full bg-muted text-[11px] font-semibold">{n}</span>
      <p className="font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function VisitCard({ on, onClick, icon: Icon, title, sub }: { on: boolean; onClick: () => void; icon: typeof CalendarClockIcon; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors", on ? "border-foreground/40 bg-muted" : "hover:bg-muted")}>
      <Icon className={cn("mt-0.5 size-5 shrink-0", on ? "text-foreground" : "text-muted-foreground")} />
      <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{sub}</span></span>
    </button>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border bg-background" />ว่าง — เปิดคาบใหม่</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950" />เข้าคลาสที่มีอยู่</span>
    </div>
  )
}

/** a subject's (or the one-visit) offerable times — one row per day, time buttons in a tidy grid */
function SlotDays({ title, color, items, picked, onToggle, empty }: {
  title: string; color?: string
  items: { key: string; date: string; start: string; end: string; kind: "free" | "class"; label?: string }[]
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
        <div className="max-h-72 divide-y overflow-y-auto">
          {days.map(([date, list]) => (
            <div key={date} className="grid grid-cols-[6.5rem_1fr] gap-3 px-3 py-2.5">
              <p className="pt-1.5 text-xs font-medium text-muted-foreground">{fmtDate(date, { weekday: true })}</p>
              {/* owner 2026-10-22: every time button the same size — a class's name sits on its second line (cut short, full on hover) */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1.5">
                {list.map((it) => {
                  const on = picked.has(it.key)
                  return (
                    <button key={it.key} type="button" onClick={() => onToggle(it.key)} title={it.label}
                      className={cn("relative flex h-11 flex-col justify-center rounded-xl border px-2.5 text-left text-xs tabular-nums transition-colors",
                        on ? "border-foreground bg-foreground text-background" : it.kind === "class" ? "border-violet-200 bg-violet-50/60 hover:bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40" : "bg-background hover:bg-muted")}>
                      <span className="block font-medium">{it.start}–{it.end}</span>
                      {it.label ? <span className={cn("block truncate text-[10px]", on ? "text-background/75" : "text-violet-700 dark:text-violet-300")}>{it.label}</span> : <span className={cn("block text-[10px]", on ? "text-background/75" : "text-muted-foreground")}>ว่าง</span>}
                      {on && <CheckIcon className="absolute right-1.5 top-1.5 size-3" />}
                    </button>
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
