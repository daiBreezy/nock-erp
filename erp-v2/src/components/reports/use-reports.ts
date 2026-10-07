"use client"

import { useMemo } from "react"
import { addDays, toDateStr } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import * as R from "@/domain/rules/reports"
import * as Loss from "@/domain/rules/loss"
import * as Survey from "@/domain/rules/survey"
import { CAPACITY, findConflicts, hoursFor, isHoliday, sessionState } from "@/domain/rules/scheduling"
import { useEntitlements, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { tx, uiLang } from "@/lib/i18n"

/**
 * Everything the Reports page shows for a set of branches and a period — computed from the store through
 * domain/rules/reports.ts only (no numbers made up in components).
 */
/** taught already: today's finished sessions ("ended") and every earlier one ("closed") */
const isOver = (st: string) => st === "ended" || st === "closed"

export function useReports(branchIds: string[], period: R.PeriodKey, custom?: R.Range) {
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
    const range = R.periodRange(period, today, custom)
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
    const strip = R.PERIODS.filter((p) => R.STRIP_PERIODS.includes(p.key)).map((p) => {
      const r = R.periodRange(p.key, today)
      const c = R.compareRange(p.key, r)
      const v = R.revenueIn(rows, r).total
      return { ...p, range: r, value: v, change: R.change(v, R.revenueIn(rows, c).total, c, since), vs: R.COMPARE_LABEL[p.key] }
    })

    const rev = R.revenueIn(rows, range)
    const revPrev = R.revenueIn(rows, prev)
    const att = R.attendanceRate(sessions.filter((x) => isOver(sessionState(x, now))), s.attendance, range)
    const attPrev = R.attendanceRate(sessions.filter((x) => isOver(sessionState(x, now))), s.attendance, prev)
    // this calendar week Mon–Sun (the KPI card), not the rolling "Week" period
    const wd = new Date(`${today}T00:00:00`).getDay()
    const monday = addDays(today, wd === 0 ? -6 : 1 - wd)
    const weekSessions = sessions.filter((x) => !x.cancelled && R.inRange(x.date, { from: monday, to: addDays(monday, 6) })).length

    const branches = s.branches.filter((b) => ids.has(b.id))
    const conflicts = branches.reduce((n, b) => n + findConflicts(sessions.filter((x) => x.branchId === b.id && x.date >= today && sessionState(x, now) === "upcoming"), b, s.staff).length, 0)
    const sessionIds = new Set(sessions.map((x) => x.id))
    const pendingSummaries = s.summaries.filter((x) => sessionIds.has(x.sessionId) && ["draft", "submitted", "changes_requested"].includes(x.status)).length
    const studentFamilyIds = new Set(students.map((x) => x.familyId).filter((x): x is string => !!x))
    const attention = R.needsAttention({
      today, now, rows, range, prevRange: prev,
      invoices: s.invoices.filter((i) => ids.has(i.branchId)), entitlements: ents, attendance: s.attendance, sessions,
      classes: s.classes.filter((k) => ids.has(k.branchId)), leads: s.leads.filter((l) => ids.has(l.branchId)),
      activeNow: active, activeBefore: activeAtStart, pendingSummaries, conflicts,
      surveyToCall: Survey.toCall(s.surveyResponses.filter((r) => ids.has(r.branchId)), today).length,
      students, families: s.families.filter((f) => studentFamilyIds.has(f.id)),
    }, tx)

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
        .map((r) => { const k = s.classes.find((x) => x.id === r.key); return { ...r, name: k?.name ?? tx("คาบเดี่ยว"), branch: s.branches.find((b) => b.id === k?.branchId)?.name ?? "" } }).filter((r) => r.present + r.leave > 0).sort((a, b) => (a.rate ?? 1) - (b.rate ?? 1)),
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

    // ---- R3: CRM, cohort, forecast ----
    // win-back leads are old students to call again, not new leads — kept out of the funnel
    const leads = s.leads.filter((l) => ids.has(l.branchId) && !l.winBackOf)
    const crm = {
      funnel: R.leadFunnel(leads, range),
      sources: R.leadSources(leads, rows, range),
      lost: R.lostLeads(leads, range),
      lostReasons: [...leads.filter((l) => l.stage === "archived" && R.inRange(l.createdAt.slice(0, 10), range))
        .reduce((m, l) => { const k = l.lost ? Loss.reasonLabel(l.lost.reasonId, s.system.lossReasons, uiLang()) : l.archiveReason || tx("ไม่ระบุ"); return m.set(k, (m.get(k) ?? 0) + 1) }, new Map<string, number>())]
        .map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
      // where lost leads went + the times they wanted that we could not offer (owner 2026-10-05)
      competitors: [...leads.filter((l) => l.lost?.competitor && R.inRange(l.createdAt.slice(0, 10), range))
        .reduce((m, l) => m.set(l.lost!.competitor!, (m.get(l.lost!.competitor!) ?? 0) + 1), new Map<string, number>())].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      wantedTimes: [...leads.filter((l) => l.lost?.wantedTime && R.inRange(l.createdAt.slice(0, 10), range))
        .reduce((m, l) => m.set(l.lost!.wantedTime!, (m.get(l.lost!.wantedTime!) ?? 0) + 1), new Map<string, number>())].map(([time, count]) => ({ time, count })).sort((a, b) => b.count - a.count),
      open: leads.filter((l) => l.stage !== "archived" && l.stage !== "enrolled").length,
      perBranch: branches.map((b) => { const f = R.leadFunnel(leads.filter((l) => l.branchId === b.id), range); return { id: b.id, name: b.name, leads: f[0].count, enrolled: f[f.length - 1].count, conversion: f[f.length - 1].ofAll } }),
      monthly: {
        thisYear: Array.from({ length: 12 }, (_, m) => { const k = `${year}-${String(m + 1).padStart(2, "0")}`; return k > today.slice(0, 7) ? null : leads.filter((l) => l.createdAt.startsWith(k)).length }),
        lastYear: Array.from({ length: 12 }, (_, m) => leads.filter((l) => l.createdAt.startsWith(`${year - 1}-${String(m + 1).padStart(2, "0")}`)).length || null),
      },
    }
    const cohortByBranchYear = R.cohortRetention({ students, entitlements: ents, rows, today, groupOf: (st, joined) => `${st.branchId}|${joined.slice(0, 4)}` })
    const cohortMonthly = (branchId: string | null) => R.cohortRetention({ students: branchId ? students.filter((x) => x.branchId === branchId) : students, entitlements: ents, rows, today, groupOf: (_, joined) => joined.slice(0, 7) })
    // forecast to the end of the year: open invoices + renewals at the renewal rate of the last 6 months
    const renewalUsed = R.renewalRate(events, R.periodRange("6m", today)) ?? 0.8
    const openInvoices = s.invoices.filter((i) => ids.has(i.branchId) && (i.status === "approved" || i.status === "sent"))
      .map((i) => ({ studentId: i.studentId, amount: invoiceTotals(i, { branch: s.branches.find((b) => b.id === i.branchId)!, courses: s.courses, classes: s.classes, holidays: s.holidays }).total, date: (i.sentAt ?? i.createdAt).slice(0, 10) }))
    const fc = R.forecastRevenue({ today, until: `${year}-12-31`, renewal: renewalUsed, entitlements: ents, rows, openInvoices })
    const forecast = {
      renewal: renewalUsed, open: openInvoices.reduce((a, o) => a + o.amount, 0), openCount: openInvoices.length,
      byMonth: Array.from({ length: 12 }, (_, m) => { const f = fc.get(`${year}-${String(m + 1).padStart(2, "0")}`); return f ? { renewals: f.renewals, open: f.open, total: f.renewals + f.open } : null }),
      newAvg: R.avgNewRevenue(rows, events, today),
    }

    const exits = R.exitSummary(students, range)

    // yearly parent survey (owner 2026-10-05): per year, scoped to the branches in view
    const surveyYears = [...new Set(s.surveyCampaigns.map((c) => c.year))].sort((a, b) => b - a)
    const surveyOf = (y: number) => {
      const c = s.surveyCampaigns.find((x) => x.year === y)
      const rs = s.surveyResponses.filter((r) => r.year === y && ids.has(r.branchId))
      const sent = c ? c.recipients.filter((x) => ids.has(x.branchId)).length : 0
      return {
        campaign: c, responses: rs, summary: Survey.summarize(rs, sent),
        byBranch: branches.map((b) => { const br = rs.filter((r) => r.branchId === b.id); return { id: b.id, name: b.name, nps: Survey.nps(br.map((r) => r.answers.nps)), n: br.length, sent: c ? c.recipients.filter((x) => x.branchId === b.id).length : 0 } }),
        teachers: Survey.teacherScores(rs).map((t) => ({ ...t, staff: s.staff.find((x) => x.id === t.teacherId) })),
        wants: Survey.wantsCount(rs),
        toCall: Survey.toCall(rs, today),
      }
    }

    return {
      exits, surveyYears, surveyOf,
      attendanceTab, operations, crm, cohortByBranchYear, cohortMonthly, forecast,
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
      // owner 2026-10-07: what moved each month this year — in (new, returning) vs out (lost, long leave)
      movementMonthly: Array.from({ length: 12 }, (_, m) => {
        const ym = `${year}-${String(m + 1).padStart(2, "0")}`
        if (ym > today.slice(0, 7)) return null
        const of = (k: "new" | "returning" | "lost") => events.filter((e) => e.kind === k && e.date.startsWith(ym) && e.date <= today).length
        return { newCount: of("new"), returning: of("returning"), lost: of("lost"), pauses: leaves.filter((l) => l.from.startsWith(ym) && l.from <= today).length }
      }),
      activeMonthly: {
        thisYear: R.activeByMonth(year, today, students.map((x) => x.id), ents, leaves),
        lastYear: R.activeByMonth(year - 1, today, students.map((x) => x.id), ents, leaves),
      },
      perBranch,
      // sessions per weekday per branch over the last 8 weeks — the Summary picks the quietest for a pilot slot
      branchLoad: branches.map((b) => {
        const w = [0, 0, 0, 0, 0, 0, 0]
        sessions.forEach((x) => { if (x.branchId === b.id && !x.cancelled && x.date >= addDays(today, -56) && x.date <= today) w[new Date(`${x.date}T00:00:00`).getDay()]++ })
        return { label: b.name, byWeekday: w }
      }),
    }
  }, [allRows, ids, period, custom, today, now, s.students, s.leaves, s.sessions, s.attendance, s.branches, s.staff, s.summaries, s.invoices, s.classes, s.leads, s.families, s.holidays, s.system, s.courses, s.surveyCampaigns, s.surveyResponses, entitlementsAll])
}

export type ReportData = ReturnType<typeof useReports>
