"use client"

// The picture of a course (owner 2026-10-14: "อยากเห็น Graph หรือ Chart ที่ช่วยให้เห็นภาพ การพัฒนาการ" +
// "ยังไม่เห็น การประเมินจาก AI"): understanding 1–5 per session as a line, attendance per month as bars,
// and the AI reading of both — all computed by Sum.courseProgress so the Dev team builds it from one rule.
import { AlertTriangleIcon, InfoIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { fmtDate } from "@/domain/dates"
import * as Sum from "@/domain/rules/summaries"
import { AI_TONE, AiIcon } from "./ai"
import { InfoTip } from "./info-tip"
import { cn } from "@/lib/utils"

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export function CourseProgress({ rows, aiInsights }: { rows: Sum.ProgressRow[]; aiInsights?: Sum.Insight[] | null }) {
  const p = Sum.courseProgress(rows)
  if (!p.sessions) return null
  const insights = aiInsights?.length ? aiInsights : p.insights
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="เช็คชื่อแล้ว" value={`${p.attended}`} sub={`จาก ${p.sessions} คาบที่ผ่านมา`} />
        <Stat label="มาเรียน" value={p.rate === null ? "—" : `${Math.round(p.rate * 100)}%`} sub={`ลา ${p.leave} · ขาด ${p.attended - p.present - p.leave}`}
          tone={p.rate === null ? undefined : p.rate >= 0.9 ? "good" : p.rate < 0.75 ? "watch" : undefined} />
        <Stat label="ความเข้าใจเฉลี่ย" value={p.avgLevel === null ? "—" : p.avgLevel.toFixed(1)} sub="เต็ม 5" />
        <Stat label="พัฒนาการ" value={p.trend === null ? "—" : `${p.trend > 0 ? "+" : ""}${p.trend.toFixed(1)}`}
          sub={p.first === null ? "ยังไม่พอดูแนวโน้ม" : `${p.first.toFixed(1)} → ${p.last!.toFixed(1)}`}
          tone={p.trend === null ? undefined : p.trend >= 0.5 ? "good" : p.trend <= -0.5 ? "watch" : undefined}
          icon={p.trend === null ? null : p.trend >= 0 ? <TrendingUpIcon className="size-4" /> : <TrendingDownIcon className="size-4" />} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <ChartCard title="ความเข้าใจรายคาบ" info="ครูให้คะแนน 1–5 ตอนเขียนสรุปคาบ (ความเข้าใจวันนี้) · เส้นประ = ค่าเฉลี่ย 3 คาบล่าสุด">
          <LevelChart rows={rows} />
        </ChartCard>
        <ChartCard title="การเข้าเรียนรายเดือน" info="นับเฉพาะคาบที่เช็คชื่อแล้ว">
          <AttendanceBars rows={rows} />
        </ChartCard>
      </div>

      <div className={cn("rounded-2xl p-3", AI_TONE.surface)}>
        <div className="mb-2 flex items-center gap-2">
          <AiIcon className="size-7" />
          <p className={cn("text-sm font-semibold", AI_TONE.text)}>AI ประเมินพัฒนาการ</p>
          <InfoTip text={aiInsights?.length ? "วิเคราะห์โดย AI จากสรุปคาบ คะแนนความเข้าใจ และการเข้าเรียน" : "อ่านจากตัวเลขด้านบนและสรุปคาบ — กด Generate Summary เมื่อตั้งค่า AI แล้ว จะได้การวิเคราะห์ละเอียดขึ้น"} />
        </div>
        {!insights.length && <p className="text-sm text-muted-foreground">ยังไม่มีการเช็คชื่อหรือสรุปคาบพอให้ประเมิน</p>}
        <ul className="space-y-1.5">
          {insights.map((x, i) => (
            <li key={i} className={cn("flex items-start gap-2 rounded-xl px-2.5 py-1.5 text-sm", AI_TONE.soft)}>
              {x.tone === "good" ? <TrendingUpIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                : x.tone === "watch" ? <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  : <InfoIcon className={cn("mt-0.5 size-4 shrink-0", AI_TONE.text)} />}
              <span>{x.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, tone, icon }: { label: string; value: string; sub: string; tone?: "good" | "watch"; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("flex items-center gap-1 text-xl font-semibold tabular-nums", tone === "good" && "text-emerald-700", tone === "watch" && "text-amber-700")}>{value}{icon}</p>
      <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )
}

function ChartCard({ title, info, children }: { title: string; info: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-3">
      <p className="mb-2 flex items-center gap-1 text-sm font-semibold">{title}<InfoTip text={info} /></p>
      {children}
    </div>
  )
}

const W = 320, H = 150, L = 22, R = 8, T = 8, B = 22

function LevelChart({ rows }: { rows: Sum.ProgressRow[] }) {
  const pts = rows.filter((r) => r.level)
  if (pts.length < 2) return <p className="py-8 text-center text-xs text-muted-foreground">ยังมีคะแนนความเข้าใจไม่พอวาดกราฟ</p>
  const x = (i: number) => L + (i * (W - L - R)) / (pts.length - 1)
  const y = (v: number) => T + ((5 - v) * (H - T - B)) / 4
  const line = pts.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.level!).toFixed(1)}`).join(" ")
  const avg = pts.map((_, i) => { const w = pts.slice(Math.max(0, i - 2), i + 1); return w.reduce((a, r) => a + r.level!, 0) / w.length })
  const avgLine = avg.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - B} L${L},${H - B} Z`
  const ticks = [0, Math.floor((pts.length - 1) / 2), pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="กราฟความเข้าใจรายคาบ">
      <defs>
        <linearGradient id="lvl-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ec4899" stopOpacity="0.25" /><stop offset="1" stopColor="#ec4899" stopOpacity="0" /></linearGradient>
      </defs>
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-muted-foreground/15" strokeDasharray={v === 1 ? undefined : "2 3"} />
          <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">{v}</text>
        </g>
      ))}
      <path d={area} fill="url(#lvl-fill)" />
      <path d={avgLine} fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={line} fill="none" stroke="#ec4899" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r.level!)} r="3" fill="#fff" stroke="#ec4899" strokeWidth="1.5">
          <title>{`${fmtDate(r.date)} · ${r.level}/5 ${Sum.LEVEL_LABEL[r.level!] ?? ""}`}</title>
        </circle>
      ))}
      {[...new Set(ticks)].map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[9px]">{fmtDate(pts[i].date)}</text>
      ))}
    </svg>
  )
}

function AttendanceBars({ rows }: { rows: Sum.ProgressRow[] }) {
  const by = new Map<string, { present: number; leave: number; absent: number }>()
  for (const r of rows) {
    if (!r.attended) continue
    const k = r.date.slice(0, 7)
    const m = by.get(k) ?? { present: 0, leave: 0, absent: 0 }
    m[r.attended]++
    by.set(k, m)
  }
  const months = [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  if (!months.length) return <p className="py-8 text-center text-xs text-muted-foreground">ยังไม่มีการเช็คชื่อ</p>
  const max = Math.max(...months.map(([, m]) => m.present + m.leave + m.absent))
  return (
    <div>
      <div className="flex h-[118px] items-end gap-2">
        {months.map(([k, m]) => {
          const total = m.present + m.leave + m.absent
          return (
            <div key={k} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`มา ${m.present} · ลา ${m.leave} · ขาด ${m.absent}`}>
              <span className="text-[10px] tabular-nums text-muted-foreground">{total}</span>
              <div className="flex w-full max-w-8 flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(total / max) * 90}px` }}>
                <div className="bg-emerald-500" style={{ flex: m.present }} />
                <div className="bg-amber-400" style={{ flex: m.leave }} />
                <div className="bg-rose-500" style={{ flex: m.absent }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{MONTHS[Number(k.slice(5, 7)) - 1]}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" />มา</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" />ลา</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-500" />ขาด</span>
      </div>
    </div>
  )
}
