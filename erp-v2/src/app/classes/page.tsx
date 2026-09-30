"use client"

import { useState } from "react"
import { ArrowDownUpIcon, BookOpenIcon, CalendarIcon, ChevronRightIcon, ClockIcon, DoorOpenIcon, GraduationCapIcon, PlusIcon, RefreshCwIcon, SearchIcon, UserRoundIcon, UsersIcon } from "lucide-react"
import { ClassDialog } from "@/components/app/class-dialog"
import { ClassSheet } from "@/components/app/class-sheet"
import { Pager, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { avatarTone, gradeTone, initial, subjectColor } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { endTime, fmtDate, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { CAPACITY, subjectsOf } from "@/domain/rules/scheduling"
import * as Att from "@/domain/rules/attendance"
import { inBranch } from "@/domain/rules/permissions"
import { gradeRanges, PRICE_UNIT_LABEL, sortGrades } from "@/domain/rules/settings"
import type { ID, Klass, PriceUnit } from "@/domain/types"
import { useBranch, useEntitlements, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type ClassSort = "subject" | "day" | "time" | "grade" | "students" | "teacher" | "room" | "status"

/** Class page (owner design "Class Page.png", 2026-09-28): KPIs · search + Branch/Subject/Course type/Package
 *  filters · data table. Inactive classes stay in the list, greyed. Click a row → edit panel. */
export default function ClassesPage() {
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const branches = useStore((s) => s.branches)
  const allClasses = useStore((s) => s.classes)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const courses = useStore((s) => s.courses)
  const staff = useStore((s) => s.staff)
  const settings = useStore((s) => s.system.settings)
  const entitlements = useEntitlements()
  const L = useLookup()
  const today = toDateStr(useNow())
  const [q, setQ] = useState("")
  const [branchF, setBranchF] = useState(branch.id)
  const [subjectF, setSubjectF] = useState("")
  const [kindF, setKindF] = useState("")
  const [unitF, setUnitF] = useState("")
  const [openId, setOpenId] = useState<ID | null>(null)
  const [creating, setCreating] = useState(false)
  const { sort, toggle } = useSort<ClassSort>("day")

  const myBranches = branches.filter((b) => inBranch(me, b.id))
  const classes = allClasses.filter((c) => (branchF ? c.branchId === branchF : myBranches.some((b) => b.id === c.branchId)))
  const courseOf = (c: Klass) => courses.find((x) => x.id === c.courseId)
  const teacherOf = (id: ID | null) => staff.find((t) => t.id === id)

  // KPIs over active classes in scope
  const active = classes.filter((c) => c.active)
  const kpiStudents = new Set(active.flatMap((c) => c.studentIds))
  const kpiTeachers = new Set(active.flatMap((c) => [c.teacherId, ...c.coTeacherIds]).filter(Boolean))
  const renewal = new Set(
    entitlements
      .filter((e) => kpiStudents.has(e.studentId) && e.to >= today)
      .filter((e) => Att.lowBalanceAlert(e, Att.balance(e, sessions, attendance, classes), today, { low: settings.lowSessionThreshold, days: settings.renewalDaysBefore }))
      .map((e) => e.studentId),
  ).size

  const needle = q.trim().toLowerCase()
  const rows = classes
    .filter((c) => !subjectF || subjectsOf(c).includes(subjectF))
    .filter((c) => !kindF || courseOf(c)?.kind === kindF)
    .filter((c) => !unitF || courseOf(c)?.unit === unitF)
    .filter((c) => {
      if (!needle) return true
      const t = teacherOf(c.teacherId)
      return `${c.name} ${subjectsOf(c).join(" ")} ${c.grades.join(" ")} ${t?.nickname ?? ""} ${t?.name ?? ""} ${c.coTeacherIds.map((x) => teacherOf(x)?.nickname ?? "").join(" ")} ${L.room(c.roomId)}`.toLowerCase().includes(needle)
    })
    .sort((a, b) => {
      const byDay = ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start)
      const v = sort.key === "subject" ? a.subject.localeCompare(b.subject, "th")
        : sort.key === "time" ? a.start.localeCompare(b.start)
          : sort.key === "grade" ? (sortGrades(a.grades)[0] ?? "").localeCompare(sortGrades(b.grades)[0] ?? "")
            : sort.key === "students" ? a.studentIds.length - b.studentIds.length
              : sort.key === "teacher" ? L.teacher(a.teacherId).label.localeCompare(L.teacher(b.teacherId).label, "th")
                : sort.key === "room" ? L.room(a.roomId).localeCompare(L.room(b.roomId), "th")
                  : sort.key === "status" ? Number(b.active) - Number(a.active)
                    : byDay
      // inactive classes always sink below active ones (shown greyed, like the design)
      return Number(b.active) - Number(a.active) || (sort.desc ? -v : v) || byDay
    })
  const pg = usePage(rows)

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><GraduationCapIcon className="size-5" /></span>
        <h1 className="text-xl font-semibold">คลาส</h1>
        <Button className="ml-auto" onClick={() => setCreating(true)}><PlusIcon /> สร้างคลาส</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BookOpenIcon} label="คลาสที่เปิดอยู่" value={active.length} />
        <Kpi icon={UsersIcon} label="นักเรียน" value={kpiStudents.size} />
        <Kpi icon={UserRoundIcon} label="ครู" value={kpiTeachers.size} />
        <Kpi icon={RefreshCwIcon} label="ใกล้หมดแพ็กเกจ (ต่อคอร์ส)" value={renewal} valueClassName={renewal ? "text-amber-700" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">รายการคลาส</h2>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-60 pl-9" placeholder="เช่น ชื่อครู, ชั้น, วิชา, ห้อง" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="icon" variant="outline" aria-label="สลับลำดับ" onClick={() => toggle(sort.key)}><ArrowDownUpIcon /></Button>
        <NativeSelect className="h-9 w-36" value={branchF} onChange={(e) => setBranchF(e.target.value)} options={[...(myBranches.length > 1 ? [{ value: "", label: "ทุกสาขา" }] : []), ...myBranches.map((b) => ({ value: b.id, label: `สาขา${b.name}` }))]} />
        <NativeSelect className="h-9 w-28" value={subjectF} onChange={(e) => setSubjectF(e.target.value)} placeholder="ทุกวิชา" options={[...new Set(classes.flatMap((c) => subjectsOf(c)))].map((x) => ({ value: x, label: x }))} />
        <NativeSelect className="h-9 w-32" value={kindF} onChange={(e) => setKindF(e.target.value)} placeholder="ประเภทคอร์ส" options={[{ value: "single", label: "Single" }, { value: "bundle", label: "Bundle" }]} />
        <NativeSelect className="h-9 w-32" value={unitF} onChange={(e) => setUnitF(e.target.value)} placeholder="แพ็กเกจ" options={(["hour", "week", "month"] as PriceUnit[]).map((u) => ({ value: u, label: PRICE_UNIT_LABEL[u] }))} />
      </div>

      <TableShell minWidth={1050}>
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <SortHeader label="วิชา" k="subject" sort={sort} onSort={toggle} />
            <SortHeader label="วัน" k="day" sort={sort} onSort={toggle} />
            <SortHeader label="เวลา" k="time" sort={sort} onSort={toggle} />
            <SortHeader label="ชั้น" k="grade" sort={sort} onSort={toggle} />
            <SortHeader label="นักเรียน" k="students" sort={sort} onSort={toggle} />
            <SortHeader label="ครู" k="teacher" sort={sort} onSort={toggle} />
            <SortHeader label="ห้อง" k="room" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">สาขา</th>
            <SortHeader label="สถานะ" k="status" sort={sort} onSort={toggle} />
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((c) => {
            const cap = CAPACITY[c.type]
            const t = teacherOf(c.teacherId)
            const br = branches.find((b) => b.id === c.branchId)
            const autoName = `${subjectsOf(c).join(" + ")} ${c.grades.join(", ")}`.trim()
            return (
              <tr key={c.id} onClick={() => setOpenId(c.id)} className={cn("group cursor-pointer border-b last:border-0 hover:bg-primary/5 [&>td]:px-3 [&>td]:py-2.5", !c.active && "opacity-45")}>
                <td>
                  <div className="flex flex-wrap gap-1">{subjectsOf(c).map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(x).chip)}>{x}</span>)}</div>
                  {c.name !== autoName && <p className="mt-0.5 max-w-48 truncate text-[11px] text-muted-foreground">{c.name}</p>}
                </td>
                <td className="whitespace-nowrap"><span className="flex items-center gap-1.5"><CalendarIcon className="size-4 text-muted-foreground" />{c.kind === "learning" ? TH_DAYS_FULL[c.weekday] : fmtDate(c.startDate, { weekday: true })}</span></td>
                <td className="whitespace-nowrap tabular-nums"><span className="flex items-center gap-1.5"><ClockIcon className="size-4 text-muted-foreground" />{c.start}–{endTime(c.start, c.minutes)}</span></td>
                <td><div className="flex flex-wrap gap-1">{gradeRanges(c.grades).map((g) => <span key={g} className={cn("rounded-full px-2 py-0.5 text-xs", gradeTone(g))}>{g}</span>)}</div></td>
                <td className="tabular-nums"><span className={cn("flex items-center gap-1", c.studentIds.length >= cap && "font-semibold text-amber-700")}><UsersIcon className="size-3.5 text-muted-foreground" />{c.studentIds.length}<span className="text-xs text-muted-foreground">/{cap}</span></span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", t ? avatarTone(t.id) : "bg-muted text-muted-foreground")}>{t ? initial(t.nickname) : "?"}</span>
                    <div className="min-w-0 leading-tight">
                      <p className={cn("truncate text-sm", L.teacher(c.teacherId).missing && "text-amber-700")}>{L.teacher(c.teacherId).label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{t?.name ?? ""}{c.coTeacherIds.length > 0 && ` · + ${c.coTeacherIds.map((x) => L.teacher(x).label).join(", ")}`}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap"><span className="flex items-center gap-1.5 text-xs"><DoorOpenIcon className="size-4 text-muted-foreground" />{L.room(c.roomId)}</span></td>
                <td className="leading-tight"><p className="text-sm">{br?.name}</p><p className="text-[11px] text-muted-foreground">{br?.code}</p></td>
                <td>{c.active ? <span className="text-sm font-medium text-emerald-700">เปิดอยู่</span> : <span className="text-sm text-muted-foreground">ปิดแล้ว</span>}</td>
                <td><ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100" /></td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">ไม่มีคลาสตามเงื่อนไข</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="คลาส" />
      <ClassSheet id={openId} onClose={() => setOpenId(null)} />
      {creating && <ClassDialog prefill={{}} onClose={() => setCreating(false)} />}
    </div>
  )
}

