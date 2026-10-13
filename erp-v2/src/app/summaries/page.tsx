"use client"

import { usePeriod } from "@/components/app/period-control"
import { Page, PageHeader, KpiRow, SearchBox, ShowChip, Toolbar, Segmented } from "@/components/app/page-layout"
import { matchesQuery } from "@/domain/rules/people"
import { InfoTip } from "@/components/reports/charts"
import type { Tone } from "@/components/app/badges"
import { Kpi, type KpiTone } from "@/components/app/kpi"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { useState } from "react"
import { BadgeCheckIcon, CheckIcon, FilePenIcon, HourglassIcon, PenLineIcon, SendIcon, Undo2Icon, type LucideIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { CourseSummaryStudentSheet } from "@/components/app/course-summary-sheet"
import { SessionSheet } from "@/components/app/session-sheet"
import { Button } from "@/components/ui/button"
import { fmtDate, toDateStr } from "@/domain/dates"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import * as Sum from "@/domain/rules/summaries"
import type { ID, SummaryStatus } from "@/domain/types"
import { SessionLine } from "@/components/app/session-line"
import { report } from "@/lib/feedback"
import { useLookup, useNow, useQueryState } from "@/lib/hooks"
import { useStore } from "@/store/store"

// owner 2026-10-13: six statuses, in the order the work moves — "not written" and "draft" are no longer one pile
type Bucket = "to_write" | "draft" | "submitted" | "approved" | "sent" | "changes"
const BUCKETS: { key: Bucket; label: string; tone: string }[] = [
  { key: "to_write", label: "ยังไม่ได้เขียน", tone: "text-red-700" },
  { key: "draft", label: "เขียนแล้ว Draft ไว้", tone: "text-violet-700" },
  { key: "submitted", label: "รอส่งไป Approve", tone: "text-amber-700" },
  { key: "approved", label: "ได้ Approve แล้ว กำลังรอส่ง", tone: "text-sky-700" },
  { key: "sent", label: "ส่งแล้ว", tone: "text-emerald-700" },
  { key: "changes", label: "ขอแก้ไข", tone: "text-red-700" },
]

const BUCKET_ICON: Record<Bucket, LucideIcon> = { to_write: PenLineIcon, draft: FilePenIcon, submitted: HourglassIcon, approved: BadgeCheckIcon, sent: SendIcon, changes: Undo2Icon }
const PILL_TONE: Record<Bucket, Tone> = { to_write: "red", draft: "violet", submitted: "amber", approved: "blue", sent: "green", changes: "red" }
const BUCKET_TONE: Record<Bucket, KpiTone> = { to_write: "red", draft: "violet", submitted: "amber", approved: "sky", sent: "emerald", changes: "red" }
const bucketOf = (status: SummaryStatus | undefined): Bucket => (!status ? "to_write" : status === "changes_requested" ? "changes" : status)

/** the 6 stages as KPI cards — click one to list it (standard page: KPI row above the toolbar) */
function BucketRow({ active, onPick, count, focus }: { active: Bucket | "all"; onPick: (b: Bucket) => void; count: (b: Bucket) => number; focus?: boolean }) {
  return (
    <KpiRow className="sm:grid-cols-3 xl:grid-cols-6">
      {BUCKETS.map((t) => (
        <div key={t.key} data-focus={focus ? FOCUS_OF[t.key] : undefined} className="h-full rounded-3xl">
          <Kpi icon={BUCKET_ICON[t.key]} tone={BUCKET_TONE[t.key]} label={t.label} value={count(t.key)} valueClassName={t.tone} onClick={() => onPick(t.key)} active={active === t.key} />
        </div>
      ))}
    </KpiRow>
  )
}

/** which Dashboard topic each pile answers (`?focus=` highlights it) */
const FOCUS_OF: Partial<Record<Bucket, string>> = { to_write: "summary_write", draft: "summary_write", changes: "summary_write", submitted: "summary_approve" }

export default function SummariesPage() {
  const [top, setTop] = useQueryState<"session" | "course">("view", "session")
  return (
    <Page>
      <PageHeader title="สรุปการเรียน" description={top === "session" ? "สรุปรายคาบ: เขียน → อนุมัติ → ส่งผู้ปกครอง" : "สรุปทั้งคอร์ส เมื่อแพ็กเกจใกล้หมดหรือหมดแล้ว"}
        actions={
          <Segmented label="ชนิดสรุป" value={top} onChange={(v) => setTop(v)}
            options={[{ value: "session", label: "Session Summary" }, { value: "course", label: "Course Summary" }]} />
        } />
      {top === "session" ? <SessionSummaryTab /> : <CourseSummaryTab />}
    </Page>
  )
}

/** Per-session work queue (the original /summaries page) — unchanged, D6: counts only cover the chosen period. */
function SessionSummaryTab() {
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
  const [showSent, setShowSent] = useQueryState<"0" | "1">("sent", "1")
  const [q, setQ] = useState("")
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
  const found = rows.filter((r) => !q || matchesQuery(q, [L.student(r.studentId)?.nickname, L.student(r.studentId)?.name, classes.find((c) => c.id === r.s.classId)?.name, r.s.subject, L.teacher(r.sm?.authorId ?? r.s.teacherId).label, r.sm?.text]))
  const shown = found
    .filter((r) => (tab === "all" ? showSent === "1" || bucket(r) !== "sent" : bucket(r) === tab))
    .sort((a, b) => (a.s.date + a.s.start).localeCompare(b.s.date + b.s.start))

  return (
    <div className="space-y-4">
      <BucketRow active={tab} onPick={(b) => setTab(tab === b ? "all" : b)} count={(b) => rows.filter((r) => bucket(r) === b).length} focus />
      <Toolbar end={<>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหานักเรียน / คลาส / ครู" />
        {mineOnly && <span className="text-xs text-muted-foreground">เฉพาะคาบของฉัน</span>}
        {/* owner 2026-10-09: branch chip always last in the row */}
        {scope.select}
      </>}>
        {period.control}
        <ShowChip label="ส่งแล้ว" on={showSent === "1" || tab === "sent"} count={found.filter((r) => bucket(r) === "sent").length} onChange={(v) => { setShowSent(v ? "1" : "0"); if (!v && tab === "sent") setTab("all") }} />
      </Toolbar>

      {/* owner 2026-10-09: one section per day, like Sessions — easier to see what each day still needs */}
      {shown.length === 0 && <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">ไม่มีรายการในหมวดนี้</p>}
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
              return (
                <SessionLine key={s.id + studentId} s={s} focus={FOCUS_OF[b]} onOpen={() => setOpenId(s.id)}
                  title={<>{stu?.nickname} <span className="text-xs font-normal text-muted-foreground">{stu?.grade}</span> · {classes.find((c) => c.id === s.classId)?.name ?? s.subject}{scope.multi && <span className="ml-1.5 align-middle"><BranchCode code={scope.code(s.branchId)} /></span>}</>}
                  sub={<>ครู {L.teacher(sm?.authorId ?? s.teacherId).label}</>}
                  actions={<>
                    {b === "submitted" && sm && approveCheck?.ok && <Button size="sm" onClick={() => report(approve(sm.id), "อนุมัติแล้ว")}><CheckIcon /> อนุมัติ</Button>}
                    {b === "approved" && sm && can(me, "summary.approve") && <Button size="sm" onClick={() => report(send(sm.id), "ส่งถึงผู้ปกครองแล้ว")}><SendIcon /> ส่งผู้ปกครอง</Button>}
                  </>}
                  status={<Pill tone={PILL_TONE[b]} title={b === "submitted" && approveCheck && !approveCheck.ok ? approveCheck.error : undefined}>{BUCKETS.find((x) => x.key === b)!.label}</Pill>}>
                  {sm?.text && <span className="mt-1 line-clamp-2 block text-sm">{sm.text}</span>}
                  {sm?.status === "changes_requested" && <span className="mt-1 block text-xs text-red-700">ขอแก้: {sm.history.findLast((h) => h.action === "request_changes")?.note}</span>}
                </SessionLine>
              )
            })}
          </div>
        </section>
      ))}
      <SessionSheet sessionId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

/**
 * Course Summary (owner 2026-10-06): a whole-course report the teacher writes by hand, one per entitlement
 * (purchase round) — due once the package is ending soon or already over, not partway through. Same
 * write → submit → approve → send lifecycle and bucket layout as the session queue above, for a familiar UI.
 */
function CourseSummaryTab() {
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
  const [showSent, setShowSent] = useQueryState<"0" | "1">("sent", "1")
  const [q, setQ] = useState("")
  const [openStudentId, setOpenStudentId] = useState<ID | null>(null)

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
  // the outer list is per-student: who has at least one course in the chosen bucket — but opening them shows
  // every due course of theirs (all buckets at once), same as the reference's "handle everything in one visit"
  const inView = (r: Sum.EntitlementRound) => (tab === "all" ? showSent === "1" || bucket(r) !== "sent" : bucket(r) === tab)
    && (!q || matchesQuery(q, [L.student(r.studentId)?.nickname, L.student(r.studentId)?.name, courses.find((c) => c.id === r.courseId)?.name]))
  const studentRows = [...new Set(dueRounds.filter(inView).map((r) => r.studentId))]
    .map((sid) => {
      const shown = dueRounds.filter((r) => r.studentId === sid && inView(r))
      return { sid, shown, all: dueRounds.filter((r) => r.studentId === sid), stu: L.student(sid), earliest: shown.reduce((m, r) => (r.to < m ? r.to : m), shown[0].to) }
    })
    .sort((a, b) => a.earliest.localeCompare(b.earliest))

  return (
    <div className="space-y-4">
      <BucketRow active={tab} onPick={(b) => setTab(tab === b ? "all" : b)} count={countIn} />
      <Toolbar end={<><SearchBox value={q} onChange={setQ} placeholder="ค้นหานักเรียน / คอร์ส" />{scope.select}</>}>
        <ShowChip label="ส่งแล้ว" on={showSent === "1" || tab === "sent"} count={countIn("sent")} onChange={(v) => { setShowSent(v ? "1" : "0"); if (!v && tab === "sent") setTab("all") }} />
        <InfoTip text={`แพ็กเกจใกล้หมด (ภายใน ${renewalDays} วัน) หรือหมดแล้ว · เปิดดูเป็นรายนักเรียน`} />
      </Toolbar>

      <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        {studentRows.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">ไม่มีรายการในหมวดนี้</p>}
        {studentRows.map(({ sid, shown, all, stu }) => (
          <button key={sid} onClick={() => setOpenStudentId(sid)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40">
            <div className="min-w-48 flex-1">
              <div className="text-sm font-medium">{stu?.nickname} <span className="text-xs text-muted-foreground">{stu?.grade}</span></div>
              <div className="truncate text-xs text-muted-foreground">{shown.map((r) => courses.find((c) => c.id === r.courseId)?.name ?? "คอร์ส").join(" · ")}</div>
            </div>
            <Pill>{all.length} คอร์ส{all.length !== shown.length ? ` (${shown.length} ในหมวดนี้)` : ""}</Pill>
          </button>
        ))}
      </div>
      <CourseSummaryStudentSheet studentId={openStudentId} rounds={studentRows.find((r) => r.sid === openStudentId)?.all ?? []} onClose={() => setOpenStudentId(null)} />
    </div>
  )
}
