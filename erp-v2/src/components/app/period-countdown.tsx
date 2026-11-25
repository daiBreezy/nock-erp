"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronRightIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PeriodImpactPanel, usePeriodImpact } from "@/components/settings/period-impact-panel"
import { toDateStr } from "@/domain/dates"
import { periodCountdown, type CountdownTone, type PeriodCountdown } from "@/domain/rules/period-impact"
import { useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** the current branch's upcoming Special Periods with their colour (owner 2026-11-25): gray 60–45 days · orange under 45 and not switched on · red under 30 */
export function usePeriodCountdown(opts?: { includeRunning?: boolean }): { items: PeriodCountdown[]; branchId: string } {
  const branchId = useStore((s) => s.branchId)
  const periods = useStore((s) => s.branches.find((b) => b.id === s.branchId)?.specialPeriods)
  const today = toDateStr(useNow(60_000))
  return { items: periodCountdown(periods, today, opts), branchId }
}

// owner 2026-11-25: gray / ORANGE / red countdown colours (the orange of "days already gone" in the date picker)
const TONE: Record<CountdownTone, { text: string; dot: string; chip: string }> = {
  gray: { text: "text-muted-foreground", dot: "bg-muted-foreground/60", chip: "bg-muted text-muted-foreground" },
  // eslint-disable-next-line no-restricted-syntax -- ds-exception: same orange
  orange: { text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500", chip: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  red: { text: "text-danger", dot: "bg-danger", chip: "bg-danger-soft text-danger" },
}

export const countdownText = (c: PeriodCountdown) => `${c.period.name} · ${c.running ? tx("กำลังอยู่ในช่วงนี้") : tx("เริ่มอีก {0} วัน", [c.days])}${c.opened ? "" : ` · ${tx("ยังไม่เปิด")}`}`

/**
 * Dashboard › ต้องรู้ไว้ — one row per period. owner 2026-11-25: the Impact Center is serious and takes a long time to work through, so it lives here too: the row says how many
 * students it hits and how many families have not had the message yet, and opens the Impact Center right away.
 */
function CountdownRow({ c, branchId }: { c: PeriodCountdown; branchId: string }) {
  const [open, setOpen] = useState(false)
  const impact = usePeriodImpact(c.period, branchId)
  const students = useStore((s) => s.students)
  const sent = useStore((s) => s.periodSent ?? {})
  const unsent = new Set(impact.students.map((id) => students.find((x) => x.id === id)?.familyId).filter((f): f is string => !!f && !sent[`${c.period.id}|${f}`])).size
  return (
    <li>
      <Button variant="row" size="inline" type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-muted/60">
        <span className={cn("size-1.5 shrink-0 rounded-full", TONE[c.tone].dot)} />
        <SunIcon className={cn("size-3.5 shrink-0", TONE[c.tone].text)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{tx("ช่วงพิเศษ")} {countdownText(c)}</span>
          {impact.students.length > 0 && <span className="block truncate text-xs text-muted-foreground">{tx("ผลกระทบ {0} คน", [impact.students.length])}{unsent > 0 ? ` · ${tx("ยังไม่ส่งข้อความ {0} บ้าน", [unsent])}` : ""}</span>}
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      {open && <PeriodImpactPanel period={c.period} branchId={branchId} open onClose={() => setOpen(false)} />}
    </li>
  )
}

export function CountdownRows({ items, branchId }: { items: PeriodCountdown[]; branchId: string }) {
  return <>{items.map((c) => <CountdownRow key={c.period.id} c={c} branchId={branchId} />)}</>
}

/** Calendar sub-header — a pill per period */
export function CountdownPills({ items, branchId }: { items: PeriodCountdown[]; branchId: string }) {
  return (
    <>
      {items.map((c) => (
        <Link key={c.period.id} href={`/settings/branches/${branchId}`} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE[c.tone].chip)}>
          <SunIcon className="size-3" /> {countdownText(c)}
        </Link>
      ))}
    </>
  )
}
