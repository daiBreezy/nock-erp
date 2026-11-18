"use client"

import { useState } from "react"
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NativeSelect } from "@/components/app/native-select"
import { DateRangePicker } from "@/components/app/date-range-picker"
import { addDays, fmtDate, monthShort, yearOf } from "@/domain/dates"
import { isToDateSpan, type CompareChoice, type Range, type ResolvedFilter, type SpanKey } from "@/domain/rules/reports"
import type { DateStr } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * Reports filter (owner 2026-11-18) — two buttons, not a row of chips (Stripe / Odoo / QuickBooks all do it so):
 *   [ period ▾ ]  [ compare with ▾ ]  ↺ reset
 * The period button opens one panel: the year, then to-date (MTD · QTD · YTD — the running year only), complete quarters,
 * complete months, the whole year (past years), custom dates. The compare list is named after the period (MoM / QoQ / YoY).
 * Opens on the running year, YTD, against the year before — every time.
 */
export interface FilterState { year: number; span: SpanKey; month: number; custom: Range; cmp: "auto" | CompareChoice }

export const initialFilter = (today: DateStr): FilterState => ({ year: Number(today.slice(0, 4)), span: "ytd", month: Number(today.slice(5, 7)) - 1, custom: { from: addDays(today, -29), to: today }, cmp: "auto" })

/** the year a period belongs to — the running year for a to-date stretch */
const baseYearOf = (s: FilterState, today: DateStr) => (isToDateSpan(s.span) ? Number(today.slice(0, 4)) : s.year)

/** what the state means as a comparison: "auto" = the year before; "prev" means nothing for a year (it IS the year before) */
export function compareOf(s: FilterState, today: DateStr): CompareChoice {
  const base = baseYearOf(s, today)
  if (s.cmp === "auto") return base - 1
  if (typeof s.cmp === "number") return s.cmp === base ? base - 1 : s.cmp
  if (s.cmp === "prev" && (s.span === "ytd" || s.span === "year")) return base - 1
  return s.cmp
}

/** short name of the period for the button and the cards */
export function spanName(s: FilterState): string {
  const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
  if (s.span === "mtd" || s.span === "qtd" || s.span === "ytd") return s.span.toUpperCase()
  if (s.span === "year") return tx("ทั้งปี")
  if (s.span === "month") return tx(MONTHS[s.month])
  if (s.span === "custom") return tx("กำหนดเอง")
  return s.span.toUpperCase()
}

function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <Button variant="ghost" size="inline" type="button" aria-pressed={on} disabled={disabled} onClick={onClick}
      className={cn("inline-flex h-8 min-w-12 items-center justify-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors",
        on ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground", disabled && "pointer-events-none opacity-40")}>
      {children}
    </Button>
  )
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="text-xs text-muted-foreground">{title}</p>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
)

export function ReportFilterBar({ today, years, state, onChange, filter }: {
  today: DateStr; years: number[]; state: FilterState; onChange: (next: FilterState) => void
  /** the resolved ranges — for the line that says which dates are on screen */
  filter: ResolvedFilter
}) {
  const [open, setOpen] = useState(false)
  const cur = Number(today.slice(0, 4)), curMonth = Number(today.slice(5, 7)) - 1, curQuarter = Math.floor(curMonth / 3)
  const running = state.year === cur
  const set = (patch: Partial<FilterState>, close = true) => { onChange({ ...state, ...patch }); if (close) setOpen(false) }
  const lo = Math.min(...years), hi = Math.max(...years)
  const compare = compareOf(state, today)
  const base = baseYearOf(state, today)

  /** moving to another year keeps the period when it still means something there, otherwise falls back to the whole year */
  const pickYear = (y: number) => {
    let span = state.span
    if (y === cur) { if (span === "year") span = "ytd"; else if (span === "month" && state.month >= curMonth) span = "ytd"; else if (/^q\d$/.test(span) && Number(span.slice(1)) - 1 >= curQuarter) span = "ytd" }
    else if (isToDateSpan(span)) span = "year"
    onChange({ ...state, year: y, span })
  }

  const periodText = state.span === "custom"
    ? `${fmtDate(filter.range.from, { year: filter.range.from.slice(0, 4) !== filter.range.to.slice(0, 4) })} – ${fmtDate(filter.range.to, { year: true })}`
    : `${spanName(state)} · ${yearOf(base)}`

  // the list is named after the period: MoM for a month, QoQ for a quarter, YoY for a year — in calendar units
  const prevName = state.span === "mtd" || state.span === "month" ? tx("เดือนก่อน (MoM)") : state.span === "qtd" || /^q\d$/.test(state.span) ? tx("ไตรมาสก่อน (QoQ)") : state.span === "custom" ? tx("ช่วงก่อนหน้า (ยาวเท่ากัน)") : null
  const yearChoices = [...new Set([...years, ...(typeof compare === "number" ? [compare] : [])])].filter((y) => y !== base).sort((a, b) => b - a)
  const compareOptions = [
    { value: "none", label: tx("ไม่เทียบ") },
    ...(prevName ? [{ value: "prev", label: prevName }] : []),
    ...yearChoices.map((y) => ({ value: String(y), label: y === base - 1 ? `${tx("ปีก่อน (YoY)")} · ${yearOf(y)}` : tx("ปี {0}", [yearOf(y)]) })),
  ]
  const isDefault = state.year === cur && state.span === "ytd" && state.cmp === "auto"
  const changed = !isDefault

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="ghost" size="inline" type="button" aria-label={tx("ช่วงเวลา")}
          // tonal (the same grey as every select) + outline = "a value is chosen" — the period always has one (the default counts).
          // No brand colour: a filter that is not the default is told by the reset button, not by a loud pill.
          className="flex h-9 items-center gap-2 rounded-3xl border border-border bg-input/50 px-3 text-sm font-medium tabular-nums hover:bg-input/70 aria-expanded:bg-input/70" />}>
          <CalendarIcon className="size-4" />{periodText}<ChevronDownIcon className="size-4 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,22rem)] gap-4">
          {/* year */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" type="button" aria-label={tx("ปีก่อนหน้า")} disabled={state.year <= lo} onClick={() => pickYear(state.year - 1)}><ChevronLeftIcon /></Button>
            <span className="text-base font-semibold tabular-nums">{yearOf(state.year)}</span>
            <Button variant="ghost" size="icon" type="button" aria-label={tx("ปีถัดไป")} disabled={state.year >= hi} onClick={() => pickYear(state.year + 1)}><ChevronRightIcon /></Button>
          </div>
          {running && (
            <Group title={tx("สะสมถึงวันนี้")}>
              {(["mtd", "qtd", "ytd"] as const).map((k) => <Chip key={k} on={state.span === k} onClick={() => set({ span: k })}>{k.toUpperCase()}</Chip>)}
            </Group>
          )}
          <Group title={tx("ไตรมาส")}>
            {(["q1", "q2", "q3", "q4"] as const).map((k, i) => <Chip key={k} on={state.span === k} disabled={running && i >= curQuarter} onClick={() => set({ span: k })}>{k.toUpperCase()}</Chip>)}
          </Group>
          <Group title={tx("เดือน")}>
            {Array.from({ length: 12 }, (_, m) => <Chip key={m} on={state.span === "month" && state.month === m} disabled={running && m >= curMonth} onClick={() => set({ span: "month", month: m })}>{monthShort(m)}</Chip>)}
          </Group>
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
            {!running && <Chip on={state.span === "year"} onClick={() => set({ span: "year" })}>{tx("ทั้งปี")}</Chip>}
            <DateRangePicker from={state.custom.from} to={state.custom.to} max={today} active={state.span === "custom"} onChange={(r) => set({ custom: r, span: "custom" })} />
          </div>
        </PopoverContent>
      </Popover>

      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {tx("เทียบกับ")}
        {/* tonal alone (quiet text) while nothing is compared · tonal + outline + medium dark text once a comparison is chosen (the default one counts) */}
        <NativeSelect className={cn("w-44", compare !== "none" && "[&_[data-slot=select-trigger]]:border-border [&_[data-slot=select-trigger]]:font-medium [&_[data-slot=select-trigger]]:text-foreground")} aria-label={tx("เทียบกับ")} value={String(compare)}
          onChange={(e) => set({ cmp: e.target.value === "none" || e.target.value === "prev" ? e.target.value : Number(e.target.value) }, false)} options={compareOptions} />
      </span>

      {changed && (
        <Button variant="ghost" size="sm" type="button" className="text-muted-foreground" onClick={() => onChange(initialFilter(today))}>
          <RotateCcwIcon /> {tx("รีเซ็ต")}
        </Button>
      )}

      {/* which dates are really on screen — there is no standard for a stretch still running, so say it */}
      <p className="basis-full text-xs text-muted-foreground tabular-nums">
        {tx("ดูอยู่")} {fmtDate(filter.range.from, { year: true })} – {fmtDate(filter.range.to, { year: true })}
        {filter.prev ? <> · {tx("เทียบ")} {fmtDate(filter.prev.from, { year: true })} – {fmtDate(filter.prev.to, { year: true })}</> : <> · {tx("ไม่เทียบ")}</>}
      </p>
    </div>
  )
}
