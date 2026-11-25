import { SunIcon } from "lucide-react"
import { fmtDate } from "@/domain/dates"
import type { OpenHours, SpecialPeriod, Weekday } from "@/domain/types"
import { cn } from "@/lib/utils"
import { HUE } from "./tags"

const ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
const fmt = (h: OpenHours | null) => (h ? `${h.open}–${h.close}` : "ปิด")

/** One-line hours summary of a special period ("ทุกวัน 08:00–22:00" or per-day differences). */
export function periodHours(p: SpecialPeriod) {
  const set = new Set(ORDER.map((d) => fmt(p.hours[d])))
  return set.size === 1 ? `ทุกวัน ${[...set][0]}` : "เวลาต่างกันรายวัน"
}

/** Teal strip (owner 2026-11-25: holiday = red, special period = teal) naming a special period (e.g. Summer) — used on the calendar and the holiday board
 *  so staff always see which period they are scheduling in. */
export function PeriodBanner({ period, className }: { period: SpecialPeriod; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl px-3 py-1.5 text-xs", HUE.teal.chip, className)}>
      <SunIcon className="size-3.5 shrink-0" />
      <b>ช่วง {period.name}</b>
      <span>{fmtDate(period.from, { year: true })} – {fmtDate(period.to, { year: true })}</span>
      <span className="opacity-80">· เวลาเปิด {periodHours(period)}</span>
    </div>
  )
}
