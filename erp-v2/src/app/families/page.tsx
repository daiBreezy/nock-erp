"use client"

import { useMemo, useState } from "react"
import { MapPinOffIcon, MessageCircleIcon, PlusIcon, SearchIcon, UnlinkIcon, UsersIcon } from "lucide-react"
import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { Pill } from "@/components/app/badges"
import { HEAD, Pager, ROW, SortHeader, TableShell, Th, usePage, useSort } from "@/components/app/data-table"
import { FamilyForm } from "@/components/app/family-form"
import { FamilySheet } from "@/components/app/family-sheet"
import { NativeSelect } from "@/components/app/native-select"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Family, ID, Student } from "@/domain/types"
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
  const [editing, setEditing] = useState<Family | "new" | null>(null)
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
  const needle = q.trim().toLowerCase()
  // a family belongs to this branch if one of its children studies here (or it has no children yet)
  const inScope = families.filter((f) => { const k = kidsOf.get(f.id) ?? []; return k.length === 0 || k.some((s) => scope.ids.includes(s.branchId)) })
  const lineDone = (f: Family) => linkedCount(f) === f.parents.length
  const rows = inScope
    .filter((f) => !noAddr || (!f.address && !f.postcode))
    .filter((f) => !lineF || (lineF === "linked" ? linkedCount(f) === f.parents.length : linkedCount(f) < f.parents.length))
    .filter((f) => !needle || `${f.name} ${f.parents.map((p) => `${p.name} ${p.phone}`).join(" ")} ${(kidsOf.get(f.id) ?? []).map((s) => `${s.nickname} ${s.name}`).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      const v = sort.key === "name" ? a.name.localeCompare(b.name, "th")
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

  return (
    <Page>
      <PageHeader title="ครอบครัว" description="ผู้ปกครอง ช่องทางติดต่อ LINE และลูกที่เรียนอยู่"
        actions={<Button onClick={() => setEditing("new")}><PlusIcon /> เพิ่มครอบครัว</Button>} />
      <KpiRow>
        <Kpi icon={UsersIcon} label="ครอบครัวทั้งหมด" value={kpi.all} onClick={() => { setLineF(""); setNoAddr(false) }} />
        <Kpi icon={MessageCircleIcon} label="ผูก LINE ครบ" value={kpi.linked} tone="emerald" onClick={() => setLineF(lineF === "linked" ? "" : "linked")} active={lineF === "linked"} />
        <Kpi icon={UnlinkIcon} label="ยังผูก LINE ไม่ครบ" value={kpi.missing} tone="amber" valueClassName={kpi.missing ? "text-amber-700" : undefined} onClick={() => setLineF(lineF === "missing" ? "" : "missing")} active={lineF === "missing"} />
        <Kpi icon={MapPinOffIcon} label="ยังไม่มีที่อยู่" value={kpi.noAddr} tone="red" valueClassName={kpi.noAddr ? "text-red-700" : undefined} onClick={() => setNoAddr(!noAddr)} active={noAddr} />
      </KpiRow>
      <Toolbar end={<span className="text-xs text-muted-foreground">{rows.length} ครอบครัว</span>}>
        {scope.select}
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ครอบครัว / ผู้ปกครอง / เบอร์ / ชื่อลูก" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-40" value={lineF} onChange={(e) => setLineF(e.target.value)} placeholder="LINE ทั้งหมด" options={[{ value: "linked", label: "ผูก LINE ครบ" }, { value: "missing", label: "ยังผูกไม่ครบ" }]} />
      </Toolbar>
      {orphans > 0 && <p className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">นักเรียน {orphans} คนยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้ (ดูได้ที่หน้านักเรียน)</p>}

      {/* owner 2026-10-07: family / parent / phone / address edit in place on hover; LINE and children open the panel */}
      <TableShell minWidth={1060} cols={["176px", "170px", "140px", "110px", "auto", "230px", "100px"]}>
        <thead className={HEAD}>
          <tr>
            <SortHeader label="ครอบครัว" k="name" sort={sort} onSort={toggle} />
            <SortHeader label="ผู้ปกครองหลัก" k="parent" sort={sort} onSort={toggle} />
            <Th>เบอร์โทร</Th>
            <SortHeader label="LINE" k="line" sort={sort} onSort={toggle} />
            <SortHeader label="ลูก" k="kids" sort={sort} onSort={toggle} />
            <SortHeader label="ที่อยู่" k="address" sort={sort} onSort={toggle} />
            <Th>รหัสไปรษณีย์</Th>
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((f) => {
            const primary = primaryOf(f)
            const kids = kidsOf.get(f.id) ?? []
            const lc = linkedCount(f)
            return (
              <tr key={f.id} onClick={() => setOpenId(f.id)} data-focus={focusKeys(f)} className={ROW}>
                <td className="truncate font-medium">{f.name}{scope.multi && <span className="ml-1.5 inline-flex gap-1 align-middle">{[...new Set((kidsOf.get(f.id) ?? []).map((k) => k.branchId))].map((b) => <BranchCode key={b} code={scope.code(b)} />)}</span>}</td>
                <td>
                  <div className="flex min-w-0 items-center gap-1">
                    <span className="flex-1 truncate">{primary?.name ?? "—"}</span>
                    {f.parents.length > 1 && <span className="shrink-0 text-xs text-muted-foreground">+{f.parents.length - 1}</span>}
                  </div>
                </td>
                <td className="text-muted-foreground tabular-nums">{primary?.phone || "—"}</td>
                <td className="truncate"><Pill tone={lc === f.parents.length ? "green" : lc > 0 ? "amber" : "red"}>{lc}/{f.parents.length} ผูกแล้ว</Pill></td>
                <td className="truncate">
                  {kids.slice(0, 3).map((s) => <span key={s.id} className="mr-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">{s.nickname} <span className={cn("rounded px-1 text-[10px]", gradeTone(s.grade))}>{s.grade}</span></span>)}
                  {kids.length > 3 && <span className="text-xs text-muted-foreground">+{kids.length - 3}</span>}
                  {kids.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="truncate text-xs text-muted-foreground" title={f.address}>{f.address || "—"}</td>
                <td className="text-xs text-muted-foreground tabular-nums">{f.postcode || "—"}</td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">ไม่มีครอบครัวตามเงื่อนไข</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="ครอบครัว" />

      <FamilySheet id={openId} onClose={() => setOpenId(null)} onEdit={(f) => setEditing(f)} />
      {editing && <FamilyForm family={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
