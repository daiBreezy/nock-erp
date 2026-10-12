"use client"

import { useState } from "react"
import { CalendarDaysIcon, ClockIcon, GraduationCapIcon, PlusIcon, SearchIcon, UsersIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { Pill, ROLE_TONE } from "@/components/app/badges"
import { useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { subjectColor } from "@/components/app/subject-color"
import { PhotoCell } from "@/components/app/photo-cell"
import { mondayOf, StaffPanel } from "@/components/staff/staff-panel"
import { Button } from "@/components/ui/button"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { addDays, toDateStr } from "@/domain/dates"
import { can, rolesAt, ROLE_LABEL, staffInBranch, subjectsAt } from "@/domain/rules/permissions"
import { teachersOf } from "@/domain/rules/scheduling"
import type { ID, Staff } from "@/domain/types"
import { EditCell } from "@/components/app/inline-edit"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type StaffSort = "nickname" | "name" | "role" | "type" | "week"

/** owner 2026-10-09: click a row for the side panel (information · แก้ไข · ปิดบัญชี); owner 2026-10-12: some cells
 *  (nickname · name · email · type) edit right in the table again */
export default function StaffPage() {
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const today = toDateStr(useNow())
  const [open, setOpen] = useState<ID | "new" | null>(null)
  const manage = can(me, "staff.manage")
  const saveStaff = useStore((s) => s.saveStaff)
  const edit = (st: Staff, patch: Partial<Staff>) => report(saveStaff({ ...st, ...patch }), "บันทึกแล้ว")
  const { sort, toggle } = useSort<StaffSort>("nickname")
  // "สอนสัปดาห์นี้" (owner 2026-10-09) — sessions this Monday–Sunday at this branch
  const from = mondayOf(today), to = addDays(from, 6)
  // owner 2026-10-09: Director / Area Manager can list several branches at once — then roles / subjects are all of theirs
  const scope = useBranchScope()
  const weekOf = (id: string) => sessions.filter((x) => !x.cancelled && scope.ids.includes(x.branchId) && x.date >= from && x.date <= to && teachersOf(x).includes(id))
  const [kind, setKind] = useState<"" | "teacher" | "part">("")
  const [q, setQ] = useState("")
  const all = staff
    .filter((s) => scope.ids.some((b) => staffInBranch(s, b)))
    .map((s) => ({ s, roles: scope.multi ? s.roles : rolesAt(s, branch.id), subjects: scope.multi ? s.subjects : subjectsAt(s, branch.id), week: weekOf(s.id) }))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "nickname" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "name" ? a.s.name.localeCompare(b.s.name, "th")
          : k === "role" ? (ROLE_LABEL[a.roles[0]] ?? "").localeCompare(ROLE_LABEL[b.roles[0]] ?? "", "th")
            : k === "type" ? Number(!!a.s.partTime) - Number(!!b.s.partTime)
              : a.week.length - b.week.length
      return Number(b.s.active) - Number(a.s.active) || (sort.desc ? -v : v)
    })
  const needle = q.trim().toLowerCase()
  const list = all
    .filter((x) => !kind || (kind === "teacher" ? x.roles.includes("teacher") : !!x.s.partTime))
    .filter((x) => !needle || `${x.s.nickname} ${x.s.name} ${x.s.nameEn ?? ""} ${x.s.email ?? ""} ${x.subjects.join(" ")}`.toLowerCase().includes(needle))
  const active = all.filter((x) => x.s.active)
  const kpi = {
    staff: active.length,
    teachers: active.filter((x) => x.roles.includes("teacher")).length,
    part: active.filter((x) => x.s.partTime).length,
    week: new Set(active.flatMap((x) => x.week.map((w) => w.id))).size,
  }

  type Row = (typeof list)[number]
  const ro = (x: Row) => !manage || !x.s.active
  const columns: Column<Row>[] = [
    // owner 2026-10-12: photo and name in their own columns — click the photo to upload / change / remove
    { id: "photo", label: "รูป", width: "64px", cell: (x) => <PhotoCell person={x.s} disabled={ro(x)} onSave={(photo, msg) => report(saveStaff({ ...x.s, photo }), msg)} /> },
    { id: "nickname", label: "ชื่อเล่น", width: "130px", sort: "nickname", required: true, cell: (x) => (
      <div className="flex min-w-0 items-center gap-2">
        <EditCell value={x.s.nickname} disabled={ro(x)} className="flex-1 font-medium" onSave={(v) => edit(x.s, { nickname: v })} />
        {scope.multi && x.s.branchIds.filter((b) => scope.ids.includes(b)).map((b) => <BranchCode key={b} code={scope.code(b)} />)}
      </div>
    ) },
    { id: "name", label: "ชื่อ-นามสกุล", width: "160px", sort: "name", className: "text-muted-foreground", cell: (x) => <EditCell value={x.s.name} disabled={ro(x)} onSave={(v) => edit(x.s, { name: v })} /> },
    // owner 2026-10-12: Part-time / Full-time both chips, each its own colour
    { id: "type", label: "ประเภท", width: "110px", sort: "type", cell: (x) => (
      <EditCell kind="select" value={x.s.partTime ? "part" : "full"} disabled={ro(x)}
        display={<span className={cn(CHIP, x.s.partTime ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800")}>{x.s.partTime ? "Part-time" : "Full-time"}</span>}
        options={[{ value: "full", label: "Full-time" }, { value: "part", label: "Part-time" }]} onSave={(v) => edit(x.s, { partTime: v === "part" })} />
    ) },
    { id: "role", label: scope.multi ? "ตำแหน่ง" : "ตำแหน่ง (สาขานี้)", width: "150px", sort: "role", cell: (x) => (
      <div className="flex gap-1">{x.roles.map((r) => <span key={r} className={cn(CHIP, ROLE_TONE[r])}>{ROLE_LABEL[r]}</span>)}{!x.s.active && <Pill>ปิดบัญชีแล้ว</Pill>}</div>
    ) },
    { id: "subjects", label: "วิชาที่สอน", width: "150px", cell: (x) => (
      <div className="flex gap-1">{x.subjects.length ? x.subjects.map((v) => <span key={v} className={cn(CHIP, subjectColor(v).chip)}>{v}</span>) : <span className="text-muted-foreground">—</span>}</div>
    ) },
    { id: "email", label: "อีเมล", width: "220px", className: "text-muted-foreground", cell: (x) => (
      <span className="flex items-center gap-1.5"><EditCell kind="email" value={x.s.email ?? ""} disabled={ro(x)} placeholder={x.s.canLogin ? "ใส่อีเมล" : "ไม่บังคับ"} className="flex-1" onSave={(v) => edit(x.s, { email: v })} />{!x.s.canLogin && <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px]">ไม่ล็อกอิน</span>}</span>
    ) },
    { id: "week", label: "สอนสัปดาห์นี้", width: "120px", sort: "week", align: "right", className: "tabular-nums text-muted-foreground", cell: (x) => (
      x.roles.includes("teacher") ? <span title="คาบที่สอน จ.–อา. สัปดาห์นี้ ที่สาขานี้">{x.week.length} คาบ <span className="text-xs">· {Math.round(x.week.reduce((m, w) => m + w.minutes, 0) / 6) / 10} ชม.</span></span> : "—"
    ) },
  ]

  return (
    <Page>
      <PageHeader title="บุคลากร" description="บทบาท วิชาที่สอน และวันทำงานแต่ละสาขา · กดที่แถวเพื่อดูข้อมูล / แก้ไข"
        actions={manage && <Button onClick={() => setOpen("new")}><PlusIcon /> เพิ่มบุคลากร</Button>} />
      <KpiRow>
        <Kpi icon={UsersIcon} label="บุคลากร" value={kpi.staff} onClick={() => setKind("")} />
        <Kpi icon={GraduationCapIcon} label="ครู" value={kpi.teachers} tone="sky" onClick={() => setKind(kind === "teacher" ? "" : "teacher")} active={kind === "teacher"} />
        <Kpi icon={ClockIcon} label="Part-time" value={kpi.part} tone="amber" onClick={() => setKind(kind === "part" ? "" : "part")} active={kind === "part"} />
        <Kpi icon={CalendarDaysIcon} label="คาบสอนสัปดาห์นี้" value={kpi.week} tone="emerald" />
      </KpiRow>
      <Toolbar end={<><span className="text-xs text-muted-foreground">{list.filter((x) => x.s.active).length} คน</span><ColumnsMenu id="staff" columns={columns} />{scope.select}</>}>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ชื่อ / ชื่อเล่น / อีเมล / วิชา" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Toolbar>
      {/* owner 2026-10-12: columns arranged per person (DataTable) · ประเภท right after the real name, both as chips */}
      <DataTable id="staff" columns={columns} rows={list} rowKey={(x) => x.s.id} onRowClick={(x) => setOpen(x.s.id)}
        rowClassName={(x) => !x.s.active && "opacity-50"} sort={sort} onSort={toggle} minWidth={1200} empty="ไม่พบบุคลากร" />
      <StaffPanel key={String(open)} target={open} onClose={() => setOpen(null)} />
    </Page>
  )
}

const CHIP = "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
