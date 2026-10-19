"use client"

// Bus Route calendar (owner 2026-10-19 ref): the week by hour — each trip a block from leaving to back, coloured by
// van. Trips at the same time sit side by side. Click a block to open it in the table.
import { fmtDate, toMinutes, weekdayShort } from "@/domain/dates"
import { cn } from "@/lib/utils"
import type { WeekRow } from "@/app/transport/page"
import { TripTypeChip, vanTone } from "./labels"

const HOUR_PX = 80

export function TransportCalendar({ rows, days, today, onPick }: { rows: WeekRow[]; days: string[]; today: string; onPick: (tripId: string) => void }) {
  if (!rows.length) return <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">สัปดาห์นี้ไม่มีเที่ยวรถตามตัวกรอง</p>
  const span = (r: WeekRow) => { const a = toMinutes(r.trip.depart), b = Math.max(toMinutes(r.trip.finish), a + 20); return [a, b] as const }
  const from = Math.floor(Math.min(...rows.map((r) => span(r)[0])) / 60) * 60
  const to = Math.ceil(Math.max(...rows.map((r) => span(r)[1])) / 60) * 60
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from / 60 + i)
  const height = (to - from) / 60 * HOUR_PX
  return (
    <div className="overflow-x-auto rounded-3xl border bg-card">
      <div className={cn("grid", days.length > 1 && "min-w-[56rem]")} style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b" />
        {days.map((d, i) => (
          <div key={d} className={cn("border-b border-l px-2 py-2 text-center text-sm font-medium", d === today && "text-primary")}>{days.length === 1 ? fmtDate(d, { weekday: true }) : `${weekdayShort((i + 1) % 7)} ${fmtDate(d)}`}</div>
        ))}
        <div className="relative" style={{ height }}>
          {hours.map((h, i) => <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground tabular-nums" style={{ top: i * HOUR_PX }}>{i ? `${String(h).padStart(2, "0")}:00` : ""}</span>)}
        </div>
        {days.map((d) => {
          const list = rows.filter((r) => r.trip.date === d).sort((a, b) => span(a)[0] - span(b)[0])
          // lanes: a trip goes in the first lane free at its start
          const ends: number[] = []
          const lane = new Map<string, number>()
          for (const r of list) {
            const [a, b] = span(r)
            let l = ends.findIndex((e) => e <= a)
            if (l < 0) { l = ends.length; ends.push(b) } else ends[l] = b
            lane.set(r.trip.id, l)
          }
          const lanes = Math.max(1, ends.length)
          return (
            <div key={d} className={cn("relative border-l", d === today && "bg-primary/[0.03]")} style={{ height }}>
              {hours.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-dashed" style={{ top: i * HOUR_PX }} />)}
              {list.map((r) => {
                const [a, b] = span(r)
                const vi = Math.max(0, (r.branch.vehicles ?? []).findIndex((v) => v.id === r.trip.vehicle?.id))
                const l = lane.get(r.trip.id)!
                const off = r.trip.status === "cancelled"
                return (
                  <button key={r.trip.id} type="button" onClick={() => onPick(r.trip.id)} title={`${r.trip.depart} → ${r.trip.finish}`}
                    className={cn("absolute overflow-hidden rounded-xl p-1.5 text-left text-xs shadow-sm ring-1 ring-black/5 hover:ring-primary", vanTone(vi), off && "opacity-40 line-through")}
                    style={{ top: (a - from) / 60 * HOUR_PX + 1, height: Math.max(58, (b - a) / 60 * HOUR_PX - 2), left: `calc(${(l / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}>
                    <span className="flex justify-between gap-1 truncate font-semibold tabular-nums"><span>{r.trip.depart}</span><span className="font-normal">{`${r.trip.used}/${r.trip.seats}`}</span></span>
                    <span className="block truncate">{r.trip.vehicle?.name ?? "—"}</span>
                    <span className="mt-0.5 block"><TripTypeChip kind={r.trip.round.kind} short /></span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
