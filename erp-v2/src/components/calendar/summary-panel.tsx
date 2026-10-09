"use client"

// Calendar › Summary (owner 2026-10-09): side panel with the whole picture of the range on screen — numbers, every
// problem the admin has to handle (click → open the session), and the classes grouped by teacher or by subject.
import { useMemo, useState } from "react"
import { AlertTriangleIcon, CheckCircle2Icon, ChevronDownIcon, InfoIcon, OctagonAlertIcon } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { subjectColor } from "@/components/app/subject-color"
import { dayShort, endTime, fmtDate } from "@/domain/dates"
import { calendarSummary, groupSummaryRows, type SummaryIssue } from "@/domain/rules/calendar-summary"
import type { Conflict } from "@/domain/rules/scheduling"
import type { ID, Session } from "@/domain/types"
import { useBranch, useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const fmtHours = (min: number) => `${Math.round((min / 60) * 10) / 10} ชม.`

const LEVEL = {
  red: { icon: OctagonAlertIcon, box: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200", dot: "bg-red-500" },
  amber: { icon: AlertTriangleIcon, box: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200", dot: "bg-amber-500" },
  info: { icon: InfoIcon, box: "border-border bg-muted/40 text-foreground", dot: "bg-muted-foreground" },
} as const

export function SummaryPanel({ open, onClose, title, sessions, conflicts, now, onOpenSession }: {
  open: boolean
  onClose: () => void
  title: string
  /** every session of the range on screen, cancelled included (filters applied) */
  sessions: Session[]
  conflicts: Conflict[]
  now: Date
  onOpenSession: (id: ID) => void
}) {
  const branch = useBranch()
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const [by, setBy] = useState<"teacher" | "subject">("teacher")
  const sum = useMemo(
    () => (open ? calendarSummary(sessions, { branch, classes, staff, holidays, conflicts, attendance, summaries, now }) : null),
    [open, sessions, branch, classes, staff, holidays, conflicts, attendance, summaries, now],
  )
  const look = useLookup()
  const groups = sum ? groupSummaryRows(sum.rows, by) : []
  const red = sum?.issues.filter((i) => i.level === "red").reduce((n, i) => n + i.sessionIds.length, 0) ?? 0
  const amber = sum?.issues.filter((i) => i.level === "amber").reduce((n, i) => n + i.sessionIds.length, 0) ?? 0

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pb-3">
          <SheetTitle className="text-lg">Summary</SheetTitle>
          <SheetDescription>{title} · {branch.name}</SheetDescription>
        </SheetHeader>
        {sum && (
          <div className="space-y-5 px-4 pt-4 pb-6">
            {/* totals */}
            <div className="grid grid-cols-3 divide-x rounded-2xl bg-muted/50 py-2 sm:grid-cols-5">
              {([["คลาส", sum.classes], ["คาบ", sum.sessions], ["ครู", sum.teachers], ["นักเรียน", sum.students], ["ชั่วโมงสอน", fmtHours(sum.minutes)]] as const).map(([l, v]) => (
                <div key={l} className="px-2 text-center">
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                  <p className="text-lg font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            {/* problems to handle */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">ต้องจัดการ</h3>
                {red > 0 && <span className="rounded-full bg-red-100 px-2 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">ด่วน {red}</span>}
                {amber > 0 && <span className="rounded-full bg-amber-100 px-2 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">ควรดู {amber}</span>}
              </div>
              {sum.issues.length === 0 ? (
                <p className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2Icon className="size-4" /> ไม่มีปัญหาในช่วงนี้
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {sum.issues.map((i) => <IssueItem key={i.kind} issue={i} sessions={sessions} onOpenSession={onOpenSession} />)}
                </ul>
              )}
            </section>

            {/* classes by teacher | subject */}
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">คลาสทั้งหมด</h3>
                <div className="ml-auto inline-flex rounded-full bg-muted p-1">
                  {(["teacher", "subject"] as const).map((x) => (
                    <button key={x} onClick={() => setBy(x)} className={cn("rounded-full px-3 py-0.5 text-xs", by === x ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
                      {x === "teacher" ? "ตามครู" : "ตามวิชา"}
                    </button>
                  ))}
                </div>
              </div>
              {groups.length === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">ไม่มีคาบในช่วงนี้</p>}
              {groups.map((g) => {
                const color = by === "subject" ? subjectColor(g.key) : null
                const total = g.rows.reduce((n, r) => n + r.sessions, 0)
                return (
                  <div key={g.key || "none"} className="overflow-hidden rounded-2xl border">
                    <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 text-sm">
                      {color && <span className={cn("size-2.5 rounded-full", color.bar)} />}
                      <span className={cn("font-medium", by === "teacher" && !g.key && "text-red-700")}>{by === "teacher" ? look.teacher(g.key || null).label : g.key}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{g.rows.length} คลาส · {total} คาบ</span>
                    </div>
                    <table className="w-full table-fixed text-sm">
                      <tbody className="divide-y">
                        {g.rows.map((r) => (
                          <tr key={r.key} className="align-top">
                            <td className="w-[38%] p-2">
                              <p className="truncate font-medium" title={r.name}>{r.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{by === "teacher" ? r.subjects.join(", ") : r.teacherIds.map((t) => look.teacher(t).label).join(", ") || "ยังไม่มีครู"}</p>
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">
                              {r.slots.slice(0, 3).map((x) => <p key={`${x.weekday}${x.start}`} className="tabular-nums">{dayShort(x.weekday)} {x.start}–{endTime(x.start, x.minutes)}</p>)}
                              {r.slots.length > 3 && <p>+{r.slots.length - 3} เวลา</p>}
                              <p className="truncate">{r.roomIds.map((id) => look.room(id)).join(", ") || "ยังไม่ระบุห้อง"}</p>
                            </td>
                            <td className="w-20 p-2 text-right text-xs tabular-nums">
                              <p>{r.students} คน</p>
                              <p className="text-muted-foreground">{r.sessions} คาบ</p>
                              {r.problems > 0 && <p className={cn("font-medium", r.urgent ? "text-red-700" : "text-amber-700")} title="คาบที่ต้องจัดการ">⚠ {r.problems}</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function IssueItem({ issue, sessions, onOpenSession }: { issue: SummaryIssue; sessions: Session[]; onOpenSession: (id: ID) => void }) {
  const [open, setOpen] = useState(issue.level === "red")
  const look = useLookup()
  const classes = useStore((s) => s.classes)
  const L = LEVEL[issue.level]
  const list = issue.sessionIds.map((id) => sessions.find((s) => s.id === id)).filter((s): s is Session => !!s).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  return (
    <li className={cn("rounded-2xl border", L.box)}>
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        <L.icon className="size-4 shrink-0" />
        <span className="font-medium">{issue.title}</span>
        <span className="rounded-full bg-background/70 px-1.5 text-xs font-semibold tabular-nums">{list.length}</span>
        <span className="ml-auto hidden truncate text-xs opacity-80 sm:block">{issue.hint}</span>
        <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="space-y-0.5 border-t border-current/10 px-2 py-1.5">
          <li className="px-1 pb-1 text-xs opacity-80 sm:hidden">{issue.hint}</li>
          {list.slice(0, 30).map((s) => (
            <li key={s.id}>
              <button className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs hover:bg-background/60" onClick={() => onOpenSession(s.id)}>
                <span className="w-24 shrink-0 tabular-nums">{fmtDate(s.date, { weekday: true })}</span>
                <span className="w-20 shrink-0 tabular-nums">{s.start}–{endTime(s.start, s.minutes)}</span>
                <span className="truncate font-medium">{classes.find((k) => k.id === s.classId)?.name ?? s.subject}</span>
                <span className="ml-auto shrink-0 opacity-80">{look.teacher(s.teacherId).label}</span>
              </button>
            </li>
          ))}
          {list.length > 30 && <li className="px-1.5 py-1 text-xs opacity-80">+{list.length - 30} คาบ</li>}
        </ul>
      )}
    </li>
  )
}
