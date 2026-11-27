"use client"

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

/**
 * KPI visuals (owner 2026-11-27): NO words under them — a visual is read in one glance, and the figures live in a hover card. One hue (the primary at
 * different strengths; red only for "a problem"). Each one answers "better or worse than what?" by drawing the comparison itself:
 *  PaceLines — the running total against the previous period's (the faint line) · optional dashed forecast continuing it
 *  ShareBar  — one bar split into done / still to come / problems
 *  StageBar  — where things stand across stages (the lead funnel)
 */

/** every visual sits in the SAME slot (28px tall, full width): lines fill it, bars (8px, no grey track behind them) are centred in it — so the cards of a row line up */
/** the swatch in front of a hover row — the colour (or dashed line) that part has in the visual, so the hover doubles as its legend */
export type Mark = "primary" | "faint" | "dashed" | "p70" | "p65" | "p45" | "p40" | "p25" | "danger" | "plain"
const MARK: Record<Exclude<Mark, "dashed">, string> = { primary: "bg-primary", faint: "bg-primary/30", p70: "bg-primary/70", p65: "bg-primary/65", p45: "bg-primary/45", p40: "bg-primary/40", p25: "bg-primary/25", danger: "bg-danger", plain: "bg-foreground/15" }
function Swatch({ mark }: { mark: Mark }) {
  if (mark === "dashed") return <span aria-hidden className="inline-block h-0 w-3 shrink-0 border-t-2 border-dashed border-primary/60" />
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", MARK[mark])} />
}

/** the hover card with the details — `rows` are label · value pairs, each with an optional colour swatch */
export function TipRows({ title, rows }: { title?: React.ReactNode; rows: { label: React.ReactNode; value: React.ReactNode; tone?: "danger"; mark?: Mark }[] }) {
  return (
    <div className="space-y-1 text-xs">
      {title && <p className="font-medium text-foreground">{title}</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">{r.mark && <Swatch mark={r.mark} />}{r.label}</span>
          <span className={cn("tabular-nums", r.tone === "danger" ? "text-danger" : "text-foreground")}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function Hover({ tip, children }: { tip: React.ReactNode; children: React.ReactNode }) {
  return (
    <HoverCard>
      <HoverCardTrigger render={<div tabIndex={0} className="flex h-7 w-full cursor-default items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />}>{children}</HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-auto min-w-48">{tip}</HoverCardContent>
    </HoverCard>
  )
}

const W = 100, H = 28
const line = (pts: (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")

/** the running total (solid) against the previous period's (faint), same scale, aligned by position; `forecast` = the values from the last real point onward (dashed) */
export function PaceLines({ now, prev, days, forecast, tip }: { now: number[]; prev: number[]; days: number; forecast?: number[]; tip: React.ReactNode }) {
  const hi = Math.max(...now, ...prev, ...(forecast ?? []), 1)
  const at = (i: number, x: number) => [days <= 1 ? 0 : (i / (days - 1)) * W, H - 2 - (x / hi) * (H - 4)] as const
  const a = prev.map((x, i) => at(i, x)), b = now.map((x, i) => at(i, x))
  const f = forecast && forecast.length > 1 ? forecast.map((x, k) => at(now.length - 1 + k, x)) : []
  return (
    <Hover tip={tip}>
      <div className="relative h-7 w-full">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
          {a.length > 1 && <polyline points={line(a)} fill="none" stroke="var(--color-primary)" strokeOpacity="0.3" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />}
          {f.length > 1 && <polyline points={line(f)} fill="none" stroke="var(--color-primary)" strokeOpacity="0.6" strokeWidth="1.75" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
          {b.length > 1 && <polyline points={line(b)} fill="none" stroke="var(--color-primary)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />}
        </svg>
      </div>
    </Hover>
  )
}

/** one bar: done · still to come · problems */
export function ShareBar({ done, todo, problem, tip }: { done: number; todo: number; problem: number; tip: React.ReactNode }) {
  const total = done + todo + problem
  const w = (n: number) => `${total ? (n / total) * 100 : 0}%`
  return (
    <Hover tip={tip}>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        {total > 0 && <>
          {done > 0 && <span className="h-full rounded-full bg-primary" style={{ width: w(done) }} />}
          {todo > 0 && <span className="h-full rounded-full bg-primary/25" style={{ width: w(todo) }} />}
          {problem > 0 && <span className="h-full min-w-1 rounded-full bg-danger" style={{ width: w(problem) }} />}
        </>}
      </div>
    </Hover>
  )
}

export function StageBar({ stages, tip }: { stages: { label: string; value: number }[]; tip: React.ReactNode }) {
  const total = stages.reduce((n, x) => n + x.value, 0)
  const fills = ["bg-primary", "bg-primary/70", "bg-primary/45", "bg-primary/25"]
  return (
    <Hover tip={tip}>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        {total > 0 && stages.map((x, i) => x.value > 0 && <span key={x.label} className={cn("h-full rounded-full", fills[i % fills.length])} style={{ width: `${(x.value / total) * 100}%` }} />)}
      </div>
    </Hover>
  )
}

/** one bar split into parts — the first part (usually "as planned") is quiet grey, the others are the primary at falling strengths: you see how much is NOT grey */
export function PlanBar({ parts, tip }: { parts: { value: number; tone: "plain" | "a" | "b" | "c" | "danger" }[]; tip: React.ReactNode }) {
  const total = parts.reduce((n, p) => n + p.value, 0)
  const fill = { plain: "bg-foreground/15", a: "bg-primary", b: "bg-primary/65", c: "bg-primary/40", danger: "bg-danger" } as const
  return (
    <Hover tip={tip}>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
        {total > 0 && parts.map((p, i) => p.value > 0 && <span key={i} className={cn("h-full rounded-full", fill[p.tone], p.tone !== "plain" && "min-w-1")} style={{ width: `${(p.value / total) * 100}%` }} />)}
      </div>
    </Hover>
  )
}
