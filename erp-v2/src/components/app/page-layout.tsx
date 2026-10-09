"use client"

// One page structure for every list page (owner 2026-10-09):
//   Header  — page name + one-line description · main CTA on the right
//   KPI     — up to 4 cards, same size (clickable when they filter the list)
//   Toolbar — branch chip first · search · filters · (right) view switch / count
//   Content — the table, full width
// Same width and spacing everywhere; Calendar and Inbox stay full-screen work areas.
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
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

/** ◀ วันนี้ ▶ + the range on screen — the one date navigator for every page (owner 2026-10-09) */
export function DateNav({ label, todayLabel = "วันนี้", onPrev, onToday, onNext }: { label: React.ReactNode; todayLabel?: string; onPrev: () => void; onToday: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="outline" aria-label="ก่อนหน้า" onClick={onPrev}><ChevronLeftIcon /></Button>
      <Button variant="outline" onClick={onToday}>{todayLabel}</Button>
      <Button size="icon" variant="outline" aria-label="ถัดไป" onClick={onNext}><ChevronRightIcon /></Button>
      <span className="ml-1.5 text-sm font-semibold whitespace-nowrap">{label}</span>
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
