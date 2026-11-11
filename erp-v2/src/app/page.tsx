"use client"
import { useState } from "react"
import { BanknoteIcon, CheckCircle2Icon, GraduationCapIcon, HistoryIcon, UserCheckIcon, UserSearchIcon, XCircleIcon } from "lucide-react"
import { Page, PageHeader, RangeStepper, Segmented } from "@/components/app/page-layout"
import { useBranchScope } from "@/components/app/branch-scope"
import { SessionSheet } from "@/components/app/session-sheet"
import { AlertBox, HeroTasks, HERO_KEYS, ALERT_KEYS, SALES_KEYS, pick, SalesBox } from "@/components/dashboard/work-boxes"
import { WeekSessions } from "@/components/dashboard/week-sessions"
import { DaySessions } from "@/components/dashboard/day-sessions"
import { Pulse, type PulseData } from "@/components/dashboard/pulse"
import { StatCard, DeltaPill, CountPill, Sparkline, MiniBars, AttBar } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { addDays, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { canApprove as canApproveInvoice, invoiceTotals } from "@/domain/rules/billing"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import * as R from "@/domain/rules/reports"
import { uniqueFamilies } from "@/domain/rules/people"
import { findConflicts, sessionState, workState } from "@/domain/rules/scheduling"
import * as Survey from "@/domain/rules/survey"
import * as Today from "@/domain/rules/today"
import type { Topic } from "@/domain/rules/today"
import { mondayOf } from "@/domain/rules/staff-overview"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import type { Session } from "@/domain/types"
import { useBranch, useEntitlements, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { tx, nm, sj } from "@/lib/i18n"

type RangeKey = "today" | "week" | "month"
const RANGE_LABEL: Record<RangeKey, string> = { today: "วันนี้", week: "สัปดาห์นี้", month: "เดือนนี้" }

/**
 * Dashboard (owner 2026-10-06): everyone lands here, content adapts per role. `dashboard.view` (Director/Area
 * Manager/Manager/Super Admin) gets the KPI strip, week/month tabs and the activity log.
 * Owner 2026-10-07 ("รกและโล่งในเวลาเดียวกัน"): today = AI brief (what to do first, and why) beside today's
 * sessions, then one "ต้องจัดการ" board — every kind of work as a counted row linking to its list (?focus=
 * highlights it there) — instead of separate long lists that repeated each other.
 */
export default function DashboardPage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  // feedback Row 42 (Area / Regional Manager): the same branch filter as every list — several branches together or one
  const scope = useBranchScope()
  const inScope = (branchId: string) => scope.ids.includes(branchId)
  const me = useStore((s) => s.me())
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const invoices = useStore((s) => s.invoices).filter((x) => inScope(x.branchId))
  const creditNotes = useStore((s) => s.creditNotes).filter((x) => inScope(x.branchId))
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students).filter((x) => inScope(x.branchId))
  const families = useStore((s) => s.families)
  const surveyResponses = useStore((s) => s.surveyResponses)
  const parentRequests = useStore((s) => s.parentRequests ?? [])
  const leads = useStore((s) => s.leads).filter((x) => inScope(x.branchId))
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)

  const mineOnly = !seesAllSessions(me)
  // owner 2026-11-10 (DASHBOARD.md): Admin + Manager see the SAME branch view — some branches have an Admin but no
  // Manager, or the other way round. So the branch zone (KPI / alert / sales / pulse) is gated on "sees all sessions",
  // not on the narrower dashboard.view permission. Teachers (mineOnly) get just their tasks + today's sessions.
  const branchView = !mineOnly
  // Day / Week toggle controls the whole page (default Day). No month here — month+ lives in Reports.
  const [rangeParam, setRange] = useQueryState<string>("range", "today")
  const range: RangeKey = rangeParam === "week" ? "week" : "today"
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const weekRange: R.Range = { from: weekStart, to: addDays(weekStart, 6) }
  const periodRange: R.Range = range === "week" ? weekRange : R.periodRange("today", today)
  const prevRange: R.Range = range === "week" ? { from: addDays(weekStart, -7), to: addDays(weekStart, -1) } : R.compareRange("today", periodRange)
  const branchSessions = sessions.filter((s) => inScope(s.branchId) && !s.cancelled)
  const todays = branchSessions.filter((s) => s.date === today && (!mineOnly || s.teacherId === me.id)).sort((a, b) => a.start.localeCompare(b.start))

  // owner 2026-10-06: "ความคืบหน้าวันนี้" — two honestly-measurable completion bars (no fabricated totals), scoped
  // the same as the sessions list above (a teacher's own sessions, or the whole branch for everyone else)
  const endedToday = todays.filter((s) => ["ended", "closed"].includes(sessionState(s, now)))
  const attendanceDone = endedToday.filter((s) => s.studentIds.every((sid) => attendance.some((a) => a.sessionId === s.id && a.studentId === sid))).length
  const presentToday = endedToday.flatMap((s) => attendance.filter((a) => a.sessionId === s.id && a.status === "present").map((a) => ({ sessionId: s.id, studentId: a.studentId })))
  const summaryDone = presentToday.filter(({ sessionId, studentId }) => {
    const sm = summaries.find((x) => x.sessionId === sessionId && x.studentId === studentId)
    return sm && sm.status !== "draft" && sm.status !== "changes_requested"
  }).length

  // ---------- the work, as topics (owner 2026-10-07): one row per kind of work, the list itself lives on its page ----------
  const mine = (s: Session) => !mineOnly || s.teacherId === me.id
  const unmarked = branchSessions.filter((s) => s.date >= addDays(today, -29) && s.date <= today && mine(s) && workState(s, now, attendance, summaries).state === "needs_attendance").length
  // same 7 days and scope as the Summaries page opens with, so the count there matches
  const summaryRows = branchSessions
    .filter((s) => s.date >= addDays(today, -6) && s.date <= today && mine(s))
    .flatMap((s) => attendance.filter((a) => a.sessionId === s.id && a.status === "present").map((a) => summaries.find((x) => x.sessionId === s.id && x.studentId === a.studentId)))
  const toWrite = summaryRows.filter((sm) => !sm || sm.status === "draft" || sm.status === "changes_requested").length
  const toApprove = summaryRows.filter((sm) => sm?.status === "submitted" && sm.authorId !== me.id && sm.lastEditorId !== me.id).length
  const invoicesToApprove = invoices.filter((i) => canApproveInvoice(i, me).ok).length

  const next7 = branchSessions.filter((s) => s.date >= today && s.date <= addDays(today, 7) && sessionState(s, now) === "upcoming")
  const clashes = mineOnly ? 0 : findConflicts(next7, branch, staff).length
  const noTeacher = mineOnly ? 0 : next7.filter((s) => !s.teacherId || !staff.find((t) => t.id === s.teacherId)?.active).length

  // ---------- current-state numbers ----------
  const statusOf = new Map(students.map((s) => [s.id, Att.studentStatus(s, entitlements, leaves, today)]))
  const activeStudents = [...statusOf.values()].filter((v) => v === "active" || v === "renewal").length
  // owner Row 41 (2026-10-28): how many unique families those active students are — "60 students, really 45 families"
  const activeFamilies = uniqueFamilies(students.filter((s) => { const v = statusOf.get(s.id); return v === "active" || v === "renewal" }))
  // owner 2026-10-06: a renewal check-in that got no answer can be snoozed to a later date (renewalFollowUpDue) —
  // keeps this to "needs doing today", not an ever-growing pile of names already being chased
  const renewals = students
    .filter((s) => statusOf.get(s.id) === "renewal" && Att.renewalFollowUpDue(s, today))
    .map((stu) => {
      const ents = entitlements.filter((e) => e.studentId === stu.id && e.to >= today)
      return ents.some((e) => e.kind === "sessions" && Att.balance(e, sessions, attendance, classes).remaining <= 1) || ents.some((e) => e.to <= addDays(today, 2))
    })
  const renewalUrgent = renewals.filter(Boolean).length
  const activeLeads = leads.filter((l) => l.stage !== "archived" && l.stage !== "enrolled")
  const newLeads = leads.filter((l) => l.stage === "new")
  const recentActivity = (() => {
    if (!branchView) return []
    const payments = invoices.flatMap((i) => i.payments.filter((p) => p.confirmedBy).map((p) => ({ at: p.recordedAt, text: tx("ชำระเงิน · {0} · {1}", [nm(students.find((s) => s.id === i.studentId)?.nickname ?? "-"), fmtMoney(invoiceTotals(i, { branch, courses, classes, holidays }).total)]), tone: "green" as const })))
    const att = attendance
      .filter((a) => a.status !== "leave")
      .slice(-150)
      .map((a) => {
        const se = sessions.find((x) => x.id === a.sessionId)
        const stu = students.find((x) => x.id === a.studentId)
        if (!se || !stu || !inScope(se.branchId)) return null
        return { at: a.markedAt, text: `${a.status === "present" ? tx("เข้าเรียน") : tx("ขาดเรียน")} · ${nm(stu.nickname)} · ${sj(se.subject)}`, tone: a.status === "present" ? ("blue" as const) : ("red" as const) }
      })
      .filter((x): x is { at: string; text: string; tone: "blue" | "red" } => !!x)
    return [...payments, ...att].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40)
  })()

  // ---------- dashboard.view only: period KPI (รายรับ strip + week/month tabs) ----------
  const revRows = branchView ? R.revenueRows({ invoices, creditNotes, courses, students, totalsOf: (inv) => invoiceTotals(inv, { branch, courses, classes, holidays }) }) : []
  const since = revRows[0]?.date ?? null
  const rev = R.revenueIn(revRows, periodRange)
  const revPrev = R.revenueIn(revRows, prevRange)
  const revChange = R.change(rev.total, revPrev.total, prevRange, since)
  const events = branchView ? R.studentEvents({ students, entitlements, rows: revRows, today }) : []
  const newCount = R.countEvents(events, periodRange, "new")

  // owner 2026-10-06: same Need Attention rules as Reports (domain/rules/reports.ts needsAttention — the one
  // source of truth), scoped to this branch; from 2026-10-07 they are rows of the "ต้องจัดการ" board
  const studentIds = new Set(students.map((s) => s.id))
  const scopedEnts = entitlements.filter((e) => studentIds.has(e.studentId))
  const studentFamilyIds = new Set(students.map((s) => s.familyId).filter((x): x is string => !!x))
  const activeNow = branchView ? students.filter((s) => R.stateOn(s.id, today, scopedEnts, leaves) === "active").length : 0
  const activeBefore = branchView ? students.filter((s) => R.stateOn(s.id, addDays(R.periodRange("mtd", today).from, -1), scopedEnts, leaves) === "active").length : 0
  // trend items (the brief's notes) compare month-to-date — "today vs yesterday" swings 100% on a quiet morning
  const mtd = R.periodRange("mtd", today)
  const attentionItems = branchView ? R.needsAttention({
    today, now, rows: revRows, range: mtd, prevRange: R.compareRange("mtd", mtd),
    invoices, entitlements: scopedEnts, attendance, sessions: sessions.filter((s) => inScope(s.branchId)),
    classes: classes.filter((k) => inScope(k.branchId)), leads,
    activeNow, activeBefore, pendingSummaries: 0, conflicts: 0,
    surveyToCall: Survey.toCall(surveyResponses.filter((r) => inScope(r.branchId)), today).length,
    parentRequests: parentRequests.filter((r) => { const b = r.branchId ?? students.find((x) => x.id === r.studentId)?.branchId; return r.status === "new" && !!b && inScope(b) }).length,
    students, families: families.filter((f) => studentFamilyIds.has(f.id)),
  }, tx, { keepZero: true }) : []

  const topics: Topic[] = [
    { key: "unmarked", group: "today", title: tx("ยังไม่เช็คชื่อ"), detail: tx("คาบที่จบแล้วใน 30 วัน"), count: unmarked, href: `/sessions?period=custom&from=${addDays(today, -29)}&to=${today}&work=needs_attendance` },
    { key: "summary_write", group: "today", title: tx("สรุปการเรียนยังไม่ได้เขียน"), detail: tx("7 วันล่าสุด รวมที่ถูกขอแก้"), count: toWrite, href: `/summaries?sent=0&period=custom&from=${addDays(today, -6)}&to=${today}` },
    ...(can(me, "summary.approve") ? [{ key: "summary_approve", group: "today" as const, title: tx("สรุปการเรียนรออนุมัติ"), detail: tx("ครูส่งมาแล้ว รอคุณตรวจ"), count: toApprove, href: "/summaries?bucket=submitted" }] : []),
    ...(can(me, "billing.approve") ? [{ key: "invoice_approve", group: "today" as const, title: tx("ใบแจ้งหนี้รออนุมัติ"), detail: tx("อนุมัติแล้วจึงส่งผู้ปกครองได้"), count: invoicesToApprove, href: "/billing?filter=pending_approval" }] : []),
    ...(!mineOnly ? [
      { key: "renewal", group: "customers" as const, title: tx("รอต่อคอร์ส"), detail: tx("แพ็กใกล้หมด / เหลือน้อย · ด่วน = หมดใน 2 วัน"), count: renewals.length, urgent: renewalUrgent, href: "/students?status=renewal" },
      { key: "lead_new", group: "customers" as const, title: tx("ลีดใหม่รอติดต่อ"), detail: tx("กำลังตามทั้งหมด {0} ราย", [activeLeads.length]), count: newLeads.length, href: "/crm?view=table" },
      { key: "conflict", group: "teaching" as const, title: tx("คาบชน"), detail: tx("7 วันข้างหน้า"), count: clashes, href: "/calendar?view=list" },
      { key: "no_teacher", group: "teaching" as const, title: tx("คาบยังไม่มีครู"), detail: tx("7 วันข้างหน้า"), count: noTeacher, href: "/calendar?view=list&teacher=none" },
    ] : []),
    ...Today.attentionTopics(attentionItems),
  ]
  const brief = Today.dailyBrief({
    topics,
    trend: attentionItems.filter((x) => x.group === "trend" && x.count > 0),
    sessions: todays.map((s) => ({ start: s.start, minutes: s.minutes, state: sessionState(s, now) })),
    nowTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  }, tx)

  // DASHBOARD.md §5: split the work into the hero (action), the alert box, and the sales box
  const heroTopics = pick(topics, HERO_KEYS)
  const alertTopics = pick(topics, ALERT_KEYS)
  const salesTopics = pick(topics, SALES_KEYS)
  const heroTitle = mineOnly ? tx("ต้องทำของฉัน") : range === "week" ? tx("ต้องทำสัปดาห์นี้") : tx("ต้องทำวันนี้")
  // owner 2026-11-10: the AI line is a "start here" for THIS box — scoped to the hero's own work, so its number lines
  // up with the box total (not the whole page). Highest-priority hero step first (dailyBrief already ranks them).
  const heroStep = brief.steps.find((s) => HERO_KEYS.includes(s.key))
  const heroAi = heroStep ? tx("เริ่มจาก “{0}” {1} รายการก่อน", [heroStep.title, heroStep.count]) : undefined

  // Week mode: the whole week's sessions as a 7-day board
  const weekSessions = branchSessions.filter((s) => R.inRange(s.date, weekRange) && (!mineOnly || s.teacherId === me.id))
  const weekMarked = weekSessions.filter((s) => attendance.some((a) => a.sessionId === s.id)).length

  // Pulse (DASHBOARD.md §3/§4): branch rhythm as charts. Bars show a 7-day window (the week in Week mode, the last 7
  // days in Day mode); the donut / in-out / leads totals follow the Day|Week period.
  const barFrom = range === "week" ? weekStart : addDays(today, -6)
  const revByDay = Array.from({ length: 7 }, (_, i) => addDays(barFrom, i)).map((d) => ({ d, label: fmtDate(d, { weekday: true }).split(" ")[0], total: revRows.filter((x) => x.date === d).reduce((a, x) => a + x.total, 0) }))
  // micro-charts for the KPI stat cards — a trailing 7-day pulse (real series, no fabricated totals)
  const kpiDays = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i))
  const newPerDay = kpiDays.map((d) => events.filter((e) => e.kind === "new" && e.date === d).length)
  const leadsPerDay = kpiDays.map((d) => leads.filter((l) => l.createdAt.slice(0, 10) === d).length)
  const periodMarks = attendance.filter((a) => { const se = sessions.find((x) => x.id === a.sessionId); return !!se && inScope(se.branchId) && R.inRange(se.date, periodRange) })
  const attParts = { present: periodMarks.filter((a) => a.status === "present").length, leave: periodMarks.filter((a) => a.status === "leave").length, absent: periodMarks.filter((a) => a.status === "absent").length }
  const attRate = attParts.present + attParts.absent > 0 ? attParts.present / (attParts.present + attParts.absent) : null
  const lostCount = branchView ? R.countEvents(events, periodRange, "lost") : 0
  const periodLeads = leads.filter((l) => R.inRange(l.createdAt.slice(0, 10), periodRange))
  const leadsBySource = Object.entries(periodLeads.reduce<Record<string, number>>((m, l) => ({ ...m, [l.source]: (m[l.source] ?? 0) + 1 }), {}))
    .map(([src, n]) => ({ label: LEAD_SOURCE_LABEL[src as keyof typeof LEAD_SOURCE_LABEL] ?? src, value: n }))
    .sort((a, b) => b.value - a.value)
  const pulseData: PulseData = { periodLabel: tx(RANGE_LABEL[range]), revByDay, revTotal: rev.total, revDelta: revChange, attendance: attParts, attendanceRate: attRate, newCount, lostCount, leadsBySource, today }

  return (
    <Page>
      {/* owner 2026-10-09: same header and width as every page */}
      <PageHeader title={`${tx("สวัสดี")} ${nm(me.nickname)}`} description={`${fmtDate(today, { weekday: true, year: true })} ${tx("· สาขา")}${nm(branch.name)}`}
        actions={<>
          <Segmented label={tx("ช่วงเวลา")} value={range} onChange={(v) => setRange(v)}
            options={[{ value: "today", label: tx("วันนี้") }, { value: "week", label: tx("สัปดาห์") }]} />
          {range === "week" && <RangeStepper label={`${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6), { year: true })}`} current={weekStart === mondayOf(today)}
            onPrev={() => setWeekStart(addDays(weekStart, -7))} onNext={() => setWeekStart(addDays(weekStart, 7))} onToday={() => setWeekStart(mondayOf(today))} />}
          {branchView && <ActivityButton items={recentActivity} today={today} />}
          {scope.select}
        </>} />

      {branchView && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={GraduationCapIcon} label={tx("นักเรียนที่เรียนอยู่")} value={activeStudents}
            sub={tx("· {0} ครอบครัว", [activeFamilies])} chart={<MiniBars values={newPerDay} />} />
          <StatCard icon={BanknoteIcon} label={tx("รายรับ{0}", [tx(RANGE_LABEL[range])])} value={fmtMoney(rev.total)}
            delta={<DeltaPill value={revChange} />} chart={<Sparkline values={revByDay.map((r) => r.total)} />} />
          <StatCard icon={UserCheckIcon} label={tx("มาเรียน{0}", [tx(RANGE_LABEL[range])])} value={attRate === null ? "—" : `${Math.round(attRate * 100)}%`}
            chart={<AttBar present={attParts.present} leave={attParts.leave} absent={attParts.absent} />} />
          <StatCard icon={UserSearchIcon} label={tx("ลีดที่กำลังตาม")} value={activeLeads.length}
            delta={newLeads.length ? <CountPill tone="warn">{tx("{0} ใหม่", [newLeads.length])}</CountPill> : undefined} chart={<MiniBars values={leadsPerDay} />} />
        </div>
      )}

      {/* owner 2026-11-10 (DASHBOARD.md): fixed boxes, DO on top / KNOW below. ต้องทำ (hero) + ⚠️ ต้องรู้ side by side;
          then คาบ (day timeline / week board) + ลีด-ขาย; the branch Pulse charts sit at the bottom. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><HeroTasks topics={heroTopics} aiLine={heroAi} title={heroTitle} /></div>
        {branchView && <AlertBox topics={alertTopics} />}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {range === "week"
            ? <WeekSessions sessions={weekSessions} weekStart={weekStart} today={today} markedCount={weekMarked} />
            : <DaySessions todays={todays} now={now} attendance={attendance} mineOnly={mineOnly}
                progress={{ attDone: attendanceDone, attTotal: endedToday.length, sumDone: summaryDone, sumTotal: presentToday.length }}
                onOpen={setOpenSessionId} />}
        </div>
        {branchView && <SalesBox topics={salesTopics} />}
      </div>

      {branchView && <Pulse data={pulseData} />}

      <SessionSheet sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
    </Page>
  )
}

type Activity = { at: string; text: string; tone: "green" | "blue" | "red" }

/**
 * กิจกรรมล่าสุด (owner 2026-10-07): a log that flows all day — an icon button in the header (badge = today's count)
 * opening a popup grouped by day, instead of a card taking space on the page.
 */
function ActivityButton({ items, today }: { items: Activity[]; today: string }) {
  const [open, setOpen] = useState(false)
  // timestamps are ISO (UTC) — group and show them in local time
  const dayOf = (at: string) => toDateStr(new Date(at))
  const timeOf = (at: string) => { const d = new Date(at); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
  const todayCount = items.filter((e) => dayOf(e.at) === today).length
  const days = [...new Set(items.map((e) => dayOf(e.at)))]
  return (
    <>
      <HoverCard>
        <HoverCardTrigger render={<Button variant="outline" size="icon-sm" className="relative" aria-label={tx("กิจกรรมล่าสุด")} onClick={() => setOpen(true)} />}>
          <HistoryIcon />
          {todayCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-primary px-1 text-2xs leading-4 font-semibold text-primary-foreground tabular-nums">{todayCount}</span>}
        </HoverCardTrigger>
        <HoverCardContent>{tx("กิจกรรมล่าสุด")}</HoverCardContent>
      </HoverCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto lg:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><HistoryIcon className="size-5" /> {tx("กิจกรรมล่าสุด")}</DialogTitle>
            <DialogDescription>{tx("เช็คชื่อและการชำระเงินล่าสุดของสาขา")}</DialogDescription>
          </DialogHeader>
          {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tx("ยังไม่มีกิจกรรม")}</p>}
          {days.map((d) => (
            <section key={d} className="space-y-0.5">
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{d === today ? tx("วันนี้") : fmtDate(d, { weekday: true })}</p>
              {items.filter((e) => dayOf(e.at) === d).map((e, i) => {
                const Icon = e.tone === "green" ? BanknoteIcon : e.tone === "red" ? XCircleIcon : CheckCircle2Icon
                return (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm">
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", e.tone === "green" ? "bg-success-soft text-success-ink" : e.tone === "red" ? "bg-danger-soft text-danger-ink" : "bg-info-soft text-info-ink")}><Icon className="size-3.5" /></span>
                    <span className="min-w-0 flex-1 truncate">{e.text}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{timeOf(e.at)}</span>
                  </div>
                )
              })}
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </>
  )
}



