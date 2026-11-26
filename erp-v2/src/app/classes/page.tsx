"use client"

import { tx } from "@/lib/i18n"
import { ListPage, SearchBox } from "@/components/app/page-layout"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { useState } from "react"
import { BookOpenIcon, PlusIcon, RefreshCwIcon, UserRoundIcon, UsersIcon } from "lucide-react"
import { ClassSheet } from "@/components/app/class-sheet"
import { Pager, usePage, useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { Kpi } from "@/components/app/kpi"
import { FilterMenu } from "@/components/app/filter-menu"
import { avatarTone, initial, subjectColor } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { endTime, fmtDate, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { CAPACITY, subjectsOf } from "@/domain/rules/scheduling"
import * as Att from "@/domain/rules/attendance"
import { PACKAGE_LABEL } from "@/domain/rules/settings"
import { PACKAGE_LEGEND, PackageBadge } from "@/components/app/package-badge"
import { matchesPeriod, PeriodTag, usePeriodFilterOptions } from "@/components/app/period-tag"
import type { ID, Klass, PriceUnit } from "@/domain/types"
import { useEntitlements, useLookup, useNow } from "@/lib/hooks"
import { ATTENTION_THRESHOLDS } from "@/domain/rules/reports"
import { useFocusFirst } from "@/components/app/focus-banner"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type ClassSort = "subject" | "name" | "day" | "time" | "students" | "teacher" | "room" | "status"

/** Class page (owner design "Class Page.png", 2026-09-28): KPIs · search + Branch/Subject/Course type/Package
 *  filters · data table. Inactive classes stay in the list, greyed. Click a row → edit panel. */
export default function ClassesPage() {
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
  // owner 2026-10-09: the shared branch filter (sidebar branch by default, several for Director / Area Manager)
  const scope = useBranchScope()
  const [subjectF, setSubjectF] = useState("")
  const [kindF, setKindF] = useState("")
  const [unitF, setUnitF] = useState("")
  const [periodF, setPeriodF] = useState("") // owner 2026-11-26: Special Period classes show and filter
  const [openId, setOpenId] = useState<ID | null>(null)
  const { sort, toggle } = useSort<ClassSort>("day")

  const classes = allClasses.filter((c) => scope.ids.includes(c.branchId))
  const periodOptions = usePeriodFilterOptions(classes.map((c) => c.periodId ?? courses.find((x) => x.id === c.courseId)?.periodId))
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
    .filter((c) => matchesPeriod(periodF, c.periodId ?? courseOf(c)?.periodId))
    .filter((c) => {
      if (!needle) return true
      const t = teacherOf(c.teacherId)
      return `${c.name} ${subjectsOf(c).join(" ")} ${t?.nickname ?? ""} ${t?.name ?? ""} ${c.coTeacherIds.map((x) => teacherOf(x)?.nickname ?? "").join(" ")} ${L.room(c.roomId)}`.toLowerCase().includes(needle)
    })
    .sort((a, b) => {
      const byDay = ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start)
      const v = sort.key === "subject" ? a.subject.localeCompare(b.subject, "th")
        : sort.key === "name" ? a.name.localeCompare(b.name, "th")
        : sort.key === "time" ? a.start.localeCompare(b.start)
            : sort.key === "students" ? a.studentIds.length - b.studentIds.length
              : sort.key === "teacher" ? L.teacher(a.teacherId).label.localeCompare(L.teacher(b.teacherId).label, "th")
                : sort.key === "room" ? L.room(a.roomId).localeCompare(L.room(b.roomId), "th")
                  : sort.key === "status" ? Number(b.active) - Number(a.active)
                    : byDay
      // inactive classes always sink below active ones (shown greyed, like the design)
      return Number(b.active) - Number(a.active) || (sort.desc ? -v : v) || byDay
    })
  const focusKeys = (c: (typeof rows)[number]) => (c.active && c.kind === "learning" && c.studentIds.length <= ATTENTION_THRESHOLDS.smallClass ? "small_class" : undefined)
  const pg = usePage(useFocusFirst(rows, focusKeys))

  type Row = (typeof rows)[number]
  const columns: Column<Row>[] = [
    { id: "subject", label: "วิชา", width: "120px", sort: "subject", cell: (c) => <div className="flex gap-1">{subjectsOf(c).map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(x).chip)}>{x}</span>)}</div> },
    // owner Row 16 (2026-10-28): when a class is linked to a course, show the course name under the class name
    { id: "name", label: "ชื่อคลาส", width: "180px", sort: "name", required: true, className: "font-medium", cell: (c) => { const co = courseOf(c); const pid = c.periodId ?? co?.periodId; return <div className="leading-tight"><span className="inline-flex items-center gap-1.5">{c.name}{pid && <PeriodTag periodId={pid} />}</span>{co && <div className="text-xs font-normal text-muted-foreground">{co.name}</div>}</div> } },
    // owner 2026-11-26: the course's Package (H · S · W · M + size), the same badge as the Courses list
    { id: "package", label: "Package", width: "96px", info: PACKAGE_LEGEND, cell: (c) => { const co = courseOf(c); return co ? <PackageBadge course={co} /> : <span className="text-muted-foreground">—</span> } },
    { id: "day", label: "วัน", width: "110px", sort: "day", cell: (c) => c.kind === "learning" ? TH_DAYS_FULL[c.weekday] : fmtDate(c.startDate, { weekday: true }) },
    { id: "time", label: "เวลา", width: "130px", sort: "time", className: "tabular-nums", cell: (c) => `${c.start}–${endTime(c.start, c.minutes)}` },
    { id: "students", label: "นักเรียน", width: "90px", sort: "students", align: "center", className: "tabular-nums", cell: (c) => {
      const cap = CAPACITY[c.type]
      return <span title={`รับได้ ${cap} คน`} className={cn(c.studentIds.length >= cap && "font-semibold text-warning")}>{c.studentIds.length}</span>
    } },
    { id: "teacher", label: "ครู", width: "140px", sort: "teacher", cell: (c) => {
      const co = c.coTeacherIds.map((x) => L.teacher(x).label)
      // owner 2026-11-26: small thumbs — with a co-teacher they overlap (the main teacher on top, then the others); the name stays beside them
      const people = [c.teacherId, ...c.coTeacherIds].slice(0, 3)
      return (
        <div className="flex items-center gap-2">
          <span className="flex shrink-0 -space-x-2">
            {people.map((id, i) => { const p = id ? teacherOf(id) : null; return (
              <span key={id ?? i} style={{ zIndex: people.length - i }} className={cn("grid size-6 shrink-0 place-items-center rounded-full text-2xs font-semibold ring-2 ring-background", p ? avatarTone(p.id) : "bg-muted text-muted-foreground")}>{p ? initial(p.nickname) : "?"}</span>
            ) })}
          </span>
          <span className={cn("text-sm", L.teacher(c.teacherId).missing && "text-warning")}>{L.teacher(c.teacherId).label}</span>
          {co.length > 0 && <span className="text-xs text-muted-foreground" title={`ครูร่วม: ${co.join(", ")}`}>+{co.length}</span>}
        </div>
      )
    } },
    { id: "room", label: "ห้อง", width: "100px", sort: "room", cell: (c) => L.room(c.roomId) },
    { id: "branch", label: "สาขา", width: "72px", cell: (c) => <BranchCode code={scope.code(c.branchId)} /> },
    // owner 2026-10-12: status right-aligned
    { id: "status", label: "สถานะ", width: "100px", sort: "status", align: "right", cell: (c) => (c.active ? <span className="text-sm font-medium text-success">เปิดอยู่</span> : <span className="text-sm text-muted-foreground">ปิดแล้ว</span>) },
  ]

  return (
    <ListPage branch={scope.select} title="คลาส" description="คลาสประจำ ครู ห้อง และนักเรียนในแต่ละคลาส"
        actions={<Button onClick={() => setOpenId("new")}><PlusIcon /> สร้างคลาส</Button>}
      kpis={<>
        <Kpi icon={BookOpenIcon} label="คลาสที่เปิดอยู่" value={active.length} />
        <Kpi icon={UsersIcon} label="นักเรียน" value={kpiStudents.size} />
        <Kpi icon={UserRoundIcon} label="ครู" value={kpiTeachers.size} />
        <Kpi icon={RefreshCwIcon} label="ใกล้หมดแพ็กเกจ (ต่อคอร์ส)" value={renewal} emphasis={!!(renewal)} />
      </>}
      search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาครู / วิชา / ห้อง" />}
      filters={<>
        <FilterMenu fields={[
          { id: "subject", label: "วิชา", value: subjectF, onChange: setSubjectF, placeholder: "ทุกวิชา", options: [...new Set(classes.flatMap((c) => subjectsOf(c)))].map((x) => ({ value: x, label: x })) },
          { id: "kind", label: "ประเภทคอร์ส", value: kindF, onChange: setKindF, placeholder: "ทุกประเภท", options: [{ value: "single", label: "Single" }, { value: "bundle", label: "Bundle" }] },
          { id: "unit", label: "แพ็กเกจ", value: unitF, onChange: setUnitF, placeholder: "ทุกแพ็กเกจ", options: (["month", "week", "hour", "session"] as PriceUnit[]).map((u) => ({ value: u, label: PACKAGE_LABEL[u] })) },
          { id: "period", label: tx("ช่วง"), value: periodF, onChange: setPeriodF, placeholder: tx("ทุกช่วง"), options: periodOptions },
        ]} />
        <ColumnsMenu id="classes" columns={columns} />
      </>}>
      {/* owner 2026-10-12: subject and class name in their own columns · teacher by nickname only · branch as its code ·
          columns arranged per person (DataTable) */}
      <DataTable id="classes" columns={columns} rows={pg.rows} rowKey={(c) => c.id} onRowClick={(c) => setOpenId(c.id)}
        rowProps={(c) => ({ "data-focus": focusKeys(c) })} rowClassName={(c) => !c.active && "opacity-45"} sort={sort} onSort={toggle} minWidth={1200} empty="ไม่มีคลาสตามเงื่อนไข" />
      <Pager {...pg} unit="คลาส" />
      <ClassSheet key={openId ?? "none"} id={openId} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}

