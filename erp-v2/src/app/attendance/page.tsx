"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { addDays, endOfMonth, fmtDate, fmtMonth, toDateStr, weekdayOf } from "@/domain/dates"
import { sessionState } from "@/domain/rules/scheduling"
import type { ID } from "@/domain/types"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Range = "week" | "month"

/** Attendance report — every number is limited to the chosen period (C8) and real subjects (C9). */
export default function AttendancePage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const students = useStore((s) => s.students)
  const staff = useStore((s) => s.staff)
  const [range, setRange] = useState<Range>("week")
  const [anchor, setAnchor] = useState(today)
  const [subject, setSubject] = useState("")
  const [teacher, setTeacher] = useState("")
  const [openId, setOpenId] = useState<ID | null>(null)

  const from = range === "week" ? addDays(anchor, -((weekdayOf(anchor) + 6) % 7)) : anchor.slice(0, 8) + "01"
  const to = range === "week" ? addDays(from, 6) : endOfMonth(anchor)
  const step = (dir: number) => setAnchor(range === "week" ? addDays(anchor, 7 * dir) : toDateStr(new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1 + dir, 1)))

  const inRange = sessions.filter((s) => s.branchId === branch.id && !s.cancelled && s.date >= from && s.date <= to && sessionState(s, now) !== "upcoming" && (!subject || s.subject === subject) && (!teacher || s.teacherId === teacher))
  const ids = new Set(inRange.map((s) => s.id))
  const att = attendance.filter((a) => ids.has(a.sessionId))
  const expected = inRange.reduce((n, s) => n + s.studentIds.length, 0)
  const count = (st: string) => att.filter((a) => a.status === st).length
  const cards = [
    { label: "คาบที่เรียนไปแล้ว", value: inRange.length, tone: "" },
    { label: "มา", value: count("present"), tone: "text-emerald-700" },
    { label: "ขาด", value: count("absent"), tone: "text-red-700" },
    { label: "ลา", value: count("leave"), tone: "text-amber-700" },
    { label: "ยังไม่เช็คชื่อ", value: Math.max(0, expected - att.length), tone: "text-red-700" },
  ]

  const perStudent = students
    .filter((s) => s.branchId === branch.id)
    .map((s) => {
      const mine = att.filter((a) => a.studentId === s.id)
      const booked = inRange.filter((x) => x.studentIds.includes(s.id)).length
      return { s, booked, present: mine.filter((a) => a.status === "present").length, absent: mine.filter((a) => a.status === "absent").length, leave: mine.filter((a) => a.status === "leave").length }
    })
    .filter((r) => r.booked > 0)
    .sort((a, b) => a.present / a.booked - b.present / b.booked)

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm" variant="outline" aria-label="ก่อนหน้า" onClick={() => step(-1)}><ChevronLeftIcon /></Button>
        <Button size="sm" variant="outline" onClick={() => setAnchor(today)}>ปัจจุบัน</Button>
        <Button size="icon-sm" variant="outline" aria-label="ถัดไป" onClick={() => step(1)}><ChevronRightIcon /></Button>
        <h2 className="font-semibold">{range === "week" ? `${fmtDate(from)} – ${fmtDate(to, { year: true })}` : fmtMonth(from)}</h2>
        <div className="ml-auto flex flex-wrap gap-2">
          <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRange(v[0] as Range)} variant="outline" size="sm">
            <ToggleGroupItem value="week">สัปดาห์</ToggleGroupItem>
            <ToggleGroupItem value="month">เดือน</ToggleGroupItem>
          </ToggleGroup>
          <NativeSelect className="h-8 w-28" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ทุกวิชา" options={branch.subjects.map((s) => ({ value: s, label: s }))} />
          <NativeSelect className="h-8 w-32" value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="ครูทุกคน" options={staff.filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id)).map((t) => ({ value: t.id, label: t.nickname }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}><CardContent><div className="text-xs text-muted-foreground">{c.label}</div><div className={cn("text-2xl font-semibold tabular-nums", c.tone)}>{c.value}</div></CardContent></Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">นับเฉพาะคาบในช่วงที่เลือกที่เริ่มเรียนแล้วเท่านั้น · เรียงจากอัตราเข้าเรียนต่ำสุด</p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-[1.5fr_repeat(4,0.6fr)_1.2fr] gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>นักเรียน</span><span className="text-right">นัด</span><span className="text-right">มา</span><span className="text-right">ขาด</span><span className="text-right">ลา</span><span>อัตราเข้าเรียน</span>
        </div>
        {perStudent.map((r) => {
          const rate = r.booked ? r.present / r.booked : 0
          return (
            <button key={r.s.id} onClick={() => setOpenId(r.s.id)} className="grid w-full grid-cols-[1.5fr_repeat(4,0.6fr)_1.2fr] items-center gap-2 border-b px-4 py-2 text-left text-sm tabular-nums last:border-0 hover:bg-muted/40">
              <span className="truncate">{r.s.nickname} <span className={cn("rounded px-1 text-[10px]", gradeTone(r.s.grade))}>{r.s.grade}</span></span>
              <span className="text-right">{r.booked}</span>
              <span className="text-right text-emerald-700">{r.present}</span>
              <span className="text-right text-red-700">{r.absent}</span>
              <span className="text-right text-amber-700">{r.leave}</span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full", rate < 0.6 ? "bg-red-500" : rate < 0.8 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${rate * 100}%` }} /></span>
                <span className="w-9 text-right text-xs">{Math.round(rate * 100)}%</span>
              </span>
            </button>
          )
        })}
        {perStudent.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงนี้</p>}
      </div>
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
