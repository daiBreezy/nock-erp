"use client"

import { familyShortName } from "@/domain/rules/people"
import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { useState } from "react"
import { DownloadIcon, GraduationCapIcon, PlusIcon, RefreshCwIcon, SearchIcon, SparklesIcon, UnlinkIcon } from "lucide-react"
import { GenderIcon, Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { PACKAGE_LEGEND, PackageBadge } from "@/components/app/package-badge"
import { packageLabel } from "@/domain/rules/course"
import { StudentSheet } from "@/components/app/student-sheet"
import { STATUS_PILL } from "@/components/app/student-status"
import { GradeCell, gradeCompare, Pager, usePage, useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { PhotoCell } from "@/components/app/photo-cell"
import { useFocusFirst } from "@/components/app/focus-banner"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addDays, fmtDate, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import type { ID, Student } from "@/domain/types"
import { EditCell } from "@/components/app/inline-edit"
import { report } from "@/lib/feedback"

type StudentSort = "nickname" | "name" | "grade" | "family" | "course" | "package" | "enroll" | "end" | "status" | "left"
import { useBranch, useEntitlements, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { toast } from "sonner"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"

export default function StudentsPage() {
  const branch = useBranch()
  const today = toDateStr(useNow())
  const me = useStore((s) => s.me())
  const saveStudent = useStore((s) => s.saveStudent)
  const manage = can(me, "student.manage")
  // inline edit (owner 2026-10-07, back 2026-10-12): only some cells — the rest open the side panel
  const edit = (st: Student, patch: Partial<Student>) => report(saveStudent({ ...st, ...patch }), "บันทึกแล้ว")
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const students = useStore((s) => s.students).filter((s) => scope.ids.includes(s.branchId))
  const families = useStore((s) => s.families)
  const classes = useStore((s) => s.classes)
  const entitlements = useEntitlements()
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const leaves = useStore((s) => s.leaves)
  const courses = useStore((s) => s.courses)
  const [q, setQ] = useState("")
  // owner 2026-10-06: filters sync to the URL (?grade=&status=) so a reload or shared link keeps them
  const [grade, setGrade] = useQueryState<string>("grade", "")
  const [status, setStatus] = useQueryState<string>("status", "")
  const [noFamily, setNoFamily] = useQueryState<string>("family", "")
  const [openId, setOpenId] = useState<ID | "new" | null>(null)

  const { sort, toggle } = useSort<StudentSort>("nickname")
  const byGrade = gradeCompare(branch.grades)
  /** sessions left on the lowest session pack (subscriptions count as plenty) */
  const left = (r: (typeof rows)[number]) => Math.min(Infinity, ...r.packs.filter(({ e }) => e.kind === "sessions").map(({ b }) => b.remaining))
  const rows = students.map((s) => {
    const st = Att.studentStatus(s, entitlements, leaves, today)
    const ents = Att.activeEntitlements(s.id, entitlements, today)
    const packs = ents.map((e) => ({ e, b: Att.balance(e, sessions, attendance, classes), c: courses.find((c) => c.id === e.courseId) }))
    // the course shown in the table (owner 2026-10-07: Course + Enroll / End date instead of classes): the current
    // package that ends first (the one renewals are about) — or, for students with none now, the last one they had
    const main = [...ents].sort((a, b) => a.to.localeCompare(b.to))[0]
      ?? entitlements.filter((e) => e.studentId === s.id && e.from <= today).sort((a, b) => b.to.localeCompare(a.to))[0]
    return { s, st, packs, main, mainCourse: main && courses.find((c) => c.id === main.courseId), fam: families.find((f) => f.id === s.familyId) }
  })
  const shown = rows
    .filter((r) => !grade || r.s.grade === grade)
    .filter((r) => !status || r.st === status)
    .filter((r) => noFamily !== "none" || !r.s.familyId)
    .filter((r) => !q || `${r.s.name} ${r.s.nickname} ${r.fam?.name ?? ""} ${r.fam?.parents.map((p) => p.phone).join(" ") ?? ""}`.includes(q))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "nickname" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "name" ? a.s.name.localeCompare(b.s.name, "th")
          : k === "grade" ? byGrade(a.s.grade, b.s.grade)
            : k === "course" ? (a.mainCourse?.name ?? "\uffff").localeCompare(b.mainCourse?.name ?? "\uffff", "th")
              : k === "package" ? (a.mainCourse ? packageLabel(a.mainCourse) : "\uffff").localeCompare(b.mainCourse ? packageLabel(b.mainCourse) : "\uffff", "th", { numeric: true })
              : k === "enroll" ? (a.main?.from ?? "9").localeCompare(b.main?.from ?? "9")
                : k === "end" ? (a.main?.to ?? "9").localeCompare(b.main?.to ?? "9")
              : k === "family" ? familyShortName(a.fam?.name ?? "").localeCompare(familyShortName(b.fam?.name ?? ""), "th")
                : k === "status" ? STATUS_PILL[a.st].label.localeCompare(STATUS_PILL[b.st].label, "th")
                  : left(a) - left(b)
      return sort.desc ? -v : v
    })
  const focusKeys = (r: (typeof rows)[number]) => [r.st === "renewal" && Att.renewalFollowUpDue(r.s, today) && "renewal", !r.s.familyId && "no_family"].filter(Boolean).join(" ") || undefined
  const pg = usePage(useFocusFirst(shown, focusKeys))

  // G3: export only for roles with student.export — and it is logged in the toast
  const exportCsv = () => {
    const head = ["ชื่อ", "ชื่อเล่น", "ชั้น", "ครอบครัว", "สถานะ"]
    const lines = shown.map((r) => [r.s.name, r.s.nickname, r.s.grade, r.fam?.name ?? "", STATUS_PILL[r.st].label].map((x) => `"${x.replace(/"/g, '""')}"`).join(","))
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `students-${branch.code}-${today}.csv`
    a.click()
    toast.success(`ส่งออก ${shown.length} รายชื่อแล้ว (ไม่รวมเบอร์โทร/ที่อยู่)`)
  }

  const month = today.slice(0, 7)
  const kpi = {
    active: rows.filter((r) => r.st === "active").length,
    renewal: rows.filter((r) => r.st === "renewal").length,
    // new = their very first package starts this month (same idea as Reports — paying students, not records added)
    fresh: rows.filter((r) => entitlements.filter((e) => e.studentId === r.s.id).map((e) => e.from).sort()[0]?.slice(0, 7) === month).length,
    noFamily: rows.filter((r) => !r.s.familyId).length,
  }
  const pick = (v: string) => setStatus(status === v ? "" : v)

  type Row = (typeof rows)[number]
  const ended = (r: Row) => !!r.main && r.main.to < today
  const columns: Column<Row>[] = [
    // owner 2026-10-12: photo and name in their own columns — click the photo to upload / change / remove
    { id: "photo", label: "รูป", width: "64px", cell: ({ s }) => <PhotoCell person={s} disabled={!manage} onSave={(photo, msg) => report(saveStudent({ ...s, photo }), msg)} /> },
    { id: "nickname", label: "ชื่อเล่น", width: "130px", sort: "nickname", required: true, cell: ({ s }) => (
      <div className="flex min-w-0 items-center gap-2">
        <EditCell value={s.nickname} display={<span className="inline-flex items-center gap-1">{s.nickname}<GenderIcon gender={s.gender} /></span>} disabled={!manage} className="flex-1 font-medium" onSave={(v) => edit(s, { nickname: v })} />
        {scope.multi && <BranchCode code={scope.code(s.branchId)} />}
      </div>
    ) },
    { id: "name", label: "ชื่อ-นามสกุล", width: "170px", sort: "name", className: "text-muted-foreground", cell: ({ s }) => <EditCell value={s.name} disabled={!manage} onSave={(v) => edit(s, { name: v })} /> },
    { id: "grade", label: "ชั้น", width: "76px", sort: "grade", cell: ({ s }) => <EditCell kind="select" value={s.grade} disabled={!manage} display={<GradeCell grade={s.grade} tone={gradeTone(s.grade)} />} options={branch.grades.map((g) => ({ value: g, label: g }))} onSave={(v) => edit(s, { grade: v })} /> },
    { id: "family", label: "ครอบครัว", width: "130px", sort: "family", className: "text-muted-foreground", cell: ({ fam }) => (
      fam ? <>{familyShortName(fam.name)}{!fam.parents.some((p) => p.lineLinked) && <NoLine />}</> : <span className="text-amber-700">ยังไม่ผูกครอบครัว</span>
    ) },
    { id: "course", label: "Course", width: "180px", sort: "course", cell: (r) => (
      r.mainCourse ? (
        <span className={cn("flex items-center gap-1.5", ended(r) && "text-muted-foreground")} title={r.packs.map((p) => p.c?.name).filter(Boolean).join(", ") || r.mainCourse.name}>
          {r.mainCourse.name}
          {r.packs.length > 1 && <span className="text-xs text-muted-foreground">+{r.packs.length - 1}</span>}
        </span>
      ) : <span className="text-muted-foreground">—</span>
    ) },
    { id: "package", label: "Package", width: "100px", sort: "package", info: PACKAGE_LEGEND, cell: (r) => (r.mainCourse ? <PackageBadge course={r.mainCourse} className={cn(ended(r) && "opacity-60")} /> : <span className="text-muted-foreground">—</span>) },
    { id: "enroll", label: "Enroll date", width: "100px", sort: "enroll", className: "text-muted-foreground tabular-nums", cell: ({ main }) => (main ? fmtDate(main.from) : "—") },
    { id: "end", label: "End date", width: "100px", sort: "end", cell: ({ main }) => (main ? fmtDate(main.to) : "—"),
      className: (r) => cn("tabular-nums", ended(r) ? "text-muted-foreground" : r.main && r.main.to <= addDays(today, 7) ? "font-medium text-amber-700" : "text-muted-foreground") },
    { id: "left", label: "เหลือ", width: "80px", sort: "left", align: "right", className: (r) => cn("tabular-nums", left(r) <= 2 && "font-semibold text-red-700"),
      cell: (r) => { const n = left(r); return Number.isFinite(n) ? `${n} คาบ` : <span className="text-muted-foreground">—</span> } },
    { id: "status", label: "สถานะ", width: "104px", sort: "status", align: "right", cell: ({ st }) => <Pill tone={STATUS_PILL[st].tone}>{STATUS_PILL[st].label}</Pill> },
  ]

  return (
    <Page>
      <PageHeader title="นักเรียน" description="นักเรียนทั้งหมด คอร์สที่เรียนอยู่ และวันจบแพ็กเกจ"
        actions={<>
          {can(me, "student.export") && <Button variant="outline" onClick={exportCsv}><DownloadIcon /> ส่งออก</Button>}
          {can(me, "student.manage") && <Button onClick={() => setOpenId("new")}><PlusIcon /> เพิ่มนักเรียน</Button>}
        </>} />
      <KpiRow>
        <Kpi icon={GraduationCapIcon} label="กำลังเรียน" value={kpi.active} tone="emerald" onClick={() => pick("active")} active={status === "active"} />
        <Kpi icon={RefreshCwIcon} label="รอต่อคอร์ส" value={kpi.renewal} tone="amber" valueClassName={kpi.renewal ? "text-amber-700" : undefined} onClick={() => pick("renewal")} active={status === "renewal"} />
        <Kpi icon={SparklesIcon} label="นักเรียนใหม่เดือนนี้" value={kpi.fresh} tone="sky" />
        <Kpi icon={UnlinkIcon} label="ยังไม่ผูกครอบครัว" value={kpi.noFamily} tone="red" valueClassName={kpi.noFamily ? "text-red-700" : undefined} onClick={() => setNoFamily(noFamily ? "" : "none")} active={noFamily === "none"} />
      </KpiRow>
      <Toolbar end={<><span className="text-xs text-muted-foreground">{shown.length} คน</span><ColumnsMenu id="students" columns={columns} />{scope.select}</>}>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ชื่อ / ชื่อเล่น / ครอบครัว / เบอร์" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-28" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="ทุกชั้น" options={branch.grades.map((g) => ({ value: g, label: g }))} />
        <NativeSelect className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ทุกสถานะ" options={Object.entries(STATUS_PILL).map(([k, v]) => ({ value: k, label: v.label }))} />
      </Toolbar>

      {/* owner 2026-10-07: one fact per column (grade sortable on its own); Course + Enroll / End date instead of
          classes, school only in the student panel. Name / nickname / grade edit in place — click the other cells to
          open. owner 2026-10-12: each person arranges the columns (drag · lock · show / hide) — DataTable */}
      <DataTable id="students" columns={columns} rows={pg.rows} rowKey={(r) => r.s.id} onRowClick={(r) => setOpenId(r.s.id)}
        rowProps={(r) => ({ "data-focus": focusKeys(r) })} sort={sort} onSort={toggle} minWidth={1300} empty="ไม่พบนักเรียน" />
      <Pager {...pg} unit="คน" />
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
    </Page>
  )
}

/** owner 2026-10-12: "no LINE" as an icon (hover explains) instead of text */
function NoLine() {
  return <UnlinkIcon role="img" aria-label="ไม่มี LINE" className="ml-1.5 inline size-3.5 align-[-2px] text-amber-600"><title>ไม่มีผู้ปกครองที่ผูก LINE — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้</title></UnlinkIcon>
}
