"use client"

import { useState } from "react"
import { CalendarRangeIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { enUS, ja, th } from "react-day-picker/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fmtDate, parseDate, toDateStr } from "@/domain/dates"
import type { DateStr } from "@/domain/types"
import { tx, useUiLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const LOCALES = { th, en: enUS, ja } as const

/**
 * shadcn date-range picker (owner 2026-10-07): one chip that opens a two-month calendar — pick the first day, then
 * the last. Days after `max` can't be picked. Closes once both ends are chosen.
 */
export function DateRangePicker({ from, to, max, active, onChange, className, segment }: {
  from: DateStr; to: DateStr; max?: DateStr; active?: boolean
  onChange: (r: { from: DateStr; to: DateStr }) => void
  className?: string
  /** drawn as one segment of the period switch (PeriodControl) — always reads "กำหนดเอง" */
  segment?: boolean
}) {
  const lang = useUiLang((s) => s.lang)
  const [open, setOpen] = useState(false)
  // while picking, the half-chosen range lives here (the page only hears about complete ranges)
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)
  const selected: DateRange = draft ?? { from: parseDate(from), to: parseDate(to) }
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraft(undefined) }}>
      {segment ? (
        <PopoverTrigger render={<button type="button" aria-pressed={!!active} className={cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-sm", active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground", className)} />}>
          <CalendarRangeIcon className="size-3.5" />{tx("กำหนดเอง")}
        </PopoverTrigger>
      ) : (
        <PopoverTrigger render={<button type="button" className={cn("flex h-9 items-center gap-1.5 rounded-3xl border px-3 text-sm tabular-nums", active ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted", className)} />}>
          <CalendarRangeIcon className="size-3.5" />
          {active ? `${fmtDate(from, { year: from.slice(0, 4) !== to.slice(0, 4) })} – ${fmtDate(to, { year: true })}` : tx("กำหนดเอง")}
        </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          locale={LOCALES[lang]}
          defaultMonth={parseDate(from)}
          selected={selected}
          disabled={max ? { after: parseDate(max) } : undefined}
          onSelect={() => {}}
          // first click = first day, second click = last day (earlier than the first → starts over from it)
          onDayClick={(day) => {
            if (!draft?.from || draft.to || day < draft.from) { setDraft({ from: day, to: undefined }); return }
            onChange({ from: toDateStr(draft.from), to: toDateStr(day) })
            setDraft(undefined)
            setOpen(false)
          }}
        />
        <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">{draft?.from ? tx("เลือกวันสุดท้าย") : tx("เลือกวันแรก แล้วเลือกวันสุดท้าย · เทียบกับช่วงก่อนหน้าที่ยาวเท่ากัน")}</p>
      </PopoverContent>
    </Popover>
  )
}
