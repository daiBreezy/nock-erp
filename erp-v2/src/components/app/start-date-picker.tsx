"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { CalendarIcon } from "lucide-react"
import { enUS, ja, th } from "react-day-picker/locale"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { fmtDate, parseDate, toDateStr } from "@/domain/dates"
import type { DateStr, Holiday } from "@/domain/types"
import { tx, useUiLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const LOCALES = { th, en: enUS, ja } as const

/**
 * Start-date picker (owner 2026-11-09): a calendar that says what each day is — today is ringed, days already gone are
 * light orange (pickable, but they need a reason — a retroactive invoice), company holidays have their own colour and
 * name themselves on hover. `closed` = the holidays that close THIS branch's brand (domain closesBranch).
 */
export function StartDatePicker({ value, onChange, today, closed, className }: {
  value: DateStr; onChange: (d: DateStr) => void; today: DateStr; closed: Pick<Holiday, "date" | "name">[]; className?: string
}) {
  const lang = useUiLang((s) => s.lang)
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const names = new Map<DateStr, string>()
  for (const h of closed) names.set(h.date, names.get(h.date) ? `${names.get(h.date)} · ${h.name}` : h.name)
  const holidayName = names.get(value)
  const past = value < today
  const pick = (d: Date) => { onChange(toDateStr(d)); setOpen(false) }
  const isSel = (d: Date) => toDateStr(d) === value
  const calendar = (
    <Calendar mode="single" locale={LOCALES[lang]} defaultMonth={parseDate(value)} selected={parseDate(value)} onSelect={(d) => d && pick(d)}
      className="w-full" classNames={{ root: "w-full" }}
      modifiers={{
        isToday: (d) => toDateStr(d) === today && !isSel(d),
        gone: (d) => toDateStr(d) < today && !isSel(d) && !names.has(toDateStr(d)),
        shut: (d) => names.has(toDateStr(d)) && !isSel(d),
      }}
      modifiersClassNames={{
        isToday: "[&_button]:font-bold [&_button]:ring-2 [&_button]:ring-primary [&_button]:ring-inset",
        // days already gone: orange TEXT only, no background (owner 2026-11-09)
        // eslint-disable-next-line no-restricted-syntax -- ds-exception: owner 2026-11-09: days already gone are orange text only
        gone: "[&_button]:text-orange-600 dark:[&_button]:text-orange-400",
        shut: "[&_button]:bg-warning-soft [&_button]:text-warning-ink",
      }}
      components={{
        DayButton: (props) => {
          const name = names.get(toDateStr(props.day.date))
          const btn = <CalendarDayButton locale={LOCALES[lang]} {...props} />
          if (!name) return btn
          return (
            <HoverCard>
              <HoverCardTrigger render={<span className="block" />}>{btn}</HoverCardTrigger>
              <HoverCardContent className="w-auto max-w-56 px-3 py-2 text-xs"><b className="text-warning-ink">{tx("วันหยุดบริษัท")}</b><br />{name}</HoverCardContent>
            </HoverCard>
          )
        },
      }} />
  )
  const legend = (
    <div className="space-y-1 border-t px-3 py-2 text-2xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1"><i className="size-3 rounded-full ring-2 ring-primary ring-inset" />{tx("วันนี้")}</span>
        {/* eslint-disable-next-line no-restricted-syntax -- ds-exception: same orange as the gone days (legend) */}
        <span className="flex items-center gap-1"><b className="w-3 text-center text-orange-600">1</b>{tx("ผ่านไปแล้ว — เลือกได้ แต่ต้องใส่เหตุผล")}</span>
        <span className="flex items-center gap-1"><i className="size-3 rounded-full bg-warning/40" />{tx("วันหยุดบริษัท")}</span>
      </div>
      {holidayName && <p className="text-warning-ink">{tx("วันที่เลือกเป็นวันหยุดบริษัท — ระบบข้ามไปคาบถัดไปให้")}</p>}
    </div>
  )
  const trigger = cn("flex h-9 w-full items-center gap-2 rounded-3xl border px-3 text-sm tabular-nums",
    // eslint-disable-next-line no-restricted-syntax -- ds-exception: same orange as the gone days
    holidayName ? "border-warning/40 bg-warning-soft/60 text-warning-ink" : past ? "border-orange-300 bg-orange-50 text-orange-900" : "bg-card hover:bg-muted", className)
  const label = <><CalendarIcon className="size-4 shrink-0" /><span className="truncate">{fmtDate(value, { weekday: true, year: true })}</span>{past && <span className="ml-auto shrink-0 text-xs">{tx("ย้อนหลัง")}</span>}</>

  if (isMobile) {
    return (
      <>
        <Button variant="ghost" size="inline" type="button" className={trigger} onClick={() => setOpen(true)}>{label}</Button>
        {open && createPortal(
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={() => setOpen(false)}>
            <div className="w-full rounded-3xl bg-popover p-2 shadow-xl ring-1 ring-foreground/10" onClick={(e) => e.stopPropagation()}>{calendar}{legend}</div>
          </div>, document.body)}
      </>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="inline" type="button" className={trigger} />}>{label}</PopoverTrigger>
      {/* as wide as the field it opens from — the days fill the popup, no empty strip on the right */}
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-0">{calendar}{legend}</PopoverContent>
    </Popover>
  )
}
