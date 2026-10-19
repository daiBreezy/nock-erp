"use client"

// Bus Route report (owner 2026-10-19 ref): the week's trips in numbers — passengers, how full the vans run, how long a
// trip takes and how often it is late (from the drivers' app) — overall, by van and by driver.
import { BusIcon, ClockIcon, GaugeIcon, UsersIcon } from "lucide-react"
import { Kpi } from "@/components/app/kpi"
import { KpiRow } from "@/components/app/page-layout"
import { nm } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { WeekRow } from "@/app/transport/page"

/** a trip counts as late when the driver's app shows it more than this behind */
const LATE_MIN = 5

interface Stat { key: string; label: string; sub?: string; trips: number; pax: number; seats: number; minutes: number; km: number; ran: number; late: number }
function stats(rows: WeekRow[], keyOf: (r: WeekRow) => [string, string, string?]) {
  const m = new Map<string, Stat>()
  for (const r of rows) {
    const [key, label, sub] = keyOf(r)
    const s = m.get(key) ?? { key, label, sub, trips: 0, pax: 0, seats: 0, minutes: 0, km: 0, ran: 0, late: 0 }
    s.trips++; s.pax += r.trip.used; s.seats += r.trip.seats; s.minutes += r.trip.minutes; s.km += r.trip.km
    if (r.trip.startedAt) { s.ran++; if ((r.trip.late ?? 0) > LATE_MIN) s.late++ }
    m.set(key, s)
  }
  return [...m.values()].sort((a, b) => b.trips - a.trips)
}
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

function StatTable({ title, list }: { title: string; list: Stat[] }) {
  return (
    <div className="rounded-3xl border bg-card p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="pb-2 font-normal" /><th className="pb-2 text-right font-normal">เที่ยว</th><th className="pb-2 text-right font-normal">ผู้โดยสาร</th><th className="pb-2 pl-4 font-normal">ที่นั่งใช้</th><th className="pb-2 text-right font-normal">ระยะทาง</th><th className="pb-2 text-right font-normal">เฉลี่ย</th><th className="pb-2 text-right font-normal">ตรงเวลา</th></tr></thead>
        <tbody className="divide-y">
          {list.map((s) => {
            const use = pct(s.pax, s.seats)
            return (
              <tr key={s.key}>
                <td className="py-2"><span className="block font-medium">{s.label}</span>{s.sub && <span className="block text-xs text-muted-foreground">{s.sub}</span>}</td>
                <td className="py-2 text-right tabular-nums">{s.trips}</td>
                <td className="py-2 text-right tabular-nums">{s.pax}</td>
                <td className="py-2 pl-4"><span className="flex items-center gap-2"><span className="h-2 w-24 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", use > 100 ? "bg-red-500" : "bg-primary")} style={{ width: `${Math.min(100, use)}%` }} /></span><span className="tabular-nums text-xs">{`${use}%`}</span></span></td>
                <td className="py-2 text-right tabular-nums">{`${Math.round(s.km)} กม.`}</td>
                <td className="py-2 text-right tabular-nums">{`${Math.round(s.minutes / s.trips)} นาที`}</td>
                <td className="py-2 text-right tabular-nums">{s.ran ? `${s.ran - s.late}/${s.ran}` : "—"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** the report's numbers — in the page's KPI row when the Report tab is open (one KPI row per page) */
export function TransportReportKpis({ rows }: { rows: WeekRow[] }) {
  const pax = rows.reduce((n, r) => n + r.trip.used, 0), seats = rows.reduce((n, r) => n + r.trip.seats, 0)
  const ran = rows.filter((r) => r.trip.startedAt), late = ran.filter((r) => (r.trip.late ?? 0) > LATE_MIN)
  const minutes = rows.length ? Math.round(rows.reduce((n, r) => n + r.trip.minutes, 0) / rows.length) : 0
  return (
    <KpiRow>
      <Kpi icon={UsersIcon} label="ผู้โดยสารรวม" value={pax} sub={`${rows.length} เที่ยว · เฉลี่ย ${rows.length ? (pax / rows.length).toFixed(1) : 0} คน/เที่ยว`} tone="sky" />
      <Kpi icon={GaugeIcon} label="ที่นั่งใช้" value={`${pct(pax, seats)}%`} sub={`${pax} จาก ${seats} ที่นั่ง`} tone="amber" />
      <Kpi icon={BusIcon} label="เวลาต่อเที่ยว" value={`${minutes} นาที`} sub="เฉลี่ยตามแผน" tone="violet" />
      <Kpi icon={ClockIcon} label="ตรงเวลา" value={ran.length ? `${pct(ran.length - late.length, ran.length)}%` : "—"} sub={ran.length ? `วิ่งแล้ว ${ran.length} · สาย ${late.length}` : "ยังไม่มีเที่ยวที่วิ่งผ่านแอปคนขับ"} tone="emerald" />
    </KpiRow>
  )
}

export function TransportReport({ rows }: { rows: WeekRow[] }) {
  if (!rows.length) return <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">สัปดาห์นี้ยังไม่มีเที่ยวรถ</p>
  const multi = new Set(rows.map((r) => r.branch.id)).size > 1
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <StatTable title="ตามรถ" list={stats(rows, (r) => [r.trip.vehicle?.id ?? "-", r.trip.vehicle?.name ?? "ยังไม่ได้เลือกรถ", [r.trip.vehicle?.plate, multi ? nm(r.branch.name) : ""].filter(Boolean).join(" · ") || undefined])} />
      <StatTable title="ตามคนขับ" list={stats(rows, (r) => [r.trip.driver?.id ?? r.trip.driver?.nickname ?? "-", r.trip.driver?.nickname ?? "ยังไม่มีคนขับ", r.trip.driver?.vendor ? "Outsource" : r.trip.driver?.name])} />
    </div>
  )
}
