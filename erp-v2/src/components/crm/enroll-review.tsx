"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangleIcon, CheckIcon, ClipboardListIcon, ReceiptIcon, UserPlusIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtDate, fmtDateTime, fmtMoney, toDateStr } from "@/domain/dates"
import { classChoices } from "@/domain/rules/billing"
import { matchExistingFamily } from "@/domain/rules/people"
import type { EnrollSubmission, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { fetchEnrollSubmissions, markEnrollReviewed } from "@/lib/forms"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const PKG = { month: "รายเดือน", hour: "แพ็กชั่วโมง", week: "รายสัปดาห์", unsure: "ยังไม่แน่ใจ" } as const
const DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const PERIOD = { am: "เช้า", pm: "บ่าย", eve: "เย็น" } as Record<string, string>
const timeLabel = (k: string) => { const [d, p] = k.split("-"); return `${DAYS[Number(d)]} ${PERIOD[p]}` }

/** Enroll-now applications waiting at the top of CRM (owner 2026-10-05). */
export function EnrollInbox({ branchId }: { branchId: ID }) {
  const [subs, setSubs] = useState<EnrollSubmission[]>([])
  const [open, setOpen] = useState<EnrollSubmission | null>(null)
  const load = () => fetchEnrollSubmissions().then(setSubs)
  useEffect(() => { load() }, [])
  const pending = subs.filter((x) => x.status === "pending" && x.branchId === branchId).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  if (!pending.length) return null
  return (
    <section className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900">
      <p className="mb-2 flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100"><UserPlusIcon className="size-5" /> ใบสมัครเรียนรอจัดคลาส ({pending.length})</p>
      <ul className="space-y-1.5">
        {pending.map((x) => {
          const p = x.parents.find((y) => y.primary) ?? x.parents[0]
          return (
            <li key={x.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-background px-3 py-2 text-sm">
              <span className="font-medium">{x.children.map((c) => `${c.nickname || c.name} (${c.grade})`).join(", ")}</span>
              <span className="text-muted-foreground">· {p?.name} {p?.phone}</span>
              <span className="text-xs text-muted-foreground">· {x.leadId ? "Admin ส่งลิงก์" : "จาก Rich Menu"} · {fmtDateTime(x.submittedAt)}</span>
              <Button size="xs" className="ml-auto" onClick={() => setOpen(x)}>จัดคลาส + ออกใบแจ้งหนี้</Button>
            </li>
          )
        })}
      </ul>
      {open && <EnrollReviewDialog sub={open} onClose={() => setOpen(null)} onDone={load} />}
    </section>
  )
}

interface Plan { courseId: ID; classId: ID; startDate: string; periods: number }

/**
 * Review an application: what the parent asked for, then per child the course + class (fit warnings shown, never a
 * block), start date and periods → family + student + "สมัครตรง" lead + draft invoice in one go.
 */
function EnrollReviewDialog({ sub, onClose, onDone }: { sub: EnrollSubmission; onClose: () => void; onDone: () => void }) {
  const s = useStore()
  const approve = useStore((st) => st.approveEnrollment)
  const today = toDateStr(useNow(60_000))
  const courses = s.courses.filter((c) => c.branchId === sub.branchId && c.active)
  const matched = matchExistingFamily(s.families, { lineUserId: sub.lineUserId, phones: sub.parents.map((p) => p.phone) })
  const [plans, setPlans] = useState<Plan[]>(() => sub.children.map((c) => {
    const course = courses.find((x) => c.courseIds.includes(x.id)) ?? courses.find((x) => x.grades.includes(c.grade) && x.subjects.some((y) => c.subjects.includes(y)) && (c.pkg === "unsure" || x.unit === c.pkg))
    return { courseId: course?.id ?? "", classId: "", startDate: c.startDate > today ? c.startDate : today, periods: 1 }
  }))
  const [busy, setBusy] = useState(false)
  const put = (i: number, patch: Partial<Plan>) => setPlans((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch, ...(patch.courseId ? { classId: "" } : {}) } : p)))
  const ready = plans.every((p) => p.courseId && p.classId && p.startDate)

  const submit = async () => {
    setBusy(true)
    const r = approve(sub, plans.map((p, i) => ({ childIndex: i, courseId: p.courseId, classIds: [p.classId], startDate: p.startDate, periods: p.periods })))
    if (report(r, (v) => `สร้างนักเรียน ${v.studentIds.length} คน + ร่างใบแจ้งหนี้ ${v.invoiceIds.length} ใบแล้ว — ตรวจแล้วส่งให้ผู้ปกครองได้เลย`)) {
      await markEnrollReviewed(sub.id, "approved", r.value.studentIds)
      onDone(); onClose()
    }
    setBusy(false)
  }
  const reject = async () => { await markEnrollReviewed(sub.id, "rejected"); report({ ok: true, value: undefined }, "ปิดใบสมัครแล้ว"); onDone(); onClose() }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardListIcon className="size-5" /> ใบสมัครเรียน · ส่งเมื่อ {fmtDateTime(sub.submittedAt)}</DialogTitle>
          <DialogDescription>เลือกคอร์สและคลาสให้แต่ละคน → ระบบสร้างครอบครัว นักเรียน Lead &quot;สมัครตรง&quot; (รอชำระ) และร่างใบแจ้งหนี้ให้ · ตอบเป็นภาษา {sub.lang.toUpperCase()}</DialogDescription>
        </DialogHeader>
        <section className="space-y-1 rounded-2xl border p-3 text-sm">
          <p className="font-medium">ผู้ปกครอง</p>
          {sub.parents.map((p, i) => <p key={i}>{p.name} · {p.phone}{p.relationship ? ` · ${p.relationship}` : ""}{p.primary ? " · ผู้ติดต่อหลัก" : ""}</p>)}
          {sub.familyAddress && <p className="text-muted-foreground">{[sub.familyAddress, sub.familyProvince, sub.familyPostcode].filter(Boolean).join(" ")}</p>}
          {sub.taxInfo?.taxId && <p className="text-muted-foreground">ใบกำกับภาษี: {sub.taxInfo.customerName} · {sub.taxInfo.taxId}</p>}
          <p className={cn("text-xs", matched ? "text-amber-700" : "text-muted-foreground")}>{matched ? `พบครอบครัวเดิม "${matched.name}" (LINE หรือเบอร์ตรงกัน) — จะเพิ่มนักเรียนเข้าครอบครัวนี้` : "ครอบครัวใหม่"}</p>
        </section>
        {sub.children.map((c, i) => {
          const p = plans[i]
          const course = courses.find((x) => x.id === p.courseId)
          const choices = course ? classChoices(course, s.classes, sub.branchId, s.staff, c.grade) : []
          const warn = choices.find((x) => x.klass.id === p.classId)?.warnings ?? []
          return (
            <section key={i} className="space-y-2 rounded-2xl border p-3 text-sm">
              <p className="font-medium">{c.name}{c.nickname ? ` (${c.nickname})` : ""} · {c.grade}{c.school ? ` · ${c.school}` : ""}</p>
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p>อยากเรียน: <span className="text-foreground">{[...c.subjects, ...c.courseIds.map((id) => courses.find((x) => x.id === id)?.name ?? "")].filter(Boolean).join(", ") || "—"}</span></p>
                <p>แพ็กเกจ: <span className="text-foreground">{PKG[c.pkg]}</span></p>
                <p>สะดวก: <span className="text-foreground">{c.times.map(timeLabel).join(", ")}</span></p>
                <p>อยากเริ่ม: <span className="text-foreground">{fmtDate(c.startDate, { weekday: true })}</span>{c.bus ? " · ต้องการรถรับส่ง" : ""}</p>
                {c.placement && <p className="text-amber-700 sm:col-span-2">ขอให้ครูประเมินระดับในคาบแรก (จะบันทึกในโน้ตนักเรียน)</p>}
                {c.note && <p className="sm:col-span-2">โน้ต: {c.note}</p>}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_9rem_5rem]">
                <div className="space-y-1"><Label className="text-xs">คอร์ส *</Label>
                  <NativeSelect className="h-9" value={p.courseId} onChange={(e) => put(i, { courseId: e.target.value })} placeholder="เลือกคอร์ส"
                    options={courses.map((x) => ({ value: x.id, label: `${x.name} · ${fmtMoney(x.price + x.courseFee)}` }))} /></div>
                <div className="space-y-1"><Label className="text-xs">คลาส *</Label>
                  <NativeSelect className="h-9" value={p.classId} onChange={(e) => put(i, { classId: e.target.value })} placeholder={course ? "เลือกคลาส" : "เลือกคอร์สก่อน"} disabled={!course}
                    options={choices.map((x) => ({ value: x.klass.id, label: `${x.klass.name} · ${DAYS[x.klass.weekday]} ${x.klass.start}${x.warnings.length ? " ⚠" : ""}` }))} /></div>
                <div className="space-y-1"><Label className="text-xs">เริ่มเรียน *</Label><Input type="date" min={today} value={p.startDate} onChange={(e) => put(i, { startDate: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">งวด</Label><Input type="number" min={1} value={p.periods} onChange={(e) => put(i, { periods: Math.max(1, Number(e.target.value) || 1) })} /></div>
              </div>
              {warn.length > 0 && <p className="flex items-start gap-1 text-xs text-amber-700"><AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />{warn.join(" · ")} (เลือกได้ — แค่เตือน)</p>}
            </section>
          )
        })}
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" className="text-muted-foreground" onClick={reject}><XIcon /> ปิดใบสมัคร (ไม่รับ)</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>ไว้ก่อน</Button>
            <Button disabled={!ready || busy} onClick={submit}><ReceiptIcon /> สร้างนักเรียน + ร่างใบแจ้งหนี้</Button>
          </div>
        </DialogFooter>
        <p className="text-right text-[11px] text-muted-foreground">ร่างใบจะอยู่ที่หน้า <Link href="/billing" className="underline">Billing</Link> — ตรวจ อนุมัติ แล้วส่งตามขั้นตอนปกติ · จ่ายครบ = เข้าคลาสอัตโนมัติ <CheckIcon className="inline size-3" /></p>
      </DialogContent>
    </Dialog>
  )
}
