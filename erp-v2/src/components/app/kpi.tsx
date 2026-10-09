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

/**
 * KPI card — one structure everywhere (owner 2026-10-09): icon (always) · label · number · sub text (optional) ·
 * optional body below that may make the card taller. Same minimum height everywhere and the content is centred
 * vertically, so a card without sub text never looks stuck at the top.
 * Fills its grid cell. Clickable when it filters the list below.
 */
export function Kpi({
  icon: Icon, label, value, sub, tone = "primary", valueClassName, onClick, active, children, className,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: KpiTone
  valueClassName?: string
  /** a KPI that filters the list below (owner 2026-10-09) — click again to clear */
  onClick?: () => void
  active?: boolean
  /** optional body text / content under the numbers */
  children?: React.ReactNode
  className?: string
}) {
  const Tag = onClick ? "button" : "div"
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick} aria-pressed={onClick ? !!active : undefined}
      className={cn("flex h-full min-h-24 w-full flex-col justify-center gap-2 rounded-3xl bg-card p-4 text-left shadow-sm ring-1 ring-foreground/5", onClick && "transition hover:ring-foreground/20", active && "ring-2 ring-primary hover:ring-primary", className)}>
      <div className="flex w-full items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", KPI_TONE[tone])}><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className={cn("truncate text-2xl leading-tight font-semibold tabular-nums", valueClassName)}>{value}</p>
          {sub && <p className="truncate text-xs leading-4 text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {children && <div className="w-full text-sm">{children}</div>}
    </Tag>
  )
}
