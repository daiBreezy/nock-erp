"use client"

import { familyShortName, PARENT_RELATIONS } from "@/domain/rules/people"
import { useMemo, useState } from "react"
import { MapPinOffIcon, MessageCircleIcon, PlusIcon, SearchIcon, UnlinkIcon, UsersIcon } from "lucide-react"
import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { BranchCodes, useBranchScope } from "@/components/app/branch-scope"
import { Pill } from "@/components/app/badges"
import { Pager, usePage, useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { FamilySheet } from "@/components/app/family-sheet"
import { NativeSelect } from "@/components/app/native-select"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Family, ID, Student } from "@/domain/types"
import { EditCell } from "@/components/app/inline-edit"
import { can } from "@/domain/rules/permissions"
import { report } from "@/lib/feedback"
import { useFocusFirst } from "@/components/app/focus-banner"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type FamSort = "name" | "parent" | "kids" | "line" | "address"

/** Families as a data table (owner 2026-09-28: cards were hard to scan). Click a row → detail panel. */
export default function FamiliesPage() {
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const [q, setQ] = useState("")
  const [lineF, setLineF] = useState("")
  const [noAddr, setNoAddr] = useState(false)
  const [openId, setOpenId] = useState<ID | null>(null)
  const { sort, toggle } = useSort<FamSort>("name")

  // children per family, built once (not a scan per row)
  const kidsOf = useMemo(() => {
    const m = new Map<ID, Student[]>()
    students.forEach((s) => { if (s.familyId) m.set(s.familyId, [...(m.get(s.familyId) ?? []), s]) })
    return m
  }, [students])

  const linkedCount = (f: Family) => f.parents.filter((p) => p.lineLinked).length
  const primaryOf = (f: Family) => f.parents.find((p) => p.primary) ?? f.parents[0]
  const me = useStore((s) => s.me())
  const saveFamily = useStore((s) => s.saveFamily)
  const manage = can(me, "family.manage")
  // inline edit (owner 2026-10-07, back 2026-10-12): only some cells — the rest open the side panel
  const edit = (f: Family, patch: Partial<Family>) => report(saveFamily({ ...f, ...patch }), "บันทึกแล้ว")
  const editPrimary = (f: Family, patch: Partial<Family["parents"][number]>) => {
    const p = primaryOf(f)
    return edit(f, { parents: f.parents.map((x) => (x === p ? { ...x, ...patch } : x)) })
  }
  const needle = q.trim().toLowerCase()
  // a family belongs to this branch if one of its children studies here (or it has no children yet)
  const inScope = families.filter((f) => { const k = kidsOf.get(f.id) ?? []; return k.length === 0 || k.some((s) => scope.ids.includes(s.branchId)) })
  const lineDone = (f: Family) => linkedCount(f) === f.parents.length
  const rows = inScope
    .filter((f) => !noAddr || (!f.address && !f.postcode))
    .filter((f) => !lineF || (lineF === "linked" ? linkedCount(f) === f.parents.length : linkedCount(f) < f.parents.length))
    .filter((f) => !needle || `${f.name} ${f.parents.map((p) => `${p.name} ${p.phone}`).join(" ")} ${(kidsOf.get(f.id) ?? []).map((s) => `${s.nickname} ${s.name}`).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      const v = sort.key === "name" ? familyShortName(a.name).localeCompare(familyShortName(b.name), "th")
        : sort.key === "parent" ? (primaryOf(a)?.name ?? "").localeCompare(primaryOf(b)?.name ?? "", "th")
        : sort.key === "address" ? (a.address ?? "").localeCompare(b.address ?? "", "th")
        : sort.key === "kids" ? (kidsOf.get(a.id)?.length ?? 0) - (kidsOf.get(b.id)?.length ?? 0)
          : linkedCount(a) / a.parents.length - linkedCount(b) / b.parents.length
      return sort.desc ? -v : v
    })
  const focusKeys = (f: (typeof rows)[number]) => [!f.address && !f.postcode && "no_address", !f.lineUserId && !f.parents.some((p) => p.lineLinked) && "no_line"].filter(Boolean).join(" ") || undefined
  const pg = usePage(useFocusFirst(rows, focusKeys))
  const orphans = students.filter((s) => scope.ids.includes(s.branchId) && !s.familyId).length

  const kpi = { all: inScope.length, linked: inScope.filter(lineDone).length, missing: inScope.filter((f) => !lineDone(f)).length, noAddr: inScope.filter((f) => !f.address && !f.postcode).length }

  const columns: Column<Family>[] = [
    { id: "name", label: "ครอบครัว", width: "150px", sort: "name", required: true, className: "font-medium", cell: (f) => (
      <div className="flex min-w-0 items-center">
        <EditCell value={f.name} display={familyShortName(f.name)} disabled={!manage} className="flex-1" onSave={(v) => edit(f, { name: v })} />
      </div>
    ) },
    // owner 2026-10-15: every list shows which branch each row comes from
    { id: "branch", label: "สาขา", width: "80px", cell: (f) => {
      return <BranchCodes ids={[...new Set((kidsOf.get(f.id) ?? []).map((k) => k.branchId))]} />
    } },
    { id: "parent", label: "ผู้ปกครองหลัก", width: "160px", sort: "parent", cell: (f) => {
      const primary = primaryOf(f)
      return (
        <div className="flex min-w-0 items-center gap-1">
          <EditCell value={primary?.name ?? ""} disabled={!manage || !primary} className="flex-1" onSave={(v) => editPrimary(f, { name: v })} />
          {f.parents.length > 1 && <span className="shrink-0 text-xs text-muted-foreground">+{f.parents.length - 1}</span>}
        </div>
      )
    } },
    // owner 2026-10-12: relationship is its own column (names carry no คุณพ่อ / คุณแม่)
    { id: "relationship", label: "ความสัมพันธ์", width: "110px", className: "text-muted-foreground", cell: (f) => {
      const primary = primaryOf(f)
      return <EditCell kind="select" value={primary?.relationship ?? ""} disabled={!manage || !primary} placeholder="—" options={PARENT_RELATIONS.map((r) => ({ value: r, label: r }))} onSave={(v) => editPrimary(f, { relationship: v || undefined })} />
    } },
    { id: "phone", label: "เบอร์โทร", width: "120px", className: "text-muted-foreground tabular-nums", cell: (f) => {
      const primary = primaryOf(f)
      return <EditCell kind="tel" value={primary?.phone ?? ""} disabled={!manage || !primary} placeholder="ใส่เบอร์" onSave={(v) => editPrimary(f, { phone: v })} />
    } },
    { id: "line", label: "LINE", width: "110px", sort: "line", cell: (f) => { const lc = linkedCount(f); return <Pill tone={lc === f.parents.length ? "green" : lc > 0 ? "amber" : "red"}>{lc}/{f.parents.length} ผูกแล้ว</Pill> } },
    // owner 2026-10-12: every child is listed — never hidden, on one line
    { id: "kids", label: "ลูก", width: "180px", sort: "kids", cell: (f) => {
      const kids = kidsOf.get(f.id) ?? []
      return (
        <div className="flex gap-1">
          {kids.map((s) => <span key={s.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">{s.nickname} <span className={cn("rounded px-1 text-[10px]", gradeTone(s.grade))}>{s.grade}</span></span>)}
          {kids.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      )
    } },
    { id: "address", label: "ที่อยู่", width: "220px", sort: "address", className: "text-xs text-muted-foreground", cell: (f) => <EditCell value={f.address ?? ""} disabled={!manage} placeholder="ใส่ที่อยู่" onSave={(v) => edit(f, { address: v || undefined })} /> },
    { id: "postcode", label: "รหัสไปรษณีย์", width: "100px", className: "text-xs text-muted-foreground tabular-nums", cell: (f) => <EditCell value={f.postcode ?? ""} disabled={!manage} placeholder="—" onSave={(v) => edit(f, { postcode: v || undefined })} /> },
  ]

  return (
    <Page>
      <PageHeader title="ครอบครัว" description="ผู้ปกครอง ช่องทางติดต่อ LINE และลูกที่เรียนอยู่"
        actions={<Button onClick={() => setOpenId("new")}><PlusIcon /> เพิ่มครอบครัว</Button>} />
      <KpiRow>
        <Kpi icon={UsersIcon} label="ครอบครัวทั้งหมด" value={kpi.all} onClick={() => { setLineF(""); setNoAddr(false) }} />
        <Kpi icon={MessageCircleIcon} label="ผูก LINE ครบ" value={kpi.linked} tone="emerald" onClick={() => setLineF(lineF === "linked" ? "" : "linked")} active={lineF === "linked"} />
        <Kpi icon={UnlinkIcon} label="ยังผูก LINE ไม่ครบ" value={kpi.missing} tone="amber" valueClassName={kpi.missing ? "text-amber-700" : undefined} onClick={() => setLineF(lineF === "missing" ? "" : "missing")} active={lineF === "missing"} />
        <Kpi icon={MapPinOffIcon} label="ยังไม่มีที่อยู่" value={kpi.noAddr} tone="red" valueClassName={kpi.noAddr ? "text-red-700" : undefined} onClick={() => setNoAddr(!noAddr)} active={noAddr} />
      </KpiRow>
      <Toolbar end={<><span className="text-xs text-muted-foreground">{rows.length} ครอบครัว</span><ColumnsMenu id="families" columns={columns} />{scope.select}</>}>
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ครอบครัว / ผู้ปกครอง / เบอร์ / ชื่อลูก" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-40" value={lineF} onChange={(e) => setLineF(e.target.value)} placeholder="LINE ทั้งหมด" options={[{ value: "linked", label: "ผูก LINE ครบ" }, { value: "missing", label: "ยังผูกไม่ครบ" }]} />
      </Toolbar>
      {orphans > 0 && <p className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">นักเรียน {orphans} คนยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้ (ดูได้ที่หน้านักเรียน)</p>}

      {/* owner 2026-10-07: family / parent / phone / address edit in place on hover; LINE and children open the panel ·
          owner 2026-10-12: one line per row, every child listed · columns arranged per person (DataTable) */}
      <DataTable id="families" columns={columns} rows={pg.rows} rowKey={(f) => f.id} onRowClick={(f) => setOpenId(f.id)}
        rowProps={(f) => ({ "data-focus": focusKeys(f) })} sort={sort} onSort={toggle} minWidth={1160} empty="ไม่มีครอบครัวตามเงื่อนไข" />
      <Pager {...pg} unit="ครอบครัว" />

      <FamilySheet key={openId ?? "none"} id={openId} onClose={() => setOpenId(null)} />
    </Page>
  )
}
