"use client"

import { useState } from "react"
import { monthShort, yearOf } from "@/domain/dates"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Segmented } from "@/components/app/page-layout"
import { fmtNum, fmtPct, InfoTip } from "./charts"

/**
 * The last 12 months under the students' / courses' numbers (owner 2026-10-21) — one chart per section, switched with
 * the buttons in its header (picked: the view on the left, its legend on the right):
 *  - stock = what's there at each month's end (Active + Pause)
 *  - flow  = what came in (new, came back & bought) above the line, what left (Lost) below it, Net as a line
 *  - rate  = Churn rate and renewal per month
 */
export type TrendView = "stock" | "flow" | "rate"
export type TrendRow = {
  key: string; month: number
  active: number; paused: number; newCount: number; returning: number; lost: number; back: number
  churn: number | null; renewal: number | null
}

const C = { active: "#2a78d6", paused: "#f0b429", new: "#1baf7a", returning: "#7c5cd6", lost: "#e34948", net: "var(--color-foreground)", churn: "#e34948", renewal: "#2a78d6" }

export const TREND_TITLE: Record<TrendView, string> = { stock: "ยอดคงเหลือ", flow: "เข้า–ออก", rate: "อัตรา" }

export function TrendChart({ rows, view, onView, unit, renewalLabel }: { rows: TrendRow[]; view: TrendView; onView: (v: TrendView) => void; unit: "student" | "course"; renewalLabel: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const at = hover ?? rows.length - 1
  const r = rows[at]
  const n = rows.length
  const x = (i: number) => ((i + 0.5) / n) * 100
  const label = (row: TrendRow) => `${monthShort(row.month)} ${String(yearOf(Number(row.key.slice(0, 4)))).slice(-2)}`

  // ---- scales ----
  const stockMax = Math.max(1, ...rows.map((v) => v.active + v.paused))
  const upMax = Math.max(1, ...rows.map((v) => v.newCount + v.returning))
  const downMax = Math.max(1, ...rows.map((v) => v.lost))
  const flowSpan = upMax + downMax
  const zero = (upMax / flowSpan) * 100 // % from the top
  const yFlow = (v: number) => zero - (v / flowSpan) * 100
  const yRate = (v: number) => 100 - v * 100

  const what = unit === "student" ? tx("นักเรียน") : tx("คอร์ส")
  const readout: { color: string; label: string; value: string; line?: boolean }[] =
    view === "stock" ? [
      { color: C.active, label: "Active", value: fmtNum(r.active) },
      { color: C.paused, label: unit === "student" ? "Pause" : tx("คอร์สที่พัก"), value: fmtNum(r.paused) },
      { color: "transparent", label: unit === "student" ? "Returning Student" : "Returning Course", value: fmtNum(r.back) },
    ] : view === "flow" ? [
      { color: C.new, label: tx("ใหม่"), value: `+${r.newCount}` },
      { color: C.returning, label: tx("กลับมาซื้อใหม่"), value: `+${r.returning}` },
      { color: C.lost, label: "Lost", value: `−${r.lost}` },
      { color: C.net, label: "Net", value: (() => { const v = r.newCount + r.returning - r.lost; return `${v > 0 ? "+" : ""}${v}` })(), line: true },
    ] : [
      { color: C.churn, label: "Churn rate", value: fmtPct(r.churn), line: true },
      { color: C.renewal, label: renewalLabel, value: fmtPct(r.renewal), line: true },
    ]

  const ticks = view === "stock" ? [stockMax, Math.round(stockMax / 2), 0].map((v) => ({ y: 100 - (v / stockMax) * 100, t: fmtNum(v) }))
    : view === "flow" ? [{ y: 0, t: `+${upMax}` }, { y: zero, t: "0" }, { y: 100, t: `−${downMax}` }]
      : [{ y: 0, t: "100%" }, { y: 50, t: "50%" }, { y: 100, t: "0%" }]

  // owner 2026-10-21: the lines read soft — a smooth curve through the months (gaps where a month has no value)
  const linePath = (vals: (number | null)[], y: (v: number) => number) => smooth(vals.map((v, i) => (v === null ? null : [x(i), y(v)] as [number, number])))

  return (
    <div className="rounded-2xl border p-3 sm:p-4">
      {/* the month being read — the hovered one, else the latest */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Segmented label={tx("กราฟ")} value={view} onChange={onView} options={(["stock", "flow", "rate"] as const).map((v) => ({ value: v, label: tx(TREND_TITLE[v]) }))} />
        <p className="flex items-center gap-1 text-sm text-muted-foreground">{what} · {label(r)}{hover === null ? ` (${tx("เดือนล่าสุด")})` : ""}<InfoTip text={tx(HOW[view])} /></p>
      </div>
      {/* owner 2026-10-21: the legend as chips — colour, name and the month's value */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {readout.map((p) => (
          <span key={p.label} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted/70 px-2.5 text-xs text-muted-foreground">
            {p.color !== "transparent" && <span className={cn("shrink-0", p.line ? "h-0.5 w-3 rounded-full" : "size-2 rounded-full")} style={{ background: p.color }} />}
            {p.label} <span className="font-semibold text-foreground tabular-nums">{p.value}</span>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        {/* y axis */}
        <div className="relative h-48 w-9 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
          {ticks.map((t) => <span key={t.t + t.y} className="absolute right-0 -translate-y-1/2" style={{ top: `${t.y}%` }}>{t.t}</span>)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48" onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => <div key={t.t + t.y} className={cn("absolute inset-x-0 border-t", t.t === "0" && view === "flow" ? "border-foreground/30" : "border-dashed border-foreground/10")} style={{ top: `${t.y}%` }} />)}
            <div className="absolute inset-0 flex">
              {rows.map((v, i) => (
                <div key={v.key} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}
                  className={cn("relative h-full min-w-0 flex-1 rounded-md transition-colors", i === at && "bg-muted/70")}>
                  {view === "stock" && (
                    <div className="absolute inset-x-[18%] bottom-0 flex flex-col justify-end" style={{ height: `${((v.active + v.paused) / stockMax) * 100}%` }}>
                      <div className="rounded-t-sm" style={{ background: C.paused, flex: v.paused }} />
                      <div className={cn(!v.paused && "rounded-t-sm")} style={{ background: C.active, flex: v.active }} />
                    </div>
                  )}
                  {view === "flow" && <>
                    <div className="absolute inset-x-[18%] flex flex-col" style={{ top: `${yFlow(v.newCount + v.returning)}%`, height: `${((v.newCount + v.returning) / flowSpan) * 100}%` }}>
                      <div className="rounded-t-sm" style={{ background: C.returning, flex: v.returning }} />
                      <div className={cn(!v.returning && "rounded-t-sm")} style={{ background: C.new, flex: v.newCount }} />
                    </div>
                    <div className="absolute inset-x-[18%] rounded-b-sm" style={{ top: `${zero}%`, height: `${(v.lost / flowSpan) * 100}%`, background: C.lost }} />
                  </>}
                </div>
              ))}
            </div>
            {/* lines on top: Net (flow) · Churn + renewal (rate) */}
            {view !== "stock" && (
              <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {view === "flow" && <path d={linePath(rows.map((v) => v.newCount + v.returning - v.lost), yFlow)} fill="none" stroke={C.net} strokeOpacity={0.55} strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
                {view === "rate" && <>
                  <path d={linePath(rows.map((v) => v.churn), yRate)} fill="none" stroke={C.churn} strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <path d={linePath(rows.map((v) => v.renewal), yRate)} fill="none" stroke={C.renewal} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </>}
              </svg>
            )}
            {/* points as dots (not stretched with the svg) */}
            {view === "flow" && rows.map((v, i) => <Dot key={v.key} x={x(i)} y={yFlow(v.newCount + v.returning - v.lost)} color={C.net} on={i === at} />)}
            {view === "rate" && rows.flatMap((v, i) => [
              v.churn !== null && <Dot key={`c${v.key}`} x={x(i)} y={yRate(v.churn)} color={C.churn} on={i === at} />,
              v.renewal !== null && <Dot key={`r${v.key}`} x={x(i)} y={yRate(v.renewal)} color={C.renewal} on={i === at} />,
            ])}
          </div>
          <div className="mt-1 flex text-center text-[10px] text-muted-foreground">
            {rows.map((v, i) => <span key={v.key} className={cn("flex-1 truncate", i === at ? "font-semibold text-foreground" : (n - 1 - i) % 2 && "max-sm:invisible")}>{monthShort(v.month)}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

/** a point only on the month being read (owner 2026-10-21: a dot on every month looked cluttered) */
function Dot({ x, y, color, on }: { x: number; y: number; color: string; on: boolean }) {
  if (!on) return null
  return <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card" style={{ left: `${x}%`, top: `${y}%`, background: color }} />
}

/** a smooth line through the points (Catmull-Rom as cubic Béziers); a null breaks the line */
function smooth(pts: ([number, number] | null)[]) {
  const runs: [number, number][][] = [[]]
  for (const p of pts) { if (p) runs[runs.length - 1].push(p); else if (runs[runs.length - 1].length) runs.push([]) }
  return runs.filter((r) => r.length).map((r) => r.map((p, i) => {
    if (!i) return `M${p[0]},${p[1]}`
    const p0 = r[i - 2] ?? r[i - 1], p1 = r[i - 1], p3 = r[i + 1] ?? p
    const c1 = [p1[0] + (p[0] - p0[0]) / 6, p1[1] + (p[1] - p0[1]) / 6], c2 = [p[0] - (p3[0] - p1[0]) / 6, p[1] - (p3[1] - p1[1]) / 6]
    return `C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p[0]},${p[1]}`
  }).join(" ")).join(" ")
}

const HOW: Record<TrendView, string> = {
  stock: "ยอด ณ สิ้นแต่ละเดือน — ดูว่าฐานโตขึ้นหรือหดลง · สีเหลืองหนาขึ้น = คนพักมากขึ้น (เสี่ยงหลุด)",
  flow: "เหนือเส้น = เข้ามา (ใหม่ + กลับมาซื้อใหม่) · ใต้เส้น = หลุด (Lost) · เส้นดำ = Net — เดือนที่แดงยาว ให้ไปดูสาเหตุ",
  rate: "Churn = หลุดกี่ % ของทุกคนที่เรียนในเดือนนั้น · ต่อ = ของที่แพ็กเกจหมดในเดือนนั้น ซื้อต่อกี่ % — สองเส้นควรวิ่งสวนกัน",
}
