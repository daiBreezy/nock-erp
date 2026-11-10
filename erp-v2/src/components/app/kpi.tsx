import { cn } from "@/lib/utils"

/** One overview number card — was copy-pasted per-page (classes/courses had byte-identical local
 *  copies); shared here so a style change doesn't need to be repeated across every list page. */
export const KPI_TONE = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
} as const
export type KpiTone = keyof typeof KPI_TONE

/** the number's colour when `emphasis` is on (a count that needs attention) — the tone's own ink */
const KPI_INK: Record<KpiTone, string> = {
  primary: "text-primary",
  emerald: "text-emerald-700 dark:text-emerald-300",
  red: "text-red-700 dark:text-red-300",
  amber: "text-amber-700 dark:text-amber-300",
  violet: "text-violet-700 dark:text-violet-300",
  sky: "text-sky-700 dark:text-sky-300",
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
 * KPI card — one structure everywhere (Design System › Kpi). Responsive (owner 2026-11-04):
 *  · Desktop (≥1024): icon on the left · label · number — the familiar wide card.
 *  · Tablet / phone (<1024): no icon (less clutter); label sits on top in a fixed two-line box, so the number
 *    lands at the SAME height on every card in the row even when one label wraps and another doesn't.
 * Number 24px at every size; plain numbers abbreviate on phones (K / M). Same minimum height everywhere, content
 * centred vertically. Fills its grid cell. Clickable when it filters the list below.
 * No className / valueClassName / compact (Design System 2026-11-10) — those were what made pages differ.
 */
export function Kpi({
  icon: Icon, label, value, sub, tone = "primary", emphasis, onClick, active, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: React.ReactNode
  /** a number (abbreviated on phones), `kpiMoney(n)`, or any short node such as "38 / 41" */
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: KpiTone
  /** colour the number in the tone's ink — for a count that needs attention (e.g. `emphasis={n > 0}`) */
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
      className={cn("flex h-full min-h-20 w-full flex-col justify-center gap-1.5 rounded-3xl bg-card p-3.5 text-left shadow-sm ring-1 ring-foreground/5 lg:min-h-24 lg:gap-2 lg:p-4", onClick && "transition hover:ring-foreground/20", active && "ring-2 ring-primary hover:ring-primary")}>
      <div className="flex w-full items-center gap-3">
        {/* icon only on desktop — tablet/phone drop it to keep the row compact */}
        <span className={cn("hidden size-10 shrink-0 place-items-center rounded-2xl lg:grid", KPI_TONE[tone])}><Icon className="size-5" /></span>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* fixed two-line box below desktop so every card's number starts at the same height; full text on hover */}
          <p title={typeof label === "string" ? label : undefined} className="line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground lg:line-clamp-none lg:min-h-0 lg:truncate">{label}</p>
          <p className={cn("truncate text-2xl leading-tight font-semibold tabular-nums", emphasis && KPI_INK[tone])}>{typeof value === "number" ? <KpiNumber n={value} /> : value}</p>
          {sub && <p className="truncate text-xs leading-4 text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {children && <div className="w-full text-sm">{children}</div>}
    </Tag>
  )
}
