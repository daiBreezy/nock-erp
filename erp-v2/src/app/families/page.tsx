"use client"

import { useMemo, useState } from "react"
import { PlusIcon, SearchIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Pager, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { FamilyForm } from "@/components/app/family-form"
import { FamilySheet } from "@/components/app/family-sheet"
import { NativeSelect } from "@/components/app/native-select"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Family, ID, Student } from "@/domain/types"
import { useBranch } from "@/lib/hooks"
import { useFocusFirst } from "@/components/app/focus-banner"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type FamSort = "name" | "kids" | "line"

/** Families as a data table (owner 2026-09-28: cards were hard to scan). Click a row → detail panel. */
export default function FamiliesPage() {
  const branch = useBranch()
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const [q, setQ] = useState("")
  const [lineF, setLineF] = useState("")
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
  const needle = q.trim().toLowerCase()
  const rows = families
    // a family belongs to this branch if one of its children studies here (or it has no children yet)
    .filter((f) => { const k = kidsOf.get(f.id) ?? []; return k.length === 0 || k.some((s) => s.branchId === branch.id) })
    .filter((f) => !lineF || (lineF === "linked" ? linkedCount(f) === f.parents.length : linkedCount(f) < f.parents.length))
    .filter((f) => !needle || `${f.name} ${f.parents.map((p) => `${p.name} ${p.phone}`).join(" ")} ${(kidsOf.get(f.id) ?? []).map((s) => `${s.nickname} ${s.name}`).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      const v = sort.key === "name" ? a.name.localeCompare(b.name, "th")
        : sort.key === "kids" ? (kidsOf.get(a.id)?.length ?? 0) - (kidsOf.get(b.id)?.length ?? 0)
          : linkedCount(a) / a.parents.length - linkedCount(b) / b.parents.length
      return sort.desc ? -v : v
    })
  const focusKeys = (f: (typeof rows)[number]) => [!f.address && !f.postcode && "no_address", !f.lineUserId && !f.parents.some((p) => p.lineLinked) && "no_line"].filter(Boolean).join(" ") || undefined
  const pg = usePage(useFocusFirst(rows, focusKeys))
  const orphans = students.filter((s) => s.branchId === branch.id && !s.familyId).length

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ครอบครัว / ผู้ปกครอง / เบอร์ / ชื่อลูก" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-40" value={lineF} onChange={(e) => setLineF(e.target.value)} placeholder="LINE ทั้งหมด" options={[{ value: "linked", label: "ผูก LINE ครบ" }, { value: "missing", label: "ยังผูกไม่ครบ" }]} />
        <Button className="ml-auto" onClick={() => setEditing("new")}><PlusIcon /> เพิ่มครอบครัว</Button>
      </div>
      {orphans > 0 && <p className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">นักเรียน {orphans} คนยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้ (ดูได้ที่หน้านักเรียน)</p>}

      <TableShell minWidth={900}>
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <SortHeader label="ครอบครัว" k="name" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">ผู้ปกครองหลัก</th>
            <th className="px-3 py-2.5 text-left font-medium">เบอร์โทร</th>
            <SortHeader label="LINE" k="line" sort={sort} onSort={toggle} />
            <SortHeader label="ลูก" k="kids" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">ที่อยู่</th>
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((f) => {
            const primary = f.parents.find((p) => p.primary) ?? f.parents[0]
            const kids = kidsOf.get(f.id) ?? []
            const lc = linkedCount(f)
            return (
              <tr key={f.id} onClick={() => setOpenId(f.id)} data-focus={focusKeys(f)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2.5">
                <td className="font-medium">{f.name}</td>
                <td>{primary?.name}{f.parents.length > 1 && <span className="text-xs text-muted-foreground"> +{f.parents.length - 1}</span>}</td>
                <td className="whitespace-nowrap tabular-nums text-muted-foreground">{primary?.phone}</td>
                <td><Pill tone={lc === f.parents.length ? "green" : lc > 0 ? "amber" : "red"}>{lc}/{f.parents.length} ผูกแล้ว</Pill></td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {kids.slice(0, 3).map((s) => <span key={s.id} className="rounded-full border px-2 py-0.5 text-xs">{s.nickname} <span className={cn("rounded px-1 text-[10px]", gradeTone(s.grade))}>{s.grade}</span></span>)}
                    {kids.length > 3 && <span className="text-xs text-muted-foreground">+{kids.length - 3}</span>}
                    {kids.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="max-w-56 truncate text-xs text-muted-foreground">{f.address ? `${f.address}${f.postcode ? ` ${f.postcode}` : ""}` : "—"}</td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">ไม่มีครอบครัวตามเงื่อนไข</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="ครอบครัว" />

      <FamilySheet id={openId} onClose={() => setOpenId(null)} onEdit={(f) => setEditing(f)} />
      {editing && <FamilyForm family={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
