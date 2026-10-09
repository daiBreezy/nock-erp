"use client"

import { usePeriod } from "@/components/app/period-control"
import { Page, PageHeader, KpiRow, Toolbar, Segmented } from "@/components/app/page-layout"
import { Kpi, type KpiTone } from "@/components/app/kpi"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { useState } from "react"
import { BadgeCheckIcon, CheckIcon, HourglassIcon, PenLineIcon, SendIcon, Undo2Icon, type LucideIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { CourseSummaryStudentSheet } from "@/components/app/course-summary-sheet"
import { SessionSheet } from "@/components/app/session-sheet"
import { Button } from "@/components/ui/button"
import { fmtDate, toDateStr } from "@/domain/dates"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import * as Sum from "@/domain/rules/summaries"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useLookup, useNow, useQueryState } from "@/lib/hooks"
import { useStore } from "@/store/store"

type Bucket = "to_write" | "changes" | "submitted" | "approved" | "sent"
const BUCKETS: { key: Bucket; label: string; tone: string }[] = [
  { key: "to_write", label: "ยังไม่ได้เขียน", tone: "text-red-700" },
  { key: "changes", label: "ขอแก้ไข", tone: "text-red-700" },
  { key: "submitted", label: "รออนุมัติ", tone: "text-amber-700" },
  { key: "approved", label: "อนุมัติแล้ว · ยังไม่ส่ง", tone: "text-sky-700" },
  { key: "sent", label: "ส่งผู้ปกครองแล้ว", tone: "text-emerald-700" },
]

const BUCKET_ICON: Record<Bucket, LucideIcon> = { to_write: PenLineIcon, changes: Undo2Icon, submitted: HourglassIcon, approved: BadgeCheckIcon, sent: SendIcon }
const BUCKET_TONE: Record<Bucket, KpiTone> = { to_write: "red", changes: "red", submitted: "amber", approved: "sky", sent: "emerald" }

/** the 5 stages as KPI cards — click one to list it (standard page: KPI row above the toolbar) */
function BucketRow({ active, onPick, count, focus }: { active: Bucket; onPick: (b: Bucket) => void; count: (b: Bucket) => number; focus?: boolean }) {
  return (
    <KpiRow className="lg:grid-cols-5">
      {BUCKETS.map((t) => (
        <div key={t.key} data-focus={focus ? FOCUS_OF[t.key] : undefined} className="h-full rounded-3xl">
          <Kpi icon={BUCKET_ICON[t.key]} tone={BUCKET_TONE[t.key]} label={t.label} value={count(t.key)} valueClassName={t.tone} onClick={() => onPick(t.key)} active={active === t.key} />
        </div>
      ))}
    </KpiRow>
  )
}

/** which Dashboard topic each pile answers (`?focus=` highlights it) */
const FOCUS_OF: Partial<Record<Bucket, string>> = { to_write: "summary_write", changes: "summary_write", submitted: "summary_approve" }

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
  const [tab, setTab] = useQueryState<Bucket>("bucket", can(me, "summary.approve") ? "submitted" : "to_write")
  const [openId, setOpenId] = useState<ID | null>(null)

  const { from, to } = period
  const mineOnly = !seesAllSessions(me)
  const inRange = sessions.filter((s) => scope.ids.includes(s.branchId) && s.date >= from && s.date <= to && s.date <= today && (!mineOnly || s.teacherId === me.id))
  const rows = inRange.flatMap((s) =>
    attendance
      .filter((a) => a.sessionId === s.id && a.status === "present")
      .map((a) => ({ s, studentId: a.studentId, sm: summaries.find((x) => x.sessionId === s.id && x.studentId === a.studentId) })),
  )
  const bucket = (r: (typeof rows)[number]): Bucket => (!r.sm || r.sm.status === "draft" ? "to_write" : r.sm.status === "changes_requested" ? "changes" : r.sm.status)
  const shown = rows.filter((r) => bucket(r) === tab).sort((a, b) => b.s.date.localeCompare(a.s.date))

  return (
    <div className="space-y-4">
      <BucketRow active={tab} onPick={setTab} count={(b) => rows.filter((r) => bucket(r) === b).length} focus />
      <Toolbar end={<>
        {mineOnly && <span className="text-xs text-muted-foreground">เฉพาะคาบของฉัน</span>}
        {/* owner 2026-10-09: branch chip always last in the row */}
        {scope.select}
      </>}>
        {period.control}
      </Toolbar>

      <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        {shown.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">ไม่มีรายการในหมวดนี้</p>}
        {shown.map(({ s, studentId, sm }) => {
          const stu = L.student(studentId)
          const approveCheck = sm && Sum.canApprove(sm, me)
          return (
            <div key={s.id + studentId} data-focus={FOCUS_OF[tab]} className="flex flex-wrap items-start gap-3 p-3">
              <div className="w-24 text-sm">
                <div className="font-medium">{fmtDate(s.date, { weekday: true })}</div>
                <div className="text-xs text-muted-foreground">{s.start}</div>
              </div>
              <div className="min-w-48 flex-1">
                <div className="text-sm font-medium">{stu?.nickname} <span className="text-xs text-muted-foreground">{stu?.grade}</span> · {classes.find((c) => c.id === s.classId)?.name ?? s.subject}{scope.multi && <span className="ml-1.5 align-middle"><BranchCode code={scope.code(s.branchId)} /></span>}</div>
                <div className="text-xs text-muted-foreground">ครู {L.teacher(sm?.authorId ?? s.teacherId).label}</div>
                {sm?.text && <p className="mt-1 line-clamp-2 text-sm">{sm.text}</p>}
                {sm?.status === "changes_requested" && <p className="mt-1 text-xs text-red-700">ขอแก้: {sm.history.findLast((h) => h.action === "request_changes")?.note}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(tab === "to_write" || tab === "changes") && <Button size="sm" variant="outline" onClick={() => setOpenId(s.id)}>เขียน / แก้</Button>}
                {tab === "submitted" && sm && (
                  approveCheck?.ok ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setOpenId(s.id)}>ดู / ขอแก้</Button>
                      <Button size="sm" onClick={() => report(approve(sm.id), "อนุมัติแล้ว")}><CheckIcon /> อนุมัติ</Button>
                    </>
                  ) : <Pill>{approveCheck?.error}</Pill>
                )}
                {tab === "approved" && sm && can(me, "summary.approve") && (
                  <Button size="sm" onClick={() => report(send(sm.id), "ส่งถึงผู้ปกครองแล้ว")}><SendIcon /> ส่งผู้ปกครอง</Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
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
  const [tab, setTab] = useState<Bucket>(can(me, "summary.approve") ? "submitted" : "to_write")
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
    return !cs || cs.status === "draft" ? "to_write" : cs.status === "changes_requested" ? "changes" : cs.status
  }
  const countIn = (b: Bucket) => dueRounds.filter((r) => bucket(r) === b).length
  // the outer list is per-student: who has at least one course in the chosen bucket — but opening them shows
  // every due course of theirs (all buckets at once), same as the reference's "handle everything in one visit"
  const studentRows = [...new Set(dueRounds.filter((r) => bucket(r) === tab).map((r) => r.studentId))]
    .map((sid) => {
      const shown = dueRounds.filter((r) => r.studentId === sid && bucket(r) === tab)
      return { sid, shown, all: dueRounds.filter((r) => r.studentId === sid), stu: L.student(sid), earliest: shown.reduce((m, r) => (r.to < m ? r.to : m), shown[0].to) }
    })
    .sort((a, b) => a.earliest.localeCompare(b.earliest))

  return (
    <div className="space-y-4">
      <BucketRow active={tab} onPick={setTab} count={countIn} />
      <Toolbar end={scope.select}>
        <span className="text-sm text-muted-foreground">แพ็กเกจใกล้หมด (ภายใน {renewalDays} วัน) หรือหมดแล้ว · เปิดดูเป็นรายนักเรียน</span>
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
