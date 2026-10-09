"use client"

// Branch filter for list pages (owner 2026-10-09): a Director / Super Admin sees every branch at once, an Area Manager
// the branches they look after — without switching the branch in the sidebar. Default = the sidebar's branch, so
// branch staff see nothing new. Same scope options as Reports (all · region · business · region × business · branch).
import { useMemo } from "react"
import { MapPinIcon } from "lucide-react"
import { NativeSelect, type Option } from "@/components/app/native-select"
import { crossBranch, inBranch } from "@/domain/rules/permissions"
import { BUSINESS_SHORT, scopeBranchIds } from "@/domain/rules/reports"
import type { Branch, ID } from "@/domain/types"
import { useBranch, useQueryState } from "@/lib/hooks"
import { nm, tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const REGION_NAME: Record<string, string> = { BKK: "กรุงเทพฯ", CBR: "ชลบุรี" }
const BIZ_NAME: Record<string, string> = { nockacademy: "Nockacademy", liclass: "Liclass" }

/** all · region · business · region × business · each branch (grouped by region) */
export function scopeOptions(list: Pick<Branch, "id" | "name" | "code" | "brand" | "province">[], everything: boolean): Option[] {
  const regions = [...new Set(list.map((b) => b.province ?? ""))].filter(Boolean).sort()
  const bizes = (["nockacademy", "liclass"] as const).filter((z) => list.some((b) => b.brand === z))
  const opts: Option[] = [{ value: "all", label: everything ? tx("ทุกสาขา") : tx("ทุกสาขาในเขต") }]
  if (regions.length > 1) regions.forEach((r) => opts.push({ value: `region:${r}`, label: `${r} · ${tx(REGION_NAME[r] ?? r)}`, group: tx("ภูมิภาค") }))
  if (bizes.length > 1) bizes.forEach((z) => opts.push({ value: `biz:${z}`, label: `${BUSINESS_SHORT[z]} · ${BIZ_NAME[z]}`, group: tx("ประเภทธุรกิจ") }))
  if (regions.length > 1 && bizes.length > 1)
    regions.forEach((r) => bizes.forEach((z) => { if (list.some((b) => b.province === r && b.brand === z)) opts.push({ value: `region:${r}|biz:${z}`, label: `${r} · ${BUSINESS_SHORT[z]}`, group: tx("ภูมิภาค × ธุรกิจ") }) }))
  regions.forEach((r) => list.filter((b) => b.province === r).sort((a, b) => a.brand.localeCompare(b.brand) || a.code.localeCompare(b.code))
    // owner 2026-10-09: business first, then the branch name — "LIS · ทองหล่อ" (two ศรีราชา are told apart by it)
    .forEach((b) => opts.push({ value: b.id, label: `${BUSINESS_SHORT[b.brand]} · ${nm(b.name)}`, group: tx("สาขา {0}", [r]) })))
  return opts
}

export interface BranchScope {
  /** branches shown */
  ids: ID[]
  /** more than one branch in view — pages add a branch column */
  multi: boolean
  /** short label for a row, e.g. "TL" */
  code: (branchId: ID) => string
  /** the filter chip — null when the person works in one branch only */
  select: React.ReactNode
}

/** `?branch=` — empty = the sidebar's branch */
export function useBranchScope(): BranchScope {
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const branches = useStore((s) => s.branches)
  const [value, setValue] = useQueryState<string>("branch", "")
  // owner 2026-10-09: Director / Super Admin = every branch · Area Manager = their area · branch staff (Teacher / Admin /
  // Manager) never see the chip, even when they work at two branches — they switch in the sidebar
  const allowed = useMemo(() => (crossBranch(me) ? branches.filter((b) => (b.active || b.id === branch.id) && inBranch(me, b.id)) : []), [branches, branch.id, me])
  const ids = useMemo(() => (!value ? [branch.id] : scopeBranchIds(value, allowed)), [value, allowed, branch.id])
  const options = useMemo(() => [{ value: "", label: tx("สาขานี้ · {0}", [nm(branch.name)]) }, ...scopeOptions(allowed, allowed.length === branches.length)], [allowed, branch.name, branches.length])
  const code = (id: ID) => branches.find((b) => b.id === id)?.code ?? ""
  const select = allowed.length > 1 ? <BranchChip value={value} onChange={setValue} options={options} active={!!value} /> : null
  return { ids, multi: ids.length > 1, code, select }
}

/** The branch chip — the one look for every page that picks branches (lists, Reports) */
export function BranchChip({ value, onChange, options, active, className }: { value: string; onChange: (v: string) => void; options: Option[]; active?: boolean; className?: string }) {
  return (
    <div className={cn("relative", active && "[&_select]:bg-primary/10 [&_select]:font-medium [&_select]:text-primary", className)}>
      <MapPinIcon className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <NativeSelect className="h-9 w-52 [&_select]:pl-8" value={value} onChange={(e) => onChange(e.target.value)} options={options} aria-label={tx("สาขา")} />
    </div>
  )
}

/** small branch code chip for rows when several branches are listed */
export function BranchCode({ code }: { code: string }) {
  return <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{code}</span>
}
