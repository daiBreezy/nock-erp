"use client"

// Dashboard Pulse zone (owner 2026-11-10): the branch's rhythm as VISUALS, not repeated numbers — a revenue trend,
// an attendance donut, a new-vs-lost bar, and leads by channel. Pure view; page.tsx shapes the data and reuses the
// chart primitives from components/reports/charts.tsx.
import { Delta, DonutLegend, fmtNum, TopList } from "@/components/reports/charts"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashCard } from "./box"
import { fmtMoney } from "@/domain/dates"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface PulseData {
  periodLabel: string
  revByDay: { d: string; label: string; total: number }[]
  revTotal: number
  revDelta: number | null
  attendance: { present: number; leave: number; absent: number }
  attendanceRate: number | null
  newCount: number
  lostCount: number
  leadsBySource: { label: string; value: number }[]
  today: string
}

export function Pulse({ data }: { data: PulseData }) {
  const { periodLabel, revByDay, revTotal, revDelta, attendance, attendanceRate, newCount, lostCount, leadsBySource, today } = data
  const net = newCount - lostCount
  const attTotal = attendance.present + attendance.leave + attendance.absent
  return (
    <section className="border-t pt-3">
      <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{tx("ภาพรวมสาขา · จังหวะของสาขา")}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard>
          <CardHeader className="pb-2"><CardTitle className="flex items-baseline justify-between text-sm font-medium">{tx("รายรับ · {0}", [periodLabel])}<span className="flex items-center gap-1 text-xs text-muted-foreground"><Delta value={revDelta} /></span></CardTitle></CardHeader>
          <CardContent>
            <p className="mb-1 text-lg font-semibold tabular-nums">{fmtMoney(revTotal)}</p>
            <RevBars rows={revByDay} today={today} />
          </CardContent>
        </DashCard>

        <DashCard>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{tx("มาเรียน · {0}", [periodLabel])}</CardTitle></CardHeader>
          <CardContent>
            {attTotal === 0
              ? <p className="py-6 text-center text-sm text-muted-foreground">{tx("ยังไม่มีการเช็คชื่อ")}</p>
              : <DonutLegend title="" stack center={attendanceRate === null ? "—" : `${Math.round(attendanceRate * 100)}%`} sub={tx("มาเรียน")}
                  colors={["#1D9E75", "#EF9F27", "#E24B4A"]}
                  parts={[{ label: tx("มา"), value: attendance.present }, { label: tx("ลา"), value: attendance.leave }, { label: tx("ขาด"), value: attendance.absent }]} />}
          </CardContent>
        </DashCard>

        <DashCard>
          <CardHeader className="pb-2"><CardTitle className="flex items-baseline justify-between text-sm font-medium">{tx("เข้า − ออก")}<span className={cn("text-xs tabular-nums", net >= 0 ? "text-emerald-600" : "text-red-600")}>{tx("สุทธิ")} {net >= 0 ? "+" : ""}{net}</span></CardTitle></CardHeader>
          <CardContent><InOutBars inCount={newCount} outCount={lostCount} /></CardContent>
        </DashCard>

        <DashCard>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{tx("ลีดตามช่องทาง")}</CardTitle></CardHeader>
          <CardContent>
            {leadsBySource.length === 0
              ? <p className="py-6 text-center text-sm text-muted-foreground">{tx("ยังไม่มีลีดใหม่")}</p>
              : <TopList rows={leadsBySource} top={5} color="var(--color-primary)" />}
          </CardContent>
        </DashCard>
      </div>
    </section>
  )
}

/** daily revenue bars; today's bar in the brand colour */
function RevBars({ rows, today }: { rows: { d: string; label: string; total: number }[]; today: string }) {
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <>
      <div className="flex h-16 items-end gap-1">
        {rows.map((r) => (
          <div key={r.d} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${r.label} · ${fmtNum(r.total)}`}>
            <div className={cn("w-full rounded-t", r.total ? (r.d === today ? "bg-primary" : "bg-primary/35") : "bg-muted")} style={{ height: `${Math.max(3, (r.total / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1 text-[10px] text-muted-foreground">
        {rows.map((r) => <span key={r.d} className="min-w-0 flex-1 truncate text-center">{r.label}</span>)}
      </div>
    </>
  )
}

/** two stacked bars — in (green) vs out (red) */
function InOutBars({ inCount, outCount }: { inCount: number; outCount: number }) {
  const max = Math.max(1, inCount, outCount)
  const rows = [{ label: tx("เข้า"), value: inCount, color: "#1D9E75" }, { label: tx("ออก"), value: outCount, color: "#E24B4A" }]
  return (
    <div className="space-y-3 py-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-sm">
          <span className="w-10 shrink-0 text-xs text-muted-foreground">{r.label}</span>
          <span className="h-3 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></span>
          <span className="w-6 shrink-0 text-right font-medium tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
