"use client"

// One page structure for every list page (owner 2026-10-09):
//   Header  — page name + one-line description · main CTA on the right
//   KPI     — up to 4 cards, same size (clickable when they filter the list)
//   Toolbar — branch chip first · search · filters · (right) view switch / count
//   Content — the table, full width
// Same width and spacing everywhere; Calendar and Inbox stay full-screen work areas.
import { Children, Fragment, isValidElement, type ReactNode } from "react"
import { KpiGroup } from "@/components/app/kpi"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, SearchIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/app/date-range-picker"
import type { DateStr } from "@/domain/types"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

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

/**
 * Design System › Kpi (2026-11-10): the columns follow the card count so a row never ends with a lone card.
 *   2 → 2 · 3 → 3 · 4 → 2+2 then 4 on desktop · 6 → 2 / 3+3.  Only 2, 3, 4 or 6 cards are allowed;
 *   5 still renders (2 / 3 / 5) but warns in development — trim to 4 or add a 6th.
 */
/** a Fragment counts as its children — ListPage hands over `kpis={<>…</>}`, which used to count as ONE card and fell into the 5-column layout */
function flat(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((c) => (isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment ? flat(c.props.children) : [c]))
}

export function KpiRow({ children }: { children: React.ReactNode }) {
  const n = flat(children).length
  if (process.env.NODE_ENV !== "production" && ![0, 2, 3, 4, 6].includes(n)) console.warn(`KpiRow: ${n} cards — the Design System allows 2, 3, 4 or 6`)
  // each column is at most 18rem (288px) so cards never stretch wide on big screens; 6 cards stay 3 + 3 so none drops
  // under the 160px minimum next to the sidebar
  const cols =
    n === 2 ? "grid-cols-[repeat(2,minmax(0,18rem))]"
    : n === 3 ? "grid-cols-3 sm:grid-cols-[repeat(3,minmax(0,18rem))]"
    // 4 = the standard (teaching menu, 2026-11-13): 2×2 on phones / iPad portrait, one row of four from 1024, columns share the full width equally
    : n === 4 ? "grid-cols-2 lg:grid-cols-4"
    : n === 6 ? "grid-cols-[repeat(2,minmax(0,18rem))] sm:grid-cols-[repeat(3,minmax(0,18rem))]"
    : "grid-cols-[repeat(2,minmax(0,18rem))] sm:grid-cols-[repeat(3,minmax(0,18rem))] lg:grid-cols-[repeat(5,minmax(0,18rem))]"
  return <KpiGroup className={cn("grid gap-3", cols)}>{children}</KpiGroup>
}

/** filters on the left (branch chip first), `end` on the right */
/** The one search box for list pages (owner 2026-10-13: Sessions · Attendance · Summaries got one too) — h-9 like every toolbar control.
 *  Design System (2026-11-10): full width on phones · 160–240px from 640 up · 16px text on phones so iPhone Safari
 *  doesn't zoom in on focus. No className — the width belongs to the system, not the page. */
export function SearchBox({ value, onChange, placeholder, block, autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder: string
  /** inside a picker / dialog: always the full width of its box (list pages leave this off: 160–240px) */
  block?: boolean
  autoFocus?: boolean
}) {
  return (
    <div className={cn("relative w-full", !block && "sm:w-auto sm:max-w-60 sm:min-w-48 sm:flex-1")}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        className="h-9 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 pr-3 pl-8 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 sm:text-sm" />
    </div>
  )
}

/**
 * Design System › ListPage (2026-11-10): the one formula for list pages. The page hands over its parts; order,
 * spacing and responsive behaviour live here, so every list page looks the same and one change reaches them all.
 *   header (title · description · actions) → KPI row (2, 3, 4 or 6) → search + filters → the list (children)
 * Need something the formula can't do? Add it here, or mark the page `// ds-exception: <why>` (rule of three).
 */
export function ListPage({ title, description, actions, branch, kpis, status, search, period, view, filters, children }: {
  title: React.ReactNode
  description?: React.ReactNode
  /** the page's main button(s) — one `default` button, others `outline` */
  actions?: React.ReactNode
  /** the branch chip (`scope.select`) — sits in the header row, always just before the CTA */
  branch?: React.ReactNode
  /** <Kpi> cards — 2, 3, 4 or 6 */
  kpis?: React.ReactNode
  /** a <SearchBox> */
  search?: React.ReactNode
  /** a status switch (All / Pending / Done) — gets a line of its own above the rest of the bar */
  status?: React.ReactNode
  /** the shared date control (`usePeriod().control`) — sits first, left of the search */
  period?: React.ReactNode
  /** a <Segmented> that changes the whole view (day / student · All / Pending / Done) */
  view?: React.ReactNode
  /** <FilterMenu> · ShowChip · ColumnsMenu · branch chip (last) */
  filters?: React.ReactNode
  /** the table / cards, pager, and the page's panels */
  children: React.ReactNode
}) {
  return (
    <Page>
      <PageHeader title={title} description={description} actions={(branch || actions) ? <>{branch}{actions}</> : undefined} />
      {kpis && <KpiRow>{kpis}</KpiRow>}
      {(status || search || period || view || filters) && <ListBar status={status} search={search} period={period} view={view}>{filters}</ListBar>}
      {children}
    </Page>
  )
}

/**
 * Design System › ListBar (2026-11-13, owner): two rows, same on every list page.
 *   row 0 (only with a date control): [period]
 *   row 1: [status (All/Pending/Done)] [view switch] [search]                [filters ▾] [columns] …
 * The branch chip is not here — it lives in the page header, just before the CTA (ListPage `branch`).
 */
export function ListBar({ status, search, period, view, children }: { status?: React.ReactNode; search?: React.ReactNode; period?: React.ReactNode; view?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {period && <div className="flex flex-wrap items-center gap-2">{period}</div>}
      {(status || view || search || children) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {status}
          {view}
          {search}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">{children}</div>
        </div>
      )}
    </div>
  )
}

/** Second toolbar row (owner 2026-10-13): search on the left, filters on the right (branch chip last) */
export function FilterBar({ search, children }: { search: React.ReactNode; children?: React.ReactNode }) {
  // phones: search on its own full-width row, filters in a tidy 2-column grid; desktop: one inline right-aligned row
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {search}
      {children && <div className="grid grid-cols-2 gap-2 *:min-w-0 sm:ml-auto sm:flex sm:flex-none sm:flex-wrap sm:items-center sm:justify-end">{children}</div>}
    </div>
  )
}

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
 * and Calendar. Off the current period the range turns pink and "กลับวันนี้" appears — on the side away from the pinned edge (`todaySide`), so it never pushes the arrows.
 */
export function RangeStepper({ label, current = true, onPrev, onNext, onToday, pick, todaySide = "right" }: { label: React.ReactNode; current?: boolean; /** which side "กลับวันนี้" appears on — the side AWAY from the edge the group is pinned to, so it never pushes the arrows (a right-aligned header → "left") */ todaySide?: "left" | "right"; onPrev: () => void; onNext: () => void; onToday?: () => void
  /** click the date text to choose any range in a calendar popup (replaces the old "กำหนดเอง" button) */
  pick?: { from: DateStr; to: DateStr; onPick: (r: { from: DateStr; to: DateStr }) => void } }) {
  // only when off the current period; never squeezed in beside the arrows — it appears on the side where nothing is pinned
  const todayButton = !current && onToday ? <Button variant="outline" type="button" onClick={onToday}>กลับวันนี้</Button> : null
  return (
    <div className="flex items-center gap-2">
      {todaySide === "left" && todayButton}
      <div className="inline-flex h-9 items-center rounded-full border bg-background">
        <button type="button" aria-label="ก่อนหน้า" onClick={onPrev} className="grid h-full w-9 place-items-center rounded-l-full hover:bg-muted"><ChevronLeftIcon className="size-4" /></button>
        {pick
          ? <DateRangePicker labelOnly={label} from={pick.from} to={pick.to} onChange={pick.onPick} className={cn(!current && "text-primary")} />
          : <span className={cn("min-w-36 px-1 text-center text-sm font-medium whitespace-nowrap tabular-nums", !current && "text-primary")}>{label}</span>}
        <button type="button" aria-label="ถัดไป" onClick={onNext} className="grid h-full w-9 place-items-center rounded-r-full hover:bg-muted"><ChevronRightIcon className="size-4" /></button>
      </div>
      {todaySide === "right" && todayButton}
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

/**
 * Design System › ShowMenu (2026-11-13, owner): several show / hide toggles (Billing "Done" · "Void") folded into ONE chip with a
 * dropdown of checkboxes. Looks like any other dropdown (grey pill, no accent); it names what is on: "แสดง · Done, Void".
 */
export function ShowMenu({ label, items, pick }: {
  label: string; items: { key: string; label: string; on: boolean; count?: number; onChange: (v: boolean) => void }[]
  /** owner 2026-11-15: one "pick one" setting folded in above the toggles (Billing: date range by created / paid) */
  pick?: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }
}) {
  const on = items.filter((i) => i.on)
  const picked = pick?.options.find((o) => o.value === pick.value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <button type="button" aria-label={label}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 text-sm whitespace-nowrap outline-none transition-colors hover:bg-input/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30" />
      }>
        {label}{(picked || on.length > 0) && <> · {[picked?.label, ...on.map((i) => i.label)].filter(Boolean).join(", ")}</>}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-44">
        {pick && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{pick.label}</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={pick.value} onValueChange={(v) => pick.onChange(String(v))}>
                {pick.options.map((o) => <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        {items.map((i) => (
          // a menu row with a real checkbox on the left; the menu stays open so several can be ticked
          <DropdownMenuItem key={i.key} closeOnClick={false} onClick={() => i.onChange(!i.on)}>
            <Checkbox checked={i.on} tabIndex={-1} aria-hidden className="pointer-events-none" />
            {i.label}{i.count !== undefined && <span className="ml-auto rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{i.count}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface SegmentOption<T extends string> { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; title?: string }

/**
 * Grey segmented switch (owner 2026-10-09) — for "pick one, the whole view changes": view, range, mode.
 * h-9 like every toolbar control; the picked one is a white pill. Filters stay dropdowns, show / hide stays ShowChip.
 */
export function Segmented<T extends string>({ value, onChange, options, className, label, iconOnly }: { value: T; onChange: (v: T) => void; options: SegmentOption<T>[]; className?: string; label?: string
  /** owner 2026-10-12: icons only (e.g. Kanban / ตาราง) — the name shows on hover */
  iconOnly?: boolean }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex h-9 shrink-0 items-center rounded-full bg-muted p-1", className)}>
      {options.map((o) => {
        const cls = cn("flex h-7 items-center gap-1.5 rounded-full text-sm whitespace-nowrap", iconOnly && o.icon ? "w-8 justify-center" : "px-3", value === o.value ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")
        if (iconOnly && o.icon) {
          const Icon = o.icon
          return (
            <HoverCard key={o.value}>
              <HoverCardTrigger render={<button type="button" aria-pressed={value === o.value} aria-label={typeof o.label === "string" ? o.label : undefined} onClick={() => onChange(o.value)} className={cls} />}>
                <Icon className="size-4" />
              </HoverCardTrigger>
              <HoverCardContent>{o.title ?? o.label}</HoverCardContent>
            </HoverCard>
          )
        }
        return (
          <button key={o.value} type="button" aria-pressed={value === o.value} title={o.title} onClick={() => onChange(o.value)} className={cls}>
            {o.icon && <o.icon className="size-4" />}{o.label}
          </button>
        )
      })}
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
