"use client"

import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { ChipOverflow } from "@/components/app/chip-overflow"
import { gradeTone, subjectColor } from "@/components/app/subject-color"
import { LayersIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePeriod } from "@/components/app/period-control"
import { ListPage, SearchBox, Segmented } from "@/components/app/page-layout"
import { FilterMenu } from "@/components/app/filter-menu"
import { staffAt } from "@/domain/rules/permissions"
import { useBranch } from "@/lib/hooks"
import { matchesQuery } from "@/domain/rules/people"
import { InfoTip } from "@/components/reports/charts"
import type { Tone } from "@/components/app/badges"
import { Kpi, type KpiTone } from "@/components/app/kpi"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { useState } from "react"
import { CheckIcon, FilePenIcon, HourglassIcon, PenLineIcon, SendIcon, type LucideIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { CourseSummaryPanel } from "@/components/app/course-summary-sheet"
import { SessionSheet } from "@/components/app/session-sheet"
import { fmtDate, toDateStr } from "@/domain/dates"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import * as Sum from "@/domain/rules/summaries"
import type { ID, SummaryStatus } from "@/domain/types"
import { subjectsOf } from "@/domain/rules/scheduling"
import { SessionLine } from "@/components/app/session-line"
import { report } from "@/lib/feedback"
import { useLookup, useNow, useQueryState } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { Empty } from "@/components/app/empty"

// owner 2026-10-13: six statuses, in the order the work moves — "not written" and "draft" are no longer one pile
type Bucket = "to_write" | "draft" | "submitted" | "approved" | "sent" | "changes"
const BUCKETS: { key: Bucket; label: string; tone: string }[] = [
  { key: "to_write", label: "ยังไม่ได้เขียน", tone: "text-danger" },
  { key: "draft", label: "เขียนแล้ว", tone: "text-special-ink" },
  { key: "submitted", label: "รออนุมัติ", tone: "text-warning" },
  { key: "approved", label: "ได้ Approve แล้ว กำลังรอส่ง", tone: "text-info" },
  { key: "sent", label: "ส่งแล้ว", tone: "text-success" },
  { key: "changes", label: "ขอแก้ไข", tone: "text-danger" },
]

const PILL_TONE: Record<Bucket, Tone> = { to_write: "red", draft: "gray", submitted: "amber", approved: "blue", sent: "green", changes: "red" }
const bucketOf = (status: SummaryStatus | undefined): Bucket => (!status ? "to_write" : status === "changes_requested" ? "changes" : status)

/**
 * Teaching-menu tidy-up (2026-11-13): the 6 statuses fold into 4 KPI cards so the row is the same 4 equal cards as every
 * other page. The 6 statuses are still shown as the row pill and can be picked one by one in the "ตัวกรอง" menu.
 */
type Stage = "write" | "draft" | "pending" | "sent"
const STAGES: { key: Stage; label: string; icon: LucideIcon; tone: KpiTone; buckets: Bucket[] }[] = [
  { key: "write", label: "ต้องเขียน / แก้ไข", icon: PenLineIcon, tone: "red", buckets: ["to_write", "changes"] },
  { key: "draft", label: "เขียนแล้ว", icon: FilePenIcon, tone: "special", buckets: ["draft"] },
  { key: "pending", label: "รออนุมัติ / รอส่ง", icon: HourglassIcon, tone: "amber", buckets: ["submitted", "approved"] },
  { key: "sent", label: "ส่งแล้ว", icon: SendIcon, tone: "emerald", buckets: ["sent"] },
]
const stageOf = (b: Bucket): Stage => STAGES.find((x) => x.buckets.includes(b))!.key

/** called as a function (not as a component) so KpiRow can count the four cards inside */
function stageKpis({ active, onPick, count, focus }: { active: Stage | "all"; onPick: (s: Stage) => void; count: (b: Bucket) => number; focus?: boolean }) {
  return (
    <>
      {STAGES.map((t) => (
        <div key={t.key} data-focus={focus ? FOCUS_OF[t.buckets[0]] : undefined} className="h-full rounded-3xl">
          <Kpi icon={t.icon} tone={t.tone} label={t.label} value={t.buckets.reduce((n, b) => n + count(b), 0)} emphasis onClick={() => onPick(t.key)} active={active === t.key} />
        </div>
      ))}
    </>
  )
}

/** one row passes when: a status picked in the menu matches · else a KPI card matches · else everything (minus hidden "sent") */
function passes(b: Bucket, tab: Bucket | "all", stage: Stage | "all", show: Show, showSent: "0" | "1"): boolean {
  if (!inShow(show, b)) return false
  if (tab !== "all") return b === tab
  if (stage !== "all") return stageOf(b) === stage
  return showSent === "1" || show === "done" || b !== "sent"
}

/** owner 2026-10-14: All / Pending / Done on both tabs — Done = ส่งถึงผู้ปกครองแล้ว, Pending = everything before that */
type Show = "all" | "pending" | "done"
const showOptions = (pending: number) => [
  { value: "all" as const, label: "All" },
  { value: "pending" as const, label: <>Pending{pending > 0 && <span className="rounded-full bg-danger-soft px-1.5 text-xs text-danger-ink tabular-nums">{pending}</span>}</> },
  { value: "done" as const, label: "Done" },
]
const inShow = (show: Show, b: Bucket) => show === "all" || (show === "done" ? b === "sent" : b !== "sent")

/** which Dashboard topic each pile answers (`?focus=` highlights it) */
const FOCUS_OF: Partial<Record<Bucket, string>> = { to_write: "summary_write", draft: "summary_write", changes: "summary_write", submitted: "summary_approve" }

export default function SummariesPage() {
  const [top, setTop] = useQueryState<"session" | "course">("view", "session")
  const head = {
    title: "สรุปการเรียน",
    description: top === "session" ? "สรุปรายคาบ: เขียน → อนุมัติ → ส่งผู้ปกครอง" : "สรุปทั้งคอร์ส เมื่อแพ็กเกจใกล้หมดหรือหมดแล้ว",
    actions: <Segmented label="ชนิดสรุป" value={top} onChange={(v) => setTop(v)} options={[{ value: "session", label: "Session Summary" }, { value: "course", label: "Course Summary" }]} />,
  }
  return top === "session" ? <SessionSummaryTab head={head} /> : <CourseSummaryTab head={head} />
}

type Head = { title: string; description: string; actions: React.ReactNode }

/** Per-session work queue (the original /summaries page) — unchanged, D6: counts only cover the chosen period. */
function SessionSummaryTab({ head }: { head: Head }) {
  const now = useNow()
  const today = toDateStr(now)
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const me = useStore((s) => s.me())
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const classes = useStore((s) => s.classes)
  const approve = useStore((s) => s.approveSummary)
  const send = useStore((s) => s.sendSummary)
  const L = useLookup()
  // owner 2026-10-09: the shared date control — default this week (same on Sessions / Attendance / Summaries)
  const period = usePeriod("week")
  // ?bucket= — the Dashboard opens the right pile (owner 2026-10-07)
  // owner 2026-10-13: everything is listed (sent ones too) — a KPI card narrows to one stage, click it again for all;
  // "ส่งแล้ว" can be hidden like Done / Void on Billing
  const [tab, setTab] = useQueryState<Bucket | "all">("bucket", "all")
  const [stage, setStage] = useState<Stage | "all">("all")
  const [showSent, setShowSent] = useQueryState<"0" | "1">("sent", "1")
  const [show, setShow] = useQueryState<Show>("show", "all")
  const [q, setQ] = useState("")
  const [subject, setSubject] = useState("")
  const [teacher, setTeacher] = useState("")
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const [openId, setOpenId] = useState<ID | null>(null)

  const { from, to } = period
  const mineOnly = !seesAllSessions(me)
  const inRange = sessions.filter((s) => scope.ids.includes(s.branchId) && s.date >= from && s.date <= to && s.date <= today && (!mineOnly || s.teacherId === me.id))
  const rows = inRange.flatMap((s) =>
    attendance
      .filter((a) => a.sessionId === s.id && a.status === "present")
      .map((a) => ({ s, studentId: a.studentId, sm: summaries.find((x) => x.sessionId === s.id && x.studentId === a.studentId) })),
  )
  const bucket = (r: (typeof rows)[number]): Bucket => bucketOf(r.sm?.status)
  const found = rows.filter((r) => (!subject || r.s.subject === subject || (r.s.subjects ?? []).includes(subject)) && (!teacher || (r.sm?.authorId ?? r.s.teacherId) === teacher || r.s.teacherId === teacher)).filter((r) => !q || matchesQuery(q, [L.student(r.studentId)?.nickname, L.student(r.studentId)?.name, classes.find((c) => c.id === r.s.classId)?.name, r.s.subject, L.teacher(r.sm?.authorId ?? r.s.teacherId).label, r.sm?.text]))
  const shown = found
    .filter((r) => passes(bucket(r), tab, stage, show, showSent))
    .sort((a, b) => (a.s.date + a.s.start).localeCompare(b.s.date + b.s.start))

  const statusField = { id: "status", label: "สถานะ (ละเอียด)", value: tab === "all" ? "" : tab, onChange: (v: string) => { setTab((v || "all") as Bucket | "all"); setStage("all") }, placeholder: "ทุกสถานะ", options: BUCKETS.map((x) => ({ value: x.key, label: x.label })) }
  // owner 2026-11-13: a real Checkbox row in "ตัวกรอง" (ShowChip was a loose pill) — same pattern as CRM's "ปิดแล้ว" / "Archived"
  const sentCheck = { key: "sent", label: "ส่งแล้ว", on: showSent === "1" || tab === "sent" || stage === "sent", count: found.filter((r) => bucket(r) === "sent").length,
    onChange: (v: boolean) => { setShowSent(v ? "1" : "0"); if (!v && (tab === "sent" || stage === "sent")) { setTab("all"); setStage("all") } } }

  return (
    <ListPage {...head} branch={scope.select}
      kpis={stageKpis({ active: stage, onPick: (g) => { setStage(stage === g ? "all" : g); setTab("all") }, count: (b) => rows.filter((r) => bucket(r) === b).length, focus: true })}
      period={period.control}
      search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหานักเรียน / คลาส / ครู" />}
      status={<Segmented label="แสดง" value={show} onChange={(v) => { setShow(v); setTab("all"); setStage("all") }} options={showOptions(found.filter((r) => bucket(r) !== "sent").length)} />}
      filters={<>
        <FilterMenu checks={[sentCheck]} fields={[
          { id: "subject", label: "วิชา", value: subject, onChange: setSubject, placeholder: "ทุกวิชา", options: branch.subjects.map((x) => ({ value: x, label: x })) },
          statusField,
          { id: "teacher", label: "ครู", hidden: mineOnly, value: teacher, onChange: setTeacher, placeholder: "ครูทุกคน", options: staff.map((t) => staffAt(t, branch.id)).filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id)).map((t) => ({ value: t.id, label: t.nickname })) },
        ]} />
        {mineOnly && <span className="text-xs text-muted-foreground">เฉพาะคาบของฉัน</span>}
      </>}>

      {/* owner 2026-10-09: one section per day, like Sessions — easier to see what each day still needs */}
      {shown.length === 0 && <Empty>ไม่มีรายการในหมวดนี้</Empty>}
      {[...new Set(shown.map((r) => r.s.date))].map((day) => (
        <section key={day}>
          <h3 className="mb-1 text-sm font-semibold">{fmtDate(day, { weekday: true })}</h3>
          <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
            {shown.filter((r) => r.s.date === day).map((r) => {
              const { s, studentId, sm } = r
              const b = bucket(r)
              const stu = L.student(studentId)
              const approveCheck = sm && Sum.canApprove(sm, me)
              // owner 2026-10-13: same row as Sessions (colour bar · start–end), status last, the row opens the panel
              // owner 2026-11-13: one chip, not a pill + a separate button saying the same thing — when you can act on
              // this stage, the chip itself becomes the button (verb instead of state name), same tone/shape/slot so
              // nothing doubles up or shifts around as the stage changes
              return (
                <SessionLine key={s.id + studentId} s={s} focus={FOCUS_OF[b]} onOpen={() => setOpenId(s.id)}
                  title={<>{stu?.nickname} <span className="text-xs font-normal text-muted-foreground">{stu?.grade}</span> · {classes.find((c) => c.id === s.classId)?.name ?? s.subject}{scope.multi && <span className="ml-1.5 align-middle"><BranchCode code={scope.code(s.branchId)} /></span>}</>}
                  sub={<>ครู {L.teacher(sm?.authorId ?? s.teacherId).label}</>}
                  status={(() => {
                    const canApproveNow = b === "submitted" && sm && approveCheck?.ok
                    const canSendNow = b === "approved" && sm && can(me, "summary.approve")
                    // owner 2026-11-13: one slot, not a pill + a button saying the same thing twice — but a tag and a
                    // button must still look like what they are (a coloured pill reads as neither), so this renders a
                    // real Button when you can act, and the plain Pill only when there's nothing to do about it
                    {/* owner 2026-11-13: อนุมัติ = an in-between step (outline) · ส่งผู้ปกครอง = the one that actually reaches
                        someone outside the team (filled) — same weight the panel's own buttons use for this pair */}
                    if (canApproveNow) return <Button variant="tonal" size="sm" onClick={() => report(approve(sm.id), "อนุมัติแล้ว")}><CheckIcon /> อนุมัติ</Button>
                    if (canSendNow) return <Button size="sm" onClick={() => report(send(sm.id), "ส่งถึงผู้ปกครองแล้ว")}><SendIcon /> ส่งผู้ปกครอง</Button>
                    const label = b === "sent" && sm && Sum.keptOnly(sm) ? "เก็บเป็น History" : BUCKETS.find((x) => x.key === b)!.label
                    return (
                      <Pill tone={PILL_TONE[b]} title={b === "submitted" && approveCheck && !approveCheck.ok ? approveCheck.error : undefined}>{label}</Pill>
                    )
                  })()}>
                  {sm?.text && <span className="mt-1 line-clamp-2 block text-sm">{sm.text}</span>}
                  {sm?.status === "changes_requested" && <span className="mt-1 block text-xs text-danger">ขอแก้: {sm.history.findLast((h) => h.action === "request_changes")?.note}</span>}
                </SessionLine>
              )
            })}
          </div>
        </section>
      ))}
      <SessionSheet sessionId={openId} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}

/**
 * Course Summary (owner 2026-10-06): a whole-course report the teacher writes by hand, one per entitlement
 * (purchase round) — due once the package is ending soon or already over, not partway through. Same
 * write → submit → approve → send lifecycle and bucket layout as the session queue above, for a familiar UI.
 */
function CourseSummaryTab({ head }: { head: Head }) {
  const now = useNow()
  const today = toDateStr(now)
  const me = useStore((s) => s.me())
  const entitlements = useStore((s) => s.entitlements)
  const courseSummaries = useStore((s) => s.courseSummaries)
  const scope = useBranchScope()
  const students = useStore((s) => s.students).filter((x) => scope.ids.includes(x.branchId))
  const courses = useStore((s) => s.courses)
  const sessions = useStore((s) => s.sessions)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const L = useLookup()
  // owner 2026-10-13: same as the session list — everything listed, a KPI narrows it, "ส่งแล้ว" can be hidden
  const [tab, setTab] = useState<Bucket | "all">("all")
  const [stage, setStage] = useState<Stage | "all">("all")
  const [showSent, setShowSent] = useQueryState<"0" | "1">("sent", "1")
  const [show, setShow] = useQueryState<Show>("show", "all")
  const [q, setQ] = useState("")
  const [subject, setSubject] = useState("")
  const [teacher, setTeacher] = useState("")
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const branch = useBranch()
  const [openId, setOpenId] = useState<ID | null>(null)

  const mineOnly = !seesAllSessions(me)
  // which classes this teacher actually taught — scopes "เฉพาะคาบของฉัน" the same way the session queue does
  const myClassIds = new Set(sessions.filter((se) => se.teacherId === me.id || se.coTeacherIds.includes(me.id)).map((se) => se.classId).filter((x): x is string => !!x))

  const studentIds = new Set(students.map((s) => s.id))
  const entsById = new Map(entitlements.map((e) => [e.id, e]))
  // owner 2026-10-06: a monthly package renewed back-to-back for a year is still ONE round, not one per billing
  // cycle — group first, then decide which rounds are due a summary and belong to this branch/teacher
  const allRounds = Sum.entitlementRounds(entitlements.filter((e) => studentIds.has(e.studentId)))
  const dueRounds = allRounds.filter((r) => Sum.courseSummaryDue(r, today, renewalDays) && (!mineOnly || r.entitlementIds.some((id) => entsById.get(id)?.classIds.some((cid) => myClassIds.has(cid)))))
  const bucket = (r: Sum.EntitlementRound): Bucket => {
    const cs = courseSummaries.find((x) => x.entitlementId === r.representativeId)
    return bucketOf(cs?.status)
  }
  const countIn = (b: Bucket) => dueRounds.filter((r) => bucket(r) === b).length
  // the teacher of a round = the teacher of its class (the one who writes the summary)
  const teacherOf = (r: Sum.EntitlementRound) => {
    const cid = r.entitlementIds.flatMap((id) => entsById.get(id)?.classIds ?? [])[0]
    const byClass = classes.find((c) => c.id === cid)?.teacherId
    if (byClass) return byClass
    // older packages with no class on them: whoever taught this student that course's subject in the round
    const subjects = courses.find((c) => c.id === r.courseId)?.subjects ?? []
    return sessions.findLast((se) => se.teacherId && se.studentIds.includes(r.studentId) && se.date >= r.from && se.date <= r.to && subjectsOf(se).some((x) => subjects.includes(x)))?.teacherId
      ?? courseSummaries.find((x) => x.entitlementId === r.representativeId)?.authorId ?? null
  }
  // owner 2026-10-14: one row per course with its status (a student with 2 courses = 2 rows) — clicking opens the
  // student's sheet with every due course of theirs, so all of it is still handled in one visit
  const found = dueRounds.filter((r) => {
    const course = courses.find((c) => c.id === r.courseId)
    return (!subject || course?.subjects.includes(subject)) && (!teacher || teacherOf(r) === teacher)
      && (!q || matchesQuery(q, [L.student(r.studentId)?.nickname, L.student(r.studentId)?.name, course?.name, L.teacher(teacherOf(r)).label]))
  })
  const rows = found
    .filter((r) => passes(bucket(r), tab, stage, show, showSent))
    .sort((a, b) => a.to.localeCompare(b.to))

  const columns: Column<Sum.EntitlementRound>[] = [
    { id: "student", label: "นักเรียน", required: true, cell: (r) => <span className="font-medium">{L.student(r.studentId)?.nickname}{scope.multi && <span className="ml-1.5 align-middle"><BranchCode code={scope.code(L.student(r.studentId)?.branchId ?? "")} /></span>}</span> },
    // owner 2026-10-14: grade + course type as their own columns
    { id: "grade", label: "ชั้น", cell: (r) => { const g = L.student(r.studentId)?.grade; return g ? <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", gradeTone(g))}>{g}</span> : "—" } },
    { id: "course", label: "คอร์ส", cell: (r) => <span className="truncate">{courses.find((x) => x.id === r.courseId)?.name ?? "คอร์ส"}</span> },
    { id: "type", label: "ประเภทคอร์ส", cell: (r) => courses.find((x) => x.id === r.courseId)?.kind === "bundle"
      ? <Pill tone="special"><LayersIcon className="size-3" /> Bundle</Pill> : <Pill>Single</Pill> },
    { id: "subjects", label: "วิชา", cell: (r) => <ChipOverflow items={courses.find((x) => x.id === r.courseId)?.subjects ?? []} label={(x) => x} render={(x) => <span className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>} /> },
    { id: "teacher", label: "ครู", cell: (r) => { const t = teacherOf(r); return t ? L.teacher(t).label : <span className="text-muted-foreground">—</span> } },
    { id: "due", label: "กำหนดส่ง", info: "ต้องส่งสรุปภายในกี่วันหลังคอร์สจบ", cell: (r) => {
      if (bucket(r) === "sent") return <span className="text-muted-foreground">—</span>
      const d = Sum.courseSummaryDeadline(r, now)
      return <span className={cn("whitespace-nowrap", d.overdue || d.daysLeft <= 2 ? "font-medium text-danger" : "")}>{fmtDate(d.deadline)} · {d.overdue ? `เลย ${-d.daysLeft} วัน` : `อีก ${d.daysLeft} วัน`}</span>
    } },
    { id: "status", label: "สถานะ", align: "right", required: true, cell: (r) => <Pill tone={PILL_TONE[bucket(r)]}>{BUCKETS.find((x) => x.key === bucket(r))!.label}</Pill> },
  ]

  const statusField = { id: "status", label: "สถานะ (ละเอียด)", value: tab === "all" ? "" : tab, onChange: (v: string) => { setTab((v || "all") as Bucket | "all"); setStage("all") }, placeholder: "ทุกสถานะ", options: BUCKETS.map((x) => ({ value: x.key, label: x.label })) }
  const sentCheck = { key: "sent", label: "ส่งแล้ว", on: showSent === "1" || tab === "sent" || stage === "sent" || show === "done", count: found.filter((r) => bucket(r) === "sent").length,
    onChange: (v: boolean) => { setShowSent(v ? "1" : "0"); if (!v && (tab === "sent" || stage === "sent")) { setTab("all"); setStage("all") } if (!v && show === "done") setShow("all") } }

  return (
    <ListPage {...head} branch={scope.select}
      kpis={stageKpis({ active: stage, onPick: (g) => { setStage(stage === g ? "all" : g); setTab("all") }, count: countIn })}
      search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหานักเรียน / คอร์ส / ครู" />}
      status={<Segmented label="แสดง" value={show} onChange={(v) => { setShow(v); setTab("all"); setStage("all") }} options={showOptions(found.filter((r) => bucket(r) !== "sent").length)} />}
      filters={<>
        <FilterMenu checks={[sentCheck]} fields={[
          { id: "subject", label: "วิชา", value: subject, onChange: setSubject, placeholder: "ทุกวิชา", options: branch.subjects.map((x) => ({ value: x, label: x })) },
          statusField,
          { id: "teacher", label: "ครู", hidden: mineOnly, value: teacher, onChange: setTeacher, placeholder: "ครูทุกคน", options: staff.map((t) => staffAt(t, branch.id)).filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id)).map((t) => ({ value: t.id, label: t.nickname })) },
        ]} />
        <ColumnsMenu id="course-summaries" columns={columns} />
        <InfoTip text={`แพ็กเกจใกล้หมด (ภายใน ${renewalDays} วัน) หรือหมดแล้ว · กดแถวเพื่อดู / เขียน / อนุมัติ`} />
      </>}>

      <DataTable id="course-summaries" columns={columns} rows={rows} rowKey={(r) => r.representativeId} onRowClick={(r) => setOpenId(r.representativeId)}
        empty="ไม่มีรายการในหมวดนี้" />
      <CourseSummaryPanel round={dueRounds.find((r) => r.representativeId === openId) ?? null} onClose={() => setOpenId(null)} />
    </ListPage>
  )
}
