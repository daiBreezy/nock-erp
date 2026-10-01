"use client"

import type { ReactNode } from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** 880K · 1.3M · 950 — short money/number for cards and axes */
export function fmtShort(n: number) {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, "")}M`
  if (a >= 1_000) return `${(n / 1_000).toFixed(a >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`
  return Math.round(n).toLocaleString("th-TH")
}
export const fmtNum = (n: number) => Math.round(n).toLocaleString("th-TH")
export const fmtPct = (x: number | null, digits = 0) => (x === null ? "—" : `${(x * 100).toFixed(digits)}%`)

/** brand colour at a strength 0–1 (heatmaps, bars) */
export const tint = (x: number) => `color-mix(in oklab, var(--color-primary) ${Math.round(8 + Math.max(0, Math.min(1, x)) * 82)}%, transparent)`

/** ▲ 12% / ▼ 4% — null = nothing to compare with yet (no history) */
export function Delta({ value, invert, className }: { value: number | null; invert?: boolean; className?: string }) {
  if (value === null) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>
  const up = value >= 0
  const good = invert ? !up : up
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", good ? "text-emerald-600" : "text-red-600", className)}>
      {up ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}{Math.abs(value)}%
    </span>
  )
}

/** A report card. `center` = content centred in the card's height · `fill` = content stretched to the card's height
 *  (owner 2026-10-01: cards side by side are the same height — the content should fill it, not leave a gap). */
export function Panel({ title, hint, action, children, className, center, fill }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string; center?: boolean; fill?: boolean }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 sm:p-5", className)}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {center ? <div className="flex flex-1 flex-col justify-center">{children}</div> : fill ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
    </section>
  )
}

export function Empty({ children = "ยังไม่มีข้อมูลในช่วงนี้" }: { children?: ReactNode }) {
  return <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>
}

const TH_MONTH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

/** Jan…Dec bars: this year (solid) next to last year (light). Months not reached yet stay empty. */
export function MonthBars({ thisYear, lastYear, current, fmt = fmtShort }: { thisYear: (number | null)[]; lastYear: (number | null)[]; current: number; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...thisYear.map((x) => x ?? 0), ...lastYear.map((x) => x ?? 0))
  const hasLast = lastYear.some((x) => !!x)
  return (
    <div>
      <div className="flex h-48 items-end gap-1.5 border-b sm:gap-2.5">
        {thisYear.map((v, m) => {
          const l = lastYear[m]
          return (
            <div key={m} className={cn("group relative flex h-full flex-1 items-end justify-center gap-0.5 rounded-t-lg", m === current && "bg-muted/60")}
              title={`${TH_MONTH_SHORT[m]} · ปีนี้ ${v === null ? "—" : fmtNum(v)}${hasLast ? ` · ปีที่แล้ว ${l === null ? "—" : fmtNum(l)}` : ""}`}>
              <div className="w-1/2 max-w-4 rounded-t bg-primary transition-all" style={{ height: `${((v ?? 0) / max) * 100}%` }} />
              {hasLast && <div className="w-1/2 max-w-4 rounded-t bg-primary/25" style={{ height: `${((l ?? 0) / max) * 100}%` }} />}
              {v !== null && v > 0 && <span className="pointer-events-none absolute -top-5 hidden rounded bg-foreground px-1 text-[10px] text-background group-hover:block">{fmt(v)}</span>}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-1.5 text-center text-[10px] text-muted-foreground sm:gap-2.5">
        {TH_MONTH_SHORT.map((m, i) => <span key={m} className={cn("flex-1", i === current && "font-semibold text-foreground")}>{m}</span>)}
      </div>
      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" />ปีนี้</span>
        {hasLast ? <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary/25" />ปีที่แล้ว</span> : <span>ยังไม่มีข้อมูลปีที่แล้ว (ไม่ได้ Import)</span>}
      </div>
    </div>
  )
}

/** A thin horizontal share bar */
export function ShareBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  )
}

const DONUT = ["var(--color-primary)", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#64748b"]
export const donutColor = (i: number) => DONUT[i % DONUT.length]

export function Donut({ parts, center, sub }: { parts: { label: string; value: number }[]; center: string; sub: string }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1
  const ends = parts.map((_, i) => parts.slice(0, i + 1).reduce((a, p) => a + (Math.max(0, p.value) / total) * 360, 0))
  const stops = parts.map((_, i) => `${donutColor(i)} ${i ? ends[i - 1] : 0}deg ${ends[i]}deg`).join(", ")
  return (
    <div className="relative mx-auto grid size-40 place-items-center rounded-full" style={{ background: `conic-gradient(${stops || "var(--color-muted) 0deg 360deg"})` }}>
      <div className="grid size-28 place-items-center rounded-full bg-card text-center">
        <div><p className="text-xl font-semibold tabular-nums">{center}</p><p className="text-[11px] text-muted-foreground">{sub}</p></div>
      </div>
    </div>
  )
}

/** Heatmap table — darker = more. Empty cells stay blank so the eye finds the busy spots. */
export function Heatmap<R extends string | number, C extends string | number>({ rows, cols, rowLabel, colLabel, value, fmt = fmtNum, corner }: {
  rows: R[]; cols: C[]; rowLabel: (r: R) => ReactNode; colLabel: (c: C) => ReactNode; value: (r: R, c: C) => number; fmt?: (n: number) => string; corner?: string
}) {
  // rows stretch to fill the card (inside a Panel with `fill`); never shorter than h-7
  const max = Math.max(1, ...rows.flatMap((r) => cols.map((c) => value(r, c))))
  return (
    <div className="flex-1 overflow-x-auto">
      <table className="h-full w-full border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr><th className="px-1 py-1 text-left font-normal text-muted-foreground">{corner}</th>{cols.map((c) => <th key={String(c)} className="px-1 py-1 font-normal text-muted-foreground">{colLabel(c)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r)}>
              <th className="px-1 py-1 text-left font-normal whitespace-nowrap text-muted-foreground">{rowLabel(r)}</th>
              {cols.map((c) => {
                const v = value(r, c)
                const x = v / max
                return (
                  <td key={String(c)} className={cn("h-7 min-w-9 rounded-md text-center tabular-nums", x > 0.55 ? "text-primary-foreground" : "text-foreground")}
                    style={{ background: v ? tint(x) : "var(--color-muted)" }}>{v ? fmt(v) : ""}</td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Rank({ n }: { n: number }) {
  return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-medium tabular-nums">{n}</span>
}
