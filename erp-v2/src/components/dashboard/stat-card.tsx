"use client"

// Dashboard stat card (owner 2026-11-10, Leadora ref: "เห็นทั้งตัวเลขและ Visual"): label + big number + a delta pill
// + a micro-chart in one calm card. The brand accent comes from the `primary` token (so the colour switcher re-themes
// it); semantic colours (green = up, red = down) stay fixed.
import { DASH_BOX } from "./box"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function StatCard({ icon: Icon, label, value, delta, sub, chart }: {
  icon: LucideIcon; label: string; value: React.ReactNode; delta?: React.ReactNode; sub?: React.ReactNode; chart?: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col", DASH_BOX)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-4" /> {label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{value}</span>
        {delta}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      {chart && <div className="mt-3">{chart}</div>}
    </div>
  )
}

/** green ▲ / red ▼ pill — semantic, fixed (never themed) */
export function DeltaPill({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null || !isFinite(value)) return null
  const up = value >= 0
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums", up ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300")}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{Math.round(value)}{suffix}
    </span>
  )
}

/** a small neutral count pill ("2 ใหม่") */
export function CountPill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" }) {
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-medium", tone === "warn" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-muted text-muted-foreground")}>{children}</span>
}

/** brand-coloured sparkline (var(--primary) → re-themes with the colour switcher) */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values)
  const n = values.length
  const pts = values.map((v, i) => `${(i / Math.max(1, n - 1)) * 100},${28 - (v / max) * 24}`).join(" ")
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cn("h-7 w-full", className)} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** brand-coloured mini bars; the last bar solid, the rest faded */
export function MiniBars({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values)
  return (
    <div className={cn("flex h-7 items-end gap-1", className)} aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className={cn("min-w-0 flex-1 rounded-sm", i === values.length - 1 ? "bg-primary" : "bg-primary/25")} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
      ))}
    </div>
  )
}

/** attendance split — มา (green) / ลา (amber) / ขาด (red); semantic, fixed */
export function AttBar({ present, leave, absent }: { present: number; leave: number; absent: number }) {
  const total = present + leave + absent || 1
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <span style={{ width: `${(present / total) * 100}%` }} className="bg-emerald-500" />
        <span style={{ width: `${(leave / total) * 100}%` }} className="bg-amber-500" />
        <span style={{ width: `${(absent / total) * 100}%` }} className="bg-red-500" />
      </div>
      <div className="mt-1.5 flex gap-2.5 text-[11px] text-muted-foreground">
        <span><span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" />{tx("มา")} {present}</span>
        <span><span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500 align-middle" />{tx("ลา")} {leave}</span>
        {absent > 0 && <span><span className="mr-1 inline-block size-1.5 rounded-full bg-red-500 align-middle" />{tx("ขาด")} {absent}</span>}
      </div>
    </div>
  )
}
