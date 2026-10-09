"use client"

import { usePeriod } from "@/components/app/period-control"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { staffAt } from "@/domain/rules/permissions"
import { useState } from "react"
import { CalendarDaysIcon, CircleCheckIcon, ClipboardCheckIcon, PenLineIcon } from "lucide-react"
import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { SessionSheet } from "@/components/app/session-sheet"
import { subjectColor } from "@/components/app/subject-color"
import { WORK_ORDER, WorkChip } from "@/components/app/work-state"
import { endTime, fmtDate } from "@/domain/dates"
import { WORK_LABEL, workState, type WorkState } from "@/domain/rules/scheduling"
import { useBranch, useLookup, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { sessionKindLabel } from "@/domain/rules/forms"
import { removedWithClass } from "@/domain/rules/scheduling"


/** Session list for daily operations: what needs attendance / summaries right now. */
export default function SessionsPage() {
  const now = useNow()
  const branch = useBranch()
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const me = useStore((s) => s.me())
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const L = useLookup()
  // owner 2026-10-09: the shared date control — default this week (same on Sessions / Attendance / Summaries)
  const period = usePeriod("week")
  // everyone sees every session by default; teachers get a one-tap "only mine" filter
  const [teacher, setTeacher] = useState("all")
  const [workParam, setWorkParam] = useQueryState<WorkState | "all">("work", "all")
  const work = workParam === "all" ? null : workParam
  const setWork = (w: WorkState | null) => setWorkParam(w ?? "all")
  const [openId, setOpenId] = useState<string | null>(null)

  const { from, to } = period
  const list = sessions
    .filter((s) => scope.ids.includes(s.branchId) && s.date >= from && s.date <= to && !removedWithClass(s, classes))
    .filter((s) => teacher === "all" || s.teacherId === teacher || s.coTeacherIds.includes(teacher))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const withState = list.map((s) => ({ s, w: workState(s, now, attendance, summaries) }))
  const counts: Partial<Record<WorkState, number>> = {}
  withState.forEach(({ w }) => (counts[w.state] = (counts[w.state] ?? 0) + 1))
  const shown = withState.filter(({ w }) => !work || w.state === work)
  const dates = [...new Set(shown.map(({ s }) => s.date))]

  const pick = (w: WorkState) => setWork(work === w ? null : w)

  return (
    <Page>
      <PageHeader title="คาบเรียน & เช็คชื่อ" description="คาบที่ต้องเช็คชื่อและเขียนสรุป — กดคาบเพื่อเปิดทำงาน" />
      <KpiRow>
        <Kpi icon={CalendarDaysIcon} label="คาบในช่วงนี้" value={withState.filter(({ w }) => w.state !== "cancelled").length} onClick={() => setWork(null)} />
        <Kpi icon={ClipboardCheckIcon} label="รอเช็คชื่อ" value={counts.needs_attendance ?? 0} tone="red" valueClassName={counts.needs_attendance ? "text-red-700" : undefined} onClick={() => pick("needs_attendance")} active={work === "needs_attendance"} />
        <Kpi icon={PenLineIcon} label="รอสรุป" value={counts.needs_summary ?? 0} tone="amber" valueClassName={counts.needs_summary ? "text-amber-700" : undefined} onClick={() => pick("needs_summary")} active={work === "needs_summary"} />
        <Kpi icon={CircleCheckIcon} label="เสร็จแล้ว" value={counts.done ?? 0} tone="emerald" onClick={() => pick("done")} active={work === "done"} />
      </KpiRow>
      <Toolbar end={<>
        <NativeSelect className="h-9 w-36" value={teacher} onChange={(e) => setTeacher(e.target.value)}
          options={[
            { value: "all", label: "ครูทุกคน" },
            ...(me.roles.includes("teacher") ? [{ value: me.id, label: "เฉพาะคาบของฉัน" }] : []),
            ...staff.map((t) => staffAt(t, branch.id)).filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id) && t.id !== me.id).map((t) => ({ value: t.id, label: t.nickname })),
          ]} />
        {/* every state, incl. the ones without a card (รอเริ่ม / กำลังเรียน / ยกเลิก) */}
        <NativeSelect className="h-9 w-40" value={work ?? ""} onChange={(e) => setWork((e.target.value || null) as WorkState | null)} placeholder={`ทุกสถานะ (${withState.length})`}
          options={WORK_ORDER.map((w) => ({ value: w, label: `${WORK_LABEL[w]} (${counts[w] ?? 0})` }))} />
        {/* owner 2026-10-09: branch chip always last in the row */}
        {scope.select}
      </>}>
        {period.control}
      </Toolbar>

      {shown.length === 0 && <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">ไม่มีคาบในช่วงนี้</p>}
      {dates.map((d) => (
        <section key={d}>
          {period.mode !== "day" && <h3 className="mb-1 text-sm font-semibold">{fmtDate(d, { weekday: true })}</h3>}
          <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
            {shown.filter(({ s }) => s.date === d).map(({ s, w }) => {
              const c = subjectColor(s.subject)
              const t = L.teacher(s.teacherId)
              return (
                <button key={s.id} onClick={() => setOpenId(s.id)} data-focus={w.state === "needs_attendance" ? "unmarked" : undefined} className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40">
                  <span className={cn("h-9 w-1 rounded-full", c.bar)} />
                  <span className="w-24 text-sm tabular-nums">{s.start}–{endTime(s.start, s.minutes)}</span>
                  <span className="min-w-40 flex-1">
                    <span className="block text-sm font-medium">{classes.find((k) => k.id === s.classId)?.name ?? s.subject}{sessionKindLabel(s) && <Pill tone="violet" className="ml-2">{sessionKindLabel(s)}</Pill>}{scope.multi && <span className="ml-2 align-middle"><BranchCode code={scope.code(s.branchId)} /></span>}</span>
                    <span className="block text-xs text-muted-foreground">
                      <span className={cn(t.missing && "text-amber-700")}>{t.label}</span> · {L.room(s.roomId)} · {s.studentIds.length} คน
                    </span>
                  </span>
                  <WorkChip w={w} students={s.studentIds.length} className={w.state === "scheduled" ? "" : ""} />
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <SessionSheet sessionId={openId} onClose={() => setOpenId(null)} />
    </Page>
  )
}
