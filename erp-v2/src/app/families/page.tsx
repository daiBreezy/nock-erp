"use client"

import { tx } from "@/lib/i18n"
import { birthdaysToday, familyShortName, PARENT_RELATIONS } from "@/domain/rules/people"
import { toDateStr } from "@/domain/dates"
import { useNow } from "@/lib/hooks"
import { useMemo, useState } from "react"
import { BusIcon, CakeIcon, PlusIcon, TriangleAlertIcon, UnlinkIcon, UsersIcon, UsersRoundIcon } from "lucide-react"
import { ListPage, ShowChip, SearchBox } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { BranchCodes, useBranchScope } from "@/components/app/branch-scope"
import { Pill } from "@/components/app/badges"
import { Pager, usePage, useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { FamilySheet } from "@/components/app/family-sheet"
import { FilterMenu } from "@/components/app/filter-menu"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import type { Family, ID, Student } from "@/domain/types"
import { EditCell } from "@/components/app/inline-edit"
import { can } from "@/domain/rules/permissions"
import { branchHasBus } from "@/domain/rules/settings"
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
  const allBranches = useStore((s) => s.branches)
  const [q, setQ] = useState("")
  const [lineF, setLineF] = useState("")
  const [follow, setFollow] = useState(false) // owner 2026-11-20: "ต้องตามเรื่อง" = LINE not fully linked, or a bus family with no address
  const [busF, setBusF] = useState(false)
  const [multi, setMulti] = useState(false) // owner Row 41: families with more than one child
  const [showArchived, setShowArchived] = useState(false) // NEGATIVE-ACTIONS.md §5: ดูที่เก็บเข้าคลัง
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
  const today = toDateStr(useNow())
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
  // NEGATIVE-ACTIONS.md §5: hide archived families by default; the ShowChip brings them back so they can be restored
  const active = inScope.filter((f) => !f.archived)
  const archivedCount = inScope.length - active.length
  const lineDone = (f: Family) => linkedCount(f) === f.parents.length
  const usesBus = (f: Family) => (kidsOf.get(f.id) ?? []).some((s) => s.usesBus && !s.archived)
  // an address only matters when the family rides the bus (owner 2026-11-20) — so only then is a missing one a thing to chase
  const noAddress = (f: Family) => !f.address && !f.postcode
  const needsFollow = (f: Family) => !lineDone(f) || (usesBus(f) && noAddress(f))
  const busOn = scope.ids.some((id) => branchHasBus(allBranches.find((b) => b.id === id)))
  const rows = (showArchived ? inScope : active)
    .filter((f) => !multi || (kidsOf.get(f.id)?.length ?? 0) >= 2)
    .filter((f) => !follow || needsFollow(f))
    .filter((f) => !busF || usesBus(f))
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

  const kpi = { all: active.length, multi: active.filter((f) => (kidsOf.get(f.id)?.length ?? 0) >= 2).length, bus: active.filter(usesBus).length, follow: active.filter(needsFollow).length, noLine: active.filter((f) => !lineDone(f)).length, busNoAddr: active.filter((f) => usesBus(f) && noAddress(f)).length }

  const columns: Column<Family>[] = [
    { id: "name", label: "ครอบครัว", width: "150px", sort: "name", required: true, className: "font-medium", cell: (f) => (
      <div className="flex min-w-0 items-center gap-1">
        <EditCell value={f.name} display={familyShortName(f.name)} disabled={!manage || !!f.archived} className="min-w-0 flex-1" onSave={(v) => edit(f, { name: v })} />
        {/* owner 2026-11-20: same "not on LINE" icon as the Students list — always rendered in a fixed slot so names line up */}
        <span className="inline-grid size-4 shrink-0 place-items-center">
          {!lineDone(f) && <UnlinkIcon role="img" aria-label={linkedCount(f) === 0 ? "ไม่มี LINE" : "ผูก LINE ไม่ครบ"} className="size-3.5 text-warning"><title>{linkedCount(f) === 0 ? "ไม่มีผู้ปกครองที่ผูก LINE — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้" : `ผูก LINE แล้ว ${linkedCount(f)}/${f.parents.length} คน`}</title></UnlinkIcon>}
        </span>
        {/* owner 2026-11-20: a small cake while anyone in the family has a birthday today */}
        {birthdaysToday(f, kidsOf.get(f.id) ?? [], today).length > 0 && <span title={`${tx("วันเกิดวันนี้")}: ${birthdaysToday(f, kidsOf.get(f.id) ?? [], today).join(", ")}`} className="inline-flex shrink-0 text-pink-500"><CakeIcon className="size-3.5" aria-label={tx("วันเกิดวันนี้")} /></span>}
        {f.archived && <Pill tone="gray">เก็บเข้าคลัง</Pill>}
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
          {kids.map((s) => <span key={s.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">{s.nickname} <span className={cn("rounded px-1 text-2xs", gradeTone(s.grade))}>{s.grade}</span></span>)}
          {kids.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      )
    } },
    { id: "address", label: "ที่อยู่", width: "220px", sort: "address", className: "text-xs text-muted-foreground", cell: (f) => <EditCell value={f.address ?? ""} disabled={!manage} placeholder="ใส่ที่อยู่" onSave={(v) => edit(f, { address: v || undefined })} /> },
    { id: "postcode", label: "รหัสไปรษณีย์", width: "100px", className: "text-xs text-muted-foreground tabular-nums", cell: (f) => <EditCell value={f.postcode ?? ""} disabled={!manage} placeholder="—" onSave={(v) => edit(f, { postcode: v || undefined })} /> },
  ]

  return (
    <ListPage branch={scope.select} title="ครอบครัว" description="ผู้ปกครอง ช่องทางติดต่อ LINE และลูกที่เรียนอยู่"
        actions={<Button onClick={() => setOpenId("new")}><PlusIcon /> เพิ่มครอบครัว</Button>}
      kpis={<>
        <Kpi icon={UsersIcon} label="ครอบครัวทั้งหมด" value={kpi.all} info={orphans > 0 ? tx("นักเรียน {0} คนยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้ (ดูได้ที่หน้านักเรียน)", [orphans]) : undefined} onClick={() => { setLineF(""); setFollow(false); setBusF(false); setMulti(false) }} />
        <Kpi icon={UsersRoundIcon} label="มีลูกหลายคน" value={kpi.multi} tone="special" onClick={() => setMulti(!multi)} active={multi} />
        {busOn && <Kpi icon={BusIcon} label="ใช้รถรับส่ง" value={kpi.bus} tone="sky" onClick={() => setBusF(!busF)} active={busF} />}
        <Kpi icon={TriangleAlertIcon} label="ต้องตามเรื่อง" value={kpi.follow} tone="amber" emphasis={kpi.follow > 0}
          sub={<>ผูก LINE ไม่ครบ {kpi.noLine}{busOn && <>{" · "}รถไม่มีที่อยู่ {kpi.busNoAddr}</>}</>} onClick={() => setFollow(!follow)} active={follow}
          info="ครอบครัวที่ยังผูก LINE ไม่ครบทุกคน หรือใช้รถรับส่งแต่ยังไม่มีที่อยู่ (รถต้องรู้ที่อยู่)" />
      </>}
      search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาครอบครัว / ผู้ปกครอง / เบอร์ / ชื่อลูก" />}
      filters={<>
        <FilterMenu
          extra={(archivedCount > 0 || showArchived) ? <ShowChip label="ที่เก็บเข้าคลัง" on={showArchived} count={archivedCount} onChange={setShowArchived} /> : undefined}
          fields={[{ id: "line", label: "LINE", value: lineF, onChange: setLineF, placeholder: "LINE ทั้งหมด", options: [{ value: "linked", label: "ผูก LINE ครบ" }, { value: "missing", label: "ยังผูกไม่ครบ" }] }]} />
        <ColumnsMenu id="families" columns={columns} />
      </>}>
      {/* owner 2026-10-07: family / parent / phone / address edit in place on hover; LINE and children open the panel ·
          owner 2026-10-12: one line per row, every child listed · columns arranged per person (DataTable) */}
      <DataTable id="families" columns={columns} rows={pg.rows} rowKey={(f) => f.id} onRowClick={(f) => setOpenId(f.id)}
        rowProps={(f) => ({ "data-focus": focusKeys(f) })} sort={sort} onSort={toggle} minWidth={1160} empty="ไม่มีครอบครัวตามเงื่อนไข" />
      <Pager {...pg} unit="ครอบครัว" />

      <FamilySheet key={openId ?? "none"} id={openId} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}
