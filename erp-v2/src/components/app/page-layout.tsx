"use client"

// One page structure for every list page (owner 2026-10-09):
//   Header  — page name + one-line description · main CTA on the right
//   KPI     — up to 4 cards, same size (clickable when they filter the list)
//   Toolbar — branch chip first · search · filters · (right) view switch / count
//   Content — the table, full width
// Same width and spacing everywhere; Calendar and Inbox stay full-screen work areas.
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-7xl space-y-4", className)}>{children}</div>
}

export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** 2 columns on phones, up to 4 across */
export function KpiRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>
}

/** filters on the left (branch chip first), `end` on the right */
export function Toolbar({ children, end }: { children: React.ReactNode; end?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {end && <div className="ml-auto flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  )
}

/**
 * ( ‹  range  › ) — the one date stepper (owner 2026-10-09): Sessions / Attendance / Summaries (inside PeriodControl)
 * and Calendar. Off the current period the range turns pink and a "กลับวันนี้" link appears.
 */
export function RangeStepper({ label, current = true, onPrev, onNext, onToday }: { label: React.ReactNode; current?: boolean; onPrev: () => void; onNext: () => void; onToday?: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex h-9 items-center rounded-full border bg-background">
        <button type="button" aria-label="ก่อนหน้า" onClick={onPrev} className="grid h-full w-9 place-items-center rounded-l-full hover:bg-muted"><ChevronLeftIcon className="size-4" /></button>
        <span className={cn("min-w-36 px-1 text-center text-sm font-medium whitespace-nowrap tabular-nums", !current && "text-primary")}>{label}</span>
        <button type="button" aria-label="ถัดไป" onClick={onNext} className="grid h-full w-9 place-items-center rounded-r-full hover:bg-muted"><ChevronRightIcon className="size-4" /></button>
      </div>
      {!current && onToday && <button type="button" onClick={onToday} className="text-sm text-primary hover:underline">กลับวันนี้</button>}
    </div>
  )
}

/** show / hide toggle with a dashed outline when off (Billing Done / Void, CRM closed leads …) — same h-9 as every chip */
export function ShowChip({ label, on, count, onChange }: { label: string; on: boolean; count?: number; onChange: (v: boolean) => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => onChange(!on)}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-3xl border px-3 text-sm transition-colors", on ? "border-primary bg-primary/10 font-medium text-primary" : "border-dashed text-muted-foreground hover:bg-muted/50")}>
      {on ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}{label}
      {count !== undefined && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{count}</span>}
    </button>
  )
}

export interface SegmentOption<T extends string> { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; title?: string }

/**
 * Grey segmented switch (owner 2026-10-09) — for "pick one, the whole view changes": view, range, mode.
 * h-9 like every toolbar control; the picked one is a white pill. Filters stay dropdowns, show / hide stays ShowChip.
 */
export function Segmented<T extends string>({ value, onChange, options, className, label }: { value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; className?: string; label?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex h-9 shrink-0 items-center rounded-full bg-muted p-1", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} title={o.title} onClick={() => onChange(o.value)}
          className={cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap", value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {o.icon && <o.icon className="size-4" />}{o.label}
        </button>
      ))}
    </div>
  )
}

/** Section tabs with an underline (owner 2026-10-09) — for "which topic": Reports sections, Settings, panel tabs.
 *  Different from Segmented on purpose: underline = change topic, grey box = change view / range. */
export function Tabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} title={o.title} onClick={() => onChange(o.value)}
          className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm whitespace-nowrap", value === o.value ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
          {o.icon && <o.icon className="size-4" />}{o.label}
        </button>
      ))}
    </div>
  )
}
