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
import { addDays, fmtDate, fmtMoney, monthShort, toDateStr, weekdayShort, yearOf } from "@/domain/dates"
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
import { tx, uiLang, nm, sj } from "@/lib/i18n"

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
  const periodLabel = period === "custom" ? `${fmtDate(d.range.from)} – ${fmtDate(d.range.to)}` : tx(PERIODS.find((p) => p.key === period)!.label)
  const scopeLabel = branchIds.length === 1 ? nm(branches.find((b) => b.id === branchIds[0])?.name ?? "") : allowed.length === branches.length ? tx("ทุกสาขา") : tx("สาขาในเขต")
  const showCompare = compare && branchIds.length > 1

  if (!can(me, "reports.view")) return <Empty>{tx("Reports ดูได้เฉพาะ Director / Area Manager / Manager")}</Empty>

  const exportXlsx = async () => {
    try {
      await downloadReports(d, { scope: scopeLabel, periodLabel, compare: showCompare, nameOf: (id) => students.find((x) => x.id === id)?.nickname ?? id, branchOf: (id) => branches.find((b) => b.id === id)?.name ?? "" })
      report({ ok: true, value: undefined }, tx("ดาวน์โหลด Reports (.xlsx) แล้ว"))
    } catch (e) { report({ ok: false, error: tx("สร้างไฟล์ไม่สำเร็จ — {0}", [(e as Error).message]) }, "") }
  }

  return (
    <div className="space-y-5 print:space-y-3">
      <title>Reports · NockERP</title>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><ChartColumnIcon className="size-5" /></span>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-xs text-muted-foreground">{scopeLabel} · {periodLabel}{period !== "custom" && ` ${fmtDate(d.range.from)} – ${fmtDate(d.range.to)}`}  {tx("· เทียบ")} {fmtDate(d.prev.from, { year: d.prev.from.slice(0, 4) !== d.range.from.slice(0, 4) })} – {fmtDate(d.prev.to, { year: d.prev.to.slice(0, 4) !== d.range.to.slice(0, 4) })}  {tx("· ข้อมูลจริงจากใบแจ้งหนี้ที่จ่ายแล้ว แพ็กเกจ และการเช็คชื่อ")}</p>
        </div>
        {allowed.length > 1 && (
          <NativeSelect className="h-9 w-48 print:hidden" value={scope} onChange={(e) => setScope(e.target.value)}
            options={[{ value: "all", label: allowed.length === branches.length ? tx("ทุกสาขา") : tx("ทุกสาขาในเขต") }, ...branches.filter((b) => allowed.includes(b.id)).map((b) => ({ value: b.id, label: nm(b.name) }))]} />
        )}
        <Button variant="outline" className="print:hidden" onClick={exportXlsx}><DownloadIcon /> Export .xlsx</Button>
        <Button variant="outline" className="print:hidden" onClick={() => window.print()}><PrinterIcon /> PDF</Button>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={BanknoteIcon} label={tx("รายได้ · {0}", [periodLabel])} value={fmtNum(d.kpi.revenue)} sub={<><Delta value={d.kpi.revenueChange} /> <span>{tx(COMPARE_LABEL[period])}</span></>} />
        <Kpi icon={UsersIcon} label={tx("นักเรียน Active")} value={fmtNum(d.kpi.active)} sub={<><Delta value={d.kpi.activeChange} /> <span>{tx("vs ต้นช่วง · Pause")} {d.kpi.paused}</span></>} />
        <Kpi icon={CalendarDaysIcon} label={tx("คาบสัปดาห์นี้")} value={fmtNum(d.kpi.weekSessions)} sub={<span>{tx("ไม่นับคาบที่ยกเลิก")}</span>} />
        <Kpi icon={UserCheckIcon} label={tx("อัตราเข้าเรียน · {0}", [periodLabel])} value={fmtPct(d.kpi.attendance)} sub={<><Delta value={d.kpi.attendanceChange} /> <span>{tx("มา ÷ (มา + ลา)")}</span></>} />
        <AttentionButton count={d.kpi.attention} onClick={() => setShowAttention(true)} className="col-span-2 md:col-span-1" />
      </div>

      <div className="space-y-3 print:hidden">
        <div className="inline-flex flex-wrap rounded-full bg-muted p-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 rounded-full px-4 py-1 text-sm", tab === t.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
              {t.id === "summary" && <SparklesIcon className={cn("size-4", tab === t.id ? "text-violet-600" : "")} />}
              {tx(t.label)}{t.soon && <span className="ml-1 text-[10px] text-muted-foreground">{t.soon}</span>}
            </button>
          ))}
        </div>
        {/* owner 2026-10-05: periods on their own row — rolling · to-date · complete-period comparisons · custom dates */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {(["rolling", "todate", "compare"] as const).map((g, gi) => (
            <div key={g} className={cn("flex flex-wrap items-center gap-1.5", gi > 0 && "border-l pl-3")}>
              {PERIODS.filter((p) => p.group === g).map((p) => (
                <button key={p.key} type="button" title={tx(p.hint)} onClick={() => setPeriod(p.key)}
                  className={cn("rounded-full border px-3 py-1 text-xs", period === p.key ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted")}>{p.short}</button>
              ))}
            </div>
          ))}
          <div className={cn("flex flex-wrap items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-3 text-xs", period === "custom" ? "border-primary bg-primary/10" : "bg-card")}>
            <button type="button" title={tx(PERIODS.find((p) => p.key === "custom")!.hint)} onClick={() => setPeriod("custom")} className={cn("flex items-center gap-1.5", period === "custom" && "font-medium text-primary")}><CalendarRangeIcon className="size-3.5" />  {tx("กำหนดเอง")}</button>
            <input type="date" aria-label={tx("ตั้งแต่วันที่")} value={custom.from} max={today} onChange={(e) => { if (e.target.value) { setCustom((c) => ({ ...c, from: e.target.value })); setPeriod("custom") } }} className="h-6 rounded-full bg-background px-2 tabular-nums" />
            <span className="text-muted-foreground">–</span>
            <input type="date" aria-label={tx("ถึงวันที่")} value={custom.to} max={today} onChange={(e) => { if (e.target.value) { setCustom((c) => ({ ...c, to: e.target.value })); setPeriod("custom") } }} className="h-6 rounded-full bg-background px-2 tabular-nums" />
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
      {TABS.find((t) => t.id === tab)?.soon && <Empty>{tx("แท็บนี้อยู่ในรอบ")} {TABS.find((t) => t.id === tab)!.soon}  {tx("— คุยสเปกแล้ว ยังไม่ได้สร้าง")}</Empty>}

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
            <p className="text-xs text-muted-foreground">{tx(p.label)}</p>
            <p className="text-lg font-semibold tabular-nums">{fmtNum(p.value)}</p>
            <p className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground"><Delta value={p.change} /> {tx(p.vs)}</p>
            <p className="text-[10px] text-muted-foreground">{fmtDate(p.range.from)} – {fmtDate(p.range.to)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tx("รายได้รายเดือน")} hint={tx("ปี {0} เทียบปีที่แล้ว · ลายทาง = คาดการณ์ (ต่อคอร์ส {1} + ใบที่รอจ่าย)", [yearOf(d.monthly.year), fmtPct(d.forecast.renewal)])}>
          <MonthBars thisYear={d.monthly.thisYear} lastYear={d.monthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} forecast={d.forecast.byMonth.map((x) => x?.total ?? null)}
            currentLastYearToDate={d.monthly.lastYearToDate} todayLabel={`${Number(d.today.slice(8)) === 1 ? "" : "1–"}${Number(d.today.slice(8))} ${fmtDate(d.today).split(" ")[1] ?? ""}`} />
        </Panel>
        {compare ? (
          <Panel title={tx("รายได้ตามสาขา")} hint={`Top 10 · ${periodLabel}`} action={<button type="button" className="text-xs text-primary" onClick={onAllRevenue}>{tx("ดูทั้งหมด ›")}</button>}>
            <BranchRevenue rows={d.byBranch.slice(0, 10)} />
          </Panel>
        ) : (
          <Panel title={tx("ประเภทรายได้")} hint={tx("ค่าเรียน · ค่ารถ · ค่าธรรมเนียม · หนังสือ")}><RevenueParts d={d} /></Panel>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Subject Engine" hint={tx("รายได้ค่าเรียนแยกวิชา · คอร์สหลายวิชาแบ่งเท่าๆ กัน")} center><SubjectEngine d={d} /></Panel>
        <Panel title={tx("ครอบครัว Top 5")} hint={tx("ยอดในช่วงนี้ · อายุลูกค้านับจากใบแรก")} action={<button type="button" className="text-xs text-primary" onClick={onAllRevenue}>{tx("ดูทั้งหมด ›")}</button>}>
          <Families rows={d.families.slice(0, 5)} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Demand Heatmap" hint={tx("จำนวนนักเรียนในคาบ · วัน × เวลาเริ่ม · 08:00–21:00")} fill
          action={<NativeSelect className="h-8 w-36" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tx("ทุกวิชา")}
            options={[...new Set(d.bySubject.map((x) => x.subject))].map((x) => ({ value: x, label: sj(x) }))} />}>
          <Heatmap rows={demand.hours} cols={DAYS} rowLabel={(h) => `${String(h).padStart(2, "0")}:00`} colLabel={(w) => weekdayShort(w)} value={(h, w) => demand.count(w, h)} />
        </Panel>
        <Panel title={tx("แพ็กเกจขายดี")} hint={tx("จำนวน (Volume) vs รายได้ (Value)")} fill><PackageMix d={d} /></Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Net Growth" hint={tx("เข้า = ใหม่ + กลับมาเรียน · Net = เข้า − Lost")} action={<button type="button" className="text-xs text-primary" onClick={onAllStudents}>{tx("ดูทั้งหมด ›")}</button>}>
          <SummaryStrip items={[[tx("ใหม่"), `+${d.studentFlow.newCount}`, "text-emerald-600"], [tx("กลับมาเรียน"), `+${d.studentFlow.returning}`, "text-emerald-600"], ["Lost", `−${d.studentFlow.lost}`, "text-red-600"], ["Net", `${net > 0 ? "+" : ""}${net}`, net < 0 ? "text-red-600" : ""], [tx("ต่อคอร์ส"), fmtPct(d.studentFlow.renewal), ""]]} />
          {compare && (
            <SplitRanks rows={[...d.perBranch].sort((a, b) => (b.newCount + b.returning - b.lost) - (a.newCount + a.returning - a.lost))} cols={[
              { label: tx("เข้า"), cell: (b) => <span className="text-emerald-600">+{b.newCount + b.returning}</span> },
              { label: "Lost", cell: (b) => <span className="text-red-600">−{b.lost}</span> },
              { label: "Net", cell: (b) => { const n = b.newCount + b.returning - b.lost; return <span className={cn("font-medium", n < 0 && "text-red-600")}>{n > 0 ? "+" : ""}{n}</span> } },
            ]} />
          )}
        </Panel>
        <Panel title="Churn Split" hint={tx("Lost = หมดแพ็กแล้วไม่ต่อใน 30 วัน · Pause = เริ่มลาพักยาวในช่วงนี้")}>
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
            <tr><th className="text-left font-normal">{tx("สาขา")}</th>{cols.map((x) => <th key={x.label} className="text-right font-normal">{x.label}</th>)}</tr>
          </thead>
          <tbody>{list.map((r, i) => (
            <tr key={r.id} className="border-t">
              <td className="py-1.5"><span className="flex items-center gap-2"><Rank n={c * half + i + 1} /><span className="truncate">{nm(r.name)}</span></span></td>
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
          <thead className={cn("text-xs text-muted-foreground", c > 0 && "max-md:hidden")}><tr><th className="text-left font-normal">{tx("สาขา")}</th><th /><th className="text-right font-normal">{tx("ยอด")}</th><th className="text-right font-normal">%</th></tr></thead>
          <tbody>{list.map((b, i) => (
            <tr key={b.id} className="border-t">
              <td className="py-2"><span className="flex items-center gap-2"><Rank n={c * half + i + 1} /><span className="truncate">{nm(b.name)}</span></span></td>
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
  const parts = [[tx("ค่าเรียน"), d.rev.tuition, d.revPrev.tuition], [tx("ค่ารถ"), d.rev.bus, d.revPrev.bus], [tx("ค่าแรกเข้า / ค่าธรรมเนียม"), d.rev.advance, d.revPrev.advance], [tx("ค่าหนังสือ"), d.rev.book, d.revPrev.book], [tx("ใบลดหนี้ (หัก)"), -d.rev.credit, -d.revPrev.credit]] as const
  return (
    <ul className="divide-y text-sm">
      {parts.map(([label, now, before]) => (
        <li key={label} className="flex items-center gap-2 py-2">
          <span className="flex-1">{label}</span>
          <span className={cn("tabular-nums", now < 0 && "text-red-600")}>{fmtMoney(now)}</span>
          <span className="w-16 text-right"><Delta value={d.comparable && before ? Math.round(((now - before) / Math.abs(before)) * 1000) / 10 : null} invert={label.startsWith("ใบลดหนี้")} /></span>
        </li>
      ))}
      <li className="flex items-center gap-2 py-2 font-semibold"><span className="flex-1">{tx("รวม")}</span><span className="tabular-nums">{fmtMoney(d.rev.total)}</span><span className="w-16" /></li>
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
            <span className="flex items-center gap-1.5 truncate"><span className="size-2 shrink-0 rounded-full" style={{ background: donutColor(i) }} />{sj(x.subject)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{fmtPct(x.share)}</span>
            <ShareBar value={x.share} color={donutColor(i)} />
            <span className="text-right tabular-nums">{fmtShort(x.amount)}</span>
          </li>
        ))}
      </ul>
      <Donut parts={d.bySubject.map((x) => ({ label: sj(x.subject), value: x.amount }))} center={fmtShort(total)} sub={tx("ค่าเรียนทุกวิชา")} />
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
              <thead className={cn("text-xs text-muted-foreground", c > 0 && "max-lg:hidden")}><tr><th className="text-left font-normal">{tx("ครอบครัว")}</th><th className="text-right font-normal">{tx("อายุลูกค้า")}</th><th className="text-right font-normal">{tx("ยอด")}</th><th className="text-right font-normal">{tx("ใบ")}</th><th className="text-right font-normal">{tx("ลูก")}</th></tr></thead>
              <tbody>{part.map((f, i) => (
                <tr key={f.key} className="border-t">
                  <td className="py-1.5"><span className="flex items-center gap-2"><Rank n={c * half + i + 1} /><span className="truncate">{nm(f.name)}</span></span></td>
                  <td className="w-20 text-right text-muted-foreground tabular-nums">{f.tenureMonths}  {tx("ด.")}</td>
                  <td className="w-20 text-right tabular-nums">{fmtShort(f.amount)}</td>
                  <td className="w-10 text-right tabular-nums">{f.invoices}</td>
                  <td className="w-10 text-right tabular-nums">{f.kids}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
      </div>
      {split && rows.length > 20 && <button type="button" onClick={() => setOpen((o) => !o)} className="mt-3 text-xs text-primary hover:underline">{open ? tx("ย่อเหลือ 20 อันดับ") : tx("ดูทั้งหมด {0} ครอบครัว", [rows.length])}</button>}
    </div>
  )
}

/** "10h" → "10 ชม." / "10 hrs" / "10時間" (same keys as packageLabel, in the chosen language) */
const pkgName = (key: string) => { const m = key.match(/^(\d+)([hwm])$/); return m ? tx({ h: tx("{0} ชม."), w: tx("{0} สัปดาห์"), m: tx("{0} เดือน") }[m[2] as "h" | "w" | "m"], [m[1]]) : key }

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
          {groups.map((g, i) => <div key={g.suffix} style={{ width: `${g.share * 100}%`, background: donutColor(i) }} title={`${tx(g.label)} ${fmtPct(g.share)}`} />)}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {groups.map((g, i) => <span key={g.suffix} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: donutColor(i) }} />{uiLang() === "th" ? g.label.split(" ")[0] : tx(g.label)} <b className="font-medium text-foreground tabular-nums">{fmtPct(g.share)}</b></span>)}
        </div>
      </div>
      <table className="w-full flex-1 border-separate border-spacing-0.5 text-sm">
        <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("แพ็กเกจ")}</th><th className="font-normal">{tx("จำนวน")}</th><th className="font-normal">{tx("รายได้")}</th><th className="text-right font-normal">%Mix</th></tr></thead>
        {groups.map((g, i) => (
          <tbody key={g.suffix}>
            <tr className="font-medium">
              <td className="pt-2 pb-1"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: donutColor(i) }} />{tx(g.label)}</span></td>
              <td className="pt-2 pb-1 text-center tabular-nums">{fmtNum(g.units)}</td>
              <td className="pt-2 pb-1 text-center tabular-nums">{fmtShort(g.amount)}</td>
              <td className="pt-2 pb-1 text-right tabular-nums">{fmtPct(g.share)}</td>
            </tr>
            {g.list.map((x) => (
              <tr key={x.key}>
                <td className="py-0.5 pl-3.5 text-muted-foreground">{pkgName(x.key)}</td>
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
        <Stat label={tx("รายได้รวม")} value={fmtShort(d.rev.total)} />
        <Stat label={tx("ใบแจ้งหนี้ที่จ่ายแล้ว")} value={fmtNum(d.rev.invoices)} sub={<Delta value={d.comparable && d.revPrev.invoices ? Math.round(((d.rev.invoices - d.revPrev.invoices) / d.revPrev.invoices) * 1000) / 10 : null} />} />
        <Stat label={tx("นักเรียนที่จ่าย")} value={fmtNum(d.rev.students)} />
        <Stat label={tx("เฉลี่ยต่อใบ")} value={fmtShort(d.rev.invoices ? d.rev.total / d.rev.invoices : 0)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ForecastPanel d={d} />
        <Panel title={tx("รายได้รายเดือน")} hint={tx("ปี {0} เทียบปีที่แล้ว", [yearOf(d.monthly.year)])} fill>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("เดือน")}</th><th className="text-right font-normal">{tx("ปีนี้")}</th><th className="text-right font-normal">{tx("ปีที่แล้ว")}</th><th className="text-right font-normal">{tx("เปลี่ยนแปลง")}</th></tr></thead>
              <tbody>{TH_MONTHS.map((m, i) => {
                const a = d.monthly.thisYear[i], b = d.monthly.lastYear[i]
                if (a === null && !b) return null
                return (
                  <tr key={m} className="border-t">
                    <td className="py-1.5">{tx(m)}</td>
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
        <Panel title={tx("ประเภทรายได้")} hint={`${periodLabel} ${tx(COMPARE_LABEL[period])}`}><RevenueParts d={d} /></Panel>
        <Panel title="Subject Engine" hint={tx("รายได้ค่าเรียนแยกวิชา")} center><SubjectEngine d={d} /></Panel>
      </div>
      {compare && <Panel title={tx("รายได้ตามสาขา")} hint={tx("ทุกสาขาในขอบเขต")}><BranchRevenue rows={d.byBranch} /></Panel>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tx("แพ็กเกจขายดี")} hint={tx("จำนวน (Volume) vs รายได้ (Value)")} fill><PackageMix d={d} /></Panel>
        <Panel title={tx("แพ็กเกจ × ระดับชั้น")} hint={tx("จำนวนแพ็กที่แต่ละชั้นซื้อ")} fill>
          {pg.grades.length ? <Heatmap rows={pg.grades} cols={pg.keys} rowLabel={(g) => nm(g)} colLabel={(k) => pkgName(k)} value={(g, k) => pg.count(g, k)} corner={tx("ชั้น")} /> : <Empty />}
        </Panel>
      </div>
      <Panel title={tx("ครอบครัวทั้งหมด")} hint={tx("{0} ครอบครัวที่จ่ายในช่วงนี้", [d.families.length])}>
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
        <Stat label={tx("Active วันนี้")} value={fmtNum(d.kpi.active)} />
        <Stat label={tx("Pause (ลาพักยาว)")} value={fmtNum(d.kpi.paused)} tone="text-amber-600" />
        <Stat label={tx("ใหม่")} value={`+${f.newCount}`} tone="text-emerald-600" sub={<Delta value={d.comparable && f.newPrev ? Math.round(((f.newCount - f.newPrev) / f.newPrev) * 1000) / 10 : null} />} />
        <Stat label={tx("กลับมาเรียน")} value={`+${f.returning}`} tone="text-emerald-600" />
        <Stat label="Lost" value={`−${f.lost}`} tone="text-red-600" sub={<Delta value={d.comparable && f.lostPrev ? Math.round(((f.lost - f.lostPrev) / f.lostPrev) * 1000) / 10 : null} invert />} />
        <Stat label="Net" value={`${net > 0 ? "+" : ""}${net}`} tone={net < 0 ? "text-red-600" : undefined} />
        <Stat label={tx("อัตราต่อคอร์ส")} value={fmtPct(f.renewal)} sub={<span>{tx("ก่อนหน้า")} {d.comparable ? fmtPct(f.renewalPrev) : "—"}</span>} />
      </div>
      <Panel title={tx("นักเรียน Active รายเดือน")} hint={tx("นับ ณ สิ้นเดือน (เดือนนี้ = วันนี้)")}>
        <MonthBars thisYear={d.activeMonthly.thisYear} lastYear={d.activeMonthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} unit={tx(" คน")} />
      </Panel>
      {compare && (
        <Panel title={tx("แยกตามสาขา")}>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("สาขา")}</th><th className="text-right font-normal">Active</th><th className="text-right font-normal">{tx("ใหม่")}</th><th className="text-right font-normal">{tx("กลับมา")}</th><th className="text-right font-normal">Lost</th><th className="text-right font-normal">Pause</th><th className="text-right font-normal">Net</th></tr></thead>
            <tbody>{d.perBranch.map((b) => {
              const n = b.newCount + b.returning - b.lost
              return (
                <tr key={b.id} className="border-t">
                  <td className="py-1.5">{nm(b.name)}</td><td className="text-right tabular-nums">{b.active}</td>
                  <td className="text-right text-emerald-600 tabular-nums">+{b.newCount}</td><td className="text-right text-emerald-600 tabular-nums">+{b.returning}</td>
                  <td className="text-right text-red-600 tabular-nums">−{b.lost}</td><td className="text-right text-amber-600 tabular-nums">{b.pauses}</td>
                  <td className={cn("text-right font-medium tabular-nums", n < 0 && "text-red-600")}>{n > 0 ? "+" : ""}{n}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </Panel>
      )}
      <Panel title={tx("ความเคลื่อนไหวนักเรียน")} hint={tx("{0} รายการในช่วงนี้ · ล่าสุดอยู่บน · กดชื่อเพื่อเปิดข้อมูลนักเรียน", [events.length])}>
        {events.length ? (
          <div className="grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x">
            {(["new", "returning", "lost"] as const).map((kind, c) => (
              <div key={kind} className={cn(c > 0 && "md:pl-6", c < 2 && "md:pr-6")}>
                <MoveList title={kind === "new" ? tx("ใหม่") : kind === "returning" ? tx("กลับมาเรียน") : "Lost"} tone={kind === "lost" ? "text-red-600" : "text-emerald-600"}
                  rows={events.filter((e) => e.kind === kind).map((e) => ({ id: e.studentId, date: e.date, name: nm(name(e.studentId)?.nickname ?? "—"), grade: name(e.studentId)?.grade ?? "" }))} onOpen={onOpen} />
              </div>
            ))}
          </div>
        ) : <Empty />}
      </Panel>
      <ExitPanelReport d={d} />
      <CohortPanel d={d} compare={compare} />
      <p className="text-xs text-muted-foreground">{tx("นักเรียนที่ Import จากระบบเดิมไม่นับเป็น \"ใหม่\" และไม่อยู่ใน Cohort (ไม่รู้วันที่เริ่มเรียนจริง)")}</p>
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
            <button type="button" className="truncate text-left hover:underline" onClick={() => onOpen(r.id)}>{nm(r.name)}</button>
            <span className="text-right text-xs text-muted-foreground">{nm(r.grade)}</span>
          </li>
        ))}</ul>
      ) : <p className="text-xs text-muted-foreground">{tx("ไม่มี")}</p>}
      {rows.length > 10 && <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-xs text-primary hover:underline">{open ? tx("ย่อเหลือ 10 รายการ") : tx("ดูทั้งหมด {0} รายการ", [rows.length])}</button>}
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
      <p className="text-xs text-muted-foreground">{tx("ข้อมูลการเข้าเรียนเริ่ม")} {fmtDate(a.since, { year: true })}  {tx("(คาบแรกในระบบ) · อัตรา = มา ÷ (มา + ลา) · เขียว = 80% ขึ้นไป · แดง = ต่ำกว่า 80%")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label={tx("อัตราเข้าเรียน")} value={fmtPct(a.total.rate)} tone={a.total.rate !== null && a.total.rate < 0.8 ? "text-red-600" : undefined} />
        <Stat label={tx("มา")} value={fmtNum(a.total.present)} tone="text-emerald-600" />
        <Stat label={tx("ลา")} value={fmtNum(a.total.leave)} tone="text-amber-600" sub={<span>{tx("ไม่หักโควตา")} {a.noQuota}</span>} />
        <Stat label={tx("คาบยกเลิก")} value={fmtNum(a.cancelled.total)} sub={<span>{tx("นักเรียนได้รับผล")} {a.cancelled.students}</span>} />
        <Stat label={tx("ยกเลิกเพราะครูลา")} value={fmtNum(a.cancelled.teacher)} tone={a.cancelled.teacher ? "text-red-600" : undefined} />
        <Stat label={tx("หยุดช่วงพิเศษ / อื่นๆ")} value={`${a.cancelled.period} / ${a.cancelled.other}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tx("อัตราเข้าเรียนรายเดือน")} hint={tx("ปี {0}", [yearOf(d.monthly.year)])} center>
          <MonthBars height="h-28" thisYear={a.monthly.map((x) => (x === null ? null : Math.round(x * 1000) / 10))} lastYear={a.monthly.map(() => null)} current={Number(d.today.slice(5, 7)) - 1} unit="%" />
        </Panel>
        <Panel title={tx("แยกตามวิชา")} center><RateRows rows={a.bySubject.map((r) => ({ key: r.key, label: sj(r.key), rate: r.rate, sub: tx("ลา {0}", [r.leave]) }))} /></Panel>
      </div>
      {/* owner 2026-10-05: pairs of similar length — branches | lowest classes, weekdays | frequent leavers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {compare ? (
          <Panel title={tx("แยกตามสาขา")} hint={tx("ต่ำสุดอยู่บน")} fill>
            <RateRows rows={a.byBranch.map((r) => ({ key: r.key, label: nm(r.name), rate: r.rate, sub: `${r.present}/${r.present + r.leave}` }))} />
          </Panel>
        ) : (
          <Panel title={tx("แยกตามวัน")} fill>
            <RateRows rows={days.map((r) => ({ key: r.key, label: weekdayShort(Number(r.key)), rate: r.rate, sub: tx("{0} คาบ", [r.sessions]) }))} />
          </Panel>
        )}
        <Panel title={tx("คลาสที่เข้าเรียนต่ำสุด")} hint={compare ? tx("ต่ำสุดอยู่บน · บอกสาขา") : tx("ต่ำสุดอยู่บน")} fill><RateRows rows={a.byClass.slice(0, compare ? Math.max(10, a.byBranch.length) : 7).map((r) => ({ key: r.key, label: <span title={`${nm(r.name)} · ${r.branch}`}>{nm(r.name)}{compare && <span className="text-xs text-muted-foreground"> · {nm(r.branch)}</span>}</span>, rate: r.rate, sub: tx("ลา {0}", [r.leave]) }))} /></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {compare && <Panel title={tx("แยกตามวัน")} fill><RateRows rows={days.map((r) => ({ key: r.key, label: weekdayShort(Number(r.key)), rate: r.rate, sub: tx("{0} คาบ", [r.sessions]) }))} /></Panel>}
        <Panel title={tx("นักเรียนลาบ่อย")} hint={tx("ลา ≥ 2 ครั้งในช่วงนี้ · เสี่ยงหลุด · กดชื่อเพื่อเปิด")} center className={compare ? "" : "lg:col-span-2"}>
          {a.leavers.length ? (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("นักเรียน")}</th><th className="text-left font-normal">{tx("ชั้น")}</th><th className="text-right font-normal">{tx("มา")}</th><th className="text-right font-normal">{tx("ลา")}</th><th className="text-right font-normal">{tx("ไม่หักโควตา")}</th><th className="text-right font-normal">{tx("อัตรา")}</th></tr></thead>
              <tbody>{a.leavers.slice(0, 10).map((x) => (
                <tr key={x.studentId} className="border-t">
                  <td className="py-1.5"><button type="button" className="hover:underline" onClick={() => onOpen(x.studentId)}>{nm(name(x.studentId)?.nickname ?? "—")}</button></td>
                  <td className="text-muted-foreground">{nm(name(x.studentId)?.grade)}</td>
                  <td className="text-right tabular-nums">{x.present}</td>
                  <td className="text-right text-amber-600 tabular-nums">{x.leave}</td>
                  <td className="text-right text-muted-foreground tabular-nums">{x.noQuota}</td>
                  <td className={cn("text-right tabular-nums", x.rate < 0.8 && "text-red-600")}>{fmtPct(x.rate)}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <Empty>{tx("ไม่มีนักเรียนที่ลาบ่อยในช่วงนี้")}</Empty>}
        </Panel>
      </div>
    </div>
  )
}

// ---------------- Operations (R2) ----------------

const hrs = (min: number) => tx("{0} ชม.", [(min / 60).toLocaleString("th-TH", { maximumFractionDigits: 1 })])

function OperationsTab({ d, compare }: { d: ReportData; compare: boolean }) {
  const o = d.operations
  const [onlyPartTime, setOnlyPartTime] = useState(false)
  const teachers = o.teachers.filter((t) => !onlyPartTime || t.staff?.partTime)
  const partTimeMin = o.teachers.filter((t) => t.staff?.partTime).reduce((a, t) => a + t.minutes, 0)
  const low = o.fill.filter((c) => c.students <= 1)
  const over = o.fill.filter((c) => c.fill > 1).sort((a, b) => b.fill - a.fill)
  const branchOf = (id: string) => nm(d.operations.rooms.find((b) => b.id === id)?.name ?? "")
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{tx("นับเฉพาะคาบที่สอนจบแล้ว ตั้งแต่")} {fmtDate(o.since, { year: true })}  {tx("(คาบแรกในระบบ) · ชั่วโมงสอนของครูหลัก ใช้คิดค่าสอน Part-time")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={tx("ครูที่สอนในช่วงนี้")} value={fmtNum(o.teachers.filter((t) => t.sessions).length)} />
        <Stat label={tx("ชั่วโมงสอนรวม")} value={hrs(o.teachers.reduce((a, t) => a + t.minutes, 0))} />
        <Stat label={tx("ชั่วโมง Part-time")} value={hrs(partTimeMin)} tone="text-violet-600" />
        <Stat label={tx("งานค้างของครู")} value={fmtNum(o.teachers.reduce((a, t) => a + t.unmarked + t.summariesPending, 0))} sub={<span>{tx("เช็คชื่อ + สรุปการเรียน")}</span>} />
      </div>
      <Panel title={tx("สุขภาพครู (Teacher Health)")} hint={tx("เรียงตามชั่วโมงสอน")}
        action={<label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={onlyPartTime} onChange={(e) => setOnlyPartTime(e.target.checked)} />  {tx("เฉพาะ Part-time")}</label>}>
        {teachers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="text-left font-normal">{tx("ครู")}</th>{compare && <th className="text-left font-normal">{tx("สาขา")}</th>}<th className="text-right font-normal">{tx("คาบ")}</th><th className="text-right font-normal">{tx("ชั่วโมง")}</th><th className="text-right font-normal">{tx("นักเรียน")}</th><th className="text-right font-normal">{tx("อัตราเข้าเรียน")}</th><th className="text-right font-normal">{tx("ยังไม่เช็คชื่อ")}</th><th className="text-right font-normal">{tx("สรุปค้าง")}</th><th className="text-right font-normal">{tx("สรุปตรงเวลา")}</th><th className="text-right font-normal">{tx("สอนแทน")}</th><th className="text-right font-normal">{tx("ลา (คาบ)")}</th></tr>
              </thead>
              <tbody>{teachers.map((t) => (
                <tr key={t.teacherId} className="border-t">
                  <td className="py-1.5"><span className="flex items-center gap-1.5">{nm(t.staff?.nickname ?? "—")}{t.staff?.partTime && <span className="rounded-full bg-violet-100 px-1.5 text-[10px] text-violet-800 dark:bg-violet-950 dark:text-violet-200">Part-time</span>}{t.staff && !t.staff.active && <span className="text-[10px] text-muted-foreground">{tx("(ออกแล้ว)")}</span>}</span></td>
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
        <Panel title={compare ? tx("การใช้ห้องตามสาขา") : tx("การใช้ห้อง")} hint={tx("ชั่วโมงที่มีคาบ ÷ ชั่วโมงที่สาขาเปิด")} fill>
          <RateRows plain rows={compare
            ? [...o.rooms].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).map((b) => ({ key: b.id, label: nm(b.name), rate: b.rate, sub: hrs(b.booked) }))
            : o.rooms.flatMap((b) => b.rooms.map((r) => ({ key: r.roomId, label: nm(r.name), rate: r.rate, sub: hrs(r.booked) })))} />
        </Panel>
        <Panel title={tx("ความเต็มของคลาส")} hint={tx("นักเรียน ÷ ขนาดที่แนะนำ (กลุ่ม 6 · เดี่ยว 3) · ว่างสุดอยู่บน · คนน้อย {0} · เกิน {1} คลาส", [low.length, over.length])} fill>
          <RateRows plain rows={[...over, ...o.fill.filter((c) => c.fill <= 1)].slice(0, Math.max(12, over.length)).map((c) => ({
            key: c.id, label: <span title={nm(c.name)}>{nm(c.name)}{compare && <span className="text-xs text-muted-foreground"> · {branchOf(c.branchId)}</span>}</span>,
            rate: Math.min(1, c.fill), sub: `${c.students}/${c.capacity}`, tone: c.fill > 1 ? "#dc2626" : c.students <= 1 ? "#f59e0b" : undefined,
          }))} />
          <p className="mt-2 text-[11px] text-muted-foreground"><span className="text-amber-600">■</span>  {tx("คนน้อย (≤ 1 คน) ·")} <span className="text-red-600">■</span>  {tx("เกินขนาดแนะนำ (แสดงบนสุด)")}</p>
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
    <Panel title={tx("คาดการณ์รายได้ถึงสิ้นปี")} center hint={tx("ต่อคอร์สตามอัตรา 6 เดือนล่าสุด {0} · ใบแจ้งหนี้ที่ส่งแล้วรอจ่าย {1} ใบ · ไม่รวมนักเรียนใหม่", [fmtPct(f.renewal), f.openCount])}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label={tx("คาดว่าจะเข้าอีก")} value={fmtShort(total)} tone="text-primary" />
          <Stat label={tx("ทั้งปี {0} (จริง + คาดการณ์)", [yearOf(d.monthly.year)])} value={fmtShort(actualYtd + total)} />
          <Stat label={tx("นักเรียนใหม่ (ไม่ได้รวม)")} value={tx("+{0}/ด.", [fmtShort(f.newAvg.perMonth)])} sub={<span>{tx("เฉลี่ย 3 เดือนล่าสุด ·")} {Math.round(f.newAvg.students)}  {tx("คน/ด.")}</span>} />
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("เดือน")}</th><th className="text-right font-normal">{tx("ต่อคอร์ส (คาดการณ์)")}</th><th className="text-right font-normal">{tx("ใบที่รอจ่าย")}</th><th className="text-right font-normal">{tx("รวม")}</th></tr></thead>
          <tbody>{months.map(({ m, x }) => (
            <tr key={m} className="border-t">
              <td className="py-1.5">{tx(TH_MONTHS[m])}{m === cur && <span className="ml-1 text-xs text-muted-foreground">{tx("(ที่เหลือของเดือน)")}</span>}</td>
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
  const SC = { teacher: tx("ครู"), content: tx("เนื้อหา"), admin: tx("แอดมิน"), value: tx("ความคุ้มค่า") } as const
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={tx("ทำไมนักเรียนออก")} hint={tx("จากฟอร์มแจ้งออก · {0} คนในช่วงนี้ · ผู้ปกครองตอบ {1} · ไม่ตอบ {2}", [e.total, e.answered, e.noReply])} fill>
        {e.reasons.length ? (
          <ul className="space-y-2 text-sm">{e.reasons.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,15rem)_1fr_4.5rem] items-center gap-3">
              <span className="truncate">{reasonLabel(r.id, lossReasons, uiLang())}</span>
              <span className="flex h-2 overflow-hidden rounded-full bg-muted"><span className="bg-primary" style={{ width: `${(r.main / max) * 100}%` }} /><span className="bg-primary/30" style={{ width: `${(r.other / max) * 100}%` }} /></span>
              <span className="text-right text-xs tabular-nums">{r.main}{r.other ? <span className="text-muted-foreground"> +{r.other}</span> : null}</span>
            </li>
          ))}</ul>
        ) : <Empty>{tx("ยังไม่มีนักเรียนที่ปิดการออกในช่วงนี้")}</Empty>}
        {e.reasons.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">{tx("สีเข้ม = เหตุผลหลัก · สีอ่อน = เหตุผลอื่นที่เลือกด้วย")}</p>}
      </Panel>
      <Panel title={tx("คะแนนจากผู้ปกครองที่ออก")} hint={tx("เฉลี่ย 1–5 · NPS = % แนะนำ (9–10) − % ไม่แนะนำ (0–6)")} fill>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(SC) as (keyof typeof SC)[]).map((k) => <Stat key={k} label={SC[k]} value={e.scores[k] === null ? "—" : e.scores[k]!.toFixed(1)} tone={e.scores[k] !== null && e.scores[k]! < 3.5 ? "text-red-600" : undefined} />)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="NPS" value={e.nps === null ? "—" : `${e.nps > 0 ? "+" : ""}${e.nps}`} tone={e.nps !== null && e.nps < 0 ? "text-red-600" : "text-emerald-600"} />
          <Stat label={tx("จะกลับมา")} value={String(e.comeBack.yes)} tone="text-emerald-600" />
          <Stat label={tx("อาจจะ")} value={String(e.comeBack.maybe)} tone="text-amber-600" />
          <Stat label={tx("คงไม่")} value={String(e.comeBack.no)} />
        </div>
        {e.comments.length > 0 && (
          <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t pt-2 text-xs">{e.comments.slice(0, 8).map((c, i) => <li key={i}>“{c.text}” <span className="text-muted-foreground">· {reasonLabel(c.reasonId, lossReasons, uiLang())} · {fmtDate(c.at.slice(0, 10))}</span></li>)}</ul>
        )}
      </Panel>
    </div>
  )
}

/** Cohort retention (owner's layout): branch × year joined, M0…M12; click a branch for the months it joined. */
function CohortPanel({ d, compare }: { d: ReportData; compare: boolean }) {
  const [drill, setDrill] = useState<string | null>(null)
  const branchName = (id: string) => nm(d.operations.rooms.find((b) => b.id === id)?.name ?? id)
  const rows = drill !== null || !compare
    ? d.cohortMonthly(drill).map((g) => ({ key: g.key, label: fmtMonthKey(g.key), sub: "", size: g.size, cells: g.cells, branch: "" }))
    : d.cohortByBranchYear.map((g) => { const [b, y] = g.key.split("|"); return { key: g.key, label: branchName(b), sub: String(yearOf(Number(y))), size: g.size, cells: g.cells, branch: b } })
  const months = Array.from({ length: 13 }, (_, n) => n)
  const avg = months.map((n) => { const xs = rows.filter((r) => r.cells[n] !== null); const size = xs.reduce((a, r) => a + r.size, 0); return size ? xs.reduce((a, r) => a + r.cells[n]! * r.size, 0) / size : null })
  return (
    <Panel title="Cohort Retention" hint={drill ? tx("{0} · แยกตามเดือนที่สมัคร", [branchName(drill)]) : compare ? tx("% นักเรียนที่ยังเรียนอยู่ N เดือนหลังสมัคร · สาขา × ปีที่สมัคร · กดสาขาเพื่อดูรายเดือน") : tx("% นักเรียนที่ยังเรียนอยู่ N เดือนหลังสมัคร · แยกตามเดือนที่สมัคร")}
      action={drill && <button type="button" className="text-xs text-primary" onClick={() => setDrill(null)}>{tx("‹ ทุกสาขา")}</button>}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0.5 text-xs">
            <thead className="text-muted-foreground"><tr><th className="px-1 text-left font-normal">Cohort</th><th className="px-1 text-right font-normal">{tx("คน")}</th>{months.map((n) => <th key={n} className="min-w-11 font-normal">M{n}</th>)}</tr></thead>
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
              <tr className="font-medium"><td className="px-1 pt-1">{tx("เฉลี่ยรวม")}</td><td className="px-1 text-right tabular-nums">{rows.reduce((a, r) => a + r.size, 0)}</td>{avg.map((c, n) => <td key={n} className="pt-1 text-center tabular-nums">{c === null ? "" : `${Math.round(c * 100)}%`}</td>)}</tr>
            </tbody>
          </table>
        </div>
      ) : <Empty>{tx("ยังไม่มีนักเรียนที่สมัครผ่านระบบ")}</Empty>}
    </Panel>
  )
}

const fmtMonthKey = (k: string) => `${monthShort(Number(k.slice(5, 7)) - 1)} ${yearOf(Number(k.slice(0, 4))) % 100}`

function CrmTab({ d, compare }: { d: ReportData; compare: boolean }) {
  const c = d.crm
  const enrolled = c.funnel[c.funnel.length - 1]
  const days = c.sources.map((x) => x.medianDays).filter((x): x is number => x !== null).sort((a, b) => a - b)
  const maxFunnel = Math.max(1, c.funnel[0].count)
  const lostTotal = c.lost.reduce((a, x) => a + x.count, 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label={tx("Lead ใหม่")} value={fmtNum(c.funnel[0].count)} />
        <Stat label={tx("สมัครแล้ว")} value={fmtNum(enrolled.count)} tone="text-emerald-600" />
        <Stat label="Conversion" value={fmtPct(enrolled.ofAll)} />
        <Stat label={tx("วันถึงสมัคร (มัธยฐาน)")} value={days.length ? tx("{0} วัน", [days[Math.floor(days.length / 2)]]) : "—"} />
        <Stat label={tx("Lead ที่ยังเปิดอยู่")} value={fmtNum(c.open)} sub={<Link href="/crm" className="text-primary">{tx("ตอนนี้ · ไปหน้า CRM ›")}</Link>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Funnel" hint={tx("Lead ที่เข้ามาในช่วงนี้ · นับทุกขั้นที่ผ่านมาแล้ว")} center>
          <ul className="space-y-2.5">
            {c.funnel.map((s, i) => (
              <li key={s.key} className="grid grid-cols-[7rem_1fr_6rem] items-center gap-2 text-sm">
                <span>{tx(s.label)}</span>
                <div className="h-6 overflow-hidden rounded-md bg-muted"><div className="flex h-full items-center rounded-md px-2 text-xs text-primary-foreground tabular-nums" style={{ width: `${Math.max(4, (s.count / maxFunnel) * 100)}%`, background: tint(0.35 + (0.65 * (c.funnel.length - i)) / c.funnel.length) }}>{fmtNum(s.count)}</div></div>
                <span className="text-right text-xs text-muted-foreground tabular-nums">{i ? tx("{0} ของขั้นก่อน", [fmtPct(s.ofPrev)]) : "100%"}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={tx("Lead รายเดือน")} hint={tx("ปี {0} เทียบปีที่แล้ว", [yearOf(d.monthly.year)])}>
          <MonthBars thisYear={c.monthly.thisYear} lastYear={c.monthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} unit={tx(" ราย")} />
        </Panel>
      </div>
      <Panel title={tx("Lead ที่หลุด")} hint={tx("ปิดไปที่ขั้นไหน · เพราะอะไร — ข้อมูลสำคัญ ดูก่อนแหล่งที่มา")}>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x">
          <div className="lg:pr-8"><DonutLegend keepOrder title={tx("หลุดที่ขั้นไหน")} parts={c.lost.map((x) => ({ label: tx(x.label), value: x.count }))} center={fmtNum(lostTotal)} sub={tx("Lead ที่หลุด")} /></div>
          <div className="lg:pl-8"><DonutLegend title={tx("เหตุผล")} parts={c.lostReasons.map((x) => ({ label: x.reason, value: x.count }))} center={fmtNum(c.lostReasons.reduce((a, x) => a + x.count, 0))} sub={tx("มีเหตุผล")} /></div>
        </div>
        {(c.competitors.length > 0 || c.wantedTimes.length > 0) && (
          <div className="mt-6 grid gap-6 border-t pt-5 lg:grid-cols-2 lg:gap-0 lg:divide-x">
            <div className="lg:pr-8"><TopList title={tx("ไปเรียนที่ไหนแทน")} icon={<SchoolIcon className="size-4 text-muted-foreground" />} color="#64748b" rows={c.competitors.map((x) => ({ label: nm(x.name), value: x.count }))} /></div>
            <div className="lg:pl-8"><TopList title={tx("เวลาที่ลูกค้าต้องการแต่เราไม่มี")} icon={<ClockIcon className="size-4 text-muted-foreground" />} color="#f59e0b" rows={c.wantedTimes.map((x) => ({ label: x.time, value: x.count }))} /></div>
          </div>
        )}
      </Panel>
      <Panel title={tx("แหล่งที่มา (Source)")} hint={tx("เรียงตามจำนวนที่สมัคร · รายได้ = เงินที่นักเรียนจาก Lead เหล่านี้จ่ายมาแล้วทั้งหมด")}>
        {c.sources.length ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("แหล่ง")}</th><th className="text-right font-normal">Lead</th><th className="text-right font-normal">{tx("สมัคร")}</th><th className="w-1/4 px-2 text-left font-normal">Conversion</th><th className="text-right font-normal">{tx("วันถึงสมัคร")}</th><th className="text-right font-normal">{tx("รายได้")}</th></tr></thead>
            <tbody>{c.sources.map((x, i) => (
              <tr key={x.source} className="border-t">
                <td className="py-1.5"><span className="flex items-center gap-2"><Rank n={i + 1} />{tx(LEAD_SOURCE_LABEL[x.source as keyof typeof LEAD_SOURCE_LABEL] ?? x.source)}</span></td>
                <td className="text-right tabular-nums">{x.leads}</td>
                <td className="text-right text-emerald-600 tabular-nums">{x.enrolled}</td>
                <td className="px-2"><span className="flex items-center gap-2"><ShareBar value={x.conversion ?? 0} /><span className="w-10 text-right text-xs tabular-nums">{fmtPct(x.conversion)}</span></span></td>
                <td className="text-right text-muted-foreground tabular-nums">{x.medianDays === null ? "—" : tx("{0} วัน", [x.medianDays])}</td>
                <td className="text-right tabular-nums">{fmtShort(x.revenue)}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <Empty />}
      </Panel>
      {compare && (
        <Panel title={tx("แยกตามสาขา")} hint={tx("Lead · สมัคร · Conversion")}>
          <SplitRanks rows={[...c.perBranch].sort((a, b) => b.enrolled - a.enrolled)} cols={[
            { label: "Lead", cell: (b) => b.leads },
            { label: tx("สมัคร"), cell: (b) => <span className="text-emerald-600">{b.enrolled}</span> },
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
  if (year === null) return <Empty>{tx("ยังไม่เคยส่งแบบสอบถามความพึงพอใจ — ส่งได้ที่ Settings › ระบบ")}</Empty>
  const cur = d.surveyOf(year), prev = d.surveyOf(year - 1)
  const s = cur.summary, p = prev.summary
  const topics = Survey.topicRanking(s)
  const prevTopic = (k: string) => Survey.topicRanking(p).find((x) => x.key === k)?.score ?? null
  const unhappy = cur.responses.filter((r) => Survey.isUnhappy(r.answers)).sort((a, b) => Number(!!a.followUp) - Number(!!b.followUp) || a.submittedAt.localeCompare(b.submittedAt))
  const fam = (id: string) => nm(families.find((f) => f.id === id)?.name ?? "—")
  const comments = cur.responses.flatMap((r) => [r.answers.praise && { k: `${r.id}p`, text: r.answers.praise, good: true, r }, r.answers.improve && { k: `${r.id}i`, text: r.answers.improve, good: false, r }].filter(Boolean) as { k: string; text: string; good: boolean; r: (typeof cur.responses)[number] }[])
  const dNps = s.nps !== null && p.nps !== null ? s.nps - p.nps : null
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{tx("ปี")}</span>
        {d.surveyYears.map((y) => <button key={y} type="button" onClick={() => setYear(y)} className={cn("rounded-full border px-3 py-1 text-xs", y === year ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted")}>{yearOf(y)}</button>)}
        {cur.campaign && <span className="ml-auto text-xs text-muted-foreground">{tx("ส่ง")} {fmtDate(cur.campaign.sentAt.slice(0, 10))}  {tx("· ปิดรับ")} {fmtDate(cur.campaign.to)}  {tx("· ไม่ขึ้นกับช่วงเวลาด้านบน")}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="NPS" value={s.nps === null ? "—" : `${s.nps > 0 ? "+" : ""}${s.nps}`} tone={s.nps !== null && s.nps < 0 ? "text-red-600" : "text-emerald-600"} sub={dNps === null ? <span>{tx("ปีก่อน —")}</span> : <span className={dNps >= 0 ? "text-emerald-600" : "text-red-600"}>{dNps >= 0 ? "▲" : "▼"} {Math.abs(dNps)}  {tx("จากปีก่อน (")}{p.nps})</span>} />
        <Stat label={tx("ตอบแล้ว")} value={`${s.responses}/${s.sent}`} sub={<span>{fmtPct(s.rate)}</span>} />
        <Stat label={tx("พอใจโดยรวม")} value={s.overall === null ? "—" : s.overall.toFixed(1)} sub={<span>{tx("ปีก่อน")} {p.overall === null ? "—" : p.overall.toFixed(1)}</span>} />
        <Stat label={tx("ปีหน้าเรียนต่อ")} value={s.responses ? fmtPct(s.continueNext.yes / s.responses) : "—"} sub={<span>{tx("ไม่แน่ใจ")} {s.continueNext.maybe}  {tx("· ไม่ต่อ")} {s.continueNext.no}</span>} />
        <Stat label={tx("ไม่พอใจ")} value={String(s.unhappy)} tone={s.unhappy ? "text-red-600" : undefined} sub={<span>{tx("แนะนำ 0–6 หรือไม่เรียนต่อ")}</span>} />
        <Stat label={tx("ยังไม่ได้โทร")} value={String(cur.toCall.length)} tone={cur.toCall.some((x) => x.overdue) ? "text-red-600" : undefined} sub={<span>{tx("เกิน 3 วัน")} {cur.toCall.filter((x) => x.overdue).length}</span>} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tx("หัวข้อ (เฉลี่ย 1–5)")} hint={tx("ต่ำสุดอยู่บน = ควรปรับก่อน · ตัวเลขเล็ก = ปีก่อน")} fill>
          {topics.length ? (
            <ul className="space-y-2 text-sm">{topics.map((t) => { const pv = prevTopic(t.key); return (
              <li key={t.key} className="grid grid-cols-[minmax(0,10rem)_1fr_5rem] items-center gap-2">
                <span className="truncate">{tx(t.label)}</span>
                <ShareBar value={(t.score! - 1) / 4} color={t.score! < 3.5 ? "#dc2626" : t.score! < 4 ? "#f59e0b" : "#10b981"} />
                <span className="text-right tabular-nums">{t.score!.toFixed(1)}{pv !== null && <span className="ml-1 text-[11px] text-muted-foreground">{pv.toFixed(1)}</span>}</span>
              </li>
            ) })}</ul>
          ) : <Empty />}
        </Panel>
        {compare ? (
          <Panel title={tx("NPS ตามสาขา")} hint={tx("ตัวเลขเล็ก = ปีก่อน · (ตอบ/ส่ง)")} fill>
            <SplitRanks rows={[...cur.byBranch].sort((a, b) => (b.nps ?? -999) - (a.nps ?? -999))} cols={[
              { label: "NPS", cell: (b) => <span className={cn("font-medium", b.nps !== null && b.nps < 0 && "text-red-600")}>{b.nps === null ? "—" : `${b.nps > 0 ? "+" : ""}${b.nps}`}<span className="ml-1 text-[11px] font-normal text-muted-foreground">{prev.byBranch.find((x) => x.id === b.id)?.nps ?? "—"}</span></span> },
              { label: tx("ตอบ"), cell: (b) => <span className="text-xs text-muted-foreground">{b.n}/{b.sent}</span> },
            ]} />
          </Panel>
        ) : (
          <Panel title={tx("คะแนนแนะนำเพื่อน (0–10)")} hint={tx("แนะนำ 9–10 · เฉยๆ 7–8 · ไม่แนะนำ 0–6")} center>
            {(() => { const v = cur.responses.map((r) => r.answers.nps).filter((x): x is number => x !== null); const pro = v.filter((x) => x >= 9).length, pas = v.filter((x) => x >= 7 && x <= 8).length, det = v.filter((x) => x <= 6).length; const n = Math.max(1, v.length); return (
              <div className="space-y-2">
                <div className="flex h-4 overflow-hidden rounded-full"><span className="bg-emerald-500" style={{ width: `${(pro / n) * 100}%` }} /><span className="bg-amber-400" style={{ width: `${(pas / n) * 100}%` }} /><span className="bg-red-500" style={{ width: `${(det / n) * 100}%` }} /></div>
                <div className="flex justify-between text-xs"><span className="text-emerald-700">{tx("แนะนำ")} {pro}</span><span className="text-amber-700">{tx("เฉยๆ")} {pas}</span><span className="text-red-700">{tx("ไม่แนะนำ")} {det}</span></div>
              </div>
            ) })()}
          </Panel>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={tx("คะแนนครู (จากผู้ปกครอง)")} hint={tx("เฉลี่ยข้อ “ครูผู้สอน” ของเด็กที่ครูสอน · ครูเห็นแค่ค่าเฉลี่ยของตัวเอง ไม่เห็นว่าใครให้")} fill>
          {cur.teachers.length ? (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("ครู")}</th>{compare && <th className="text-left font-normal">{tx("สาขา")}</th>}<th className="text-right font-normal">{tx("คะแนน")}</th><th className="text-right font-normal">{tx("จำนวน")}</th></tr></thead>
              <tbody>{cur.teachers.map((t) => (
                <tr key={t.teacherId} className="border-t">
                  <td className="py-1.5">{nm(t.staff?.nickname ?? "—")}</td>
                  {compare && <td className="text-muted-foreground">{(t.staff?.branchIds ?? []).map((id) => nm(branches.find((b) => b.id === id)?.name)).filter(Boolean).join(", ")}</td>}
                  <td className={cn("text-right font-medium tabular-nums", t.score < 3.5 && "text-red-600")}>{t.score.toFixed(1)}</td>
                  <td className="text-right text-muted-foreground tabular-nums">{t.ratings}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <Empty>{tx("ยังไม่มีคะแนนครู (นักเรียนที่ตอบยังไม่อยู่ในคลาส)")}</Empty>}
        </Panel>
        <Panel title={tx("อยากให้เปิดเพิ่ม")} hint={tx("วิชา / เวลา ที่ผู้ปกครองขอ")} fill>
          <TopList title={tx("ผู้ปกครองขอ")} icon={<SparklesIcon className="size-4 text-muted-foreground" />} color="#f59e0b" top={8} fill rows={cur.wants.map((w) => ({ label: tx(w.want), value: w.count }))} />
        </Panel>
      </div>
      {/* outcome only (owner 2026-10-05: Reports show what's done — the calls themselves are on CRM) */}
      <Panel title={tx("ผลการติดตามผู้ปกครองที่ไม่พอใจ")} hint={tx("{0} ครอบครัว · โทรแล้ว {1} · รอโทร {2} (รายชื่อที่ต้องโทรอยู่หน้า CRM)", [unhappy.length, unhappy.filter((r) => r.followUp).length, unhappy.filter((r) => !r.followUp).length])}>
        {unhappy.some((r) => r.followUp) ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("ครอบครัว")}</th>{compare && <th className="text-left font-normal">{tx("สาขา")}</th>}<th className="px-3 text-right font-normal">{tx("แนะนำ")}</th><th className="px-3 text-left font-normal">{tx("ปีหน้า")}</th><th className="px-3 text-left font-normal">{tx("โทรโดย")}</th><th className="text-left font-normal">{tx("ผลการคุย")}</th></tr></thead>
              <tbody>{unhappy.filter((r) => r.followUp).slice(0, showAllCalls ? undefined : 10).map((r) => (
                <tr key={r.id} className="border-t align-middle [&>td]:py-2">
                  <td>{fam(r.familyId)}</td>
                  {compare && <td className="text-muted-foreground">{nm(branches.find((b) => b.id === r.branchId)?.name)}</td>}
                  <td className="px-3 text-right text-red-600 tabular-nums">{r.answers.nps ?? "—"}/10</td>
                  <td className="px-3 whitespace-nowrap">{r.answers.continueNext ? tx(CONT[r.answers.continueNext]) : "—"}</td>
                  <td className="px-3 whitespace-nowrap text-muted-foreground">{nm(staff.find((x) => x.id === r.followUp!.by)?.nickname)} · {fmtDate(r.followUp!.at.slice(0, 10))}</td>
                  <td>{r.followUp!.note}</td>
                </tr>
              ))}</tbody>
            </table>
            {unhappy.filter((r) => r.followUp).length > 10 && <button type="button" onClick={() => setShowAllCalls((o) => !o)} className="mt-2 text-xs text-primary hover:underline">{showAllCalls ? tx("ย่อเหลือ 10 รายการ") : tx("ดูทั้งหมด {0} รายการ", [unhappy.filter((r) => r.followUp).length])}</button>}
          </div>
        ) : <Empty>{unhappy.length ? tx("ยังไม่มีการโทรที่บันทึกไว้") : tx("ไม่มีผู้ปกครองที่ไม่พอใจในปีนี้")}</Empty>}
      </Panel>
      <Panel title={tx("ความเห็นจากผู้ปกครอง")} hint={tx("{0} ข้อความ", [comments.length])}>
        {comments.length ? (
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-0 lg:divide-x">
            {[true, false].map((good, c) => (
              <div key={String(good)} className={c ? "lg:pl-6" : "lg:pr-6"}>
                <TopList title={good ? tx("ประทับใจ") : tx("อยากให้ปรับปรุง")} icon={<span className={cn("size-2.5 rounded-full", good ? "bg-emerald-500" : "bg-amber-500")} />} color={good ? "#10b981" : "#f59e0b"} wide
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

