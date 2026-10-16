"use client"

// owner 2026-10-15/16: the enroll form is an invoice still missing two things the parent decides — which classes and
// the start date. The admin (who agreed the rest in the chat) puts in the course / package + periods, ticks the real
// classes to offer and, at Liclass, whether the bus is offered. The parent's answer comes back as a ready draft.
import { useMemo, useState } from "react"
import { BusIcon, SendIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/app/native-select"
import { subjectColor } from "@/components/app/subject-color"
import { endTime, fmtMoney, TH_DAYS_FULL } from "@/domain/dates"
import { classChoices } from "@/domain/rules/billing"
import { enrollClassOffers } from "@/domain/rules/forms"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { sendEnrollToChat } from "@/lib/forms"
import { useBranch, useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export function SendEnrollDialog({ conversationId, onClose }: { conversationId: ID; onClose: () => void }) {
  const branch = useBranch()
  const conv = useStore((s) => s.conversations.find((c) => c.id === conversationId))
  const classes = useStore((s) => s.classes)
  const allCourses = useStore((s) => s.courses)
  const staff = useStore((s) => s.staff)
  const lead = useStore((s) => s.leads.find((l) => l.id === conv?.leadId))
  const students = useStore((s) => s.students)
  const kids = students.filter((x) => conv?.familyId && x.familyId === conv.familyId && !x.archived)
  const L = useLookup()
  const branchId = conv?.branchId ?? branch.id
  const grade = lead?.childGrade ?? kids[0]?.grade ?? ""
  const courses = allCourses.filter((c) => c.branchId === branchId && c.active && (!grade || !c.grades.length || c.grades.includes(grade)))
  const offers = useMemo(() => enrollClassOffers(classes, branchId, (id) => L.teacher(id).label), [classes, branchId, L])
  const busOffered = branch.brand === "liclass" || branch.fees.some((f) => f.kind === "bus")

  const [courseId, setCourseId] = useState<ID>(() => courses.find((c) => lead?.subject && c.subjects.includes(lead.subject))?.id ?? "")
  const [periods, setPeriods] = useState(1)
  const [bus, setBus] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [picked, setPicked] = useState<Set<ID>>(new Set())
  const [busy, setBusy] = useState(false)
  const course = allCourses.find((c) => c.id === courseId)
  // classes that fit the course (no warning) first; "ทุกคลาส" shows the rest too
  const fits = new Set(classChoices(course, classes, branchId, staff, grade).filter((x) => !x.warnings.length).map((x) => x.klass.id))
  const shown = course ? offers.filter((o) => showAll || fits.has(o.id)) : []
  const toggle = (id: ID) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const send = async () => {
    if (!course) return
    setBusy(true)
    const plan = { course: { id: course.id, name: course.name, subjects: course.subjects, grades: course.grades, unit: course.unit, duration: course.duration, price: course.price + course.courseFee }, periods, bus: busOffered && bus }
    const r = await sendEnrollToChat(conversationId, offers.filter((o) => picked.has(o.id)), plan)
    setBusy(false)
    if (report(r, `ส่งใบสมัครเรียน · ${course.name} + ${picked.size} คลาสให้เลือกแล้ว`)) onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlusIcon className="size-5" /> ส่งใบสมัครเรียน</DialogTitle>
          <DialogDescription>เหมือนร่างใบแจ้งหนี้ — ใส่สิ่งที่ตกลงกันในแชทแล้ว ผู้ปกครองเลือกแค่คลาส + วันเริ่ม แล้วได้ร่างใบแจ้งหนี้กลับมาเลย</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <p className="text-sm font-semibold">1 · คอร์ส / แพ็กเกจ ที่ตกลงกัน</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_6rem]">
            <NativeSelect className="h-9" value={courseId} onChange={(e) => { setCourseId(e.target.value); setPicked(new Set()) }} placeholder={grade ? `เลือกคอร์ส (${grade})` : "เลือกคอร์ส"}
              options={courses.map((c) => ({ value: c.id, label: `${c.name} · ${fmtMoney(c.price + c.courseFee)}` }))} />
            <div className="flex items-center gap-1.5"><Input type="number" min={1} value={periods} onChange={(e) => setPeriods(Math.max(1, Number(e.target.value) || 1))} className="h-9" aria-label="งวด" /><Label className="shrink-0 text-xs text-muted-foreground">งวด</Label></div>
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm font-semibold">2 · คลาสที่จะเสนอ <span className="font-normal text-muted-foreground">(ผู้ปกครองเลือกได้หลายวัน)</span></p>
            {course && <button type="button" onClick={() => setShowAll(!showAll)} className={cn("h-7 rounded-full border px-2.5 text-xs", showAll ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>ทุกคลาส</button>}
          </div>
          <ul className="divide-y rounded-2xl border">
            {!course ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">เลือกคอร์สก่อน — จะแสดงคลาสที่เข้ากับคอร์สนี้</li>
              : shown.length ? shown.map((o) => {
                const full = o.seatsLeft === 0
                return (
                  <li key={o.id}>
                    <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40", picked.has(o.id) && "bg-primary/5")}>
                      <Checkbox checked={picked.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                      <span className={cn("size-2 shrink-0 rounded-full", subjectColor(o.subjects[0]).bar)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{o.name}{!fits.has(o.id) && <span className="ml-1.5 text-xs font-normal text-amber-700">ไม่ตรงคอร์ส</span>}</span>
                        <span className="block text-xs text-muted-foreground">ทุก{TH_DAYS_FULL[o.weekday]} {o.start}–{endTime(o.start, o.minutes)}{o.teacher ? ` · ${o.teacher}` : ""}{o.grades.length ? ` · ${o.grades.join(", ")}` : ""}</span>
                      </span>
                      <span className={cn("shrink-0 text-xs tabular-nums", full ? "font-medium text-red-600" : "text-muted-foreground")}>{full ? "เต็ม" : `ว่าง ${o.seatsLeft}`}</span>
                    </label>
                  </li>
                )
              }) : <li className="px-3 py-6 text-center text-sm text-muted-foreground">ไม่มีคลาสที่เข้ากับคอร์สนี้ — กด &quot;ทุกคลาส&quot;</li>}
          </ul>
        </section>

        {busOffered && (
          <section className="space-y-1">
            <p className="text-sm font-semibold">3 · รถรับส่ง</p>
            <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={bus} onCheckedChange={(v) => setBus(!!v)} />
              <span className="flex items-center gap-1.5"><BusIcon className="size-4 text-muted-foreground" />เสนอรถรับส่ง <span className="text-xs text-muted-foreground">— ผู้ปกครองเลือก ไป / กลับ / ไป-กลับ และปักหมุดบ้าน · คิดค่ารถตามราคาสาขาในใบแจ้งหนี้</span></span>
            </label>
          </section>
        )}

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">{course ? `${course.name} × ${periods} งวด · ${picked.size} คลาส` : "ยังไม่ได้เลือกคอร์ส"}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
            <Button disabled={!course || !picked.size || busy} onClick={send}><SendIcon /> ส่งในแชท</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
