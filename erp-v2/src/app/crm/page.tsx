"use client"

import { useState } from "react"
import { CalendarClockIcon, ChevronRightIcon, LayoutGridIcon, PlusIcon, RotateCcwIcon, SearchIcon, TableIcon, TrendingUpIcon, UserCheckIcon, UserSearchIcon, UsersIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Pager, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { avatarTone, gradeTone, initial, subjectColor } from "@/components/app/subject-color"
import { LeadDialog } from "@/components/crm/lead-dialog"
import { LeadSheet } from "@/components/crm/lead-sheet"
import { EnrollInbox } from "@/components/crm/enroll-review"
import { SurveyCalls } from "@/components/crm/survey-calls"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fmtDate, toDateStr } from "@/domain/dates"
import { leadFlags } from "@/domain/rules/reports"
import { useFocusFirst } from "@/components/app/focus-banner"
import { crmKpis, DRAGGABLE_STAGES, groupOf, LEAD_SOURCE_LABEL, leadDetail, stageGroupLabel, PIPELINE_GROUPS, type LeadDetail } from "@/domain/rules/crm"
import { can } from "@/domain/rules/permissions"
import type { ID, Lead, Staff } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type ViewMode = "kanban" | "table"
type LeadSort = "name" | "subject" | "stage" | "assignee" | "created"

/** Maps the domain layer's plain severity (`LeadDetail.level`, no UI knowledge per rule #1) to how it reads on screen. */
const DETAIL_TONE: Record<LeadDetail["level"], string> = {
  muted: "text-muted-foreground",
  info: "text-sky-700 dark:text-sky-400",
  warn: "text-amber-700 dark:text-amber-400",
  danger: "font-semibold text-red-700 dark:text-red-400",
}

export default function CrmPage() {
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const staff = useStore((s) => s.staff)
  const leads = useStore((s) => s.leads).filter((l) => l.branchId === branch.id)
  const moveStage = useStore((s) => s.moveLeadStage)
  const restore = useStore((s) => s.restoreLead)
  const now = useNow()

  // owner 2026-10-06: filters sync to the URL (?view=&assignee=) so a reload or shared link keeps them — matches inbox
  const [view, setView] = useQueryState<ViewMode>("view", "kanban")
  const [search, setSearch] = useState("")
  const [assigneeFilter, setAssigneeFilter] = useQueryState<string>("assignee", "all")
  // ?archived=1 — the Dashboard's "ถึงวันติดต่อ Lead ที่ปิดไปอีกครั้ง" needs the closed ones shown (owner 2026-10-07)
  const [archivedParam, setArchivedParam] = useQueryState<"0" | "1">("archived", "0")
  const showArchived = archivedParam === "1"
  const setShowArchived = (v: boolean) => setArchivedParam(v ? "1" : "0")
  const [openLead, setOpenLead] = useState<ID | null>(null)
  const [creating, setCreating] = useState(false)
  const [overCol, setOverCol] = useState<string | null>(null)
  const { sort, toggle } = useSort<LeadSort>("created", true)

  const canManage = can(me, "lead.manage")
  const assignees = staff.filter((s) => leads.some((l) => l.assigneeId === s.id))
  const assigneeName = (id: ID | null) => staff.find((s) => s.id === id)?.nickname ?? ""
  // same scope as the board (archived toggle only, not search/assignee) so the count reads as "how many could I see"
  const assigneeScope = leads.filter((l) => showArchived || (l.stage !== "archived" && l.stage !== "enrolled"))
  const restoreLead = (id: ID) => report(restore(id), "กู้คืนแล้ว")

  // finished leads stay out of both views by default (owner 2026-10-05: once paid and a student, the card leaves the
  // board) — archived ones and ones that became students; the switch below brings them back
  const matches = (l: Lead) => {
    if (!showArchived && (l.stage === "archived" || l.stage === "enrolled")) return false
    if (assigneeFilter !== "all" && l.assigneeId !== assigneeFilter) return false
    if (search && !`${l.name} ${l.subject} ${l.childGrade}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }
  const shown = leads.filter(matches)
  const visibleGroups = PIPELINE_GROUPS.filter((g) => showArchived || g.key !== "archived")

  const activeCount = leads.filter((l) => l.stage !== "archived" && l.stage !== "enrolled").length
  const kpis = crmKpis(leads, now)

  const tableRows = [...shown].sort((a, b) => {
    const v = sort.key === "name" ? a.name.localeCompare(b.name, "th")
      : sort.key === "subject" ? a.subject.localeCompare(b.subject, "th")
        : sort.key === "stage" ? PIPELINE_GROUPS.indexOf(groupOf(a.stage)) - PIPELINE_GROUPS.indexOf(groupOf(b.stage))
          : sort.key === "assignee" ? assigneeName(a.assigneeId).localeCompare(assigneeName(b.assigneeId), "th")
            : a.createdAt.localeCompare(b.createdAt)
    return sort.desc ? -v : v
  })
  const focusKeys = (l: Lead) => leadFlags(l, now, toDateStr(now)).join(" ") || undefined
  const pg = usePage(useFocusFirst(tableRows, focusKeys))

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">CRM</h2>
          <p className="text-sm text-muted-foreground">{leads.length} Lead ทั้งหมด · {activeCount} รายกำลังตาม</p>
        </div>
        {canManage && <Button onClick={() => setCreating(true)}><PlusIcon /> เพิ่ม Lead</Button>}
      </div>

      {canManage && <EnrollInbox branchId={branch.id} />}
      {canManage && <SurveyCalls branchId={branch.id} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={UsersIcon} label="Lead ทั้งหมด" value={kpis.total} sub={`${kpis.active} รายกำลังตาม`} />
        <Kpi icon={UserSearchIcon} label="กำลังตาม" value={kpis.active} tone="sky" sub={activeCount ? "ยังไม่ปิดการขาย" : "เคลียร์หมดแล้ว"} />
        <Kpi
          icon={CalendarClockIcon} label="นัดสอบ/ทดลองต้องดูแล" value={kpis.dueSoon + kpis.overdue} tone={kpis.overdue ? "red" : "amber"}
          valueClassName={kpis.overdue ? "text-red-700 dark:text-red-400" : undefined}
          sub={kpis.overdue ? `เลยนัดแล้ว ${kpis.overdue} ราย` : kpis.dueSoon ? "วันนี้ / พรุ่งนี้" : "ไม่มีนัดใกล้ถึง"}
        />
        <Kpi icon={TrendingUpIcon} label="อัตราปิดการขาย" value={`${kpis.conversionRate}%`} tone="emerald" sub={`ลงทะเบียนแล้ว ${kpis.enrolled} จาก ${kpis.total} ราย`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / วิชา" className="pl-8" />
        </div>
        <NativeSelect value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="w-44"
          options={[{ value: "all", label: `ผู้ดูแลทั้งหมด (${assigneeScope.length})` }, ...assignees.map((s) => ({ value: s.id, label: `${s.nickname} (${assigneeScope.filter((l) => l.assigneeId === s.id).length})` }))]} />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><Switch checked={showArchived} onCheckedChange={setShowArchived} /> แสดงที่ปิดแล้ว (เป็นนักเรียน / เก็บเข้าคลัง)</label>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{view === "kanban" ? "ลากการ์ดเพื่อย้ายขั้นตอน" : `${tableRows.length} รายการ`}</span>
        <ToggleGroup value={[view]} onValueChange={(v) => v[0] && setView(v[0] as ViewMode)} variant="outline" size="sm">
          <ToggleGroupItem value="kanban"><LayoutGridIcon /> Kanban</ToggleGroupItem>
          <ToggleGroupItem value="table"><TableIcon /> ตาราง</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {visibleGroups.map((group) => {
            const groupLeads = shown.filter((l) => group.stages.includes(l.stage))
            const draggableTarget = DRAGGABLE_STAGES.includes(group.stages[0]) ? group.stages[0] : null
            return (
              <div
                key={group.key}
                onDragOver={(e) => { if (!draggableTarget || !canManage) return; e.preventDefault(); setOverCol(group.key) }}
                onDragLeave={() => setOverCol((c) => (c === group.key ? null : c))}
                onDrop={(e) => {
                  setOverCol(null)
                  const id = e.dataTransfer.getData("text/lead")
                  if (id && draggableTarget && canManage) report(moveStage(id, draggableTarget), `ย้ายไป "${group.label}" แล้ว`)
                }}
                className={cn("group/col flex h-[calc(100dvh-20rem)] min-h-[480px] w-72 shrink-0 flex-col rounded-xl border bg-muted/30 p-2", overCol === group.key && "border-primary bg-primary/5")}
              >
                <div className="flex shrink-0 items-center justify-between px-1 pb-2">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}
                    {group.key === "closing" && !showArchived && <span className="ml-1 font-normal tracking-normal normal-case">· เป็นนักเรียนแล้ว {leads.filter((l) => l.stage === "enrolled").length} (ซ่อน)</span>}
                  </span>
                  <span className="grid size-5 place-items-center rounded-full bg-background text-xs font-medium">{groupLeads.length}</span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-0.5">
                  {groupLeads.map((l) => (
                    <LeadCard key={l.id} lead={l} now={now} staff={staff} draggable={canManage && DRAGGABLE_STAGES.includes(l.stage)} onOpen={() => setOpenLead(l.id)} onRestore={canManage ? () => restoreLead(l.id) : undefined} />
                  ))}
                  {groupLeads.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">ไม่มี</p>}
                </div>
                {canManage && group.key !== "archived" && (
                  <button
                    onClick={() => setCreating(true)}
                    className="mt-2 flex shrink-0 items-center justify-center gap-1 rounded-lg border border-dashed py-1.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover/col:opacity-100 hover:bg-muted focus-visible:opacity-100"
                  >
                    <PlusIcon className="size-3" /> เพิ่ม Lead
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <TableShell minWidth={1000}>
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <SortHeader label="ชื่อ" k="name" sort={sort} onSort={toggle} />
                <SortHeader label="วิชา" k="subject" sort={sort} onSort={toggle} />
                <th className="px-3 py-2.5 text-left font-medium">ช่องทาง</th>
                <SortHeader label="ขั้นตอน" k="stage" sort={sort} onSort={toggle} />
                <th className="px-3 py-2.5 text-left font-medium">รายละเอียด</th>
                <SortHeader label="ผู้ดูแล" k="assignee" sort={sort} onSort={toggle} />
                <th className="px-3 py-2.5 text-left font-medium">เบอร์โทร</th>
                <SortHeader label="สร้างเมื่อ" k="created" sort={sort} onSort={toggle} />
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {pg.rows.map((l) => {
                const detail = leadDetail(l, now)
                const assignee = staff.find((s) => s.id === l.assigneeId)
                return (
                  <tr key={l.id} onClick={() => setOpenLead(l.id)} data-focus={focusKeys(l)} className="group cursor-pointer border-b last:border-0 hover:bg-primary/5 [&>td]:px-3 [&>td]:py-2.5">
                    <td>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", avatarTone(l.id))}>{initial(l.name)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{l.name}</p>
                          <span className={cn("rounded px-1 text-[10px] font-semibold", gradeTone(l.childGrade))}>{l.childGrade}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", subjectColor(l.subject).chip)}>{l.subject}</span></td>
                    <td className="whitespace-nowrap text-muted-foreground">{LEAD_SOURCE_LABEL[l.source]}</td>
                    <td><Pill tone={l.stage === "archived" ? "gray" : l.stage === "enrolled" ? "green" : "blue"}>{stageGroupLabel(l.stage)}</Pill></td>
                    <td><span className={cn("text-xs font-medium whitespace-nowrap", DETAIL_TONE[detail.level])}>{detail.text}</span></td>
                    <td className="whitespace-nowrap text-muted-foreground">{assignee?.nickname ?? "ยังไม่มอบหมาย"}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{l.phone || "—"}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{fmtDate(toDateStr(new Date(l.createdAt)))}</td>
                    <td>
                      {l.stage === "archived" && canManage ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); restoreLead(l.id) }} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"><RotateCcwIcon className="size-3.5" /> กู้คืน</button>
                      ) : l.stage !== "archived" ? (
                        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {tableRows.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">ไม่พบ Lead ตามเงื่อนไข</td></tr>}
            </tbody>
          </TableShell>
          <Pager {...pg} unit="Lead" />
        </>
      )}

      <LeadSheet leadId={openLead} onClose={() => setOpenLead(null)} />
      {creating && <LeadDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

/** Owner ref (Contact/Test/Trial/Billing board): 3 fixed rows — who + grade, subject + stage tag,
 *  then the one fact that matters right now — with the assignee pinned at the bottom every time. */
function LeadCard({ lead, now, staff, draggable, onOpen, onRestore }: { lead: Lead; now: Date; staff: Staff[]; draggable: boolean; onOpen: () => void; onRestore?: () => void }) {
  const detail = leadDetail(lead, now)
  const assignee = staff.find((s) => s.id === lead.assigneeId)
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/lead", lead.id)}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen() } }}
      data-focus={leadFlags(lead, now, toDateStr(now)).join(" ") || undefined}
      className={cn("w-full rounded-xl border bg-background p-2.5 text-left shadow-sm outline-none hover:border-primary/50 focus-visible:border-primary", draggable && "cursor-grab active:cursor-grabbing", lead.stage === "enrolled" && "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30", lead.stage === "archived" && "opacity-80")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold", avatarTone(lead.id))}>{initial(lead.name)}</span>
          <span className="truncate text-sm font-medium">{lead.name}</span>
        </span>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold", gradeTone(lead.childGrade))}>{lead.childGrade}</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", subjectColor(lead.subject).chip)}>{lead.subject}</span>
        {lead.direct && lead.stage !== "enrolled" ? (
          <Pill tone="green">สมัครตรง</Pill>
        ) : lead.stage === "new" || lead.stage === "contacting" ? (
          <Pill tone="gray">{LEAD_SOURCE_LABEL[lead.source]}</Pill>
        ) : lead.stage === "enrolled" ? (
          <Pill tone="green"><UserCheckIcon className="size-3" /> ลงทะเบียนแล้ว</Pill>
        ) : null /* no sub-step chip (owner 2026-10-05: 4 states only) — the detail line says what happens next */}
      </div>

      <p className={cn("mt-1.5 truncate text-xs font-medium", DETAIL_TONE[detail.level])}>{detail.shortText}</p>

      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold", assignee ? avatarTone(assignee.id) : "bg-muted")}>{assignee ? initial(assignee.nickname) : "?"}</span>
          <span className="truncate">{assignee?.nickname ?? "ยังไม่มอบหมาย"}</span>
        </span>
        {lead.stage === "archived" && onRestore ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onRestore() }} className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
            <RotateCcwIcon className="size-3" /> กู้คืน
          </button>
        ) : lead.stage !== "archived" ? (
          <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
        ) : null}
      </div>
    </div>
  )
}
