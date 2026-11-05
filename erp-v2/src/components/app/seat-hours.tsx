"use client"

import { blocksOf, fmtLen, hourBlocks, isPartial, seatFromBlocks, seatTime, seatTotal } from "@/domain/rules/seats"
import type { Seat } from "@/domain/types"
import { cn } from "@/lib/utils"

/**
 * Partial time (owner 2026-11-05, #54): pick which hours of a class the student attends — any set, e.g. hours 1 + 3 of a
 * 3-hour class. One component for the three places that set it: the invoice's course picker, the student panel and the
 * session panel (the last two through SeatDialog).
 */
export function SeatHours({ classMinutes, start, value, onChange, className }: { classMinutes: number; start: string; value: Seat | undefined; onChange: (seat: Seat | undefined) => void; className?: string }) {
  const seat = value ?? { offset: 0, minutes: classMinutes }
  const picked = blocksOf(seat, classMinutes)
  const toggle = (i: number) => {
    const next = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]
    if (!next.length) return // at least one hour
    const s = seatFromBlocks(classMinutes, next)
    onChange(s && isPartial(s, classMinutes) ? s : undefined)
  }
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap gap-1.5">
        {hourBlocks(classMinutes).map((b, i) => (
          <button key={b.offset} type="button" aria-pressed={picked.includes(i)} onClick={() => toggle(i)}
            className={cn("rounded-full border px-3 py-1 text-xs tabular-nums", picked.includes(i) ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
            ชม.ที่ {i + 1} · {seatTime(start, b)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">เรียน {fmtLen(seatTotal(seat))} · {seatTime(start, seat)}</p>
    </div>
  )
}
