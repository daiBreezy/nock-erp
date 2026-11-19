"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { FormShell } from "@/components/app/form-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InfoTip } from "@/components/app/info-tip"
import { Pill } from "@/components/app/badges"
import { tagChip } from "@/components/app/tags"
import { uid } from "@/data/seed"
import { addDays, fmtMoney, toDateStr } from "@/domain/dates"
import { classChoices, isBackdated, quoteLine } from "@/domain/rules/billing"
import { validateCreditCourse } from "@/domain/rules/credit"
import { lastAssessmentDate } from "@/domain/rules/forms"
import { closesBranch } from "@/domain/rules/scheduling"
import { isPartial } from "@/domain/rules/seats"
import type { CourseLine, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { CoursePicker } from "./course-picker"
import { LineCard, type LineDraft } from "./invoice-editor"

/**
 * Add a course straight to a student, before any invoice (owner 2026-11-19): the student studies now, the invoice is made
 * later from the same course (Invoice › Credit Course) and chased. The student carries a "Credit Course" tag until paid.
 */
export function CreditCourseDialog({ studentId, onClose }: { studentId: ID; onClose: () => void }) {
  const today = toDateStr(useNow(60_000))
  const stu = useStore((s) => s.students.find((x) => x.id === studentId))
  const branch = useStore((s) => s.branches.find((b) => b.id === stu?.branchId))
  const allCourses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const assessments = useStore((s) => s.assessments)
  const add = useStore((s) => s.addCreditCourse)
  const [lines, setLines] = useState<LineDraft[]>([])
  const [reason, setReason] = useState("")
  const [picking, setPicking] = useState(false)
  const [touched, setTouched] = useState(false)
  if (!stu || !branch) return null

  const courses = allCourses.filter((c) => c.branchId === branch.id)
  const last = lastAssessmentDate(stu.id, assessments)
  const firstStart = last && last >= today ? addDays(last, 1) : today
  const ctx = { branch, courses, classes, holidays }
  const toLine = (l: LineDraft): CourseLine => {
    const periods = Number(l.periodsText)
    const seats = Object.fromEntries(Object.entries(l.seats ?? {}).filter(([cid, seat]) => { const k = classes.find((x) => x.id === cid); return l.classIds.includes(cid) && !!k && isPartial(seat, k.minutes) }))
    return { id: l.id, courseId: l.courseId, classIds: l.classIds, startDate: l.startDate, periods: Number.isInteger(periods) && periods >= 1 ? periods : 0, backdateRemark: isBackdated(l.startDate, today) ? "Credit Course — เรียนก่อนจ่าย" : undefined, leftover: l.leftover, seats: Object.keys(seats).length ? seats : undefined }
  }
  const priced = lines.map((l) => quoteLine(toLine(l), ctx))
  const owed = priced.reduce((a, p) => a + Math.max(0, p.amount + p.courseFee - p.promotion), 0)
  const lineErrors = lines.flatMap((l, i) => {
    const v = validateCreditCourse({ courseId: l.courseId, classIds: l.classIds, periods: Number(l.periodsText), reason: "x" })
    const q = priced[i]?.quote
    const tag = lines.length > 1 ? `คอร์สที่ ${i + 1}: ` : ""
    return [...(!v.ok ? [`${tag}${v.error}`] : []), ...(q && q.leftoverMinutes > 0 && !l.leftover ? [`${tag}ชั่วโมงเหลือเศษ ${q.leftoverMinutes} นาที — เลือกว่าจะเก็บไว้ / เพิ่ม 1 คาบ / ตัดทิ้ง`] : []), ...(q && last && q.from <= last ? [`${tag}วันเริ่มเรียนต้องหลังวันสอบ/ทดลองเรียน`] : [])]
  })
  const errors = [...(!lines.length ? ["เลือกคอร์สอย่างน้อย 1 คอร์ส"] : []), ...lineErrors, ...(!reason.trim() ? ["ใส่เหตุผลที่ให้เรียนก่อนจ่าย"] : [])]

  const submit = () => {
    setTouched(true)
    if (errors.length) return
    const picked = lines.map((l) => { const { id: _id, ...line } = toLine(l); void _id; return line })
    if (!report(add({ studentId, lines: picked, reason }), (v) => `เพิ่ม Credit Course แล้ว — นักเรียนเข้าเรียนได้เลย · สร้างใบร่าง ${v.invoice.number} ให้แล้ว`)) return
    onClose()
  }

  return (
    <FormShell className="max-h-[92vh] sm:max-w-2xl" onClose={onClose} title={<>เพิ่มคอร์ส (Credit) <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", tagChip("studentCredit", "credit"))}>Credit Course</span></>}
      description="เพิ่มคอร์สให้นักเรียนเรียนได้ทันทีโดยยังไม่ออกใบแจ้งหนี้ — ยอดนี้ค้างเป็น Credit ของนักเรียน แล้วค่อยออกใบแจ้งหนี้จากคอร์สนี้ทีหลัง (ตอนสร้างใบจะเห็น Credit ที่ค้างอยู่) นักเรียนติดแท็ก Credit Course จนกว่าใบนั้นจะชำระครบ"
      footer={<>
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button onClick={submit} disabled={touched && errors.length > 0}>เพิ่มคอร์ส · ค้าง {fmtMoney(owed)}</Button>
      </>}>
      <p className="text-sm"><span className="font-semibold">{stu.nickname}</span> <span className="text-muted-foreground">{stu.name}</span></p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs">คอร์ส {lines.length > 0 && `(${lines.length})`}</Label>
          <Button size="xs" variant="outline" className="ml-auto" onClick={() => setPicking(true)}><PlusIcon /> เลือกคอร์ส</Button>
        </div>
        {lines.length === 0 && (
          <Button variant="dashed" size="inline" type="button" onClick={() => setPicking(true)} className="w-full rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground hover:bg-muted/40">
            ยังไม่มีคอร์ส — กดเพื่อเลือก
          </Button>
        )}
        {lines.map((l, i) => (
          <LineCard key={l.id} index={i} draft={l} quote={priced[i]} studentId={studentId} studentGrade={stu.grade}
            choices={classChoices(priced[i]?.course, classes, branch.id, staff, stu.grade)}
            today={today} closed={holidays.filter((h) => closesBranch(h, branch.id))} overlapTo={undefined}
            onChange={(patch) => setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, ...patch } : x)))} onRemove={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} />
        ))}
        {picking && (
          <CoursePicker branch={branch} today={today} studentGrade={stu.grade} studentId={studentId} onInvoice={lines.map((l) => l.courseId)} onClose={() => setPicking(false)}
            onConfirm={(cs) => { setLines((ls) => [...ls, ...cs.map((c) => ({ id: uid("ln"), courseId: c.id, periodsText: "1", overlapRemark: "", classIds: [] as string[], startDate: firstStart }))]); setPicking(false) }} />
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1 text-xs">เหตุผลที่ให้เรียนก่อนจ่าย * <InfoTip text="บันทึกไว้ในประวัติและแจ้ง Admin/Manager สาขา" /></Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ผู้ปกครองขอโอนวันศุกร์ / รอเงินเดือนออก" />
      </div>
      {owed > 0 && <p className="text-sm text-muted-foreground">ยอดที่จะค้างเป็น Credit <Pill tone="special">{fmtMoney(owed)}</Pill></p>}
      {touched && errors.length > 0 && <ul className="list-inside list-disc text-xs text-danger-ink">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    </FormShell>
  )
}
