"use client"

import { AlertTriangleIcon, BanknoteIcon, CheckCircle2Icon, GraduationCapIcon, HeartHandshakeIcon, LightbulbIcon, MegaphoneIcon, SearchIcon, UserCheckIcon, UsersIcon, type LucideIcon } from "lucide-react"
import type { ReportData } from "@/components/reports/use-reports"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import { buildInsights, type Insight, type InsightArea, type InsightInput, type InsightTone } from "@/domain/rules/insights"
import { reasonLabel } from "@/domain/rules/loss"
import { COMPARE_LABEL, PERIODS, type PeriodKey } from "@/domain/rules/reports"
import * as Survey from "@/domain/rules/survey"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
const DAY = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"]

/** Turn the Reports data into the plain numbers the summary rules read (domain/rules/insights.ts). */
function toInput(d: ReportData, period: PeriodKey, lossReasons: Parameters<typeof reasonLabel>[1]): InsightInput {
  const year = d.monthly.year
  const cur = Number(d.today.slice(5, 7)) - 1
  const evIn = (kind: "new" | "lost", ym: string) => d.events.filter((e) => e.kind === kind && e.date.startsWith(ym) && e.date <= d.today).length
  // last year's months from before our first record (or the month it started in, half-recorded) have nothing to compare
  const firstFull = d.since ? d.since.slice(0, 7) : null
  const months = Array.from({ length: cur + 1 }, (_, m) => {
    const k = String(m + 1).padStart(2, "0")
    const lastOk = !!firstFull && `${year - 1}-${k}` > firstFull
    return {
      label: MONTH[m], now: d.monthly.thisYear[m],
      // the month in progress compares with the same days last year
      last: !lastOk ? null : m === cur ? d.monthly.lastYearToDate || null : d.monthly.lastYear[m],
      newNow: evIn("new", `${year}-${k}`), newLast: evIn("new", `${year - 1}-${k}`),
      lostNow: evIn("lost", `${year}-${k}`), lostLast: evIn("lost", `${year - 1}-${k}`),
    }
  })
  const days = (Date.parse(d.range.to) - Date.parse(d.range.from)) / 86_400_000 + 1
  const periodMonths = Math.max(1, days / 30.4)
  const src = d.crm.sources.filter((x) => x.leads >= 10 && x.conversion !== null)
  const best = [...src].sort((a, b) => b.conversion! - a.conversion!)[0]
  const worst = [...src].sort((a, b) => a.conversion! - b.conversion!)[0]
  const label = (x: string) => LEAD_SOURCE_LABEL[x as keyof typeof LEAD_SOURCE_LABEL] ?? x
  const a = d.attendanceTab
  const wd = a.byWeekday.filter((x) => x.rate !== null && x.sessions >= 3).sort((p, q) => p.rate! - q.rate!)[0]
  const o = d.operations
  const busiest = [...o.teachers].sort((p, q) => q.minutes - p.minutes)[0]
  const y = d.surveyYears[0]
  const sv = y !== undefined ? d.surveyOf(y) : null
  const svPrev = y !== undefined ? d.surveyOf(y - 1) : null
  const weakest = sv ? Survey.topicRanking(sv.summary)[0] : undefined
  return {
    periodLabel: PERIODS.find((p) => p.key === period)!.label,
    vsLabel: COMPARE_LABEL[period].replace(/^vs /, "เทียบ"),
    comparable: d.comparable, periodMonths,
    revenue: { now: d.rev.total, prev: d.revPrev.total },
    months,
    flow: { newNow: d.studentFlow.newCount, newPrev: d.studentFlow.newPrev, lostNow: d.studentFlow.lost, lostPrev: d.studentFlow.lostPrev, returning: d.studentFlow.returning, renewal: d.studentFlow.renewal, renewalPrev: d.studentFlow.renewalPrev, active: d.kpi.active },
    perStudentMonth: d.kpi.active ? d.rev.total / periodMonths / d.kpi.active : null,
    exitReasons: d.exits.reasons.map((r) => ({ label: reasonLabel(r.id, lossReasons), count: r.main })).filter((r) => r.count),
    leadLostReasons: d.crm.lostReasons.map((r) => ({ label: r.reason, count: r.count })),
    leadLostStages: d.crm.lost.map((r) => ({ label: r.label, count: r.count })),
    wantedTimes: d.crm.wantedTimes.map((r) => ({ label: r.time, count: r.count })),
    competitors: d.crm.competitors.map((r) => ({ label: r.name, count: r.count })),
    sales: {
      leads: d.crm.funnel[0].count, enrolled: d.crm.funnel[d.crm.funnel.length - 1].count, conversion: d.crm.funnel[d.crm.funnel.length - 1].ofAll, open: d.crm.open,
      bestSource: best && { label: label(best.source), conversion: best.conversion! },
      worstSource: worst && worst !== best ? { label: label(worst.source), conversion: worst.conversion!, leads: worst.leads } : undefined,
    },
    attendance: {
      rate: a.total.rate, prevRate: a.total.rate !== null && d.kpi.attendanceChange !== null ? a.total.rate - d.kpi.attendanceChange / 100 : null,
      worstBranch: a.byBranch[0]?.rate != null && a.byBranch.length > 1 ? { label: a.byBranch[0].name, rate: a.byBranch[0].rate } : undefined,
      worstDay: wd ? { label: DAY[Number(wd.key)], rate: wd.rate! } : undefined,
      frequentLeavers: a.leavers.length,
    },
    teaching: {
      pendingWork: o.teachers.reduce((n, t) => n + t.unmarked + t.summariesPending, 0),
      lowFill: o.fill.filter((c) => c.students <= 1).length, overFill: o.fill.filter((c) => c.fill > 1).length,
      busiestTeacher: busiest?.minutes ? { label: busiest.staff?.nickname ?? "—", hours: Math.round(busiest.minutes / 6) / 10 } : undefined,
    },
    survey: sv && y !== undefined ? {
      year: y, nps: sv.summary.nps, npsPrev: svPrev?.summary.responses ? svPrev.summary.nps : null,
      weakest: weakest ? { label: weakest.label, score: weakest.score! } : undefined,
      toCall: sv.toCall.length, notContinuing: sv.summary.continueNext.no, wants: sv.wants.map((w) => ({ label: w.want, count: w.count })),
    } : undefined,
    branchLoad: d.branchLoad,
  }
}

const AREA: Record<InsightArea, { label: string; icon: LucideIcon }> = {
  revenue: { label: "รายได้", icon: BanknoteIcon },
  students: { label: "นักเรียน", icon: UsersIcon },
  sales: { label: "ขาย (CRM)", icon: MegaphoneIcon },
  attendance: { label: "การเข้าเรียน", icon: UserCheckIcon },
  teaching: { label: "ครูและคลาส", icon: GraduationCapIcon },
  satisfaction: { label: "ความพึงพอใจ", icon: HeartHandshakeIcon },
}
const TONE: Record<InsightTone, { label: string; pill: string; bar: string }> = {
  bad: { label: "ต้องแก้", pill: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", bar: "bg-red-500" },
  watch: { label: "เฝ้าดู", pill: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200", bar: "bg-amber-400" },
  good: { label: "ดี", pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", bar: "bg-emerald-500" },
}

/**
 * Reports › สรุป (owner 2026-10-05): one written card per topic — the numbers, the cause, the suggestion — problems
 * first, and the three things to do this week on top. Follows the period / branch picked above like every tab.
 */
export function SummaryTab({ d, period, scopeLabel }: { d: ReportData; period: PeriodKey; scopeLabel: string }) {
  const lossReasons = useStore((s) => s.system.lossReasons)
  const { insights, counts, headline } = buildInsights(toInput(d, period, lossReasons))
  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold">สรุปผู้บริหาร · {scopeLabel} · {PERIODS.find((p) => p.key === period)!.label}</h2>
          <span className="ml-auto flex gap-1.5 text-xs">
            {(["bad", "watch", "good"] as const).map((t) => <span key={t} className={cn("rounded-full px-2.5 py-0.5", TONE[t].pill)}>{TONE[t].label} {counts[t]}</span>)}
          </span>
        </div>
        {headline.length ? (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium"><AlertTriangleIcon className="size-4 text-red-600" /> ทำก่อนสัปดาห์นี้</p>
            <ol className="space-y-2 text-sm">
              {headline.map((h, i) => (
                <li key={h.area} className="grid grid-cols-[1.5rem_6.5rem_1fr] items-baseline gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">{i + 1}</span>
                  <span className="text-xs text-muted-foreground">{AREA[h.area].label}</span>
                  <span>{h.action}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2Icon className="size-4" /> ทุกหัวข้ออยู่ในเกณฑ์ดี</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {insights.map((x) => <InsightCard key={x.area} x={x} />)}
      </div>
      <p className="text-xs text-muted-foreground">สรุปนี้เขียนจากตัวเลขในแท็บอื่นด้วยกฎที่ตั้งไว้ (ไม่ได้เดา) — เปลี่ยนช่วงเวลา / สาขาด้านบนแล้วสรุปจะเปลี่ยนตาม · ตัวเลขเทียบช่วงก่อนจะแสดงเมื่อมีข้อมูลช่วงก่อนในระบบ</p>
    </div>
  )
}

function InsightCard({ x }: { x: Insight }) {
  const A = AREA[x.area]
  return (
    <section className="relative flex flex-col overflow-hidden rounded-3xl bg-card p-5 pl-6 shadow-sm ring-1 ring-foreground/10">
      <span className={cn("absolute inset-y-0 left-0 w-1.5", TONE[x.tone].bar)} />
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <A.icon className="size-4" />{A.label}
        <span className={cn("ml-auto rounded-full px-2.5 py-0.5 font-medium", TONE[x.tone].pill)}>{TONE[x.tone].label}</span>
      </div>
      <h3 className="text-base leading-snug font-semibold">{x.title}</h3>
      <div className="mt-4 space-y-4 text-sm">
        <Part icon={SearchIcon} title="ข้อมูล" items={x.facts} />
        {x.causes.length > 0 && <Part icon={AlertTriangleIcon} title={x.tone === "good" ? "จุดที่ควรดู" : "สาเหตุ"} items={x.causes} />}
        <Part icon={LightbulbIcon} title="แนะนำ" items={x.actions} strong />
      </div>
    </section>
  )
}

function Part({ icon: Icon, title, items, strong }: { icon: LucideIcon; title: string; items: string[]; strong?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="size-3.5" />{title}</p>
      <ul className={cn("space-y-1.5", strong && "rounded-2xl bg-primary/5 p-3")}>
        {items.map((t) => <li key={t} className="flex gap-2 leading-relaxed"><span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />{t}</li>)}
      </ul>
    </div>
  )
}
