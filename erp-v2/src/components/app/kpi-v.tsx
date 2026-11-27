"use client"

import type { ComponentProps } from "react"
import { Kpi } from "./kpi"

/**
 * KPI card WITH a visual (owner 2026-11-27) — a separate set from `Kpi`, used ONLY by the Dashboard and Reports. Every other page keeps the plain `Kpi`
 * (no chart). Same card, same lines; the visual (components/app/kpi-visuals.tsx) sits under them and carries its numbers in a hover card.
 */
export function KpiV({ visual, ...props }: Omit<ComponentProps<typeof Kpi>, "children"> & { visual: React.ReactNode }) {
  return <Kpi {...props}>{visual}</Kpi>
}
