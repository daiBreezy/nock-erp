"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BanknoteIcon, CalendarDaysIcon, ChartColumnIcon, ClockIcon, DownloadIcon, PrinterIcon, SchoolIcon, SparklesIcon, CalendarRangeIcon, UsersIcon, UserCheckIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { AttentionButton, AttentionDialog } from "@/components/reports/attention-dialog"
import { Delta, Donut, DonutLegend, Empty, TopList, fmtNum, fmtPct, fmtShort, Heatmap, MonthBars, Panel, Rank, ShareBar, donutColor, tint } from "@/components/reports/charts"
import { SummaryTab } from "@/components/reports/summary-tab"
import { useReports, type ReportData } from "@/components/reports/use-reports"
import { Button } from "@/components/ui/button"
import { addDays, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import { can, canCompareBranches, reportBranchIds } from "@/domain/rules/permissions"
import { COMPARE_LABEL, PERIODS, type PeriodKey, type Range } from "@/domain/rules/reports"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import { reasonLabel } from "@/domain/rules/loss"
import type { Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { downloadReports } from "@/lib/reports-export"
import { pullSurveyResponses } from "@/lib/forms"
import * as Survey from "@/domain/rules/survey"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Tab = "summary" | "overview" | "revenue" | "students" | "attendance" | "operations" | "crm" | "satisfaction"
const TABS: { id: Tab; label: string; soon?: string }[] = [
  { id: "summary", label: "สรุป" },
  { id: "overview", label: "ภาพรวม" },
  { id: "revenue", label: "รายได้" },
  { id: "students", label: "นักเรียน" },
  { id: "attendance", label: "การเข้าเรียน" },
  { id: "operations", label: "Operations" },
  { id: "crm", label: "CRM" },
  { id: "satisfaction", label: "ความพึงพอใจ" },
]
const DAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
const DAY_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]

export default function ReportsPage() {
  return <Suspense><Reports /></Suspense>
}

/**
 * Reports R1 (owner 2026-10-01): Overview + Revenue + Students. Director sees every branch and compares them,
 * Area Manager the branches of their area, Manager only their own branch (no comparison). Admin / teachers: no access.
 */
function Reports() {
  const params = useSearchParams()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId))
  const branches = useStore((s) => s.branches)
  const students = useStore((s) => s.students)
  const allowed = useMemo(() => reportBranchIds(me, branches), [me, branches])
  const compare = canCompareBranches(me) && allowed.length > 1
  const [scope, setScope] = useState<string>("all")
  const branchIds = useMemo(() => (scope === "all" || !allowed.includes(scope) ? allowed : [scope]), [scope, allowed])
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "overview")
  const [period, setPeriod] = useState<PeriodKey>("ytd")
  const today = toDateStr(useNow(60_000))
  const [custom, setCustom] = useState<Range>(() => ({ from: addDays(today, -29), to: today }))
  const [showAttention, setShowAttention] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const d = useReports(branchIds, period, period === "custom" ? custom : undefined)
  // survey answers live on the form server — pull new ones in (unhappy families notify their managers)
  useEffect(() => { pullSurveyResponses() }, [])
  const periodLabel = period === "custom" ? `${fmtDate(d.range.from)} – ${fmtDate(d.range.to)}` : PERIODS.find((p) => p.key === period)!.label
  const scopeLabel = branchIds.length === 1 ? branches.find((b) => b.id === branchIds[0])?.name ?? "" : allowed.length === branches.length ? "ทุกสาขา" : "สาขาในเขต"
  const showCompare = compare && branchIds.length > 1

  if (!can(me, "reports.view")) return <Empty>Reports ดูได้เฉพาะ Director / Area Manager / Manager</Empty>

  const exportXlsx = async () => {
    try {
      await downloadReports(d, { scope: scopeLabel, periodLabel, compare: showCompare, nameOf: (id) => students.find((x) => x.id === id)?.nickname ?? id, branchOf: (id) => branches.find((b) => b.id === id)?.name ?? "" })
      report({ ok: true, value: undefined }, "ดาวน์โหลด Reports (.xlsx) แล้ว")
    } catch (e) { report({ ok: false, error: `สร้างไฟล์ไม่สำเร็จ — ${(e as Error).message}` }, "") }
  }

  return (
    <div className="space-y-5 print:space-y-3">
      <title>Reports · NockERP</title>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><ChartColumnIcon className="size-5" /></span>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-xs text-muted-foreground">{scopeLabel} · {periodLabel}{period !== "custom" && ` ${fmtDate(d.range.from)} – ${fmtDate(d.range.to)}`} · เทียบ {fmtDate(d.prev.from, { year: d.prev.from.slice(0, 4) !== d.range.from.slice(0, 4) })} – {fmtDate(d.prev.to, { year: d.prev.to.slice(0, 4) !== d.range.to.slice(0, 4) })} · ข้อมูลจริงจากใบแจ้งหนี้ที่จ่ายแล้ว แพ็กเกจ และการเช็คชื่อ</p>
        </div>
        {allowed.length > 1 && (
          <NativeSelect className="h-9 w-48 print:hidden" value={scope} onChange={(e) => setScope(e.target.value)}
            options={[{ value: "all", label: allowed.length === branches.length ? "ทุกสาขา" : "ทุกสาขาในเขต" }, ...branches.filter((b) => allowed.includes(b.id)).map((b) => ({ value: b.id, label: b.name }))]} />
        )}
        <Button variant="outline" className="print:hidden" onClick={exportXlsx}><DownloadIcon /> Export .xlsx</Button>
        <Button variant="outline" className="print:hidden" onClick={() => window.print()}><PrinterIcon /> PDF</Button>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={BanknoteIcon} label={`รายได้ · ${periodLabel}`} value={fmtNum(d.kpi.revenue)} sub={<><Delta value={d.kpi.revenueChange} /> <span>{COMPARE_LABEL[period]}</span></>} />
        <Kpi icon={UsersIcon} label="นักเรียน Active" value={fmtNum(d.kpi.active)} sub={<><Delta value={d.kpi.activeChange} /> <span>vs ต้นช่วง · Pause {d.kpi.paused}</span></>} />
        <Kpi icon={CalendarDaysIcon} label="คาบสัปดาห์นี้" value={fmtNum(d.kpi.weekSessions)} sub={<span>ไม่นับคาบที่ยกเลิก</span>} />
        <Kpi icon={UserCheckIcon} label={`อัตราเข้าเรียน · ${periodLabel}`} value={fmtPct(d.kpi.attendance)} sub={<><Delta value={d.kpi.attendanceChange} /> <span>มา ÷ (มา + ลา)</span></>} />
        <AttentionButton count={d.kpi.attention} onClick={() => setShowAttention(true)} className="col-span-2 md:col-span-1" />
      </div>

      <div className="space-y-3 print:hidden">
        <div className="inline-flex flex-wrap rounded-full bg-muted p-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 rounded-full px-4 py-1 text-sm", tab === t.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
              {t.id === "summary" && <SparklesIcon className={cn("size-4", tab === t.id ? "text-violet-600" : "")} />}
              {t.label}{t.soon && <span className="ml-1 text-[10px] text-muted-foreground">{t.soon}</span>}
            </button>
          ))}
        </div>
        {/* owner 2026-10-05: periods on their own row — rolling · to-date · complete-period comparisons · custom dates */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {(["rolling", "todate", "compare"] as const).map((g, gi) => (
            <div key={g} className={cn("flex flex-wrap items-center gap-1.5", gi > 0 && "border-l pl-3")}>
              {PERIODS.filter((p) => p.group === g).map((p) => (
                <button key={p.key} type="button" title={p.hint} onClick={() => setPeriod(p.key)}
                  className={cn("rounded-full border px-3 py-1 text-xs", period === p.key ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted")}>{p.short}</button>
              ))}
            </div>
          ))}
          <div className={cn("flex flex-wrap items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-3 text-xs", period === "custom" ? "border-primary bg-primary/10" : "bg-card")}>
            <button type="button" title={PERIODS.find((p) => p.key === "custom")!.hint} onClick={() => setPeriod("custom")} className={cn("flex items-center gap-1.5", period === "custom" && "font-medium text-primary")}><CalendarRangeIcon className="size-3.5" /> กำหนดเอง</button>
            <input type="date" aria-label="ตั้งแต่วันที่" value={custom.from} max={today} onChange={(e) => { if (e.target.value) { setCustom((c) => ({ ...c, from: e.target.value })); setPeriod("custom") } }} className="h-6 rounded-full bg-background px-2 tabular-nums" />
            <span className="text-muted-foreground">–</span>
            <input type="date" aria-label="ถึงวันที่" value={custom.to} max={today} onChange={(e) => { if (e.target.value) { setCustom((c) => ({ ...c, to: e.target.value })); setPeriod("custom") } }} className="h-6 rounded-full bg-background px-2 tabular-nums" />
          </div>
        </div>
      </div>

      {tab === "summary" && <SummaryTab d={d} period={period} periodLabel={periodLabel} scopeLabel={scopeLabel} />}
      {tab === "overview" && <Overview d={d} compare={showCompare} period={period} periodLabel={periodLabel} onAllRevenue={() => setTab("revenue")} onAllStudents={() => setTab("students")} />}
      {tab === "revenue" && <RevenueTab d={d} compare={showCompare} period={period} periodLabel={periodLabel} />}
      {tab === "students" && <StudentsTab d={d} compare={showCompare} onOpen={setOpenId} />}
      {tab === "attendance" && <AttendanceTab d={d} compare={showCompare} onOpen={setOpenId} />}
      {tab === "operations" && <OperationsTab d={d} compare={showCompare} />}
      {tab === "crm" && <CrmTab d={d} compare={showCompare} />}
      {tab === "satisfaction" && <SatisfactionTab d={d} compare={showCompare} />}
      {TABS.find((t) => t.id === tab)?.soon && <Empty>แท็บนี้อยู่ในรอบ {TABS.find((t) => t.id === tab)!.soon} — คุยสเปกแล้ว ยังไม่ได้สร้าง</Empty>}

      <AttentionDialog open={showAttention} onClose={() => setShowAttention(false)} items={d.attention} />
      {openId && <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}


function Kpi({ icon: Icon, label, value, sub }: { icon: typeof BanknoteIcon; label: string; value: string; sub: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

// ---------------- Overview ----------------

function Overview({ d, compare, period, periodLabel, onAllRevenue, onAllStudents }: { d: ReportData; compare: boolean; period: PeriodKey; periodLabel: string; onAllRevenue: () => void; onAllStudents: () => void }) {
  const [subject, setSubject] = useState("")
  const demand = d.demand(subject || undefined)
  const net = d.studentFlow.newCount + d.studentFlow.returning - d.studentFlow.lost
  return (
    <div className="space-y-4">
      {/* each period with its own comparison — not "MoM" everywhere */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {d.strip.map((p) => (
          <div key={p.key} className={cn("rounded-2xl bg-card p-3 ring-1 ring-foreground/10", p.key === period && "ring-2 ring-primary")}>
            <p className="text-xs text-muted-foreground">{p.label}</p>
            <p className="text-lg font-semibold tabular-nums">{fmtNum(p.value)}</p>
            <p className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground"><Delta value={p.change} /> {p.vs}</p>
            <p className="text-[10px] text-muted-foreground">{fmtDate(p.range.from)} – {fmtDate(p.range.to)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="รายได้รายเดือน" hint={`ปี ${d.monthly.year + 543} เทียบปีที่แล้ว · ลายทาง = คาดการณ์ (ต่อคอร์ส ${fmtPct(d.forecast.renewal)} + ใบที่รอจ่าย)`}>
          <MonthBars thisYear={d.monthly.thisYear} lastYear={d.monthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} forecast={d.forecast.byMonth.map((x) => x?.total ?? null)}
            currentLastYearToDate={d.monthly.lastYearToDate} todayLabel={`${Number(d.today.slice(8)) === 1 ? "" : "1–"}${Number(d.today.slice(8))} ${fmtDate(d.today).split(" ")[1] ?? ""}`} />
        </Panel>
        {compare ? (
          <Panel title="รายได้ตามสาขา" hint={`Top 10 · ${periodLabel}`} action={<button type="button" className="text-xs text-primary" onClick={onAllRevenue}>ดูทั้งหมด ›</button>}>
            <BranchRevenue rows={d.byBranch.slice(0, 10)} />
          </Panel>
        ) : (
          <Panel title="ประเภทรายได้" hint="ค่าเรียน · ค่ารถ · ค่าธรรมเนียม · หนังสือ"><RevenueParts d={d} /></Panel>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Subject Engine" hint="รายได้ค่าเรียนแยกวิชา · คอร์สหลายวิชาแบ่งเท่าๆ กัน" center><SubjectEngine d={d} /></Panel>
        <Panel title="ครอบครัว Top 5" hint="ยอดในช่วงนี้ · อายุลูกค้านับจากใบแรก" action={<button type="button" className="text-xs text-primary" onClick={onAllRevenue}>ดูทั้งหมด ›</button>}>
          <Families rows={d.families.slice(0, 5)} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Demand Heatmap" hint="จำนวนนักเรียนในคาบ · วัน × เวลาเริ่ม · 08:00–21:00" fill
          action={<NativeSelect className="h-8 w-36" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ทุกวิชา"
            options={[...new Set(d.bySubject.map((x) => x.subject))].map((x) => ({ value: x, label: x }))} />}>
          <Heatmap rows={demand.hours} cols={DAYS} rowLabel={(h) => `${String(h).padStart(2, "0")}:00`} colLabel={(w) => DAY_SHORT[w]} value={(h, w) => demand.count(w, h)} />
        </Panel>
        <Panel title="แพ็กเกจขายดี" hint="จำนวน (Volume) vs รายได้ (Value)" fill><PackageMix d={d} /></Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Net Growth" hint="เข้า = ใหม่ + กลับมาเรียน · Net = เข้า − Lost" action={<button type="button" className="text-xs text-primary" onClick={onAllStudents}>ดูทั้งหมด ›</button>}>
          <SummaryStrip items={[["ใหม่", `+${d.studentFlow.newCount}`, "text-emerald-600"], ["กลับมาเรียน", `+${d.studentFlow.returning}`, "text-emerald-600"], ["Lost", `−${d.studentFlow.lost}`, "text-red-600"], ["Net", `${net > 0 ? "+" : ""}${net}`, net < 0 ? "text-red-600" : ""], ["ต่อคอร์ส", fmtPct(d.studentFlow.renewal), ""]]} />
          {compare && (
            <SplitRanks rows={[...d.perBranch].sort((a, b) => (b.newCount + b.returning - b.lost) - (a.newCount + a.returning - a.lost))} cols={[
              { label: "เข้า", cell: (b) => <span className="text-emerald-600">+{b.newCount + b.returning}</span> },
              { label: "Lost", cell: (b) => <span className="text-red-600">−{b.lost}</span> },
              { label: "Net", cell: (b) => { const n = b.newCount + b.returning - b.lost; return <span className={cn("font-medium", n < 0 && "text-red-600")}>{n > 0 ? "+" : ""}{n}</span> } },
            ]} />
          )}
        </Panel>
        <Panel title="Churn Split" hint="Lost = หมดแพ็กแล้วไม่ต่อใน 30 วัน · Pause = เริ่มลาพักยาวในช่วงนี้">
          <SummaryStrip items={[["Lost", String(d.studentFlow.lost), "text-red-600"], ["Pause", String(d.studentFlow.pauses), "text-amber-600"]]} />
          {compare && (
            <SplitRanks rows={[...d.perBranch].sort((a, b) => b.lost + b.pauses - (a.lost + a.pauses))} cols={[
              { label: "Lost", cell: (b) => <span className="text-red-600">{b.lost}</span> },
              { label: "Pause", cell: (b) => <span className="text-amber-600">{b.pauses}</span> },
            ]} />
          )}
        </Panel>
      </div>
    </div>
  )
}

/** A row of totals across the top of a card */
function SummaryStrip({ items }: { items: [string, string, string][] }) {
  return (
    <div className="mb-3 flex divide-x rounded-2xl bg-muted/50 py-2">
      {items.map(([label, value, tone]) => (
        <div key={label} className="flex-1 px-2 text-center">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
        </div>
      ))}
    </div>
  )
}

/** Ranked branch rows split into two columns once there are more than five — same layout as revenue by branch. */
function SplitRanks<T extends { id: string; name: string }>({ rows, cols }: { rows: T[]; cols: { label: string; cell: (r: T) => React.ReactNode }[] }) {
  const half = rows.length > 5 ? Math.ceil(rows.length / 2) : rows.length
  const parts = rows.length > 5 ? [rows.slice(0, half), rows.slice(half)] : [rows]
  return (
    <div className={cn("grid", parts.length > 1 && "md:grid-cols-2 md:divide-x")}>
      {parts.map((list, c) => (
        <div key={c} className={cn(parts.length > 1 && (c ? "md:pl-6" : "md:pr-6"))}><table className="w-full text-sm">
          <thead className={cn("text-xs text-muted-foreground", c > 0 && "max-md:hidden")}>
            <tr><th className="text-left font-normal">สาขา</th>{cols.map((x) => <th key={x.label} className="text-right font-normal">{x.label}</th>)}</tr>
          </thead>
          <tbody>{list.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="py-1.5"><span className="flex items-center gap-2"><Rank n={c * half + i + 1} /><span className="truncate">{r.name}</span></span></td>
              {cols.map((x) => <td key={x.label} className="text-right tabular-nums">{x.cell(r)}</td>)}
            </tr>
          ))}</tbody>
        </table></div>
      ))}
    </div>
  )
}

function Stat({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</p>
      {sub && <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Branches ranked by revenue — two columns of five (like the ref) once there are more than five. */
function BranchRevenue({ rows }: { rows: ReportData["byBranch"] }) {
  if (!rows.some((r) => r.amount)) return <Empty />
  const half = rows.length > 5 ? Math.ceil(rows.length / 2) : rows.length
  const cols = rows.length > 5 ? [rows.slice(0, half), rows.slice(half)] : [rows]
  return (
    <div className={cn("grid", cols.length > 1 && "md:grid-cols-2 md:divide-x")}>
      {cols.map((list, c) => (
        <div key={c} className={cn(cols.length > 1 && (c ? "md:pl-6" : "md:pr-6"))}><table className="w-full text-sm">
          <thead className={cn("text-xs text-muted-foreground", c > 0 && "max-md:hidden")}><tr><th className="text-left font-normal">สาขา</th><th /><th className="text-right font-normal">ยอด</th><th className="text-right font-normal">%</th></tr></thead>
          <tbody>{list.map((b, i) => (
            <tr key={b.id} className="border-t">
              <td className="py-2"><span className="flex items-center gap-2"><Rank n={c * half + i + 1} /><span className="truncate">{b.name}</span></span></td>
              <td className="w-1/4 px-2"><ShareBar value={b.share / (rows[0].share || 1)} /></td>
              <td className="text-right tabular-nums">{fmtShort(b.amount)}</td>
              <td className="w-10 text-right text-muted-foreground tabular-nums">{fmtPct(b.share)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ))}
    </div>
  )
}

function RevenueParts({ d }: { d: ReportData }) {
  const parts = [["ค่าเรียน", d.rev.tuition, d.revPrev.tuition], ["ค่ารถ", d.rev.bus, d.revPrev.bus], ["ค่าแรกเข้า / ค่าธรรมเนียม", d.rev.advance, d.revPrev.advance], ["ค่าหนังสือ", d.rev.book, d.revPrev.book], ["ใบลดหนี้ (หัก)", -d.rev.credit, -d.revPrev.credit]] as const
  return (
    <ul className="divide-y text-sm">
      {parts.map(([label, now, before]) => (
        <li key={label} className="flex items-center gap-2 py-2">
          <span className="flex-1">{label}</span>
          <span className={cn("tabular-nums", now < 0 && "text-red-600")}>{fmtMoney(now)}</span>
          <span className="w-16 text-right"><Delta value={d.comparable && before ? Math.round(((now - before) / Math.abs(before)) * 1000) / 10 : null} invert={label.startsWith("ใบลดหนี้")} /></span>
        </li>
      ))}
      <li className="flex items-center gap-2 py-2 font-semibold"><span className="flex-1">รวม</span><span className="tabular-nums">{fmtMoney(d.rev.total)}</span><span className="w-16" /></li>
    </ul>
  )
}

function SubjectEngine({ d }: { d: ReportData }) {
  if (!d.bySubject.length) return <Empty />
  const total = d.bySubject.reduce((a, x) => a + x.amount, 0)
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_11rem]">
      <ul className="space-y-2 text-sm">
        {d.bySubject.map((x, i) => (
          <li key={x.subject} className="grid grid-cols-[6rem_2.5rem_1fr_4rem] items-center gap-2">
            <span className="flex items-center gap-1.5 truncate"><span className="size-2 shrink-0 rounded-full" style={{ background: donutColor(i) }} />{x.subject}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{fmtPct(x.share)}</span>
            <ShareBar value={x.share} color={donutColor(i)} />
            <span className="text-right tabular-nums">{fmtShort(x.amount)}</span>
          </li>
        ))}
      </ul>
      <Donut parts={d.bySubject.map((x) => ({ label: x.subject, value: x.amount }))} center={fmtShort(total)} sub="ค่าเรียนทุกวิชา" />
    </div>
  )
}

/** Families ranked by spend. `split` = two columns of ten + "ดูทั้งหมด" (owner 2026-10-05: no wide half-empty tables). */
function Families({ rows, split }: { rows: ReportData["families"]; split?: boolean }) {
  const [open, setOpen] = useState(false)
  if (!rows.length) return <Empty />
  const list = split && !open ? rows.slice(0, 20) : rows
  const half = split && list.length > 10 ? Math.ceil(list.length / 2) : list.length
  const parts = half < list.length ? [list.slice(0, half), list.slice(half)] : [list]
  return (
    <div>
      <div className={cn("grid", parts.length > 1 && "lg:grid-cols-2 lg:divide-x")}>
        {parts.map((part, c) => (
          <div key={c} className={cn(parts.length > 1 && (c ? "lg:pl-6" : "lg:pr-6"))}>
            <table className="w-full text-sm">
              <thead className={cn("text-xs text-muted-foreground", c > 0 && "max-lg:hidden")}><tr><th className="text-left font-normal">ครอบครัว</th><th className="text-right font-normal">อายุลูกค้า</th><th className="text-right font-normal">ยอด</th><th className="text-right font-normal">ใบ</th><th className="text-right font-normal">ลูก</th></tr></thead>
              <tbody>{part.map((f, i) => (
                <tr key={f.key} className="border-t">
                  <td className="py-1.5"><span className="flex items-center gap-2"><Rank n={c * half + i + 1} /><span className="truncate">{f.name}</span></span></td>
                  <td className="w-20 text-right text-muted-foreground tabular-nums">{f.tenureMonths} ด.</td>
                  <td className="w-20 text-right tabular-nums">{fmtShort(f.amount)}</td>
                  <td className="w-10 text-right tabular-nums">{f.invoices}</td>
                  <td className="w-10 text-right tabular-nums">{f.kids}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </div>
      {split && rows.length > 20 && <button type="button" onClick={() => setOpen((o) => !o)} className="mt-3 text-xs text-primary hover:underline">{open ? "ย่อเหลือ 20 อันดับ" : `ดูทั้งหมด ${rows.length} ครอบครัว`}</button>}
    </div>
  )
}

const PACKAGE_TYPES = [{ suffix: "h", label: "รายชั่วโมง (Hourly)" }, { suffix: "w", label: "รายสัปดาห์ (Weekly)" }, { suffix: "m", label: "รายเดือน (Monthly)" }]

/**
 * Packages by type (owner 2026-10-01): Hourly / Weekly / Monthly in one table — a type header with its subtotal, then
 * its packages. A switch per type would leave Weekly/Monthly with 1–3 rows, so all three stay visible together.
 */
function PackageMix({ d }: { d: ReportData }) {
  if (!d.packages.length) return <Empty />
  const maxU = Math.max(1, ...d.packages.map((x) => x.units)), maxV = Math.max(1, ...d.packages.map((x) => x.amount))
  const groups = PACKAGE_TYPES.map((t) => {
    const list = d.packages.filter((x) => x.key.endsWith(t.suffix))
    return { ...t, list, units: list.reduce((a, x) => a + x.units, 0), amount: list.reduce((a, x) => a + x.amount, 0), share: list.reduce((a, x) => a + x.share, 0) }
  }).filter((g) => g.list.length)
  const cell = (x: number) => cn("h-8 rounded-md text-center tabular-nums", x > 0.55 && "text-primary-foreground")
  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* the three types side by side: how the money splits */}
      <div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          {groups.map((g, i) => <div key={g.suffix} style={{ width: `${g.share * 100}%`, background: donutColor(i) }} title={`${g.label} ${fmtPct(g.share)}`} />)}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {groups.map((g, i) => <span key={g.suffix} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: donutColor(i) }} />{g.label.split(" ")[0]} <b className="font-medium text-foreground tabular-nums">{fmtPct(g.share)}</b></span>)}
        </div>
      </div>
      <table className="w-full flex-1 border-separate border-spacing-0.5 text-sm">
        <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">แพ็กเกจ</th><th className="font-normal">จำนวน</th><th className="font-normal">รายได้</th><th className="text-right font-normal">%Mix</th></tr></thead>
        {groups.map((g, i) => (
          <tbody key={g.suffix}>
            <tr className="font-medium">
              <td className="pt-2 pb-1"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: donutColor(i) }} />{g.label}</span></td>
              <td className="pt-2 pb-1 text-center tabular-nums">{fmtNum(g.units)}</td>
              <td className="pt-2 pb-1 text-center tabular-nums">{fmtShort(g.amount)}</td>
              <td className="pt-2 pb-1 text-right tabular-nums">{fmtPct(g.share)}</td>
            </tr>
            {g.list.map((x) => (
              <tr key={x.key}>
                <td className="py-0.5 pl-3.5 text-muted-foreground">{x.label}</td>
                <td className={cell(x.units / maxU)} style={{ background: tint(x.units / maxU) }}>{fmtNum(x.units)}</td>
                <td className={cell(x.amount / maxV)} style={{ background: tint(x.amount / maxV) }}>{fmtShort(x.amount)}</td>
                <td className="text-right text-muted-foreground tabular-nums">{fmtPct(x.share)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}

// ---------------- Revenue ----------------

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

function RevenueTab({ d, compare, period, periodLabel }: { d: ReportData; compare: boolean; period: PeriodKey; periodLabel: string }) {
  const pg = d.packageGrade
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="รายได้รวม" value={fmtShort(d.rev.total)} />
        <Stat label="ใบแจ้งหนี้ที่จ่ายแล้ว" value={fmtNum(d.rev.invoices)} sub={<Delta value={d.comparable && d.revPrev.invoices ? Math.round(((d.rev.invoices - d.revPrev.invoices) / d.revPrev.invoices) * 1000) / 10 : null} />} />
        <Stat label="นักเรียนที่จ่าย" value={fmtNum(d.rev.students)} />
        <Stat label="เฉลี่ยต่อใบ" value={fmtShort(d.rev.invoices ? d.rev.total / d.rev.invoices : 0)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ForecastPanel d={d} />
        <Panel title="รายได้รายเดือน" hint={`ปี ${d.monthly.year + 543} เทียบปีที่แล้ว`} fill>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">เดือน</th><th className="text-right font-normal">ปีนี้</th><th className="text-right font-normal">ปีที่แล้ว</th><th className="text-right font-normal">เปลี่ยนแปลง</th></tr></thead>
              <tbody>{TH_MONTHS.map((m, i) => {
                const a = d.monthly.thisYear[i], b = d.monthly.lastYear[i]
                if (a === null && !b) return null
                return (
                  <tr key={m} className="border-t">
                    <td className="py-1.5">{m}</td>
                    <td className="text-right tabular-nums">{a === null ? "—" : fmtMoney(a)}</td>
                    <td className="text-right text-muted-foreground tabular-nums">{b ? fmtMoney(b) : "—"}</td>
                    {/* the month in progress compares with the same days last year */}
                    <td className="text-right"><Delta value={(() => { const base = i === Number(d.today.slice(5, 7)) - 1 ? d.monthly.lastYearToDate : b; return a !== null && base ? Math.round(((a - base) / base) * 1000) / 10 : null })()} /></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="ประเภทรายได้" hint={`${periodLabel} ${COMPARE_LABEL[period]}`}><RevenueParts d={d} /></Panel>
        <Panel title="Subject Engine" hint="รายได้ค่าเรียนแยกวิชา" center><SubjectEngine d={d} /></Panel>
      </div>
      {compare && <Panel title="รายได้ตามสาขา" hint="ทุกสาขาในขอบเขต"><BranchRevenue rows={d.byBranch} /></Panel>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="แพ็กเกจขายดี" hint="จำนวน (Volume) vs รายได้ (Value)" fill><PackageMix d={d} /></Panel>
        <Panel title="แพ็กเกจ × ระดับชั้น" hint="จำนวนแพ็กที่แต่ละชั้นซื้อ" fill>
          {pg.grades.length ? <Heatmap rows={pg.grades} cols={pg.keys} rowLabel={(g) => g} colLabel={(k) => k} value={(g, k) => pg.count(g, k)} corner="ชั้น" /> : <Empty />}
        </Panel>
      </div>
      <Panel title="ครอบครัวทั้งหมด" hint={`${d.families.length} ครอบครัวที่จ่ายในช่วงนี้`}>
        <Families rows={d.families} split />
      </Panel>
    </div>
  )
}

// ---------------- Students ----------------

function StudentsTab({ d, compare, onOpen }: { d: ReportData; compare: boolean; onOpen: (id: string) => void }) {
  const f = d.studentFlow
  const net = f.newCount + f.returning - f.lost
  const name = (id: string) => d.students.find((x) => x.id === id)
  const events = d.events.filter((e) => e.kind !== "renewed" && e.date >= d.range.from && e.date <= d.range.to).reverse()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        <Stat label="Active วันนี้" value={fmtNum(d.kpi.active)} />
        <Stat label="Pause (ลาพักยาว)" value={fmtNum(d.kpi.paused)} tone="text-amber-600" />
        <Stat label="ใหม่" value={`+${f.newCount}`} tone="text-emerald-600" sub={<Delta value={d.comparable && f.newPrev ? Math.round(((f.newCount - f.newPrev) / f.newPrev) * 1000) / 10 : null} />} />
        <Stat label="กลับมาเรียน" value={`+${f.returning}`} tone="text-emerald-600" />
        <Stat label="Lost" value={`−${f.lost}`} tone="text-red-600" sub={<Delta value={d.comparable && f.lostPrev ? Math.round(((f.lost - f.lostPrev) / f.lostPrev) * 1000) / 10 : null} invert />} />
        <Stat label="Net" value={`${net > 0 ? "+" : ""}${net}`} tone={net < 0 ? "text-red-600" : undefined} />
        <Stat label="อัตราต่อคอร์ส" value={fmtPct(f.renewal)} sub={<span>ก่อนหน้า {d.comparable ? fmtPct(f.renewalPrev) : "—"}</span>} />
      </div>
      <Panel title="นักเรียน Active รายเดือน" hint="นับ ณ สิ้นเดือน (เดือนนี้ = วันนี้)">
        <MonthBars thisYear={d.activeMonthly.thisYear} lastYear={d.activeMonthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} unit=" คน" />
      </Panel>
      {compare && (
        <Panel title="แยกตามสาขา">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">สาขา</th><th className="text-right font-normal">Active</th><th className="text-right font-normal">ใหม่</th><th className="text-right font-normal">กลับมา</th><th className="text-right font-normal">Lost</th><th className="text-right font-normal">Pause</th><th className="text-right font-normal">Net</th></tr></thead>
            <tbody>{d.perBranch.map((b) => {
              const n = b.newCount + b.returning - b.lost
              return (
                <tr key={b.id} className="border-t">
                  <td className="py-1.5">{b.name}</td><td className="text-right tabular-nums">{b.active}</td>
                  <td className="text-right text-emerald-600 tabular-nums">+{b.newCount}</td><td className="text-right text-emerald-600 tabular-nums">+{b.returning}</td>
                  <td className="text-right text-red-600 tabular-nums">−{b.lost}</td><td className="text-right text-amber-600 tabular-nums">{b.pauses}</td>
                  <td className={cn("text-right font-medium tabular-nums", n < 0 && "text-red-600")}>{n > 0 ? "+" : ""}{n}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </Panel>
      )}
      <Panel title="ความเคลื่อนไหวนักเรียน" hint={`${events.length} รายการในช่วงนี้ · ล่าสุดอยู่บน · กดชื่อเพื่อเปิดข้อมูลนักเรียน`}>
        {events.length ? (
          <div className="grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x">
            {(["new", "returning", "lost"] as const).map((kind, c) => (
              <div key={kind} className={cn(c > 0 && "md:pl-6", c < 2 && "md:pr-6")}>
                <MoveList title={kind === "new" ? "ใหม่" : kind === "returning" ? "กลับมาเรียน" : "Lost"} tone={kind === "lost" ? "text-red-600" : "text-emerald-600"}
                  rows={events.filter((e) => e.kind === kind).map((e) => ({ id: e.studentId, date: e.date, name: name(e.studentId)?.nickname ?? "—", grade: name(e.studentId)?.grade ?? "" }))} onOpen={onOpen} />
              </div>
            ))}
          </div>
        ) : <Empty />}
      </Panel>
      <ExitPanelReport d={d} />
      <CohortPanel d={d} compare={compare} />
      <p className="text-xs text-muted-foreground">นักเรียนที่ Import จากระบบเดิมไม่นับเป็น &quot;ใหม่&quot; และไม่อยู่ใน Cohort (ไม่รู้วันที่เริ่มเรียนจริง)</p>
    </div>
  )
}

/** One kind of student movement: newest ten, then "ดูทั้งหมด" */
function MoveList({ title, tone, rows, onOpen }: { title: string; tone: string; rows: { id: string; date: string; name: string; grade: string }[]; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const list = open ? rows : rows.slice(0, 10)
  return (
    <div>
      <p className="mb-2 flex items-baseline gap-2 text-sm font-medium">{title}<span className={cn("tabular-nums", tone)}>{rows.length}</span></p>
      {rows.length ? (
        <ul className="divide-y text-sm">{list.map((r, i) => (
          <li key={`${r.id}-${i}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-3 py-1.5">
            <span className="text-xs text-muted-foreground">{fmtDate(r.date)}</span>
            <button type="button" className="truncate text-left hover:underline" onClick={() => onOpen(r.id)}>{r.name}</button>
            <span className="text-right text-xs text-muted-foreground">{r.grade}</span>
          </li>
        ))}</ul>
      ) : <p className="text-xs text-muted-foreground">ไม่มี</p>}
      {rows.length > 10 && <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-xs text-primary hover:underline">{open ? "ย่อเหลือ 10 รายการ" : `ดูทั้งหมด ${rows.length} รายการ`}</button>}
    </div>
  )
}

// ---------------- Attendance (R2) ----------------

/** label · bar · value rows — the bar is the rate itself (0–100%) */
function RateRows({ rows, plain }: { rows: { key: string; label: React.ReactNode; rate: number | null; sub?: React.ReactNode; tone?: string }[]; plain?: boolean }) {
  if (!rows.length) return <Empty />
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3">
          <span className="truncate">{r.label}</span>
          <span className="flex items-center gap-2"><ShareBar value={r.rate ?? 0} color={r.tone ?? (plain ? undefined : r.rate !== null && r.rate < 0.8 ? "#dc2626" : "#10b981")} />{r.sub && <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{r.sub}</span>}</span>
          <span className={cn("text-right tabular-nums", !plain && r.rate !== null && r.rate < 0.8 && "font-medium text-red-600")}>{fmtPct(r.rate)}</span>
        </li>
      ))}
    </ul>
  )
}

function AttendanceTab({ d, compare, onOpen }: { d: ReportData; compare: boolean; onOpen: (id: string) => void }) {
  const a = d.attendanceTab
  const name = (id: string) => d.students.find((x) => x.id === id)
  const days = [1, 2, 3, 4, 5, 6, 0].map((w) => a.byWeekday.find((r) => r.key === String(w)) ?? { key: String(w), present: 0, leave: 0, noQuota: 0, rate: null, sessions: 0 })
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">ข้อมูลการเข้าเรียนเริ่ม {fmtDate(a.since, { year: true })} (คาบแรกในระบบ) · อัตรา = มา ÷ (มา + ลา) · เขียว = 80% ขึ้นไป · แดง = ต่ำกว่า 80%</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="อัตราเข้าเรียน" value={fmtPct(a.total.rate)} tone={a.total.rate !== null && a.total.rate < 0.8 ? "text-red-600" : undefined} />
        <Stat label="มา" value={fmtNum(a.total.present)} tone="text-emerald-600" />
        <Stat label="ลา" value={fmtNum(a.total.leave)} tone="text-amber-600" sub={<span>ไม่หักโควตา {a.noQuota}</span>} />
        <Stat label="คาบยกเลิก" value={fmtNum(a.cancelled.total)} sub={<span>นักเรียนได้รับผล {a.cancelled.students}</span>} />
        <Stat label="ยกเลิกเพราะครูลา" value={fmtNum(a.cancelled.teacher)} tone={a.cancelled.teacher ? "text-red-600" : undefined} />
        <Stat label="หยุดช่วงพิเศษ / อื่นๆ" value={`${a.cancelled.period} / ${a.cancelled.other}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="อัตราเข้าเรียนรายเดือน" hint={`ปี ${d.monthly.year + 543}`} center>
          <MonthBars height="h-28" thisYear={a.monthly.map((x) => (x === null ? null : Math.round(x * 1000) / 10))} lastYear={a.monthly.map(() => null)} current={Number(d.today.slice(5, 7)) - 1} unit="%" />
        </Panel>
        <Panel title="แยกตามวิชา" center><RateRows rows={a.bySubject.map((r) => ({ key: r.key, label: r.key, rate: r.rate, sub: `ลา ${r.leave}` }))} /></Panel>
      </div>
      {/* owner 2026-10-05: pairs of similar length — branches | lowest classes, weekdays | frequent leavers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {compare ? (
          <Panel title="แยกตามสาขา" hint="ต่ำสุดอยู่บน" fill>
            <RateRows rows={a.byBranch.map((r) => ({ key: r.key, label: r.name, rate: r.rate, sub: `${r.present}/${r.present + r.leave}` }))} />
          </Panel>
        ) : (
          <Panel title="แยกตามวัน" fill>
            <RateRows rows={days.map((r) => ({ key: r.key, label: DAY_SHORT[Number(r.key)], rate: r.rate, sub: `${r.sessions} คาบ` }))} />
          </Panel>
        )}
        <Panel title="คลาสที่เข้าเรียนต่ำสุด" hint={compare ? "ต่ำสุดอยู่บน · บอกสาขา" : "ต่ำสุดอยู่บน"} fill><RateRows rows={a.byClass.slice(0, compare ? Math.max(10, a.byBranch.length) : 7).map((r) => ({ key: r.key, label: <span title={`${r.name} · ${r.branch}`}>{r.name}{compare && <span className="text-xs text-muted-foreground"> · {r.branch}</span>}</span>, rate: r.rate, sub: `ลา ${r.leave}` }))} /></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {compare && <Panel title="แยกตามวัน" fill><RateRows rows={days.map((r) => ({ key: r.key, label: DAY_SHORT[Number(r.key)], rate: r.rate, sub: `${r.sessions} คาบ` }))} /></Panel>}
        <Panel title="นักเรียนลาบ่อย" hint="ลา ≥ 2 ครั้งในช่วงนี้ · เสี่ยงหลุด · กดชื่อเพื่อเปิด" center className={compare ? "" : "lg:col-span-2"}>
          {a.leavers.length ? (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">นักเรียน</th><th className="text-left font-normal">ชั้น</th><th className="text-right font-normal">มา</th><th className="text-right font-normal">ลา</th><th className="text-right font-normal">ไม่หักโควตา</th><th className="text-right font-normal">อัตรา</th></tr></thead>
              <tbody>{a.leavers.slice(0, 10).map((x) => (
                <tr key={x.studentId} className="border-t">
                  <td className="py-1.5"><button type="button" className="hover:underline" onClick={() => onOpen(x.studentId)}>{name(x.studentId)?.nickname ?? "—"}</button></td>
                  <td className="text-muted-foreground">{name(x.studentId)?.grade}</td>
                  <td className="text-right tabular-nums">{x.present}</td>
                  <td className="text-right text-amber-600 tabular-nums">{x.leave}</td>
                  <td className="text-right text-muted-foreground tabular-nums">{x.noQuota}</td>
                  <td className={cn("text-right tabular-nums", x.rate < 0.8 && "text-red-600")}>{fmtPct(x.rate)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <Empty>ไม่มีนักเรียนที่ลาบ่อยในช่วงนี้</Empty>}
        </Panel>
      </div>
    </div>
  )
}

// ---------------- Operations (R2) ----------------

const hrs = (min: number) => `${(min / 60).toLocaleString("th-TH", { maximumFractionDigits: 1 })} ชม.`

function OperationsTab({ d, compare }: { d: ReportData; compare: boolean }) {
  const o = d.operations
  const [onlyPartTime, setOnlyPartTime] = useState(false)
  const teachers = o.teachers.filter((t) => !onlyPartTime || t.staff?.partTime)
  const partTimeMin = o.teachers.filter((t) => t.staff?.partTime).reduce((a, t) => a + t.minutes, 0)
  const low = o.fill.filter((c) => c.students <= 1)
  const over = o.fill.filter((c) => c.fill > 1).sort((a, b) => b.fill - a.fill)
  const branchOf = (id: string) => d.operations.rooms.find((b) => b.id === id)?.name ?? ""
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">นับเฉพาะคาบที่สอนจบแล้ว ตั้งแต่ {fmtDate(o.since, { year: true })} (คาบแรกในระบบ) · ชั่วโมงสอนของครูหลัก ใช้คิดค่าสอน Part-time</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="ครูที่สอนในช่วงนี้" value={fmtNum(o.teachers.filter((t) => t.sessions).length)} />
        <Stat label="ชั่วโมงสอนรวม" value={hrs(o.teachers.reduce((a, t) => a + t.minutes, 0))} />
        <Stat label="ชั่วโมง Part-time" value={hrs(partTimeMin)} tone="text-violet-600" />
        <Stat label="งานค้างของครู" value={fmtNum(o.teachers.reduce((a, t) => a + t.unmarked + t.summariesPending, 0))} sub={<span>เช็คชื่อ + สรุปการเรียน</span>} />
      </div>
      <Panel title="สุขภาพครู (Teacher Health)" hint="เรียงตามชั่วโมงสอน"
        action={<label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={onlyPartTime} onChange={(e) => setOnlyPartTime(e.target.checked)} /> เฉพาะ Part-time</label>}>
        {teachers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="text-left font-normal">ครู</th>{compare && <th className="text-left font-normal">สาขา</th>}<th className="text-right font-normal">คาบ</th><th className="text-right font-normal">ชั่วโมง</th><th className="text-right font-normal">นักเรียน</th><th className="text-right font-normal">อัตราเข้าเรียน</th><th className="text-right font-normal">ยังไม่เช็คชื่อ</th><th className="text-right font-normal">สรุปค้าง</th><th className="text-right font-normal">สรุปตรงเวลา</th><th className="text-right font-normal">สอนแทน</th><th className="text-right font-normal">ลา (คาบ)</th></tr>
              </thead>
              <tbody>{teachers.map((t) => (
                <tr key={t.teacherId} className="border-t">
                  <td className="py-1.5"><span className="flex items-center gap-1.5">{t.staff?.nickname ?? "—"}{t.staff?.partTime && <span className="rounded-full bg-violet-100 px-1.5 text-[10px] text-violet-800 dark:bg-violet-950 dark:text-violet-200">Part-time</span>}{t.staff && !t.staff.active && <span className="text-[10px] text-muted-foreground">(ออกแล้ว)</span>}</span></td>
                  {compare && <td className="text-muted-foreground">{(t.staff?.branchIds ?? []).map(branchOf).filter(Boolean).join(", ") || "—"}</td>}
                  <td className="text-right tabular-nums">{t.sessions}</td>
                  <td className="text-right font-medium tabular-nums">{hrs(t.minutes)}</td>
                  <td className="text-right tabular-nums">{t.students}</td>
                  <td className={cn("text-right tabular-nums", t.rate !== null && t.rate < 0.8 && "text-red-600")}>{fmtPct(t.rate)}</td>
                  <td className={cn("text-right tabular-nums", t.unmarked && "font-medium text-red-600")}>{t.unmarked || "—"}</td>
                  <td className={cn("text-right tabular-nums", t.summariesPending && "font-medium text-amber-600")}>{t.summariesPending || "—"}</td>
                  <td className={cn("text-right tabular-nums", t.summariesOnTime !== null && t.summariesOnTime < 0.8 && "text-red-600")}>{fmtPct(t.summariesOnTime)}</td>
                  <td className="text-right tabular-nums">{t.coverFor || "—"}</td>
                  <td className="text-right tabular-nums">{t.awaySessions || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <Empty />}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={compare ? "การใช้ห้องตามสาขา" : "การใช้ห้อง"} hint="ชั่วโมงที่มีคาบ ÷ ชั่วโมงที่สาขาเปิด" fill>
          <RateRows plain rows={compare
            ? [...o.rooms].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).map((b) => ({ key: b.id, label: b.name, rate: b.rate, sub: hrs(b.booked) }))
            : o.rooms.flatMap((b) => b.rooms.map((r) => ({ key: r.roomId, label: r.name, rate: r.rate, sub: hrs(r.booked) })))} />
        </Panel>
        <Panel title="ความเต็มของคลาส" hint={`นักเรียน ÷ ขนาดที่แนะนำ (กลุ่ม 6 · เดี่ยว 3) · ว่างสุดอยู่บน · คนน้อย ${low.length} · เกิน ${over.length} คลาส`} fill>
          <RateRows plain rows={[...over, ...o.fill.filter((c) => c.fill <= 1)].slice(0, Math.max(12, over.length)).map((c) => ({
            key: c.id, label: <span title={c.name}>{c.name}{compare && <span className="text-xs text-muted-foreground"> · {branchOf(c.branchId)}</span>}</span>,
            rate: Math.min(1, c.fill), sub: `${c.students}/${c.capacity}`, tone: c.fill > 1 ? "#dc2626" : c.students <= 1 ? "#f59e0b" : undefined,
          }))} />
          <p className="mt-2 text-[11px] text-muted-foreground"><span className="text-amber-600">■</span> คนน้อย (≤ 1 คน) · <span className="text-red-600">■</span> เกินขนาดแนะนำ (แสดงบนสุด)</p>
        </Panel>
      </div>
    </div>
  )
}

// ---------------- Forecast / Cohort / CRM (R3) ----------------

/** What is expected to come in until the end of the year — renewals at the recent renewal rate + invoices waiting. */
function ForecastPanel({ d }: { d: ReportData }) {
  const f = d.forecast
  const cur = Number(d.today.slice(5, 7)) - 1
  const months = f.byMonth.map((x, m) => ({ m, x })).filter((r) => r.x && r.m >= cur)
  const total = months.reduce((a, r) => a + r.x!.total, 0)
  const actualYtd = d.monthly.thisYear.reduce<number>((a, v) => a + (v ?? 0), 0)
  return (
    <Panel title="คาดการณ์รายได้ถึงสิ้นปี" center hint={`ต่อคอร์สตามอัตรา 6 เดือนล่าสุด ${fmtPct(f.renewal)} · ใบแจ้งหนี้ที่ส่งแล้วรอจ่าย ${f.openCount} ใบ · ไม่รวมนักเรียนใหม่`}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label="คาดว่าจะเข้าอีก" value={fmtShort(total)} tone="text-primary" />
          <Stat label={`ทั้งปี ${d.monthly.year + 543} (จริง + คาดการณ์)`} value={fmtShort(actualYtd + total)} />
          <Stat label="นักเรียนใหม่ (ไม่ได้รวม)" value={`+${fmtShort(f.newAvg.perMonth)}/ด.`} sub={<span>เฉลี่ย 3 เดือนล่าสุด · {Math.round(f.newAvg.students)} คน/ด.</span>} />
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">เดือน</th><th className="text-right font-normal">ต่อคอร์ส (คาดการณ์)</th><th className="text-right font-normal">ใบที่รอจ่าย</th><th className="text-right font-normal">รวม</th></tr></thead>
          <tbody>{months.map(({ m, x }) => (
            <tr key={m} className="border-t">
              <td className="py-1.5">{TH_MONTHS[m]}{m === cur && <span className="ml-1 text-xs text-muted-foreground">(ที่เหลือของเดือน)</span>}</td>
              <td className="text-right tabular-nums">{fmtMoney(x!.renewals)}</td>
              <td className="text-right tabular-nums">{x!.open ? fmtMoney(x!.open) : "—"}</td>
              <td className="text-right font-medium tabular-nums">{fmtMoney(x!.total)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  )
}

/** Why students left — from the exit form (owner 2026-10-05): reasons, the parents' scores, will they come back. */
function ExitPanelReport({ d }: { d: ReportData }) {
  const e = d.exits
  const lossReasons = useStore((st) => st.system.lossReasons)
  const max = Math.max(1, ...e.reasons.map((r) => r.main + r.other))
  const SC = { teacher: "ครู", content: "เนื้อหา", admin: "แอดมิน", value: "ความคุ้มค่า" } as const
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="ทำไมนักเรียนออก" hint={`จากฟอร์มแจ้งออก · ${e.total} คนในช่วงนี้ · ผู้ปกครองตอบ ${e.answered} · ไม่ตอบ ${e.noReply}`} fill>
        {e.reasons.length ? (
          <ul className="space-y-2 text-sm">{e.reasons.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,15rem)_1fr_4.5rem] items-center gap-3">
              <span className="truncate">{reasonLabel(r.id, lossReasons)}</span>
              <span className="flex h-2 overflow-hidden rounded-full bg-muted"><span className="bg-primary" style={{ width: `${(r.main / max) * 100}%` }} /><span className="bg-primary/30" style={{ width: `${(r.other / max) * 100}%` }} /></span>
              <span className="text-right text-xs tabular-nums">{r.main}{r.other ? <span className="text-muted-foreground"> +{r.other}</span> : null}</span>
            </li>
          ))}</ul>
        ) : <Empty>ยังไม่มีนักเรียนที่ปิดการออกในช่วงนี้</Empty>}
        {e.reasons.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">สีเข้ม = เหตุผลหลัก · สีอ่อน = เหตุผลอื่นที่เลือกด้วย</p>}
      </Panel>
      <Panel title="คะแนนจากผู้ปกครองที่ออก" hint="เฉลี่ย 1–5 · NPS = % แนะนำ (9–10) − % ไม่แนะนำ (0–6)" fill>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(SC) as (keyof typeof SC)[]).map((k) => <Stat key={k} label={SC[k]} value={e.scores[k] === null ? "—" : e.scores[k]!.toFixed(1)} tone={e.scores[k] !== null && e.scores[k]! < 3.5 ? "text-red-600" : undefined} />)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="NPS" value={e.nps === null ? "—" : `${e.nps > 0 ? "+" : ""}${e.nps}`} tone={e.nps !== null && e.nps < 0 ? "text-red-600" : "text-emerald-600"} />
          <Stat label="จะกลับมา" value={String(e.comeBack.yes)} tone="text-emerald-600" />
          <Stat label="อาจจะ" value={String(e.comeBack.maybe)} tone="text-amber-600" />
          <Stat label="คงไม่" value={String(e.comeBack.no)} />
        </div>
        {e.comments.length > 0 && (
          <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t pt-2 text-xs">{e.comments.slice(0, 8).map((c, i) => <li key={i}>“{c.text}” <span className="text-muted-foreground">· {reasonLabel(c.reasonId, lossReasons)} · {fmtDate(c.at.slice(0, 10))}</span></li>)}</ul>
        )}
      </Panel>
    </div>
  )
}

/** Cohort retention (owner's layout): branch × year joined, M0…M12; click a branch for the months it joined. */
function CohortPanel({ d, compare }: { d: ReportData; compare: boolean }) {
  const [drill, setDrill] = useState<string | null>(null)
  const branchName = (id: string) => d.operations.rooms.find((b) => b.id === id)?.name ?? id
  const rows = drill !== null || !compare
    ? d.cohortMonthly(drill).map((g) => ({ key: g.key, label: fmtMonthKey(g.key), sub: "", size: g.size, cells: g.cells, branch: "" }))
    : d.cohortByBranchYear.map((g) => { const [b, y] = g.key.split("|"); return { key: g.key, label: branchName(b), sub: String(Number(y) + 543), size: g.size, cells: g.cells, branch: b } })
  const months = Array.from({ length: 13 }, (_, n) => n)
  const avg = months.map((n) => { const xs = rows.filter((r) => r.cells[n] !== null); const size = xs.reduce((a, r) => a + r.size, 0); return size ? xs.reduce((a, r) => a + r.cells[n]! * r.size, 0) / size : null })
  return (
    <Panel title="Cohort Retention" hint={drill ? `${branchName(drill)} · แยกตามเดือนที่สมัคร` : compare ? "% นักเรียนที่ยังเรียนอยู่ N เดือนหลังสมัคร · สาขา × ปีที่สมัคร · กดสาขาเพื่อดูรายเดือน" : "% นักเรียนที่ยังเรียนอยู่ N เดือนหลังสมัคร · แยกตามเดือนที่สมัคร"}
      action={drill && <button type="button" className="text-xs text-primary" onClick={() => setDrill(null)}>‹ ทุกสาขา</button>}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0.5 text-xs">
            <thead className="text-muted-foreground"><tr><th className="px-1 text-left font-normal">Cohort</th><th className="px-1 text-right font-normal">คน</th>{months.map((n) => <th key={n} className="min-w-11 font-normal">M{n}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const first = i === 0 || rows[i - 1].branch !== r.branch || !r.branch
                return (
                  <tr key={r.key}>
                    <td className="px-1 whitespace-nowrap">
                      {r.branch ? (
                        <button type="button" className="flex w-full items-center gap-2 text-left hover:underline" onClick={() => setDrill(r.branch)}>
                          <span className={cn("min-w-20 text-sm", !first && "invisible")}>{r.label}</span><span className="text-muted-foreground">{r.sub}</span>
                        </button>
                      ) : <span className="text-sm">{r.label}</span>}
                    </td>
                    <td className="px-1 text-right text-muted-foreground tabular-nums">{r.size}</td>
                    {r.cells.map((c, n) => (
                      <td key={n} className={cn("h-7 rounded-md text-center tabular-nums", c !== null && c > 0.55 && "text-primary-foreground")} style={{ background: c === null ? "transparent" : tint(c) }}>{c === null ? "" : `${Math.round(c * 100)}%`}</td>
                    ))}
                  </tr>
                )
              })}
              <tr className="font-medium"><td className="px-1 pt-1">เฉลี่ยรวม</td><td className="px-1 text-right tabular-nums">{rows.reduce((a, r) => a + r.size, 0)}</td>{avg.map((c, n) => <td key={n} className="pt-1 text-center tabular-nums">{c === null ? "" : `${Math.round(c * 100)}%`}</td>)}</tr>
            </tbody>
          </table>
        </div>
      ) : <Empty>ยังไม่มีนักเรียนที่สมัครผ่านระบบ</Empty>}
    </Panel>
  )
}

const TH_MONTH_ABBR = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
const fmtMonthKey = (k: string) => `${TH_MONTH_ABBR[Number(k.slice(5, 7)) - 1]} ${(Number(k.slice(0, 4)) + 543) % 100}`

function CrmTab({ d, compare }: { d: ReportData; compare: boolean }) {
  const c = d.crm
  const enrolled = c.funnel[c.funnel.length - 1]
  const days = c.sources.map((x) => x.medianDays).filter((x): x is number => x !== null).sort((a, b) => a - b)
  const maxFunnel = Math.max(1, c.funnel[0].count)
  const lostTotal = c.lost.reduce((a, x) => a + x.count, 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Lead ใหม่" value={fmtNum(c.funnel[0].count)} />
        <Stat label="สมัครแล้ว" value={fmtNum(enrolled.count)} tone="text-emerald-600" />
        <Stat label="Conversion" value={fmtPct(enrolled.ofAll)} />
        <Stat label="วันถึงสมัคร (มัธยฐาน)" value={days.length ? `${days[Math.floor(days.length / 2)]} วัน` : "—"} />
        <Stat label="Lead ที่ยังเปิดอยู่" value={fmtNum(c.open)} sub={<Link href="/crm" className="text-primary">ตอนนี้ · ไปหน้า CRM ›</Link>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Funnel" hint="Lead ที่เข้ามาในช่วงนี้ · นับทุกขั้นที่ผ่านมาแล้ว" center>
          <ul className="space-y-2.5">
            {c.funnel.map((s, i) => (
              <li key={s.key} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-2 text-sm">
                <span>{s.label}</span>
                <div className="h-6 overflow-hidden rounded-md bg-muted"><div className="flex h-full items-center rounded-md px-2 text-xs text-primary-foreground tabular-nums" style={{ width: `${Math.max(4, (s.count / maxFunnel) * 100)}%`, background: tint(0.35 + (0.65 * (c.funnel.length - i)) / c.funnel.length) }}>{fmtNum(s.count)}</div></div>
                <span className="text-right text-xs text-muted-foreground tabular-nums">{i ? `${fmtPct(s.ofPrev)} ของขั้นก่อน` : "100%"}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Lead รายเดือน" hint={`ปี ${d.monthly.year + 543} เทียบปีที่แล้ว`}>
          <MonthBars thisYear={c.monthly.thisYear} lastYear={c.monthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} unit=" ราย" />
        </Panel>
      </div>
      <Panel title="Lead ที่หลุด" hint="ปิดไปที่ขั้นไหน · เพราะอะไร — ข้อมูลสำคัญ ดูก่อนแหล่งที่มา">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x">
          <div className="lg:pr-8"><DonutLegend keepOrder title="หลุดที่ขั้นไหน" parts={c.lost.map((x) => ({ label: x.label, value: x.count }))} center={fmtNum(lostTotal)} sub="Lead ที่หลุด" /></div>
          <div className="lg:pl-8"><DonutLegend title="เหตุผล" parts={c.lostReasons.map((x) => ({ label: x.reason, value: x.count }))} center={fmtNum(c.lostReasons.reduce((a, x) => a + x.count, 0))} sub="มีเหตุผล" /></div>
        </div>
        {(c.competitors.length > 0 || c.wantedTimes.length > 0) && (
          <div className="mt-6 grid gap-6 border-t pt-5 lg:grid-cols-2 lg:gap-0 lg:divide-x">
            <div className="lg:pr-8"><TopList title="ไปเรียนที่ไหนแทน" icon={<SchoolIcon className="size-4 text-muted-foreground" />} color="#64748b" rows={c.competitors.map((x) => ({ label: x.name, value: x.count }))} /></div>
            <div className="lg:pl-8"><TopList title="เวลาที่ลูกค้าต้องการแต่เราไม่มี" icon={<ClockIcon className="size-4 text-muted-foreground" />} color="#f59e0b" rows={c.wantedTimes.map((x) => ({ label: x.time, value: x.count }))} /></div>
          </div>
        )}
      </Panel>
      <Panel title="แหล่งที่มา (Source)" hint="เรียงตามจำนวนที่สมัคร · รายได้ = เงินที่นักเรียนจาก Lead เหล่านี้จ่ายมาแล้วทั้งหมด">
        {c.sources.length ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">แหล่ง</th><th className="text-right font-normal">Lead</th><th className="text-right font-normal">สมัคร</th><th className="w-1/4 px-2 text-left font-normal">Conversion</th><th className="text-right font-normal">วันถึงสมัคร</th><th className="text-right font-normal">รายได้</th></tr></thead>
            <tbody>{c.sources.map((x, i) => (
              <tr key={x.source} className="border-t">
                <td className="py-1.5"><span className="flex items-center gap-2"><Rank n={i + 1} />{LEAD_SOURCE_LABEL[x.source as keyof typeof LEAD_SOURCE_LABEL] ?? x.source}</span></td>
                <td className="text-right tabular-nums">{x.leads}</td>
                <td className="text-right text-emerald-600 tabular-nums">{x.enrolled}</td>
                <td className="px-2"><span className="flex items-center gap-2"><ShareBar value={x.conversion ?? 0} /><span className="w-10 text-right text-xs tabular-nums">{fmtPct(x.conversion)}</span></span></td>
                <td className="text-right text-muted-foreground tabular-nums">{x.medianDays === null ? "—" : `${x.medianDays} วัน`}</td>
                <td className="text-right tabular-nums">{fmtShort(x.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty />}
      </Panel>
      {compare && (
        <Panel title="แยกตามสาขา" hint="Lead · สมัคร · Conversion">
          <SplitRanks rows={[...c.perBranch].sort((a, b) => b.enrolled - a.enrolled)} cols={[
            { label: "Lead", cell: (b) => b.leads },
            { label: "สมัคร", cell: (b) => <span className="text-emerald-600">{b.enrolled}</span> },
            { label: "%", cell: (b) => fmtPct(b.conversion) },
          ]} />
        </Panel>
      )}
    </div>
  )
}

// ---------------- Satisfaction (yearly parent survey) ----------------

const CONT = { yes: "เรียนต่อ", maybe: "ยังไม่แน่ใจ", no: "ไม่เรียนต่อ" } as const

/** Yearly parent survey (owner 2026-10-05): NPS vs last year, by branch, weakest topics, teachers, wishes, who to call. */
function SatisfactionTab({ d, compare }: { d: ReportData; compare: boolean }) {
  const [year, setYear] = useState<number | null>(d.surveyYears[0] ?? null)
  const [showAllCalls, setShowAllCalls] = useState(false)
  const families = useStore((st) => st.families)
  const branches = useStore((st) => st.branches)
  const staff = useStore((st) => st.staff)
  if (year === null) return <Empty>ยังไม่เคยส่งแบบสอบถามความพึงพอใจ — ส่งได้ที่ Settings › ระบบ</Empty>
  const cur = d.surveyOf(year), prev = d.surveyOf(year - 1)
  const s = cur.summary, p = prev.summary
  const topics = Survey.topicRanking(s)
  const prevTopic = (k: string) => Survey.topicRanking(p).find((x) => x.key === k)?.score ?? null
  const unhappy = cur.responses.filter((r) => Survey.isUnhappy(r.answers)).sort((a, b) => Number(!!a.followUp) - Number(!!b.followUp) || a.submittedAt.localeCompare(b.submittedAt))
  const fam = (id: string) => families.find((f) => f.id === id)?.name ?? "—"
  const comments = cur.responses.flatMap((r) => [r.answers.praise && { k: `${r.id}p`, text: r.answers.praise, good: true, r }, r.answers.improve && { k: `${r.id}i`, text: r.answers.improve, good: false, r }].filter(Boolean) as { k: string; text: string; good: boolean; r: (typeof cur.responses)[number] }[])
  const dNps = s.nps !== null && p.nps !== null ? s.nps - p.nps : null
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">ปี</span>
        {d.surveyYears.map((y) => <button key={y} type="button" onClick={() => setYear(y)} className={cn("rounded-full border px-3 py-1 text-xs", y === year ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted")}>{y + 543}</button>)}
        {cur.campaign && <span className="ml-auto text-xs text-muted-foreground">ส่ง {fmtDate(cur.campaign.sentAt.slice(0, 10))} · ปิดรับ {fmtDate(cur.campaign.to)} · ไม่ขึ้นกับช่วงเวลาด้านบน</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="NPS" value={s.nps === null ? "—" : `${s.nps > 0 ? "+" : ""}${s.nps}`} tone={s.nps !== null && s.nps < 0 ? "text-red-600" : "text-emerald-600"} sub={dNps === null ? <span>ปีก่อน —</span> : <span className={dNps >= 0 ? "text-emerald-600" : "text-red-600"}>{dNps >= 0 ? "▲" : "▼"} {Math.abs(dNps)} จากปีก่อน ({p.nps})</span>} />
        <Stat label="ตอบแล้ว" value={`${s.responses}/${s.sent}`} sub={<span>{fmtPct(s.rate)}</span>} />
        <Stat label="พอใจโดยรวม" value={s.overall === null ? "—" : s.overall.toFixed(1)} sub={<span>ปีก่อน {p.overall === null ? "—" : p.overall.toFixed(1)}</span>} />
        <Stat label="ปีหน้าเรียนต่อ" value={s.responses ? fmtPct(s.continueNext.yes / s.responses) : "—"} sub={<span>ไม่แน่ใจ {s.continueNext.maybe} · ไม่ต่อ {s.continueNext.no}</span>} />
        <Stat label="ไม่พอใจ" value={String(s.unhappy)} tone={s.unhappy ? "text-red-600" : undefined} sub={<span>แนะนำ 0–6 หรือไม่เรียนต่อ</span>} />
        <Stat label="ยังไม่ได้โทร" value={String(cur.toCall.length)} tone={cur.toCall.some((x) => x.overdue) ? "text-red-600" : undefined} sub={<span>เกิน 3 วัน {cur.toCall.filter((x) => x.overdue).length}</span>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="หัวข้อ (เฉลี่ย 1–5)" hint="ต่ำสุดอยู่บน = ควรปรับก่อน · ตัวเลขเล็ก = ปีก่อน" fill>
          {topics.length ? (
            <ul className="space-y-2 text-sm">{topics.map((t) => { const pv = prevTopic(t.key); return (
              <li key={t.key} className="grid grid-cols-[minmax(0,10rem)_1fr_5rem] items-center gap-2">
                <span className="truncate">{t.label}</span>
                <ShareBar value={(t.score! - 1) / 4} color={t.score! < 3.5 ? "#dc2626" : t.score! < 4 ? "#f59e0b" : "#10b981"} />
                <span className="text-right tabular-nums">{t.score!.toFixed(1)}{pv !== null && <span className="ml-1 text-[11px] text-muted-foreground">{pv.toFixed(1)}</span>}</span>
              </li>
            ) })}</ul>
          ) : <Empty />}
        </Panel>
        {compare ? (
          <Panel title="NPS ตามสาขา" hint="ตัวเลขเล็ก = ปีก่อน · (ตอบ/ส่ง)" fill>
            <SplitRanks rows={[...cur.byBranch].sort((a, b) => (b.nps ?? -999) - (a.nps ?? -999))} cols={[
              { label: "NPS", cell: (b) => <span className={cn("font-medium", b.nps !== null && b.nps < 0 && "text-red-600")}>{b.nps === null ? "—" : `${b.nps > 0 ? "+" : ""}${b.nps}`}<span className="ml-1 text-[11px] font-normal text-muted-foreground">{prev.byBranch.find((x) => x.id === b.id)?.nps ?? "—"}</span></span> },
              { label: "ตอบ", cell: (b) => <span className="text-xs text-muted-foreground">{b.n}/{b.sent}</span> },
            ]} />
          </Panel>
        ) : (
          <Panel title="คะแนนแนะนำเพื่อน (0–10)" hint="แนะนำ 9–10 · เฉยๆ 7–8 · ไม่แนะนำ 0–6" center>
            {(() => { const v = cur.responses.map((r) => r.answers.nps).filter((x): x is number => x !== null); const pro = v.filter((x) => x >= 9).length, pas = v.filter((x) => x >= 7 && x <= 8).length, det = v.filter((x) => x <= 6).length; const n = Math.max(1, v.length); return (
              <div className="space-y-2">
                <div className="flex h-4 overflow-hidden rounded-full"><span className="bg-emerald-500" style={{ width: `${(pro / n) * 100}%` }} /><span className="bg-amber-400" style={{ width: `${(pas / n) * 100}%` }} /><span className="bg-red-500" style={{ width: `${(det / n) * 100}%` }} /></div>
                <div className="flex justify-between text-xs"><span className="text-emerald-700">แนะนำ {pro}</span><span className="text-amber-700">เฉยๆ {pas}</span><span className="text-red-700">ไม่แนะนำ {det}</span></div>
              </div>
            ) })()}
          </Panel>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="คะแนนครู (จากผู้ปกครอง)" hint="เฉลี่ยข้อ “ครูผู้สอน” ของเด็กที่ครูสอน · ครูเห็นแค่ค่าเฉลี่ยของตัวเอง ไม่เห็นว่าใครให้" fill>
          {cur.teachers.length ? (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">ครู</th>{compare && <th className="text-left font-normal">สาขา</th>}<th className="text-right font-normal">คะแนน</th><th className="text-right font-normal">จำนวน</th></tr></thead>
              <tbody>{cur.teachers.map((t) => (
                <tr key={t.teacherId} className="border-t">
                  <td className="py-1.5">{t.staff?.nickname ?? "—"}</td>
                  {compare && <td className="text-muted-foreground">{(t.staff?.branchIds ?? []).map((id) => branches.find((b) => b.id === id)?.name).filter(Boolean).join(", ")}</td>}
                  <td className={cn("text-right font-medium tabular-nums", t.score < 3.5 && "text-red-600")}>{t.score.toFixed(1)}</td>
                  <td className="text-right text-muted-foreground tabular-nums">{t.ratings}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <Empty>ยังไม่มีคะแนนครู (นักเรียนที่ตอบยังไม่อยู่ในคลาส)</Empty>}
        </Panel>
        <Panel title="อยากให้เปิดเพิ่ม" hint="วิชา / เวลา ที่ผู้ปกครองขอ" fill>
          <TopList title="ผู้ปกครองขอ" icon={<SparklesIcon className="size-4 text-muted-foreground" />} color="#f59e0b" top={8} fill rows={cur.wants.map((w) => ({ label: w.want, value: w.count }))} />
        </Panel>
      </div>
      {/* outcome only (owner 2026-10-05: Reports show what's done — the calls themselves are on CRM) */}
      <Panel title="ผลการติดตามผู้ปกครองที่ไม่พอใจ" hint={`${unhappy.length} ครอบครัว · โทรแล้ว ${unhappy.filter((r) => r.followUp).length} · รอโทร ${unhappy.filter((r) => !r.followUp).length} (รายชื่อที่ต้องโทรอยู่หน้า CRM)`}>
        {unhappy.some((r) => r.followUp) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">ครอบครัว</th>{compare && <th className="text-left font-normal">สาขา</th>}<th className="px-3 text-right font-normal">แนะนำ</th><th className="px-3 text-left font-normal">ปีหน้า</th><th className="px-3 text-left font-normal">โทรโดย</th><th className="text-left font-normal">ผลการคุย</th></tr></thead>
              <tbody>{unhappy.filter((r) => r.followUp).slice(0, showAllCalls ? undefined : 10).map((r) => (
                <tr key={r.id} className="border-t align-middle [&>td]:py-2">
                  <td>{fam(r.familyId)}</td>
                  {compare && <td className="text-muted-foreground">{branches.find((b) => b.id === r.branchId)?.name}</td>}
                  <td className="px-3 text-right text-red-600 tabular-nums">{r.answers.nps ?? "—"}/10</td>
                  <td className="px-3 whitespace-nowrap">{r.answers.continueNext ? CONT[r.answers.continueNext] : "—"}</td>
                  <td className="px-3 whitespace-nowrap text-muted-foreground">{staff.find((x) => x.id === r.followUp!.by)?.nickname} · {fmtDate(r.followUp!.at.slice(0, 10))}</td>
                  <td>{r.followUp!.note}</td>
                </tr>
              ))}</tbody>
            </table>
            {unhappy.filter((r) => r.followUp).length > 10 && <button type="button" onClick={() => setShowAllCalls((o) => !o)} className="mt-2 text-xs text-primary hover:underline">{showAllCalls ? "ย่อเหลือ 10 รายการ" : `ดูทั้งหมด ${unhappy.filter((r) => r.followUp).length} รายการ`}</button>}
          </div>
        ) : <Empty>{unhappy.length ? "ยังไม่มีการโทรที่บันทึกไว้" : "ไม่มีผู้ปกครองที่ไม่พอใจในปีนี้"}</Empty>}
      </Panel>
      <Panel title="ความเห็นจากผู้ปกครอง" hint={`${comments.length} ข้อความ`}>
        {comments.length ? (
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x">
            {[true, false].map((good, c) => (
              <div key={String(good)} className={c ? "lg:pl-6" : "lg:pr-6"}>
                <TopList title={good ? "ประทับใจ" : "อยากให้ปรับปรุง"} icon={<span className={cn("size-2.5 rounded-full", good ? "bg-emerald-500" : "bg-amber-500")} />} color={good ? "#10b981" : "#f59e0b"} wide
                  rows={groupComments(comments.filter((x) => x.good === good).map((x) => x.text))} />
              </div>
            ))}
          </div>
        ) : <Empty />}
      </Panel>
    </div>
  )
}

/** Same comment from many families → one row with a count (the survey has many identical short answers) */
function groupComments(texts: string[]) {
  const m = new Map<string, number>()
  for (const t of texts) { const k = t.trim(); m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].map(([label, value]) => ({ label: `“${label}”`, value })).sort((a, b) => b.value - a.value)
}

// ---------------- Needs attention ----------------

