"use client"

import { Children, createContext, isValidElement, useContext } from "react"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { InfoTip } from "@/components/app/info-tip"

/** One overview number card — was copy-pasted per-page (classes/courses had byte-identical local
 *  copies); shared here so a style change doesn't need to be repeated across every list page. */
export const KPI_TONE = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-success-soft text-success-ink",
  red: "bg-danger-soft text-danger-ink",
  amber: "bg-warning-soft text-warning-ink",
  special: "bg-special-soft text-special-ink",
  sky: "bg-info-soft text-info-ink",
} as const
export type KpiTone = keyof typeof KPI_TONE

/**
 * Does this row have a third line? (owner 2026-11-18) A row's cards all share the same lines: if ANY card in the group has a
 * `sub` (a line under the number), every card of the group keeps that line — blank where it has nothing to say — so labels and
 * numbers line up and the row never changes height. A row where no card has a `sub` stays two lines (no empty line).
 * A card that can have a sub in some period / filter must pass `sub={null}` (not `undefined`) when it is empty right now, so the
 * row keeps the line when the period changes.
 */
const KpiLinesContext = createContext(false)
export function KpiGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  const reserve = Children.toArray(children).some((c) => isValidElement(c) && (c.props as { sub?: unknown }).sub !== undefined)
  return <KpiLinesContext.Provider value={reserve}><div className={className}>{children}</div></KpiLinesContext.Provider>
}

/** the number's colour when `emphasis` is on (a count that needs attention) — the tone's own ink */
const KPI_INK: Record<KpiTone, string> = {
  primary: "text-primary",
  emerald: "text-success-ink",
  red: "text-danger-ink",
  amber: "text-warning-ink",
  special: "text-special-ink",
  sky: "text-info-ink",
}

/**
 * Design System › Kpi: a number in a small space is shortened (owner 2026-11-26): Million ALWAYS with 2 decimals ("2.01M", "1.00M"),
 * Thousand with 1 decimal ("637.3K"). Phones shorten from 100,000 up (the full value stays in the tooltip).
 */
export function compactNum(n: number): string {
  const a = Math.abs(n)
  const k = (a / 1_000).toFixed(1)
  if (a >= 1_000_000 || k === "1000.0") return `${(n / 1_000_000).toFixed(2)}M`
  if (a >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
}
export function abbreviate(n: number): string | null {
  return Math.abs(n) >= 100_000 ? compactNum(n) : null
}

/** a number for a KPI: full from 640px up, abbreviated on phones (the full value stays in the tooltip) */
function KpiNumber({ n, prefix = "" }: { n: number; prefix?: string }) {
  const full = `${prefix}${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  const short = abbreviate(n)
  if (!short) return <>{full}</>
  return <span title={full}><span className="sm:hidden">{prefix}{short}</span><span className="hidden sm:inline">{full}</span></span>
}

/** money for a KPI (฿, abbreviated on phones) — use instead of fmtMoney() inside `value` */
export const kpiMoney = (n: number) => <KpiNumber n={n} prefix="฿" />

/**
 * KPI card — one structure everywhere (Design System › Kpi, round 2 · 2026-11-10, after the Dashboard StatCard look).
 * Two looks of the SAME card (owner 2026-11-18, for hierarchy): `card` (default) = white, soft shadow — the headline numbers
 * of a page; `tonal` = grey tint, no shadow — numbers that sit inside / under a section (secondary). Same structure, same type scale.
 *   [small icon] label            ← 12px, one line, full text on hover
 *   24px number
 *   sub                           ← its own line under the number; the whole ROW keeps it if any card has one (KpiGroup)
 * Calm card: rounded-xl, soft ring, 12–14px padding. Width = its column (KpiRow sets the columns; 4 cards share the row equally).
 * Numbers ≥100K abbreviate on phones (K / M). No visual / chart here — micro-charts live on the Dashboard only.
 * No className / valueClassName / compact — those were what made pages differ.
 */
export function Kpi({
  icon: Icon, label, value, sub, tone = "primary", emphasis, onClick, active, info, children, variant = "card", size = "md", go,
}: {
  /** the small icon before the label — optional on a `tonal` card, which sits inside a section that already has a title */
  icon?: React.ComponentType<{ className?: string }>
  /** `card` = white + shadow (headline) · `tonal` = grey tint, flat (secondary) */
  variant?: "card" | "tonal"
  /** `sm` = a quiet number (text-sm, regular weight) for a small card that sits UNDER something else (a child inside the family panel, owner 2026-11-20) — same structure, one step down the type scale */
  size?: "md" | "sm"
  label: React.ReactNode
  /** a number (abbreviated on phones), `kpiMoney(n)`, or any short node such as "38 / 41" */
  value: React.ReactNode
  /** one short fact under the number ("53 ครอบครัว") — one line, truncated */
  sub?: React.ReactNode
  tone?: KpiTone
  /** colour the number (and icon) in the tone's ink — for a count that needs attention (e.g. `emphasis={n > 0}`) */
  emphasis?: boolean
  /** a KPI that filters the list below (owner 2026-10-09) — click again to clear */
  onClick?: () => void
  active?: boolean
  /** the card OPENS something (a panel, another tab) rather than filtering the list — a small chevron at its right edge says so (owner 2026-11-20) */
  go?: boolean
  /** a note that used to be a bar above the list — an ⓘ at the card's right edge, read on hover */
  info?: React.ReactNode
  /** optional body text / content under the numbers */
  children?: React.ReactNode
}) {
  const Tag = onClick ? "button" : "div"
  const reserveSub = useContext(KpiLinesContext)
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} aria-pressed={onClick ? !!active : undefined}
      className={cn("relative flex h-full w-full min-w-0 flex-col gap-1 rounded-xl px-3.5 text-left", size === "sm" ? "py-2" : "py-3", go && onClick && "pr-8",
        variant === "tonal" ? "justify-start bg-muted/50" : "justify-start bg-card shadow-sm ring-1 ring-foreground/5 sm:min-w-40",
        onClick && (variant === "tonal" ? "transition hover:bg-muted" : "transition hover:ring-foreground/20"), active && (variant === "tonal" ? "bg-foreground/10 hover:bg-foreground/10" : "ring-2 ring-primary hover:ring-primary"))}>
      <p title={typeof label === "string" ? label : undefined} className={cn("flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground", emphasis && KPI_INK[tone])}>
        {Icon && <Icon className="size-3.5 shrink-0" />}<span className="truncate text-muted-foreground">{label}</span>
        {info && <InfoTip text={info} className="ml-auto -my-0.5" />}
      </p>
      <span className={cn("tabular-nums", size === "sm" ? "text-sm leading-5" : "text-2xl leading-tight font-semibold tracking-tight", emphasis && KPI_INK[tone])}>{typeof value === "number" ? <KpiNumber n={value} /> : value}</span>
      {/* the sub line: one fixed line (16px), there when this card OR any card of its group has a sub (see KpiGroup) */}
      {(sub !== undefined || reserveSub) && <p className="h-4 min-w-0 truncate text-xs leading-4 text-muted-foreground">{sub}</p>}
      {children && <div className="w-full text-sm">{children}</div>}
      {/* the card OPENS something: a small chevron, centred between the top and the bottom of the card */}
      {go && onClick && <ChevronRightIcon className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />}
    </Tag>
  )
}
