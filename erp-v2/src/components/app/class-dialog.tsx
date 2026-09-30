"use client"

import { useState } from "react"
import { AlertTriangleIcon, BanIcon, BookOpenIcon, CheckIcon, InfoIcon, PlusIcon, TrashIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addDays, endTime, fmtDate, nextWeekday, TH_DAYS_FULL, toDateStr, toMinutes, weekdayOf, fromMinutes } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { packageLabel } from "@/domain/rules/course"
import { blockStartsFor, canSave, CAPACITY, GENERATE_WEEKS, isHoliday, overlappingRows, validateClass, type ClassDraft, type Issue } from "@/domain/rules/scheduling"
import { sortGrades } from "@/domain/rules/settings"
import type { ClassKind, ClassLayout, ClassType, DateStr, ID, TimeStr, Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { CustomerPicker } from "./customer-picker"
import { NativeSelect } from "./native-select"
import { gradeTone, subjectColor } from "./subject-color"

export interface ClassPrefill {
  date?: DateStr
  start?: TimeStr
  teacherId?: ID | null
  roomId?: ID | null
}

const KIND: { value: ClassKind; label: string }[] = [
  { value: "learning", label: "เรียน (Learning · ทุกสัปดาห์)" },
  { value: "test", label: "สอบ (Test · ครั้งเดียว)" },
  { value: "interview", label: "คุยผู้ปกครอง (Interview · ครั้งเดียว)" },
  { value: "other", label: "อื่นๆ (ครั้งเดียว)" },
]
const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

interface Row { key: string; weekday: Weekday; start: TimeStr; end: TimeStr }
let rowSeq = 0
const newRow = (weekday: Weekday, start: TimeStr, minutes: number): Row => ({ key: `r${rowSeq++}`, weekday, start, end: endTime(start, minutes) })

/**
 * Create New Class (owner design 2026-09-28): subject/teachers/grades/type set once, then any number of
 * weekday + start–end rows → one class per row. Session length is free in 5-minute steps (it drives
 * hour-package counting). Every row shows its clashes with existing classes before anything is created.
 */
export function ClassDialog({ prefill, onClose }: { prefill: ClassPrefill; onClose: () => void }) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const holidays = useStore((s) => s.holidays)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses).filter((c) => c.branchId === branch.id && c.active)
  const createClasses = useStore((s) => s.createClasses)
  const branchStudents = students.filter((s) => s.branchId === branch.id)
  const now = useNow(60_000)
  const startDay = prefill.date ?? toDateStr(now)

  // NockAcademy mostly lays classes out as a teacher's 2-hour block; both layouts exist for both brands (owner 2026-09-30)
  const [layout, setLayout] = useState<ClassLayout>(branch.brand === "nockacademy" ? "teacher" : "subject")
  const [courseId, setCourseId] = useState("")
  const [name, setName] = useState("")
  const [subjects, setSubjects] = useState<string[]>(branch.subjects.slice(0, 1))
  const [grades, setGrades] = useState<string[]>([])
  const [kind, setKind] = useState<ClassKind>("learning")
  const [type, setType] = useState<ClassType>("group")
  const [teacherId, setTeacherId] = useState<string>(prefill.teacherId ?? "")
  const [supportId, setSupportId] = useState<string>("")
  const [roomId, setRoomId] = useState<string>(prefill.roomId ?? "")
  const [startDate, setStartDate] = useState<DateStr>(startDay)
  const [rows, setRows] = useState<Row[]>([newRow(weekdayOf(startDay) as Weekday, prefill.start ?? "16:00", branch.defaultSessionMinutes)])
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [pickingStudent, setPickingStudent] = useState(false)
  const [overrideReason, setOverrideReason] = useState("")

  const course = courses.find((c) => c.id === courseId)
  const teachers = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  const teaches = (t: (typeof teachers)[number]) => subjects.some((s) => t.subjects.includes(s))
  const minutesOf = (r: Row) => toMinutes(r.end) - toMinutes(r.start)
  const slot = (r: Row) => ({ weekday: r.weekday, start: r.start, minutes: minutesOf(r) })

  const teacher = staff.find((t) => t.id === teacherId)
  // a teacher block teaches whatever its teacher teaches — any subject, any grade
  const classSubjects = layout === "teacher" ? (teacher?.subjects.filter((x) => branch.subjects.includes(x)) ?? []) : subjects
  const base: Omit<ClassDraft, "weekday" | "start" | "minutes"> = {
    branchId: branch.id, layout, subject: classSubjects[0] ?? "", subjects: classSubjects, kind, type, courseId: layout === "teacher" ? null : courseId || null,
    teacherId: teacherId || null, coTeacherIds: supportId ? [supportId] : [], roomId: roomId || null, startDate, studentIds, overrideReason,
  }
  const rowIssues = rows.map((r) => validateClass({ ...base, ...slot(r) }, { branch, staff, sessions, holidays, now }))
  // messages every row shares (subject, teacher, capacity…) show once; the rest belong to their row
  const shared = rowIssues[0]?.filter((i) => rowIssues.every((list) => list.some((x) => x.message === i.message))) ?? []
  const own = (list: Issue[]) => list.filter((i) => !shared.some((x) => x.message === i.message))
  const selfClash = overlappingRows(rows.map(slot))
  const all = rowIssues.flat()
  const blocked = all.some((i) => i.level === "block") || selfClash.length > 0 || (layout === "teacher" && !teacherId)
  const needsReason = all.some((i) => i.level === "override")
  const ok = !blocked && rowIssues.every((list) => canSave(list, overrideReason))

  const occurrences = (r: Row) => {
    const first = nextWeekday(startDate, r.weekday)
    const dates = kind === "learning" ? Array.from({ length: GENERATE_WEEKS }, (_, i) => addDays(first, i * 7)) : [first]
    return dates.filter((d) => !isHoliday(d, branch.id, holidays)).length
  }
  const totalSessions = rows.reduce((n, r) => n + occurrences(r), 0)

  const pickCourse = (id: string) => {
    setCourseId(id)
    const c = courses.find((x) => x.id === id)
    if (c) { setSubjects(c.subjects); setGrades(sortGrades(c.grades)) }
  }
  const toggleSubject = (s: string) => setSubjects((x) => (x.includes(s) ? (x.length > 1 ? x.filter((y) => y !== s) : x) : [...x, s]))
  const setRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const addRow = () => {
    const last = rows[rows.length - 1]
    setRows([...rows, newRow(last ? (((last.weekday + 1) % 7) as Weekday) : 1, last?.start ?? "16:00", last ? minutesOf(last) : branch.defaultSessionMinutes)])
  }

  const submit = () => {
    const r = createClasses({ ...base, name, grades: layout === "teacher" ? [] : grades.length ? grades : [...new Set(studentIds.map((id) => students.find((s) => s.id === id)!.grade))] }, rows.map(slot))
    if (report(r, (v) => `สร้าง ${v.classes} คลาสแล้ว · รวม ${v.sessions} คาบ`)) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>สร้างคลาส · สาขา{branch.name}</DialogTitle>
          <DialogDescription>ตั้งวิชา ครู ระดับชั้นครั้งเดียว แล้วเพิ่มได้หลายวัน/เวลา — ได้ 1 คลาสต่อ 1 แถว · ระบบเช็คชนให้ทุกแถวก่อนสร้าง</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {([["teacher", "ครู + ช่วงเวลา", "ช่วงสอน 2 ชม. ของครู — นักเรียนหลายวิชา/หลายระดับเรียนด้วยกันได้"], ["subject", "วิชา + ระดับชั้น", "คลาสของวิชาเดียว ระดับชั้นที่กำหนด"]] as const).map(([k, label, hint]) => (
            <button key={k} type="button" aria-pressed={layout === k} onClick={() => setLayout(k)}
              className={cn("rounded-2xl border p-3 text-left", layout === k ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted/40")}>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </button>
          ))}
        </div>

        {/* optional course link */}
        {layout === "subject" && <>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed p-3">
          <BookOpenIcon className="size-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">เลือกคอร์ส <span className="text-xs font-normal text-muted-foreground">(ไม่บังคับ)</span></p>
            <p className="text-xs text-muted-foreground">{course ? `${course.subjects.join(" + ")} · ${packageLabel(course)} — คาบของคลาสนี้หักจากแพ็กเกจของคอร์สนี้` : "ผูกเพื่อให้รู้ว่าคาบนี้หักจากแพ็กเกจไหน และขึ้นในหน้าคอร์ส"}</p>
          </div>
          <NativeSelect className="h-9 w-full sm:w-64" value={courseId} onChange={(e) => pickCourse(e.target.value)} placeholder="ไม่ผูกคอร์ส"
            options={courses.map((c) => ({ value: c.id, label: c.name }))} />
        </div>

        </>}
        <Field label={layout === "teacher" ? "ชื่อคลาส (เว้นว่าง = ครู + วัน + เวลา)" : "ชื่อคลาส (เว้นว่าง = ตั้งจากวิชา + ระดับชั้น)"}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={layout === "teacher" ? `ครู${teacher?.nickname ?? "…"} · พ. 17:00` : `${subjects.join(" + ")} ${grades.join(", ")}`.trim()} />
        </Field>
        {layout === "subject" && <>

        <Field label="วิชา (เลือกได้หลายวิชา)" issue={subjects.length > 1 && course && course.unit !== "month" ? "คลาสหลายวิชาใช้กับคอร์สแพ็กเกจรายเดือนเท่านั้น" : undefined}>
          <div className="flex flex-wrap gap-2">
            {branch.subjects.map((s) => {
              const on = subjects.includes(s)
              return (
                <button key={s} type="button" onClick={() => toggleSubject(s)}
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", on ? cn("border-transparent", subjectColor(s).chip) : "hover:bg-muted")}>
                  {on && <CheckIcon className="size-3.5" />}{s}
                </button>
              )
            })}
          </div>
          {subjects.length > 1 && <p className="mt-1 text-xs text-muted-foreground">คลาสรวมหลายวิชา (เช่น Math 15 นาที + Eng 30 นาที) — เขียนสรุปการเรียนครั้งเดียวต่อคาบ ใช้กับแพ็กเกจรายเดือน</p>}
        </Field>

        </>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={layout === "teacher" ? "ครู *" : "ครู"} hint={layout === "teacher" ? (teacher ? `สอน: ${classSubjects.join(", ") || "—"}` : "วิชาของคลาสมาจากครู") : "แสดงครูที่สอนวิชาที่เลือกก่อน"}>
            <NativeSelect value={teacherId} onChange={(e) => setTeacherId(e.target.value)} placeholder="ยังไม่เลือกครู"
              options={[...teachers.filter(teaches), ...teachers.filter((t) => !teaches(t))].map((t) => ({ value: t.id, label: teaches(t) ? t.nickname : `${t.nickname} (ไม่ได้สอนวิชานี้)` }))} />
          </Field>
          <Field label="Support Teacher" hint="ไม่บังคับ · เลือกครูคนไหนก็ได้">
            <NativeSelect value={supportId} onChange={(e) => setSupportId(e.target.value)} placeholder="ไม่มี"
              options={teachers.filter((t) => t.id !== teacherId).map((t) => ({ value: t.id, label: t.nickname }))} />
          </Field>
        </div>

        {layout === "subject" && (
        <Field label="ระดับชั้น" action={grades.length > 0 ? <button type="button" className="text-xs text-primary underline" onClick={() => setGrades([])}>ล้างทั้งหมด</button> : undefined}>
          <div className="flex flex-wrap gap-1.5">
            {sortGrades(branch.grades).map((g) => {
              const on = grades.includes(g)
              return (
                <button key={g} type="button" onClick={() => setGrades((x) => sortGrades(on ? x.filter((y) => y !== g) : [...x, g]))}
                  className={cn("flex items-center gap-1 rounded-full border px-3 py-1 text-sm", on ? cn("border-transparent", gradeTone(g)) : "hover:bg-muted")}>
                  {on && <CheckIcon className="size-3" />}{g}
                </button>
              )
            })}
          </div>
        </Field>

        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="ใช้สำหรับ (Class for)">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as ClassKind)} options={KIND} />
          </Field>
          <Field label="รูปแบบ (Class type)">
            <NativeSelect value={type} onChange={(e) => setType(e.target.value as ClassType)} options={[{ value: "group", label: `ปกติ (แนะนำไม่เกิน ${CAPACITY.group} คน)` }, { value: "single", label: `ป้ายเรียนเดี่ยว (แนะนำไม่เกิน ${CAPACITY.single} คน)` }]} />
          </Field>
          <Field label="ห้อง">
            <NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ยังไม่ระบุห้อง" options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} />
          </Field>
        </div>

        {/* Date & Time rows */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-3">
            <p className="text-sm font-semibold">วันและเวลา</p>
            <Field label="เริ่มตั้งแต่" className="ml-auto"><Input className="h-8 w-40" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          </div>
          {rows.map((r, i) => {
            const mins = minutesOf(r)
            const mine = own(rowIssues[i] ?? [])
            const clashWith = selfClash.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a) + 1)
            return (
              <div key={r.key} className={cn("rounded-2xl border p-2.5", (mine.some((x) => x.level === "block") || clashWith.length) && "border-red-300 bg-red-50/40")}>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="วัน">
                    <NativeSelect className="h-9 w-32" value={String(r.weekday)} onChange={(e) => setRow(r.key, { weekday: Number(e.target.value) as Weekday })}
                      options={WEEK.map((d) => ({ value: String(d), label: TH_DAYS_FULL[d] }))} />
                  </Field>
                  <Field label="เวลาเริ่ม"><Input className="h-9 w-28" type="time" step={300} value={r.start} onChange={(e) => setRow(r.key, { start: e.target.value, end: fromMinutes(toMinutes(e.target.value) + Math.max(mins, 5)) })} /></Field>
                  <span className="pb-2 text-muted-foreground">–</span>
                  <Field label="เวลาจบ"><Input className="h-9 w-28" type="time" step={300} value={r.end} onChange={(e) => setRow(r.key, { end: e.target.value })} /></Field>
                  <span className={cn("pb-2 text-xs", mins >= 5 && mins % 5 === 0 ? "text-muted-foreground" : "text-red-700")}>{mins > 0 ? `${mins} นาที` : "เวลาจบต้องหลังเวลาเริ่ม"}</span>
                  <span className="pb-2 text-xs text-muted-foreground">· {occurrences(r)} คาบ</span>
                  {/* the branch's standard blocks for that day (Settings → เวลาเปิด-ปิด) */}
                  {blockStartsFor(branch, r.weekday).length > 0 && (
                    <span className="flex w-full flex-wrap gap-1 pt-1">
                      {blockStartsFor(branch, r.weekday).map((t) => {
                        const len = branch.blocks?.minutes ?? 120
                        const on = r.start === t && mins === len
                        return <button key={t} type="button" onClick={() => setRow(r.key, { start: t, end: fromMinutes(toMinutes(t) + len) })}
                          className={cn("rounded-full border px-2.5 py-0.5 text-xs", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{t}–{fromMinutes(toMinutes(t) + len)}</button>
                      })}
                    </span>
                  )}
                  {rows.length > 1 && <Button size="icon-sm" variant="ghost" className="mb-0.5 ml-auto" aria-label="ลบแถว" onClick={() => setRows(rows.filter((x) => x.key !== r.key))}><TrashIcon /></Button>}
                </div>
                {(mine.length > 0 || clashWith.length > 0) && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {clashWith.map((n) => <IssueRow key={`self${n}`} icon={<BanIcon />} tone="text-red-700" text={`ทับกับแถว ${n} (วันเดียวกัน เวลาซ้อน)`} />)}
                    {mine.map((x) => <IssueRow key={x.message} icon={x.level === "block" ? <BanIcon /> : x.level === "override" ? <AlertTriangleIcon /> : <InfoIcon />} tone={x.level === "block" ? "text-red-700" : x.level === "override" ? "text-amber-700" : "text-muted-foreground"} text={x.message} />)}
                  </ul>
                )}
                {mine.length === 0 && clashWith.length === 0 && <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-700"><CheckIcon className="size-3.5" /> ไม่ชนกับคลาสที่มีอยู่</p>}
              </div>
            )
          })}
          <button type="button" onClick={addRow} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed py-2.5 text-sm text-primary hover:bg-primary/5">
            <PlusIcon className="size-4" /> เพิ่มวัน/เวลา
          </button>
        </div>

        <Field label={`นักเรียน (${studentIds.length} คน · แนะนำไม่เกิน ${CAPACITY[type]}) — ไม่บังคับ เพิ่มทีหลังได้`}>
          <div className="space-y-2">
            {studentIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {studentIds.map((id) => {
                  const s = branchStudents.find((x) => x.id === id)
                  if (!s) return null
                  const mismatch = grades.length > 0 && Att.gradeMismatch(s, { grades })
                  return (
                    <span key={id} className={cn("flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs", mismatch ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "bg-primary/10 text-primary")}>
                      {s.nickname} · {s.grade}{mismatch && " · ชั้นไม่ตรงคลาส"}
                      <button type="button" aria-label={`เอา ${s.nickname} ออก`} onClick={() => setStudentIds((x) => x.filter((y) => y !== id))} className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"><XIcon className="size-3" /></button>
                    </span>
                  )
                })}
              </div>
            )}
            {studentIds.length < CAPACITY[type] && (
              <button type="button" onClick={() => setPickingStudent(true)} className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed py-2 text-sm text-primary hover:bg-primary/5">
                <PlusIcon className="size-4" /> เพิ่มนักเรียน
              </button>
            )}
          </div>
          {pickingStudent && (
            <CustomerPicker kinds={["student"]} title="เลือกนักเรียน" excludeIds={studentIds} onClose={() => setPickingStudent(false)}
              onConfirm={(row) => { setStudentIds((x) => [...x, row.id]); setPickingStudent(false) }} />
          )}
        </Field>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <b>จะสร้าง {rows.length} คลาส · รวม {totalSessions} คาบ</b>
          <span className="text-muted-foreground"> · {rows.map((r) => `${TH_DAYS_FULL[r.weekday]} ${r.start}–${r.end}`).join(" · ")} · เริ่ม {fmtDate(startDate, { weekday: true })}</span>
        </div>

        {shared.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {shared.map((i) => <IssueRow key={i.message} icon={i.level === "block" ? <BanIcon /> : i.level === "override" ? <AlertTriangleIcon /> : <InfoIcon />} tone={i.level === "block" ? "text-red-700" : i.level === "override" ? "text-amber-700" : "text-muted-foreground"} text={i.message} />)}
          </ul>
        )}
        {needsReason && !blocked && (
          <Field label="เหตุผลที่ยืนยันสร้าง * (มีรายการสีเหลืองที่ต้องยืนยัน)">
            <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} placeholder="เช่น สอนชดเชยวันหยุด" />
          </Field>
        )}

        <DialogFooter className="items-center">
          {!ok && <span className="mr-auto text-xs text-red-700">{blocked ? "แก้รายการสีแดงก่อน" : "ใส่เหตุผลเพื่อยืนยัน"}</span>}
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!ok} onClick={submit}>สร้าง {rows.length > 1 ? `${rows.length} คลาส` : "คลาส"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, hint, children, className, issue, action }: { label: string; hint?: string; children: React.ReactNode; className?: string; issue?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2"><Label className="text-xs">{label}</Label>{action && <span className="ml-auto">{action}</span>}</div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {issue && <p className="text-xs text-red-700">{issue}</p>}
    </div>
  )
}

function IssueRow({ icon, tone, text }: { icon: React.ReactNode; tone: string; text: string }) {
  return <li className={cn("flex items-start gap-2 [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", tone)}>{icon}{text}</li>
}
