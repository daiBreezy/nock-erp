"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { AlertTriangleIcon, ArrowRightIcon, BanknoteIcon, CheckCircle2Icon, ChartColumnIcon, ChevronRightIcon, GraduationCapIcon, RefreshCwIcon, SparklesIcon, UserMinusIcon, UserPlusIcon, UserSearchIcon, UserXIcon, XCircleIcon } from "lucide-react"
import { Pill, SessionStateBadge } from "@/components/app/badges"
import { DashboardHeader } from "@/components/app/dashboard-header"
import { SessionSheet } from "@/components/app/session-sheet"
import { StudentSheet } from "@/components/app/student-sheet"
import { avatarTone, gradeTone, initial, subjectColor } from "@/components/app/subject-color"
import { AttentionButton, AttentionDialog } from "@/components/reports/attention-dialog"
import { Delta, fmtNum } from "@/components/reports/charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { addDays, endTime, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { canApprove as canApproveInvoice, invoiceTotals } from "@/domain/rules/billing"
import { LEAD_STAGE_LABEL } from "@/domain/rules/crm"
import { sessionKindLabel } from "@/domain/rules/forms"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import { renewHref, studentLabel } from "@/domain/rules/people"
import * as R from "@/domain/rules/reports"
import { findConflicts, sessionState, STATE_LABEL } from "@/domain/rules/scheduling"
import * as Survey from "@/domain/rules/survey"
import type { Attendance, Session } from "@/domain/types"
import { useBranch, useEntitlements, useLookup, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { tx } from "@/lib/i18n"

type RangeKey = "today" | "week" | "month"
const PERIOD_OF: Record<RangeKey, R.PeriodKey> = { today: "today", week: "week", month: "mtd" }
const RANGE_LABEL: Record<RangeKey, string> = { today: "วันนี้", week: "สัปดาห์นี้", month: "เดือนนี้" }

/**
 * Dashboard (owner 2026-10-06): merges the old executive-only `/dashboard` and the universal `/` "วันนี้"
 * page into one — everyone lands here, content adapts per role. `dashboard.view` (Director/Area Manager/
 * Manager/Super Admin, not Admin/teacher) gates the KPI strip, the week/month tabs and the management cards
 * (renewals, leads, activity) — everyone else only ever sees the "วันนี้" personal work queue, unchanged
 * from the old Today page.
 */
export default function DashboardPage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
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
  const [openStudentId, setOpenStudentId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  const [showAttention, setShowAttention] = useState(false)

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

  // ---------- everyone: today's personal work queue (unchanged from the old Today page) ----------
  const todo = (() => {
    const out: { key: string; label: string; detail: string; href?: string; onClick?: () => void; tone: "amber" | "red" | "blue" }[] = []
    branchSessions
      .filter((s) => s.date >= addDays(today, -7) && ["ended"].includes(sessionState(s, now)) && (!mineOnly || s.teacherId === me.id))
      .forEach((s) => {
        const missing = s.studentIds.filter((sid) => !attendance.some((a) => a.sessionId === s.id && a.studentId === sid)).length
        if (missing) out.push({ key: `att${s.id}`, label: `ยังไม่เช็คชื่อ ${missing} คน`, detail: `${s.subject} ${fmtDate(s.date)} ${s.start}`, onClick: () => setOpenSessionId(s.id), tone: "red" })
      })
    const present = attendance.filter((a) => a.status === "present")
    present.forEach((a) => {
      const s = branchSessions.find((x) => x.id === a.sessionId)
      if (!s || s.date < addDays(today, -7)) return
      const sm = summaries.find((x) => x.sessionId === a.sessionId && x.studentId === a.studentId)
      if (s.teacherId === me.id && (!sm || sm.status === "draft" || sm.status === "changes_requested"))
        out.push({ key: `sw${s.id}${a.studentId}`, label: sm?.status === "changes_requested" ? "สรุปถูกขอแก้" : "เขียนสรุปการเรียน", detail: `${L.student(a.studentId)?.nickname} · ${s.subject} ${fmtDate(s.date)}`, onClick: () => setOpenSessionId(s.id), tone: "amber" })
      if (sm?.status === "submitted" && can(me, "summary.approve") && sm.authorId !== me.id && sm.lastEditorId !== me.id)
        out.push({ key: `sa${sm.id}`, label: "สรุปรออนุมัติ", detail: `${L.student(a.studentId)?.nickname} · ${s.subject} ${fmtDate(s.date)}`, onClick: () => setOpenSessionId(s.id), tone: "blue" })
    })
    if (can(me, "billing.approve"))
      invoices.filter((i) => canApproveInvoice(i, me).ok).forEach((i) =>
        out.push({ key: `inv${i.id}`, label: "ใบแจ้งหนี้รออนุมัติ", detail: `${i.number} · ${students.find((s) => s.id === i.studentId)?.nickname}`, href: `/billing?open=${i.id}`, tone: "blue" }))
    return out
  })()

  const alerts = (() => {
    if (mineOnly) return []
    const next7 = branchSessions.filter((s) => s.date >= today && s.date <= addDays(today, 7))
    const out: { key: string; text: string; href: string; kind: "conflict" | "no_teacher" | "renewal" }[] = []
    findConflicts(next7, branch, staff).forEach((c, i) => {
      const s = next7.find((x) => x.id === c.sessionIds[0])!
      out.push({ key: `c${i}`, text: `${fmtDate(s.date, { weekday: true })}: ${c.message}`, href: "/calendar", kind: "conflict" })
    })
    next7.filter((s) => !s.teacherId || !staff.find((t) => t.id === s.teacherId)?.active).forEach((s) => out.push({ key: `t${s.id}`, text: `${fmtDate(s.date, { weekday: true })} ${s.start} ${s.subject}: ยังไม่มีครูสอน`, href: "/calendar", kind: "no_teacher" }))
    // owner 2026-10-06: the full renewal list below already covers this for dashboard.view roles — avoid saying it twice
    if (!hasOverview) entitlements.forEach((e) => {
      const stu = students.find((x) => x.id === e.studentId)
      if (!stu || e.to < today) return
      const msg = Att.lowBalanceAlert(e, Att.balance(e, sessions, attendance, classes), today)
      const course = courses.find((c) => c.id === e.courseId)?.name
      if (msg) out.push({ key: `e${e.id}`, text: `ต่ออายุ ${studentLabel(stu, families.find((f) => f.id === stu.familyId)?.name)} · ${course ?? "คอร์ส"}: ${msg}`, href: renewHref(stu.id, e.id), kind: "renewal" })
    })
    return out
  })()

  // ---------- dashboard.view only: current-state management cards ----------
  const statusOf = new Map(students.map((s) => [s.id, Att.studentStatus(s, entitlements, leaves, today)]))
  const activeStudents = [...statusOf.values()].filter((v) => v === "active" || v === "renewal").length
  // owner 2026-10-06: a renewal check-in that got no answer can be snoozed to a later date (renewalFollowUpDue) —
  // keeps this list to "needs doing today", not an ever-growing pile of names already being chased
  const renewalRows = students
    .filter((s) => statusOf.get(s.id) === "renewal" && Att.renewalFollowUpDue(s, today))
    .map((stu) => {
      const ents = entitlements.filter((e) => e.studentId === stu.id && e.to >= today)
      const messages = ents.map((e) => { const m = Att.lowBalanceAlert(e, Att.balance(e, sessions, attendance, classes), today); return m && `${courses.find((c) => c.id === e.courseId)?.name ?? "คอร์ส"}: ${m}` }).filter((m): m is string => !!m)
      const urgent = ents.some((e) => e.kind === "sessions" && Att.balance(e, sessions, attendance, classes).remaining <= 1) || ents.some((e) => e.to <= addDays(today, 2))
      return { stu, messages, urgent }
    })
    .sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1))
  // owner 2026-10-06: "ติดต่อวันนี้ X/Y" on the renewal card — Y is the most students seen on the list this
  // visit (grows if a new one shows up, never shrinks), X = how many of those have since been contacted/snoozed
  const [renewalStart, setRenewalStart] = useState(() => renewalRows.length)
  useEffect(() => { if (renewalRows.length > renewalStart) setRenewalStart(renewalRows.length) }, [renewalRows.length, renewalStart]) // eslint-disable-line react-hooks/set-state-in-effect
  const renewalDone = Math.max(0, renewalStart - renewalRows.length)
  const activeLeads = leads.filter((l) => l.stage !== "archived" && l.stage !== "enrolled")
  const newLeads = leads.filter((l) => l.stage === "new")
  const recentActivity = (() => {
    if (!hasOverview) return []
    const payments = invoices.flatMap((i) => i.payments.filter((p) => p.confirmedBy).map((p) => ({ at: p.recordedAt, text: `ชำระเงิน · ${students.find((s) => s.id === i.studentId)?.nickname ?? "-"} · ${fmtMoney(invoiceTotals(i, { branch, courses, classes, holidays }).total)}`, tone: "green" as const })))
    const att = attendance
      .filter((a) => a.status !== "leave")
      .slice(-60)
      .map((a) => {
        const se = sessions.find((x) => x.id === a.sessionId)
        const stu = students.find((x) => x.id === a.studentId)
        if (!se || !stu || se.branchId !== branch.id) return null
        return { at: a.markedAt, text: `${a.status === "present" ? "เข้าเรียน" : "ขาดเรียน"} · ${stu.nickname} · ${se.subject}`, tone: a.status === "present" ? ("blue" as const) : ("red" as const) }
      })
      .filter((x): x is { at: string; text: string; tone: "blue" | "red" } => !!x)
    return [...payments, ...att].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
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

  // owner 2026-10-06: same Need Attention list as Reports (domain/rules/reports.ts needsAttention — the one
  // source of truth), scoped to this branch — so an admin/director catches these without a trip to Reports
  const studentIds = new Set(students.map((s) => s.id))
  const scopedEnts = entitlements.filter((e) => studentIds.has(e.studentId))
  const studentFamilyIds = new Set(students.map((s) => s.familyId).filter((x): x is string => !!x))
  const activeNow = hasOverview ? students.filter((s) => R.stateOn(s.id, today, scopedEnts, leaves) === "active").length : 0
  const activeBefore = hasOverview ? students.filter((s) => R.stateOn(s.id, addDays(periodRange.from, -1), scopedEnts, leaves) === "active").length : 0
  const branchSessionIds = new Set(branchSessions.map((s) => s.id))
  const pendingSummaries = hasOverview ? summaries.filter((x) => branchSessionIds.has(x.sessionId) && ["draft", "submitted", "changes_requested"].includes(x.status)).length : 0
  const conflicts = hasOverview ? findConflicts(sessions.filter((s) => s.branchId === branch.id && s.date >= today && sessionState(s, now) === "upcoming"), branch, staff).length : 0
  const attentionItems = hasOverview ? R.needsAttention({
    today, now, rows: revRows, range: periodRange, prevRange,
    invoices, entitlements: scopedEnts, attendance, sessions: sessions.filter((s) => s.branchId === branch.id),
    classes: classes.filter((k) => k.branchId === branch.id), leads,
    activeNow, activeBefore, pendingSummaries, conflicts,
    surveyToCall: Survey.toCall(surveyResponses.filter((r) => r.branchId === branch.id), today).length,
    students, families: families.filter((f) => studentFamilyIds.has(f.id)),
  }, tx) : []

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DashboardHeader name={me.nickname} today={today} branchName={branch.name} />
        {hasOverview && (
          <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRangeParam(v[0] as RangeKey)} variant="outline" size="sm">
            <ToggleGroupItem value="today">วันนี้</ToggleGroupItem>
            <ToggleGroupItem value="week">สัปดาห์นี้</ToggleGroupItem>
            <ToggleGroupItem value="month">เดือนนี้</ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {hasOverview && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Kpi icon={<GraduationCapIcon className="size-4" />} label="นักเรียนที่เรียนอยู่" value={String(activeStudents)} tone="emerald" sub={`จากทั้งหมด ${students.length} คน`} />
          <Kpi icon={<AlertTriangleIcon className="size-4" />} label="รอต่อคอร์ส" value={String(renewalRows.length)} tone={renewalRows.some((r) => r.urgent) ? "red" : "amber"} sub={renewalRows.some((r) => r.urgent) ? `${renewalRows.filter((r) => r.urgent).length} คนด่วน` : renewalRows.length ? "ยังไม่ด่วน" : "เรียบร้อยหมด"} />
          <Kpi icon={<BanknoteIcon className="size-4" />} label={`รายรับ${RANGE_LABEL[range]}`} value={fmtMoney(rev.total)} tone="violet" sub={<span className="flex items-center gap-1"><Delta value={revChange} /> {R.COMPARE_LABEL[periodKey]}</span>} />
          <Kpi icon={<UserSearchIcon className="size-4" />} label="ลีดที่กำลังตาม" value={String(activeLeads.length)} tone={newLeads.length ? "sky" : "emerald"} sub={newLeads.length ? `${newLeads.length} รายใหม่ยังไม่ติดต่อ` : "ติดต่อครบแล้ว"} />
          <AttentionButton count={attentionItems.length} onClick={() => setShowAttention(true)} className="col-span-2 md:col-span-1" />
        </div>
      )}

      {range === "today" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>{mineOnly ? "คาบของฉันวันนี้" : "คาบเรียนวันนี้"}</CardTitle>
                <CardDescription>{todays.length} คาบ · สถานะเปลี่ยนตามเวลาจริงอัตโนมัติ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {todays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">วันนี้ไม่มีคาบเรียน</p>}
                {todays.filter((s) => !["ended", "closed"].includes(sessionState(s, now))).map((s) => (
                  <TodaySessionRow key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => setOpenSessionId(s.id)} />
                ))}
                {(() => {
                  const past = todays.filter((s) => ["ended", "closed"].includes(sessionState(s, now)))
                  if (!past.length) return null
                  return (
                    <>
                      <button onClick={() => setShowPast((v) => !v)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">
                        <ChevronRightIcon className={cn("size-3.5 transition-transform", showPast && "rotate-90")} /> จบแล้ว {past.length} คาบ
                      </button>
                      {showPast && past.map((s) => (
                        <TodaySessionRow key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => setOpenSessionId(s.id)} muted />
                      ))}
                    </>
                  )
                })()}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>งานที่รอคุณ</CardTitle>
                <CardDescription>{todo.length ? `${todo.length} รายการ` : "ไม่มีงานค้าง"}</CardDescription>
                {endedToday.length > 0 && (
                  <div className="mt-1 grid gap-2.5 sm:grid-cols-2">
                    <HeaderProgress label="เช็คชื่อวันนี้" done={attendanceDone} total={endedToday.length} />
                    <HeaderProgress label="สรุปการเรียนวันนี้" done={summaryDone} total={presentToday.length} />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-1.5">
                {todo.length === 0 && <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><CheckCircle2Icon className="size-4 text-emerald-600" /> เคลียร์หมดแล้ว</p>}
                {todo.slice(0, 12).map((t) => {
                  const inner = (
                    <>
                      <Pill tone={t.tone}>{t.label}</Pill>
                      <span className="min-w-0 flex-1 truncate text-sm">{t.detail}</span>
                      <ArrowRightIcon className="size-4 text-muted-foreground" />
                    </>
                  )
                  return t.href ? (
                    <Link key={t.key} href={t.href} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/60">{inner}</Link>
                  ) : (
                    <button key={t.key} onClick={t.onClick} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-muted/60">{inner}</button>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          {hasOverview && (
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>รอต่อคอร์ส</CardTitle>
                  <CardDescription>{renewalRows.length ? `${renewalRows.length} คน — เรียงตามความด่วน` : "ไม่มีใครรอต่อคอร์ส"}</CardDescription>
                  {renewalStart > 0 && <div className="mt-1"><HeaderProgress label="ติดต่อวันนี้" done={renewalDone} total={renewalStart} /></div>}
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {renewalRows.length === 0 && <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><CheckCircle2Icon className="size-4 text-emerald-600" /> ทุกคนต่อคอร์สเรียบร้อย</p>}
                  {renewalRows.slice(0, 8).map(({ stu, messages, urgent }) => (
                    <button key={stu.id} onClick={() => setOpenStudentId(stu.id)} className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left hover:bg-muted/50">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(stu.id))}>{initial(stu.nickname)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm font-medium">{stu.nickname} <span className="font-normal text-muted-foreground">{stu.name}</span> <span className={cn("rounded px-1.5 py-0.5 text-xs", gradeTone(stu.grade))}>{stu.grade}</span></div>
                        <div className="truncate text-xs text-muted-foreground">{messages.join(" · ") || "ใกล้หมดแพ็กเกจ"}{stu.renewalFollowUps?.length ? ` · ติดตามแล้ว ${stu.renewalFollowUps.length} ครั้ง` : ""}</div>
                      </div>
                      {urgent && <Pill tone="red">ด่วน</Pill>}
                      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>ลีดใหม่</CardTitle>
                  <CardDescription>{newLeads.length ? `${newLeads.length} รายรอติดต่อ` : "ไม่มีลีดใหม่"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {newLeads.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีลีดใหม่วันนี้</p>}
                  {newLeads.slice(0, 6).map((l) => (
                    <Link key={l.id} href="/crm" className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/60">
                      <span className="min-w-0 flex-1 truncate text-sm">{l.name} <span className="text-xs text-muted-foreground">· {l.subject} {l.childGrade}</span></span>
                      <Pill tone="blue">{LEAD_STAGE_LABEL[l.stage]}</Pill>
                    </Link>
                  ))}
                  <Link href="/crm" className="flex items-center justify-center gap-1 pt-1 text-xs text-primary hover:underline">
                    ไปที่ CRM <ArrowRightIcon className="size-3" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangleIcon className="size-4 text-amber-600" /> ต้องจัดการ (7 วันข้างหน้า)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-0.5 sm:grid-cols-2">
                {alerts.map((a) => {
                  const Icon = ALERT_ICON[a.kind]
                  return (
                    <Link key={a.key} href={a.href} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", ALERT_TONE[a.kind])}><Icon className="size-3.5" /></span>
                      <span className="min-w-0 flex-1 truncate">{a.text}</span>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {hasOverview && (
            <Card>
              <CardHeader>
                <CardTitle>กิจกรรมล่าสุด</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0.5">
                {recentActivity.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>}
                {recentActivity.map((e, i) => {
                  const Icon = e.tone === "green" ? BanknoteIcon : e.tone === "red" ? XCircleIcon : CheckCircle2Icon
                  return (
                    <div key={i} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm">
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", e.tone === "green" ? "bg-emerald-100 text-emerald-700" : e.tone === "red" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700")}><Icon className="size-3.5" /></span>
                      <span className="min-w-0 flex-1 truncate">{e.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(e.at.slice(0, 10))}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        // week/month (dashboard.view only): how the period went, not a task queue — for the operational
        // detail (alerts, pending renewals) switch back to "วันนี้", for a full breakdown go to Reports
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi icon={<UserPlusIcon className="size-4" />} label={`นักเรียนใหม่ · ${RANGE_LABEL[range]}`} value={`+${fmtNum(newCount)}`} tone="emerald" sub={<span className="flex items-center gap-1"><Delta value={R.change(newCount, newPrev, prevRange, since)} /> {R.COMPARE_LABEL[periodKey]}</span>} />
            <Kpi icon={<UserMinusIcon className="size-4" />} label={`นักเรียนหลุด · ${RANGE_LABEL[range]}`} value={`−${fmtNum(lostCount)}`} tone={lostCount ? "red" : "emerald"} sub={<span className="flex items-center gap-1"><Delta value={R.change(lostCount, lostPrev, prevRange, since)} invert /> {R.COMPARE_LABEL[periodKey]}</span>} />
            <Kpi icon={<UserSearchIcon className="size-4" />} label={`Lead ใหม่ · ${RANGE_LABEL[range]}`} value={fmtNum(leadsInRange)} tone="sky" sub={<span className="flex items-center gap-1"><Delta value={R.change(leadsInRange, leadsPrevRange, prevRange, since)} /> {R.COMPARE_LABEL[periodKey]}</span>} />
          </div>
          <Link href="/reports" className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground">
            <ChartColumnIcon className="size-4" /> ดูรายละเอียดเพิ่มที่ Reports <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      )}

      <SessionSheet sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
      <StudentSheet studentId={openStudentId} onClose={() => setOpenStudentId(null)} />
      {hasOverview && <AttentionDialog open={showAttention} onClose={() => setShowAttention(false)} items={attentionItems} />}
    </div>
  )
}

const ALERT_ICON = { conflict: AlertTriangleIcon, no_teacher: UserXIcon, renewal: RefreshCwIcon } as const
const ALERT_TONE = { conflict: "bg-red-100 text-red-700", no_teacher: "bg-amber-100 text-amber-700", renewal: "bg-sky-100 text-sky-700" } as const

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
        <div className="truncate text-sm font-medium">{s.subject}{sessionKindLabel(s) && <Pill tone="violet" className="ml-2">{sessionKindLabel(s)}</Pill>}</div>
        <div className="truncate text-xs text-muted-foreground">
          <span className={cn(t.missing && "text-amber-700")}>{t.label}</span> · {L.room(s.roomId)} · เช็คชื่อแล้ว {marked}/{s.studentIds.length}
        </div>
      </div>
      {st === "live" ? <SessionStateBadge state={st} /> : <span className="shrink-0 text-xs text-muted-foreground">{STATE_LABEL[st]}</span>}
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
