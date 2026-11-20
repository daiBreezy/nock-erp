"use client"

import * as People from "@/domain/rules/people"
import { tagChip } from "@/components/app/tags"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { CloseExitDialog, ExitPanel, ExitRequestDialog } from "./student-exit"
import { FamilySheet } from "./family-sheet"
import { StudentFacts } from "./student-facts"
import { BusAddOns } from "@/components/billing/bus-addons"
import Link from "next/link"
import { useMemo, useState } from "react"
import { ArchiveRestoreIcon, DoorOpenIcon, CalendarIcon, GraduationCapIcon, MessageSquareIcon, MessagesSquareIcon, PencilIcon, PhoneIcon, PlaneIcon, PlusIcon, ReceiptIcon, CreditCardIcon, ClipboardListIcon, UsersIcon, ChevronRightIcon, ChevronLeftIcon, ChevronDownIcon, UsersRoundIcon, HistoryIcon, ArrowUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { startFamilySet } from "@/lib/family-set"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EntityPanel, PanelFooter, PanelForm, PanelMore } from "./form-shell"
import { Segmented, Tabs, SearchBox } from "./page-layout"
import { daysBetween, endTime, fmtDate, fmtDateTime, fmtMoney, fmtMonth, TH_DAYS_FULL, toDateStr, weekdayShort } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import * as Bill from "@/domain/rules/billing"
import { INVOICE_STATUS_LABEL, invoiceTotals } from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import { removedWithClass, sessionState, subjectsOf } from "@/domain/rules/scheduling"
import type { ActivityLog, Entitlement, ID, Invoice, LogCategory, Session, Student, StudentLeave, Assessment } from "@/domain/types"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
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
import * as Seats from "@/domain/rules/seats"
import { RescheduleDialog, StudentSessionMenu } from "./session-sheet"
import { CalendarClockIcon } from "lucide-react"
import { AssessmentNote } from "./assessment-note"
import { LeaveDialog } from "./leave-dialog"
import { PackageBadge } from "./package-badge"
import { RenewalFollowUpSection } from "./renewal-followup"
import { StudentForm } from "./student-form"
import { AddToClassDialog } from "./add-to-class-dialog"
import { stateDetail, STATUS_PILL } from "./student-status"
import { avatarTone, gradeTone, initial, subjectColor } from "./subject-color"
import { InfoTip } from "./info-tip"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty } from "@/components/app/empty"
import { CreditTag } from "./credit-tag"
import { CreditCourseDialog } from "@/components/billing/credit-course-dialog"
import { creditCourseOn, creditAgeDays, creditOwedTotal, creditsOwed, creditState, CREDIT_REMIND_DAYS, invoiceOfCredit } from "@/domain/rules/credit"

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
export function StudentSheet({ studentId, familyId, onClose, back }: { studentId: ID | "new" | null; familyId?: ID; onClose: () => void; /** owner 2026-11-20: opened from another panel (e.g. the family) → a Back button that returns there */ back?: { label: string; onBack: () => void } }) {
  return (
    <EntityPanel open={!!studentId} onClose={onClose} wide>
      <StudentPanelContent studentId={studentId} familyId={familyId} onClose={onClose} back={back} />
    </EntityPanel>
  )
}

/**
 * The student's panel CONTENT without its own sheet — so another panel (the family) can swap to it IN PLACE instead of stacking a second sheet on top
 * (owner 2026-11-20). A brother / sister chip switches this same panel to them — the jump forgets itself when the panel is opened for someone else.
 */
export function StudentPanelContent({ studentId, familyId, onClose, back }: { studentId: ID | "new" | null; familyId?: ID; onClose: () => void; back?: { label: string; onBack: () => void } }) {
  const [jump, setJump] = useState<{ from: ID | "new" | null; to: ID } | null>(null)
  const shown = jump && jump.from === studentId ? jump.to : studentId
  return shown ? <Panel key={shown} studentId={shown} familyId={familyId} onClose={onClose} back={back} onOpenStudent={(id) => setJump({ from: studentId, to: id })} /> : null
}

function Panel({ studentId, familyId, onClose, back, onOpenStudent }: { studentId: ID | "new"; familyId?: ID; onClose: () => void; back?: { label: string; onBack: () => void }; onOpenStudent: (id: ID) => void }) {
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
      ) : id ? <Body id={id} onEdit={() => setEditing(true)} invoiceOnOpen={isNew && !!createdId} back={back} onOpenStudent={onOpenStudent} /> : null
}

function Body({ id, onEdit, invoiceOnOpen, back, onOpenStudent }: { id: ID; onEdit: () => void; invoiceOnOpen?: boolean; back?: { label: string; onBack: () => void }; onOpenStudent: (id: ID) => void }) {
  const stu = useStore((s) => s.students.find((x) => x.id === id))
  const fam = useStore((s) => s.families.find((f) => f.id === stu?.familyId))
  const convs = useStore((s) => s.conversations)
  const stuFamily = useStore((s) => s.families.find((f) => f.id === stu?.familyId))
  // owner 2026-11-20: Inbox talks to ONE person — the chat button opens the main contact's chat (else any chat of the family)
  const mainAccount = stuFamily ? People.mainLineAccount(stuFamily) : undefined
  const conv = convs.find((c) => c.familyId === stu?.familyId && !!mainAccount && c.id === `line_${mainAccount}`) ?? convs.find((c) => c.familyId && c.familyId === stu?.familyId)
  const leaves = useStore((s) => s.leaves)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const me = useStore((s) => s.me())
  const ents = useEntitlements()
  const today = toDateStr(useNow())
  const [seg, setSeg] = useState<Seg>("overview")
  // owner 2026-10-16: the invoice opens as a panel right here — no jump to Billing
  // sheet row 58 (Dear, 8 Nov): a student just created goes straight to a new invoice for them (if this person may bill)
  const [invoice, setInvoice] = useState<ID | "new" | null>(invoiceOnOpen && can(me, "billing.manage") ? "new" : null)
  const [classSub, setClassSub] = useState<ClassSub>("session")
  const [leaveDialog, setLeaveDialog] = useState<{ leave?: StudentLeave } | null>(null)
  const canLeave = can(me, "attendance.leave_override")
  const [archiving, setArchiving] = useState(false)
  const [closingNow, setClosingNow] = useState(false)
  const restore = useStore((s) => s.restoreStudent)
  const invoices = useStore((s) => s.invoices)
  const [creditAdd, setCreditAdd] = useState(false)
  const [familyOpen, setFamilyOpen] = useState(false)
  const siblings = useStore((st) => st.students).filter((x) => stu?.familyId && x.familyId === stu.familyId && x.id !== stu.id && x.branchId === stu.branchId && !x.archived && x.exit?.status !== "closed")
  const creditOn = useStore((s) => creditCourseOn(s.system.settings))
  if (!stu) return null
  // Credit Course (owner 2026-11-19): studying now, the invoice is still to come
  const owed = creditsOwed(stu.id, ents, invoices)

  const state = Att.studentState(stu, ents, leaves, today, renewalDays)
  const primary = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]

  return (
    <>
      <SheetHeader className="shrink-0 gap-3 border-b pb-0">
        <div className="flex items-center gap-3 pr-8">
          {/* owner 2026-11-20: Back sits in front of the thumb — no extra row of its own; the name of where it goes is its tooltip */}
          {back && <Button variant="ghost" size="icon" className="-ml-2 shrink-0 text-muted-foreground" aria-label={`ย้อนกลับ · ${back.label}`} title={`ย้อนกลับ · ${back.label}`} onClick={back.onBack}><ChevronLeftIcon /></Button>}
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(stu.id))}>{initial(stu.nickname)}</span>
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">{stu.nickname} <span className="font-normal text-muted-foreground">{stu.name}</span></SheetTitle>
            <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
              {/* owner 2026-11-20: like the Inbox chat header — the type is a quiet grey word in the line under the name, not a pill */}
              <span className="inline-flex items-center gap-1"><GraduationCapIcon className="size-3" /> Student</span>
              <span aria-hidden>·</span>
              {stu.grade && <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", gradeTone(stu.grade))}>{stu.grade}</span>}
              <Pill tone={STATUS_PILL[state.status].tone}>{STATUS_PILL[state.status].label}</Pill>
              {owed.length > 0 && <CreditTag />}
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
        {seg === "overview" && owed.length > 0 && <CreditPanel stu={stu} owed={owed} today={today} onInvoice={(id) => setInvoice(id ?? "new")} />}
        {seg === "overview" && <Overview stu={stu} ents={ents} today={today} status={state.status} onNotRenewing={() => setArchiving(true)} onHistory={() => { setClassSub("history"); setSeg("class") }} onEditLeave={(leave) => setLeaveDialog({ leave })} onOpenInvoice={(id) => setInvoice(id)} onFamily={() => (back ? back.onBack() : setFamilyOpen(true))} onOpenStudent={onOpenStudent} />}
        {seg === "class" && <ClassSeg kids={[stu]} ents={ents} sub={classSub} setSub={setClassSub} />}
        {seg === "billing" && <BillingSeg stu={stu} />}
        {seg === "note" && <NoteSeg stu={stu} />}
        {seg === "timeline" && <TimelineSeg stu={stu} />}
      </div>

      {/* Header · Body · Bottom — CTAs live here: destructive left, primary right (owner 2026-10-09) */}
      {seg !== "note" && (
        <PanelFooter>
          {/* owner 2026-10-12: the less-used actions sit behind ⋯ — แจ้งออก · ลาพักยาว */}
          <PanelMore items={[
            can(me, "student.manage") && { label: "แก้ไข", icon: PencilIcon, onClick: onEdit },
            can(me, "student.manage") && stu.archived && { label: "กลับมาเรียน", icon: ArchiveRestoreIcon, onClick: () => report(restore(stu.id), "กลับมาเรียนแล้ว") },
            canLeave && { label: "ลาพักยาว", icon: PlaneIcon, onClick: () => setLeaveDialog({}) },
            can(me, "student.manage") && !stu.archived && !stu.exit && { label: "แจ้งออก", icon: DoorOpenIcon, destructive: true, onClick: () => setArchiving(true) },
          ]} />
          {conv ? (
            <Button size="icon" variant="outline" className="ml-auto rounded-full" aria-label="แชท LINE กับผู้ปกครอง" title="เปิดแชท LINE กับผู้ปกครองใน Inbox" nativeButton={false} render={<Link href={`/inbox?conversation=${conv.id}`} />}><MessagesSquareIcon /></Button>
          ) : (
            <Button size="icon" variant="outline" className="ml-auto rounded-full" disabled aria-label="ยังไม่มีแชท" title="ครอบครัวนี้ยังไม่มีแชท LINE ใน Inbox"><MessagesSquareIcon /></Button>
          )}
          {can(me, "billing.manage") && creditOn && <Button variant="outline" onClick={() => setCreditAdd(true)}><CreditCardIcon /> เพิ่มคอร์ส (Credit)</Button>}
          {/* owner 2026-11-20: same as the Family panel — outline, and with brothers / sisters a menu: this child or the whole family */}
          {can(me, "billing.manage") && (siblings.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}><ReceiptIcon /> ออกใบแจ้งหนี้ <ChevronDownIcon /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuItem onClick={() => setInvoice("new")}>{stu.nickname} · {stu.grade}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { const r = startFamilySet({ familyId: stu.familyId! }); if (report(r, "สร้างชุดครอบครัวแล้ว — เติมคอร์สให้ลูกแต่ละคน")) setInvoice(r.value.firstId) }}><UsersRoundIcon /> ทั้งครอบครัว ({siblings.length + 1} คน)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : <Button variant="outline" onClick={() => setInvoice("new")}><ReceiptIcon /> ออกใบแจ้งหนี้</Button>)}
        </PanelFooter>
      )}
      <InvoiceSheet id={invoice} defaultStudentId={stu.id} onClose={() => setInvoice(null)} />
      {familyOpen && stu.familyId && <FamilySheet id={stu.familyId} onClose={() => setFamilyOpen(false)} initialTab="overview" />}
      {creditAdd && <CreditCourseDialog studentId={stu.id} onClose={() => setCreditAdd(false)} />}
      {archiving && <ExitRequestDialog stu={stu} onClose={() => setArchiving(false)} onCloseNow={() => { setArchiving(false); setClosingNow(true) }} />}
      {closingNow && <CloseExitDialog stu={stu} response={null} onClose={() => setClosingNow(false)} />}
      {leaveDialog && <LeaveDialog studentId={stu.id} leave={leaveDialog.leave} onClose={() => setLeaveDialog(null)} />}
    </>
  )
}

/** the student's invoices that still have a step to do (owner 2026-11-19) — only for people who may see billing */
function usePendingInvoices(studentId: ID) {
  const me = useStore((s) => s.me())
  const invoices = useStore((s) => s.invoices)
  if (!can(me, "billing.view")) return []
  return invoices.filter((i) => i.studentId === studentId).map((inv) => ({ inv, next: Bill.invoiceNextStep(inv) })).filter((x): x is { inv: Invoice; next: NonNullable<ReturnType<typeof Bill.invoiceNextStep>> } => !!x.next)
    .sort((a, b) => b.inv.createdAt.localeCompare(a.inv.createdAt))
}

/** Invoices waiting on someone: where each stands and what to do next, with a button into the invoice — so a student who has not
 *  started yet (no course running) still shows the next step, and the office can carry on the moment the parent pays */
function PendingInvoices({ stu, onOpen }: { stu: Student; onOpen: (id: ID) => void }) {
  const list = usePendingInvoices(stu.id)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  if (!list.length) return null
  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">ใบแจ้งหนี้ที่รอดำเนินการ</p>
      <ul className="space-y-2">
        {list.map(({ inv, next }) => {
          const branch = branches.find((b) => b.id === inv.branchId)
          const total = branch ? Bill.invoiceTotals(inv, { branch, courses, classes, holidays }).total : 0
          const names = inv.lines.map((l) => courses.find((c) => c.id === l.courseId)?.name).filter(Boolean).join(", ")
          return (
            <li key={inv.id} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium"><span className="font-mono text-xs text-muted-foreground">{inv.number ?? "ร่าง"}</span><Pill tone={next.tone}>{next.stage}</Pill></p>
                {names && <p className="truncate text-xs text-muted-foreground">{names}</p>}
                <p className="text-sm">ต้องทำต่อ: <span className="font-medium">{next.todo}</span></p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{fmtMoney(total)}</p>
                <Button size="xs" variant="outline" className="mt-1" onClick={() => onOpen(inv.id)}><ReceiptIcon /> เปิดใบ</Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Credit Course card (owner 2026-11-19): what the student studies on credit — amount, how long, where the invoice is */
function CreditPanel({ stu, owed, today, onInvoice }: { stu: Student; owed: Entitlement[]; today: string; onInvoice: (invoiceId?: ID) => void }) {
  const me = useStore((s) => s.me())
  const courses = useStore((s) => s.courses)
  const invoices = useStore((s) => s.invoices)
  const staff = useStore((s) => s.staff)
  return (
    <section className="mb-4 space-y-2 rounded-2xl border bg-card p-3 shadow-sm" aria-label="Credit Course">
      <div className="flex flex-wrap items-center gap-2">
        <CreditTag />
        <span className="text-sm font-semibold">{stu.nickname} เรียนก่อนจ่าย · ค้าง {fmtMoney(creditOwedTotal(owed))}</span>
        <InfoTip text="คอร์สที่เพิ่มให้เรียนไปก่อนโดยยังไม่ออกใบแจ้งหนี้/ยังไม่ชำระ — แท็บนี้หายเองเมื่อใบแจ้งหนี้ของคอร์สนี้ชำระครบ" />
        {can(me, "billing.manage") && owed.some((e) => creditState(e, invoices) === "open") && <Button size="xs" variant="outline" className="ml-auto" onClick={() => onInvoice()}><ReceiptIcon /> ออกใบแจ้งหนี้จาก Credit</Button>}
      </div>
      <ul className="divide-y divide-border">
        {owed.map((e) => {
          const on = invoiceOfCredit(e, invoices)
          const age = creditAgeDays(e, today)
          const by = staff.find((x) => x.id === e.credit!.by)
          return (
            <li key={e.id} className="space-y-0.5 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">{courses.find((c) => c.id === e.courseId)?.name ?? "คอร์ส"}</span>
                <span className="tabular-nums font-semibold">{fmtMoney(e.credit!.amount)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                เรียน {fmtDate(e.from)} – {fmtDate(e.to, { year: true })} · เพิ่มเมื่อ {fmtDate(e.credit!.at.slice(0, 10))}{by ? ` โดย ${by.nickname ?? by.name}` : ""} · ค้างมา {age} วัน
              </p>
              <p className="text-xs text-muted-foreground">เหตุผล: {e.credit!.reason}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs">
                {on ? (on.status === "draft" ? <Pill tone="gray">มีใบร่าง {on.number ?? ""}</Pill> : <Pill tone="amber">อยู่ในใบ {on.number ?? ""} · รอชำระ</Pill>) : <Pill tone="gray">ยังไม่ได้ออกใบแจ้งหนี้</Pill>}
                {age >= CREDIT_REMIND_DAYS && <Pill tone="red">ค้างเกิน {CREDIT_REMIND_DAYS} วัน</Pill>}
                {on && can(me, "billing.view") && <Button size="xs" variant="outline" className="ml-auto" onClick={() => onInvoice(on.id)}><ReceiptIcon /> เปิดใบ</Button>}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
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
const sessions = useStore((s) => s.sessions)
const attendance = useStore((s) => s.attendance)
const rawTo = useStore((s) => s.entitlements.find((x) => x.id === e.id)?.to)
  const c = courses.find((x) => x.id === e.courseId)
  const p = packageProgress(e, sessions, attendance, today)
  const expired = e.to < today
  const renewal = !expired && p.low
  const extended = rawTo !== undefined && rawTo !== e.to
  return (
    <li className={cn("py-2.5", expired && "opacity-50")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold", subjectColor(c?.subjects[0] ?? "").chip)}>{(c?.subjects[0] ?? "?").slice(0, 2)}</span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-medium"><span className="truncate">{c?.name ?? "คอร์ส"}</span>{e.credit && !e.invoiceId && <CreditTag className="shrink-0" />}</p>
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <CalendarIcon className="size-3" /> {fmtDate(e.from)} → {fmtDate(e.to, { year: true })}
            <span className="tabular-nums">· {p.label}</span>
            {extended && <Pill tone="special" title={`เดิมจบ ${fmtDate(rawTo!, { year: true })}`}>เลื่อนวันจบจากการลา</Pill>}
          </p>
        </div>
        {/* owner 2026-11-05: no progress bar; slots badge · ต่ออายุ · status — status is always last and hugs its text */}
        <span className="flex w-12 shrink-0 justify-end">{c && <PackageBadge course={c} size="md" />}</span>
        <span className="flex w-16 shrink-0 justify-center">{(renewal || expired) && can(me, "billing.manage") && <Button size="xs" variant="outline" onClick={() => setRenewing(true)}>ต่ออายุ</Button>}</span>
        {renewing && <InvoiceSheet id="new" defaultStudentId={stu.id} renewEntitlementId={e.id} onClose={() => setRenewing(false)} />}
        <span className="flex shrink-0 justify-end"><Pill tone={expired ? "gray" : renewal ? "amber" : "green"}>{expired ? "หมดแล้ว" : renewal ? "Renewal" : "Enroll"}</Pill></span>
      </div>
      {/* owner 2026-11-04: list the classes the student attends for this course — each day/time with a ย้ายวัน/คาบ button */}
      {!expired && <ClassTransferList e={e} stu={stu} today={today} />}
    </li>
  )
}

/** The classes a student attends under one course, with a per-class "move day / sessions" action (owner 2026-11-04). */
function ClassTransferList({ e, stu, today }: { e: Entitlement; stu: Student; today: string }) {
  const classes = useStore((s) => s.classes)
  const sessions = useStore((s) => s.sessions)
  const me = useStore((s) => s.me())
  const now = useNow(60_000)
  const [moveFrom, setMoveFrom] = useState<Session | null>(null)
  const canMove = can(me, "student.move") && (can(me, "session.manage") || me.roles.includes("teacher"))
  // a class counts if the student has an upcoming session in it under this package (so a finished day drops off)
  const rows = e.classIds.map((cid) => {
    const k = classes.find((x) => x.id === cid)
    if (!k) return null
    const next = sessions.filter((x) => x.classId === cid && x.studentIds.includes(stu.id) && x.date >= today && !x.cancelled && sessionState(x, now) === "upcoming")
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
    const ahead = sessions.filter((x) => x.classId === cid && x.studentIds.includes(stu.id) && x.date >= today && !x.cancelled && sessionState(x, now) === "upcoming").length
    return next ? { k, next, ahead } : null
  }).filter((x): x is { k: NonNullable<ReturnType<typeof classes.find>>; next: Session; ahead: number } => !!x)
  if (rows.length === 0) return null
  return (
    <ul className="mt-2 space-y-1 pl-14">
      {rows.map(({ k, next, ahead }) => (
        <li key={k.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-1.5 text-xs">
          <span className="min-w-0 flex-1 truncate"><span className="font-medium">{k.name}</span> <span className="text-muted-foreground">· ทุก{TH_DAYS_FULL[k.weekday]} {k.start}–{endTime(k.start, k.minutes)} · {`เหลือ ${ahead} คาบ`}</span></span>
          {canMove && <Button variant="ghost" size="inline" type="button" onClick={() => setMoveFrom(next)} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-medium text-primary hover:bg-primary/10"><CalendarClockIcon className="size-3.5" /> ย้ายวัน/คาบ</Button>}
        </li>
      ))}
      {moveFrom && <RescheduleDialog from={moveFrom} studentId={stu.id} initialMode="always" onClose={() => setMoveFrom(null)} />}
    </ul>
  )
}

function Overview({ stu, ents, today, status, onNotRenewing, onHistory, onEditLeave, onOpenInvoice, onFamily, onOpenStudent }: { onOpenInvoice: (id: ID) => void; onFamily: () => void; onOpenStudent: (id: ID) => void; stu: Student; ents: Entitlement[]; today: string; status: Att.StudentStatus; onNotRenewing: () => void; onHistory: () => void; onEditLeave: (l: StudentLeave) => void }) {
  const me = useStore((s) => s.me())
  const leaves = useStore((s) => s.leaves)
  const myAssessments = useStore((s) => s.assessments).filter((a) => a.studentId === stu.id).sort((a, b) => a.date.localeCompare(b.date))
  const fam = useStore((s) => s.families.find((f) => f.id === stu.familyId))
  const mine = ents.filter((e) => e.studentId === stu.id).sort((a, b) => b.to.localeCompare(a.to))
  const current = mine.filter((e) => e.to >= today)
  const pastCount = mine.length - current.length
  const myLeaves = leaves.filter((l) => l.studentId === stu.id).sort((a, b) => b.from.localeCompare(a.from))
  const hasPending = usePendingInvoices(stu.id).length > 0
  const siblings = useStore((st) => st.students).filter((x) => stu.familyId && x.familyId === stu.familyId && x.id !== stu.id).sort((a, b) => a.nickname.localeCompare(b.nickname, "th"))

  return (
    <div className="space-y-4">
      {/* owner 2026-11-20: plain information like the family's — the thumb and the name live in the Header; here: family · brothers & sisters, then the facts, then the courses */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
          <UsersIcon className="size-3.5 text-muted-foreground/60" />
          {fam ? <Button variant="link" size="inline" type="button" onClick={onFamily} className="h-auto p-0 text-xs">{fam.name}</Button> : <span className="text-warning">ยังไม่ผูกครอบครัว</span>}
          {siblings.length > 0 && <>
            <span aria-hidden>·</span>พี่น้อง
            {siblings.map((x) => (
              <Button key={x.id} variant="ghost" size="inline" type="button" onClick={() => onOpenStudent(x.id)} className={cn("gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted/70", x.archived && "opacity-60")}>
                {x.nickname}<span className={cn("rounded px-1 text-2xs", gradeTone(x.grade))}>{x.grade}</span>
              </Button>
            ))}
          </>}
        </div>
        <StudentFacts student={stu} />
      </section>

      <section className="border-t pt-1">
        <p className="pt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">คอร์สที่ลงเรียน</p>
        {/* owner 2026-10-12: only packages still running here — finished ones live in คลาส › ประวัติคอร์ส */}
        {current.length === 0 && !hasPending && <p className="py-3 text-sm text-muted-foreground">ไม่มีคอร์สที่ใช้อยู่</p>}
        <ul className="divide-y">{current.map((e) => <PackageRow key={e.id} e={e} stu={stu} today={today} />)}</ul>
        <PendingInvoices stu={stu} onOpen={onOpenInvoice} />
        {pastCount > 0 && (
          <Button variant="ghost" size="inline" type="button" onClick={onHistory} className="mt-1 flex w-full items-center gap-1 border-t pt-2.5 text-xs text-muted-foreground hover:text-foreground">
            <HistoryIcon className="size-3.5" />ประวัติคอร์สที่หมดแล้ว {pastCount} รายการ<ChevronRightIcon className="ml-auto size-3.5" />
          </Button>
        )}
      </section>

      {status === "renewal" && <RenewalFollowUpSection stu={stu} canManage={can(me, "student.manage")} onNotRenewing={onNotRenewing} />}

      {myAssessments.length > 0 && <PastAssessments items={myAssessments} editable={can(me, "session.manage")} />}
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
                {l.from <= today && today <= l.to && <Pill tone="special">กำลังลา</Pill>}
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

/** owner 2026-11-20: the test / trial from before they enrolled is history, not news — one quiet line, folded until opened */
function PastAssessments({ items, editable }: { items: Assessment[]; editable: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="px-1">
      <Button variant="ghost" size="inline" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 py-1 text-left text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent">
        <ClipboardListIcon className="size-3.5" />{tx("ประวัติก่อนสมัคร · สอบ / ทดลองเรียน {0} ครั้ง", [items.length])}
        <ChevronDownIcon className={cn("ml-auto size-3.5 transition-transform", open && "rotate-180")} />
      </Button>
      {open && <div className="mt-1.5 space-y-1.5">{items.map((a) => <AssessmentNote key={a.id} a={a} editable={editable} compact showWhen />)}</div>}
    </section>
  )
}

// ---------------------------------------------------------------- Class (Session | Attendance)

type ClassSub = "session" | "history"
/** owner 2026-11-20: the Class tab for ONE child or SEVERAL (the family panel): one table with a student column, own sub-tab state */
export function StudentClassTab({ kids, filter }: { kids: Student[]; /** the family panel's child dropdown — placed after the sub-tabs */ filter?: React.ReactNode }) {
  const ents = useEntitlements()
  const [sub, setSub] = useState<ClassSub>("session")
  return <ClassSeg kids={kids} ents={ents} sub={sub} setSub={setSub} filter={filter} />
}

function ClassSeg({ kids, ents, sub, setSub, filter }: { kids: Student[]; ents: Entitlement[]; sub: ClassSub; setSub: (s: ClassSub) => void; filter?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {/* owner 2026-11-20: the panel's own tabs are the underline Tabs, so the view switch inside is a Segmented control (grey box) — and the family's child dropdown follows it */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={sub} onChange={setSub} options={[{ value: "session", label: "คาบเรียน" }, { value: "history", label: "ประวัติคอร์ส" }]} />
        {filter}
      </div>
      {sub === "session" ? <SessionList kids={kids} ents={ents} /> : <CourseHistory kids={kids} ents={ents} />}
    </div>
  )
}

/** owner 2026-10-12: packages that have ended — kept as history here, not on the overview */
function CourseHistory({ kids, ents }: { kids: Student[]; ents: Entitlement[] }) {
  const today = toDateStr(useNow())
  const past = ents.filter((e) => kids.some((k) => k.id === e.studentId) && e.to < today).sort((a, b) => b.to.localeCompare(a.to))
  if (!past.length) return <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีคอร์สที่หมดแล้ว</p>
  if (kids.length === 1) return <ul className="divide-y">{past.map((e) => <PackageRow key={e.id} e={e} stu={kids[0]} today={today} />)}</ul>
  // several children: one block per child, and inside it a small month heading between the packages (by the month each ended)
  return (
    <div className="space-y-5">
      {kids.map((k) => {
        const mine = past.filter((e) => e.studentId === k.id)
        if (!mine.length) return null
        const months = new Map<string, Entitlement[]>()
        for (const e of mine) months.set(e.to.slice(0, 7), [...(months.get(e.to.slice(0, 7)) ?? []), e])
        return (
          <section key={k.id} className="space-y-2">
            <h3 className="text-sm font-semibold">{k.nickname} <span className="font-normal text-muted-foreground">· {k.grade}</span></h3>
            {[...months.entries()].map(([m, list]) => (
              <div key={m}>
                <p className="px-1 text-xs font-semibold text-muted-foreground">{fmtMonth(`${m}-01`)}</p>
                <ul className="divide-y">{list.map((e) => <PackageRow key={e.id} e={e} stu={k} today={today} />)}</ul>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

const ATT_LABEL = { present: "มา", absent: "ขาด", leave: "ลา" } as const
const ATT_TONE = { present: "green", absent: "red", leave: "amber" } as const

/**
 * คาบเรียน + การเข้าเรียน in one list (owner 2026-10-29): every session past and upcoming with its check-in, filter by
 * subject, and ⋯ on each row to re-schedule / leave / open it right here. Pickup / drop-off only for bus students.
 */
function SessionList({ kids, ents }: { kids: Student[]; ents: Entitlement[] }) {
  const many = kids.length > 1
  const stu = kids[0]
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const attendance = useStore((s) => s.attendance)
  const invoices = useStore((s) => s.invoices)
  const staff = useStore((s) => s.staff)
  const leaves = useStore((s) => s.leaves)
  const courses = useStore((s) => s.courses)
  const now = useNow()
  const today = toDateStr(now)
  const me = useStore((s) => s.me())
  const [subject, setSubject] = useState("")
  const [adding, setAdding] = useState(false)
  const busAddOns = useStore((s) => s.busAddOns)
  // paid legs + extra rides − rides the parent cancelled (same as the bus plan)
  const legsBy = useMemo(() => new Map(kids.map((k) => [k.id, busDaysOf(k.id, invoices, busAddOns)])), [invoices, busAddOns, kids])
  // owner Row 44/49 (2026-10-28): EVERY session — past and upcoming — so parents can be told the full schedule
  const all = sessions
    .filter((s) => kids.some((k) => s.studentIds.includes(k.id) || attendance.some((a) => a.sessionId === s.id && a.studentId === k.id)))
    .filter((s) => !removedWithClass(s, classes))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const subjects = [...new Set(all.flatMap(subjectsOf))]
  const mineSessions = subject ? all.filter((s) => subjectsOf(s).includes(subject)) : all
  // one row per (session, child) — a session two brothers share shows twice, once each, so each row has its own check-in and ⋯
  type Row = { s: Session; k: Student }
  const mine: Row[] = mineSessions.flatMap((s) => kids.filter((k) => s.studentIds.includes(k.id) || attendance.some((a) => a.sessionId === s.id && a.studentId === k.id)).map((k) => ({ s, k })))
  const active = mine.filter((r) => !r.s.cancelled)
  const done = active.filter((r) => r.s.date < today).length
  const canBus = can(useStore((s) => s.me()), "billing.manage")
  const att = (s: Session, k: Student) => attendance.find((a) => a.sessionId === s.id && a.studentId === k.id)
  // this student's status in the session — one short pill (the class-wide check-in count belongs to the session, not here)
  const studentSessionStatus = (s: Session, k: Student): { label: string; tone: "green" | "red" | "amber" | "blue" | "gray" } => {
    const a = att(s, k)
    if (a) return { label: ATT_LABEL[a.status], tone: ATT_TONE[a.status] }
    const st = sessionState(s, now)
    return st === "cancelled" ? { label: "ยกเลิก", tone: "gray" } : st === "upcoming" ? { label: "รอเริ่ม", tone: "gray" } : st === "live" ? { label: "กำลังเรียน", tone: "blue" } : { label: "ยังไม่เช็คชื่อ", tone: "amber" }
  }

  // owner 2026-10-29: day and date in their own columns · time on top, minutes below · bus = one P / D / B tag,
  // hidden until the admin turns it on (and editable here) · status on the right · ⋯ only on row hover.
  // "1%" = shrink to content, so the spare width goes to the subject column instead of spreading everywhere.
  const columns: Column<Row>[] = [
    ...(many ? [{ id: "student", label: "นักเรียน", width: "1%", cell: (r: Row) => <span className="font-medium">{r.k.nickname}</span> } as Column<Row>] : []),
    { id: "day", label: "วัน", width: "1%", cell: ({ s }) => <span className={cn(s.date === today && "font-medium text-primary")}>{weekdayShort(new Date(`${s.date}T00:00:00`).getDay())}</span> },
    { id: "date", label: "วันที่", required: true, width: "1%", cell: ({ s }) => <span className={cn(s.date === today && "font-medium text-primary")}>{fmtDate(s.date, { year: true })}</span> },
    { id: "time", label: "เวลา", width: "1%", cell: ({ s, k }) => <span className="flex flex-col leading-tight tabular-nums">{s.start}–{endTime(s.start, s.minutes)}<span className="text-xs text-muted-foreground">{(() => { const seat = Seats.seatOf(s, k.id, classes.find((k) => k.id === s.classId)); return Seats.isPartial(seat, s.minutes) ? `เรียน ${Seats.seatTime(s.start, seat)}` : `${s.minutes} นาที` })()}</span></span> },
    { id: "subject", label: "วิชา", cell: ({ s }) => <span className="flex gap-1">{subjectsOf(s).map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>)}</span> },
    { id: "teacher", label: "ครู", width: "1%", cell: ({ s }) => staff.find((x) => x.id === s.teacherId)?.nickname ?? <span className="text-muted-foreground">ยังไม่มีครู</span> },
    { id: "bus", label: "รถรับส่ง", width: "1%", align: "center", defaultHidden: true, info: "P = รับ (Pickup) · D = ส่ง (Drop) · B = ทั้งรับและส่ง — กดเพื่อแก้ (คาบที่ยังไม่ถึง)",
      cell: ({ s, k }) => <BusTag studentId={k.id} date={s.date} legs={legsBy.get(k.id)?.get(s.date)} editable={canBus && s.date >= today && !s.cancelled} /> },
    // same-width pills so the column lines up whatever the label
    { id: "status", label: "สถานะ", width: "1%", align: "right", cell: ({ s, k }) => { const x = studentSessionStatus(s, k); return <Pill tone={x.tone}>{x.label}</Pill> } },
  ]

  // per course: held so far = มา + ขาด + ลา + ยังไม่เช็ค
  const packages = ents.filter((e) => kids.some((k) => k.id === e.studentId) && (!subject || e.subjects.includes(subject))).sort((a, b) => b.to.localeCompare(a.to))
  const heldOf = (e: Entitlement) => sessions.filter((s) => Att.packageCovers(e, s) && s.studentIds.includes(e.studentId) && !s.cancelled && s.date <= today)
  const attOf = (e: Entitlement, held: Session[]) => attendance.filter((a) => a.studentId === e.studentId && held.some((s) => s.id === a.sessionId))

  return (
    <div className="space-y-3">
      {/* owner 2026-10-29: the per-course cards always on top */}
      {packages.some((e) => e.to >= today) && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">การเข้าเรียนต่อคอร์ส</h3>
          {/* owner 2026-10-29: one card per course instead of a table */}
          <div className="grid gap-3 sm:grid-cols-2">
            {packages.filter((e) => e.to >= today).map((e) => {
              const held = heldOf(e)
              const marks = attOf(e, held)
              const n = (st: string) => marks.filter((a) => a.status === st).length
              const unmarked = held.length - marks.length
              const course = courses.find((x) => x.id === e.courseId)
              // owner 2026-11-04: the big number = คาบที่เช็คแล้ว / คาบทั้งหมดของคอร์ส (Done / Total), not Present/held.
              // "ขาด" (absent) dropped — the check-in only offers มา / ลา, so an Absent count is always 0 and just confuses.
              const total = sessions.filter((s) => Att.packageCovers(e, s) && s.studentIds.includes(e.studentId) && !s.cancelled).length
              return (
                <Kpi key={e.id} icon={GraduationCapIcon} tone={e.to < today ? "special" : "sky"} label={`${many ? `${kids.find((k) => k.id === e.studentId)?.nickname} · ` : ""}${course?.name ?? "—"}`} value={`${marks.length}/${total}`}
                  sub={`${fmtDate(e.from)} → ${fmtDate(e.to, { year: true })}`}>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <Pill tone="green">{`มา ${n("present")}`}</Pill>
                    <Pill tone="amber">{`ลา ${Att.leavesUsed(e, sessions, attendance, leaves)}/${Att.leaveQuota(e)}`}</Pill>
                    {unmarked > 0 && <Pill tone="gray">{`รอเช็ค ${unmarked}`}</Pill>}
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
        {/* owner Row 25 (2026-11-02): add this student into a class straight from the panel — no new-student form needed */}
        {can(me, "session.manage") && !many && <Button size="sm" variant="outline" className="ml-auto" onClick={() => setAdding(true)}><PlusIcon /> เพิ่มเข้าคลาส</Button>}
        <span className={cn((can(me, "session.manage") && !many) || "ml-auto")}><ColumnsMenu id={many ? "family-sessions" : "student-sessions"} columns={columns} /></span>
      </div>
      <DataTable id={many ? "family-sessions" : "student-sessions"} columns={columns} rows={mine} rowKey={(r) => `${r.s.id}:${r.k.id}`} minWidth={520} maxHeight="calc(100dvh - 16rem)"
        rowActions={({ s, k }) => <StudentSessionMenu s={s} studentId={k.id} />}
        rowClassName={({ s }) => cn(s.cancelled && "opacity-45", s.date === today && "bg-primary/5")} empty="ไม่มีคาบ" />
      {adding && <AddToClassDialog stu={stu} onClose={() => setAdding(false)} />}
    </div>
  )
}

const BUS_TAG = { P: tagChip("busLeg", "pickup"), D: tagChip("busLeg", "dropoff"), B: tagChip("busLeg", "both") } as const

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
      <PopoverTrigger render={<Button variant="ghost" size="inline" type="button" aria-label="แก้รถรับส่งวันนี้" className="rounded-full hover:ring-2 hover:ring-primary/30" />}>{tag}</PopoverTrigger>
      <PopoverContent align="center" className="w-56 space-y-2 p-3 text-sm">
        <p className="font-medium">{`รถรับส่ง ${fmtDate(date, { weekday: true })}`}</p>
        <label className="flex items-center gap-2"><Checkbox checked={p} onCheckedChange={(v) => setP(v === true)} /> รับ (Pickup)</label>
        <label className="flex items-center gap-2"><Checkbox checked={d} onCheckedChange={(v) => setD(v === true)} /> ส่ง (Drop)</label>
        <p className="text-xs text-muted-foreground">เพิ่ม = เรียกเก็บในใบถัดไป · เอาออก = รถไม่มารับ (ไม่คืนเงินรอบที่จ่ายแล้ว)</p>
        <div className="flex justify-end"><Button size="xs" onClick={save}>บันทึก</Button></div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------- Billing

function BillingSeg({ stu }: { stu: Student }) {
  return <StudentBilling kids={[stu]} />
}

/** owner 2026-11-20: the Billing tab for ONE child or for several (the family panel) — with several, the table gains a "student" column and the new-invoice button leaves to the panel's own menu */
export function StudentBilling({ kids, toolbar }: { kids: Student[]; /** extra controls placed right before the columns icon (the family panel's child dropdown) */ toolbar?: React.ReactNode }) {
  const stu = kids[0]
  const many = kids.length > 1
  const [invoice, setInvoice] = useState<ID | "new" | null>(null)
  const me = useStore((s) => s.me())
  const ids = new Set(kids.map((k) => k.id))
  const invoices = useStore((s) => s.invoices).filter((i) => ids.has(i.studentId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const subjectsOfInv = (i: Invoice) => [...new Set(i.lines.flatMap((l) => courses.find((x) => x.id === l.courseId)?.subjects ?? []))]
  const invoiceCols: Column<Invoice>[] = [
    ...(many ? [{ id: "student", label: "นักเรียน", cell: (i: Invoice) => kids.find((k) => k.id === i.studentId)?.nickname ?? "—" } as Column<Invoice>] : []),
    { id: "number", label: "เลขที่", required: true, className: "tabular-nums", cell: (i) => i.number ?? "—" },
    { id: "items", label: "รายการ", cell: (i) => { const subjects = subjectsOfInv(i); return <span className="flex items-center gap-1">{subjects.length ? subjects.map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(x).chip)}>{x}</span>) : <span className="text-xs text-muted-foreground">{i.busExtras?.length ? "ค่ารถเพิ่ม" : "ค่าอื่นๆ"}</span>}{i.status === "paid" && subjects.length > 0 && <span className="text-2xs text-success">✓ เข้าคลาสแล้ว</span>}</span> } },
    { id: "date", label: "วันที่", cell: (i) => fmtDate(i.createdAt.slice(0, 10), { year: true }) },
    { id: "total", label: "ยอด", align: "right", className: "tabular-nums", cell: (i) => fmtMoney(invoiceTotals(i, { branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays }).total) },
    { id: "status", label: "สถานะ", align: "right", cell: (i) => <Pill tone={i.status === "paid" ? "green" : i.status === "void" ? "gray" : i.status === "draft" ? "gray" : "amber"}>{INVOICE_STATUS_LABEL[i.status]}</Pill> },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">กดแถวเพื่อเปิดใบแจ้งหนี้ · จ่ายครบแล้วระบบเพิ่มเข้าคลาสให้อัตโนมัติ</p>
        {can(me, "billing.manage") && !many && <Button size="sm" variant="outline" className="ml-auto" onClick={() => setInvoice("new")}><PlusIcon /> ใบแจ้งหนี้ใหม่</Button>}
        <span className="ml-auto flex items-center gap-2">{toolbar}</span>
        <ColumnsMenu id={many ? "family-invoices" : "student-invoices"} columns={invoiceCols} />
      </div>
      <DataTable id={many ? "family-invoices" : "student-invoices"} columns={invoiceCols} rows={invoices} rowKey={(i) => i.id} onRowClick={(i) => setInvoice(i.id)} minWidth={520} empty="ยังไม่มีใบแจ้งหนี้" />
      {kids.filter((k) => !many || k.usesBus).map((k) => <BusAddOns key={k.id} stu={k} />)}
      <InvoiceSheet id={invoice} defaultStudentId={stu.id} onClose={() => setInvoice(null)} />
    </div>
  )
}

// ---------------------------------------------------------------- Note

function NoteSeg({ stu }: { stu: Student }) {
  return <StudentNotes kids={[stu]} />
}

/** owner 2026-11-20: the Note tab for ONE child or SEVERAL (the family panel — same look, a child tag on each note and a "write for" picker) */
export function StudentNotes({ kids, filter }: { kids: Student[]; /** the family panel's child dropdown */ filter?: React.ReactNode }) {
  const many = kids.length > 1
  const ids = new Set(kids.map((k) => k.id))
  const nameOf = (id: ID) => kids.find((k) => k.id === id)?.nickname ?? ""
  const notes = useStore((s) => s.notes).filter((n) => ids.has(n.studentId)).sort((a, b) => a.at.localeCompare(b.at))
  const staff = useStore((s) => s.staff)
  const userId = useStore((s) => s.userId)
  const add = useStore((s) => s.addStudentNote)
  const sessions = useStore((s) => s.sessions)
  const calendarNotes = useStore((s) => s.calendarNotes)
  const me = useStore((s) => s.me())
  const now = useNow()
  const [text, setText] = useState("")
  // owner 2026-11-20: with several children the note says WHO it is for by an @mention — typing "@" opens a list of the family's children
  const [caret, setCaret] = useState(0)
  const [pick, setPick] = useState(0)
  const mention = many ? /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret)) : null
  const choices = mention ? kids.filter((k) => k.nickname.toLowerCase().startsWith(mention[2].toLowerCase())) : []
  const choose = (k: Student) => {
    if (!mention) return
    const at = mention.index + mention[1].length
    const next = `${text.slice(0, at)}@${k.nickname} ${text.slice(caret)}`
    setText(next); setCaret(at + k.nickname.length + 2); setPick(0)
  }
  const send = () => {
    const targets = many ? kids.filter((k) => text.includes(`@${k.nickname}`)) : kids
    if (!targets.length) { report({ ok: false, error: "พิมพ์ @ แล้วเลือกลูกที่โน้ตนี้เกี่ยวกับ" }, ""); return }
    // the mention only says who it is for — the note itself is saved without it (each note already shows "→ child")
    const body = many ? targets.reduce((t, k) => t.split(`@${k.nickname}`).join(""), text).replace(/\s+/g, " ").trim() : text
    let ok = true
    for (const k of targets) ok = report(add(k.id, body), "บันทึกโน้ตแล้ว") && ok
    if (ok) setText("")
  }
  // owner 2026-10-29: the Note Calendar of this student too — managed the same way as on the calendar.
  // One group per session: a session's own notes, a class's pinned notes on its next session, and the next session of
  // each class the student is in (so a note can be added for the coming class).
  const rows = kids.flatMap((k) => {
    const mineSessions = sessions.filter((x) => x.studentIds.includes(k.id) && !x.cancelled)
    const nextOf = (classId: ID) => mineSessions.filter((x) => x.classId === classId && sessionState(x, now) === "upcoming").sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
      ?? mineSessions.filter((x) => x.classId === classId).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))[0]
    const noteSessionIds = new Set<ID>()
    for (const n of calendarNotes.filter((x) => x.studentId === k.id)) {
      const se = n.sessionId ? sessions.find((x) => x.id === n.sessionId) : n.classId ? nextOf(n.classId) : undefined
      if (se) noteSessionIds.add(se.id)
    }
    for (const classId of new Set(mineSessions.map((x) => x.classId).filter((x): x is ID => !!x))) { const se = nextOf(classId); if (se && sessionState(se, now) === "upcoming") noteSessionIds.add(se.id) }
    return [...noteSessionIds].map((id) => ({ se: sessions.find((x) => x.id === id)!, k }))
  }).sort((a, b) => (a.se.date + a.se.start).localeCompare(b.se.date + b.se.start))
  const canNote = (se: Session) => can(me, "session.manage") || se.teacherId === me.id || se.coTeacherIds.includes(me.id)
  return (
    <div className="flex h-full flex-col">
      {filter && <div className="mb-3 flex justify-end">{filter}</div>}
      {rows.length > 0 && (
        <section className="mb-4 space-y-2">
          <h3 className="flex items-center gap-1 text-sm font-semibold">Note ในปฏิทิน <InfoTip text="Note ที่แสดงบนการ์ดคาบในปฏิทิน — 📌 = ถาวร (ทุกคาบของคลาส) · เพิ่ม / แก้ / ลบ ได้ที่นี่เหมือนในปฏิทิน" /></h3>
          <ul className="divide-y rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
            {rows.map(({ se, k }) => (
              <li key={`${se.id}:${k.id}`} className="flex gap-3 px-4 py-2.5">
                <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{many && <b className="block font-medium text-foreground">{k.nickname}</b>}{fmtDate(se.date, { weekday: true })} {se.start}<br />{subjectsOf(se).join(" + ")}</span>
                <div className="min-w-0 flex-1"><CalendarNotes s={se} studentId={k.id} canEdit={canNote(se)} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex-1 space-y-3">
        {notes.length === 0 && <Empty>{many ? "ยังไม่มีโน้ต — ใช้จดเรื่องที่ทีมควรรู้เกี่ยวกับลูกๆ" : "ยังไม่มีโน้ต — ใช้จดเรื่องที่ทีมควรรู้เกี่ยวกับนักเรียนคนนี้"}</Empty>}
        {notes.map((n) => {
          const by = staff.find((x) => x.id === n.by)
          const mineN = n.by === userId
          return (
            <div key={n.id} className={cn("flex items-end gap-2", mineN && "flex-row-reverse")}>
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", avatarTone(n.by))}>{initial(by?.nickname ?? "?")}</span>
              <div className={cn("max-w-[80%] rounded-2xl p-3 text-sm", mineN ? "bg-primary/10" : "bg-muted")}>
                <p className="mb-1 flex gap-3 text-2xs text-muted-foreground"><span>{by?.nickname ?? "?"}{many && <b className="ml-1.5 font-medium text-foreground">→ {nameOf(n.studentId)}</b>}</span><span className="ml-auto">{fmtDateTime(n.at)}</span></p>
                <p className="whitespace-pre-wrap">{n.text}</p>
                {/* written on a class in the calendar board (owner 2026-10-12) */}
                {n.sessionId && (() => { const se = sessions.find((x) => x.id === n.sessionId); return se ? <p className="mt-1 text-2xs text-muted-foreground">จากคาบ {se.subject} · {fmtDate(se.date)} {se.start}</p> : null })()}
              </div>
            </div>
          )
        })}
      </div>
      <p className="my-2 flex items-center justify-center gap-1 text-xs text-muted-foreground"><MessageSquareIcon className="size-3.5" /> ข้อมูลภายในเท่านั้น — ผู้ปกครองไม่เห็น</p>
      {/* owner 2026-10-29: the same type bar as the Inbox */}
      <div className="relative">
        {choices.length > 0 && (
          <ul role="listbox" aria-label="เลือกลูก" className="absolute bottom-full left-2 z-10 mb-1 w-56 space-y-0.5 rounded-2xl border bg-popover p-1 shadow-lg">
            {choices.map((k, i) => (
              <li key={k.id} role="option" aria-selected={i === pick % choices.length}>
                <Button variant="row" size="inline" type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(k)}
                  className={cn("flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm", i === pick % choices.length && "bg-accent")}>
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", avatarTone(k.id))}>{initial(k.nickname)}</span>
                  <span className="font-medium">{k.nickname}</span><span className="text-xs text-muted-foreground">{k.grade}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-1.5 rounded-3xl border bg-background p-1.5 shadow-sm transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <Textarea rows={1} value={text} onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); setPick(0) }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)} placeholder={many ? "พิมพ์โน้ต… (พิมพ์ @ เพื่อเลือกลูก)" : "พิมพ์โน้ต…"}
            onKeyDown={(e) => {
              if (choices.length > 0) {
                if (e.key === "ArrowDown") { e.preventDefault(); setPick((i) => i + 1); return }
                if (e.key === "ArrowUp") { e.preventDefault(); setPick((i) => i - 1 + choices.length); return }
                if ((e.key === "Enter" || e.key === "Tab") && !e.nativeEvent.isComposing) { e.preventDefault(); choose(choices[((pick % choices.length) + choices.length) % choices.length]); return }
                if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setCaret(0); return }
              }
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
            }}
            className={cn("max-h-40 min-h-9 flex-1", text ? "field-sizing-content" : "h-9 overflow-hidden whitespace-nowrap", "resize-none border-0 bg-transparent px-3 py-2 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0")} />
          <Button size="icon" className="rounded-full" disabled={!text.trim()} aria-label="บันทึกโน้ต" onClick={send}><ArrowUpIcon /></Button>
        </div>
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
            <Button variant="chip" size="inline" key={c || "all"} aria-pressed={cat === c} onClick={() => setCat(c)} className="px-3 py-1 text-xs">{c ? CAT_LABEL[c] : "ทั้งหมด"}</Button>
          ))}
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="ค้นหาใน Log" />
        <ColumnsMenu id="student-timeline" columns={logCols} />
      </div>
      <DataTable id="student-timeline" columns={logCols} rows={pg.rows} rowKey={(l) => l.id} minWidth={520} empty="ยังไม่มีประวัติ" />
      <Pager {...pg} unit="รายการ" />
    </div>
  )
}

