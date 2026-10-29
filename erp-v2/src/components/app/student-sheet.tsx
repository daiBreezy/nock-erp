"use client"

import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { CloseExitDialog, ExitPanel, ExitRequestDialog } from "./student-exit"
import { BusAddOns } from "@/components/billing/bus-addons"
import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArchiveRestoreIcon, DoorOpenIcon, BusIcon, CakeIcon, CalendarDaysIcon, CalendarIcon, GraduationCapIcon,
  MessageSquareIcon, MessagesSquareIcon, PencilIcon, PhoneIcon, PlaneIcon, PlusIcon, ReceiptIcon, SearchIcon, StickyNoteIcon, StoreIcon, UsersIcon,
  ChevronRightIcon, HistoryIcon, ArrowUpIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EntityPanel, PanelFooter, PanelForm, PanelMore } from "./form-shell"
import { Tabs } from "./page-layout"
import { Input } from "@/components/ui/input"
import { daysBetween, endTime, fmtDate, fmtDateTime, fmtMoney, toDateStr, weekdayShort } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { INVOICE_STATUS_LABEL, invoiceTotals } from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import { removedWithClass, sessionState, subjectsOf } from "@/domain/rules/scheduling"
import type { ActivityLog, Entitlement, ID, Invoice, LogCategory, Session, Student, StudentLeave } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Pill } from "./badges"
import { Pager, usePage } from "./data-table"
import { ColumnsMenu, DataTable, type Column } from "./data-grid"
import { NativeSelect } from "./native-select"
import { CalendarNotes } from "@/components/calendar/calendar-notes-ui"
import { Kpi } from "./kpi"
import { busDaysOf } from "@/domain/rules/parent-view"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StudentSessionMenu } from "./session-sheet"
import { AssessmentNote } from "./assessment-note"
import { LeaveDialog } from "./leave-dialog"
import { PackageBadge } from "./package-badge"
import { RenewalFollowUpSection } from "./renewal-followup"
import { StudentForm } from "./student-form"
import { stateDetail, STATUS_PILL } from "./student-status"
import { avatarTone, gradeTone, initial, subjectColor } from "./subject-color"
import { InfoTip } from "./info-tip"

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
 * Student side panel (owner 2026-10-09 — same pattern as every entity): information with tabs Overview · Class ·
 * Billing · Note · Timeline; แก้ไข switches the panel to the form; "new" opens the empty form and becomes the
 * information view once saved. Active/Inactive is automatic (packages + long leave); only Archive is manual.
 */
export function StudentSheet({ studentId, familyId, onClose }: { studentId: ID | "new" | null; familyId?: ID; onClose: () => void }) {
  return (
    <EntityPanel open={!!studentId} onClose={onClose} wide>
      {studentId && <Panel key={studentId} studentId={studentId} familyId={familyId} onClose={onClose} />}
    </EntityPanel>
  )
}

function Panel({ studentId, familyId, onClose }: { studentId: ID | "new"; familyId?: ID; onClose: () => void }) {
  const [createdId, setCreatedId] = useState<ID | null>(null)
  const isNew = studentId === "new"
  const [editing, setEditing] = useState(isNew)
  const id = isNew ? createdId : studentId
  const stu = useStore((s) => (id ? s.students.find((x) => x.id === id) : undefined))
  return (editing && (isNew && !createdId ? true : !!stu)) ? (
        <PanelForm>
          <StudentForm key={stu?.id ?? "new"} student={stu} familyId={familyId}
            onClose={() => (stu ? setEditing(false) : onClose())}
            onSaved={(x) => { if (isNew) setCreatedId(x.id); setEditing(false) }} />
        </PanelForm>
      ) : id ? <Body id={id} onEdit={() => setEditing(true)} /> : null
}

function Body({ id, onEdit }: { id: ID; onEdit: () => void }) {
  const stu = useStore((s) => s.students.find((x) => x.id === id))
  const fam = useStore((s) => s.families.find((f) => f.id === stu?.familyId))
  const conv = useStore((s) => s.conversations.find((c) => c.familyId && c.familyId === stu?.familyId))
  const leaves = useStore((s) => s.leaves)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const me = useStore((s) => s.me())
  const ents = useEntitlements()
  const today = toDateStr(useNow())
  const [seg, setSeg] = useState<Seg>("overview")
  // owner 2026-10-16: the invoice opens as a panel right here — no jump to Billing
  const [invoice, setInvoice] = useState<ID | "new" | null>(null)
  const [classSub, setClassSub] = useState<ClassSub>("session")
  const [leaveDialog, setLeaveDialog] = useState<{ leave?: StudentLeave } | null>(null)
  const canLeave = can(me, "attendance.leave_override")
  const [archiving, setArchiving] = useState(false)
  const [closingNow, setClosingNow] = useState(false)
  const restore = useStore((s) => s.restoreStudent)
  if (!stu) return null

  const state = Att.studentState(stu, ents, leaves, today, renewalDays)
  const primary = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]

  return (
    <>
      <SheetHeader className="shrink-0 gap-2 border-b pb-0">
        <div className="flex items-center gap-3 pr-8">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(stu.id))}><GraduationCapIcon className="size-5" /></span>
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">{stu.nickname} <span className="font-normal text-muted-foreground">{stu.name}</span></SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-1.5">
              {stu.grade && <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", gradeTone(stu.grade))}>{stu.grade}</span>}
              <Pill tone={STATUS_PILL[state.status].tone}>{STATUS_PILL[state.status].label}</Pill>
              {/* owner 2026-10-29: helper text on hover only */}
              <InfoTip text={stateDetail(state, today) || "สถานะคำนวณอัตโนมัติจากแพ็กเกจและการลา"} />
            </SheetDescription>
          </div>
          {/* owner 2026-10-29: just the call button */}
          {primary && (
            <a href={`tel:${primary.phone.replace(/\D/g, "")}`} title={`โทร ${primary.name} ${primary.phone}`} aria-label={`โทร ${primary.name}`}
              className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"><PhoneIcon className="size-4" /></a>
          )}
        </div>
        <Tabs className="-mx-4 border-b-0 px-3" value={seg} onChange={setSeg} options={SEGS.filter((x) => x.id !== "billing" || can(me, "billing.view")).map((x) => ({ value: x.id, label: x.label }))} />
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {stu.exit && <div className="mb-4"><ExitPanel stu={stu} /></div>}
        {seg === "overview" && <Overview stu={stu} ents={ents} today={today} status={state.status} onNotRenewing={() => setArchiving(true)} onHistory={() => { setClassSub("history"); setSeg("class") }} onEditLeave={(leave) => setLeaveDialog({ leave })} />}
        {seg === "class" && <ClassSeg stu={stu} ents={ents} sub={classSub} setSub={setClassSub} />}
        {seg === "billing" && <BillingSeg stu={stu} />}
        {seg === "note" && <NoteSeg stu={stu} />}
        {seg === "timeline" && <TimelineSeg stu={stu} />}
      </div>

      {/* Header · Body · Bottom — CTAs live here: destructive left, primary right (owner 2026-10-09) */}
      {seg !== "note" && (
        <PanelFooter>
          {/* owner 2026-10-12: the less-used actions sit behind ⋯ — แจ้งออก · ลาพักยาว */}
          <PanelMore items={[
            can(me, "student.manage") && stu.archived && { label: "กลับมาเรียน", icon: ArchiveRestoreIcon, onClick: () => report(restore(stu.id), "กลับมาเรียนแล้ว") },
            canLeave && { label: "ลาพักยาว", icon: PlaneIcon, onClick: () => setLeaveDialog({}) },
            can(me, "student.manage") && !stu.archived && !stu.exit && { label: "แจ้งออก", icon: DoorOpenIcon, destructive: true, onClick: () => setArchiving(true) },
          ]} />
          {conv ? (
            <Button size="icon" variant="outline" className="ml-auto rounded-full" aria-label="แชท LINE กับผู้ปกครอง" title="เปิดแชท LINE กับผู้ปกครองใน Inbox" nativeButton={false} render={<Link href={`/inbox?conversation=${conv.id}`} />}><MessagesSquareIcon /></Button>
          ) : (
            <Button size="icon" variant="outline" className="ml-auto rounded-full" disabled aria-label="ยังไม่มีแชท" title="ครอบครัวนี้ยังไม่มีแชท LINE ใน Inbox"><MessagesSquareIcon /></Button>
          )}
          {can(me, "billing.manage") && <Button variant="outline" onClick={() => setInvoice("new")}><ReceiptIcon /> ออกใบแจ้งหนี้</Button>}
          {can(me, "student.manage") && <Button onClick={onEdit}><PencilIcon /> แก้ไข</Button>}
        </PanelFooter>
      )}
      <InvoiceSheet id={invoice} defaultStudentId={stu.id} onClose={() => setInvoice(null)} />
      {archiving && <ExitRequestDialog stu={stu} onClose={() => setArchiving(false)} onCloseNow={() => { setArchiving(false); setClosingNow(true) }} />}
      {closingNow && <CloseExitDialog stu={stu} response={null} onClose={() => setClosingNow(false)} />}
      {leaveDialog && <LeaveDialog studentId={stu.id} leave={leaveDialog.leave} onClose={() => setLeaveDialog(null)} />}
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

function PackageRow({ e, stu, today }: { e: Entitlement; stu: Student; today: string }) {
  const [renewing, setRenewing] = useState(false)
const me = useStore((s) => s.me())
const courses = useStore((s) => s.courses)
const classes = useStore((s) => s.classes)
const sessions = useStore((s) => s.sessions)
const attendance = useStore((s) => s.attendance)
const rawTo = useStore((s) => s.entitlements.find((x) => x.id === e.id)?.to)
  const c = courses.find((x) => x.id === e.courseId)
  const p = packageProgress(e, sessions, attendance, today)
  const expired = e.to < today
  const renewal = !expired && p.low
  const extended = rawTo !== undefined && rawTo !== e.to
  return (
    <li className={cn("flex items-center gap-3 py-2.5", expired && "opacity-50")}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold", subjectColor(c?.subjects[0] ?? "").chip)}>{(c?.subjects[0] ?? "?").slice(0, 2)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{c?.name ?? "คอร์ส"}</p>
        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <CalendarIcon className="size-3" /> {fmtDate(e.from)} → {fmtDate(e.to, { year: true })}
          {e.classIds.length > 0 && <span>· {classes.filter((k) => e.classIds.includes(k.id)).map((k) => k.name).join(" + ")}</span>}
          {extended && <Pill tone="violet" title={`เดิมจบ ${fmtDate(rawTo!, { year: true })}`}>เลื่อนวันจบจากการลา</Pill>}
        </p>
      </div>
      {/* owner 2026-10-29: fixed slots (badge · status · ต่ออายุ · bar) so every row lines up, with or without the button */}
      <span className="flex w-12 shrink-0 justify-end">{c && <PackageBadge course={c} size="md" />}</span>
      <Pill tone={expired ? "gray" : renewal ? "amber" : "green"} className="w-20 shrink-0 justify-center">{expired ? "หมดแล้ว" : renewal ? "Renewal" : "Enroll"}</Pill>
      <span className="flex w-16 shrink-0 justify-center">{(renewal || expired) && can(me, "billing.manage") && <Button size="xs" variant="outline" onClick={() => setRenewing(true)}>ต่ออายุ</Button>}</span>
      {renewing && <InvoiceSheet id="new" defaultStudentId={stu.id} renewEntitlementId={e.id} onClose={() => setRenewing(false)} />}
      <div className="w-40 shrink-0 text-left">
        <p className="text-xs tabular-nums">{p.label}</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", renewal ? "bg-red-600" : "bg-primary")} style={{ width: `${p.ratio * 100}%` }} /></div>
      </div>
    </li>
  )
}

function Overview({ stu, ents, today, status, onNotRenewing, onHistory, onEditLeave }: { stu: Student; ents: Entitlement[]; today: string; status: Att.StudentStatus; onNotRenewing: () => void; onHistory: () => void; onEditLeave: (l: StudentLeave) => void }) {
  const me = useStore((s) => s.me())
  const leaves = useStore((s) => s.leaves)
  const myAssessments = useStore((s) => s.assessments).filter((a) => a.studentId === stu.id).sort((a, b) => a.date.localeCompare(b.date))
  const branches = useStore((s) => s.branches)
  const fam = useStore((s) => s.families.find((f) => f.id === stu.familyId))
  const mine = ents.filter((e) => e.studentId === stu.id).sort((a, b) => b.to.localeCompare(a.to))
  const current = mine.filter((e) => e.to >= today)
  const pastCount = mine.length - current.length
  const myLeaves = leaves.filter((l) => l.studentId === stu.id).sort((a, b) => b.from.localeCompare(a.from))
  const created = branches.find((b) => b.id === stu.createdBranchId)
  const age = stu.birthDate ? Math.floor(daysBetween(stu.birthDate, today) / 365.25) : null

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
          {/* owner 2026-10-12: only packages still running here — finished ones live in คลาส › ประวัติคอร์ส */}
          {current.length === 0 && <p className="py-3 text-sm text-muted-foreground">ไม่มีคอร์สที่ใช้อยู่</p>}
          <ul className="divide-y">{current.map((e) => <PackageRow key={e.id} e={e} stu={stu} today={today} />)}</ul>
          {pastCount > 0 && (
            <button type="button" onClick={onHistory} className="mt-1 flex w-full items-center gap-1 border-t pt-2.5 text-xs text-muted-foreground hover:text-foreground">
              <HistoryIcon className="size-3.5" />ประวัติคอร์สที่หมดแล้ว {pastCount} รายการ<ChevronRightIcon className="ml-auto size-3.5" />
            </button>
          )}
        </div>

      </section>

      {status === "renewal" && <RenewalFollowUpSection stu={stu} canManage={can(me, "student.manage")} onNotRenewing={onNotRenewing} />}

      {myAssessments.length > 0 && (
        <section className="space-y-2 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
          <p className="font-semibold">ผลสอบ / ทดลองเรียน</p>
          {myAssessments.map((a) => <AssessmentNote key={a.id} a={a} editable={can(me, "session.manage")} showWhen />)}
        </section>
      )}
      {/* owner 2026-10-12: only once a long leave exists — new ones are added from ⋯ › ลาพักยาว in the bottom bar */}
      {myLeaves.length > 0 && (
      <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
        <p className="mb-2 flex items-center gap-1 font-semibold">ลาพักยาว (ไม่หักโควตา) <InfoTip text="ช่วงที่ลาพักยาว สถานะจะเป็น Inactive อัตโนมัติ และวันจบคอร์สเลื่อนออกไปให้" /></p>
        {(
          <ul className="divide-y rounded-2xl border">
            {myLeaves.map((l) => (
              <li key={l.id} className="flex items-center gap-2 p-2.5 text-sm">
                <span className="font-medium">{fmtDate(l.from)} – {fmtDate(l.to, { year: true })}</span>
                <span className="truncate text-muted-foreground">{l.reason}</span>
                {l.from <= today && today <= l.to && <Pill tone="violet">กำลังลา</Pill>}
                {can(me, "attendance.leave_override") && <Button size="xs" variant="ghost" className="ml-auto" onClick={() => onEditLeave(l)}>แก้ไข</Button>}
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Class (Session | Attendance)

type ClassSub = "session" | "history"
function ClassSeg({ stu, ents, sub, setSub }: { stu: Student; ents: Entitlement[]; sub: ClassSub; setSub: (s: ClassSub) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b text-sm">
        {([["session", "คาบเรียน"], ["history", "ประวัติคอร์ส"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSub(k)} className={cn("-mb-px border-b-2 pb-2", sub === k ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {sub === "session" ? <SessionList stu={stu} ents={ents} /> : <CourseHistory stu={stu} ents={ents} />}
    </div>
  )
}

/** owner 2026-10-12: packages that have ended — kept as history here, not on the overview */
function CourseHistory({ stu, ents }: { stu: Student; ents: Entitlement[] }) {
  const today = toDateStr(useNow())
  const past = ents.filter((e) => e.studentId === stu.id && e.to < today).sort((a, b) => b.to.localeCompare(a.to))
  if (!past.length) return <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีคอร์สที่หมดแล้ว</p>
  return <ul className="divide-y">{past.map((e) => <PackageRow key={e.id} e={e} stu={stu} today={today} />)}</ul>
}

const ATT_LABEL = { present: "มา", absent: "ขาด", leave: "ลา" } as const
const ATT_TONE = { present: "green", absent: "red", leave: "amber" } as const

/**
 * คาบเรียน + การเข้าเรียน in one list (owner 2026-10-29): every session past and upcoming with its check-in, filter by
 * subject, and ⋯ on each row to re-schedule / leave / open it right here. Pickup / drop-off only for bus students.
 */
function SessionList({ stu, ents }: { stu: Student; ents: Entitlement[] }) {
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const attendance = useStore((s) => s.attendance)
  const invoices = useStore((s) => s.invoices)
  const staff = useStore((s) => s.staff)
  const leaves = useStore((s) => s.leaves)
  const courses = useStore((s) => s.courses)
  const now = useNow()
  const today = toDateStr(now)
  const [subject, setSubject] = useState("")
  const busAddOns = useStore((s) => s.busAddOns)
  // paid legs + extra rides − rides the parent cancelled (same as the bus plan)
  const legs = useMemo(() => busDaysOf(stu.id, invoices, busAddOns), [invoices, busAddOns, stu.id])
  // owner Row 44/49 (2026-10-28): EVERY session — past and upcoming — so parents can be told the full schedule
  const all = sessions
    .filter((s) => s.studentIds.includes(stu.id) || attendance.some((a) => a.sessionId === s.id && a.studentId === stu.id))
    .filter((s) => !removedWithClass(s, classes))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const subjects = [...new Set(all.flatMap(subjectsOf))]
  const mine = subject ? all.filter((s) => subjectsOf(s).includes(subject)) : all
  const active = mine.filter((s) => !s.cancelled)
  const done = active.filter((s) => s.date < today).length
  const canBus = can(useStore((s) => s.me()), "billing.manage")
  const att = (s: Session) => attendance.find((a) => a.sessionId === s.id && a.studentId === stu.id)
  // this student's status in the session — one short pill (the class-wide check-in count belongs to the session, not here)
  const studentSessionStatus = (s: Session): { label: string; tone: "green" | "red" | "amber" | "blue" | "gray" } => {
    const a = att(s)
    if (a) return { label: ATT_LABEL[a.status], tone: ATT_TONE[a.status] }
    const st = sessionState(s, now)
    return st === "cancelled" ? { label: "ยกเลิก", tone: "gray" } : st === "upcoming" ? { label: "รอเริ่ม", tone: "gray" } : st === "live" ? { label: "กำลังเรียน", tone: "blue" } : { label: "ยังไม่เช็คชื่อ", tone: "amber" }
  }

  // owner 2026-10-29: day and date in their own columns · time on top, minutes below · bus = one P / D / B tag,
  // hidden until the admin turns it on (and editable here) · status on the right · ⋯ only on row hover.
  // "1%" = shrink to content, so the spare width goes to the subject column instead of spreading everywhere.
  const columns: Column<Session>[] = [
    { id: "day", label: "วัน", width: "1%", cell: (s) => <span className={cn(s.date === today && "font-medium text-primary")}>{weekdayShort(new Date(`${s.date}T00:00:00`).getDay())}</span> },
    { id: "date", label: "วันที่", required: true, width: "1%", cell: (s) => <span className={cn(s.date === today && "font-medium text-primary")}>{fmtDate(s.date, { year: true })}</span> },
    { id: "time", label: "เวลา", width: "1%", cell: (s) => <span className="flex flex-col leading-tight tabular-nums">{s.start}–{endTime(s.start, s.minutes)}<span className="text-xs text-muted-foreground">{s.minutes} นาที</span></span> },
    { id: "subject", label: "วิชา", cell: (s) => <span className="flex gap-1">{subjectsOf(s).map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>)}</span> },
    { id: "teacher", label: "ครู", width: "1%", cell: (s) => staff.find((x) => x.id === s.teacherId)?.nickname ?? <span className="text-muted-foreground">ยังไม่มีครู</span> },
    { id: "bus", label: "รถรับส่ง", width: "1%", align: "center", defaultHidden: true, info: "P = รับ (Pickup) · D = ส่ง (Drop) · B = ทั้งรับและส่ง — กดเพื่อแก้ (คาบที่ยังไม่ถึง)",
      cell: (s) => <BusTag studentId={stu.id} date={s.date} legs={legs.get(s.date)} editable={canBus && s.date >= today && !s.cancelled} /> },
    // same-width pills so the column lines up whatever the label
    { id: "status", label: "สถานะ", width: "1%", align: "right", cell: (s) => { const x = studentSessionStatus(s); return <Pill tone={x.tone} className="w-24 justify-center">{x.label}</Pill> } },
  ]

  // per course: held so far = มา + ขาด + ลา + ยังไม่เช็ค
  const packages = ents.filter((e) => e.studentId === stu.id && (!subject || e.subjects.includes(subject))).sort((a, b) => b.to.localeCompare(a.to))
  const heldOf = (e: Entitlement) => sessions.filter((s) => Att.packageCovers(e, s) && s.studentIds.includes(stu.id) && !s.cancelled && s.date <= today)
  const attOf = (held: Session[]) => attendance.filter((a) => a.studentId === stu.id && held.some((s) => s.id === a.sessionId))

  return (
    <div className="space-y-3">
      {/* owner 2026-10-29: the per-course cards always on top */}
      {packages.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">การเข้าเรียนต่อคอร์ส</h3>
          {/* owner 2026-10-29: one card per course instead of a table */}
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.map((e) => {
              const held = heldOf(e)
              const marks = attOf(held)
              const n = (st: string) => marks.filter((a) => a.status === st).length
              const unmarked = held.length - marks.length
              const course = courses.find((x) => x.id === e.courseId)
              return (
                <Kpi key={e.id} icon={GraduationCapIcon} tone={e.to < today ? "violet" : "sky"} label={course?.name ?? "—"} value={`${n("present")}/${held.length}`}
                  sub={`มาเรียน · ${fmtDate(e.from)} → ${fmtDate(e.to, { year: true })}`}>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <Pill tone="green">{`มา ${n("present")}`}</Pill>
                    <Pill tone="red">{`ขาด ${n("absent")}`}</Pill>
                    <Pill tone="amber">{`ลา ${Att.leavesUsed(e, sessions, attendance, leaves)}/${Att.leaveQuota(e)}`}</Pill>
                    {unmarked > 0 && <Pill tone="gray">{`ยังไม่เช็ค ${unmarked}`}</Pill>}
                  </div>
                </Kpi>
              )
            })}
          </div>
        </section>
      )}
      <div className="flex items-center gap-2">
        <NativeSelect className="w-48" value={subject} onChange={(e) => setSubject(e.target.value)}
          options={[{ value: "", label: `ทุกวิชา (${all.length})` }, ...subjects.map((x) => ({ value: x, label: `${x} (${all.filter((s) => subjectsOf(s).includes(x)).length})` }))]} />
        {active.length > 0 && <p className="text-sm text-muted-foreground tabular-nums">{`ทั้งหมด ${active.length} คาบ · เรียนไปแล้ว ${done} · เหลือ ${active.length - done}`}</p>}
        <span className="ml-auto"><ColumnsMenu id="student-sessions" columns={columns} /></span>
      </div>
      <DataTable id="student-sessions" columns={columns} rows={mine} rowKey={(s) => s.id} minWidth={520} maxHeight="calc(100dvh - 16rem)"
        rowActions={(s) => <StudentSessionMenu s={s} studentId={stu.id} />}
        rowClassName={(s) => cn(s.cancelled && "opacity-45", s.date === today && "bg-primary/5")} empty="ไม่มีคาบ" />
    </div>
  )
}

const BUS_TAG = { P: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200", D: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200", B: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" } as const

/** P = pickup · D = drop · B = both (owner 2026-10-29) — click to change that day's rides: added legs are charged on the
 *  next invoice, removed ones stop the bus (paid rides are not refunded) — same as a parent's request in LINE. */
function BusTag({ studentId, date, legs, editable }: { studentId: ID; date: string; legs?: { pickup: boolean; dropoff: boolean }; editable: boolean }) {
  const add = useStore((s) => s.addBusAddOns)
  const cancel = useStore((s) => s.cancelBusRides)
  const [open, setOpen] = useState(false)
  const [p, setP] = useState(!!legs?.pickup)
  const [d, setD] = useState(!!legs?.dropoff)
  const kind = legs?.pickup && legs?.dropoff ? "B" : legs?.pickup ? "P" : legs?.dropoff ? "D" : null
  const tag = kind ? <span className={cn("inline-grid size-6 place-items-center rounded-full text-xs font-semibold", BUS_TAG[kind])}>{kind}</span> : <span className="text-muted-foreground">—</span>
  if (!editable) return tag
  const save = () => {
    const cur = { pickup: !!legs?.pickup, dropoff: !!legs?.dropoff }
    const plus = { pickup: p && !cur.pickup, dropoff: d && !cur.dropoff }
    const minus = { pickup: !p && cur.pickup, dropoff: !d && cur.dropoff }
    let ok = true
    if (plus.pickup || plus.dropoff) ok = report(add(studentId, [{ date, ...plus }], null, "แก้จากหน้านักเรียน"), "เพิ่มรอบรถแล้ว — เรียกเก็บในใบถัดไป") && ok
    if (ok && (minus.pickup || minus.dropoff)) ok = report(cancel(studentId, [{ date, ...minus }], "แก้จากหน้านักเรียน"), "ยกเลิกรอบรถแล้ว")
    if (ok) setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setP(!!legs?.pickup); setD(!!legs?.dropoff) } }}>
      <PopoverTrigger render={<button type="button" aria-label="แก้รถรับส่งวันนี้" className="rounded-full hover:ring-2 hover:ring-primary/30" />}>{tag}</PopoverTrigger>
      <PopoverContent align="center" className="w-56 space-y-2 p-3 text-sm">
        <p className="font-medium">{`รถรับส่ง ${fmtDate(date, { weekday: true })}`}</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={p} onChange={(e) => setP(e.target.checked)} /> รับ (Pickup)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={d} onChange={(e) => setD(e.target.checked)} /> ส่ง (Drop)</label>
        <p className="text-xs text-muted-foreground">เพิ่ม = เรียกเก็บในใบถัดไป · เอาออก = รถไม่มารับ (ไม่คืนเงินรอบที่จ่ายแล้ว)</p>
        <div className="flex justify-end"><Button size="xs" onClick={save}>บันทึก</Button></div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------- Billing

function BillingSeg({ stu }: { stu: Student }) {
  const [invoice, setInvoice] = useState<ID | "new" | null>(null)
  const me = useStore((s) => s.me())
  const invoices = useStore((s) => s.invoices).filter((i) => i.studentId === stu.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const subjectsOfInv = (i: Invoice) => [...new Set(i.lines.flatMap((l) => courses.find((x) => x.id === l.courseId)?.subjects ?? []))]
  const invoiceCols: Column<Invoice>[] = [
    { id: "number", label: "เลขที่", required: true, className: "tabular-nums", cell: (i) => i.number ?? "—" },
    { id: "items", label: "รายการ", cell: (i) => { const subjects = subjectsOfInv(i); return <span className="flex items-center gap-1">{subjects.length ? subjects.map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>) : <span className="text-xs text-muted-foreground">{i.busExtras?.length ? "ค่ารถเพิ่ม" : "ค่าอื่นๆ"}</span>}{i.status === "paid" && subjects.length > 0 && <span className="text-[11px] text-emerald-700">✓ เข้าคลาสแล้ว</span>}</span> } },
    { id: "date", label: "วันที่", cell: (i) => fmtDate(i.createdAt.slice(0, 10), { year: true }) },
    { id: "total", label: "ยอด", align: "right", className: "tabular-nums", cell: (i) => fmtMoney(invoiceTotals(i, { branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays }).total) },
    { id: "status", label: "สถานะ", align: "right", cell: (i) => <Pill tone={i.status === "paid" ? "green" : i.status === "void" ? "gray" : i.status === "draft" ? "gray" : "amber"}>{INVOICE_STATUS_LABEL[i.status]}</Pill> },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">กดแถวเพื่อเปิดใบแจ้งหนี้ · จ่ายครบแล้วระบบเพิ่มเข้าคลาสให้อัตโนมัติ</p>
        {can(me, "billing.manage") && <Button size="sm" variant="outline" className="ml-auto" onClick={() => setInvoice("new")}><PlusIcon /> ใบแจ้งหนี้ใหม่</Button>}
        <ColumnsMenu id="student-invoices" columns={invoiceCols} />
      </div>
      <DataTable id="student-invoices" columns={invoiceCols} rows={invoices} rowKey={(i) => i.id} onRowClick={(i) => setInvoice(i.id)} minWidth={520} empty="ยังไม่มีใบแจ้งหนี้" />
      <BusAddOns stu={stu} />
      <InvoiceSheet id={invoice} defaultStudentId={stu.id} onClose={() => setInvoice(null)} />
    </div>
  )
}

// ---------------------------------------------------------------- Note

function NoteSeg({ stu }: { stu: Student }) {
  const notes = useStore((s) => s.notes).filter((n) => n.studentId === stu.id).sort((a, b) => a.at.localeCompare(b.at))
  const staff = useStore((s) => s.staff)
  const userId = useStore((s) => s.userId)
  const add = useStore((s) => s.addStudentNote)
  const sessions = useStore((s) => s.sessions)
  const calendarNotes = useStore((s) => s.calendarNotes)
  const me = useStore((s) => s.me())
  const now = useNow()
  const [text, setText] = useState("")
  const send = () => { if (report(add(stu.id, text), "บันทึกโน้ตแล้ว")) setText("") }
  // owner 2026-10-29: the Note Calendar of this student too — managed the same way as on the calendar.
  // One group per session: a session's own notes, a class's pinned notes on its next session, and the next session of
  // each class the student is in (so a note can be added for the coming class).
  const mineSessions = sessions.filter((x) => x.studentIds.includes(stu.id) && !x.cancelled)
  const nextOf = (classId: ID) => mineSessions.filter((x) => x.classId === classId && sessionState(x, now) === "upcoming").sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
    ?? mineSessions.filter((x) => x.classId === classId).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))[0]
  const noteSessionIds = new Set<ID>()
  for (const n of calendarNotes.filter((x) => x.studentId === stu.id)) {
    const se = n.sessionId ? sessions.find((x) => x.id === n.sessionId) : n.classId ? nextOf(n.classId) : undefined
    if (se) noteSessionIds.add(se.id)
  }
  for (const classId of new Set(mineSessions.map((x) => x.classId).filter((x): x is ID => !!x))) { const se = nextOf(classId); if (se && sessionState(se, now) === "upcoming") noteSessionIds.add(se.id) }
  const noteSessions = [...noteSessionIds].map((id) => sessions.find((x) => x.id === id)!).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const canNote = (se: Session) => can(me, "session.manage") || se.teacherId === me.id || se.coTeacherIds.includes(me.id)
  return (
    <div className="flex h-full flex-col">
      {noteSessions.length > 0 && (
        <section className="mb-4 space-y-2">
          <h3 className="flex items-center gap-1 text-sm font-semibold">Note ในปฏิทิน <InfoTip text="Note ที่แสดงบนการ์ดคาบในปฏิทิน — 📌 = ถาวร (ทุกคาบของคลาส) · เพิ่ม / แก้ / ลบ ได้ที่นี่เหมือนในปฏิทิน" /></h3>
          <ul className="divide-y rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
            {noteSessions.map((se) => (
              <li key={se.id} className="flex gap-3 px-4 py-2.5">
                <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{fmtDate(se.date, { weekday: true })} {se.start}<br />{subjectsOf(se).join(" + ")}</span>
                <div className="min-w-0 flex-1"><CalendarNotes s={se} studentId={stu.id} canEdit={canNote(se)} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}
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
                {/* written on a class in the calendar board (owner 2026-10-12) */}
                {n.sessionId && (() => { const se = sessions.find((x) => x.id === n.sessionId); return se ? <p className="mt-1 text-[11px] text-muted-foreground">จากคาบ {se.subject} · {fmtDate(se.date)} {se.start}</p> : null })()}
              </div>
            </div>
          )
        })}
      </div>
      <p className="my-2 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MessageSquareIcon className="size-3.5" /> ข้อมูลภายในเท่านั้น — ผู้ปกครองไม่เห็น</p>
      {/* owner 2026-10-29: the same type bar as the Inbox */}
      <div className="flex items-center gap-1.5 rounded-3xl border bg-background p-1.5 shadow-sm transition-colors focus-within:border-ring/60">
        <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์โน้ต…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
          className={cn("max-h-40 min-h-9 flex-1", text ? "field-sizing-content" : "h-9 overflow-hidden whitespace-nowrap", "resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground")} />
        <Button size="icon" className="rounded-full" disabled={!text.trim()} aria-label="บันทึกโน้ต" onClick={send}><ArrowUpIcon /></Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Timeline

const CAT_LABEL: Record<LogCategory, string> = { profile: "ข้อมูลนักเรียน", class: "คลาส", attendance: "เช็คชื่อ/สรุป", billing: "การเงิน", note: "โน้ต" }

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
  const logCols: Column<ActivityLog>[] = [
    { id: "at", label: "วันที่", required: true, className: "tabular-nums", cell: (l) => fmtDateTime(l.at) },
    { id: "type", label: "ประเภท", cell: (l) => CAT_LABEL[l.category] },
    { id: "by", label: "ทำโดย", cell: (l) => staff.find((x) => x.id === l.by)?.nickname ?? <span className="text-muted-foreground">ระบบ</span> },
    { id: "event", label: "เหตุการณ์", className: "min-w-64 whitespace-normal!", cell: (l) => <><span className="font-medium">{l.action}</span> <span className="text-muted-foreground">{l.detail}</span></> },
  ]
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
        <ColumnsMenu id="student-timeline" columns={logCols} />
      </div>
      <DataTable id="student-timeline" columns={logCols} rows={pg.rows} rowKey={(l) => l.id} minWidth={520} empty="ยังไม่มีประวัติ" />
      <Pager {...pg} unit="รายการ" />
    </div>
  )
}

