"use client"

import { CustomerPicker } from "@/components/app/customer-picker"
import { COURSE_FORMAT_LABEL, packageLabel, priceUnitSuffix } from "@/domain/rules/course"
import { CoursePicker } from "./course-picker"
import { PackageBadge } from "@/components/app/package-badge"
import { busRate } from "@/domain/rules/settings"
import { useState } from "react"
import { AlertTriangleIcon, BusIcon, CalendarIcon, CheckIcon, HistoryIcon, MapPinIcon, PlusIcon, UserRoundSearchIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addDays, fmtDate, fmtMoney, fmtMonth, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { busTotal, carriedMinutes, classOptionsFor, defaultAdvance, defaultBusLegs, entryFeeWaiver, invoiceSessionDates, invoiceTotals, validateInvoiceDraft, type LineQuote } from "@/domain/rules/billing"
import { lastAssessmentDate } from "@/domain/rules/forms"
import type { AdvanceItem, BusLeg, CourseLine, Entitlement, Family, Invoice, Klass, Leftover } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type LineDraft = { id: string; courseId: string; classIds: string[]; startDate: string; periodsText: string; overlapRemark: string; leftover?: Leftover }

export function InvoiceEditor({ invoice, defaultStudentId, renewEntitlementId, onClose, onSaved }: { invoice?: Invoice; defaultStudentId?: string; renewEntitlementId?: string; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const branch = useBranch()
  const now = useNow(60_000)
  const today = toDateStr(now)
  const me = useStore((s) => s.userId)
  const students = useStore((s) => s.students).filter((s) => s.branchId === branch.id)
  const families = useStore((s) => s.families)
  const courses = useStore((s) => s.courses).filter((c) => c.branchId === branch.id && (c.active || !!invoice?.lines.some((l) => l.courseId === c.id)))
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useEntitlements()
  const assessments = useStore((s) => s.assessments)
  const save = useStore((s) => s.saveInvoice)
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
    invoice ? invoice.lines.map((l) => ({ id: l.id, courseId: l.courseId, classIds: l.classIds, startDate: l.startDate, periodsText: String(l.periods), overlapRemark: l.overlapRemark ?? "", leftover: l.leftover }))
      : renewFrom ? [{ id: uid("ln"), courseId: renewFrom.courseId, classIds: renewFrom.classIds, startDate: renewStart(renewFrom), periodsText: "1", overlapRemark: "" }]
        : [])
  const [bus, setBus] = useState<BusLeg[]>(invoice?.bus ?? [])
  const [busTouched, setBusTouched] = useState(!!invoice)
  const [bookFee, setBookFee] = useState(invoice?.bookFee ?? 0)
  const [busFeeId, setBusFeeId] = useState(invoice?.busFeeId ?? branch.fees.find((f) => f.kind === "bus")?.id ?? "")
  // Advance Optional: follows the default (entry fee unless already paid) until the admin ticks something
  const [advancePicked, setAdvancePicked] = useState<AdvanceItem[] | null>(invoice ? invoice.advance : null)
  const invoices = useStore((s) => s.invoices)
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
  const lineFor = (courseId: string): LineDraft => {
    const options = classOptionsFor(courses.find((c) => c.id === courseId), classes, branch.id)
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
  const rate = busRate(branch, busFeeId)

  const courseLines: CourseLine[] = lines.map((l) => {
    const periods = Number(l.periodsText)
    const overlap = studentId && Att.activeEntitlements(studentId, entitlements, l.startDate).some((e) => e.courseId === l.courseId)
    // hour packs: minutes this student kept from the previous package of this course come in automatically
    const course = courses.find((c) => c.id === l.courseId)
    const carryIn = course?.unit === "hour" && studentId ? carriedMinutes(studentId, l.courseId, entitlements, invoices, invoice?.id) : 0
    return { id: l.id, courseId: l.courseId, classIds: l.classIds, startDate: l.startDate, periods: Number.isInteger(periods) && periods >= 1 ? periods : 0, overlapRemark: overlap ? l.overlapRemark : undefined, carryIn: carryIn || undefined, leftover: l.leftover }
  })
  const base: Invoice = {
    id: newId,
    branchId: branch.id,
    studentId,
    number: invoice?.number ?? null,
    lines: courseLines,
    bus: [],
    busFeeId: busFeeId || null,
    bookFee, advance,
    concession: concession > 0 ? { amount: concession, remark: concessionRemark } : null,
    noteToParent: invoice?.noteToParent ?? "",
    status: "draft",
    pdf: "none",
    createdBy: invoice?.createdBy ?? me,
    createdAt: invoice?.createdAt ?? now.toISOString(),
    payments: [],
  }
  const ctx = { branch, courses, classes, holidays }
  // bus legs follow the real class days of every course, once per day; default ticked only if the student rides the bus (BL-6)
  const busDates = invoiceSessionDates(invoiceTotals(base, ctx).lines)
  const legs: BusLeg[] = !busTouched ? defaultBusLegs(busDates, !!student?.usesBus) : busDates.map((d) => bus.find((b) => b.date === d) ?? { date: d, pickup: false, dropoff: false })
  const draft: Invoice = { ...base, bus: legs }
  const totals = invoiceTotals(draft, ctx)
  const errors = [
    ...(!studentId ? ["เลือกนักเรียน"] : []),
    ...courseLines.filter((l) => l.overlapRemark !== undefined && !l.overlapRemark.trim()).map((l) => `นักเรียนมีแพ็กเกจ ${courses.find((c) => c.id === l.courseId)?.name ?? ""} อยู่แล้ว — ใส่เหตุผลที่ซื้อซ้ำ`),
    ...validateInvoiceDraft(draft, totals, { lastAssessment: studentId ? lastAssessmentDate(studentId, assessments) : null }),
  ]

  const submit = () => {
    const r = save(draft)
    if (report(r, "บันทึกใบร่างแล้ว — ยังไม่มีเลขที่ จะได้เลขตอนสร้าง PDF")) onSaved(r.value)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{invoice ? `แก้ใบแจ้งหนี้${invoice.number ? ` ${invoice.number}` : " (ร่าง)"}` : "สร้างใบแจ้งหนี้"}</DialogTitle>
          <DialogDescription>ราคาและจำนวนคาบคำนวณจากตารางเรียนจริง (ข้ามวันหยุด) — ตัวเลขชุดเดียวกับที่จะอยู่ใน PDF</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-xs">นักเรียน *</Label>
          {student ? (
            <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm">
              <span className="font-medium">{student.nickname}</span><span className="text-xs text-muted-foreground">{student.grade} · {student.name}</span>
              {student.imported && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800 dark:bg-sky-950 dark:text-sky-200">นักเรียนเก่า</span>}
              {!invoice && <button type="button" className="ml-auto text-xs text-primary underline" onClick={() => setPicking(true)}>เปลี่ยน</button>}
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
              {family && !family.parents.some((p) => p.lineLinked) && <span className="text-amber-700"> · ยังไม่ผูก LINE</span>}
            </p>
          )}
        </div>

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
                    <button key={e.id} type="button" onClick={() => renewPackage(e)}
                      className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                      {c?.name ?? "คอร์ส"} · {classes.filter((k) => e.classIds.includes(k.id)).map((k) => k.name).join(" + ") || "—"} · {e.to < today ? "หมด" : "ถึง"} {fmtDate(e.to)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {lines.length === 0 && (
            <button type="button" onClick={() => setPickingCourses(true)} className="w-full rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground hover:bg-muted/40">
              ยังไม่มีคอร์ส — กดเพื่อเลือก (เลือกได้หลายคอร์ส) · หรือเว้นไว้ถ้าเก็บเฉพาะค่าอื่นๆ
            </button>
          )}
          {lines.map((l, i) => (
            <LineCard key={l.id} index={i} draft={l} quote={totals.lines[i]} studentId={studentId} studentGrade={student?.grade}
              classes={classOptionsFor(totals.lines[i]?.course, classes, branch.id)}
              overlapTo={studentId ? Att.activeEntitlements(studentId, entitlements, l.startDate).find((e) => e.courseId === l.courseId)?.to : undefined}
              onChange={(patch) => patchLine(l.id, patch)} onRemove={() => removeLine(l.id)} />
          ))}
          {pickingCourses && (
            <CoursePicker branch={branch} today={today} studentGrade={student?.grade} onInvoice={lines.map((l) => l.courseId)} onClose={() => setPickingCourses(false)}
              onConfirm={(cs) => { setLines((ls) => [...ls, ...cs.map((c) => lineFor(c.id))]); setBusTouched(false); setPickingCourses(false) }} />
          )}
        </div>

        {busDates.length > 0 && (
          <details className="rounded-lg border" open={legs.some((l) => l.pickup || l.dropoff)}>
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <BusIcon className="size-4" /> ค่ารถ ({busFees.find((f) => f.id === busFeeId)?.name ?? "ค่ารถ"} {fmtMoney(rate)}/เที่ยว)
              <span className="ml-auto font-medium tabular-nums">{fmtMoney(busTotal(legs, rate))}</span>
            </summary>
            <div className="space-y-2 border-t px-3 py-2">
              <div className="grid gap-2 sm:grid-cols-[1fr_1.6fr]">
                <div className="space-y-1">
                  <Label className="text-xs">ประเภทค่ารถ</Label>
                  <NativeSelect value={busFeeId} onChange={(e) => setBusFeeId(e.target.value)}
                    placeholder={busFees.length ? undefined : `ค่าตั้งต้นของสาขา ${fmtMoney(branch.busFeePerLeg)}/เที่ยว`}
                    options={busFees.map((f) => ({ value: f.id, label: `${f.name} · ${fmtMoney(f.price)}/เที่ยว` }))} />
                </div>
                <FamilyPin family={family} />
              </div>
              <p className="text-xs text-muted-foreground">{student?.usesBus ? "นักเรียนใช้รถ — ติ๊กให้ตามรอบเรียนแล้ว" : "นักเรียนไม่ได้ใช้รถ — ติ๊กเฉพาะรอบที่ต้องการ"} · วันที่มีหลายคอร์สนับเป็นรอบเดียว</p>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={() => { setBusTouched(true); setBus(legs.map((l) => ({ ...l, pickup: true, dropoff: true }))) }}>ติ๊กทุกรอบ</Button>
                <Button size="xs" variant="ghost" onClick={() => { setBusTouched(true); setBus(legs.map((l) => ({ ...l, pickup: false, dropoff: false }))) }}>ไม่ใช้รถ</Button>
              </div>
              <div className="grid gap-1 sm:grid-cols-2">
                {legs.map((l, i) => (
                  <div key={l.date} className="flex items-center gap-3 text-sm">
                    <span className="w-24">{fmtDate(l.date, { weekday: true })}</span>
                    {(["pickup", "dropoff"] as const).map((k) => (
                      <label key={k} className="flex items-center gap-1.5">
                        <Checkbox checked={l[k]} onCheckedChange={(v) => { setBusTouched(true); setBus(legs.map((x, j) => (j === i ? { ...x, [k]: !!v } : x))) }} />
                        {k === "pickup" ? "รับ" : "ส่ง"}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {advanceFees.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Advance Optional (ค่าแรกเข้า / สอบ)</Label>
            <div className="flex flex-wrap gap-1.5">
              {advanceFees.map((f) => {
                const on = advance.some((a) => a.feeId === f.id)
                const paidBefore = f.kind === "entry" && waiver
                return (
                  <button key={f.id} type="button" aria-pressed={on}
                    onClick={() => setAdvancePicked(on ? advance.filter((a) => a.feeId !== f.id) : [...advance, { feeId: f.id, name: f.name, amount: f.price }])}
                    className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                    {on && <CheckIcon className="size-3" />}{f.name} · {fmtMoney(advance.find((a) => a.feeId === f.id)?.amount ?? f.price)}
                    {paidBefore && <span className="text-muted-foreground">({waiver.reason === "imported" ? "นักเรียนเก่า" : "เคยจ่ายแล้ว"})</span>}
                  </button>
                )
              })}
            </div>
            {waiver?.reason === "imported" && (
              <p className="flex items-start gap-1.5 rounded-lg bg-sky-50 p-2 text-xs text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                <HistoryIcon className="mt-0.5 size-3.5 shrink-0" />
                <span><b>นักเรียนเก่า</b> — นำเข้าจาก{waiver.source} ({fmtDate(waiver.at.slice(0, 10), { year: true })}) เคยซื้อคอร์สกับเราแล้ว <b>ไม่ต้องเก็บค่าแรกเข้า</b></span>
              </p>
            )}
            {waiver?.reason === "paid" && <p className="text-xs text-muted-foreground">ยกเว้นค่าแรกเข้าให้อัตโนมัติ — จ่ายแล้วในใบ {waiver.invoice.number}</p>}
            {!waiver && studentId && advancePicked === null && advance.length > 0 && <p className="text-xs text-muted-foreground">นักเรียนยังไม่เคยจ่ายค่าแรกเข้า — ใส่ให้แล้ว กดเพื่อเอาออกได้</p>}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-xs">ค่าหนังสือ</Label><Input type="number" min={0} value={bookFee} onChange={(e) => setBookFee(Math.max(0, Number(e.target.value)))} /></div>
          <div className="space-y-1"><Label className="text-xs">ส่วนลดพิเศษ (Concession)</Label><Input type="number" min={0} value={concession} onChange={(e) => setConcession(Math.max(0, Number(e.target.value)))} /></div>
        </div>
        {concession > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">เหตุผลของส่วนลด *</Label>
            <Textarea rows={2} value={concessionRemark} onChange={(e) => setConcessionRemark(e.target.value)} placeholder="ทุกส่วนลดต้องมีเหตุผล" aria-invalid={!concessionRemark.trim()} />
          </div>
        )}

        <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm tabular-nums">
          {[["ค่าเรียน", totals.course], ["Course fee", totals.courseFee], ["ค่ารถ", totals.bus], ["ค่าหนังสือ", totals.book], ["Advance (ค่าแรกเข้า/สอบ)", totals.advance]].filter(([, v]) => (v as number) > 0).map(([l, v]) => (
            <div key={l as string} className="flex justify-between"><span>{l}</span><span>{fmtMoney(v as number)}</span></div>
          ))}
          {totals.promotion > 0 && <div className="flex justify-between text-emerald-700"><span>โปรโมชัน</span><span>−{fmtMoney(totals.promotion)}</span></div>}
          {totals.concession > 0 && <div className="flex justify-between text-emerald-700"><span>ส่วนลดพิเศษ</span><span>−{fmtMoney(totals.concession)}</span></div>}
          <div className={cn("flex justify-between border-t pt-1 text-base font-semibold", totals.total < 0 && "text-red-700")}><span>ยอดรวม</span><span>{fmtMoney(totals.total)}</span></div>
        </div>

        <DialogFooter className="items-center">
          {errors.length > 0 && <span className="mr-auto text-xs text-red-700">{errors[0]}</span>}
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={errors.length > 0} onClick={submit}>บันทึกร่าง</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** One course on the invoice: its class, start date, periods and the real-schedule quote. */
const WEEKDAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
const LEFTOVER_CHOICES: [Leftover, string][] = [["carry", "เก็บไว้กับนักเรียน (รวมแพ็กถัดไป)"], ["extra", "เพิ่ม +1 คาบ (ไม่เก็บเงินเพิ่ม)"], ["drop", "ตัดเศษทิ้ง"]]

function LineCard({ index, draft, quote, studentId, studentGrade, classes, overlapTo, onChange, onRemove }: {
  index: number; draft: LineDraft; quote?: LineQuote; studentId: string; studentGrade?: string; classes: Klass[]; overlapTo?: string
  onChange: (patch: Partial<LineDraft>) => void; onRemove: () => void
}) {
  const staff = useStore((s) => s.staff)
  const course = quote?.course
  const [day, setDay] = useState<number | null>(null)
  const chosen = classes.filter((k) => draft.classIds.includes(k.id))
  const days = [...new Set(classes.map((k) => k.weekday))].sort()
  const toggleClass = (id: string) => onChange({ classIds: draft.classIds.includes(id) ? draft.classIds.filter((x) => x !== id) : [...draft.classIds, id] })
  const periods = Number(draft.periodsText)
  const periodsValid = Number.isInteger(periods) && periods >= 1
  const q = quote?.quote
  const mismatch = studentGrade && course && !course.grades.includes(studentGrade)
  if (!course) return null
  return (
    <div className="space-y-2.5 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-medium">{course.name} <PackageBadge course={course} /></div>
          <p className="text-xs text-muted-foreground">
            {course.kind === "bundle" ? "Bundle" : "Single"} · เรียน{COURSE_FORMAT_LABEL[course.format]} · {fmtMoney(course.price)} {priceUnitSuffix(course)}
            {course.courseFee > 0 && ` · Course fee ${fmtMoney(course.courseFee)}`}
          </p>
          {mismatch && <p className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangleIcon className="size-3" /> เกรด {studentGrade} ไม่ตรงกับคอร์ส ({course.grades.join(", ")})</p>}
        </div>
        <Button size="icon-xs" variant="ghost" aria-label="เอาคอร์สนี้ออก" onClick={onRemove}><XIcon /></Button>
      </div>

      {/* one course, several classes (อ. + พฤ.) — each counted as its own class (owner 2026-09-30) */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Label className="mr-1 text-xs">คลาสที่จะเรียน * {chosen.length > 0 && <span className="text-muted-foreground">({chosen.length} คลาส)</span>}</Label>
          {days.length > 1 && [null, ...days].map((d) => (
            <button key={d ?? "all"} type="button" onClick={() => setDay(d)}
              className={cn("rounded-full px-2 py-0.5 text-[11px]", day === d ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground")}>
              {d === null ? "ทุกวัน" : WEEKDAY_SHORT[d]}
            </button>
          ))}
        </div>
        {classes.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีคลาสเรียน{COURSE_FORMAT_LABEL[course.format]}ที่เปิดสำหรับวิชานี้</p>}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {classes.filter((k) => day === null || k.weekday === day || draft.classIds.includes(k.id)).map((k) => {
            const t = staff.find((x) => x.id === k.teacherId)
            const full = k.studentIds.length >= (k.type === "single" ? 1 : 6) && !k.studentIds.includes(studentId)
            const on = draft.classIds.includes(k.id)
            return (
              <button key={k.id} type="button" disabled={full && !on} onClick={() => toggleClass(k.id)} aria-pressed={on}
                className={cn("flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs disabled:opacity-50", on ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
                <span className="min-w-0">
                  <span className="block font-medium">{WEEKDAY_SHORT[k.weekday]} {k.start} · {k.name}</span>
                  <span className="text-muted-foreground">
                    {t?.active ? `ครู${t.nickname}` : <span className="text-amber-700">ยังไม่มีครู</span>} · {k.minutes} นาที · {k.studentIds.length} คน{full ? " (เต็ม)" : ""}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">เริ่มเรียนตั้งแต่</Label>
          <Input type="date" value={draft.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">จำนวน{course.unit === "month" ? "เดือน" : "แพ็ก"} *</Label>
          <Input type="number" min={1} step={1} value={draft.periodsText} aria-invalid={!periodsValid} onChange={(e) => onChange({ periodsText: e.target.value })} />
        </div>
      </div>

      {overlapTo && (
        <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-2 dark:bg-amber-950/30">
          <p className="text-xs text-amber-900 dark:text-amber-200">นักเรียนมีแพ็กเกจคอร์สนี้อยู่แล้วถึง {fmtDate(overlapTo)} — ซื้อซ้ำได้แต่ต้องใส่เหตุผล</p>
          <Input value={draft.overlapRemark} onChange={(e) => onChange({ overlapRemark: e.target.value })} placeholder="เช่น ต่อคอร์สล่วงหน้า" />
        </div>
      )}

      {q && course.unit === "hour" && (quote!.line.carryIn || q.leftoverMinutes > 0) && (
        <div className="space-y-1.5 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          {!!quote!.line.carryIn && <p>รวมเศษ <b>{quote!.line.carryIn} นาที</b> ที่เก็บไว้จากแพ็กก่อนของคอร์สนี้ให้แล้ว</p>}
          {q.leftoverMinutes > 0 && (
            <>
              <p>{course.duration * periods} ชม.{quote!.line.carryIn ? ` + ${quote!.line.carryIn} นาที` : ""} ได้ {q.slots.length - (draft.leftover === "extra" ? 1 : 0)} คาบเต็ม เหลือเศษ <b>{q.leftoverMinutes} นาที</b> — จะทำอย่างไรกับเศษนี้? *</p>
              <div className="flex flex-wrap gap-1.5">
                {LEFTOVER_CHOICES.map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={draft.leftover === v} onClick={() => onChange({ leftover: v })}
                    className={cn("rounded-full border px-2.5 py-1", draft.leftover === v ? "border-sky-700 bg-sky-700 text-white" : "border-sky-300 bg-background hover:bg-sky-100 dark:hover:bg-sky-900")}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {q && (
        <div className="rounded-lg border">
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
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{p.sessions.map((d) => fmtDate(d)).join(", ") || "—"}</td>
                  <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">{course.unit === "month" ? `${p.weeks?.length ?? 0} สัปดาห์ · ${p.sessions.length} คาบ → ${Math.round(p.factor * 100)}%` : `${p.sessions.length} คาบ`}</td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">{fmtMoney(p.amount)}</td>
                </tr>
              ))}
              {quote!.promotion > 0 && (
                <tr className="text-emerald-700"><td className="px-3 py-1.5" colSpan={3}>โปรโมชัน · {quote!.promotionName}</td><td className="px-3 py-1.5 text-right tabular-nums">−{fmtMoney(quote!.promotion)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Where the bus goes: the family's map pin + directions from the parent form (owner 2026-09-30: bus is decided on the invoice). */
function FamilyPin({ family }: { family?: Family }) {
  if (!family) return <p className="self-end text-xs text-muted-foreground">เลือกนักเรียนก่อน เพื่อดูหมุดบ้าน</p>
  const loc = family.location
  return (
    <div className={cn("rounded-lg p-2 text-xs", loc ? "bg-muted/60" : "border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200")}>
      {loc ? (
        <>
          <div className="flex items-center gap-1 font-medium"><MapPinIcon className="size-3.5 text-rose-600" /> ปักหมุดบ้านแล้ว
            <a href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" className="ml-auto text-primary underline">เปิดแผนที่</a>
          </div>
          {family.addressNote && <p className="mt-0.5 text-muted-foreground">ทาง: {family.addressNote}</p>}
          {family.address && <p className="text-muted-foreground">{family.address}</p>}
        </>
      ) : (
        <p className="flex items-start gap-1"><AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" /> ครอบครัวยังไม่ได้ปักหมุดบ้าน{family.address ? ` (มีที่อยู่: ${family.address})` : ""} — ขอให้ผู้ปกครองปักหมุดในฟอร์ม ก่อนจัดรถ</p>
      )}
    </div>
  )
}
