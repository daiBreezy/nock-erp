"use client"

import { useState } from "react"
import { AlertTriangleIcon, BanIcon, InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addDays, endTime, fmtDate, nextWeekday, TH_DAYS_FULL, toDateStr, weekdayOf } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { canSave, CAPACITY, GENERATE_WEEKS, isHoliday, validateClass, type ClassDraft } from "@/domain/rules/scheduling"
import type { ClassKind, ClassType, DateStr, ID, TimeStr, Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { NativeSelect } from "./native-select"

export interface ClassPrefill {
  date?: DateStr
  start?: TimeStr
  teacherId?: ID | null
  roomId?: ID | null
}

const KIND: { value: ClassKind; label: string }[] = [
  { value: "learning", label: "เรียนประจำ (ทุกสัปดาห์)" },
  { value: "test", label: "สอบ / Test (ครั้งเดียว)" },
  { value: "interview", label: "คุยผู้ปกครอง (ครั้งเดียว)" },
  { value: "other", label: "อื่นๆ (ครั้งเดียว)" },
]

export function ClassDialog({ prefill, onClose }: { prefill: ClassPrefill; onClose: () => void }) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const holidays = useStore((s) => s.holidays)
  const students = useStore((s) => s.students)
  const createClass = useStore((s) => s.createClass)
  const now = useNow(60_000)
  const today = prefill.date ?? toDateStr(now)

  const [name, setName] = useState("")
  const [subject, setSubject] = useState(branch.subjects[0])
  const [grades, setGrades] = useState<string[]>([])
  const [kind, setKind] = useState<ClassKind>("learning")
  const [type, setType] = useState<ClassType>("group")
  const [teacherId, setTeacherId] = useState<string>(prefill.teacherId ?? "")
  const [roomId, setRoomId] = useState<string>(prefill.roomId ?? "")
  const [startDate, setStartDate] = useState<DateStr>(today)
  const [start, setStart] = useState<TimeStr>(prefill.start ?? "16:00")
  const [minutes, setMinutes] = useState(branch.defaultSessionMinutes) // E3: branch default, not a fixed 2 h
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [overrideReason, setOverrideReason] = useState("")

  const weekday = weekdayOf(startDate) as Weekday
  const draft: ClassDraft = { branchId: branch.id, subject, kind, type, teacherId: teacherId || null, roomId: roomId || null, weekday, start, minutes, startDate, studentIds, overrideReason }
  const issues = validateClass(draft, { branch, staff, sessions, holidays, now })
  const blocks = issues.filter((i) => i.level === "block")
  const overrides = issues.filter((i) => i.level === "override")
  const warns = issues.filter((i) => i.level === "warn")
  const ok = canSave(issues, overrideReason)

  const teachers = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  const first = nextWeekday(startDate, weekday)
  const dates = kind === "learning" ? Array.from({ length: GENERATE_WEEKS }, (_, i) => addDays(first, i * 7)) : [first]
  const skipped = dates.filter((d) => isHoliday(d, branch.id, holidays))
  const branchStudents = students.filter((s) => s.branchId === branch.id)

  const submit = () => {
    const r = createClass({ ...draft, name, grades: grades.length ? grades : [...new Set(studentIds.map((id) => students.find((s) => s.id === id)!.grade))] })
    if (report(r, (v) => `สร้างคลาส "${v.klass.name}" แล้ว · ${v.sessions} คาบ`)) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>สร้างคลาส · สาขา{branch.name}</DialogTitle>
          <DialogDescription>ระบบตรวจครูชน / ห้องเต็ม / เวลาเปิดสาขา / จำนวนนักเรียน ให้ทันทีขณะกรอก</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ประเภท">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as ClassKind)} options={KIND} />
          </Field>
          <Field label="ชื่อคลาส (ไม่ใส่ = ตั้งจากวิชา+เกรด)">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${subject} ${grades.join(", ")}`} />
          </Field>
          <Field label="วิชา *">
            <NativeSelect value={subject} onChange={(e) => setSubject(e.target.value)} options={branch.subjects.map((s) => ({ value: s, label: s }))} />
          </Field>
          <Field label="รูปแบบ">
            <NativeSelect value={type} onChange={(e) => setType(e.target.value as ClassType)} options={[{ value: "group", label: `กลุ่ม (ไม่เกิน ${CAPACITY.group} คน)` }, { value: "single", label: "เดี่ยว (1 คน)" }]} />
          </Field>
          <Field label="เกรด" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {branch.grades.map((g) => (
                <button key={g} type="button" onClick={() => setGrades((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]))}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs", grades.includes(g) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label={`วันเริ่ม (${TH_DAYS_FULL[weekday]})`}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="เวลาเริ่ม">
              <Input type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="ความยาว (นาที)">
              <Input type="number" min={15} step={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </Field>
          </div>
          <Field label="ครู" issue={issues.find((i) => i.field === "teacherId" && i.level !== "warn")?.message}>
            <NativeSelect value={teacherId} onChange={(e) => setTeacherId(e.target.value)} placeholder="ยังไม่กำหนดครู"
              options={teachers.map((t) => ({ value: t.id, label: `${t.nickname}${t.subjects.includes(subject) ? "" : " (ไม่ได้สอนวิชานี้)"}` }))} />
          </Field>
          <Field label="ห้อง" issue={issues.find((i) => i.field === "roomId")?.message}>
            <NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ยังไม่ระบุห้อง" options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} />
          </Field>
          <Field label={`นักเรียน (${studentIds.length}/${CAPACITY[type]})`} className="sm:col-span-2" issue={issues.find((i) => i.field === "studentIds")?.message}>
            <div className="flex flex-wrap gap-1.5">
              {branchStudents.map((s) => {
                const on = studentIds.includes(s.id)
                const mismatch = grades.length > 0 && Att.gradeMismatch(s, { grades })
                return (
                  <button key={s.id} type="button" onClick={() => setStudentIds((x) => (on ? x.filter((y) => y !== s.id) : [...x, s.id]))}
                    className={cn("rounded-full border px-2.5 py-0.5 text-xs", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted", mismatch && !on && "border-dashed text-muted-foreground")}
                    title={mismatch ? "เกรดไม่ตรงกับคลาส" : undefined}>
                    {s.nickname} · {s.grade}{mismatch ? " ⚠" : ""}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <b>จะสร้าง {dates.length - skipped.length} คาบ</b> · ทุกวัน{TH_DAYS_FULL[weekday]} {start}–{endTime(start, minutes)} · เริ่ม {fmtDate(first, { weekday: true })}
          {skipped.length > 0 && <span className="text-muted-foreground"> · ข้ามวันหยุด {skipped.map((d) => fmtDate(d)).join(", ")}</span>}
        </div>

        {(blocks.length > 0 || overrides.length > 0 || warns.length > 0) && (
          <ul className="space-y-1.5 text-sm">
            {blocks.map((i) => <IssueRow key={i.message} icon={<BanIcon />} tone="text-red-700" text={i.message} />)}
            {overrides.map((i) => <IssueRow key={i.message} icon={<AlertTriangleIcon />} tone="text-amber-700" text={`${i.message} — สร้างได้ถ้าใส่เหตุผล`} />)}
            {warns.map((i) => <IssueRow key={i.message} icon={<InfoIcon />} tone="text-muted-foreground" text={i.message} />)}
          </ul>
        )}
        {overrides.length > 0 && blocks.length === 0 && (
          <Field label="เหตุผลที่ยืนยันสร้าง *">
            <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} placeholder="เช่น สอนชดเชยวันหยุด" />
          </Field>
        )}

        <DialogFooter className="items-center">
          {!ok && <span className="mr-auto text-xs text-red-700">{blocks[0]?.message ?? "ใส่เหตุผลเพื่อยืนยัน"}</span>}
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!ok} onClick={submit}>สร้างคลาส</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, className, issue }: { label: string; children: React.ReactNode; className?: string; issue?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs">{label}</Label>
      {children}
      {issue && <p className="text-xs text-red-700">{issue}</p>}
    </div>
  )
}

function IssueRow({ icon, tone, text }: { icon: React.ReactNode; tone: string; text: string }) {
  return <li className={cn("flex items-start gap-2 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", tone)}>{icon}{text}</li>
}
