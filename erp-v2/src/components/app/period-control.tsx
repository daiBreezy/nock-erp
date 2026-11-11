"use client"

// The one date control for list pages (owner 2026-10-09):  [ วันนี้ | สัปดาห์นี้ | เดือนนี้ | กำหนดเอง ]  ( ‹ range › )
// Segmented switch for the kind of period, one pill to step back / forward. Kept in the URL (?period=&at=&from=&to=).
import { DateRangePicker } from "@/components/app/date-range-picker"
import { RangeStepper } from "@/components/app/page-layout"
import { fmtDate, fmtMonth, toDateStr } from "@/domain/dates"
import { isCurrent, periodRange, shiftPeriod, type PeriodMode, type PeriodRange } from "@/domain/rules/period"
import type { DateStr } from "@/domain/types"
import { useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MODES: { key: Exclude<PeriodMode, "custom">; label: string }[] = [
  { key: "day", label: "วันนี้" }, { key: "week", label: "สัปดาห์นี้" }, { key: "month", label: "เดือนนี้" },
]

export function usePeriod(initial: PeriodMode = "week", opts?: { modes?: Exclude<PeriodMode, "custom">[] }) {
  const shownModes = opts?.modes ? MODES.filter((m) => opts.modes!.includes(m.key)) : MODES
  const today = toDateStr(useNow())
  const [mode, setMode] = useQueryState<PeriodMode>("period", initial)
  const [at, setAt] = useQueryState<string>("at", "")
  const [from, setFrom] = useQueryState<string>("from", "")
  const [to, setTo] = useQueryState<string>("to", "")
  const anchor = at || today
  const custom: PeriodRange | undefined = from && to ? { from, to } : undefined
  const range = periodRange(mode, anchor, custom)
  const label = mode === "day" ? fmtDate(range.from, { weekday: true, year: true })
    : mode === "month" ? fmtMonth(range.from)
      : `${fmtDate(range.from, { year: range.from.slice(0, 4) !== range.to.slice(0, 4) })} – ${fmtDate(range.to, { year: true })}`
  const step = (dir: -1 | 1) => {
    const n = shiftPeriod(mode, anchor, dir, range)
    setAt(n.anchor === today ? "" : n.anchor)
    if (n.custom) { setFrom(n.custom.from); setTo(n.custom.to) }
  }
  const pick = (m: Exclude<PeriodMode, "custom">) => { setMode(m); setAt(""); setFrom(""); setTo("") }
  const setCustom = (r: { from: DateStr; to: DateStr }) => { setMode("custom"); setFrom(r.from); setTo(r.to); setAt("") }
  const current = isCurrent(mode, anchor, today)
  const control = (
    // phones: the mode switch and the stepper each take their own full-width row (owner 2026-11-04)
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div role="group" aria-label="ช่วงเวลา" className="flex h-9 w-full items-center rounded-full bg-muted p-1 sm:inline-flex sm:w-auto">
        {shownModes.map((m) => (
          <Button variant="ghost" size="inline" key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => pick(m.key)}
            className={cn("h-7 flex-1 rounded-full px-3 text-sm whitespace-nowrap sm:flex-none", mode === m.key ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>{m.label}</Button>
        ))}
        <DateRangePicker segment from={range.from} to={range.to} active={mode === "custom"} onChange={setCustom} />
      </div>
      <RangeStepper label={label} current={current || mode === "custom"} onPrev={() => step(-1)} onNext={() => step(1)} onToday={() => { setAt(""); setFrom(""); setTo(""); if (mode === "custom") setMode("week") }} />
    </div>
  )
  return { ...range, mode, control }
}
