"use client"

import { useState } from "react"
import { PhoneIcon, PlusIcon, SearchIcon, UserCheckIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { LeadDialog } from "@/components/crm/lead-dialog"
import { LeadSheet } from "@/components/crm/lead-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { daysAgoLabel, DRAGGABLE_STAGES, LEAD_SOURCE_LABEL, LEAD_STAGE_LABEL, PIPELINE_GROUPS, type PipelineGroup } from "@/domain/rules/crm"
import { can } from "@/domain/rules/permissions"
import type { ID, Lead } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { NativeSelect } from "@/components/app/native-select"

export default function CrmPage() {
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const staff = useStore((s) => s.staff)
  const leads = useStore((s) => s.leads).filter((l) => l.branchId === branch.id)
  const moveStage = useStore((s) => s.moveLeadStage)
  const now = useNow()

  const [search, setSearch] = useState("")
  const [assigneeFilter, setAssigneeFilter] = useState("all")
  const [openLead, setOpenLead] = useState<ID | null>(null)
  const [creating, setCreating] = useState(false)
  const [overCol, setOverCol] = useState<string | null>(null)

  const canManage = can(me, "lead.manage")
  const assignees = staff.filter((s) => leads.some((l) => l.assigneeId === s.id))

  const matches = (l: Lead) => {
    if (assigneeFilter !== "all" && l.assigneeId !== assigneeFilter) return false
    if (search && !`${l.name} ${l.subject} ${l.childGrade}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }

  const activeCount = leads.filter((l) => l.stage !== "archived" && l.stage !== "enrolled").length

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">CRM</h2>
          <p className="text-sm text-muted-foreground">{leads.length} Lead ทั้งหมด · {activeCount} รายกำลังตาม</p>
        </div>
        {canManage && <Button onClick={() => setCreating(true)}><PlusIcon /> เพิ่ม Lead</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / วิชา" className="pl-8" />
        </div>
        <NativeSelect value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="w-44" options={[{ value: "all", label: "ผู้ดูแลทั้งหมด" }, ...assignees.map((s) => ({ value: s.id, label: s.nickname }))]} />
        <span className="ml-auto text-xs text-muted-foreground">ลากการ์ดเพื่อย้ายขั้นตอน</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_GROUPS.map((group) => {
          const groupLeads = leads.filter((l) => group.stages.includes(l.stage) && matches(l))
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
              className={cn("flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 p-2", overCol === group.key && "border-primary bg-primary/5")}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</span>
                <span className="grid size-5 place-items-center rounded-full bg-background text-xs font-medium">{groupLeads.length}</span>
              </div>
              <div className="flex-1 space-y-2">
                {groupLeads.map((l) => (
                  <LeadCard key={l.id} lead={l} group={group} now={now} draggable={canManage && DRAGGABLE_STAGES.includes(l.stage)} onOpen={() => setOpenLead(l.id)} />
                ))}
                {groupLeads.length === 0 && <p className="px-1 py-3 text-center text-xs text-muted-foreground">ไม่มี</p>}
              </div>
              {canManage && group.key !== "archived" && group.key !== "enrolled" && (
                <button onClick={() => setCreating(true)} className="mt-2 flex items-center justify-center gap-1 rounded-lg border border-dashed py-1.5 text-xs text-muted-foreground hover:bg-muted">
                  <PlusIcon className="size-3" /> เพิ่ม Lead
                </button>
              )}
            </div>
          )
        })}
      </div>

      <LeadSheet leadId={openLead} onClose={() => setOpenLead(null)} />
      {creating && <LeadDialog onClose={() => setCreating(false)} />}
    </div>
  )
}

function LeadCard({ lead, group, now, draggable, onOpen }: { lead: Lead; group: PipelineGroup; now: Date; draggable: boolean; onOpen: () => void }) {
  const subBadge = group.stages.length > 1 ? LEAD_STAGE_LABEL[lead.stage] : null
  return (
    <button
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("text/lead", lead.id)}
      onClick={onOpen}
      className={cn("w-full rounded-lg border bg-background p-2.5 text-left shadow-sm hover:border-primary/50", draggable && "cursor-grab active:cursor-grabbing", lead.stage === "enrolled" && "border-emerald-300 bg-emerald-50")}
    >
      <div className="flex items-start gap-2">
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", avatarTone(lead.id))}>{initial(lead.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{lead.name}</div>
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className={cn("rounded px-1 py-0.5", gradeTone(lead.childGrade))}>{lead.childGrade}</span>
            {lead.subject}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {lead.stage === "enrolled" ? (
          <Pill tone="green"><UserCheckIcon className="size-3" /> ลงทะเบียนแล้ว</Pill>
        ) : (
          <>
            {subBadge && <Pill tone="blue">{subBadge}</Pill>}
            <Pill tone="gray">{LEAD_SOURCE_LABEL[lead.source]}</Pill>
          </>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{daysAgoLabel(lead.createdAt, now)}</span>
        {lead.phone && <span className="inline-flex items-center gap-0.5"><PhoneIcon className="size-3" />{lead.phone}</span>}
      </div>
    </button>
  )
}
