import { cn } from "@/lib/utils"

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

/** the number's colour when `emphasis` is on (a count that needs attention) — the tone's own ink */
const KPI_INK: Record<KpiTone, string> = {
  primary: "text-primary",
  emerald: "text-success-ink",
  red: "text-danger-ink",
  amber: "text-warning-ink",
  special: "text-special-ink",
  sky: "text-info-ink",
}

/** Design System › Kpi: phones show 100,000+ as K and 1,000,000+ as M (1.25M) — the font never shrinks */
export function abbreviate(n: number): string | null {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`
  if (a >= 100_000) return `${Math.round(n / 1_000)}K`
  return null
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
 * KPI card — one structure everywhere (Design System › Kpi, round 2 · 2026-11-10, after the Dashboard StatCard look):
 *   [small icon] label            ← 12px, one line, full text on hover
 *   24px number  · sub            ← sub sits beside the number (wraps under it on narrow phones)
 * Calm card: rounded-xl, soft ring, 12–14px padding. Width 160–288px from 640 up (KpiRow sets the columns).
 * Numbers ≥100K abbreviate on phones (K / M). No visual / chart here — micro-charts live on the Dashboard only.
 * No className / valueClassName / compact — those were what made pages differ.
 */
export function Kpi({
  icon: Icon, label, value, sub, tone = "primary", emphasis, onClick, active, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: React.ReactNode
  /** a number (abbreviated on phones), `kpiMoney(n)`, or any short node such as "38 / 41" */
  value: React.ReactNode
  /** one short fact beside the number ("53 ครอบครัว") */
  sub?: React.ReactNode
  tone?: KpiTone
  /** colour the number (and icon) in the tone's ink — for a count that needs attention (e.g. `emphasis={n > 0}`) */
  emphasis?: boolean
  /** a KPI that filters the list below (owner 2026-10-09) — click again to clear */
  onClick?: () => void
  active?: boolean
  /** optional body text / content under the numbers */
  children?: React.ReactNode
}) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} aria-pressed={onClick ? !!active : undefined}
      className={cn("flex h-full w-full min-w-0 flex-col justify-start gap-1 rounded-xl bg-card px-3.5 py-3 text-left shadow-sm ring-1 ring-foreground/5 sm:max-w-72 sm:min-w-40",
        onClick && "transition hover:ring-foreground/20", active && "ring-2 ring-primary hover:ring-primary")}>
      <p title={typeof label === "string" ? label : undefined} className={cn("flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground", emphasis && KPI_INK[tone])}>
        <Icon className="size-3.5 shrink-0" /><span className="truncate text-muted-foreground">{label}</span>
      </p>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span className={cn("text-2xl leading-tight font-semibold tracking-tight tabular-nums", emphasis && KPI_INK[tone])}>{typeof value === "number" ? <KpiNumber n={value} /> : value}</span>
        {sub && <span className="max-w-full min-w-0 truncate text-xs text-muted-foreground"><span aria-hidden="true">· </span>{sub}</span>}
      </div>
      {children && <div className="w-full text-sm">{children}</div>}
    </Tag>
  )
}
