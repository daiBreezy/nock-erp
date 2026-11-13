"use client"

// Design System › FilterMenu (teaching menu tidy-up, 2026-11-13): every list page used to show 3–5 loose dropdowns.
// Now they live behind ONE button — "ตัวกรอง" with the number picked — so the bar reads: search · period · view · filters · columns · branch.
import { SlidersHorizontalIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect, type Option } from "@/components/app/native-select"
import { cn } from "@/lib/utils"

export interface FilterField {
  id: string
  /** small label above the select, e.g. "วิชา" */
  label: string
  value: string
  onChange: (v: string) => void
  options: Option[]
  /** what "no filter" says, e.g. "ทุกวิชา" */
  placeholder: string
  /** leave the field out (e.g. a teacher filter for someone who only sees their own sessions) */
  hidden?: boolean
}

export interface FilterCheck { key: string; label: string; on: boolean; count?: number; onChange: (v: boolean) => void }

export function FilterMenu({ fields, checks, extra }: {
  fields: FilterField[]
  /** "show also …" tick boxes (e.g. closed / archived leads) — listed under the selects, under a "แสดง" heading */
  checks?: FilterCheck[]
  /** toggles that belong with the filters (e.g. a ShowChip) */
  extra?: React.ReactNode
}) {
  const list = fields.filter((f) => !f.hidden)
  if (!list.length && !extra && !checks?.length) return null
  const active = list.filter((f) => f.value !== "")
  const checked = (checks ?? []).filter((c) => c.on)
  const activeCount = active.length + checked.length
  return (
    <Popover>
      <PopoverTrigger render={
        <Button variant="outline" type="button" aria-label="ตัวกรอง"
          className={cn("h-9 shrink-0 gap-1.5 rounded-3xl px-3 text-sm", activeCount > 0 && "border-primary bg-primary/10 font-medium text-primary hover:bg-primary/15")} />
      }>
        <SlidersHorizontalIcon className="size-4" />
        ตัวกรอง
        {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs leading-5 font-semibold text-primary-foreground tabular-nums">{activeCount}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-3 p-3">
        {list.map((f) => (
          <label key={f.id} className="grid gap-1">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <NativeSelect className="h-9 w-full" value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} options={f.options} aria-label={f.label} />
          </label>
        ))}
        {checks && checks.length > 0 && (
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">แสดง</span>
            {checks.map((c) => (
              <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-xl px-1 py-1 text-sm hover:bg-muted">
                <Checkbox checked={c.on} onCheckedChange={(v) => c.onChange(!!v)} />
                {c.label}
                {c.count !== undefined && <span className="ml-auto rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{c.count}</span>}
              </label>
            ))}
          </div>
        )}
        {extra && <div className="flex flex-wrap gap-2">{extra}</div>}
        {(active.length > 0 || checked.length > 0) && (
          <Button variant="ghost" size="sm" type="button" className="justify-self-start text-muted-foreground" onClick={() => { active.forEach((f) => f.onChange("")); checked.forEach((c) => c.onChange(false)) }}>
            ล้างตัวกรอง
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
