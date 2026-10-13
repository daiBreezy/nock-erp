"use client"

import { usePeriod } from "@/components/app/period-control"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { staffAt } from "@/domain/rules/permissions"
import { useState } from "react"
import { CalendarDaysIcon, ClipboardCheckIcon, UserCheckIcon, UserXIcon } from "lucide-react"
import { Page, PageHeader, KpiRow, SearchBox, Segmented, Toolbar } from "@/components/app/page-layout"
import { matchesQuery } from "@/domain/rules/people"
import { SessionSheet } from "@/components/app/session-sheet"
import { SessionLine } from "@/components/app/session-line"
import { fmtDate } from "@/domain/dates"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { gradeTone } from "@/components/app/subject-color"
import { sessionState } from "@/domain/rules/scheduling"
import type { Attendance, ID, Session } from "@/domain/types"
import { useBranch, useLookup, useNow, useQueryState } from "@/lib/hooks"
import { GradeCell, gradeCompare, Pager, usePage, useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"


/** Attendance report — every number is limited to the chosen period (C8) and real subjects (C9). */
type AttSort = "name" | "grade" | "booked" | "present" | "absent" | "leave" | "rate"

export default function AttendancePage() {
  const now = useNow()
  const branch = useBranch()
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const students = useStore((s) => s.students)
  const staff = useStore((s) => s.staff)
  // owner 2026-10-09: the shared date control — default this week (same on Sessions / Attendance / Summaries)
  const period = usePeriod("week")
  const [view, setView] = useQueryState<"day" | "student">("view", "day")
  const [sessionId, setSessionId] = useState<ID | null>(null)
  const [subject, setSubject] = useState("")
  const [teacher, setTeacher] = useState("")
  const [openId, setOpenId] = useState<ID | null>(null)
  const [q, setQ] = useState("")
  const classes = useStore((s) => s.classes)
  const L = useLookup()
  const { sort, toggle } = useSort<AttSort>("rate")
  const byGrade = gradeCompare(branch.grades)

  const { from, to } = period

  const inRange = sessions.filter((s) => scope.ids.includes(s.branchId) && !s.cancelled && s.date >= from && s.date <= to && sessionState(s, now) !== "upcoming" && (!subject || s.subject === subject) && (!teacher || s.teacherId === teacher))
  // owner 2026-10-13: search — day view by class / teacher / student, student view by the student's name
  const stuText = (id: ID) => { const x = students.find((st) => st.id === id); return [x?.nickname, x?.name] }
  const dayShown = q ? inRange.filter((s) => matchesQuery(q, [classes.find((k) => k.id === s.classId)?.name, s.subject, L.teacher(s.teacherId).label, ...s.studentIds.flatMap(stuText)])) : inRange
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
    .filter((r) => r.booked > 0 && (!q || matchesQuery(q, [r.s.nickname, r.s.name, r.s.grade])))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "name" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "grade" ? byGrade(a.s.grade, b.s.grade)
          : k === "rate" ? a.present / a.booked - b.present / b.booked
            : a[k] - b[k]
      return sort.desc ? -v : v
    })
  const pg = usePage(perStudent)
  type Row = (typeof perStudent)[number]
  const rateOf = (r: Row) => (r.booked ? r.present / r.booked : 0)
  const columns: Column<Row>[] = [
    { id: "nickname", label: "ชื่อเล่น", width: "120px", sort: "name", required: true, className: "font-medium", cell: (r) => <>{r.s.nickname}{scope.multi && <span className="ml-1.5"><BranchCode code={scope.code(r.s.branchId)} /></span>}</> },
    { id: "name", label: "ชื่อ-นามสกุล", width: "170px", className: "text-muted-foreground", cell: (r) => r.s.name },
    { id: "grade", label: "ชั้น", width: "76px", sort: "grade", cell: (r) => <GradeCell grade={r.s.grade} tone={gradeTone(r.s.grade)} /> },
    { id: "booked", label: "นัด", width: "70px", sort: "booked", align: "right", className: "tabular-nums", cell: (r) => r.booked },
    { id: "present", label: "มา", width: "70px", sort: "present", align: "right", className: "tabular-nums text-emerald-700", cell: (r) => r.present },
    { id: "absent", label: "ขาด", width: "70px", sort: "absent", align: "right", className: "tabular-nums text-red-700", cell: (r) => r.absent },
    { id: "leave", label: "ลา", width: "70px", sort: "leave", align: "right", className: "tabular-nums text-amber-700", cell: (r) => r.leave },
    { id: "rate", label: "อัตราเข้าเรียน", width: "200px", sort: "rate", cell: (r) => {
      const rate = rateOf(r)
      return (
        <span className="flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full", rate < 0.6 ? "bg-red-500" : rate < 0.8 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${rate * 100}%` }} /></span>
          <span className="w-10 text-right text-xs tabular-nums">{Math.round(rate * 100)}%</span>
        </span>
      )
    } },
  ]

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
      <div className="space-y-3">
        <Toolbar end={<Segmented label="มุมมอง" value={view} onChange={setView} options={[{ value: "day", label: "รายวัน" }, { value: "student", label: "รายนักเรียน" }]} />}>
          {period.control}
        </Toolbar>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="ตัวกรองรายงานเข้าเรียน">
        <SearchBox value={q} onChange={setQ} placeholder={view === "day" ? "ค้นหาคลาส / ครู / นักเรียน" : "ค้นหานักเรียน"} />
        <NativeSelect className="h-9 w-28" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ทุกวิชา" options={branch.subjects.map((s) => ({ value: s, label: s }))} />
        <NativeSelect className="h-9 w-32" value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="ครูทุกคน" options={staff.map((t) => staffAt(t, branch.id)).filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id)).map((t) => ({ value: t.id, label: t.nickname }))} />
        {view !== "day" && <ColumnsMenu id="attendance" columns={columns} />}
        {/* owner 2026-10-09: branch chip always last in the row */}
        {scope.select}
        </div>
      </div>
      {view === "day" ? <ByDay sessions={dayShown} attendance={att} multi={scope.multi} code={scope.code} onOpen={setSessionId} /> : (<>
      <p className="text-xs text-muted-foreground">นับเฉพาะคาบในช่วงที่เลือกที่เริ่มเรียนแล้วเท่านั้น · เริ่มเรียงจากอัตราเข้าเรียนต่ำสุด (กดหัวคอลัมน์เพื่อเรียงใหม่)</p>
      {/* owner 2026-10-07: a real sortable table — grade in its own column, numbers right-aligned */}
      <div data-focus="often_leave" className="rounded-3xl">
        {/* owner 2026-10-12: columns arranged per person (DataTable) · nickname and full name in their own columns */}
        <DataTable id="attendance" columns={columns} rows={pg.rows} rowKey={(r) => r.s.id} onRowClick={(r) => setOpenId(r.s.id)}
          sort={sort} onSort={toggle} minWidth={760} empty="ไม่มีข้อมูลในช่วงนี้" />
        <Pager {...pg} unit="คน" />
      </div>
      </>)}
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
      <SessionSheet sessionId={sessionId} onClose={() => setSessionId(null)} />
    </Page>
  )
}


/** One section per day: each session with มา / ขาด / ลา / ยังไม่เช็ค — click to open it (owner 2026-10-09) */
function ByDay({ sessions, attendance, multi, code, onOpen }: { sessions: Session[]; attendance: Attendance[]; multi: boolean; code: (id: ID) => string; onOpen: (id: ID) => void }) {
  const classes = useStore((s) => s.classes)
  const L = useLookup()
  const sorted = [...sessions].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const days = [...new Set(sorted.map((s) => s.date))]
  if (!days.length) return <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">ไม่มีคาบที่เรียนไปแล้วในช่วงนี้</p>
  const n = (sid: ID, st: Attendance["status"]) => attendance.filter((a) => a.sessionId === sid && a.status === st).length
  return (
    <>
      {days.map((d) => (
        <section key={d}>
          <h3 className="mb-1 text-sm font-semibold">{fmtDate(d, { weekday: true })}</h3>
          <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
            {sorted.filter((s) => s.date === d).map((s) => {
              const marked = attendance.filter((a) => a.sessionId === s.id).length
              const left = Math.max(0, s.studentIds.length - marked)
              return (
                // owner 2026-10-13: the same row as Sessions — colour bar · start–end · status last
                <SessionLine key={s.id} s={s} onOpen={() => onOpen(s.id)}
                  title={<>{classes.find((k) => k.id === s.classId)?.name ?? s.subject}{multi && <span className="ml-1.5 align-middle"><BranchCode code={code(s.branchId)} /></span>}</>}
                  sub={<>{L.teacher(s.teacherId).label} · {L.room(s.roomId)} · {s.studentIds.length} คน</>}
                  status={<span className="flex flex-wrap justify-end gap-1 text-xs">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">มา {n(s.id, "present")}</span>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">ขาด {n(s.id, "absent")}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">ลา {n(s.id, "leave")}</span>
                    {left > 0 && <span className="rounded-full border border-red-300 px-2 py-0.5 text-red-700">ยังไม่เช็ค {left}</span>}
                  </span>} />
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}
