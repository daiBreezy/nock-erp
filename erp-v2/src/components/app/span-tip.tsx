"use client"

import { fmtDate } from "@/domain/dates"
import type { DateStr } from "@/domain/types"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { tx } from "@/lib/i18n"
import { fmtSpan, fmtSpanFull } from "@/lib/span"
import { cn } from "@/lib/utils"

/**
 * owner 2026-11-25: a day count in staff screens is COMPACT ("อีก 40 ว") and the full words show on hover ("อีก 40 วัน" · or "2 เดือน 10 วัน", with the date when known).
 * `phrase` is the wording around the number, e.g. "อีก {0}" · "เหลือ {0}" · "เริ่มอีก {0}" · "เลย {0}" · "{0}ที่แล้ว".
 */
export function SpanTip({ days, phrase, date, className }: { days: number; phrase: string; date?: DateStr; className?: string }) {
  return (
    <HoverCard>
      <HoverCardTrigger render={<span className={cn("cursor-default", className)} />}>{tx(phrase, [fmtSpan(days)])}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-auto max-w-64 px-3 py-2 text-xs">
        {tx(phrase, [fmtSpanFull(days)])}{date ? ` · ${fmtDate(date, { weekday: true, year: true })}` : ""}
      </HoverCardContent>
    </HoverCard>
  )
}
