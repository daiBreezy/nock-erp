"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { CalendarRangeIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { enUS, ja, th } from "react-day-picker/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { fmtDate, parseDate, toDateStr } from "@/domain/dates"
import type { DateStr } from "@/domain/types"
import { tx, useUiLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const LOCALES = { th, en: enUS, ja } as const

/**
 * shadcn date-range picker (owner 2026-10-07): one chip that opens a two-month calendar — pick the first day, then
 * the last. Days after `max` can't be picked. Closes once both ends are chosen.
 */
export function DateRangePicker({ from, to, min, max, active, onChange, className, segment, plain }: {
  from: DateStr; to: DateStr; min?: DateStr; max?: DateStr; active?: boolean
  /** owner 2026-10-22: one neutral chip always showing the range (e.g. the Test / Trial send dialog) */
  plain?: boolean
  onChange: (r: { from: DateStr; to: DateStr }) => void
  className?: string
  /** drawn as one segment of the period switch (PeriodControl) — always reads "กำหนดเอง" */
  segment?: boolean
}) {
  const lang = useUiLang((s) => s.lang)
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  // while picking, the half-chosen range lives here (the page only hears about complete ranges)
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)
  const selected: DateRange = draft ?? { from: parseDate(from), to: parseDate(to) }
  const close = () => { setOpen(false); setDraft(undefined) }
  const onDayClick = (day: Date) => {
    if (!draft?.from || draft.to || day < draft.from) { setDraft({ from: day, to: undefined }); return }
    onChange({ from: toDateStr(draft.from), to: toDateStr(day) })
    close()
  }
  const disabled = [...(max ? [{ after: parseDate(max) }] : []), ...(min ? [{ before: parseDate(min) }] : [])]
  const triggerClass = segment
    ? cn("flex h-7 items-center gap-1.5 rounded-full px-3 text-sm", active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground", className)
    : cn("flex h-9 items-center gap-1.5 rounded-3xl border px-3 text-sm tabular-nums", plain ? "bg-background font-medium hover:bg-muted" : active ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted", className)
  const triggerInner = <><CalendarRangeIcon className="size-3.5" />{segment ? tx("กำหนดเอง") : active || plain ? `${fmtDate(from, { year: from.slice(0, 4) !== to.slice(0, 4) })} – ${fmtDate(to, { year: true })}` : tx("กำหนดเอง")}</>

  // phones: a single month centred on the screen, 24px gutter each side, cells filling the full width, no footer
  if (isMobile) {
    return (
      <>
        <button type="button" aria-pressed={!!active} className={triggerClass} onClick={() => setOpen(true)}>{triggerInner}</button>
        {open && createPortal(
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={close}>
            <div className="w-full rounded-3xl bg-popover p-2 shadow-xl ring-1 ring-foreground/10" onClick={(e) => e.stopPropagation()}>
              <Calendar mode="range" numberOfMonths={1} locale={LOCALES[lang]} defaultMonth={parseDate(from)} selected={selected} disabled={disabled}
                className="w-full" classNames={{ root: "w-full" }} onSelect={() => {}} onDayClick={onDayClick} />
            </div>
          </div>, document.body)}
      </>
    )
  }
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraft(undefined) }}>
      <PopoverTrigger render={<button type="button" aria-pressed={!!active} className={triggerClass} />}>{triggerInner}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar mode="range" numberOfMonths={2} locale={LOCALES[lang]} defaultMonth={parseDate(from)} selected={selected} disabled={disabled} onSelect={() => {}} onDayClick={onDayClick} />
        <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">{draft?.from ? tx("เลือกวันสุดท้าย") : tx("เลือกวันแรก แล้วเลือกวันสุดท้าย · เทียบกับช่วงก่อนหน้าที่ยาวเท่ากัน")}</p>
      </PopoverContent>
    </Popover>
  )
}
