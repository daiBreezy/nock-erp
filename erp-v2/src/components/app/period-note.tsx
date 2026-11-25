"use client"

import { SunIcon } from "lucide-react"
import { fmtDate } from "@/domain/dates"
import { periodsCovering } from "@/domain/rules/period-impact"
import type { DateStr, ID } from "@/domain/types"
import { HUE } from "@/components/app/tags"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-25: under a date field — "this day is inside the Special Period X". Teal like the calendar's period colour. `block` = the day is NOT allowed
 * (a regular class's start date, a Trial) so the line says so; the default is a plain notice (the day can be picked). A period that is not Active yet is
 * shown as planned. Nothing renders when the day is free of periods.
 */
export function PeriodNote({ date, branchId, block, className }: { date: DateStr | undefined; branchId?: ID; block?: boolean; className?: string }) {
  const here = useStore((s) => s.branchId)
  const branch = useStore((s) => s.branches.find((b) => b.id === (branchId ?? here)))
  if (!date) return null
  const hits = periodsCovering(branch?.specialPeriods, date)
  if (!hits.length) return null
  return (
    <div className={cn("space-y-0.5 text-xs", className)}>
      {hits.map(({ period, active }) => (
        <p key={period.id} className={cn("flex items-start gap-1 rounded-lg px-2 py-1", block && active ? "bg-danger-soft text-danger" : HUE.teal.chip)}>
          <SunIcon className="mt-0.5 size-3 shrink-0" />
          <span>
            {tx("วันนี้อยู่ในช่วงพิเศษ")} <b>{period.name}</b> ({fmtDate(period.from)} – {fmtDate(period.to)})
            {active ? (block ? ` — ${tx("เลือกไม่ได้ คลาสปกติหยุดทั้งช่วง")}` : ` — ${tx("คลาสปกติหยุด")}`) : ` — ${tx("ยังไม่เปิดใช้ (Inactive)")}`}
          </span>
        </p>
      ))}
    </div>
  )
}
