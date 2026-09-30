"use client"

import { BusAddOns } from "@/components/billing/bus-addons"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
  ArchiveIcon, ArchiveRestoreIcon, ArrowUpRightIcon, BusIcon, CakeIcon, CalendarDaysIcon, CalendarIcon, ClockIcon, FileTextIcon, GraduationCapIcon,
  MessageSquareIcon, MessagesSquareIcon, PencilIcon, PhoneIcon, PlaneIcon, PlusIcon, ReceiptIcon, SearchIcon, SendIcon, StickyNoteIcon, StoreIcon, UserRoundIcon, UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { daysBetween, endTime, fmtDate, fmtDateTime, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { INVOICE_STATUS_LABEL, invoiceTotals } from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import { renewHref } from "@/domain/rules/people"
import { removedWithClass, subjectsOf, workState } from "@/domain/rules/scheduling"
import type { Entitlement, ID, LogCategory, Session, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Pill } from "./badges"
import { Pager, usePage } from "./data-table"
import { AssessmentNote } from "./assessment-note"
import { LeaveDialog } from "./leave-dialog"
import { PackageBadge } from "./package-badge"
import { StudentForm } from "./student-form"
import { stateDetail, STATUS_PILL } from "./student-status"
import { avatarTone, gradeTone, initial, subjectColor } from "./subject-color"
import { WorkChip } from "./work-state"

export { STATUS_PILL } from "./student-status"

type Seg = "overview" | "class" | "billing" | "note" | "timeline"
const SEGS: { id: Seg; label: string }[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "class", label: "คลาส" },
  { id: "billing", label: "การเงิน" },
  { id: "note", label: "โน้ต" },
  { id: "timeline", label: "Timeline" },
]

/**
 * Student modal (owner design "Student Modal", 2026-09-28): segments Overview · Class (Session | Attendance) ·
 * Billing · Note · Timeline. Active/Inactive is automatic (packages + long leave); only Archive is manual.
 * No "Claim" tab (staging) — paying enrols the student automatically.
 */
export function StudentSheet({ studentId, onClose }: { studentId: ID | null; onClose: () => void }) {
  return (
    <Dialog open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {studentId && <Body id={studentId} />}
      </DialogContent>
    </Dialog>
  )
}

function Body({ id }: { id: ID }) {
  const stu = useStore((s) => s.students.find((x) => x.id === id))
  const fam = useStore((s) => s.families.find((f) => f.id === stu?.familyId))
  const conv = useStore((s) => s.conversations.find((c) => c.familyId && c.familyId === stu?.familyId))
  const leaves = useStore((s) => s.leaves)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const ents = useEntitlements()
  const today = toDateStr(useNow())
  const [seg, setSeg] = useState<Seg>("overview")
  const [archiving, setArchiving] = useState(false)
  const restore = useStore((s) => s.restoreStudent)
  if (!stu) return null

  const state = Att.studentState(stu, ents, leaves, today, renewalDays)
  const primary = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]

  return (
    <>
      <DialogHeader className="flex-row items-center gap-3 border-b px-5 py-3 pr-12">
        <GraduationCapIcon className="size-5 text-muted-foreground" />
        <DialogTitle className="text-base">นักเรียน</DialogTitle>
        <DialogDescription className="sr-only">{stu.name}</DialogDescription>
        {fam && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-1 text-sm">
            <span className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold", avatarTone(fam.id))}>{initial(fam.name.replace(/^ครอบครัว/, ""))}</span>
            <Link href="/families" className="max-w-40 truncate hover:underline">{fam.name}</Link>
            {primary && (
              <a href={`tel:${primary.phone.replace(/\D/g, "")}`} title={`โทร ${primary.name} ${primary.phone}`} className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"><PhoneIcon className="size-3.5" /></a>
            )}
          </span>
        )}
      </DialogHeader>

      <div className="flex flex-wrap gap-1 px-5 pt-3">
        {SEGS.filter((x) => x.id !== "billing" || can(me, "billing.view")).map((x) => (
          <button key={x.id} onClick={() => setSeg(x.id)} className={cn("rounded-full px-4 py-1.5 text-sm", seg === x.id ? "bg-foreground font-medium text-background" : "bg-muted text-muted-foreground hover:bg-muted/70")}>{x.label}</button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {seg === "overview" && <Overview stu={stu} ents={ents} today={today} />}
        {seg === "class" && <ClassSeg stu={stu} ents={ents} />}
        {seg === "billing" && <BillingSeg stu={stu} />}
        {seg === "note" && <NoteSeg stu={stu} />}
        {seg === "timeline" && <TimelineSeg stu={stu} />}
      </div>

      {seg !== "note" && (
        <div className="flex flex-wrap items-center gap-3 border-t px-5 py-3">
          {can(me, "student.manage") && (stu.archived ? (
            <Button size="sm" variant="ghost" onClick={() => report(restore(stu.id), "กลับมาเรียนแล้ว")}><ArchiveRestoreIcon /> กลับมาเรียน</Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setArchiving(true)}><ArchiveIcon /> Archive (เลิกเรียน)</Button>
          ))}
          <span className="flex items-center gap-2 text-sm">
            <Pill tone={STATUS_PILL[state.status].tone}>{STATUS_PILL[state.status].label}</Pill>
            <span className="text-xs text-muted-foreground">{stateDetail(state, today) || "สถานะคำนวณอัตโนมัติจากแพ็กเกจและการลา"}</span>
          </span>
          {conv ? (
            <Button size="icon" variant="outline" className="ml-auto rounded-full" aria-label="แชท LINE กับผู้ปกครอง" title="เปิดแชท LINE กับผู้ปกครองใน Inbox" nativeButton={false} render={<Link href={`/inbox?conversation=${conv.id}`} />}><MessagesSquareIcon /></Button>
          ) : (
            <Button size="icon" variant="outline" className="ml-auto rounded-full" disabled aria-label="ยังไม่มีแชท" title="ครอบครัวนี้ยังไม่มีแชท LINE ใน Inbox"><MessagesSquareIcon /></Button>
          )}
        </div>
      )}
      {archiving && <ArchiveDialog stu={stu} onClose={() => setArchiving(false)} />}
    </>
  )
}

// ---------------------------------------------------------------- Overview

/** Package-aware progress (owner 2026-09-28): hour packs show hours used, week/month packs show days left. */
function packageProgress(e: Entitlement, sessions: Session[], attendance: { sessionId: ID; studentId: ID; status: string }[], today: string) {
  if (e.kind === "sessions") {
    const covered = new Map(sessions.filter((s) => Att.packageCovers(e, s)).map((s) => [s.id, s]))
    const usedMin = attendance.filter((a) => a.studentId === e.studentId && a.status !== "leave" && covered.has(a.sessionId)).reduce((m, a) => m + covered.get(a.sessionId)!.minutes, 0)
    const totalMin = [...covered.values()].filter((s) => s.date >= e.from && s.date <= e.to).slice(0, e.sessionsTotal).reduce((m, s) => m + s.minutes, 0) || 1
    const left = Math.max(0, totalMin - usedMin)
    return { ratio: Math.min(1, usedMin / totalMin), label: `ใช้ ${+(usedMin / 60).toFixed(1)}/${+(totalMin / 60).toFixed(1)} ชม.`, low: left <= totalMin * 0.2 }
  }
  const total = Math.max(1, daysBetween(e.from, e.to) + 1)
  const left = Math.max(0, daysBetween(today, e.to))
  return { ratio: Math.min(1, (total - left) / total), label: e.to < today ? `หมดแล้ว ${fmtDate(e.to)}` : `เหลือ ${left} วัน · ถึง ${fmtDate(e.to)}`, low: left <= 7 }
}

function Overview({ stu, ents, today }: { stu: Student; ents: Entitlement[]; today: string }) {
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const leaves = useStore((s) => s.leaves)
  const myAssessments = useStore((s) => s.assessments).filter((a) => a.studentId === stu.id).sort((a, b) => a.date.localeCompare(b.date))
  const rawEnts = useStore((s) => s.entitlements)
  const branches = useStore((s) => s.branches)
  const fam = useStore((s) => s.families.find((f) => f.id === stu.familyId))
  const [editing, setEditing] = useState(false)
  const [leaveDialog, setLeaveDialog] = useState<{ leave?: (typeof leaves)[number] } | null>(null)
  const mine = ents.filter((e) => e.studentId === stu.id).sort((a, b) => b.to.localeCompare(a.to))
  const current = mine.filter((e) => e.to >= today)
  const past = mine.filter((e) => e.to < today).slice(0, 3)
  const rawById = new Map(rawEnts.map((e) => [e.id, e]))
  const myLeaves = leaves.filter((l) => l.studentId === stu.id).sort((a, b) => b.from.localeCompare(a.from))
  const created = branches.find((b) => b.id === stu.createdBranchId)
  const age = stu.birthDate ? Math.floor(daysBetween(stu.birthDate, today) / 365.25) : null

  const Row = ({ e }: { e: Entitlement }) => {
    const c = courses.find((x) => x.id === e.courseId)
    const p = packageProgress(e, sessions, attendance, today)
    const expired = e.to < today
    const renewal = !expired && p.low
    const extended = rawById.get(e.id)?.to !== e.to
    return (
      <li className={cn("flex items-center gap-3 py-2.5", expired && "opacity-50")}>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold", subjectColor(c?.subjects[0] ?? "").chip)}>{(c?.subjects[0] ?? "?").slice(0, 2)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{c?.name ?? "คอร์ส"}</p>
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <CalendarIcon className="size-3" /> {fmtDate(e.from)} → {fmtDate(e.to, { year: true })}
            {e.classIds.length > 0 && <span>· {classes.filter((k) => e.classIds.includes(k.id)).map((k) => k.name).join(" + ")}</span>}
            {extended && <Pill tone="violet" title={`เดิมจบ ${fmtDate(rawById.get(e.id)!.to, { year: true })}`}>เลื่อนวันจบจากการลา</Pill>}
          </p>
        </div>
        {c && <PackageBadge course={c} size="md" />}
        <Pill tone={expired ? "gray" : renewal ? "amber" : "green"}>{expired ? "หมดแล้ว" : renewal ? "Renewal" : "Enroll"}</Pill>
        {(renewal || expired) && can(me, "billing.manage") && <Button size="xs" variant="outline" nativeButton={false} render={<Link href={renewHref(stu.id, e.id)} />}>ต่ออายุ</Button>}
        <div className="w-40 shrink-0 text-right">
          <p className="text-xs tabular-nums">{p.label}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", renewal ? "bg-red-600" : "bg-primary")} style={{ width: `${p.ratio * 100}%` }} /></div>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-14 shrink-0 place-items-center rounded-full text-xl font-semibold", avatarTone(stu.id))}>{initial(stu.nickname)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{stu.name} <span className="font-normal text-muted-foreground">({stu.nickname})</span></p>
            {fam ? <Link href="/families" className="inline-flex items-center gap-1 text-sm text-primary underline"><UsersIcon className="size-3.5" />{fam.name}</Link> : <p className="text-sm text-amber-700">ยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้</p>}
          </div>
          <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-medium", gradeTone(stu.grade))}>{stu.grade}</span>
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2"><CakeIcon className="size-4 text-muted-foreground" />{stu.birthDate ? <>{fmtDate(stu.birthDate, { year: true })} <span className="text-muted-foreground">· อายุ {age} ปี</span></> : <span className="text-muted-foreground">ไม่ระบุวันเกิด</span>}</p>
          <p className="flex items-center gap-2"><GraduationCapIcon className="size-4 text-muted-foreground" />{stu.school || <span className="text-muted-foreground">ไม่ระบุโรงเรียน</span>}</p>
          <p className="flex items-center gap-2"><StoreIcon className="size-4 text-muted-foreground" />สร้างที่สาขา{created?.name ?? "—"}</p>
          <p className="flex items-center gap-2"><CalendarDaysIcon className="size-4 text-muted-foreground" />สร้างเมื่อ {fmtDate(stu.createdAt.slice(0, 10), { year: true })}</p>
          {stu.usesBus && <p className="flex items-center gap-2"><BusIcon className="size-4 text-muted-foreground" />ใช้รถรับส่ง</p>}
        </div>
        {stu.note && <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900"><StickyNoteIcon className="mt-0.5 size-4 shrink-0" />{stu.note}</p>}

        <div className="mt-3 border-t pt-1">
          <p className="pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">คอร์สที่ลงเรียน</p>
          {current.length === 0 && <p className="py-3 text-sm text-muted-foreground">ไม่มีคอร์สที่ใช้อยู่</p>}
          <ul className="divide-y">{current.map((e) => <Row key={e.id} e={e} />)}</ul>
          {past.length > 0 && <ul className="divide-y border-t">{past.map((e) => <Row key={e.id} e={e} />)}</ul>}
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-2 border-t pt-3">
          {can(me, "billing.manage") && <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/billing?new=${stu.id}`} />}><ReceiptIcon /> ออกใบแจ้งหนี้</Button>}
          {can(me, "student.manage") && <Button size="sm" onClick={() => setEditing(true)}><PencilIcon /> แก้ไข</Button>}
        </div>
      </section>

      {myAssessments.length > 0 && (
        <section className="space-y-2 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="font-semibold">ผลสอบ / ทดลองเรียน</p>
          {myAssessments.map((a) => <AssessmentNote key={a.id} a={a} editable={can(me, "session.manage")} showWhen />)}
        </section>
      )}
      <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
        <div className="mb-2 flex items-center">
          <p className="font-semibold">ลาพักยาว (ไม่หักโควตา)</p>
          {can(me, "attendance.leave_override") && <Button size="xs" variant="outline" className="ml-auto" onClick={() => setLeaveDialog({})}><PlaneIcon /> บันทึกการลา</Button>}
        </div>
        <p className="mb-2 text-xs text-muted-foreground">ช่วงที่ลาพักยาว สถานะจะเป็น Inactive อัตโนมัติ และวันจบคอร์สเลื่อนออกไปให้</p>
        {myLeaves.length === 0 ? <p className="text-sm text-muted-foreground">ไม่มีการลาแบบนี้</p> : (
          <ul className="divide-y rounded-2xl border">
            {myLeaves.map((l) => (
              <li key={l.id} className="flex items-center gap-2 p-2.5 text-sm">
                <span className="font-medium">{fmtDate(l.from)} – {fmtDate(l.to, { year: true })}</span>
                <span className="truncate text-muted-foreground">{l.reason}</span>
                {l.from <= today && today <= l.to && <Pill tone="violet">กำลังลา</Pill>}
                {can(me, "attendance.leave_override") && <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setLeaveDialog({ leave: l })}>แก้ไข</Button>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {editing && <StudentForm student={stu} onClose={() => setEditing(false)} />}
      {leaveDialog && <LeaveDialog studentId={stu.id} leave={leaveDialog.leave} onClose={() => setLeaveDialog(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------- Class (Session | Attendance)

function ClassSeg({ stu, ents }: { stu: Student; ents: Entitlement[] }) {
  const [sub, setSub] = useState<"session" | "attendance">("session")
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b text-sm">
        {([["session", "คาบเรียน"], ["attendance", "การเข้าเรียน"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} className={cn("-mb-px border-b-2 pb-2", sub === k ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {sub === "session" ? <SessionList stu={stu} /> : <AttendanceList stu={stu} ents={ents} />}
    </div>
  )
}

function Teacher({ id }: { id: ID | null }) {
  const t = useStore((s) => s.staff.find((x) => x.id === id))
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold", t ? avatarTone(t.id) : "bg-muted")}>{t ? initial(t.nickname) : "?"}</span>
      <span className="truncate">{t?.nickname ?? "ยังไม่มีครู"}</span>
    </span>
  )
}

/** Sessions grouped by day; pickup/drop-off shown only for bus students (Liclass, from the invoice's bus legs). */
function SessionList({ stu }: { stu: Student }) {
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const invoices = useStore((s) => s.invoices)
  const now = useNow()
  const today = toDateStr(now)
  const [back, setBack] = useState(14)
  const legs = useMemo(() => new Map(invoices.filter((i) => i.studentId === stu.id && i.status !== "void").flatMap((i) => i.bus.map((l) => [l.date, l] as const))), [invoices, stu.id])
  const mine = sessions
    .filter((s) => s.studentIds.includes(stu.id) || attendance.some((a) => a.sessionId === s.id && a.studentId === stu.id))
    .filter((s) => daysBetween(s.date, today) <= back && daysBetween(today, s.date) <= 42 && !removedWithClass(s, classes))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const days = [...new Set(mine.map((s) => s.date))]
  const hasOlder = sessions.some((s) => s.studentIds.includes(stu.id) && daysBetween(s.date, today) > back)
  return (
    <div className="space-y-4">
      {hasOlder && <Button size="xs" variant="ghost" onClick={() => setBack(back + 28)}>แสดงคาบก่อนหน้า</Button>}
      {days.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">ไม่มีคาบในช่วงนี้</p>}
      {days.map((d) => (
        <section key={d}>
          <p className={cn("mb-1.5 text-sm font-semibold", d === today && "text-primary")}>{fmtDate(d, { weekday: true, year: true })}{d === today && " · วันนี้"}</p>
          <table className="w-full overflow-hidden rounded-2xl text-sm ring-1 ring-foreground/10">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium"><th>เวลา</th><th>วิชา</th><th>ครู</th>{stu.usesBus && <><th>รับ</th><th>ส่ง</th></>}<th className="text-right!">สถานะ</th></tr>
            </thead>
            <tbody>
              {mine.filter((s) => s.date === d).map((s) => {
                const leg = legs.get(s.date)
                const att = attendance.find((a) => a.sessionId === s.id && a.studentId === stu.id)
                return (
                  <tr key={s.id} className={cn("border-t [&>td]:px-3 [&>td]:py-2", s.cancelled && "opacity-45")}>
                    <td className="whitespace-nowrap tabular-nums"><span className="flex items-center gap-1"><ClockIcon className="size-3.5 text-muted-foreground" />{s.start}–{endTime(s.start, s.minutes)}</span></td>
                    <td><div className="flex flex-wrap gap-1">{subjectsOf(s).map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>)}</div></td>
                    <td><Teacher id={s.teacherId} /></td>
                    {stu.usesBus && <><td>{leg?.pickup ? "✓" : "—"}</td><td>{leg?.dropoff ? "✓" : "—"}</td></>}
                    <td className="text-right">
                      {att ? <Pill tone={att.status === "present" ? "green" : att.status === "absent" ? "red" : "amber"}>{att.status === "present" ? "มา" : att.status === "absent" ? "ขาด" : "ลา"}</Pill>
                        : <WorkChip w={workState(s, now, attendance, summaries)} students={s.studentIds.length} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}

function AttendanceList({ stu, ents }: { stu: Student; ents: Entitlement[] }) {
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const leaves = useStore((s) => s.leaves)
  const courses = useStore((s) => s.courses)
  const today = toDateStr(useNow())
  const mine = ents.filter((e) => e.studentId === stu.id).sort((a, b) => b.to.localeCompare(a.to))
  const rows = attendance
    .filter((a) => a.studentId === stu.id)
    .map((a) => ({ a, s: sessions.find((x) => x.id === a.sessionId)! }))
    .filter((x) => x.s)
    .sort((x, y) => (y.s.date + y.s.start).localeCompare(x.s.date + x.s.start))
  const pg = usePage(rows, 15)
  return (
    <div className="space-y-4">
      <table className="w-full overflow-hidden rounded-2xl text-sm ring-1 ring-foreground/10">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium"><th>คอร์ส</th><th>ผ่านไปแล้ว</th><th>มา</th><th>ขาด</th><th>ลา (โควตา)</th></tr>
        </thead>
        <tbody>
          {mine.map((e) => {
            // held = every session of this package that has already happened; มา + ขาด + ลา + ยังไม่เช็ค = held
            const held = sessions.filter((s) => Att.packageCovers(e, s) && s.studentIds.includes(stu.id) && !s.cancelled && s.date <= today)
            const att = attendance.filter((a) => a.studentId === stu.id && held.some((s) => s.id === a.sessionId))
            const n = (st: string) => att.filter((a) => a.status === st).length
            const unmarked = held.length - att.length
            const c = courses.find((x) => x.id === e.courseId)
            return (
              <tr key={e.id} className="border-t [&>td]:px-3 [&>td]:py-2">
                <td><span className="flex items-center gap-2"><span className={cn("grid size-8 place-items-center rounded-lg text-xs font-semibold", subjectColor(c?.subjects[0] ?? "").chip)}>{(c?.subjects[0] ?? "?").slice(0, 2)}</span>{c?.name}</span></td>
                <td className="tabular-nums">{held.length} คาบ{unmarked > 0 && <span className="text-xs text-amber-700"> · ยังไม่เช็ค {unmarked}</span>}</td>
                <td className="tabular-nums text-emerald-700">{n("present")}</td>
                <td className="tabular-nums text-red-700">{n("absent")}</td>
                <td className="tabular-nums text-amber-700">{Att.leavesUsed(e, sessions, attendance, leaves)}/{Att.leaveQuota(e)}</td>
              </tr>
            )
          })}
          {mine.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">ยังไม่มีแพ็กเกจ</td></tr>}
        </tbody>
      </table>
      <table className="w-full overflow-hidden rounded-2xl text-sm ring-1 ring-foreground/10">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium"><th>วันที่</th><th>วิชา</th><th>ครู</th><th className="text-right!">สถานะ</th><th className="w-8" /></tr>
        </thead>
        <tbody>
          {pg.rows.map(({ a, s }) => (
            <tr key={s.id} className="border-t [&>td]:px-3 [&>td]:py-2">
              <td className="whitespace-nowrap"><span className="flex items-center gap-1"><CalendarIcon className="size-3.5 text-muted-foreground" />{fmtDate(s.date, { weekday: true, year: true })}</span></td>
              <td><div className="flex flex-wrap gap-1">{subjectsOf(s).map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>)}</div></td>
              <td><Teacher id={s.teacherId} /></td>
              <td className="text-right"><Pill tone={a.status === "present" ? "green" : a.status === "absent" ? "red" : "amber"}>{a.status === "present" ? "มา" : a.status === "absent" ? "ขาด" : "ลา"}</Pill></td>
              <td><Link href={`/calendar?sessionId=${s.id}`} aria-label="เปิดคาบนี้" className="text-muted-foreground hover:text-foreground"><ArrowUpRightIcon className="size-4" /></Link></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">ยังไม่มีประวัติเช็คชื่อ</td></tr>}
        </tbody>
      </table>
      <Pager {...pg} unit="คาบ" />
    </div>
  )
}

// ---------------------------------------------------------------- Billing

function BillingSeg({ stu }: { stu: Student }) {
  const router = useRouter()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const invoices = useStore((s) => s.invoices).filter((i) => i.studentId === stu.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">กดแถวเพื่อเปิดใบแจ้งหนี้ · จ่ายครบแล้วระบบเพิ่มเข้าคลาสให้อัตโนมัติ</p>
        {can(me, "billing.manage") && <Button size="sm" variant="outline" className="ml-auto" nativeButton={false} render={<Link href={`/billing?new=${stu.id}`} />}><PlusIcon /> ใบแจ้งหนี้ใหม่</Button>}
      </div>
      <table className="w-full overflow-hidden rounded-2xl text-sm ring-1 ring-foreground/10">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium"><th>เลขที่</th><th>รายการ</th><th>วันที่</th><th className="text-right!">ยอด</th><th className="text-right!">สถานะ</th></tr>
        </thead>
        <tbody>
          {invoices.map((i) => {
            const subjects = [...new Set(i.lines.flatMap((l) => courses.find((x) => x.id === l.courseId)?.subjects ?? []))]
            const total = invoiceTotals(i, { branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays }).total
            return (
              <tr key={i.id} className="cursor-pointer border-t hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2" onClick={() => router.push(`/billing?open=${i.id}`)}>
                <td className="whitespace-nowrap tabular-nums"><span className="flex items-center gap-1.5"><FileTextIcon className="size-4 text-muted-foreground" />{i.number ?? "ร่าง (ยังไม่มีเลข)"}</span></td>
                <td><div className="flex flex-wrap gap-1">{subjects.length ? subjects.map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>) : <span className="text-xs text-muted-foreground">{i.busExtras?.length ? "ค่ารถเพิ่ม" : "ค่าอื่นๆ"}</span>}{i.status === "paid" && subjects.length > 0 && <span className="text-[11px] text-emerald-700">✓ เข้าคลาสแล้ว</span>}</div></td>
                <td className="whitespace-nowrap text-xs">{fmtDate(i.createdAt.slice(0, 10), { year: true })}</td>
                <td className="text-right tabular-nums">{fmtMoney(total)}</td>
                <td className="text-right"><Pill tone={i.status === "paid" ? "green" : i.status === "void" ? "gray" : i.status === "draft" ? "gray" : "amber"}>{INVOICE_STATUS_LABEL[i.status]}</Pill></td>
              </tr>
            )
          })}
          {invoices.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">ยังไม่มีใบแจ้งหนี้</td></tr>}
        </tbody>
      </table>
      <BusAddOns stu={stu} />
    </div>
  )
}

// ---------------------------------------------------------------- Note

function NoteSeg({ stu }: { stu: Student }) {
  const notes = useStore((s) => s.notes).filter((n) => n.studentId === stu.id).sort((a, b) => a.at.localeCompare(b.at))
  const staff = useStore((s) => s.staff)
  const userId = useStore((s) => s.userId)
  const add = useStore((s) => s.addStudentNote)
  const [text, setText] = useState("")
  const send = () => { if (report(add(stu.id, text), "บันทึกโน้ตแล้ว")) setText("") }
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3">
        {notes.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">ยังไม่มีโน้ต — ใช้จดเรื่องที่ทีมควรรู้เกี่ยวกับนักเรียนคนนี้</p>}
        {notes.map((n) => {
          const by = staff.find((x) => x.id === n.by)
          const mineN = n.by === userId
          return (
            <div key={n.id} className={cn("flex items-end gap-2", mineN && "flex-row-reverse")}>
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", avatarTone(n.by))}>{initial(by?.nickname ?? "?")}</span>
              <div className={cn("max-w-[80%] rounded-2xl p-3 text-sm", mineN ? "bg-primary/10" : "bg-muted")}>
                <p className="mb-1 flex gap-3 text-[11px] text-muted-foreground"><span>{by?.nickname ?? "?"}</span><span className="ml-auto">{fmtDateTime(n.at)}</span></p>
                <p className="whitespace-pre-wrap">{n.text}</p>
              </div>
            </div>
          )
        })}
      </div>
      <p className="my-2 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MessageSquareIcon className="size-3.5" /> ข้อมูลภายในเท่านั้น — ผู้ปกครองไม่เห็น</p>
      <div className="flex items-end gap-2 rounded-2xl border p-2">
        <Textarea rows={1} className="min-h-9 flex-1 resize-none border-0 bg-transparent shadow-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์โน้ต…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }} />
        <Button size="icon" disabled={!text.trim()} aria-label="บันทึกโน้ต" onClick={send}><SendIcon /></Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Timeline

const CAT_LABEL: Record<LogCategory, string> = { profile: "ข้อมูลนักเรียน", class: "คลาส", attendance: "เช็คชื่อ/สรุป", billing: "การเงิน", note: "โน้ต" }
const CAT_ICON: Record<LogCategory, typeof PencilIcon> = { profile: UserRoundIcon, class: GraduationCapIcon, attendance: CalendarIcon, billing: ReceiptIcon, note: StickyNoteIcon }

function TimelineSeg({ stu }: { stu: Student }) {
  const logs = useStore((s) => s.logs)
  const staff = useStore((s) => s.staff)
  const [cat, setCat] = useState<LogCategory | "">("")
  const [q, setQ] = useState("")
  const needle = q.trim().toLowerCase()
  const rows = logs
    .filter((l) => l.studentIds.includes(stu.id))
    .filter((l) => !cat || l.category === cat)
    .filter((l) => !needle || `${l.action} ${l.detail} ${staff.find((x) => x.id === l.by)?.nickname ?? "ระบบ"}`.toLowerCase().includes(needle))
    .sort((a, b) => b.at.localeCompare(a.at))
  const pg = usePage(rows, 20)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {(["", "profile", "class", "attendance", "billing", "note"] as const).map((c) => (
            <button key={c || "all"} onClick={() => setCat(c)} className={cn("rounded-full border px-3 py-1 text-xs", cat === c ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{c ? CAT_LABEL[c] : "ทั้งหมด"}</button>
          ))}
        </div>
        <div className="relative ml-auto">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 w-48 pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาใน Log" />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b text-xs text-muted-foreground">
          <tr className="[&>th]:px-2 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium"><th className="w-8" /><th>วันที่</th><th>ทำโดย</th><th>เหตุการณ์</th></tr>
        </thead>
        <tbody>
          {pg.rows.map((l) => {
            const Icon = CAT_ICON[l.category]
            const by = staff.find((x) => x.id === l.by)
            return (
              <tr key={l.id} className="border-b last:border-0 [&>td]:px-2 [&>td]:py-2.5 [&>td]:align-top">
                <td><Icon className="size-4 text-muted-foreground" /></td>
                <td className="whitespace-nowrap text-xs tabular-nums">{fmtDateTime(l.at)}</td>
                <td className="whitespace-nowrap">
                  {by ? <span className="flex items-center gap-1.5"><span className={cn("grid size-6 place-items-center rounded-full text-[10px] font-semibold", avatarTone(by.id))}>{initial(by.nickname)}</span>{by.nickname}</span> : <span className="text-muted-foreground">ระบบ</span>}
                </td>
                <td><span className="font-medium">{l.action}</span> <span className="text-muted-foreground">{l.detail}</span></td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">ยังไม่มีประวัติ</td></tr>}
        </tbody>
      </table>
      <Pager {...pg} unit="รายการ" />
    </div>
  )
}

function ArchiveDialog({ stu, onClose }: { stu: Student; onClose: () => void }) {
  const archive = useStore((s) => s.archiveStudent)
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive — {stu.nickname} เลิกเรียนแล้ว?</DialogTitle>
          <DialogDescription>เอาออกจากทุกคลาสและทุกคาบที่ยังไม่เริ่ม · ประวัติการเรียนและการเงินยังอยู่ครบ · กด “กลับมาเรียน” ได้ภายหลัง · ถ้าแค่ลาพักยาวให้ใช้ “บันทึกการลา” แทน</DialogDescription>
        </DialogHeader>
        <Textarea autoFocus rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เหตุผล (จำเป็น) เช่น ย้ายโรงเรียนไปต่างจังหวัด" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => report(archive(stu.id, reason), `${stu.nickname} ถูก Archive แล้ว`) && onClose()}>ยืนยัน Archive</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
