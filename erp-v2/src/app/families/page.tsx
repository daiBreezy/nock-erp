"use client"

import { tx } from "@/lib/i18n"
import { birthdaysToday, familyShortName, PARENT_RELATIONS, familyDisplay } from "@/domain/rules/people"
import { toDateStr } from "@/domain/dates"
import { useEntitlements, useLeadSets, useNow, useOpenFromQuery } from "@/lib/hooks"
import { familyStatus, type FamilyStatus } from "@/domain/rules/attendance"
import { STATUS_PILL } from "@/components/app/student-status"
import { useMemo, useState } from "react"
import { BusIcon, CakeIcon, PlusIcon, TriangleAlertIcon, UnlinkIcon, UsersIcon, UsersRoundIcon } from "lucide-react"
import { ListPage, SearchBox } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { BranchCodes, useBranchScope } from "@/components/app/branch-scope"
import { Pill } from "@/components/app/badges"
import { Pager, usePage, useSort } from "@/components/app/data-table"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { FamilySheet } from "@/components/app/family-sheet"
import { FilterMenu } from "@/components/app/filter-menu"
import { gradeTone } from "@/components/app/subject-color"
import { InvoiceFollowCell, InvoiceFollowInfo, useFollowedByStudent } from "@/components/billing/invoice-follow"
import { Button } from "@/components/ui/button"
import type { Family, ID, Student } from "@/domain/types"
import { EditCell } from "@/components/app/inline-edit"
import { can } from "@/domain/rules/permissions"
import { branchHasBus } from "@/domain/rules/settings"
import { report } from "@/lib/feedback"
import { useFocusFirst } from "@/components/app/focus-banner"
import { cn } from "@/lib/utils"
import { tagChip, tagInk } from "@/components/app/tags"
import { useStore } from "@/store/store"

type FamSort = "name" | "status" | "parent" | "kids" | "line" | "address"

/** owner 2026-11-26: a family is Active while ANY of its children is Active (Renewal counts); Archived when it was put away; otherwise Inactive */
type FamStatus = FamilyStatus

/** Families as a data table (owner 2026-09-28: cards were hard to scan). Click a row → detail panel. */
export default function FamiliesPage() {
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  // owner 2026-11-25: this page lists CUSTOMERS only — a Lead (not paid yet) lives in the CRM
  const leadSet = useLeadSets()
  const families = useStore((s) => s.families).filter((f) => !leadSet.familyIds.has(f.id))
  const students = useStore((s) => s.students).filter((s) => !leadSet.studentIds.has(s.id))
  const allBranches = useStore((s) => s.branches)
  const [q, setQ] = useState("")
  const [lineF, setLineF] = useState("")
  const [follow, setFollow] = useState(false) // owner 2026-11-20: "ต้องตามเรื่อง" = LINE not fully linked, or a bus family with no address
  const [busF, setBusF] = useState("") // owner 2026-11-26: "" · "bus" ใช้รถ · "nobus" ไม่ใช้รถ · "noaddr" ใช้รถแต่ไม่มีที่อยู่
  // owner 2026-11-20: the cake chip on the total card — click = families with a birthday today first
  const [bdayFirst, setBdayFirst] = useState(false)
  const [kidsF, setKidsF] = useState("") // owner Row 41 + 2026-11-26: "" · "multi" มีลูกหลายคน · "single" ลูกคนเดียว
  const [statusF, setStatusF] = useState("") // owner 2026-11-26: "" = every family EXCEPT archived · active · inactive · archived (the only way to see them)
  const [openId, setOpenId] = useState<ID | null>(null)
  useOpenFromQuery((id) => setOpenId(id as ID))
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
  // owner 2026-11-26: archived families never show in the table — they are only seen by choosing "เก็บเข้าคลัง" in the status filter (to restore them)
  const active = inScope.filter((f) => !f.archived)
  const archivedCount = inScope.length - active.length
  const ents = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const statusOf = new Map<ID, FamStatus>()
  for (const f of families) statusOf.set(f.id, familyStatus(f, kidsOf.get(f.id) ?? [], ents, leaves, today, renewalDays))
  const lineDone = (f: Family) => linkedCount(f) === f.parents.length
  const usesBus = (f: Family) => (kidsOf.get(f.id) ?? []).some((s) => s.usesBus && !s.archived)
  // an address only matters when the family rides the bus (owner 2026-11-20) — so only then is a missing one a thing to chase
  const noAddress = (f: Family) => !f.address && !f.postcode
  const needsFollow = (f: Family) => !lineDone(f) || (usesBus(f) && noAddress(f))
  const busOn = scope.ids.some((id) => branchHasBus(allBranches.find((b) => b.id === id)))
  const rows = (statusF === "archived" ? inScope.filter((f) => f.archived) : active.filter((f) => !statusF || statusOf.get(f.id) === statusF))
    .filter((f) => !kidsF || (kidsF === "multi" ? (kidsOf.get(f.id)?.length ?? 0) >= 2 : (kidsOf.get(f.id)?.length ?? 0) === 1))
    .filter((f) => !follow || needsFollow(f))
    .filter((f) => !busF || (busF === "bus" ? usesBus(f) : busF === "nobus" ? !usesBus(f) : usesBus(f) && noAddress(f)))
    .filter((f) => !lineF || (lineF === "linked" ? linkedCount(f) === f.parents.length : linkedCount(f) < f.parents.length))
    .filter((f) => !needle || `${f.name} ${f.parents.map((p) => `${p.name} ${p.phone}`).join(" ")} ${(kidsOf.get(f.id) ?? []).map((s) => `${s.nickname} ${s.name}`).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      if (bdayFirst) { const d = Number(birthdaysToday(b, kidsOf.get(b.id) ?? [], today).length > 0) - Number(birthdaysToday(a, kidsOf.get(a.id) ?? [], today).length > 0); if (d) return d }
      const v = sort.key === "name" ? familyShortName(a.name).localeCompare(familyShortName(b.name), "th")
        : sort.key === "status" ? (statusOf.get(a.id) ?? "").localeCompare(statusOf.get(b.id) ?? "")
        : sort.key === "parent" ? (primaryOf(a)?.name ?? "").localeCompare(primaryOf(b)?.name ?? "", "th")
        : sort.key === "address" ? (a.address ?? "").localeCompare(b.address ?? "", "th")
        : sort.key === "kids" ? (kidsOf.get(a.id)?.length ?? 0) - (kidsOf.get(b.id)?.length ?? 0)
          : linkedCount(a) / a.parents.length - linkedCount(b) / b.parents.length
      return sort.desc ? -v : v
    })
  const bdayPeople = active.reduce((n, f) => n + birthdaysToday(f, kidsOf.get(f.id) ?? [], today).length, 0)
  const focusKeys = (f: (typeof rows)[number]) => [!f.address && !f.postcode && "no_address", !f.lineUserId && !f.parents.some((p) => p.lineLinked) && "no_line"].filter(Boolean).join(" ") || undefined
  const pg = usePage(useFocusFirst(rows, focusKeys))
  const orphans = students.filter((s) => scope.ids.includes(s.branchId) && !s.familyId).length

  const kpi = { all: active.length, multi: active.filter((f) => (kidsOf.get(f.id)?.length ?? 0) >= 2).length, bus: active.filter(usesBus).length, follow: active.filter(needsFollow).length, noLine: active.filter((f) => !lineDone(f)).length, busNoAddr: active.filter((f) => usesBus(f) && noAddress(f)).length }

  const followOf = useFollowedByStudent(today)
  const columns: Column<Family>[] = [
    { id: "name", label: "ครอบครัว", width: "150px", sort: "name", required: true, className: "font-medium", cell: (f) => (
      <div className="flex min-w-0 items-center gap-1">
        <EditCell value={f.name} display={familyDisplay(f.name)} disabled={!manage || !!f.archived} className="min-w-0 flex-1" onSave={(v) => edit(f, { name: v })} />
        {/* the status icons sit a little apart from the name (owner 2026-11-20) */}
        <span className="ml-2 flex shrink-0 items-center gap-1.5">
        {/* owner 2026-11-20: back after the LINE column went hidden (default) — the "not on LINE" icon sits beside the name again, in a fixed slot so names line up */}
        <span className="inline-grid size-4 shrink-0 place-items-center">
          {!lineDone(f) && <UnlinkIcon role="img" aria-label={linkedCount(f) === 0 ? "ไม่มี LINE" : "ผูก LINE ไม่ครบ"} className="size-3.5 text-warning"><title>{linkedCount(f) === 0 ? "ไม่มีผู้ปกครองที่ผูก LINE — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้" : `ผูก LINE แล้ว ${linkedCount(f)}/${f.parents.length} คน`}</title></UnlinkIcon>}
        </span>
        {/* owner 2026-11-20: a small cake while anyone in the family has a birthday today */}
        {birthdaysToday(f, kidsOf.get(f.id) ?? [], today).length > 0 && <span title={`${tx("วันเกิดวันนี้")}: ${birthdaysToday(f, kidsOf.get(f.id) ?? [], today).join(", ")}`} className={cn("inline-grid size-4 shrink-0 place-items-center opacity-70", tagInk("birthday", "today"))}><CakeIcon className="size-3.5" aria-label={tx("วันเกิดวันนี้")} /></span>}
        </span>
      </div>
    ) },
    // owner 2026-10-15: every list shows which branch each row comes from
    { id: "branch", label: "สาขา", width: "80px", cell: (f) => {
      return <BranchCodes ids={[...new Set((kidsOf.get(f.id) ?? []).map((k) => k.branchId))]} />
    } },
    // owner 2026-11-26: sent-and-unpaid invoices of any child — an icon coloured by the nearest pay-by date, hover for the list
    { id: "invoice", label: "INV", width: "80px", align: "center", info: <InvoiceFollowInfo />, cell: (f) => <InvoiceFollowCell items={followOf((kidsOf.get(f.id) ?? []).map((k) => k.id))} nameOf={(id) => (kidsOf.get(f.id) ?? []).find((k) => k.id === id)?.nickname ?? ""} /> },
    // owner 2026-11-26: Active while any child is Active
    { id: "status", label: "สถานะ", width: "100px", sort: "status", alignWhenLast: "right", cell: (f) => {
      const st = statusOf.get(f.id) ?? "inactive"
      return <Pill tone={STATUS_PILL[st].tone}>{STATUS_PILL[st].label}</Pill>
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
    { id: "line", label: "LINE", width: "110px", sort: "line", defaultHidden: true, cell: (f) => { const lc = linkedCount(f); return <Pill tone={lc === f.parents.length ? "green" : lc > 0 ? "amber" : "red"}>{lc}/{f.parents.length} ผูกแล้ว</Pill> } },
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
  ]

  return (
    <ListPage branch={scope.select} title="ครอบครัว" description="ผู้ปกครอง ช่องทางติดต่อ LINE และลูกที่เรียนอยู่"
        actions={<Button onClick={() => setOpenId("new")}><PlusIcon /> เพิ่มครอบครัว</Button>}
      kpis={<>
        <Kpi icon={UsersIcon} label="ครอบครัวทั้งหมด" value={bdayPeople > 0 ? <span className="inline-flex items-center gap-2">{kpi.all}
          <span role="button" tabIndex={0} aria-pressed={bdayFirst} title={tx("วันเกิดวันนี้ {0} คน — กดเพื่อเอาขึ้นก่อน", [bdayPeople])}
            onClick={(e) => { e.stopPropagation(); setBdayFirst(!bdayFirst) }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setBdayFirst(!bdayFirst) } }}
            className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 text-xs leading-5 font-medium transition", tagChip("birthday", "today"), bdayFirst && "ring-2 ring-primary")}><CakeIcon className="size-3" />{bdayPeople}</span></span> : kpi.all} info={orphans > 0 ? tx("นักเรียน {0} คนยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้ (ดูได้ที่หน้านักเรียน)", [orphans]) : undefined} onClick={() => { setLineF(""); setFollow(false); setBusF(""); setKidsF(""); setStatusF(""); setBdayFirst(false) }} />
        <Kpi icon={UsersRoundIcon} label="มีลูกหลายคน" value={kpi.multi} tone="special" onClick={() => setKidsF(kidsF === "multi" ? "" : "multi")} active={kidsF === "multi"} />
        {busOn && <Kpi icon={BusIcon} label="ใช้รถรับส่ง" value={kpi.bus} tone="sky" onClick={() => setBusF(busF === "bus" ? "" : "bus")} active={busF === "bus"} />}
        <Kpi icon={TriangleAlertIcon} label="ต้องตามเรื่อง" value={kpi.follow} tone="amber" emphasis={kpi.follow > 0}
          sub={<>ผูก LINE ไม่ครบ {kpi.noLine}{busOn && <>{" · "}รถไม่มีที่อยู่ {kpi.busNoAddr}</>}</>} onClick={() => setFollow(!follow)} active={follow}
          info="ผูก LINE ยังไม่ครบทุกคน · ใช้รถรับส่งแต่ยังไม่มีที่อยู่ — รถต้องรู้ที่อยู่" />
      </>}
      search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาครอบครัว / ผู้ปกครอง / เบอร์ / ชื่อลูก" />}
      filters={<>
        <FilterMenu
          fields={[
            { id: "status", label: tx("สถานะ"), value: statusF, onChange: setStatusF, placeholder: tx("ทั้งหมด (ไม่รวมเก็บเข้าคลัง)"), options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "archived", label: `${tx("เก็บเข้าคลัง")} (${archivedCount})` }] },
            { id: "line", label: "LINE", value: lineF, onChange: setLineF, placeholder: "LINE ทั้งหมด", options: [{ value: "linked", label: "ผูก LINE ครบ" }, { value: "missing", label: "ยังผูกไม่ครบ" }] },
            { id: "kids", label: tx("จำนวนลูก"), value: kidsF, onChange: setKidsF, placeholder: tx("ทุกครอบครัว"), options: [{ value: "multi", label: tx("มีลูกหลายคน") }, { value: "single", label: tx("ลูกคนเดียว") }] },
            { id: "bus", label: tx("รถรับส่ง"), value: busF, onChange: setBusF, placeholder: tx("ทั้งหมด"), hidden: !busOn, options: [{ value: "bus", label: tx("ใช้รถรับส่ง") }, { value: "nobus", label: tx("ไม่ใช้รถ") }, { value: "noaddr", label: tx("ใช้รถแต่ยังไม่มีที่อยู่") }] },
          ]} />
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
