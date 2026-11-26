"use client"

import { Pill } from "@/components/app/badges"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"
import type { ID } from "@/domain/types"

/**
 * owner 2026-11-26 — a class / course made for a Special Period says so (its name beside the name) and the Classes / Courses lists filter by it.
 * `periodNameOf` finds the period by id across every branch; `usePeriodFilterOptions` is the "ช่วง" filter: all · regular · every special period · one period.
 */
export function usePeriods() {
  const branches = useStore((s) => s.branches)
  return branches.flatMap((b) => b.specialPeriods ?? []).filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
}

export function PeriodTag({ periodId }: { periodId?: ID }) {
  const periods = usePeriods()
  if (!periodId) return null
  const name = periods.find((p) => p.id === periodId)?.name
  return <Pill tone="special" title={tx("ช่วงพิเศษ")}>{name ?? tx("ช่วงพิเศษ")}</Pill>
}

export const matchesPeriod = (filter: string, periodId?: ID) => !filter || (filter === "regular" ? !periodId : filter === "special" ? !!periodId : periodId === filter)

export function usePeriodFilterOptions(usedIds: (ID | undefined)[]) {
  const periods = usePeriods()
  const used = new Set(usedIds.filter(Boolean) as ID[])
  return [
    { value: "regular", label: tx("ปกติ (ไม่ใช่ช่วงพิเศษ)") },
    { value: "special", label: tx("ช่วงพิเศษทั้งหมด") },
    ...periods.filter((p) => used.has(p.id)).map((p) => ({ value: p.id, label: p.name })),
  ]
}
