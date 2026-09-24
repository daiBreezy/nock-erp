"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { SessionSheet } from "@/components/app/session-sheet"
import { subjectColor } from "@/components/app/subject-color"
import { WorkChip, WorkLegend } from "@/components/app/work-state"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { addDays, endTime, fmtDate, toDateStr, weekdayOf } from "@/domain/dates"
import { seesAllSessions } from "@/domain/rules/permissions"
import { workState, type WorkState } from "@/domain/rules/scheduling"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Range = "day" | "week"

/** Session list for daily operations: what needs attendance / summaries right now. */
export default function SessionsPage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const L = useLookup()
  const [range, setRange] = useState<Range>("day")
  const [anchor, setAnchor] = useState(today)
  const [teacher, setTeacher] = useState(seesAllSessions(me) ? "all" : me.id)
  const [work, setWork] = useState<WorkState | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const from = range === "day" ? anchor : addDays(anchor, -((weekdayOf(anchor) + 6) % 7))
  const to = range === "day" ? anchor : addDays(from, 6)
  const list = sessions
    .filter((s) => s.branchId === branch.id && s.date >= from && s.date <= to)
    .filter((s) => teacher === "all" || s.teacherId === teacher || s.coTeacherIds.includes(teacher))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const withState = list.map((s) => ({ s, w: workState(s, now, attendance, summaries) }))
  const counts: Partial<Record<WorkState, number>> = {}
  withState.forEach(({ w }) => (counts[w.state] = (counts[w.state] ?? 0) + 1))
  const shown = withState.filter(({ w }) => !work || w.state === work)
  const dates = [...new Set(shown.map(({ s }) => s.date))]

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="icon-sm" variant="outline" aria-label="ก่อนหน้า" onClick={() => setAnchor(addDays(anchor, range === "day" ? -1 : -7))}><ChevronLeftIcon /></Button>
        <Button size="sm" variant="outline" onClick={() => setAnchor(today)}>วันนี้</Button>
        <Button size="icon-sm" variant="outline" aria-label="ถัดไป" onClick={() => setAnchor(addDays(anchor, range === "day" ? 1 : 7))}><ChevronRightIcon /></Button>
        <h2 className="font-semibold">{range === "day" ? fmtDate(anchor, { weekday: true, year: true }) : `${fmtDate(from)} – ${fmtDate(to, { year: true })}`}</h2>
        <div className="ml-auto flex flex-wrap gap-2">
          <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRange(v[0] as Range)} variant="outline" size="sm">
            <ToggleGroupItem value="day">วัน</ToggleGroupItem>
            <ToggleGroupItem value="week">สัปดาห์</ToggleGroupItem>
          </ToggleGroup>
          {seesAllSessions(me) ? (
            <NativeSelect className="h-8 w-36" value={teacher} onChange={(e) => setTeacher(e.target.value)}
              options={[{ value: "all", label: "ครูทุกคน" }, ...staff.filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id)).map((t) => ({ value: t.id, label: t.nickname }))]} />
          ) : <Pill tone="blue">คาบของฉัน</Pill>}
        </div>
      </div>
      <WorkLegend counts={counts} active={work} onToggle={setWork} />

      {shown.length === 0 && <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">ไม่มีคาบในช่วงนี้</p>}
      {dates.map((d) => (
        <section key={d}>
          {range === "week" && <h3 className="mb-1 text-sm font-semibold">{fmtDate(d, { weekday: true })}</h3>}
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {shown.filter(({ s }) => s.date === d).map(({ s, w }) => {
              const c = subjectColor(s.subject)
              const t = L.teacher(s.teacherId)
              return (
                <button key={s.id} onClick={() => setOpenId(s.id)} className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40">
                  <span className={cn("h-9 w-1 rounded-full", c.bar)} />
                  <span className="w-24 text-sm tabular-nums">{s.start}–{endTime(s.start, s.minutes)}</span>
                  <span className="min-w-40 flex-1">
                    <span className="block text-sm font-medium">{classes.find((k) => k.id === s.classId)?.name ?? s.subject}{s.trial && <Pill tone="violet" className="ml-2">ทดลอง</Pill>}</span>
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
    </div>
  )
}
