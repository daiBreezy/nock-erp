"use client"
import { RolloverDialog, useRolloverNotice } from "@/components/students/rollover-banner"
import { useState } from "react"
import { BanknoteIcon, CalendarDaysIcon, ChevronRightIcon, GraduationCapIcon, UserSearchIcon } from "lucide-react"
import { KpiRow, Page, PageHeader, RangeStepper, Segmented } from "@/components/app/page-layout"
import { useBranchScope } from "@/components/app/branch-scope"
import { SessionSheet } from "@/components/app/session-sheet"
import { PileCard, orderPiles } from "@/components/dashboard/desk"
import { CountdownRows } from "@/components/app/period-countdown"
import * as Desk from "@/domain/rules/desk"
import { WeekSessions } from "@/components/dashboard/week-sessions"
import { DaySessions } from "@/components/dashboard/day-sessions"
import { Pulse, type PulseData } from "@/components/dashboard/pulse"
import { ActivityButton } from "@/components/dashboard/activity-box"
import { Button } from "@/components/ui/button"
import { buildActivity } from "@/domain/rules/activity"
import { kpiMoney } from "@/components/app/kpi"
import { KpiV } from "@/components/app/kpi-v"
import { PaceLines, PlanBar, ShareBar, StageBar, TipRows } from "@/components/app/kpi-visuals"
import { cumulativeByDay, monthBounds } from "@/domain/rules/kpi-series"
import { PIPELINE_GROUPS } from "@/domain/rules/crm"
import { addDays, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { canApprove as canApproveInvoice, dueDateOf, daysToDue, invoiceTotals } from "@/domain/rules/billing"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import * as R from "@/domain/rules/reports"
import { uniqueFamilies } from "@/domain/rules/people"
import { findConflicts, sessionState } from "@/domain/rules/scheduling"
import * as Survey from "@/domain/rules/survey"
import * as Today from "@/domain/rules/today"
import type { Topic } from "@/domain/rules/today"
import { mondayOf } from "@/domain/rules/staff-overview"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import type { Session } from "@/domain/types"
import { useBranch, useEntitlements, useNow, useQueryState } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { usePeriodCountdown } from "@/components/app/period-countdown"
import { tx, nm } from "@/lib/i18n"

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
  const countdown = usePeriodCountdown({ includeRunning: true })
  const rollover = useRolloverNotice(branch.id)
  const [rolloverOpen, setRolloverOpen] = useState(false)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const invoicesAll = useStore((s) => s.invoices).filter((x) => inScope(x.branchId))
  const creditNotesAll = useStore((s) => s.creditNotes).filter((x) => inScope(x.branchId))
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const staff = useStore((s) => s.staff)
  const studentsAll = useStore((s) => s.students).filter((x) => inScope(x.branchId))
  const families = useStore((s) => s.families)
  const surveyResponses = useStore((s) => s.surveyResponses)
  const parentRequests = useStore((s) => s.parentRequests ?? [])
  const leadsAll = useStore((s) => s.leads).filter((x) => inScope(x.branchId))
  const allStudents = useStore((s) => s.students)
  const formSends = useStore((s) => s.formSends ?? [])
  const formResponses = useStore((s) => s.formResponses ?? [])
  const sessionCredits = useStore((s) => s.sessionCredits ?? [])
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
  // owner 2026-11-27: EVERY role sees the same piles — what differs is whose data is in them. A teacher's desk holds the students in their own
  // classes (and those students' invoices), and the leads assigned to them; everyone else's holds the whole branch.
  const myStudentIds = new Set(branchSessions.filter((s) => s.teacherId === me.id).flatMap((s) => s.studentIds))
  const students = mineOnly ? studentsAll.filter((x) => myStudentIds.has(x.id)) : studentsAll
  const invoices = mineOnly ? invoicesAll.filter((x) => myStudentIds.has(x.studentId)) : invoicesAll
  const creditNotes = mineOnly ? creditNotesAll.filter((x) => myStudentIds.has(x.studentId)) : creditNotesAll
  const leads = mineOnly ? leadsAll.filter((x) => x.assigneeId === me.id) : leadsAll
  const todays = branchSessions.filter((s) => s.date === today && (!mineOnly || s.teacherId === me.id)).sort((a, b) => a.start.localeCompare(b.start))

  // ---------- the work, as topics (owner 2026-10-07): one row per kind of work, the list itself lives on its page ----------
  const mine = (s: Session) => !mineOnly || s.teacherId === me.id
  // same 7 days and scope as the Summaries page opens with, so the count there matches
  const summaryRows = branchSessions
    .filter((s) => s.date >= addDays(today, -6) && s.date <= today && mine(s))
    .flatMap((s) => attendance.filter((a) => a.sessionId === s.id && a.status === "present").map((a) => summaries.find((x) => x.sessionId === s.id && x.studentId === a.studentId)))
  const toApprove = summaryRows.filter((sm) => sm?.status === "submitted" && sm.authorId !== me.id && sm.lastEditorId !== me.id).length
  const invoicesToApprove = invoices.filter((i) => canApproveInvoice(i, me).ok).length

  const next7 = branchSessions.filter((s) => s.date >= today && s.date <= addDays(today, 7) && sessionState(s, now) === "upcoming")
  const clashes = findConflicts(next7.filter(mine), branch, staff).length
  const noTeacher = next7.filter(mine).filter((s) => !s.teacherId || !staff.find((t) => t.id === s.teacherId)?.active).length

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
  // ---------- dashboard.view only: period KPI (รายรับ strip + week/month tabs) ----------
  // owner 2026-11-27: money cannot be split by teacher — revenue is the BRANCH total for everyone (only the people / classes / leads are scoped to the person)
  const revRows = R.revenueRows({ invoices: invoicesAll, creditNotes: creditNotesAll, courses, students: studentsAll, totalsOf: (inv) => invoiceTotals(inv, { branch, courses, classes, holidays }) })
  const since = revRows[0]?.date ?? null
  const rev = R.revenueIn(revRows, periodRange)
  const revPrev = R.revenueIn(revRows, prevRange)
  const revChange = R.change(rev.total, revPrev.total, prevRange, since)
  const events = R.studentEvents({ students, entitlements, rows: revRows, today })
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
  const attentionItems = R.needsAttention({
    today, now, rows: revRows, range: mtd, prevRange: R.compareRange("mtd", mtd),
    invoices, entitlements: scopedEnts, attendance, sessions: sessions.filter((s) => inScope(s.branchId) && mine(s)),
    classes: mineOnly ? [] : classes.filter((k) => inScope(k.branchId)), leads,
    activeNow, activeBefore, pendingSummaries: 0, conflicts: 0,
    surveyToCall: Survey.toCall(surveyResponses.filter((r) => inScope(r.branchId) && (!mineOnly || studentFamilyIds.has(r.familyId))), today).length,
    parentRequests: parentRequests.filter((r) => { const b = r.branchId ?? students.find((x) => x.id === r.studentId)?.branchId; return r.status === "new" && !!b && inScope(b) && (!mineOnly || myStudentIds.has(r.studentId)) }).length,
    students, families: families.filter((f) => studentFamilyIds.has(f.id)),
  }, tx, { keepZero: true })

  // ---- what lands in the next 7 days + the invoices that left the office (each is a row of its pile on the desk) ----
  const week7 = addDays(today, 7)
  const mineNext7 = next7.filter(mine)
  const leave7 = attendance.filter((a) => a.status === "leave" && mineNext7.some((s) => s.id === a.sessionId)).length
  const ending7 = students.filter((st) => statusOf.get(st.id) === "active" && entitlements.some((e) => e.studentId === st.id && e.to > addDays(today, 2) && e.to <= week7)).length
  const longLeave7 = leaves.filter((l) => l.from > today && l.from <= week7 && students.some((x) => x.id === l.studentId)).length
  // a sent, unpaid invoice by its pay-by date: still far (waiting for the parent) · due in under 3 days · past due
  const sentDays = invoices.filter((i) => i.status === "sent").map((i) => daysToDue(dueDateOf(i).date, today))
  const sentWaiting = sentDays.filter((d) => d >= 3).length
  const sentDueSoon = sentDays.filter((d) => d >= 0 && d < 3).length
  const sentOverdue = sentDays.filter((d) => d < 0).length

  const mySessionsEnded = branchSessions.filter((s) => s.teacherId === me.id && s.date >= addDays(today, -6) && s.date <= today && ["ended", "closed"].includes(sessionState(s, now)))
  // owner 2026-11-27: writing summaries is NOT required (no deadline, no backlog) — so it is only ever a SUGGESTION, never counted as work.
  // Two kinds: Lesson (what was covered — book / topic / detail, shared with the next teacher) and Student (the note for the parent).
  const endedPresent = mySessionsEnded.map((s) => ({ s, marks: attendance.filter((a) => a.sessionId === s.id && a.status === "present") })).filter((x) => x.marks.length > 0)
  const summaryOf = (sid: string, stuId: string) => summaries.find((x) => x.sessionId === sid && x.studentId === stuId)
  const hintLesson = endedPresent.filter(({ s, marks }) => !marks.some((a) => { const sm = summaryOf(s.id, a.studentId); return !!sm && !!(sm.bookId || sm.topicId || sm.detail?.trim()) })).length
  const hintStudent = endedPresent.flatMap(({ s, marks }) => marks.map((a) => summaryOf(s.id, a.studentId))).filter((sm) => !sm || !sm.text.trim()).length
  const answeredTokens = new Set(formResponses.map((r) => r.token))
  const branchFamilies = new Set(students.map((x) => x.familyId).filter((x): x is string => !!x))
  const formWaiting = formSends.filter((f) => f.kind === "custom" && branchFamilies.has(f.familyId) && !f.closedAt && !answeredTokens.has(f.token)).length

  const topics: Topic[] = [
    ...(can(me, "summary.approve") ? [{ key: "summary_approve", group: "today" as const, title: tx("สรุปการเรียนรออนุมัติ"), detail: tx("ครูส่งมาแล้ว รอคุณตรวจ"), count: toApprove, href: "/summaries?bucket=submitted" }] : []),
    ...(can(me, "billing.approve") ? [{ key: "invoice_approve", group: "today" as const, title: tx("ใบแจ้งหนี้รออนุมัติ"), detail: tx("อนุมัติแล้วจึงส่งผู้ปกครองได้"), count: invoicesToApprove, href: "/billing?filter=pending_approval" }] : []),
    ...[
      { key: "renewal", group: "customers" as const, title: tx("รอต่อคอร์ส"), detail: tx("แพ็กใกล้หมด / เหลือน้อย · ด่วน = หมดใน 2 วัน"), count: renewals.length, urgent: renewalUrgent, href: "/students?status=renewal" },
      { key: "lead_new", group: "customers" as const, title: tx("ลีดใหม่รอติดต่อ"), detail: tx("กำลังตามทั้งหมด {0} ราย", [activeLeads.length]), count: newLeads.length, href: "/crm?view=table" },
      { key: "conflict", group: "teaching" as const, title: tx("คาบชน"), detail: tx("7 วันข้างหน้า"), count: clashes, href: "/calendar?view=list" },
      { key: "no_teacher", group: "teaching" as const, title: tx("คาบยังไม่มีครู"), detail: tx("7 วันข้างหน้า"), count: noTeacher, href: "/calendar?view=list&teacher=none" },
    ],
    // suggestions (not work): only for people who can write summaries
    ...(can(me, "summary.write") ? [
      { key: "hint_lesson", group: "today" as const, title: tx("ยังไม่บันทึกประวัติสอน"), detail: tx("คาบที่เพิ่งจบ ยังไม่มีเล่ม/บท/สิ่งที่สอน — ช่วยครูที่มาสอนต่อ"), count: hintLesson, href: "/summaries?bucket=to_write" },
      { key: "hint_student", group: "today" as const, title: tx("ยังไม่เขียนถึงผู้ปกครอง"), detail: tx("เรียนแล้วแต่ยังไม่มีข้อความรายงาน — ข้ามได้"), count: hintStudent, href: "/summaries?bucket=to_write" },
    ] : []),
    ...(can(me, "billing.approve") ? [{ key: "creditnote_approve", group: "money" as const, title: tx("ใบลดหนี้รออนุมัติ"), detail: tx("อนุมัติแล้วจึงคืนเงิน/เครดิตได้"), count: creditNotes.filter((c) => c.status === "pending_approval").length, href: "/billing" }] : []),
    ...[
      { key: "credit_open", group: "students" as const, title: tx("Credit คาบรอเลือก"), detail: tx("ช่วงพิเศษ — ชดเชย / ต่อวัน / ลดหนี้"), count: sessionCredits.filter((c) => c.status === "open" && inScope(c.branchId) && (!mineOnly || myStudentIds.has(c.studentId))).length, href: "/students" },
      { key: "form_waiting", group: "customers" as const, title: tx("ฟอร์มรอผู้ปกครองตอบ"), detail: tx("ส่งไปแล้วและยังไม่มีคำตอบ"), count: formWaiting, href: "/forms" },
    ],
    ...[
      { key: "invoice_sent_waiting", group: "money" as const, title: tx("ส่งใบแล้ว รอผู้ปกครอง"), detail: tx("ยังไม่ถึงกำหนดชำระ"), count: sentWaiting, href: "/billing?filter=awaiting_payment" },
      { key: "invoice_due_soon", group: "money" as const, title: tx("ใกล้ครบกำหนด"), detail: tx("ภายใน 3 วัน"), count: sentDueSoon, href: "/billing?filter=awaiting_payment" },
      { key: "invoice_overdue", group: "money" as const, title: tx("ใบเลยกำหนดจ่าย"), detail: tx("ส่งไปแล้ว เลยวันครบกำหนด"), count: sentOverdue, href: "/billing?filter=awaiting_payment" },
      { key: "ending7", group: "customers" as const, title: tx("แพ็กจะหมดใน 3–7 วัน"), detail: tx("ทักก่อนหมดจะไม่หลุด"), count: ending7, href: "/students" },
      { key: "longleave7", group: "customers" as const, title: tx("ลาพักยาวจะเริ่ม"), detail: tx("7 วันข้างหน้า"), count: longLeave7, href: "/students" },
    ],
    { key: "leave7", group: "teaching" as const, title: tx("แจ้งลาล่วงหน้า"), detail: tx("นักเรียนที่จะไม่มาในคาบที่ยังไม่ถึง"), count: leave7, href: "/calendar?view=list" },
    ...Today.attentionTopics(attentionItems),
  ]

  // owner 2026-11-27: the desk — every kind of work sits in ONE pile (domain/rules/desk.ts); the impact pile also counts what the page draws itself
  const impactRows = countdown.items.length + (rollover ? 1 : 0)
  const piles = orderPiles(Desk.buildPiles(topics, { impact: impactRows }))

  // Week mode: the whole week's sessions as a 7-day board
  const weekSessions = branchSessions.filter((s) => R.inRange(s.date, weekRange) && (!mineOnly || s.teacherId === me.id))

  // Pulse (DASHBOARD.md §3/§4): branch rhythm as charts. Bars show a 7-day window (the week in Week mode, the last 7
  // days in Day mode); the donut / in-out / leads totals follow the Day|Week period.
  const barFrom = range === "week" ? weekStart : addDays(today, -6)
  const revByDay = Array.from({ length: 7 }, (_, i) => addDays(barFrom, i)).map((d) => ({ d, label: fmtDate(d, { weekday: true }).split(" ")[0], total: revRows.filter((x) => x.date === d).reduce((a, x) => a + x.total, 0) }))
  const myStudentOk = (id: string) => !mineOnly || myStudentIds.has(id)
  const periodMarks = attendance.filter((a) => { const se = sessions.find((x) => x.id === a.sessionId); return !!se && inScope(se.branchId) && mine(se) && myStudentOk(a.studentId) && R.inRange(se.date, periodRange) })
  const attParts = { present: periodMarks.filter((a) => a.status === "present").length, leave: periodMarks.filter((a) => a.status === "leave").length, absent: periodMarks.filter((a) => a.status === "absent").length }
  const attRate = attParts.present + attParts.absent > 0 ? attParts.present / (attParts.present + attParts.absent) : null
  const lostCount = R.countEvents(events, periodRange, "lost")
  const periodLeads = leads.filter((l) => R.inRange(l.createdAt.slice(0, 10), periodRange))
  const leadsBySource = Object.entries(periodLeads.reduce<Record<string, number>>((m, l) => ({ ...m, [l.source]: (m[l.source] ?? 0) + 1 }), {}))
    .map(([src, n]) => ({ label: LEAD_SOURCE_LABEL[src as keyof typeof LEAD_SOURCE_LABEL] ?? src, value: n }))
    .sort((a, b) => b.value - a.value)
  // ---- KPI row = THIS MONTH for every card (owner 2026-11-27); each visual draws its own comparison, the figures sit in a hover card ----
  const mb = monthBounds(today)
  const monthEnd = addDays(mb.from, mb.days - 1)
  const mtdNow = R.periodRange("mtd", today)
  const mtdPrev = R.compareRange("mtd", mtdNow)
  const inOut = { now: { in: R.countEvents(events, mtdNow, "new"), out: R.countEvents(events, mtdNow, "lost") }, prev: { in: R.countEvents(events, mtdPrev, "new"), out: R.countEvents(events, mtdPrev, "lost") } }
  // the students bar = everyone on the books this month, by where they stand: studying · awaiting renewal · paused (long leave now) · left this month
  const pausedNow = students.filter((st) => R.stateOn(st.id, today, scopedEnts, leaves) === "paused").length
  const renewalNow = [...statusOf.values()].filter((v) => v === "renewal").length
  const studentParts = [
    { label: tx("เรียนอยู่"), value: Math.max(activeStudents - renewalNow - pausedNow, 0), tone: "a" as const },
    { label: tx("พัก"), value: pausedNow, tone: "b" as const },
    { label: tx("รอต่อ"), value: renewalNow, tone: "c" as const },
    { label: tx("ออกเดือนนี้"), value: inOut.now.out, tone: "danger" as const },
  ]
  const cumNow = cumulativeByDay(revRows, mb.from, mb.days, mb.day)
  const cumPrev = cumulativeByDay(revRows, mb.prevFrom, mb.prevDays, mb.prevDays)
  const monthRev = cumNow.at(-1) ?? 0
  const prevSameDay = cumPrev[Math.min(mb.day, mb.prevDays) - 1] ?? 0
  const monthChange = prevSameDay > 0 ? ((monthRev - prevSameDay) / prevSameDay) * 100 : null
  const monthSessions = branchSessions.filter((s) => s.date >= mb.from && s.date <= monthEnd && mine(s))
  const isOver = (s: Session) => ["ended", "closed"].includes(sessionState(s, now))
  const monthDone = monthSessions.filter(isOver).length
  const monthOpen = monthSessions.filter((s) => !isOver(s))
  const problemIds = new Set([
    ...monthOpen.filter((s) => !s.teacherId || !staff.find((t) => t.id === s.teacherId)?.active).map((s) => s.id),
    ...findConflicts(monthOpen, branch, staff).flatMap((c) => c.sessionIds),
  ])
  const monthProblem = monthOpen.filter((s) => problemIds.has(s.id)).length
  const monthLeads = leads.filter((l) => R.inRange(l.createdAt.slice(0, 10), mtdNow)).length
  const leadStages = PIPELINE_GROUPS.slice(0, 4).map((g) => ({ label: g.label, value: activeLeads.filter((l) => g.stages.includes(l.stage)).length }))

  const pulseData: PulseData = { periodLabel: tx(RANGE_LABEL[range]), revByDay, revTotal: rev.total, revDelta: revChange, attendance: attParts, attendanceRate: attRate, newCount, lostCount, leadsBySource, today }

  // ความเคลื่อนไหว: one feed (domain/rules/activity.ts) cut down to this role — the branch sees all of it, a teacher only what happens to their own students
  const feedAll = buildActivity({
    students: allStudents, invoices: invoices.map((x) => ({ ...x, payments: x.payments })), attendance, sessions: branchSessions, leads,
    parentRequests: parentRequests.filter((r) => inScope(r.branchId ?? allStudents.find((x) => x.id === r.studentId)?.branchId ?? "")), creditNotes, formSends, tr: tx,
  }, { branchIds: scope.ids })
  const feed = branchView ? feedAll : feedAll.filter((e) => (e.kind === "attendance" || e.kind === "request") && !!e.studentId && myStudentIds.has(e.studentId))

  return (
    <Page>
      {/* owner 2026-10-09: same header and width as every page */}
      <PageHeader title={`${tx("สวัสดี")} ${nm(me.nickname)}`} description={`${fmtDate(today, { weekday: true, year: true })} ${tx("· สาขา")}${nm(branch.name)}`}
        actions={<>
          {/* owner 2026-11-27: what appears/disappears (the week stepper) sits LEFT of the Day|Week switch — the switch itself never moves, so you can keep tapping it */}
          {range === "week" && <RangeStepper todaySide="left" label={`${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6), { year: true })}`} current={weekStart === mondayOf(today)}
            onPrev={() => setWeekStart(addDays(weekStart, -7))} onNext={() => setWeekStart(addDays(weekStart, 7))} onToday={() => setWeekStart(mondayOf(today))} />}
          <Segmented label={tx("ช่วงเวลา")} value={range} onChange={(v) => setRange(v)}
            options={[{ value: "today", label: tx("วันนี้") }, { value: "week", label: tx("สัปดาห์") }]} />
          <ActivityButton events={feed} today={today} />
          {scope.select}
        </>} />
      {/* owner 2026-11-19: yearly grade change reminder — owner 2026-11-25: a row in ต้องรู้ไว้ (the banner was in the way) */}
      {rolloverOpen && <RolloverDialog branchId={branch.id} onClose={() => setRolloverOpen(false)} />}

      {/* owner 2026-11-27: the SAME four cards for every role — numbers that concern this person · the shared Design System `Kpi` (one KPI card for the whole app) */}
      <KpiRow>
        <KpiV icon={BanknoteIcon} label={tx("รายรับเดือนนี้")} value={kpiMoney(monthRev)}
          sub={monthChange !== null && isFinite(monthChange) ? <span className={monthChange >= 0 ? "text-success-ink" : "text-danger-ink"}>{monthChange >= 0 ? "▲ +" : "▼ "}{Math.round(monthChange)}%</span> : null}
          visual={<PaceLines now={cumNow} prev={cumPrev} days={mb.days} tip={<TipRows title={tx("สะสมถึงวันที่ {0}", [mb.day])} rows={[
            { label: tx("เดือนนี้"), value: fmtMoney(monthRev), mark: "primary" }, { label: tx("เดือนก่อน วันเดียวกัน"), value: fmtMoney(prevSameDay), mark: "faint" },
            { label: tx("เดือนก่อน ทั้งเดือน"), value: fmtMoney(cumPrev.at(-1) ?? 0), mark: "faint" }]} />} />} />
        <KpiV icon={GraduationCapIcon} label={tx("นักเรียนที่เรียนอยู่")} value={activeStudents} sub={tx("{0} ครอบครัว", [activeFamilies])}
          visual={<PlanBar parts={studentParts.map((x) => ({ value: x.value, tone: x.tone }))} tip={<TipRows title={tx("นักเรียนเดือนนี้")} rows={[
            ...studentParts.map((x) => ({ label: x.label, value: x.value, mark: x.tone === "a" ? "primary" as const : x.tone === "b" ? "p65" as const : x.tone === "c" ? "p40" as const : "danger" as const })),
            { label: tx("สุทธิ (เข้า − ออก)"), value: `${inOut.now.in - inOut.now.out > 0 ? "+" : ""}${inOut.now.in - inOut.now.out}` },
            { label: tx("เดือนก่อน เข้า"), value: inOut.prev.in }, { label: tx("เดือนก่อน ออก"), value: inOut.prev.out }]} />} />} />
        <KpiV icon={UserSearchIcon} label={tx("ลีดที่กำลังตาม")} value={activeLeads.length}
          sub={tx("เข้ามาเดือนนี้ {0}", [monthLeads])}
          visual={<StageBar stages={leadStages} tip={<TipRows title={tx("ลีดแบ่งตามขั้น")} rows={leadStages.map((x, i) => ({ label: x.label, value: x.value, mark: (["primary", "p70", "p45", "p25"] as const)[i] }))} />} />} />
        <KpiV icon={CalendarDaysIcon} label={tx("คาบเรียนเดือนนี้")} value={`${monthDone}/${monthSessions.length}`}
          sub={monthProblem > 0 ? <span className="text-danger-ink">{tx("มีปัญหา {0}", [monthProblem])}</span> : null}
          visual={<ShareBar done={monthDone} todo={monthOpen.length - monthProblem} problem={monthProblem} tip={<TipRows title={tx("คาบเดือนนี้ {0} คาบ", [monthSessions.length])} rows={[
            { label: tx("จบแล้ว"), value: monthDone, mark: "primary" }, { label: tx("ยังไม่ถึง"), value: monthOpen.length - monthProblem, mark: "p25" },
            { label: tx("มีปัญหา (ไม่มีครู / ชน)"), value: monthProblem, tone: monthProblem > 0 ? "danger" : undefined, mark: "danger" }]} />} />} />
      </KpiRow>

      {/* owner 2026-11-27: a DESK — each pile carries its own big number + its rows in story order; the day's classes below */}
      {piles.length === 0 && (
        <p className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-foreground/5">{tx("เคลียร์หมดแล้ว — ไม่มีงานค้าง")}</p>
      )}
      <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {piles.map((p, i) => (
          <PileCard key={p.key} pile={p} className={i === piles.length - 1 ? (piles.length % 3 === 1 ? "lg:col-span-3" : piles.length % 3 === 2 ? "lg:col-span-2" : undefined) : undefined}>
            {p.key === "impact" && (
              <>
                {rollover && (
                  <li>
                    <Button variant="row" size="inline" type="button" onClick={rollover.action ? () => setRolloverOpen(true) : undefined} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-muted/60">
                      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{rollover.title}</span><span className="block truncate text-xs text-muted-foreground">{rollover.sub}</span></span>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </li>
                )}
                <CountdownRows items={countdown.items} branchId={countdown.branchId} />
              </>
            )}
          </PileCard>
        ))}
      </div>

      {/* a section fills the screen — it never takes the width of what is inside it (min-w-0 lets the strip of cards scroll instead of stretching the page) */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-4">
        <div className="min-w-0 [&>*]:h-full">
          {range === "week"
            ? <WeekSessions sessions={weekSessions} weekStart={weekStart} today={today} now={now} />
            : <DaySessions todays={todays} now={now} attendance={attendance} mineOnly={mineOnly}
                onOpen={setOpenSessionId} />}
        </div>
      </div>

      <Pulse data={pulseData} />

      <SessionSheet sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
    </Page>
  )
}
