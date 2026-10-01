"use client"

import Link from "next/link"
import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangleIcon, BanknoteIcon, CalendarDaysIcon, ChartColumnIcon, ChevronRightIcon, DownloadIcon, PrinterIcon, UsersIcon, UserCheckIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { Delta, Donut, Empty, fmtNum, fmtPct, fmtShort, Heatmap, MonthBars, Panel, Rank, ShareBar, donutColor, tint } from "@/components/reports/charts"
import { useReports, type ReportData } from "@/components/reports/use-reports"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate, fmtMoney } from "@/domain/dates"
import { can, canCompareBranches, reportBranchIds } from "@/domain/rules/permissions"
import { PERIODS, type AttentionItem, type PeriodKey } from "@/domain/rules/reports"
import type { Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { downloadReports } from "@/lib/reports-export"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Tab = "overview" | "revenue" | "students" | "attendance" | "operations" | "crm"
const TABS: { id: Tab; label: string; soon?: string }[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "revenue", label: "รายได้" },
  { id: "students", label: "นักเรียน" },
  { id: "attendance", label: "การเข้าเรียน", soon: "R2" },
  { id: "operations", label: "Operations", soon: "R2" },
  { id: "crm", label: "CRM", soon: "R3" },
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
  const [showAttention, setShowAttention] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const d = useReports(branchIds, period)
  const periodLabel = PERIODS.find((p) => p.key === period)!.label
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
          <p className="text-xs text-muted-foreground">{scopeLabel} · {periodLabel} {fmtDate(d.range.from)} – {fmtDate(d.range.to)} · ข้อมูลจริงจากใบแจ้งหนี้ที่จ่ายแล้ว แพ็กเกจ และการเช็คชื่อ</p>
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
        <Kpi icon={BanknoteIcon} label={`รายได้ · ${periodLabel}`} value={fmtNum(d.kpi.revenue)} sub={<><Delta value={d.kpi.revenueChange} /> <span>{vsLabel(period)}</span></>} />
        <Kpi icon={UsersIcon} label="นักเรียน Active" value={fmtNum(d.kpi.active)} sub={<><Delta value={d.kpi.activeChange} /> <span>vs ต้นช่วง · Pause {d.kpi.paused}</span></>} />
        <Kpi icon={CalendarDaysIcon} label="คาบสัปดาห์นี้" value={fmtNum(d.kpi.weekSessions)} sub={<span>ไม่นับคาบที่ยกเลิก</span>} />
        <Kpi icon={UserCheckIcon} label={`อัตราเข้าเรียน · ${periodLabel}`} value={fmtPct(d.kpi.attendance)} sub={<><Delta value={d.kpi.attendanceChange} /> <span>มา ÷ (มา + ลา)</span></>} />
        <button type="button" onClick={() => setShowAttention(true)} className={cn("col-span-2 flex items-center gap-3 rounded-3xl p-4 text-left shadow-sm ring-1 md:col-span-1",
          d.kpi.attention ? "bg-red-50 ring-red-300 dark:bg-red-950/40 dark:ring-red-800" : "bg-card ring-foreground/10")}>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", d.kpi.attention ? "bg-red-600 text-white" : "bg-muted text-muted-foreground")}><AlertTriangleIcon className="size-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">Need Attention</span><span className="text-2xl font-semibold tabular-nums">{d.kpi.attention}</span></span>
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="inline-flex flex-wrap rounded-full bg-muted p-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("rounded-full px-4 py-1 text-sm", tab === t.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
              {t.label}{t.soon && <span className="ml-1 text-[10px] text-muted-foreground">{t.soon}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
              className={cn("rounded-full border px-3 py-1 text-xs", period === p.key ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted")}>{p.short}</button>
          ))}
        </div>
      </div>

      {tab === "overview" && <Overview d={d} compare={showCompare} period={period} onAllRevenue={() => setTab("revenue")} onAllStudents={() => setTab("students")} />}
      {tab === "revenue" && <RevenueTab d={d} compare={showCompare} period={period} />}
      {tab === "students" && <StudentsTab d={d} compare={showCompare} onOpen={setOpenId} />}
      {TABS.find((t) => t.id === tab)?.soon && <Empty>แท็บนี้อยู่ในรอบ {TABS.find((t) => t.id === tab)!.soon} — คุยสเปกแล้ว ยังไม่ได้สร้าง</Empty>}

      <AttentionDialog open={showAttention} onClose={() => setShowAttention(false)} items={d.attention} />
      {openId && <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

const vsLabel = (p: PeriodKey) => ({ today: "vs เมื่อวาน", week: "vs สัปดาห์ก่อน", month: "vs เดือนก่อน", "3m": "vs 3 เดือนก่อน", "6m": "vs 6 เดือนก่อน", "1y": "vs ปีก่อน", ytd: "vs ปีที่แล้ว" })[p]

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

function Overview({ d, compare, period, onAllRevenue, onAllStudents }: { d: ReportData; compare: boolean; period: PeriodKey; onAllRevenue: () => void; onAllStudents: () => void }) {
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
        <Panel title="รายได้รายเดือน" hint={`ปี ${d.monthly.year + 543} เทียบปีที่แล้ว · Forecast อยู่ในรอบ R3`}>
          <MonthBars thisYear={d.monthly.thisYear} lastYear={d.monthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} />
        </Panel>
        {compare ? (
          <Panel title="รายได้ตามสาขา" hint={`Top 10 · ${PERIODS.find((p) => p.key === period)!.label}`} action={<button type="button" className="text-xs text-primary" onClick={onAllRevenue}>ดูทั้งหมด ›</button>}>
            <BranchRevenue rows={d.byBranch.slice(0, 10)} />
          </Panel>
        ) : (
          <Panel title="ประเภทรายได้" hint="ค่าเรียน · ค่ารถ · ค่าธรรมเนียม · หนังสือ"><RevenueParts d={d} /></Panel>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Subject Engine" hint="รายได้ค่าเรียนแยกวิชา · คอร์สหลายวิชาแบ่งเท่าๆ กัน"><SubjectEngine d={d} /></Panel>
        <Panel title="ครอบครัว Top 10" hint="ยอดในช่วงนี้ · อายุลูกค้านับจากใบแรก" action={<button type="button" className="text-xs text-primary" onClick={onAllRevenue}>ดูทั้งหมด ›</button>}>
          <Families rows={d.families.slice(0, 10)} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Demand Heatmap" hint="จำนวนนักเรียนในคาบ · วัน × เวลาเริ่ม"
          action={<NativeSelect className="h-8 w-36" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ทุกวิชา"
            options={[...new Set(d.bySubject.map((x) => x.subject))].map((x) => ({ value: x, label: x }))} />}>
          {demand.hours.length ? (
            <Heatmap rows={demand.hours} cols={DAYS} rowLabel={(h) => `${String(h).padStart(2, "0")}:00`} colLabel={(w) => DAY_SHORT[w]} value={(h, w) => demand.count(w, h)} />
          ) : <Empty />}
        </Panel>
        <Panel title="แพ็กเกจขายดี" hint="จำนวน (Volume) vs รายได้ (Value)"><PackageMix d={d} /></Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Net Growth" hint="ใหม่ + กลับมาเรียน − Lost" action={<button type="button" className="text-xs text-primary" onClick={onAllStudents}>ดูทั้งหมด ›</button>}>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            {compare ? (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">สาขา</th><th className="text-right font-normal">ใหม่</th><th className="text-right font-normal">กลับมา</th><th className="text-right font-normal">Lost</th></tr></thead>
                <tbody>{d.perBranch.map((b, i) => (
                  <tr key={b.id} className="border-t"><td className="py-1.5"><span className="flex items-center gap-2"><Rank n={i + 1} />{b.name}</span></td>
                    <td className="text-right text-emerald-600 tabular-nums">+{b.newCount}</td><td className="text-right text-emerald-600 tabular-nums">+{b.returning}</td><td className="text-right text-red-600 tabular-nums">−{b.lost}</td></tr>
                ))}</tbody>
              </table>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <Stat label="ใหม่" value={`+${d.studentFlow.newCount}`} tone="text-emerald-600" />
                <Stat label="กลับมาเรียน" value={`+${d.studentFlow.returning}`} tone="text-emerald-600" />
                <Stat label="Lost" value={`−${d.studentFlow.lost}`} tone="text-red-600" />
              </div>
            )}
            <div className="grid place-items-center rounded-2xl bg-muted/60 p-3 text-center">
              <div><p className="text-xs text-muted-foreground">Net</p><p className={cn("text-3xl font-semibold tabular-nums", net < 0 && "text-red-600")}>{net > 0 ? "+" : ""}{net}</p>
                <p className="text-[11px] text-muted-foreground">อัตราต่อคอร์ส {fmtPct(d.studentFlow.renewal)}</p></div>
            </div>
          </div>
        </Panel>
        <Panel title="Churn Split" hint="Lost = หมดแพ็กแล้วไม่ต่อใน 30 วัน · Pause = เริ่มลาพักยาวในช่วงนี้">
          {compare ? (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">สาขา</th><th className="text-right font-normal">Lost</th><th className="text-right font-normal">Pause</th></tr></thead>
              <tbody>{d.perBranch.map((b, i) => (
                <tr key={b.id} className="border-t"><td className="py-1.5"><span className="flex items-center gap-2"><Rank n={i + 1} />{b.name}</span></td>
                  <td className="text-right text-red-600 tabular-nums">{b.lost}</td><td className="text-right text-amber-600 tabular-nums">{b.pauses}</td></tr>
              ))}</tbody>
            </table>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-center"><Stat label="Lost" value={String(d.studentFlow.lost)} tone="text-red-600" /><Stat label="Pause" value={String(d.studentFlow.pauses)} tone="text-amber-600" /></div>
          )}
        </Panel>
      </div>
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

function BranchRevenue({ rows }: { rows: ReportData["byBranch"] }) {
  if (!rows.some((r) => r.amount)) return <Empty />
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">สาขา</th><th /><th className="text-right font-normal">ยอด</th><th className="text-right font-normal">%</th></tr></thead>
      <tbody>{rows.map((b, i) => (
        <tr key={b.id} className="border-t">
          <td className="py-2"><span className="flex items-center gap-2"><Rank n={i + 1} />{b.name}</span></td>
          <td className="w-1/3 px-2"><ShareBar value={b.share} /></td>
          <td className="text-right tabular-nums">{fmtShort(b.amount)}</td>
          <td className="text-right text-muted-foreground tabular-nums">{fmtPct(b.share)}</td>
        </tr>
      ))}</tbody>
    </table>
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
            <ShareBar value={x.share} />
            <span className="text-right tabular-nums">{fmtShort(x.amount)}</span>
          </li>
        ))}
      </ul>
      <Donut parts={d.bySubject.map((x) => ({ label: x.subject, value: x.amount }))} center={fmtShort(total)} sub="ค่าเรียนทุกวิชา" />
    </div>
  )
}

function Families({ rows }: { rows: ReportData["families"] }) {
  if (!rows.length) return <Empty />
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">ครอบครัว</th><th className="text-right font-normal">อายุลูกค้า</th><th className="text-right font-normal">ยอด</th><th className="text-right font-normal">ใบ</th><th className="text-right font-normal">ลูก</th></tr></thead>
      <tbody>{rows.map((f, i) => (
        <tr key={f.key} className="border-t">
          <td className="py-1.5"><span className="flex items-center gap-2"><Rank n={i + 1} /><span className="truncate">{f.name}</span></span></td>
          <td className="text-right text-muted-foreground tabular-nums">{f.tenureMonths} ด.</td>
          <td className="text-right tabular-nums">{fmtShort(f.amount)}</td>
          <td className="text-right tabular-nums">{f.invoices}</td>
          <td className="text-right tabular-nums">{f.kids}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function PackageMix({ d }: { d: ReportData }) {
  if (!d.packages.length) return <Empty />
  const maxU = Math.max(1, ...d.packages.map((x) => x.units)), maxV = Math.max(1, ...d.packages.map((x) => x.amount))
  return (
    <table className="w-full border-separate border-spacing-0.5 text-sm">
      <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">แพ็กเกจ</th><th className="font-normal">จำนวน</th><th className="font-normal">รายได้</th><th className="text-right font-normal">%Mix</th></tr></thead>
      <tbody>{d.packages.map((x) => (
        <tr key={x.key}>
          <td className="py-1 pr-2">{x.label}</td>
          <td className={cn("h-9 rounded-md text-center tabular-nums", x.units / maxU > 0.55 && "text-primary-foreground")} style={{ background: tint(x.units / maxU) }}>{fmtNum(x.units)}</td>
          <td className={cn("h-9 rounded-md text-center tabular-nums", x.amount / maxV > 0.55 && "text-primary-foreground")} style={{ background: tint(x.amount / maxV) }}>{fmtShort(x.amount)}</td>
          <td className="text-right text-muted-foreground tabular-nums">{fmtPct(x.share)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

// ---------------- Revenue ----------------

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

function RevenueTab({ d, compare, period }: { d: ReportData; compare: boolean; period: PeriodKey }) {
  const pg = d.packageGrade
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="ประเภทรายได้" hint={`${PERIODS.find((p) => p.key === period)!.label} ${vsLabel(period)}`}><RevenueParts d={d} /></Panel>
        <Panel title="สรุปการขาย" hint="ใบแจ้งหนี้ที่จ่ายแล้วในช่วงนี้">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="ใบแจ้งหนี้" value={fmtNum(d.rev.invoices)} sub={<Delta value={d.comparable && d.revPrev.invoices ? Math.round(((d.rev.invoices - d.revPrev.invoices) / d.revPrev.invoices) * 1000) / 10 : null} />} />
            <Stat label="นักเรียนที่จ่าย" value={fmtNum(d.rev.students)} />
            <Stat label="เฉลี่ยต่อใบ" value={fmtShort(d.rev.invoices ? d.rev.total / d.rev.invoices : 0)} />
          </div>
        </Panel>
      </div>
      <Panel title="รายได้รายเดือน" hint={`ปี ${d.monthly.year + 543} เทียบปีที่แล้ว`}>
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
                  <td className="text-right"><Delta value={a !== null && b ? Math.round(((a - b) / b) * 1000) / 10 : null} /></td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        {compare && <Panel title="รายได้ตามสาขา" hint="ทุกสาขาในขอบเขต"><BranchRevenue rows={d.byBranch} /></Panel>}
        <Panel title="Subject Engine"><SubjectEngine d={d} /></Panel>
        <Panel title="แพ็กเกจขายดี" hint="จำนวน (Volume) vs รายได้ (Value)"><PackageMix d={d} /></Panel>
        <Panel title="แพ็กเกจ × ระดับชั้น" hint="จำนวนแพ็กที่แต่ละชั้นซื้อ">
          {pg.grades.length ? <Heatmap rows={pg.grades} cols={pg.keys} rowLabel={(g) => g} colLabel={(k) => k} value={(g, k) => pg.count(g, k)} corner="ชั้น" /> : <Empty />}
        </Panel>
      </div>
      <Panel title="ครอบครัวทั้งหมด" hint={`${d.families.length} ครอบครัวที่จ่ายในช่วงนี้`}>
        <div className="max-h-[32rem] overflow-y-auto"><Families rows={d.families} /></div>
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
        <MonthBars thisYear={d.activeMonthly.thisYear} lastYear={d.activeMonthly.lastYear} current={Number(d.today.slice(5, 7)) - 1} fmt={fmtNum} />
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
      <Panel title="ความเคลื่อนไหวนักเรียน" hint={`${events.length} รายการในช่วงนี้ · กดชื่อเพื่อเปิดข้อมูลนักเรียน`}>
        {events.length ? (
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-xs text-muted-foreground"><tr><th className="text-left font-normal">วันที่</th><th className="text-left font-normal">นักเรียน</th><th className="text-left font-normal">ชั้น</th><th className="text-left font-normal">เหตุการณ์</th></tr></thead>
              <tbody>{events.map((e, i) => {
                const st = name(e.studentId)
                return (
                  <tr key={`${e.studentId}-${e.kind}-${i}`} className="border-t">
                    <td className="py-1.5 whitespace-nowrap text-muted-foreground">{fmtDate(e.date)}</td>
                    <td><button type="button" className="text-left hover:underline" onClick={() => onOpen(e.studentId)}>{st?.nickname ?? "—"}</button></td>
                    <td className="text-muted-foreground">{st?.grade}</td>
                    <td><span className={cn("rounded-full px-2 py-0.5 text-xs", e.kind === "lost" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200")}>
                      {e.kind === "new" ? "ใหม่" : e.kind === "returning" ? "กลับมาเรียน" : "Lost"}</span></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        ) : <Empty />}
      </Panel>
      <p className="text-xs text-muted-foreground">Cohort Retention อยู่ในรอบ R3 · นักเรียนที่ Import จากระบบเดิมไม่นับเป็น &quot;ใหม่&quot;</p>
    </div>
  )
}

// ---------------- Needs attention ----------------

const GROUP_LABEL: Record<AttentionItem["group"], string> = { trend: "ยอดและแนวโน้ม", money: "เงินค้าง", students: "นักเรียนเสี่ยงหลุด", teaching: "ครูและการสอน", sales: "ขาย (CRM)" }

function AttentionDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: AttentionItem[] }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangleIcon className="size-5 text-red-600" /> Need Attention</DialogTitle>
          <DialogDescription>{items.length ? `${items.length} เรื่องที่ควรดู · กดเพื่อไปหน้าที่แก้ได้` : "ไม่มีเรื่องที่ต้องดูตอนนี้"}</DialogDescription>
        </DialogHeader>
        {(Object.keys(GROUP_LABEL) as AttentionItem["group"][]).map((g) => {
          const list = items.filter((x) => x.group === g)
          if (!list.length) return null
          return (
            <section key={g} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{GROUP_LABEL[g]}</p>
              {list.map((x) => (
                <Link key={x.key} href={x.href} onClick={onClose} className="flex items-center gap-3 rounded-xl border p-2.5 hover:bg-muted/50">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{x.title}</span><span className="block text-xs text-muted-foreground">{x.detail}</span></span>
                  {x.group !== "trend" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 tabular-nums dark:bg-red-950 dark:text-red-200">{x.count}</span>}
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </section>
          )
        })}
      </DialogContent>
    </Dialog>
  )
}
