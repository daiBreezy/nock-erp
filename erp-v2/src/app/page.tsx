"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { ArrowRightIcon, BanknoteIcon, CheckCircle2Icon, ChartColumnIcon, ChevronRightIcon, GraduationCapIcon, HistoryIcon, SparklesIcon, UserMinusIcon, UserPlusIcon, UserSearchIcon, XCircleIcon } from "lucide-react"
import { Pill, SessionStateBadge } from "@/components/app/badges"
import { DashboardHeader } from "@/components/app/dashboard-header"
import { SessionSheet } from "@/components/app/session-sheet"
import { subjectColor } from "@/components/app/subject-color"
import { DailyBriefCard } from "@/components/dashboard/daily-brief"
import { TaskBoard } from "@/components/dashboard/task-board"
import { Delta, fmtNum } from "@/components/reports/charts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { addDays, endTime, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { canApprove as canApproveInvoice, invoiceTotals } from "@/domain/rules/billing"
import { sessionKindLabel } from "@/domain/rules/forms"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import * as R from "@/domain/rules/reports"
import { findConflicts, sessionState, STATE_LABEL, workState } from "@/domain/rules/scheduling"
import * as Survey from "@/domain/rules/survey"
import * as Today from "@/domain/rules/today"
import type { Topic } from "@/domain/rules/today"
import type { Attendance, Session } from "@/domain/types"
import { useBranch, useEntitlements, useLookup, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { tx, nm, sj } from "@/lib/i18n"

type RangeKey = "today" | "week" | "month"
const PERIOD_OF: Record<RangeKey, R.PeriodKey> = { today: "today", week: "week", month: "mtd" }
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
  const me = useStore((s) => s.me())
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const invoices = useStore((s) => s.invoices).filter((x) => x.branchId === branch.id)
  const creditNotes = useStore((s) => s.creditNotes).filter((x) => x.branchId === branch.id)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students).filter((x) => x.branchId === branch.id)
  const families = useStore((s) => s.families)
  const surveyResponses = useStore((s) => s.surveyResponses)
  const leads = useStore((s) => s.leads).filter((x) => x.branchId === branch.id)
  const L = useLookup()
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const hasOverview = can(me, "dashboard.view")
  const [rangeParam, setRangeParam] = useQueryState<RangeKey>("range", "today")
  const range: RangeKey = hasOverview ? rangeParam : "today"
  const periodKey = PERIOD_OF[range]
  const periodRange = R.periodRange(periodKey, today)

  const mineOnly = !seesAllSessions(me)
  const branchSessions = sessions.filter((s) => s.branchId === branch.id && !s.cancelled)
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
    if (!hasOverview) return []
    const payments = invoices.flatMap((i) => i.payments.filter((p) => p.confirmedBy).map((p) => ({ at: p.recordedAt, text: tx("ชำระเงิน · {0} · {1}", [nm(students.find((s) => s.id === i.studentId)?.nickname ?? "-"), fmtMoney(invoiceTotals(i, { branch, courses, classes, holidays }).total)]), tone: "green" as const })))
    const att = attendance
      .filter((a) => a.status !== "leave")
      .slice(-150)
      .map((a) => {
        const se = sessions.find((x) => x.id === a.sessionId)
        const stu = students.find((x) => x.id === a.studentId)
        if (!se || !stu || se.branchId !== branch.id) return null
        return { at: a.markedAt, text: `${a.status === "present" ? tx("เข้าเรียน") : tx("ขาดเรียน")} · ${nm(stu.nickname)} · ${sj(se.subject)}`, tone: a.status === "present" ? ("blue" as const) : ("red" as const) }
      })
      .filter((x): x is { at: string; text: string; tone: "blue" | "red" } => !!x)
    return [...payments, ...att].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40)
  })()

  // ---------- dashboard.view only: period KPI (รายรับ strip + week/month tabs) ----------
  const revRows = hasOverview ? R.revenueRows({ invoices, creditNotes, courses, students, totalsOf: (inv) => invoiceTotals(inv, { branch, courses, classes, holidays }) }) : []
  const since = revRows[0]?.date ?? null
  const prevRange = R.compareRange(periodKey, periodRange)
  const rev = R.revenueIn(revRows, periodRange)
  const revPrev = R.revenueIn(revRows, prevRange)
  const revChange = R.change(rev.total, revPrev.total, prevRange, since)
  const events = hasOverview ? R.studentEvents({ students, entitlements, rows: revRows, today }) : []
  const newCount = R.countEvents(events, periodRange, "new", branch.id)
  const newPrev = R.countEvents(events, prevRange, "new", branch.id)
  const lostCount = R.countEvents(events, periodRange, "lost", branch.id)
  const lostPrev = R.countEvents(events, prevRange, "lost", branch.id)
  const leadsInRange = leads.filter((l) => R.inRange(l.createdAt.slice(0, 10), periodRange)).length
  const leadsPrevRange = leads.filter((l) => R.inRange(l.createdAt.slice(0, 10), prevRange)).length

  // owner 2026-10-06: same Need Attention rules as Reports (domain/rules/reports.ts needsAttention — the one
  // source of truth), scoped to this branch; from 2026-10-07 they are rows of the "ต้องจัดการ" board
  const studentIds = new Set(students.map((s) => s.id))
  const scopedEnts = entitlements.filter((e) => studentIds.has(e.studentId))
  const studentFamilyIds = new Set(students.map((s) => s.familyId).filter((x): x is string => !!x))
  const activeNow = hasOverview ? students.filter((s) => R.stateOn(s.id, today, scopedEnts, leaves) === "active").length : 0
  const activeBefore = hasOverview ? students.filter((s) => R.stateOn(s.id, addDays(R.periodRange("mtd", today).from, -1), scopedEnts, leaves) === "active").length : 0
  // trend items (the brief's notes) compare month-to-date — "today vs yesterday" swings 100% on a quiet morning
  const mtd = R.periodRange("mtd", today)
  const attentionItems = hasOverview ? R.needsAttention({
    today, now, rows: revRows, range: mtd, prevRange: R.compareRange("mtd", mtd),
    invoices, entitlements: scopedEnts, attendance, sessions: sessions.filter((s) => s.branchId === branch.id),
    classes: classes.filter((k) => k.branchId === branch.id), leads,
    activeNow, activeBefore, pendingSummaries: 0, conflicts: 0,
    surveyToCall: Survey.toCall(surveyResponses.filter((r) => r.branchId === branch.id), today).length,
    students, families: families.filter((f) => studentFamilyIds.has(f.id)),
  }, tx, { keepZero: true }) : []

  const topics: Topic[] = [
    { key: "unmarked", group: "today", title: tx("ยังไม่เช็คชื่อ"), detail: tx("คาบที่จบแล้วใน 30 วัน"), count: unmarked, href: "/sessions?range=recent&work=needs_attendance" },
    { key: "summary_write", group: "today", title: tx("สรุปการเรียนยังไม่ได้เขียน"), detail: tx("7 วันล่าสุด รวมที่ถูกขอแก้"), count: toWrite, href: "/summaries?bucket=to_write" },
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

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DashboardHeader name={nm(me.nickname)} today={today} branchName={nm(branch.name)} />
        <div className="flex items-center gap-2">
          {hasOverview && (
            <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRangeParam(v[0] as RangeKey)} variant="outline" size="sm">
              <ToggleGroupItem value="today">{tx("วันนี้")}</ToggleGroupItem>
              <ToggleGroupItem value="week">{tx("สัปดาห์นี้")}</ToggleGroupItem>
              <ToggleGroupItem value="month">{tx("เดือนนี้")}</ToggleGroupItem>
            </ToggleGroup>
          )}
          {hasOverview && <ActivityButton items={recentActivity} today={today} />}
        </div>
      </div>

      {hasOverview && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<GraduationCapIcon className="size-4" />} label={tx("นักเรียนที่เรียนอยู่")} value={String(activeStudents)} tone="emerald" sub={tx("จากทั้งหมด {0} คน", [students.length])} />
          <Kpi icon={<BanknoteIcon className="size-4" />} label={tx("รายรับ{0}", [tx(RANGE_LABEL[range])])} value={fmtMoney(rev.total)} tone="violet" sub={<span className="flex items-center gap-1"><Delta value={revChange} /> {tx(R.COMPARE_LABEL[periodKey])}</span>} />
          <Kpi icon={<UserPlusIcon className="size-4" />} label={tx("นักเรียนใหม่ · {0}", [tx(RANGE_LABEL[range])])} value={`+${fmtNum(newCount)}`} tone="sky" sub={<span className="flex items-center gap-1"><Delta value={R.change(newCount, newPrev, prevRange, since)} /> {tx(R.COMPARE_LABEL[periodKey])}</span>} />
          <Kpi icon={<UserSearchIcon className="size-4" />} label={tx("ลีดที่กำลังตาม")} value={String(activeLeads.length)} tone={newLeads.length ? "amber" : "emerald"} sub={newLeads.length ? tx("{0} รายใหม่ยังไม่ติดต่อ", [newLeads.length]) : tx("ติดต่อครบแล้ว")} />
        </div>
      )}

      {range === "today" ? (
        <>
          <div className="grid items-stretch gap-4 lg:grid-cols-5">
            <DailyBriefCard brief={brief} className="lg:col-span-3" />
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{mineOnly ? tx("คาบของฉันวันนี้") : tx("คาบเรียนวันนี้")}</CardTitle>
                <CardDescription>{todays.length}  {tx("คาบ · สถานะเปลี่ยนตามเวลาจริงอัตโนมัติ")}</CardDescription>
                {endedToday.length > 0 && (
                  <div className="mt-1 grid gap-2.5 sm:grid-cols-2">
                    <HeaderProgress label={tx("เช็คชื่อวันนี้")} done={attendanceDone} total={endedToday.length} />
                    <HeaderProgress label={tx("สรุปการเรียนวันนี้")} done={summaryDone} total={presentToday.length} />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-0.5">
                {todays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tx("วันนี้ไม่มีคาบเรียน")}</p>}
                {todays.filter((s) => !["ended", "closed"].includes(sessionState(s, now))).map((s) => (
                  <TodaySessionRow key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => setOpenSessionId(s.id)} />
                ))}
                {(() => {
                  const past = todays.filter((s) => ["ended", "closed"].includes(sessionState(s, now)))
                  if (!past.length) return null
                  return (
                    <>
                      <button onClick={() => setShowPast((v) => !v)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">
                        <ChevronRightIcon className={cn("size-3.5 transition-transform", showPast && "rotate-90")} />  {tx("จบแล้ว")} {past.length}  {tx("คาบ")}
                      </button>
                      {showPast && past.map((s) => (
                        <TodaySessionRow key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => setOpenSessionId(s.id)} muted />
                      ))}
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          <TaskBoard topics={topics} />
        </>
      ) : (
        // week/month (dashboard.view only): how the period went, not a task queue — for the operational
        // detail (alerts, pending renewals) switch back to "วันนี้", for a full breakdown go to Reports
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi icon={<UserPlusIcon className="size-4" />} label={tx("นักเรียนใหม่ · {0}", [tx(RANGE_LABEL[range])])} value={`+${fmtNum(newCount)}`} tone="emerald" sub={<span className="flex items-center gap-1"><Delta value={R.change(newCount, newPrev, prevRange, since)} /> {tx(R.COMPARE_LABEL[periodKey])}</span>} />
            <Kpi icon={<UserMinusIcon className="size-4" />} label={tx("นักเรียนหลุด · {0}", [tx(RANGE_LABEL[range])])} value={`−${fmtNum(lostCount)}`} tone={lostCount ? "red" : "emerald"} sub={<span className="flex items-center gap-1"><Delta value={R.change(lostCount, lostPrev, prevRange, since)} invert /> {tx(R.COMPARE_LABEL[periodKey])}</span>} />
            <Kpi icon={<UserSearchIcon className="size-4" />} label={tx("Lead ใหม่ · {0}", [tx(RANGE_LABEL[range])])} value={fmtNum(leadsInRange)} tone="sky" sub={<span className="flex items-center gap-1"><Delta value={R.change(leadsInRange, leadsPrevRange, prevRange, since)} /> {tx(R.COMPARE_LABEL[periodKey])}</span>} />
          </div>
          <Link href="/reports" className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground">
            <ChartColumnIcon className="size-4" />  {tx("ดูรายละเอียดเพิ่มที่ Reports")} <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      )}

      <SessionSheet sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
    </div>
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
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" size="icon-sm" className="relative" aria-label={tx("กิจกรรมล่าสุด")} onClick={() => setOpen(true)} />}>
          <HistoryIcon />
          {todayCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums">{todayCount}</span>}
        </TooltipTrigger>
        <TooltipContent>{tx("กิจกรรมล่าสุด")}</TooltipContent>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", e.tone === "green" ? "bg-emerald-100 text-emerald-700" : e.tone === "red" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700")}><Icon className="size-3.5" /></span>
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

const KPI_TONE = {
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
} as const

/**
 * A quiet agenda row for the today-sessions list (owner 2026-10-06: the old bordered-card-per-row list
 * read as cluttered once there were 8+ sessions) — a subject-colour accent bar instead of a full border,
 * one text line instead of two, and finished sessions get folded under a "จบแล้ว N คาบ" toggle above.
 */
function TodaySessionRow({ s, now, L, attendance, onOpen, muted }: { s: Session; now: Date; L: ReturnType<typeof useLookup>; attendance: Attendance[]; onOpen: () => void; muted?: boolean }) {
  const st = sessionState(s, now)
  const marked = attendance.filter((a) => a.sessionId === s.id).length
  const t = L.teacher(s.teacherId)
  return (
    <button onClick={onOpen} className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/50", muted && "opacity-60")}>
      <span className={cn("h-8 w-1 shrink-0 rounded-full", subjectColor(s.subject).bar)} />
      <div className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">
        <span className="text-sm font-semibold text-foreground">{s.start}</span>–{endTime(s.start, s.minutes)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{sj(s.subject)}{sessionKindLabel(s) && <Pill tone="violet" className="ml-2">{tx(sessionKindLabel(s)!)}</Pill>}</div>
        <div className="truncate text-xs text-muted-foreground">
          <span className={cn(t.missing && "text-amber-700")}>{nm(t.label)}</span> · {nm(L.room(s.roomId))}  {tx("· เช็คชื่อแล้ว")} {marked}/{s.studentIds.length}
        </div>
      </div>
      {st === "live" ? <SessionStateBadge state={st} /> : <span className="shrink-0 text-xs text-muted-foreground">{tx(STATE_LABEL[st])}</span>}
    </button>
  )
}

/** A fill-up bar living right inside a card's own header (owner 2026-10-06: a separate "progress" card read as
 *  one more thing to scan — this sits where the count used to be) — turns emerald + sparkles at 100%, so
 *  clearing attendance, summaries, or today's renewal calls reads as a small win, not just another number. */
function HeaderProgress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const complete = total > 0 && done === total
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("flex items-center gap-1 font-semibold tabular-nums", complete ? "text-emerald-600" : "text-muted-foreground")}>
          {complete && <SparklesIcon className="size-3" />} {done}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-700", complete ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Kpi({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub: ReactNode; tone: keyof typeof KPI_TONE }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="space-y-1 px-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={cn("grid size-6 place-items-center rounded-md", KPI_TONE[tone])}>{icon}</span>
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}
