"use client"

import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { staffAt } from "@/domain/rules/permissions"
import { useState } from "react"
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardCheckIcon, UserCheckIcon, UserXIcon } from "lucide-react"
import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { addDays, endOfMonth, fmtDate, fmtMonth, toDateStr, weekdayOf } from "@/domain/dates"
import { sessionState } from "@/domain/rules/scheduling"
import type { ID } from "@/domain/types"
import { useBranch, useNow } from "@/lib/hooks"
import { GradeCell, gradeCompare, HEAD, Pager, ROW, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Range = "week" | "month"

/** Attendance report — every number is limited to the chosen period (C8) and real subjects (C9). */
type AttSort = "name" | "grade" | "booked" | "present" | "absent" | "leave" | "rate"

export default function AttendancePage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const students = useStore((s) => s.students)
  const staff = useStore((s) => s.staff)
  const [range, setRange] = useState<Range>("week")
  const [anchor, setAnchor] = useState(today)
  const [subject, setSubject] = useState("")
  const [teacher, setTeacher] = useState("")
  const [openId, setOpenId] = useState<ID | null>(null)
  const { sort, toggle } = useSort<AttSort>("rate")
  const byGrade = gradeCompare(branch.grades)

  const from = range === "week" ? addDays(anchor, -((weekdayOf(anchor) + 6) % 7)) : anchor.slice(0, 8) + "01"
  const to = range === "week" ? addDays(from, 6) : endOfMonth(anchor)
  const step = (dir: number) => setAnchor(range === "week" ? addDays(anchor, 7 * dir) : toDateStr(new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1 + dir, 1)))

  const inRange = sessions.filter((s) => scope.ids.includes(s.branchId) && !s.cancelled && s.date >= from && s.date <= to && sessionState(s, now) !== "upcoming" && (!subject || s.subject === subject) && (!teacher || s.teacherId === teacher))
  const ids = new Set(inRange.map((s) => s.id))
  const att = attendance.filter((a) => ids.has(a.sessionId))
  const expected = inRange.reduce((n, s) => n + s.studentIds.length, 0)
  const count = (st: string) => att.filter((a) => a.status === st).length

  const perStudent = students
    .filter((s) => scope.ids.includes(s.branchId))
    .map((s) => {
      const mine = att.filter((a) => a.studentId === s.id)
      const booked = inRange.filter((x) => x.studentIds.includes(s.id)).length
      return { s, booked, present: mine.filter((a) => a.status === "present").length, absent: mine.filter((a) => a.status === "absent").length, leave: mine.filter((a) => a.status === "leave").length }
    })
    .filter((r) => r.booked > 0)
    .sort((a, b) => {
      const k = sort.key
      const v = k === "name" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "grade" ? byGrade(a.s.grade, b.s.grade)
          : k === "rate" ? a.present / a.booked - b.present / b.booked
            : a[k] - b[k]
      return sort.desc ? -v : v
    })
  const pg = usePage(perStudent)

  const marked = count("present") + count("absent") + count("leave")
  const notMarked = Math.max(0, expected - att.length)

  return (
    <Page>
      <PageHeader title="รายงานเข้าเรียน" description="มา ขาด ลา ของนักเรียนแต่ละคน ในช่วงที่เลือก" />
      <KpiRow>
        <Kpi icon={CalendarDaysIcon} label="คาบที่เรียนไปแล้ว" value={inRange.length} />
        <Kpi icon={UserCheckIcon} label="มาเรียน" value={count("present")} tone="emerald" sub={marked ? `${Math.round((count("present") / marked) * 100)}% ของที่เช็คชื่อแล้ว` : undefined} />
        <Kpi icon={UserXIcon} label="ขาด / ลา" value={<><span className="text-red-700">{count("absent")}</span> <span className="text-base text-muted-foreground">/</span> <span className="text-amber-700">{count("leave")}</span></>} tone="red" />
        <Kpi icon={ClipboardCheckIcon} label="ยังไม่เช็คชื่อ" value={notMarked} tone="amber" valueClassName={notMarked ? "text-red-700" : undefined} />
      </KpiRow>
      <Toolbar end={<>
        <NativeSelect className="h-9 w-28" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ทุกวิชา" options={branch.subjects.map((s) => ({ value: s, label: s }))} />
        <NativeSelect className="h-9 w-32" value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="ครูทุกคน" options={staff.map((t) => staffAt(t, branch.id)).filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id)).map((t) => ({ value: t.id, label: t.nickname }))} />
      </>}>
        {scope.select}
        <Button size="icon-sm" variant="outline" aria-label="ก่อนหน้า" onClick={() => step(-1)}><ChevronLeftIcon /></Button>
        <Button size="sm" variant="outline" onClick={() => setAnchor(today)}>ปัจจุบัน</Button>
        <Button size="icon-sm" variant="outline" aria-label="ถัดไป" onClick={() => step(1)}><ChevronRightIcon /></Button>
        <span className="text-sm font-semibold">{range === "week" ? `${fmtDate(from)} – ${fmtDate(to, { year: true })}` : fmtMonth(from)}</span>
        <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRange(v[0] as Range)} variant="outline" size="sm">
          <ToggleGroupItem value="week">สัปดาห์</ToggleGroupItem>
          <ToggleGroupItem value="month">เดือน</ToggleGroupItem>
        </ToggleGroup>
      </Toolbar>
      <p className="text-xs text-muted-foreground">นับเฉพาะคาบในช่วงที่เลือกที่เริ่มเรียนแล้วเท่านั้น · เริ่มเรียงจากอัตราเข้าเรียนต่ำสุด (กดหัวคอลัมน์เพื่อเรียงใหม่)</p>
      {/* owner 2026-10-07: a real sortable table — grade in its own column, numbers right-aligned */}
      <div data-focus="often_leave" className="rounded-3xl">
        <TableShell minWidth={760} cols={["auto", "84px", "84px", "84px", "84px", "84px", "200px"]}>
          <thead className={HEAD}>
            <tr>
              <SortHeader label="นักเรียน" k="name" sort={sort} onSort={toggle} />
              <SortHeader label="ชั้น" k="grade" sort={sort} onSort={toggle} />
              <SortHeader label="นัด" k="booked" sort={sort} onSort={toggle} right />
              <SortHeader label="มา" k="present" sort={sort} onSort={toggle} right />
              <SortHeader label="ขาด" k="absent" sort={sort} onSort={toggle} right />
              <SortHeader label="ลา" k="leave" sort={sort} onSort={toggle} right />
              <SortHeader label="อัตราเข้าเรียน" k="rate" sort={sort} onSort={toggle} />
            </tr>
          </thead>
          <tbody>
            {pg.rows.map((r) => {
              const rate = r.booked ? r.present / r.booked : 0
              return (
                <tr key={r.s.id} onClick={() => setOpenId(r.s.id)} className={ROW}>
                  <td className="truncate font-medium">{r.s.nickname} <span className="font-normal text-muted-foreground">{r.s.name}</span>{scope.multi && <span className="ml-1.5 align-middle"><BranchCode code={scope.code(r.s.branchId)} /></span>}</td>
                  <td><GradeCell grade={r.s.grade} tone={gradeTone(r.s.grade)} /></td>
                  <td className="text-right tabular-nums">{r.booked}</td>
                  <td className="text-right tabular-nums text-emerald-700">{r.present}</td>
                  <td className="text-right tabular-nums text-red-700">{r.absent}</td>
                  <td className="text-right tabular-nums text-amber-700">{r.leave}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full", rate < 0.6 ? "bg-red-500" : rate < 0.8 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${rate * 100}%` }} /></span>
                      <span className="w-10 text-right text-xs tabular-nums">{Math.round(rate * 100)}%</span>
                    </span>
                  </td>
                </tr>
              )
            })}
            {perStudent.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">ไม่มีข้อมูลในช่วงนี้</td></tr>}
          </tbody>
        </TableShell>
        <Pager {...pg} unit="คน" />
      </div>
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  )
}
