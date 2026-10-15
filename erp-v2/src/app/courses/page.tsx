"use client"

import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { Pager, usePage, useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { useMemo, useState } from "react"
import { BookOpenIcon, LayersIcon, PlusIcon, SearchIcon, StarIcon, UsersIcon, WalletIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { gradeTone, subjectColor } from "@/components/app/subject-color"
import { emptyCourse } from "@/components/courses/course-dialog"
import { CoursePanel } from "@/components/courses/course-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import { PACKAGE_LEGEND, PackageBadge } from "@/components/app/package-badge"
import { can } from "@/domain/rules/permissions"
import { gradeRanges, PRICE_UNIT_LABEL } from "@/domain/rules/settings"
import type { Course, ID, PriceUnit } from "@/domain/types"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type SortKey = "subject" | "name" | "kind" | "package" | "price" | "students" | "classes" | "start"

/** Course page (owner design 2026-09-28): KPIs · search + filters · table with each course's linked classes on expand. */
export default function CoursesPage() {
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const invoices = useStore((s) => s.invoices)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useStore((s) => s.entitlements)
  const today = toDateStr(useNow())
  const manage = can(me, "course.manage")

  const [q, setQ] = useState("")
  // owner 2026-10-09: the shared branch filter (sidebar branch by default, several for Director / Area Manager)
  const scope = useBranchScope()
  const [subjectF, setSubjectF] = useState("")
  const [kindF, setKindF] = useState("")
  const [unitF, setUnitF] = useState("")
  const { sort, toggle } = useSort<SortKey>("subject")
  // the course panel: an id = that course, a Course = a new one being created
  const [panel, setPanel] = useState<ID | Course | null>(null)

  const scoped = courses.filter((c) => scope.ids.includes(c.branchId))

  // per-course stats: enrolled = students holding a still-valid package of the course; revenue = paid invoices
  const stats = useMemo(() => {
    const m = new Map<string, { students: number; revenue: number; classes: number }>()
    courses.forEach((c) => {
      const students = new Set(entitlements.filter((e) => e.courseId === c.id && e.to >= today).map((e) => e.studentId)).size
      const revenue = invoices
        .filter((i) => i.status === "paid" && i.lines.some((l) => l.courseId === c.id))
        .reduce((a, i) => a + invoiceTotals(i, { branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays }).lines
          .filter((l) => l.line.courseId === c.id).reduce((x, l) => x + l.amount + l.courseFee - l.promotion, 0), 0)
      m.set(c.id, { students, revenue, classes: classes.filter((k) => k.courseId === c.id).length })
    })
    return m
  }, [courses, entitlements, invoices, classes, holidays, branches, today])

  const subjects = [...new Set(scoped.flatMap((c) => c.subjects))]
  const needle = q.trim().toLowerCase()
  const list = scoped
    .filter((c) => !needle || [c.name, ...c.subjects, ...c.grades].some((x) => x.toLowerCase().includes(needle)))
    .filter((c) => !subjectF || c.subjects.includes(subjectF))
    .filter((c) => !kindF || c.kind === kindF)
    .filter((c) => !unitF || c.unit === unitF)
    .sort((a, b) => {
      const unitRank = { hour: 0, week: 1, month: 2 }
      const v = sort.key === "subject" ? (a.subjects.join("+")).localeCompare(b.subjects.join("+"), "th") || a.name.localeCompare(b.name, "th")
        : sort.key === "name" ? a.name.localeCompare(b.name, "th")
          : sort.key === "kind" ? a.kind.localeCompare(b.kind)
            : sort.key === "package" ? unitRank[a.unit] - unitRank[b.unit] || a.duration - b.duration
              : sort.key === "price" ? a.price - b.price
                : sort.key === "students" ? stats.get(a.id)!.students - stats.get(b.id)!.students
                  : sort.key === "classes" ? stats.get(a.id)!.classes - stats.get(b.id)!.classes
                    : (a.from ?? "9").localeCompare(b.from ?? "9")
      return sort.desc ? -v : v
    })
  const pg = usePage(list)

  const kpi = {
    total: scoped.length,
    single: scoped.filter((c) => c.kind === "single").length,
    bundle: scoped.filter((c) => c.kind === "bundle").length,
    students: new Set(entitlements.filter((e) => e.to >= today && scoped.some((c) => c.id === e.courseId)).map((e) => e.studentId)).size,
    revenue: scoped.reduce((a, c) => a + stats.get(c.id)!.revenue, 0),
  }

  const columns: Column<Course>[] = [
    { id: "subject", label: "วิชา", width: "120px", sort: "subject", cell: (c) => <div className="flex gap-1">{c.subjects.map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(x).chip)}>{x}</span>)}</div> },
    { id: "name", label: "ชื่อคอร์ส", width: "200px", sort: "name", required: true, cell: (c) => (
      <span className="flex items-center gap-1.5"><span className="font-medium">{c.name}</span>{!c.active && <Pill>ปิดขาย</Pill>}</span>
    ) },
    { id: "grades", label: "ระดับชั้น", width: "110px", cell: (c) => <div className="flex gap-1" title={c.grades.join(", ")}>{gradeRanges(c.grades).map((g) => <span key={g} className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", gradeTone(g))}>{g}</span>)}</div> },
    { id: "kind", label: "ประเภท", width: "100px", sort: "kind", cell: (c) => <Pill tone={c.kind === "bundle" ? "violet" : "gray"}>{c.kind === "bundle" ? <><LayersIcon className="size-3" /> Bundle</> : "Single"}</Pill> },
    { id: "package", label: "Package", width: "96px", sort: "package", info: PACKAGE_LEGEND, cell: (c) => <PackageBadge course={c} /> },
    { id: "price", label: "ราคา", width: "110px", sort: "price", align: "right", className: "tabular-nums", cell: (c) => <span className="font-medium" title={c.courseFee > 0 ? `+ Course fee ${fmtMoney(c.courseFee)}` : undefined}>{fmtMoney(c.price)}</span> },
    // owner 2026-10-12: counts centred, start date right-aligned
    { id: "students", label: "นักเรียน", width: "96px", sort: "students", align: "center", className: "tabular-nums", cell: (c) => {
      // owner 2026-10-13: with a Max Student the cell reads enrolled / max (red when full)
      const n = stats.get(c.id)!.students
      if (c.maxStudents) return <span className={cn(n >= c.maxStudents && "font-medium text-red-700")} title={n >= c.maxStudents ? "คอร์สเต็ม" : `รับได้อีก ${c.maxStudents - n} คน`}>{n}/{c.maxStudents}</span>
      return n || <span className="text-muted-foreground">—</span>
    } },
    { id: "classes", label: "คลาสที่ผูก", width: "100px", sort: "classes", align: "center", className: "tabular-nums", cell: (c) => stats.get(c.id)!.classes || <span className="text-muted-foreground">—</span> },
    { id: "branch", label: "สาขา", width: "72px", cell: (c) => <BranchCode code={scope.code(c.branchId)} /> },
    { id: "start", label: "วันเริ่ม", width: "100px", sort: "start", align: "right", className: "text-xs tabular-nums", cell: (c) => (
      // owner 2026-10-15: start on one line, end under it — a narrower column
      c.from ? <span className="inline-flex flex-col items-end leading-tight">{fmtDate(c.from, { year: true })}{c.to && <span className="text-muted-foreground">– {fmtDate(c.to, { year: true })}</span>}</span> : <span className="text-muted-foreground">—</span>
    ) },
  ]

  return (
    <Page>
      <PageHeader title="คอร์ส" description="คอร์สที่เปิดขาย แพ็กเกจ ราคา และคลาสที่ผูก"
        actions={manage && <Button onClick={() => setPanel(emptyCourse(branch))}><PlusIcon /> สร้างคอร์ส</Button>} />

      <KpiRow>
        <Kpi icon={BookOpenIcon} label="คอร์สทั้งหมด" value={kpi.total} />
        <Kpi icon={StarIcon} label="Single / Bundle" value={<>{kpi.single} <span className="text-base text-muted-foreground">/</span> {kpi.bundle}</>} sub="คอร์สวิชาเดียว / หลายวิชา" tone="violet" />
        <Kpi icon={UsersIcon} label="นักเรียนที่ลงเรียน" value={kpi.students} />
        <Kpi icon={WalletIcon} label="รายได้จากคอร์ส (ชำระแล้ว)" value={fmtMoney(kpi.revenue)} />
      </KpiRow>

      <Toolbar end={<>
        <NativeSelect className="h-9 w-32" value={subjectF} onChange={(e) => setSubjectF(e.target.value)} placeholder="ทุกวิชา" options={subjects.map((s) => ({ value: s, label: s }))} />
        <NativeSelect className="h-9 w-32" value={kindF} onChange={(e) => setKindF(e.target.value)} placeholder="ทุกประเภท" options={[{ value: "single", label: "Single" }, { value: "bundle", label: "Bundle" }]} />
        <NativeSelect className="h-9 w-36" value={unitF} onChange={(e) => setUnitF(e.target.value)} placeholder="ทุกแพ็กเกจ" options={(["hour", "week", "month"] as PriceUnit[]).map((u) => ({ value: u, label: PRICE_UNIT_LABEL[u] }))} />
        {/* owner 2026-10-09: branch chip always last in the row */}
        <ColumnsMenu id="courses" columns={columns} />
        {scope.select}
      </>}>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-56 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อคอร์ส วิชา ระดับชั้น" />
        </div>
      </Toolbar>

      {/* owner 2026-10-12: subject and course name in their own columns, branch as its code only, package as the badge
          (legend on the header ⓘ) · columns arranged per person (DataTable) */}
      <DataTable id="courses" columns={columns} rows={pg.rows} rowKey={(c) => c.id} onRowClick={(c) => setPanel(c.id)}
        rowClassName={(c) => cn(panel === c.id && "bg-primary/5", !c.active && "opacity-50")} sort={sort} onSort={toggle} minWidth={1180} empty="ไม่มีคอร์สตามเงื่อนไข" />
      <Pager {...pg} unit="คอร์ส" />

      <CoursePanel key={typeof panel === "string" ? panel : panel?.id ?? "none"} target={panel} stats={(id) => stats.get(id)} onClose={() => setPanel(null)} />
    </Page>
  )
}
