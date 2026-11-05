"use client"

import { useEffect, useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fromMinutes, toMinutes } from "@/domain/dates"
import { blocksOf, fmtLen, hourBlocks, isPartial, seatFromBlocks, seatTime, seatTotal, seatWindows, validateSeat } from "@/domain/rules/seats"
import type { Seat } from "@/domain/types"
import { cn } from "@/lib/utils"

type Row = { from: string; mins: string }

/**
 * Partial time (owner 2026-11-05, #54): which parts of a class the student attends — by hour chips (any set, e.g. hours
 * 1 + 3) or "กำหนดเอง" (any start time + minutes, as many windows as needed). One component for the three places that
 * set it: the invoice's course picker, the student panel and the session panel (the last two through SeatDialog).
 */
export function SeatHours({ classMinutes, start, value, onChange, onError, className }: { classMinutes: number; start: string; value: Seat | undefined; onChange: (seat: Seat | undefined) => void; /** tells the parent when the typed windows are not valid (to disable Save) */ onError?: (error: string | null) => void; className?: string }) {
  const seat = value ?? { offset: 0, minutes: classMinutes }
  const picked = blocksOf(seat, classMinutes)
  // custom when the saved windows don't line up with whole hour chips
  const [custom, setCustom] = useState(() => !!value && seatTotal(seatFromBlocksSafe(classMinutes, picked) ?? seat) !== seatTotal(seat))
  const [rows, setRows] = useState<Row[]>(() => seatWindows(seat).map((w) => ({ from: fromMinutes(toMinutes(start) + w.offset), mins: String(w.minutes) })))

  const toggle = (i: number) => {
    const next = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]
    if (!next.length) return // at least one hour
    const s = seatFromBlocks(classMinutes, next)
    onChange(s && isPartial(s, classMinutes) ? s : undefined)
  }

  const rowSeat = (rs: Row[]): { seat?: Seat; error?: string } => {
    const wins = rs.map((r) => ({ offset: toMinutes(r.from) - toMinutes(start), minutes: Number(r.mins) })).sort((a, b) => a.offset - b.offset)
    if (!wins.length) return { error: "เพิ่มอย่างน้อย 1 ช่วง" }
    const [first, ...more] = wins
    const s: Seat = more.length ? { ...first, more } : first
    const error = validateSeat(s, classMinutes)
    return error ? { error: error === "ช่วงเวลาไม่อยู่ในคาบ" ? `ต้องอยู่ในเวลาคาบ ${start}–${fromMinutes(toMinutes(start) + classMinutes)}` : error } : { seat: s }
  }
  const setRowsAndEmit = (rs: Row[]) => {
    setRows(rs)
    const { seat: s } = rowSeat(rs)
    if (s) onChange(isPartial(s, classMinutes) ? s : undefined)
  }
  const error = custom ? rowSeat(rows).error ?? null : null
  useEffect(() => { onError?.(error) }, [error, onError])

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {!custom && hourBlocks(classMinutes).map((b, i) => (
          <button key={b.offset} type="button" aria-pressed={picked.includes(i)} onClick={() => toggle(i)}
            className={cn("rounded-full border px-3 py-1 text-xs tabular-nums", picked.includes(i) ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
            ชม.ที่ {i + 1} · {seatTime(start, b)}
          </button>
        ))}
        <button type="button" aria-pressed={custom} onClick={() => { if (!custom) setRows(seatWindows(seat).map((w) => ({ from: fromMinutes(toMinutes(start) + w.offset), mins: String(w.minutes) }))); setCustom(!custom) }}
          className={cn("rounded-full border px-3 py-1 text-xs", custom ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}>
          {custom ? "กลับไปเลือกตามชั่วโมง" : "กำหนดเอง"}
        </button>
      </div>
      {custom && (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              เริ่ม <Input type="time" step={300} className="h-8 w-28" value={r.from} onChange={(e) => setRowsAndEmit(rows.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
              เรียน <Input type="number" min={5} step={5} className="h-8 w-20" value={r.mins} onChange={(e) => setRowsAndEmit(rows.map((x, j) => (j === i ? { ...x, mins: e.target.value } : x)))} /> นาที
              {rows.length > 1 && <Button size="icon-xs" variant="ghost" aria-label="เอาช่วงนี้ออก" onClick={() => setRowsAndEmit(rows.filter((_, j) => j !== i))}><XIcon /></Button>}
            </div>
          ))}
          <Button size="xs" variant="outline" onClick={() => setRows([...rows, { from: fromMinutes(toMinutes(start) + classMinutes - 30), mins: "30" }])}><PlusIcon /> เพิ่มช่วง</Button>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      )}
      {!error && <p className="text-xs text-muted-foreground">เรียน {fmtLen(seatTotal(seat))} · {seatTime(start, seat)}</p>}
    </div>
  )
}

const seatFromBlocksSafe = (classMinutes: number, picked: number[]) => (picked.length ? seatFromBlocks(classMinutes, picked) : null)
