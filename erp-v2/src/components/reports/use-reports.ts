"use client"

import { useMemo } from "react"
import { addDays, toDateStr } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import * as R from "@/domain/rules/reports"
import { CAPACITY, findConflicts, hoursFor, isHoliday, sessionState } from "@/domain/rules/scheduling"
import { useEntitlements, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

/**
 * Everything the Reports page shows for a set of branches and a period — computed from the store through
 * domain/rules/reports.ts only (no numbers made up in components).
 */
/** taught already: today's finished sessions ("ended") and every earlier one ("closed") */
const isOver = (st: string) => st === "ended" || st === "closed"

export function useReports(branchIds: string[], period: R.PeriodKey) {
  const now = useNow(60_000)
  const today = toDateStr(now)
  const s = useStore()
  const entitlementsAll = useEntitlements()
  const ids = useMemo(() => new Set(branchIds), [branchIds])

  // revenue rows of every branch once (the branch comparison needs them all); the rest filters by scope
  const allRows = useMemo(() => R.revenueRows({
    invoices: s.invoices, creditNotes: s.creditNotes, courses: s.courses, students: s.students,
    totalsOf: (inv) => invoiceTotals(inv, { branch: s.branches.find((b) => b.id === inv.branchId)!, courses: s.courses, classes: s.classes, holidays: s.holidays }),
  }), [s.invoices, s.creditNotes, s.courses, s.students, s.branches, s.classes, s.holidays])

  return useMemo(() => {
    const rows = allRows.filter((x) => ids.has(x.branchId))
    const range = R.periodRange(period, today)
    const prev = R.compareRange(period, range)
    const students = s.students.filter((x) => ids.has(x.branchId))
    const studentIds = new Set(students.map((x) => x.id))
    const ents = entitlementsAll.filter((e) => studentIds.has(e.studentId))
    const leaves = s.leaves.filter((l) => studentIds.has(l.studentId))
    const sessions = s.sessions.filter((x) => ids.has(x.branchId))
    const events = R.studentEvents({ students, entitlements: ents, rows, today })
    const year = Number(today.slice(0, 4))
    // the oldest record we have — comparisons reaching before it would compare against missing data
    const since = rows[0]?.date ?? null

    const countState = (date: string, st: R.StudentStateOn) => students.filter((x) => R.stateOn(x.id, date, ents, leaves) === st).length
    const active = countState(today, "active")
    const paused = countState(today, "paused")
    const activeAtStart = countState(addDays(range.from, -1), "active")

    // the period strip: every period with its own comparison
    const strip = R.PERIODS.map((p) => {
      const r = R.periodRange(p.key, today)
      const c = R.compareRange(p.key, r)
      const v = R.revenueIn(rows, r).total
      return { ...p, range: r, value: v, change: R.change(v, R.revenueIn(rows, c).total, c, since), vs: R.COMPARE_LABEL[p.key] }
    })

    const rev = R.revenueIn(rows, range)
    const revPrev = R.revenueIn(rows, prev)
    const att = R.attendanceRate(sessions.filter((x) => isOver(sessionState(x, now))), s.attendance, range)
    const attPrev = R.attendanceRate(sessions.filter((x) => isOver(sessionState(x, now))), s.attendance, prev)
    const weekRange = R.periodRange("week", today)
    const weekSessions = sessions.filter((x) => !x.cancelled && R.inRange(x.date, { from: weekRange.from, to: addDays(weekRange.from, 6) })).length

    const branches = s.branches.filter((b) => ids.has(b.id))
    const conflicts = branches.reduce((n, b) => n + findConflicts(sessions.filter((x) => x.branchId === b.id && x.date >= today && sessionState(x, now) === "upcoming"), b, s.staff).length, 0)
    const sessionIds = new Set(sessions.map((x) => x.id))
    const pendingSummaries = s.summaries.filter((x) => sessionIds.has(x.sessionId) && ["draft", "submitted", "changes_requested"].includes(x.status)).length
    const attention = R.needsAttention({
      today, now, rows, range, prevRange: prev,
      invoices: s.invoices.filter((i) => ids.has(i.branchId)), entitlements: ents, attendance: s.attendance, sessions,
      classes: s.classes.filter((k) => ids.has(k.branchId)), leads: s.leads.filter((l) => ids.has(l.branchId)),
      activeNow: active, activeBefore: activeAtStart, pendingSummaries, conflicts,
    })

    const perBranch = branches.map((b) => ({
      id: b.id, name: b.name,
      revenue: R.revenueIn(rows.filter((x) => x.branchId === b.id), range).total,
      newCount: R.countEvents(events, range, "new", b.id), returning: R.countEvents(events, range, "returning", b.id),
      lost: R.countEvents(events, range, "lost", b.id), pauses: R.pausesIn(leaves, range, students, b.id),
      active: students.filter((x) => x.branchId === b.id && R.stateOn(x.id, today, ents, leaves) === "active").length,
    }))

    // ---- R2: attendance + operations (from real sessions; the system's first session = when data starts) ----
    const ended = sessions.filter((x) => isOver(sessionState(x, now)))
    const sessionSince = sessions.reduce<string | null>((m, x) => (!m || x.date < m ? x.date : m), null) ?? today
    const subjectOf = (x: { subject: string }) => x.subject
    const monthKeyOf = (x: { date: string }) => x.date.slice(0, 7)
    const attMonthly = R.attendanceBy(ended, s.attendance, { from: `${year}-01-01`, to: today }, monthKeyOf)
    const classesInScope = s.classes.filter((k) => ids.has(k.branchId))
    const attendanceTab = {
      since: sessionSince,
      total: R.attendanceRate(ended, s.attendance, range),
      noQuota: R.attendanceBy(ended, s.attendance, range, () => "all")[0]?.noQuota ?? 0,
      byBranch: R.attendanceBy(ended, s.attendance, range, (x) => s.sessions.find((y) => y.id === x.id)?.branchId ?? null)
        .map((r) => ({ ...r, name: s.branches.find((b) => b.id === r.key)?.name ?? r.key })).sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1)),
      bySubject: R.attendanceBy(ended, s.attendance, range, subjectOf).sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1)),
      byWeekday: R.attendanceBy(ended, s.attendance, range, (x) => String(new Date(`${x.date}T00:00:00`).getDay())),
      byClass: R.attendanceBy(ended, s.attendance, range, (x) => s.sessions.find((y) => y.id === x.id)?.classId ?? null)
        .map((r) => ({ ...r, name: s.classes.find((k) => k.id === r.key)?.name ?? "คาบเดี่ยว" })).filter((r) => r.present + r.leave > 0).sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1)),
      monthly: Array.from({ length: 12 }, (_, m) => attMonthly.find((r) => r.key === `${year}-${String(m + 1).padStart(2, "0")}`)?.rate ?? null),
      leavers: R.frequentLeavers(ended, s.attendance, range),
      cancelled: R.cancellations(sessions, range),
    }
    const operations = {
      since: sessionSince,
      teachers: R.teacherStats({ sessions, attendance: s.attendance, summaries: s.summaries, range, now, deadlineHours: s.system.settings.summaryDeadlineHours })
        .map((t) => ({ ...t, staff: s.staff.find((x) => x.id === t.teacherId) })),
      rooms: branches.map((b) => {
        const rooms = R.roomUtilization(b, sessions, range, { since: sessionSince, closed: (d) => !!isHoliday(d, b.id, s.holidays), hoursOn: (d) => hoursFor(b, d) })
        const booked = rooms.reduce((a, x) => a + x.booked, 0), open = rooms.reduce((a, x) => a + x.open, 0)
        return { id: b.id, name: b.name, rooms, rate: open ? booked / open : null, booked }
      }),
      fill: R.classFill(classesInScope, CAPACITY),
    }

    return {
      attendanceTab, operations,
      today, now, range, prev, rows, events, students, since, comparable: !!since && prev.from >= since,
      kpi: {
        revenue: rev.total, revenueChange: R.change(rev.total, revPrev.total, prev, since),
        active, paused, activeChange: R.change(active, activeAtStart, { from: range.from, to: range.from }, since),
        weekSessions, attendance: att.rate, attendanceChange: att.rate !== null && attPrev.rate !== null ? Math.round((att.rate - attPrev.rate) * 1000) / 10 : null,
        attention: attention.length,
      },
      rev, revPrev, strip, attention,
      monthly: {
        thisYear: R.monthlyRevenue(rows, year, today), lastYear: R.monthlyRevenue(rows, year - 1, today), year,
        // this month so far vs the same days last year
        lastYearToDate: R.revenueIn(rows, { from: `${year - 1}${today.slice(4, 8)}01`, to: `${year - 1}${today.slice(4)}` }).total,
      },
      byBranch: R.revenueByBranch(allRows.filter((x) => ids.has(x.branchId)), range, branches),
      bySubject: R.revenueBySubject(rows, range),
      packages: R.packageMix(rows, range),
      packageGrade: R.packageByGrade(rows, range),
      families: R.topFamilies(rows, range, { students: s.students, families: s.families, today }),
      demand: (subject?: string) => R.demandByDayHour(sessions, range, { subject }),
      studentFlow: {
        newCount: R.countEvents(events, range, "new"), returning: R.countEvents(events, range, "returning"),
        lost: R.countEvents(events, range, "lost"), pauses: R.pausesIn(leaves, range, students),
        renewal: R.renewalRate(events, range), renewalPrev: R.renewalRate(events, prev),
        newPrev: R.countEvents(events, prev, "new"), lostPrev: R.countEvents(events, prev, "lost"),
      },
      activeMonthly: {
        thisYear: R.activeByMonth(year, today, students.map((x) => x.id), ents, leaves),
        lastYear: R.activeByMonth(year - 1, today, students.map((x) => x.id), ents, leaves),
      },
      perBranch,
    }
  }, [allRows, ids, period, today, now, s.students, s.leaves, s.sessions, s.attendance, s.branches, s.staff, s.summaries, s.invoices, s.classes, s.leads, s.families, s.holidays, s.system, entitlementsAll])
}

export type ReportData = ReturnType<typeof useReports>
