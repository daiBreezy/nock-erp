"use client"

import { useState } from "react"
import { AlertTriangleIcon, BusIcon, CalendarIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtMoney, fmtMonth, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { busTotal, defaultBusLegs, invoiceTotals, quoteCourse, validateInvoiceDraft } from "@/domain/rules/billing"
import type { BusLeg, Invoice } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export function InvoiceEditor({ invoice, onClose, onSaved }: { invoice?: Invoice; onClose: () => void; onSaved: (inv: Invoice) => void }) {
  const branch = useBranch()
  const now = useNow(60_000)
  const today = toDateStr(now)
  const me = useStore((s) => s.userId)
  const students = useStore((s) => s.students).filter((s) => s.branchId === branch.id)
  const families = useStore((s) => s.families)
  const courses = useStore((s) => s.courses).filter((c) => c.branchId === branch.id)
  const packages = useStore((s) => s.packages)
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useStore((s) => s.entitlements)
  const save = useStore((s) => s.saveInvoice)

  const [newId] = useState(() => invoice?.id ?? uid("inv"))
  const [studentId, setStudentId] = useState(invoice?.studentId ?? "")
  const [courseId, setCourseId] = useState(invoice?.course?.courseId ?? "")
  const [classId, setClassId] = useState(invoice?.course?.classId ?? "")
  const [startDate, setStartDate] = useState(invoice?.course?.startDate ?? today)
  const [periodsText, setPeriodsText] = useState(String(invoice?.course?.periods ?? 1))
  const [overlapRemark, setOverlapRemark] = useState(invoice?.course?.overlapRemark ?? "")
  const [bus, setBus] = useState<BusLeg[]>(invoice?.bus ?? [])
  const [busTouched, setBusTouched] = useState(!!invoice)
  const [bookFee, setBookFee] = useState(invoice?.bookFee ?? 0)
  const [advanceFee, setAdvanceFee] = useState(invoice?.advanceFee ?? 0)
  const [concession, setConcession] = useState(invoice?.concession?.amount ?? 0)
  const [concessionRemark, setConcessionRemark] = useState(invoice?.concession?.remark ?? "")

  const student = students.find((s) => s.id === studentId)
  const family = families.find((f) => f.id === student?.familyId)
  const course = courses.find((c) => c.id === courseId)
  const pkg = packages.find((p) => p.id === course?.packageId)
  // BL-12: only active recurring classes with an active teacher for this course's subject
  const classOptions = classes.filter((k) => k.branchId === branch.id && k.active && k.kind === "learning" && k.subject === course?.subject)
  const klass = classOptions.find((k) => k.id === classId)
  const periods = Number(periodsText)
  const periodsValid = Number.isInteger(periods) && periods >= 1

  const quote = pkg && klass ? quoteCourse({ pkg, klass, startDate, periods: periodsValid ? periods : 1, holidays }) : null
  const q = quote?.ok ? quote.value : null

  // bus legs follow the real session dates; default ticked only if the student rides the bus (BL-6)
  const legs: BusLeg[] = !q
    ? []
    : !busTouched
      ? defaultBusLegs(q.sessions, !!student?.usesBus)
      : q.sessions.map((d) => bus.find((b) => b.date === d) ?? { date: d, pickup: false, dropoff: false })

  const overlapping = course && student ? Att.activeEntitlements(student.id, entitlements, startDate).filter((e) => e.courseId === course.id) : []
  const mismatch = student && course && Att.gradeMismatch(student, course)

  const draft: Invoice = {
    id: newId,
    branchId: branch.id,
    studentId,
    number: invoice?.number ?? null,
    course: course ? { courseId, classId, startDate, periods: periodsValid ? periods : 0, overlapRemark: overlapping.length ? overlapRemark : undefined } : null,
    bus: legs,
    bookFee, advanceFee,
    concession: concession > 0 ? { amount: concession, remark: concessionRemark } : null,
    noteToParent: invoice?.noteToParent ?? "",
    status: "draft",
    pdf: "none",
    createdBy: invoice?.createdBy ?? me,
    createdAt: invoice?.createdAt ?? now.toISOString(),
    payments: [],
  }
  const totals = invoiceTotals(draft, { branch, courses, packages, classes, holidays })
  const errors = [
    ...(!studentId ? ["เลือกนักเรียน"] : []),
    ...(!periodsValid && course ? ["จำนวนงวดต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป"] : []),
    ...(overlapping.length && !overlapRemark.trim() ? ["นักเรียนมีแพ็กเกจคอร์สนี้อยู่แล้ว — ใส่เหตุผลที่ซื้อซ้ำ"] : []),
    ...validateInvoiceDraft(draft, totals),
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">นักเรียน *</Label>
            <NativeSelect value={studentId} onChange={(e) => { setStudentId(e.target.value); setBusTouched(false) }} placeholder="เลือกนักเรียน"
              options={students.map((s) => ({ value: s.id, label: `${s.nickname} · ${s.grade} · ${s.name}` }))} />
            {student && (
              <p className="text-xs text-muted-foreground">
                {family ? `${family.name} · ${family.parents.find((p) => p.primary)?.name}` : "ยังไม่ผูกครอบครัว"}
                {family && !family.parents.some((p) => p.lineLinked) && <span className="text-amber-700"> · ยังไม่ผูก LINE</span>}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">คอร์ส</Label>
            <NativeSelect value={courseId} onChange={(e) => { setCourseId(e.target.value); setClassId("") }} placeholder="ไม่มีคอร์ส (เฉพาะค่าอื่นๆ)"
              options={courses.map((c) => {
                const p = packages.find((x) => x.id === c.packageId)
                return { value: c.id, label: `${c.name} · ${p ? fmtMoney(p.price) : ""}/${p?.unit === "month" ? "เดือน" : `${p?.hours} ชม.`}` }
              })} />
            {mismatch && <p className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangleIcon className="size-3" /> เกรด {student!.grade} ไม่ตรงกับคอร์ส ({course!.grades.join(", ")})</p>}
          </div>

          {course && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">คลาสที่จะเรียน *</Label>
                <NativeSelect value={classId} onChange={(e) => { setClassId(e.target.value); setBusTouched(false) }} placeholder={classOptions.length ? "เลือกคลาส" : "ไม่มีคลาสที่เปิดสำหรับวิชานี้"}
                  options={classOptions.map((k) => {
                    const t = staff.find((x) => x.id === k.teacherId)
                    const full = k.studentIds.length >= (k.type === "single" ? 1 : 6)
                    return { value: k.id, label: `${k.name} · ${["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."][k.weekday]} ${k.start} · ${t?.active ? t.nickname : "ยังไม่มีครู"} · ${k.studentIds.length} คน${full ? " (เต็ม)" : ""}`, disabled: full && !k.studentIds.includes(studentId) }
                  })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">เริ่มเรียนตั้งแต่</Label>
                  <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setBusTouched(false) }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">จำนวน{pkg?.unit === "month" ? "เดือน" : "แพ็ก"} *</Label>
                  <Input type="number" min={1} step={1} value={periodsText} aria-invalid={!periodsValid} onChange={(e) => setPeriodsText(e.target.value)} />
                  {!periodsValid && <p className="text-xs text-red-700">ต้องเป็นจำนวนเต็ม ≥ 1</p>}
                </div>
              </div>
            </>
          )}
        </div>

        {overlapping.length > 0 && (
          <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-200">นักเรียนมีแพ็กเกจคอร์สนี้อยู่แล้วถึง {fmtDate(overlapping[0].to)} — ซื้อซ้ำได้แต่ต้องใส่เหตุผล</p>
            <Input value={overlapRemark} onChange={(e) => setOverlapRemark(e.target.value)} placeholder="เช่น ต่อคอร์สล่วงหน้า" />
          </div>
        )}

        {q && (
          <div className="rounded-lg border">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/40 px-3 py-2 text-sm">
              <span className="flex items-center gap-1 font-medium"><CalendarIcon className="size-4" /> {fmtDate(q.from, { weekday: true })} → {fmtDate(q.to, { year: true })}</span>
              <span>{q.sessions.length} คาบ · {q.hours} ชม.</span>
              {q.skipped.length > 0 && <span className="text-muted-foreground">ข้ามวันหยุด {q.skipped.map((d) => fmtDate(d)).join(", ")}</span>}
            </div>
            <table className="w-full text-sm">
              <tbody>
                {q.periods.map((p) => (
                  <tr key={p.month} className="border-b last:border-0">
                    <td className="px-3 py-1.5">{pkg?.unit === "month" ? fmtMonth(p.month + "-01") : `${pkg?.hours} ชม. × ${periods}`}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{p.sessions.map((d) => fmtDate(d)).join(", ") || "—"}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">{pkg?.unit === "month" ? `${p.sessions.length} คาบ → ${Math.round(p.factor * 100)}%` : ""}</td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">{fmtMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {q && (
          <details className="rounded-lg border" open={legs.some((l) => l.pickup || l.dropoff)}>
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <BusIcon className="size-4" /> ค่ารถ ({fmtMoney(branch.busFeePerLeg)}/เที่ยว)
              <span className="ml-auto font-medium tabular-nums">{fmtMoney(busTotal(legs, branch.busFeePerLeg))}</span>
            </summary>
            <div className="border-t px-3 py-2">
              <p className="mb-2 text-xs text-muted-foreground">{student?.usesBus ? "นักเรียนใช้รถ — ติ๊กให้ตามรอบเรียนแล้ว" : "นักเรียนไม่ได้ใช้รถ — ติ๊กเฉพาะรอบที่ต้องการ"}</p>
              <div className="mb-2 flex gap-2">
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

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1"><Label className="text-xs">ค่าหนังสือ</Label><Input type="number" min={0} value={bookFee} onChange={(e) => setBookFee(Math.max(0, Number(e.target.value)))} /></div>
          <div className="space-y-1"><Label className="text-xs">ค่าอื่นๆ / สอบ</Label><Input type="number" min={0} value={advanceFee} onChange={(e) => setAdvanceFee(Math.max(0, Number(e.target.value)))} /></div>
          <div className="space-y-1"><Label className="text-xs">ส่วนลดพิเศษ (Concession)</Label><Input type="number" min={0} value={concession} onChange={(e) => setConcession(Math.max(0, Number(e.target.value)))} /></div>
        </div>
        {concession > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">เหตุผลของส่วนลด *</Label>
            <Textarea rows={2} value={concessionRemark} onChange={(e) => setConcessionRemark(e.target.value)} placeholder="ทุกส่วนลดต้องมีเหตุผล" aria-invalid={!concessionRemark.trim()} />
          </div>
        )}

        <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm tabular-nums">
          {[["ค่าเรียน", totals.course], ["ค่ารถ", totals.bus], ["ค่าหนังสือ", totals.book], ["ค่าอื่นๆ", totals.advance]].filter(([, v]) => (v as number) > 0).map(([l, v]) => (
            <div key={l as string} className="flex justify-between"><span>{l}</span><span>{fmtMoney(v as number)}</span></div>
          ))}
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
