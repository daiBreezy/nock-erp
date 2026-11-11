"use client"

import { CustomerPicker } from "@/components/app/customer-picker"
import { COURSE_FORMAT_LABEL, packageLabel, priceUnitSuffix } from "@/domain/rules/course"
import { CoursePicker } from "./course-picker"
import { autoCredits } from "@/domain/rules/refunds"
import { PackageBadge } from "@/components/app/package-badge"
import { brandUsesBus, busRate } from "@/domain/rules/settings"
import { useState } from "react"
import { AlertTriangleIcon, BusIcon, CalendarIcon, CheckIcon, HistoryIcon, MapPinIcon, PlusIcon, UserRoundSearchIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormShell } from "@/components/app/form-shell"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addDays, fmtDate, fmtMoney, fmtMonth, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { busTotal, carriedMinutes, lastNoteFor, lastPaidInvoice, familyPromotion, invoiceHours, FAMILY_PROMO_TIERS, pendingBusAddOns, classChoices, classOptionsFor, defaultAdvance, isBackdated, defaultBusLegs, setAllBusLegs, usesNoBus, entryFeeWaiver, invoiceSessionDates, invoiceTotals, validateInvoiceDraft, type LineQuote } from "@/domain/rules/billing"
import { lastAssessmentDate } from "@/domain/rules/forms"
import type { Holiday, AdvanceItem, BusExtraLine, BusLeg, CourseLine, Entitlement, Family, Invoice, Klass, Leftover, Seat } from "@/domain/types"
import { isPartial } from "@/domain/rules/seats"
import { SeatHours } from "@/components/app/seat-hours"
import { CAPACITY, closesBranch } from "@/domain/rules/scheduling"
import { StartDatePicker } from "@/components/app/start-date-picker"
import { Segmented } from "@/components/app/page-layout"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { AI_TONE, AiIcon } from "@/components/app/ai"
import { useStore } from "@/store/store"
import { InfoTip } from "@/components/app/info-tip"
import { busZone, checkRide, distanceKm, rideTimes, type RoundCheck } from "@/domain/rules/bus"
import { BusMap } from "./bus-map"
import { Section } from "./section"

type LineDraft = { id: string; courseId: string; classIds: string[]; startDate: string; periodsText: string; overlapRemark: string; backdateRemark?: string; leftover?: Leftover; seats?: Record<string, Seat> }

export function InvoiceEditor({ invoice, defaultStudentId, renewEntitlementId, onClose, onSaved }: { invoice?: Invoice; defaultStudentId?: string; renewEntitlementId?: string; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const branch = useBranch()
  // NockAcademy has no bus service (owner 2026-11-05): no legs, no extra bus days, no Bus section
  const busOn = brandUsesBus(branch.brand)
  const now = useNow(60_000)
  const today = toDateStr(now)
  const me = useStore((s) => s.userId)
  const students = useStore((s) => s.students).filter((s) => s.branchId === branch.id)
  const families = useStore((s) => s.families)
  const courses = useStore((s) => s.courses).filter((c) => c.branchId === branch.id && (c.active || !!invoice?.lines.some((l) => l.courseId === c.id)))
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useEntitlements()
  const assessments = useStore((s) => s.assessments)
  const save = useStore((s) => s.saveInvoice)
  const duplicate = useStore((s) => s.duplicateInvoice)
  const leadToStudent = useStore((s) => s.convertLeadToStudent)
  const [picking, setPicking] = useState(false)
  const [pickingCourses, setPickingCourses] = useState(false)
  // Test → Trial → Invoice: the paid period starts after the last test/trial (owner 2026-09-28)
  const firstStart = (sid: string) => { const last = lastAssessmentDate(sid, assessments); return last && last >= today ? addDays(last, 1) : today }
  // renewal from a package (dashboard / student window): same course + class, from the day after it ends
  const renewFrom = renewEntitlementId ? entitlements.find((e) => e.id === renewEntitlementId) : undefined
  const renewStart = (e: Entitlement) => (addDays(e.to, 1) > today ? addDays(e.to, 1) : today)

  const [newId] = useState(() => invoice?.id ?? uid("inv"))
  const [studentId, setStudentId] = useState(invoice?.studentId ?? renewFrom?.studentId ?? defaultStudentId ?? "")
  const [lines, setLines] = useState<LineDraft[]>(() =>
    invoice ? invoice.lines.map((l) => ({ id: l.id, courseId: l.courseId, classIds: l.classIds, startDate: l.startDate, periodsText: String(l.periods), overlapRemark: l.overlapRemark ?? "", backdateRemark: l.backdateRemark, leftover: l.leftover, seats: l.seats }))
      : renewFrom ? [{ id: uid("ln"), courseId: renewFrom.courseId, classIds: renewFrom.classIds, startDate: renewStart(renewFrom), periodsText: "1", overlapRemark: "" }]
        : [])
  const [bus, setBus] = useState<BusLeg[]>(invoice?.bus ?? [])
  // a draft made from an enrolment (no bus legs yet) starts from the student's bus default (owner 2026-10-16)
  const [busTouched, setBusTouched] = useState(!!invoice && !(invoice.status === "draft" && invoice.bus.length === 0))
  const [bookFee, setBookFee] = useState(invoice?.bookFee ?? 0)
  // "" = follow the distance band of the family's pin (owner 2026-10-16) until the admin picks a type
  const [busFeeId, setBusFeeId] = useState(invoice?.busFeeId ?? "")
  // Advance Optional: follows the default (entry fee unless already paid) until the admin ticks something
  const [advancePicked, setAdvancePicked] = useState<AdvanceItem[] | null>(invoice ? invoice.advance : null)
  const invoices = useStore((s) => s.invoices)
  const busAddOns = useStore((s) => s.busAddOns)
  const creditNotes = useStore((s) => s.creditNotes)
  const [creditSkip, setCreditSkip] = useState<string[]>([])
  // extra bus days from before: all pulled in by default, untick to leave them for a later invoice
  const [extrasPicked, setExtrasPicked] = useState<string[] | null>(invoice ? (invoice.busExtras ?? []).map((x) => x.addOnId) : null)
  // Family Promotion: switched on from the banner below (owner 2026-11-05); the % follows the tier the hours reach
  // sections work like an FAQ: opening one closes the others (owner 2026-11-05)
  const [openSec, setOpenSec] = useState(studentId ? 3 : 1)
  const [familyOn, setFamilyOn] = useState(invoice?.familyPromoPct != null)
  const [concession, setConcession] = useState(invoice?.concession?.amount ?? 0)
  const [concessionRemark, setConcessionRemark] = useState(invoice?.concession?.remark ?? "")

  const student = students.find((s) => s.id === studentId)
  // every package this student ever bought — one chip each, to renew/re-buy like a new invoice
  const pastPackages = student
    ? [...new Map(entitlements.filter((e) => e.studentId === student.id).sort((a, b) => a.to.localeCompare(b.to)).map((e) => [`${e.courseId}|${e.classIds.join("+")}`, e])).values()].reverse()
    : []
  // carry on from the student's current package of this course (same class, the day after it ends)
  const currentOf = (sid: string, courseId: string) => entitlements.filter((x) => x.studentId === sid && x.courseId === courseId && x.to >= today).sort((a, b) => b.to.localeCompare(a.to))[0]
  const startFor = (sid: string, courseId: string) => { const cur = sid ? currentOf(sid, courseId) : undefined; return cur ? addDays(cur.to, 1) : sid ? firstStart(sid) : today }
  const pickStudent = (sid: string) => {
    setStudentId(sid); setBusTouched(false)
    if (!invoice) setLines((ls) => ls.map((l) => ({ ...l, startDate: startFor(sid, l.courseId), classIds: l.classIds.length ? l.classIds : (currentOf(sid, l.courseId)?.classIds ?? []) })))
  }
  const family = families.find((f) => f.id === student?.familyId)
  const patchLine = (id: string, patch: Partial<LineDraft>) => { setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); setBusTouched(false) }
  const removeLine = (id: string) => { setLines((ls) => ls.filter((l) => l.id !== id)); setBusTouched(false) }
  // seats only for classes still chosen, and only when they are really part of the class
  const pickSeats = (l: LineDraft) => {
    const out = Object.fromEntries(Object.entries(l.seats ?? {}).filter(([cid, seat]) => { const k = classes.find((x) => x.id === cid); return l.classIds.includes(cid) && !!k && isPartial(seat, k.minutes) }))
    return Object.keys(out).length ? out : undefined
  }
  const lineFor = (courseId: string): LineDraft => {
    const options = classOptionsFor(courses.find((c) => c.id === courseId), classes, branch.id, staff)
    return {
      id: uid("ln"), courseId, periodsText: "1", overlapRemark: "",
      classIds: (studentId && currentOf(studentId, courseId)?.classIds) || (options.length === 1 ? [options[0].id] : []),
      startDate: startFor(studentId, courseId),
    }
  }
  const renewPackage = (e: Entitlement) => {
    const line = { courseId: e.courseId, classIds: e.classIds, startDate: renewStart(e) }
    const same = lines.find((l) => l.courseId === e.courseId)
    if (same) patchLine(same.id, line)
    else { setLines((ls) => [...ls, { id: uid("ln"), periodsText: "1", overlapRemark: "", ...line }]); setBusTouched(false) }
  }

  const advance = advancePicked ?? defaultAdvance(branch, student, invoices)
  const waiver = entryFeeWaiver(student, invoices, branch.fees, invoice?.id)
  const advanceFees = branch.fees.filter((f) => f.kind === "entry" || f.kind === "mock")
  const busFees = branch.fees.filter((f) => f.kind === "bus")
  const pendingExtras = busOn && studentId ? pendingBusAddOns(studentId, busAddOns, invoices, invoice?.id) : []
  const extraIds = extrasPicked ?? pendingExtras.map((a) => a.id)
  const busExtras: BusExtraLine[] = pendingExtras.filter((a) => extraIds.includes(a.id)).map((a) => ({ addOnId: a.id, date: a.date, pickup: a.pickup, dropoff: a.dropoff, amount: a.amount }))
  // owner 2026-10-16: distance from the branch → which bus fee type (or outside the bus area)
  const homeKm = family?.location && branch.location ? distanceKm(branch.location, family.location) : null
  const zone = homeKm !== null ? busZone(branch.fees, homeKm) : null
  const feeId = busFeeId || zone?.fee?.id || busFees[0]?.id || ""
  const rate = busRate(branch, feeId)

  const courseLines: CourseLine[] = lines.map((l) => {
    const periods = Number(l.periodsText)
    const overlap = studentId && Att.activeEntitlements(studentId, entitlements, l.startDate).some((e) => e.courseId === l.courseId)
    // hour packs: minutes this student kept from the previous package of this course come in automatically
    const course = courses.find((c) => c.id === l.courseId)
    const carryIn = course?.unit === "hour" && studentId ? carriedMinutes(studentId, l.courseId, entitlements, invoices, invoice?.id) : 0
    return { id: l.id, courseId: l.courseId, classIds: l.classIds, startDate: l.startDate, periods: Number.isInteger(periods) && periods >= 1 ? periods : 0, overlapRemark: overlap ? l.overlapRemark : undefined, backdateRemark: isBackdated(l.startDate, today) ? l.backdateRemark : undefined, carryIn: carryIn || undefined, leftover: l.leftover, seats: pickSeats(l) }
  })
  const base: Invoice = {
    id: newId,
    branchId: branch.id,
    studentId,
    number: invoice?.number ?? null,
    lines: courseLines,
    bus: [],
    busFeeId: feeId || null,
    busExtras,
    bookFee, advance,
    concession: concession > 0 ? { amount: concession, remark: concessionRemark } : null,
    noteToParent: invoice?.noteToParent ?? lastNoteFor(studentId, invoices),
    status: "draft",
    pdf: "none",
    createdBy: invoice?.createdBy ?? me,
    createdAt: invoice?.createdAt ?? now.toISOString(),
    payments: [],
  }
  const ctx = { branch, courses, classes, holidays }
  // bus legs follow the real class days of every course, once per day; default ticked only if the student rides the bus (BL-6)
  const baseLines = invoiceTotals(base, ctx).lines
  const busDates = busOn ? invoiceSessionDates(baseLines) : []
  // course credit from Credit Notes: taken automatically, the admin can untick a course
  const credits = studentId ? autoCredits(studentId, baseLines, creditNotes, invoices, invoice?.id) : []
  const creditsUsed = credits.filter((c) => !creditSkip.includes(c.courseId))
  const legs: BusLeg[] = !busTouched ? defaultBusLegs(busDates, !!student?.usesBus) : busDates.map((d) => bus.find((b) => b.date === d) ?? { date: d, pickup: false, dropoff: false })
  const draft: Invoice = { ...base, bus: legs, creditsUsed }
  // (familyPromoPct is added to the saved invoice below, after the tier is known)
  // owner 2026-10-16: each class day — is there a bus run for that time, and is it full?
  const rounds = branch.busRounds ?? []
  const busCtx = { branchId: branch.id, invoices, busAddOns, classes, excludeInvoiceId: invoice?.id }
  const rideIds = lines.flatMap((l) => l.classIds)
  const rideChecks = legs.map((l) => {
    const t = rideTimes(classes, rideIds, l.date)
    return { pickup: checkRide("pickup", l.date, t, rounds, busCtx, studentId), dropoff: checkRide("dropoff", l.date, t, rounds, busCtx, studentId) }
  })
  const problemDays = rounds.length ? legs.filter((l, i) => (["pickup", "dropoff"] as const).some((k) => l[k] && (!rideChecks[i][k].round || rideChecks[i][k].full))).length : 0
  // Family Promotion: siblings invoiced the same day (other invoices still alive) + this draft's hours → the tier reached
  const siblingInvoices = student?.familyId
    ? invoices.filter((i) => i.id !== newId && i.status !== "void" && i.branchId === branch.id && i.createdAt.slice(0, 10) === (invoice?.createdAt ?? now.toISOString()).slice(0, 10)
      && students.find((x) => x.id === i.studentId)?.familyId === student.familyId && i.studentId !== studentId)
    : []
  // the other children of this family at this branch
  const brothers = student?.familyId ? students.filter((x) => x.familyId === student.familyId && x.id !== studentId) : []
  const siblingHours = siblingInvoices.map((i) => ({ inv: i, hours: invoiceHours(invoiceTotals(i, ctx)) }))
  const familyTier = studentId ? familyPromotion([{ studentId, hours: invoiceHours({ lines: baseLines }) }, ...siblingHours.map((s) => ({ studentId: s.inv.studentId, hours: s.hours }))]) : null
  const familyPct = familyOn && familyTier ? familyTier.pct : 0
  const totals = invoiceTotals({ ...draft, familyPromoPct: familyPct || undefined }, ctx)
  const errors = [
    ...(!studentId ? ["เลือกนักเรียน"] : []),
    ...courseLines.filter((l) => l.overlapRemark !== undefined && !l.overlapRemark.trim()).map((l) => `นักเรียนมีแพ็กเกจ ${courses.find((c) => c.id === l.courseId)?.name ?? ""} อยู่แล้ว — ใส่เหตุผลที่ซื้อซ้ำ`),
    ...validateInvoiceDraft(draft, totals, { today, lastAssessment: studentId ? lastAssessmentDate(studentId, assessments) : null }),
  ]

  const submit = () => {
    const r = save({ ...draft, familyPromoPct: familyPct || undefined })
    if (report(r, (v) => `บันทึกแล้ว · เลขที่ ${v.number} (ใบจริง — มีปัญหาให้ยกเลิก ไม่ลบ)`)) onSaved(r.value)
  }

  return (
    <FormShell className="max-h-[92vh] sm:max-w-3xl" onClose={onClose} title={invoice ? `แก้ใบแจ้งหนี้ ${invoice.number ?? ""}` : "สร้างใบแจ้งหนี้"}
      description="ราคาและจำนวนคาบคำนวณจากตารางเรียนจริง (ข้ามวันหยุด) — ตัวเลขชุดเดียวกับที่จะอยู่ใน PDF"
      footer={<>
        {errors.length > 0 && <span className="mr-auto text-xs text-danger">{errors[0]}</span>}
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button disabled={errors.length > 0} onClick={submit}>{invoice ? "บันทึก" : "สร้างใบแจ้งหนี้ (ออกเลขทันที)"}</Button>
      </>}>

        <Section n={1} open={openSec === 1} onToggle={() => setOpenSec(openSec === 1 ? 0 : 1)} summary={student ? `${student.nickname} · ${student.grade}` : "ยังไม่ได้เลือก"} title="Student">
        <div className="space-y-1">
          <Label className="text-xs">นักเรียน *</Label>
          {student ? (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm">
              <span className="font-medium">{student.nickname}</span><span className="text-xs text-muted-foreground">{student.grade} · {student.name}</span>
              {student.imported && <span className="rounded-full bg-info-soft px-2 py-0.5 text-2xs text-info-ink">นักเรียนเก่า</span>}
              {!invoice && <Button variant="ghost" size="inline" type="button" className="ml-auto text-xs text-primary underline" onClick={() => setPicking(true)}>เปลี่ยน</Button>}
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setPicking(true)}><UserRoundSearchIcon /> เลือกนักเรียน / Lead</Button>
          )}
          {picking && (
            <CustomerPicker kinds={["student", "lead"]} title="เลือกลูกค้า" onClose={() => setPicking(false)}
              onConfirm={(row) => {
                if (row.kind === "lead") {
                  // a lead gets its student + family now; it becomes "ลงทะเบียนแล้ว" when this invoice is paid
                  const r = leadToStudent(row.id)
                  if (!report(r, "สร้างนักเรียน + ครอบครัวจาก Lead แล้ว")) return
                  pickStudent(r.value.studentId)
                } else pickStudent(row.id)
                setPicking(false)
              }} />
          )}
          {student && (
            <p className="text-xs text-muted-foreground">
              {family ? `${family.name} · ${family.parents.find((p) => p.primary)?.name}` : "ยังไม่ผูกครอบครัว"}
              {family && !family.parents.some((p) => p.lineLinked) && <span className="text-warning"> · ยังไม่ผูก LINE</span>}
            </p>
          )}
        </div>

        </Section>

        <Section n={2} open={openSec === 2} onToggle={() => setOpenSec(openSec === 2 ? 0 : 2)} summary={totals.promotion + totals.credit + totals.concession > 0 ? `ลด ${fmtMoney(totals.promotion + totals.credit + totals.concession)}` : "ไม่มี"} title="Promotion" hint="ส่วนลด / โปรโมชัน">
        {!familyTier && siblingHours.length === 0 && credits.length === 0 && !totals.lines.some((l) => l.promotion > 0 || l.bonusMinutes > 0) && concession === 0 && (
          <p className="text-xs text-muted-foreground">ยังไม่มีโปรโมชันที่ใช้กับใบนี้ — โปรโมชันของสาขา (ลด % / ลดบาท / แถมชม.) จะใส่ให้อัตโนมัติตามคอร์สที่เลือก · ส่วนลดพิเศษใส่ได้ด้านล่าง</p>
        )}
        {totals.lines.some((l) => l.promotion > 0 || l.bonusMinutes > 0) && (
          <ul className="space-y-0.5 text-sm text-success">
            {totals.lines.filter((l) => l.promotion > 0 || l.bonusMinutes > 0).map((l) => (
              <li key={l.line.id} className="flex justify-between gap-2"><span>{l.course?.name} · {l.promotionName ?? l.bonusName}{l.bonusMinutes > 0 && l.promotion === 0 ? ` — แถม ${l.bonusMinutes / 60} ชม.` : ""}</span>{l.promotion > 0 && <span className="tabular-nums">−{fmtMoney(l.promotion)}</span>}</li>
            ))}
          </ul>
        )}
        {/* siblings (owner 2026-11-05): suggest asking the parent about the other children today — they share the Family Promotion */}
        {student?.familyId && brothers.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-info/40 p-3 text-sm">
            <p className={cn("flex items-center gap-2 font-semibold", AI_TONE.text)}><AiIcon className="size-6" /> ถามผู้ปกครองว่าจะต่อคอร์สของลูกอีกคนด้วยไหม — ได้รับ Family Promotion</p>
            {brothers.map((b) => {
              const has = siblingInvoices.some((i) => i.studentId === b.id)
              const last = lastPaidInvoice(b.id, invoices)
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium">{b.nickname}</span><span className="text-muted-foreground">{b.grade}</span>
                  {has ? <span className="ml-auto text-success">มีใบวันนี้แล้ว ✓</span>
                    : last ? <Button size="xs" variant="outline" className="ml-auto" onClick={() => report(duplicate(last.id), (v) => `สร้าง Draft ให้ ${b.nickname} แล้ว · ${v.number}`)}>สร้าง Draft ให้ {b.nickname} จากใบเดิม</Button>
                      : <span className="ml-auto text-muted-foreground">ยังไม่มีใบเดิม — สร้างใบใหม่เอง</span>}
                </div>
              )
            })}
          </div>
        )}

        {familyTier && (
          <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-info/40 p-3 text-sm", AI_TONE.soft)}>
            <AiIcon />
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold", AI_TONE.text)}>Family Promotion −{familyTier.pct}% — ใส่ให้พี่น้องทุกคนที่ออกใบวันนี้</p>
              <p className="text-xs text-muted-foreground">
                {familyTier.basis === "single" ? `มีคนเรียน ${familyTier.hours} ชม. (เกิน ${familyTier.overHours} ชม.)` : `ชั่วโมงรวมทั้งครอบครัว ${familyTier.hours} ชม. (เกิน ${familyTier.overHours} ชม.)`} · ลดเฉพาะค่าเรียน
                {siblingHours.length > 0 && ` · ใบของพี่น้อง: ${siblingHours.map((s) => `${students.find((x) => x.id === s.inv.studentId)?.nickname ?? ""} ${s.inv.number ?? "ร่าง"}${s.inv.familyPromoPct ? " ✓" : " (ยังไม่ได้ใส่ — ต้องแก้ใบนั้นด้วย)"}`).join(", ")}`}
              </p>
            </div>
            <Button size="sm" variant={familyOn ? "secondary" : "default"} onClick={() => setFamilyOn(!familyOn)}>{familyOn ? <><CheckIcon /> ใส่แล้ว (กดเพื่อเอาออก)</> : "ใส่ Family Promotion"}</Button>
          </div>
        )}

        {!familyTier && siblingHours.length > 0 && (
          <div className={cn("flex items-center gap-3 rounded-xl border border-info/40 p-3 text-sm", AI_TONE.soft)}>
            <AiIcon />
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              <span className={cn("font-semibold", AI_TONE.text)}>พี่น้องในครอบครัวเดียวกันออกใบวันนี้ — ยังไม่เข้า Family Promotion</span>{" "}
              (ต้องเกิน {FAMILY_PROMO_TIERS[0].overHours} ชม.: ครอบครัวรวม {Math.round((invoiceHours({ lines: baseLines }) + siblingHours.reduce((a, x) => a + x.hours, 0)) * 10) / 10} ชม. · คนที่เรียนมากสุด {Math.round(Math.max(invoiceHours({ lines: baseLines }), ...siblingHours.map((x) => x.hours)) * 10) / 10} ชม.)
            </p>
          </div>
        )}

        {credits.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900 dark:bg-violet-950/30">
            <p className="flex items-center gap-1 text-sm font-medium">เครดิตคอร์ส (จากใบลดหนี้) — หักให้อัตโนมัติ <InfoTip text="ติ๊กออกถ้ายังไม่ใช้เครดิตในใบนี้" /></p>
            {[...new Set(credits.map((c) => c.courseId))].map((cid) => {
              const amount = credits.filter((c) => c.courseId === cid).reduce((a, c) => a + c.amount, 0)
              const on = !creditSkip.includes(cid)
              return (
                <label key={cid} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={on} onCheckedChange={(v) => setCreditSkip(v ? creditSkip.filter((x) => x !== cid) : [...creditSkip, cid])} />
                  {courses.find((c) => c.id === cid)?.name}
                  <span className="ml-auto tabular-nums text-violet-800 dark:text-violet-200">−{fmtMoney(amount)}</span>
                </label>
              )
            })}
          </div>
        )}

        <div className="space-y-1 sm:max-w-xs"><Label className="text-xs">ส่วนลดพิเศษ (Concession)</Label><Input type="number" min={0} value={concession} onChange={(e) => setConcession(Math.max(0, Number(e.target.value)))} /></div>
        {concession > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">เหตุผลของส่วนลด *</Label>
            <Textarea rows={2} value={concessionRemark} onChange={(e) => setConcessionRemark(e.target.value)} placeholder="ทุกส่วนลดต้องมีเหตุผล" aria-invalid={!concessionRemark.trim()} />
          </div>
        )}

        </Section>

        <Section n={3} open={openSec === 3} onToggle={() => setOpenSec(openSec === 3 ? 0 : 3)} summary={lines.length ? `${lines.length} คอร์ส · ${fmtMoney(totals.course + totals.courseFee)}` : "ยังไม่ได้เลือก"} title="Course">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs">คอร์ส {lines.length > 0 && `(${lines.length})`}</Label>
            <Button size="xs" variant="outline" className="ml-auto" onClick={() => setPickingCourses(true)}><PlusIcon /> เลือกคอร์ส</Button>
          </div>
          {pastPackages.length > 0 && !invoice && (
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><HistoryIcon className="size-3" /> คอร์สที่เคยสมัคร — กดเพื่อต่ออายุ / ซื้อซ้ำ</p>
              <div className="flex flex-wrap gap-1.5">
                {pastPackages.map((e) => {
                  const c = courses.find((x) => x.id === e.courseId)
                  const on = lines.some((l) => l.courseId === e.courseId && l.classIds.join("+") === e.classIds.join("+"))
                  return (
                    <Button variant="ghost" size="inline" key={e.id} type="button" onClick={() => renewPackage(e)}
                      className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                      {c?.name ?? "คอร์ส"} · {classes.filter((k) => e.classIds.includes(k.id)).map((k) => k.name).join(" + ") || "—"} · {e.to < today ? "หมด" : "ถึง"} {fmtDate(e.to)}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}
          {lines.length === 0 && (
            <Button variant="ghost" size="inline" type="button" onClick={() => setPickingCourses(true)} className="w-full rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground hover:bg-muted/40">
              ยังไม่มีคอร์ส — กดเพื่อเลือก (เลือกได้หลายคอร์ส) · หรือเว้นไว้ถ้าเก็บเฉพาะค่าอื่นๆ
            </Button>
          )}
          {lines.map((l, i) => (
            <LineCard key={l.id} index={i} draft={l} quote={totals.lines[i]} studentId={studentId} studentGrade={student?.grade}
              choices={classChoices(totals.lines[i]?.course, classes, branch.id, staff, student?.grade)}
              today={today} closed={holidays.filter((h) => closesBranch(h, branch.id))} overlapTo={studentId ? Att.activeEntitlements(studentId, entitlements, l.startDate).find((e) => e.courseId === l.courseId)?.to : undefined}
              onChange={(patch) => patchLine(l.id, patch)} onRemove={() => removeLine(l.id)} />
          ))}
          {pickingCourses && (
            <CoursePicker branch={branch} today={today} studentGrade={student?.grade} studentId={studentId} onInvoice={lines.map((l) => l.courseId)} onClose={() => setPickingCourses(false)}
              onConfirm={(cs) => { setLines((ls) => [...ls, ...cs.map((c) => lineFor(c.id))]); setBusTouched(false); setPickingCourses(false) }} />
          )}
        </div>

        </Section>

        <Section n={4} open={openSec === 4} onToggle={() => setOpenSec(openSec === 4 ? 0 : 4)} summary={totals.advance + totals.book > 0 ? fmtMoney(totals.advance + totals.book) : "ไม่มี"} title="Advance" hint="ไม่บังคับ">
        {advanceFees.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Advance Optional (ค่าแรกเข้า / สอบ)</Label>
            <div className="flex flex-wrap gap-1.5">
              {advanceFees.map((f) => {
                const on = advance.some((a) => a.feeId === f.id)
                const paidBefore = f.kind === "entry" && waiver
                return (
                  <Button variant="ghost" size="inline" key={f.id} type="button" aria-pressed={on}
                    onClick={() => setAdvancePicked(on ? advance.filter((a) => a.feeId !== f.id) : [...advance, { feeId: f.id, name: f.name, amount: f.price }])}
                    className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                    {on && <CheckIcon className="size-3" />}{f.name} · {fmtMoney(advance.find((a) => a.feeId === f.id)?.amount ?? f.price)}
                    {paidBefore && <span className="text-muted-foreground">({waiver.reason === "imported" ? "นักเรียนเก่า" : "เคยจ่ายแล้ว"})</span>}
                  </Button>
                )
              })}
            </div>
            {waiver?.reason === "imported" && (
              <p className="flex items-start gap-1.5 rounded-lg bg-info-soft/60 p-2 text-xs text-info-ink">
                <HistoryIcon className="mt-0.5 size-3.5 shrink-0" />
                <span><b>นักเรียนเก่า</b> — นำเข้าจาก{waiver.source} ({fmtDate(waiver.at.slice(0, 10), { year: true })}) เคยซื้อคอร์สกับเราแล้ว <b>ไม่ต้องเก็บค่าแรกเข้า</b></span>
              </p>
            )}
            {waiver?.reason === "paid" && <p className="text-xs text-muted-foreground">ยกเว้นค่าแรกเข้าให้อัตโนมัติ — จ่ายแล้วในใบ {waiver.invoice.number}</p>}
            {!waiver && studentId && advancePicked === null && advance.length > 0 && <p className="text-xs text-muted-foreground">นักเรียนยังไม่เคยจ่ายค่าแรกเข้า — ใส่ให้แล้ว กดเพื่อเอาออกได้</p>}
          </div>
        )}

        <div className="space-y-1 sm:max-w-xs"><Label className="text-xs">ค่าหนังสือ</Label><Input type="number" min={0} value={bookFee} onChange={(e) => setBookFee(Math.max(0, Number(e.target.value)))} /></div>
        </Section>

        {busOn && (
        <Section n={5} open={openSec === 5} onToggle={() => setOpenSec(openSec === 5 ? 0 : 5)} summary={totals.bus + totals.busExtra > 0 ? fmtMoney(totals.bus + totals.busExtra) : "ไม่ใช้"} title="Bus" hint="ไม่บังคับ">
        {busDates.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={usesNoBus(legs)} onCheckedChange={(v) => { setBusTouched(true); setBus(setAllBusLegs(legs, !v)) }} />
            นักเรียนไม่ใช้รถรับส่ง (ไม่เก็บค่ารถ)
          </label>
        )}
        {busDates.length > 0 && (
          <details className="rounded-lg border" open={legs.some((l) => l.pickup || l.dropoff)}>
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <BusIcon className="size-4" /> ค่ารถ ({busFees.find((f) => f.id === feeId)?.name ?? "ค่ารถ"} {fmtMoney(rate)}/เที่ยว)
              <InfoTip text={`${student?.usesBus ? "นักเรียนใช้รถ — ติ๊กให้ตามรอบเรียนแล้ว" : "นักเรียนไม่ได้ใช้รถ — ติ๊กเฉพาะรอบที่ต้องการ"} · วันที่มีหลายคอร์สนับเป็นรอบเดียว`} />
              <span className="ml-auto font-medium tabular-nums">{fmtMoney(busTotal(legs, rate))}</span>
            </summary>
            <div className="space-y-2 border-t px-3 py-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_1.6fr]">
                <div className="space-y-1">
                  <Label className="text-xs">ประเภทค่ารถ</Label>
                  <NativeSelect value={feeId} onChange={(e) => setBusFeeId(e.target.value)}
                    placeholder={busFees.length ? undefined : `ค่าตั้งต้นของสาขา ${fmtMoney(branch.busFeePerLeg)}/เที่ยว`}
                    options={busFees.map((f) => ({ value: f.id, label: `${f.name} · ${fmtMoney(f.price)}/เที่ยว` }))} />
                </div>
                <BusDistance km={homeKm} zone={zone} feeId={feeId} onUse={setBusFeeId} />
              </div>
              <FamilyPin family={family} branchLoc={branch.location} radiusKm={zone?.maxKm} />
              {problemDays > 0 && <p className="flex items-center gap-1.5 rounded-lg bg-danger-soft/60 px-2 py-1.5 text-xs text-danger-ink"><AlertTriangleIcon className="size-3.5 shrink-0" />{`ไม่มีรอบรถ / รถเต็ม ${problemDays} วัน — แจ้งผู้ปกครองก่อนส่งใบ`}</p>}
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={() => { setBusTouched(true); setBus(legs.map((l) => ({ ...l, pickup: true, dropoff: true }))) }}>ติ๊กทุกรอบ</Button>
                <Button size="xs" variant="ghost" onClick={() => { setBusTouched(true); setBus(legs.map((l) => ({ ...l, pickup: false, dropoff: false }))) }}>ไม่ใช้รถ</Button>
              </div>
              <div className={cn("grid gap-1", !(branch.busRounds ?? []).length && "sm:grid-cols-2")}>
                {legs.map((l, i) => (
                  <div key={l.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24">{fmtDate(l.date, { weekday: true })}</span>
                    {(["pickup", "dropoff"] as const).map((k) => (
                      <label key={k} className="flex min-w-36 items-center gap-1.5">
                        <Checkbox checked={l[k]} onCheckedChange={(v) => { setBusTouched(true); setBus(legs.map((x, j) => (j === i ? { ...x, [k]: !!v } : x))) }} />
                        {k === "pickup" ? "รับ" : "ส่ง"}
                        {rounds.length > 0 && <RoundChip check={rideChecks[i][k]} on={l[k]} />}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {pendingExtras.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-warning/40 bg-warning-soft/40 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BusIcon className="size-4" /> ค่ารถเพิ่ม (รอบก่อน · รอเรียกเก็บ) <InfoTip text="ติ๊กออกเพื่อเก็บไว้เรียกเก็บในใบหลัง" />
              <span className="ml-auto tabular-nums">{fmtMoney(busExtras.reduce((a, x) => a + x.amount, 0))}</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {pendingExtras.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={extraIds.includes(a.id)} onCheckedChange={(v) => setExtrasPicked(v ? [...extraIds, a.id] : extraIds.filter((x) => x !== a.id))} />
                  <span>{fmtDate(a.date, { weekday: true })} · {[a.pickup && "รับ", a.dropoff && "ส่ง"].filter(Boolean).join("+")}</span>
                  <span className="ml-auto tabular-nums text-muted-foreground">{fmtMoney(a.amount)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {busDates.length === 0 && pendingExtras.length === 0 && <p className="text-xs text-muted-foreground">เลือกคอร์สและคลาสก่อน — ระบบจะแสดงรอบรับ-ส่งตามวันเรียนจริงให้ติ๊ก</p>}
        </Section>
        )}

        <Section n={busOn ? 6 : 5} open={openSec === 6} onToggle={() => setOpenSec(openSec === 6 ? 0 : 6)} summary={fmtMoney(totals.total)} title="Summary">
        <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm tabular-nums">
          {[["ค่าเรียน", totals.course], ["Course fee", totals.courseFee], ["ค่ารถ", totals.bus], ["ค่ารถเพิ่ม (รอบก่อน)", totals.busExtra], ["ค่าหนังสือ", totals.book], ["Advance (ค่าแรกเข้า/สอบ)", totals.advance]].filter(([, v]) => (v as number) > 0).map(([l, v]) => (
            <div key={l as string} className="flex justify-between"><span>{l}</span><span>{fmtMoney(v as number)}</span></div>
          ))}
          {totals.promotion > 0 && <div className="flex justify-between text-success"><span>โปรโมชัน</span><span>−{fmtMoney(totals.promotion)}</span></div>}
          {totals.rounding > 0 && <div className="flex justify-between text-muted-foreground"><span>ปัดเศษ (Liclass ปัดขึ้นหลักสิบ)</span><span>+{fmtMoney(totals.rounding)}</span></div>}
          {totals.credit > 0 && <div className="flex justify-between text-violet-700"><span>หักเครดิตคอร์ส</span><span>−{fmtMoney(totals.credit)}</span></div>}
          {totals.concession > 0 && <div className="flex justify-between text-success"><span>ส่วนลดพิเศษ</span><span>−{fmtMoney(totals.concession)}</span></div>}
          <div className={cn("flex justify-between border-t pt-1 text-base font-semibold", totals.total < 0 && "text-danger")}><span>ยอดรวม</span><span>{fmtMoney(totals.total)}</span></div>
        </div>
        </Section>


    </FormShell>
  )
}

/** One course on the invoice: its class, start date, periods and the real-schedule quote. */
const WEEKDAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
const LEFTOVER_CHOICES: [Leftover, string][] = [["carry", "เก็บไว้กับนักเรียน (รวมแพ็กถัดไป)"], ["extra", "เพิ่ม +1 คาบ (ไม่เก็บเงินเพิ่ม)"], ["drop", "ตัดเศษทิ้ง"]]

function LineCard({ index, draft, quote, studentId, studentGrade, choices, overlapTo, today, closed, onChange, onRemove }: {
  index: number; draft: LineDraft; quote?: LineQuote; studentId: string; studentGrade?: string; choices: { klass: Klass; warnings: string[] }[]; overlapTo?: string; today: string; closed: Holiday[]
  onChange: (patch: Partial<LineDraft>) => void; onRemove: () => void
}) {
  const staff = useStore((s) => s.staff)
  const course = quote?.course
  const [day, setDay] = useState<number | null>(null)
  const [openPicker, setOpenPicker] = useState(false)
  const classes = choices.map((c) => c.klass)
  // any class is allowed (owner 2026-09-30) — the ones that fit show first, the rest behind one tap, with the reason
  const [showAll, setShowAll] = useState(false)
  const fits = choices.filter((c) => !c.warnings.length)
  const chosen = classes.filter((k) => draft.classIds.includes(k.id))
  const picking = chosen.length === 0 || openPicker
  const days = [...new Set(classes.map((k) => k.weekday))].sort()
  const toggleClass = (id: string) => onChange({ classIds: draft.classIds.includes(id) ? draft.classIds.filter((x) => x !== id) : [...draft.classIds, id] })
  const periods = Number(draft.periodsText)
  const periodsValid = Number.isInteger(periods) && periods >= 1
  const q = quote?.quote
  const mismatch = studentGrade && course && !course.grades.includes(studentGrade)
  if (!course) return null
  // container queries (@…): the card reacts to ITS OWN width — a narrow side panel on a wide screen stays one row per class
  return (
    <div className="@container space-y-3 rounded-2xl border p-3">
      <div className="flex items-start gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-medium">{course.name} <PackageBadge course={course} /></div>
          <p className="truncate text-xs text-muted-foreground">
            {fmtMoney(course.price)} {priceUnitSuffix(course)}
            {course.courseFee > 0 && ` · Course fee ${fmtMoney(course.courseFee)}`} · {course.kind === "bundle" ? "Bundle" : "Single"} · เรียน{COURSE_FORMAT_LABEL[course.format]}
          </p>
          {mismatch && <p className="flex items-center gap-1 text-xs text-warning"><AlertTriangleIcon className="size-3" /> เกรด {studentGrade} ไม่ตรงกับคอร์ส ({course.grades.join(", ")})</p>}
        </div>
        <Button size="icon-xs" variant="ghost" aria-label="เอาคอร์สนี้ออก" onClick={onRemove}><XIcon /></Button>
      </div>

      {/* one course, several classes (อ. + พฤ.) — each counted as its own class (owner 2026-09-30).
          2026-11-09: one row per class (a single line on a phone); the picked ones show alone, the rest open behind "เพิ่ม/เปลี่ยนคลาส" */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="mr-auto text-xs">คลาสที่จะเรียน * {chosen.length > 0 && <span className="text-muted-foreground">({chosen.length} คลาส)</span>}</Label>
          {picking && days.length > 1 && (
            <>
              {/* wide: the shared segmented switch · phone: a dropdown (the 8 day pills did not fit) */}
              <Segmented className="hidden @lg:inline-flex" label="วัน" value={String(day ?? "all")} onChange={(v) => setDay(v === "all" ? null : Number(v))}
                options={[{ value: "all", label: "ทุกวัน" }, ...days.map((d) => ({ value: String(d), label: WEEKDAY_SHORT[d] }))]} />
              <NativeSelect className="w-36 @lg:hidden" aria-label="วัน" value={String(day ?? "all")} onChange={(e) => setDay(e.target.value === "all" ? null : Number(e.target.value))}
                options={[{ value: "all", label: "ทุกวัน" }, ...days.map((d) => ({ value: String(d), label: WEEKDAY_SHORT[d] }))]} />
            </>
          )}
          {chosen.length > 0 && <Button size="sm" variant="outline" onClick={() => setOpenPicker((v) => !v)}>{picking ? "เสร็จ" : "เพิ่ม / เปลี่ยนคลาส"}</Button>}
        </div>
        {fits.length === 0 && !showAll && picking && <p className="text-xs text-muted-foreground">ไม่มีคลาสที่ตรงวิชา/รูปแบบของคอร์สนี้ — กด &quot;แสดงคลาสอื่น&quot; เพื่อเลือกคลาสไหนก็ได้</p>}
        <div className="grid gap-1.5 @3xl:grid-cols-2">
          {choices.filter(({ klass: k, warnings }) => (picking ? ((showAll || !warnings.length || draft.classIds.includes(k.id)) && (day === null || k.weekday === day || draft.classIds.includes(k.id))) : draft.classIds.includes(k.id))).map(({ klass: k, warnings }) => {
            const t = staff.find((x) => x.id === k.teacherId)
            const cap = CAPACITY[k.type]
            const over = k.studentIds.length >= cap && !k.studentIds.includes(studentId)
            const on = draft.classIds.includes(k.id)
            const notes = [...(t?.active ? [] : ["ยังไม่มีครู"]), ...(over ? [`เกินที่แนะนำ ${cap} คน`] : []), ...warnings]
            const seat = draft.seats?.[k.id] ?? { offset: 0, minutes: k.minutes }
            return (
              <div key={k.id} className={cn("space-y-1", on && k.minutes > 60 && "@3xl:col-span-2")}>
                <Button variant="row" size="inline" type="button" onClick={() => toggleClass(k.id)} aria-pressed={on}
                  className={cn("flex min-h-9 w-full items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted/50", warnings.length > 0 && !on && "border-dashed")}>
                  <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
                  <span className="min-w-0 flex-1 truncate"><span className="font-medium">{WEEKDAY_SHORT[k.weekday]} {k.start}</span> · {k.name}</span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground @md:inline @3xl:hidden @4xl:inline">{t?.active ? `ครู${t.nickname}` : "ยังไม่มีครู"} · {k.minutes} นาที · {k.studentIds.length} คน</span>
                  {/* the icon slot is ALWAYS there (empty when no warning) so the meta text ends at the same x in every row */}
                  <span className="grid size-4 shrink-0 place-items-center text-warning">
                    {notes.length > 0 && (
                      <HoverCard>
                        <HoverCardTrigger render={<span className="grid place-items-center" />}><AlertTriangleIcon className="size-4" /></HoverCardTrigger>
                        <HoverCardContent className="w-auto max-w-64 space-y-0.5 text-xs">{notes.map((n) => <p key={n}>{n}</p>)}</HoverCardContent>
                      </HoverCard>
                    )}
                  </span>
                </Button>
                {on && k.minutes > 60 && (
                  <div className="flex flex-wrap items-center gap-2 pl-3 text-xs">
                    <span className="text-muted-foreground">เวลาเรียน</span>
                    <SeatHours className="basis-full" classMinutes={k.minutes} start={k.start} value={draft.seats?.[k.id]} onChange={(v) => { const rest = { ...draft.seats }; if (v) rest[k.id] = v; else delete rest[k.id]; onChange({ seats: rest }) }} />
                    {isPartial(seat, k.minutes) && <span className="text-violet-700">ราคาคอร์สเท่าเดิม · แพ็กชั่วโมงนับคาบตามเวลาที่เรียน</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {picking && choices.length > fits.length && (
        <Button variant="ghost" size="inline" type="button" className="text-xs text-primary underline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "ซ่อนคลาสที่ไม่ตรง" : `แสดงคลาสอื่น (${choices.length - fits.length}) — เลือกได้แต่ไม่ตรงวิชา/ระดับ/รูปแบบ`}
        </Button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">เริ่มเรียนตั้งแต่</Label>
          <StartDatePicker value={draft.startDate} today={today} closed={closed} onChange={(d) => onChange({ startDate: d })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">จำนวน{course.unit === "month" ? "เดือน" : "แพ็ก"} *</Label>
          <Input type="number" min={1} step={1} value={draft.periodsText} aria-invalid={!periodsValid} onChange={(e) => onChange({ periodsText: e.target.value })} />
        </div>
      </div>

      {isBackdated(draft.startDate, today) && (
        <div className="space-y-1 rounded-lg border border-warning/40 bg-warning-soft/60 p-2">
          <p className="text-xs text-warning-ink">ใบแจ้งหนี้ย้อนหลัง — เริ่มเรียนก่อนวันนี้ ใส่เหตุผลได้เลย</p>
          <Input value={draft.backdateRemark ?? ""} onChange={(e) => onChange({ backdateRemark: e.target.value })} placeholder="เช่น ลูกค้าจ่ายแล้ว ออกใบตามหลัง" />
        </div>
      )}

      {overlapTo && (
        <div className="space-y-1 rounded-lg border border-warning/40 bg-warning-soft/60 p-2">
          <p className="text-xs text-warning-ink">นักเรียนมีแพ็กเกจคอร์สนี้อยู่แล้วถึง {fmtDate(overlapTo)} — ซื้อซ้ำได้แต่ต้องใส่เหตุผล</p>
          <Input value={draft.overlapRemark} onChange={(e) => onChange({ overlapRemark: e.target.value })} placeholder="เช่น ต่อคอร์สล่วงหน้า" />
        </div>
      )}

      {q && course.unit === "hour" && (quote!.line.carryIn || q.leftoverMinutes > 0) && (
        <div className="space-y-1.5 rounded-lg border border-info/30 bg-info-soft/50 p-2 text-xs text-info-ink">
          {!!quote!.line.carryIn && <p>รวมเศษ <b>{quote!.line.carryIn} นาที</b> ที่เก็บไว้จากแพ็กก่อนของคอร์สนี้ให้แล้ว</p>}
          {q.leftoverMinutes > 0 && (
            <>
              <p>{course.duration * periods} ชม.{quote!.line.carryIn ? ` + ${quote!.line.carryIn} นาที` : ""} ได้ {q.slots.length - (draft.leftover === "extra" ? 1 : 0)} คาบเต็ม เหลือเศษ <b>{q.leftoverMinutes} นาที</b> — จะทำอย่างไรกับเศษนี้? *</p>
              <div className="flex flex-wrap gap-1.5">
                {LEFTOVER_CHOICES.map(([v, label]) => (
                  <Button variant="ghost" size="inline" key={v} type="button" aria-pressed={draft.leftover === v} onClick={() => onChange({ leftover: v })}
                    className={cn("rounded-full border px-2.5 py-1", draft.leftover === v ? "border-info bg-info text-white" : "border-info/40 bg-background hover:bg-info-soft")}>
                    {label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {q && (
        <div className="rounded-xl border">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/40 px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1 font-medium"><CalendarIcon className="size-3.5" /> {fmtDate(q.from, { weekday: true })} → {fmtDate(q.to, { year: true })}</span>
            <span>{q.sessions.length} คาบ · {q.hours} ชม.</span>
            {q.skipped.length > 0 && <span className="text-muted-foreground">ข้ามวันหยุด {q.skipped.map((d) => fmtDate(d)).join(", ")}</span>}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {q.periods.map((p) => (
                <tr key={p.month} className="border-b last:border-0">
                  <td className="px-3 py-1.5">{course.unit === "month" ? fmtMonth(p.month + "-01") : `${packageLabel(course)} × ${periods}`}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {p.sessions.length === 0 ? "—" : (
                      <HoverCard>
                        <HoverCardTrigger render={<Button variant="ghost" size="inline" type="button" className="cursor-default underline decoration-dotted underline-offset-4" />}>
                          {course.unit === "month" ? `${fmtDate(p.sessions[0])} → ${fmtDate(p.sessions[p.sessions.length - 1])} · ${p.sessions.length} คาบ` : `ดูวันเรียนทั้ง ${p.sessions.length} คาบ`}
                        </HoverCardTrigger>
                        <HoverCardContent align="start" className="max-h-72 w-52 overflow-y-auto">
                          <ol className="space-y-0.5 text-xs tabular-nums">
                            {p.sessions.map((d, i) => <li key={`${d}-${i}`} className="flex gap-2"><span className="w-5 text-right text-muted-foreground">{i + 1}</span>{fmtDate(d, { weekday: true })}</li>)}
                          </ol>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </td>
                  {course.unit === "month" && <td className="hidden px-3 py-1.5 text-right text-xs text-muted-foreground @md:table-cell">{`${p.weeks?.length ?? 0} สัปดาห์ → ${Math.round(p.factor * 100)}%`}</td>}
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">{fmtMoney(p.amount)}</td>
                </tr>
              ))}
              {quote!.promotion > 0 && (
                <tr className="text-success"><td className="px-3 py-1.5" colSpan={3}>โปรโมชัน · {quote!.promotionName}</td><td className="px-3 py-1.5 text-right tabular-nums">−{fmtMoney(quote!.promotion)}</td></tr>
              )}
              {quote!.bonusMinutes > 0 && (
                <tr className="text-success"><td className="px-3 py-1.5" colSpan={4}>โปรโมชัน · {quote!.bonusName} — แถมเวลาเรียนเพิ่ม {quote!.bonusMinutes / 60} ชม. (ราคาเท่าเดิม)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Where the bus goes: the family's map pin + directions from the parent form (owner 2026-09-30: bus is decided on the invoice). */
function FamilyPin({ family, branchLoc, radiusKm }: { family?: Family; branchLoc?: { lat: number; lng: number }; radiusKm?: number | null }) {
  if (!family) return <p className="self-end text-xs text-muted-foreground">เลือกนักเรียนก่อน เพื่อดูหมุดบ้าน</p>
  const loc = family.location
  return (
    <div className={cn("rounded-lg p-2 text-xs", loc ? "bg-muted/60" : "border border-warning/40 bg-warning-soft/60 text-warning-ink")}>
      {loc ? (
        <>
          <div className="flex items-center gap-1 font-medium"><MapPinIcon className="size-3.5 text-danger" /> ปักหมุดบ้านแล้ว
            <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="ml-auto text-primary underline">เปิดแผนที่</a>
          </div>
          {family.addressNote && <p className="mt-0.5 text-muted-foreground">ทาง: {family.addressNote}</p>}
          {family.address && <p className="text-muted-foreground">{family.address}</p>}
          {/* owner 2026-10-16: show the map itself, not just a link */}
          {branchLoc && <BusMap branch={branchLoc} home={loc} radiusKm={radiusKm} className="mt-2 h-56 overflow-hidden rounded-lg" />}
        </>
      ) : (
        <p className="flex items-start gap-1"><AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" /> ครอบครัวยังไม่ได้ปักหมุดบ้าน{family.address ? ` (มีที่อยู่: ${family.address})` : ""} — ขอให้ผู้ปกครองปักหมุดในฟอร์ม ก่อนจัดรถ</p>
      )}
    </div>
  )
}

/** Distance → bus fee band (owner 2026-10-16): suggests the type, flags "outside the bus area". */
function BusDistance({ km, zone, feeId, onUse }: { km: number | null; zone: ReturnType<typeof busZone> | null; feeId: string; onUse: (id: string) => void }) {
  if (km === null || !zone) return <p className="self-end text-xs text-muted-foreground">ยังวัดระยะไม่ได้ — ต้องมีหมุดบ้าน + หมุดสาขา (Settings › สาขา › ค่าธรรมเนียม)</p>
  const dist = `ห่างสาขา ${km.toFixed(1)} กม.`
  if (zone.outside) return <p className="flex items-start gap-1.5 self-end rounded-lg bg-danger-soft/60 p-2 text-xs text-danger-ink"><AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />{`${dist} — นอกพื้นที่รับส่ง (ไกลสุด ${zone.maxKm} กม.)`}</p>
  if (!zone.fee) return <p className="self-end text-xs text-muted-foreground">{`${dist} (เส้นตรง) — ยังไม่ได้ตั้งระยะของประเภทค่ารถ`}</p>
  const other = zone.fee.id !== feeId
  return (
    <p className={cn("flex flex-wrap items-center gap-1.5 self-end rounded-lg p-2 text-xs", other ? "bg-warning-soft/60 text-warning-ink" : "bg-success-soft/60 text-success-ink")}>
      <MapPinIcon className="size-3.5 shrink-0" />
      <span>{`${dist} (เส้นตรง) → ${zone.fee.name} (ไม่เกิน ${zone.fee.maxKm} กม.)`}</span>
      {other && <Button size="xs" variant="outline" className="ml-auto" onClick={() => onUse(zone.fee!.id)}>ใช้ประเภทนี้</Button>}
    </p>
  )
}

/** One ride's bus run next to its tick: the run time + seats taken, red when full, grey when there's no run. */
function RoundChip({ check, on }: { check: RoundCheck; on: boolean }) {
  if (!check.round) return <span className={cn("rounded-full px-1.5 py-0.5 text-2xs", on ? "bg-danger-soft font-medium text-danger-ink" : "bg-muted text-muted-foreground")}>ไม่มีรอบ</span>
  const r = check.round
  const label = check.full ? `${r.time} เต็ม ${check.taken}/${r.seats}` : `${r.time} · ${check.taken}/${r.seats}`
  return <span title={r.name} className={cn("rounded-full px-1.5 py-0.5 text-2xs whitespace-nowrap tabular-nums", check.full ? (on ? "bg-danger-soft font-medium text-danger-ink" : "bg-danger-soft/50 text-danger") : "bg-success-soft/60 text-success-ink")}>{label}</span>
}
