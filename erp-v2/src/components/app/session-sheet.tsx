"use client"

import { ForceApprove } from "./force-approve"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangleIcon, BanIcon, CalendarClockIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, EllipsisVerticalIcon, FlameIcon,
  GraduationCapIcon, LogOutIcon, PencilIcon, SendIcon, StarIcon, Trash2Icon, UserMinusIcon, UserPlusIcon, UsersRoundIcon, XIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addDays, endTime, fmtDate, fmtDateTime, fromMinutes, toMinutes } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import * as Seats from "@/domain/rules/seats"
import { shortCourse } from "@/domain/rules/course"
import * as Les from "@/domain/rules/lessons"
import type { SummaryLesson } from "@/store/store"
import { CatalogCombo, CatalogManager } from "./lesson-picker"
import { assessmentIn, FORM_TYPE_LABEL, sessionKindLabel } from "@/domain/rules/forms"
import { can } from "@/domain/rules/permissions"
import { canChangeTeachers, canRescheduleStudent, findConflicts, mondayOf, sessionState, subjectsOf } from "@/domain/rules/scheduling"
import * as Sum from "@/domain/rules/summaries"
import { SUMMARY_STATUS_LABEL } from "@/domain/rules/summaries"
import type { ID, LessonSummary, Seat, Session } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useEntitlements, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { AssessmentNote } from "./assessment-note"
import { GradeChips } from "./grade-chips"
import { Pill, SessionStateBadge } from "./badges"
import { ClassSheet } from "./class-sheet"
import { NativeSelect } from "./native-select"
import { StudentSearch } from "./student-search"
import { FixSuggestions } from "./fix-suggestions"
import { StudentSheet } from "./student-sheet"
import { avatarTone, gradeTone, initial } from "./subject-color"
import { TeacherPicker } from "./teacher-picker"
import { CAPACITY, type MoveScope } from "@/domain/rules/scheduling"

/** Session dialog (owner design 2026-09-29): student list with ✓/✗, per-student ⋮ (Re-schedule · Leave · Remove),
 *  summary right under each present student, multi-select to submit/approve, class ⋮ (Edit · Postpone · Delete). */
export function SessionSheet({ sessionId, onClose }: { sessionId: ID | null; onClose: () => void }) {
  return (
    <Sheet open={!!sessionId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-2xl">{sessionId && <Body id={sessionId} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function Body({ id, onClose }: { id: ID; onClose: () => void }) {
  // opening (then closing) the session clears this person's red dot on the teacher board
  const markSeen = useStore((st) => st.markSessionSeen)
  useEffect(() => () => markSeen(id), [id, markSeen])
  const s = useStore((st) => st.sessions.find((x) => x.id === id))
  const klass = useStore((st) => st.classes.find((c) => c.id === s?.classId))
  const allSessions = useStore((st) => st.sessions)
  const staff = useStore((st) => st.staff)
  const attendance = useStore((st) => st.attendance)
  const summaries = useStore((st) => st.summaries)
  const me = useStore((st) => st.staff.find((x) => x.id === st.userId)!)
  const save = useStore((st) => st.saveSummary)
  const approve = useStore((st) => st.approveSummary)
  const now = useNow(10_000)
  const branch = useBranch()
  const L = useLookup()
  const [tab, setTab] = useState<"students" | "info">("students")
  const [adding, setAdding] = useState(false)
  const [teachersOpen, setTeachersOpen] = useState(false)
  const [postponing, setPostponing] = useState(false)
  const [teacherLeave, setTeacherLeave] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingClass, setEditingClass] = useState(false)
  const [drafts, setDrafts] = useState<Record<ID, string>>({})
  const [picked, setPicked] = useState<Set<ID>>(new Set())
  const [capHidden, setCapHidden] = useState(false)

  const conflicts = useMemo(() => (s ? findConflicts(allSessions.filter((x) => x.date === s.date), branch, staff).filter((c) => c.sessionIds.includes(s.id)) : []), [allSessions, s, branch, staff])
  if (!s) return null
  const state = sessionState(s, now)
  const teacher = L.teacher(s.teacherId)
  const canManage = can(me, "session.manage")
  const mine = s.teacherId === me.id || s.coTeacherIds.includes(me.id)
  // teachers can open every session (owner 2026-09-26) but only work on their own
  const viewOnly = !canManage && !mine
  const cap = klass ? CAPACITY[klass.type] : CAPACITY.group

  // summaries: text lives here so several students can be submitted in one go
  const present = s.studentIds.filter((sid) => attendance.find((x) => x.sessionId === s.id && x.studentId === sid)?.status === "present")
  const summaryOf = (sid: ID) => summaries.find((x) => x.sessionId === s.id && x.studentId === sid)
  const textOf = (sid: ID) => drafts[sid] ?? summaryOf(sid)?.text ?? ""
  const submittable = present.filter((sid) => { const st = summaryOf(sid)?.status; return !viewOnly && (!st || st === "draft" || st === "changes_requested") && textOf(sid).trim() })
  const approvable = present.filter((sid) => { const x = summaryOf(sid); return x?.status === "submitted" && Sum.canApprove(x, me).ok })
  const selectable = [...new Set([...submittable, ...approvable])]
  const sel = [...picked].filter((x) => selectable.includes(x))
  const toggle = (sid: ID) => setPicked((p) => { const n = new Set(p); if (n.has(sid)) n.delete(sid); else n.add(sid); return n })
  const submitMany = () => {
    const ids = sel.filter((x) => submittable.includes(x))
    const fails = ids.map((sid) => save(s.id, sid, textOf(sid), true)).filter((r) => !r.ok)
    report(fails.length ? fails[0] : { ok: true, value: undefined }, `ส่งอนุมัติสรุป ${ids.length} คนแล้ว`)
    setPicked(new Set())
  }
  const approveMany = () => {
    const ids = sel.filter((x) => approvable.includes(x))
    const fails = ids.map((sid) => approve(summaryOf(sid)!.id)).filter((r) => !r.ok)
    report(fails.length ? fails[0] : { ok: true, value: undefined }, `อนุมัติสรุป ${ids.length} คนแล้ว`)
    setPicked(new Set())
  }

  return (
    <>
      <SheetHeader className="border-b px-5 pt-5 pb-3">
        <div className="flex items-start gap-3 pr-8">
          <GraduationCapIcon className="mt-1 size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-lg">{klass?.name ?? `${subjectsOf(s).join(" + ")} (คาบเดี่ยว)`}</SheetTitle>
            <SheetDescription>
              {s.start}–{endTime(s.start, s.minutes)} · {fmtDate(s.date, { weekday: true, year: true })} · {L.room(s.roomId)} ·{" "}
              <span className={cn(teacher.missing && "font-medium text-amber-700")}>★ {teacher.label}</span>
              {s.coTeacherIds.length > 0 && <> · ผู้ช่วย {s.coTeacherIds.map((t) => L.teacher(t).label).join(", ")}</>}
            </SheetDescription>
            <GradeChips className="mt-1.5" max={8} grades={s.studentIds.map((sid) => L.student(sid)?.grade ?? "")} planned={klass?.grades} />
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <SessionStateBadge state={state} />
            {sessionKindLabel(s) && <Pill tone="violet">{sessionKindLabel(s)}</Pill>}
            {s.customized && s.classId && <Pill>แก้เฉพาะคาบนี้</Pill>}
          </div>
        </div>
        {s.cancelled && <p className="text-sm text-red-700">ยกเลิกแล้ว: {s.cancelReason}</p>}
        {s.teacherLeave && (
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {L.teacher(s.teacherLeave.teacherId).label}ลา ({s.teacherLeave.reason}){s.teacherLeave.substituteId ? ` · ${L.teacher(s.teacherLeave.substituteId).label} สอนแทน` : " · เลื่อนวันจบคอร์สให้นักเรียนแล้ว"}
          </p>
        )}
        <div className="flex gap-1.5 pt-2">
          {([["students", `รายชื่อนักเรียน (${s.studentIds.length})`], ["info", "ข้อมูลคาบ"]] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn("rounded-full px-3.5 py-1.5 text-sm", tab === k ? "bg-foreground font-medium text-background" : "bg-muted text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {tab === "students" ? (
          <>
            {s.studentIds.length > cap && !capHidden && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangleIcon className="size-4 shrink-0" /> ไม่ควรเกิน {cap} คน/คลาส (ตอนนี้ {s.studentIds.length} คน)
                <button type="button" className="ml-auto" aria-label="ปิด" onClick={() => setCapHidden(true)}><XIcon className="size-4" /></button>
              </div>
            )}
            {viewOnly && <p className="text-xs text-muted-foreground">ดูอย่างเดียว — ไม่ใช่คาบที่คุณสอน</p>}
            {state === "upcoming" && <p className="text-xs text-muted-foreground">ยังไม่ถึงเวลาเรียน — เช็คชื่อ เขียนสรุป ลา หรือย้ายคาบ เตรียมไว้ล่วงหน้าได้เลย</p>}
            {state === "closed" && <p className="text-xs text-muted-foreground">คาบนี้ปิดแล้ว แก้การเช็คชื่อไม่ได้</p>}
            {selectable.length > 0 && (
              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border bg-background/95 px-3 py-2 text-sm backdrop-blur">
                <Checkbox checked={sel.length === selectable.length} onCheckedChange={(v) => setPicked(v ? new Set(selectable) : new Set())} />
                <span className="text-muted-foreground">{sel.length ? `เลือก ${sel.length} คน` : "เลือกสรุปหลายคนพร้อมกัน"}</span>
                <span className="ml-auto flex gap-1.5">
                  {sel.some((x) => submittable.includes(x)) && <Button size="xs" onClick={submitMany}><SendIcon /> ส่งอนุมัติ ({sel.filter((x) => submittable.includes(x)).length})</Button>}
                  {sel.some((x) => approvable.includes(x)) && <Button size="xs" variant="outline" onClick={approveMany}><CheckIcon /> อนุมัติ ({sel.filter((x) => approvable.includes(x)).length})</Button>}
                </span>
              </div>
            )}
            {s.studentIds.length === 0 && !s.rescheduledOut?.length && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">ยังไม่มีนักเรียนในคาบนี้</p>}
            <ul className="divide-y">
              {s.studentIds.map((sid) => (
                <StudentRow key={sid} s={s} sid={sid} viewOnly={viewOnly} canManage={canManage} mine={mine}
                  text={textOf(sid)} setText={(t) => setDrafts((d) => ({ ...d, [sid]: t }))}
                  selectable={selectable.includes(sid)} picked={picked.has(sid)} onPick={() => toggle(sid)} />
              ))}
              {s.rescheduledOut?.map((m) => <MovedOutRow key={m.studentId} s={s} studentId={m.studentId} toSessionId={m.toSessionId} canManage={canManage} />)}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            {conflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangleIcon />
                <AlertTitle>คาบนี้ชนกับคาบอื่น</AlertTitle>
                <AlertDescription className="space-y-2">
                  <div>{[...new Set(conflicts.map((c) => c.message))].join(" · ")}</div>
                  {canManage && state === "upcoming" && <FixSuggestions sessionId={s.id} />}
                </AlertDescription>
              </Alert>
            )}
            <section className="rounded-2xl border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">ครูผู้สอน</h3>
                {canManage && canChangeTeachers(s, now).ok && (
                  <Button size="xs" variant={s.teacherId ? "outline" : "default"} onClick={() => setTeachersOpen(true)}><UsersRoundIcon /> {s.teacherId ? "เปลี่ยน / เพิ่มครู" : "ตั้งครู"}</Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {!s.teacherId && <Pill tone="amber">ยังไม่มีครู</Pill>}
                {s.teacherId && <Pill tone="blue"><StarIcon className="size-3 fill-current" /> {L.teacher(s.teacherId).label} · ครูหลัก</Pill>}
                {s.coTeacherIds.map((t) => <Pill key={t}>{L.teacher(t).label} · ผู้ช่วย</Pill>)}
              </div>
            </section>
            <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 rounded-2xl border p-3 text-sm">
              <dt className="text-muted-foreground">วันที่</dt><dd>{fmtDate(s.date, { weekday: true, year: true })}</dd>
              <dt className="text-muted-foreground">เวลา</dt><dd>{s.start}–{endTime(s.start, s.minutes)} ({s.minutes} นาที)</dd>
              <dt className="text-muted-foreground">ห้อง</dt><dd>{L.room(s.roomId)}</dd>
              <dt className="text-muted-foreground">วิชา</dt><dd>{subjectsOf(s).join(" + ")}</dd>
              {klass && <><dt className="text-muted-foreground">คลาส</dt><dd>{klass.name} · {klass.type === "single" ? "เดี่ยว" : "กลุ่ม"} · {klass.grades.join(", ")}</dd></>}
              <dt className="text-muted-foreground">นักเรียน</dt><dd>{s.studentIds.length}/{cap} คน</dd>
            </dl>
            <p className="text-[11px] text-muted-foreground">รหัสคาบ {s.id}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t px-5 py-3">
        {canManage && !s.cancelled && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon" variant="outline" aria-label="จัดการคลาส" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuItem onClick={() => (klass ? setEditingClass(true) : setPostponing(true))}><PencilIcon /> {klass ? "แก้คลาส" : "แก้คาบนี้"}</DropdownMenuItem>
              <DropdownMenuItem disabled={state !== "upcoming"} onClick={() => setPostponing(true)}><LogOutIcon /> เลื่อนคาบ (Postpone)</DropdownMenuItem>
              <DropdownMenuItem disabled={state === "closed" || !s.teacherId} onClick={() => setTeacherLeave(true)}>
                <UserMinusIcon /><span className="flex flex-col"><span>ครูลา</span><span className="text-xs text-muted-foreground">มีครูสอนแทน หรือยกเลิกคาบ</span></span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}><Trash2Icon /> ลบ</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <span className="ml-auto" />
        {canManage && state !== "closed" && !s.cancelled && (
          <Button variant="secondary" onClick={() => setAdding(true)}><UserPlusIcon /> เพิ่มนักเรียน</Button>
        )}
      </div>

      {postponing && <EditSessionDialog id={s.id} onClose={() => setPostponing(false)} />}
      {teacherLeave && <TeacherLeaveDialog s={s} onClose={() => setTeacherLeave(false)} />}
      {teachersOpen && <TeachersDialog id={s.id} onClose={() => setTeachersOpen(false)} />}
      {adding && <AddStudentDialog id={s.id} onClose={() => setAdding(false)} />}
      {deleting && <DeleteDialog s={s} canCancel={state === "upcoming"} onClose={() => setDeleting(false)} onDone={onClose} />}
      <ClassSheet id={editingClass && klass ? klass.id : null} onClose={() => setEditingClass(false)} />
    </>
  )
}

/** One student: avatar · name/family · New · grade · package progress · ✓ ✗ · ⋮ — and the summary right under when "มา" */
function StudentRow({ s, sid, viewOnly, canManage, mine, text, setText, selectable, picked, onPick }: {
  s: Session; sid: ID; viewOnly: boolean; canManage: boolean; mine: boolean
  text: string; setText: (t: string) => void; selectable: boolean; picked: boolean; onPick: () => void
}) {
  const allSessions = useStore((st) => st.sessions)
  const attendance = useStore((st) => st.attendance)
  const summaries = useStore((st) => st.summaries)
  const rawEnts = useStore((st) => st.entitlements)
  const leaves = useStore((st) => st.leaves)
  const classes = useStore((st) => st.classes)
  const holidays = useStore((st) => st.holidays)
  const courses = useStore((st) => st.courses)
  const assessments = useStore((st) => st.assessments)
  const me = useStore((st) => st.staff.find((x) => x.id === st.userId)!)
  const mark = useStore((st) => st.mark)
  const clearMark = useStore((st) => st.clearMark)
  const entitlements = useEntitlements()
  const now = useNow(10_000)
  const L = useLookup()
  const [open, setOpen] = useState<"student" | "reschedule" | "remove" | "seat" | "leave" | null>(null)
  const [otherSession, setOtherSession] = useState<ID | null>(null)

  const stu = L.student(sid)
  const a = attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
  const ent = Att.coveringEntitlement(sid, s, entitlements)
  const asm = assessmentIn(s.id, sid, assessments)
  const onLongLeave = Att.activeLeave(sid, s.date, leaves)
  const canMarkHere = can(me, "attendance.mark") && (canManage || mine)
  const byId = new Map(allSessions.map((x) => [x.id, x]))
  // first class ever for this student → "ใหม่"
  const isNew = !attendance.some((x) => x.studentId === sid && (byId.get(x.sessionId)?.date ?? "") < s.date)
  const movedFrom = s.rescheduledIn?.includes(sid) ? allSessions.find((x) => x.rescheduledOut?.some((m) => m.studentId === sid && m.toSessionId === s.id)) : undefined

  // package progress: sessions = used/bought · month/week = this class's place in the paid window
  const progress = (() => {
    if (!ent) return null
    if (ent.kind === "sessions") { const b = Att.balance(ent, allSessions, attendance, classes); return { n: b.used, of: b.total } }
    const inPkg = allSessions.filter((x) => !x.cancelled && x.studentIds.includes(sid) && Att.packageCovers(ent, x))
    return { n: inPkg.filter((x) => x.date <= s.date).length, of: inPkg.length }
  })()

  // leave: quota used? which day does the package end now?
  const raw = rawEnts.find((e) => e.id === ent?.id)
  const ctx = { sessions: allSessions, attendance, classes, holidays }
  const ledger = raw ? Att.leaveLedger({ ...raw, to: Att.effectiveTo(raw, leaves) }, ctx, leaves) : []
  const quota = raw ? Att.leaveQuota(raw) : 0
  const thisLeave = ledger.find((l) => l.sessionId === s.id)
  const usedQuota = ledger.filter((l) => l.quota).length

  // the part of the class this student attends (1 of 2 hours) — this session, or every time
  const klass = classes.find((k) => k.id === s.classId)
  const seat = Seats.seatOf(s, sid, klass)
  const partial = Seats.isPartial(seat, s.minutes)
  // text under the name lines up with the name (no empty gutter unless the multi-select checkbox is shown)
  const indent = selectable ? "pl-[5.25rem]" : "pl-14"
  const pill = "h-9 min-w-12 border-l px-3 text-sm font-medium transition first:border-l-0 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
  const markAs = (status: "present" | "absent" | "leave") =>
    a?.status === status ? report(clearMark(s.id, sid), `ล้างการเช็คชื่อ ${stu?.nickname}`) : report(mark(s.id, sid, status), `${stu?.nickname}: ${status === "present" ? "มา" : status === "absent" ? "ขาด" : "ลา"}`)

  return (
    <li className={cn("space-y-2 py-3", onLongLeave && "opacity-60")}>
      <div className="flex items-center gap-3">
        {selectable && <Checkbox checked={picked} onCheckedChange={onPick} aria-label={`เลือก ${stu?.nickname}`} />}
        <span className="relative shrink-0">
          <span className={cn("grid size-11 place-items-center rounded-full text-base font-semibold", avatarTone(sid))}>{initial(stu?.nickname ?? "?")}</span>
          {movedFrom && <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-sky-100 text-sky-700 ring-2 ring-background" title="ย้ายมาจากคาบอื่น"><CalendarClockIcon className="size-3" /></span>}
        </span>
        <div className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <button type="button" onClick={() => setOpen("student")} className="truncate text-left text-base font-semibold hover:text-primary hover:underline">{stu?.nickname}</button>
            {isNew && <Pill tone="red" className="shrink-0"><FlameIcon className="size-3" /> ใหม่</Pill>}
            {/* tap to change which hours this student attends — works before attendance (parent called ahead) */}
            {/* default = the whole class (owner 2026-09-30); tap to set a part of it */}
            {(partial || (canManage && state(s, now) !== "closed" && !s.cancelled)) && (
              <button type="button" disabled={!canManage || state(s, now) === "closed" || s.cancelled} onClick={() => setOpen("seat")}
                title={partial ? `เรียนเฉพาะ ${Seats.seatTime(s.start, seat)}${s.seats?.[sid] ? " (คาบนี้)" : " (ทุกคาบ)"} · กดเพื่อเปลี่ยน` : "กดเพื่อตั้งให้เรียนแค่บางชั่วโมง"}
                className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", partial ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" : "border border-dashed text-muted-foreground hover:bg-muted")}>
                {Seats.seatLabel(seat, s.minutes)}
              </button>
            )}
            {/* name on the left, grade on the right (owner 2026-09-30) */}
            <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", gradeTone(stu?.grade ?? ""))}>{stu?.grade}</span>
          </span>
          <p className="truncate text-xs text-muted-foreground">
            {asm ? `${FORM_TYPE_LABEL[asm.type]} (ไม่ใช้แพ็กเกจ)`
              : s.trial ? "ทดลองเรียน (ไม่ใช้แพ็กเกจ)"
              : !ent ? <span className="text-amber-700">ยังไม่ได้จ่ายค่าเรียน{can(me, "billing.manage") && <Link href={`/billing?new=${sid}`} className="ml-1 underline">ออกใบแจ้งหนี้</Link>}</span>
              : (() => {
                const course = courses.find((c) => c.id === ent.courseId)
                return <span title={`${course?.name ?? ""} · ถึง ${fmtDate(ent.to, { year: true })}${progress?.of ? ` · คาบที่ ${progress.n} จาก ${progress.of}` : ""}`}>
                  {course ? shortCourse(course) : "คอร์ส"} · ถึง {fmtDate(ent.to)}{progress && progress.of > 0 ? ` · คาบ ${progress.n}/${progress.of}` : ""}
                </span>
              })()}
          </p>
          {s.notes?.[sid] && <p className="truncate text-xs text-foreground/80" title={s.notes[sid]}>📝 {s.notes[sid]}</p>}
        </div>
        {/* มา · ลา (หักโควตา / ไม่หักโควตา) · ย้ายวัน — no "ขาด" (owner 2026-09-30) */}
        <span className="flex shrink-0 overflow-hidden rounded-full border">
          <button type="button" data-on={a?.status === "present"} disabled={!canMarkHere || !Att.canMark(s, "present", now).ok} onClick={() => markAs("present")}
            className={pill + " data-[on=true]:bg-emerald-600 data-[on=true]:text-white"}>มา</button>
          <button type="button" data-on={a?.status === "leave"} disabled={!canMarkHere || !Att.canMark(s, "leave", now).ok} onClick={() => setOpen("leave")}
            title="ลา — เลือกหักโควตา / ไม่หักโควตา และจำนวนคาบ" className={pill + " data-[on=true]:bg-amber-500 data-[on=true]:text-white"}>{a?.status === "leave" && a.noQuota ? "ลา*" : "ลา"}</button>
          <button type="button" disabled={!canManage || state(s, now) !== "upcoming" || !!a || s.cancelled} onClick={() => setOpen("reschedule")}
            title="ย้ายไปเรียนวันอื่นในสัปดาห์นี้" className={pill}>ย้ายวัน</button>
        </span>
        {canManage && state(s, now) !== "closed" && !s.cancelled ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`จัดการ ${stu?.nickname}`} />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem disabled={state(s, now) !== "upcoming" || !!a} onClick={() => setOpen("reschedule")}>
                <CalendarClockIcon /><span className="flex flex-col"><span>ย้ายคาบ (Re-schedule)</span><span className="text-xs text-muted-foreground">ภายในสัปดาห์นี้เท่านั้น</span></span>
              </DropdownMenuItem>
              {(
                <DropdownMenuItem onClick={() => setOpen("seat")}>
                  <ClockIcon /><span className="flex flex-col"><span>เวลาเรียนของ{stu?.nickname}</span><span className="text-xs text-muted-foreground">เรียนแค่บางชั่วโมง (คาบนี้ / ทุกคาบ)</span></span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setOpen("remove")}><UserMinusIcon /> เอาออกจากคลาส</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : <span className="w-8 shrink-0" />}
      </div>

      {movedFrom && (
        <p className={cn(indent, "text-xs text-sky-700")}>
          ย้ายมาจาก <button type="button" className="underline" onClick={() => setOtherSession(movedFrom.id)}>{fmtDate(movedFrom.date, { weekday: true })} {movedFrom.start}–{endTime(movedFrom.start, movedFrom.minutes)}{classes.find((k) => k.id === movedFrom.classId) ? ` · ${classes.find((k) => k.id === movedFrom.classId)!.name}` : ""}</button>
        </p>
      )}
      {a?.status === "leave" && raw && (
        <p className={cn(indent, "text-xs", thisLeave?.quota || thisLeave?.noQuota ? "text-emerald-700" : "text-muted-foreground")}>
          {a.leaveGroup && (() => { const n = attendance.filter((x) => x.studentId === sid && x.leaveGroup === a.leaveGroup).length; return n > 1 ? `ลาชุด ${n} คาบ · ` : "" })()}
          {thisLeave?.noQuota ? `ลาไม่หักโควตา · ยืดให้อีก 1 คาบ → เรียนจบ ${fmtDate(ent?.to ?? raw.to, { weekday: true, year: true })}` : thisLeave?.quota ? `ใช้โควตาลา ${usedQuota}/${quota} · ยืดให้อีก 1 คาบ → เรียนจบ ${fmtDate(ent?.to ?? raw.to, { weekday: true, year: true })}` : `โควตาลาหมดแล้ว (${quota}/${quota}) — ไม่ชดเชยคาบนี้ · เรียนจบ ${fmtDate(ent?.to ?? raw.to, { weekday: true, year: true })} เหมือนเดิม`}
        </p>
      )}
      {asm && <div className={indent}><AssessmentNote a={asm} editable={canManage || mine} /></div>}
      {a?.status === "present" && (
        <div className={indent}>
          <SummaryInline key={lessonKey(summaries.find((x) => x.sessionId === s.id && x.studentId === sid))} session={s} sessionId={s.id} studentId={sid} summary={summaries.find((x) => x.sessionId === s.id && x.studentId === sid)} viewOnly={viewOnly} text={text} setText={setText} />
        </div>
      )}

      <StudentSheet studentId={open === "student" ? sid : null} onClose={() => setOpen(null)} />
      {open === "reschedule" && <RescheduleDialog from={s} studentId={sid} onClose={() => setOpen(null)} />}
      {open === "remove" && <RemoveDialog s={s} studentId={sid} onClose={() => setOpen(null)} />}
      {open === "seat" && <SeatDialog s={s} studentId={sid} onClose={() => setOpen(null)} />}
      {open === "leave" && <LeaveDialog s={s} studentId={sid} onClose={() => setOpen(null)} />}
      <SessionSheet sessionId={otherSession} onClose={() => setOtherSession(null)} />
    </li>
  )
}

const state = sessionState
// re-read Book / Topic / Detail when "Summary Template" (or anyone) changes them on the saved summary
const lessonKey = (x?: LessonSummary) => `${x?.id ?? "new"}|${x?.bookId ?? ""}|${x?.topicId ?? ""}|${x?.detail ?? ""}`

/**
 * Leave (owner 2026-09-30): no-show = leave, the admin decides the kind — uses the quota, or not (still extends the
 * package) — and for how many sessions. Editable any time: fewer sessions = back early, more = longer leave.
 */
function LeaveDialog({ s, studentId, onClose }: { s: Session; studentId: ID; onClose: () => void }) {
  const attendance = useStore((st) => st.attendance)
  const sessions = useStore((st) => st.sessions)
  const rawEnts = useStore((st) => st.entitlements)
  const markLeave = useStore((st) => st.markLeave)
  const L = useLookup()
  const cur = attendance.find((a) => a.sessionId === s.id && a.studentId === studentId)
  const group = cur?.leaveGroup ? attendance.filter((a) => a.studentId === studentId && a.leaveGroup === cur.leaveGroup) : cur?.status === "leave" ? [cur] : []
  const byId = new Map(sessions.map((x) => [x.id, x]))
  const start = group.map((a) => byId.get(a.sessionId)!).filter(Boolean).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0] ?? s
  const [noQuota, setNoQuota] = useState(cur?.status === "leave" ? !!cur.noQuota : false)
  const [countText, setCountText] = useState(String(group.length || 1))
  const count = Number(countText)
  const ok = Number.isInteger(count) && count >= 1 && count <= 60
  const ent = Att.coveringEntitlement(studentId, start, rawEnts)
  const classIds = ent?.classIds.length ? ent.classIds : start.classId ? [start.classId] : []
  const run = ok ? (start.classId ? Att.leaveRunSessions(studentId, start, sessions, classIds, count) : [start]) : []
  // quota left, not counting this leave's own sessions
  const quota = ent ? Att.leaveQuota(ent) : 0
  const groupIds = new Set(group.map((a) => a.sessionId))
  const usedElsewhere = ent ? attendance.filter((a) => a.studentId === studentId && a.status === "leave" && !a.noQuota && !groupIds.has(a.sessionId) && byId.get(a.sessionId) && Att.packageCovers(ent, byId.get(a.sessionId)!)).length : 0
  const left = Math.max(0, quota - usedElsewhere)
  const save = (n: number) => report(markLeave(s.id, studentId, { count: n, noQuota }), n ? (v) => `บันทึกการลาแล้ว · ${v.marked} คาบ` : "ยกเลิกการลาแล้ว") && onClose()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group.length ? "แก้การลา" : "ลา"} · {L.student(studentId)?.nickname}</DialogTitle>
          <DialogDescription>เริ่ม {fmtDate(start.date, { weekday: true })} {start.start} · {group.length ? `ตอนนี้ลา ${group.length} คาบ — ลดจำนวน = กลับมาเรียนก่อน, เพิ่ม = ลาต่อ` : "ไม่มา = ลา เลือกแบบตามดุลพินิจ"}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {([[false, "หักโควตา", ent ? `เหลือโควตา ${left}/${quota} · ยืดวันจบตามโควตา` : "ไม่มีแพ็กเกจที่ใช้คาบนี้"], [true, "ไม่หักโควตา", "ไม่ใช้โควตา · ยืดวันจบให้ทุกคาบที่ลา"]] as const).map(([k, label, hint]) => (
            <button key={label} type="button" aria-pressed={noQuota === k} onClick={() => setNoQuota(k)}
              className={cn("rounded-xl border p-2.5 text-left", noQuota === k ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "hover:bg-muted/50")}>
              <p className="text-sm font-medium">ลา · {label}</p><p className="text-xs text-muted-foreground">{hint}</p>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          จำนวน <Input type="number" min={1} max={60} className="h-9 w-20" value={countText} onChange={(e) => setCountText(e.target.value)} aria-invalid={!ok} /> คาบ
        </label>
        {run.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-muted/40 p-2 text-xs">
            {run.map((x, i) => (
              <li key={x.id} className="flex justify-between">
                <span>{fmtDate(x.date, { weekday: true })} {x.start} · {x.subject}</span>
                <span className={noQuota || i < left ? "text-emerald-700" : "text-muted-foreground"}>{noQuota ? "ยืดวันจบ" : i < left ? "ใช้โควตา · ยืดวันจบ" : "เกินโควตา · ไม่ชดเชย"}</span>
              </li>
            ))}
            {ok && run.length < count && <li className="text-muted-foreground">มีคาบให้ลาแค่ {run.length} คาบในตาราง</li>}
          </ul>
        )}
        <DialogFooter className="items-center">
          {group.length > 0 && <Button variant="ghost" className="mr-auto text-red-700" onClick={() => save(0)}>ยกเลิกการลา (มาเรียน)</Button>}
          <Button variant="ghost" onClick={onClose}>ปิด</Button>
          <Button disabled={!ok} onClick={() => save(count)}>บันทึกการลา</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Which part of a long class the student attends (owner 2026-09-30): only this session, or every session of the class. */
function SeatDialog({ s, studentId, onClose }: { s: Session; studentId: ID; onClose: () => void }) {
  const klass = useStore((st) => st.classes.find((k) => k.id === s.classId))
  const setSeat = useStore((st) => st.setSeat)
  const L = useLookup()
  const current = Seats.seatOf(s, studentId, klass)
  const [pick, setPick] = useState<Seat>(current)
  // or typed by hand: from what time, for how many minutes (45 / 25 / 30 …)
  const preset = Seats.seatOptions(s.minutes).some((o) => o.offset === current.offset && o.minutes === current.minutes)
  const [custom, setCustom] = useState(!preset)
  const [from, setFrom] = useState(fromMinutes(toMinutes(s.start) + current.offset))
  const [mins, setMins] = useState(String(current.minutes))
  const customSeat: Seat = { offset: toMinutes(from) - toMinutes(s.start), minutes: Number(mins) }
  const customError = !(customSeat.minutes > 0) ? "ใส่จำนวนนาที" : customSeat.offset < 0 || customSeat.offset + customSeat.minutes > s.minutes ? `ต้องอยู่ในเวลาคาบ ${s.start}–${endTime(s.start, s.minutes)}` : null
  const chosen = custom ? customSeat : pick
  const [scope, setScope] = useState<"session" | "class">(s.seats?.[studentId] || !klass ? "session" : "class")
  const same = (a: Seat, b: Seat) => a.offset === b.offset && a.minutes === b.minutes
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เวลาเรียนของ{L.student(studentId)?.nickname}</DialogTitle>
          <DialogDescription>คาบ {s.start}–{endTime(s.start, s.minutes)} · แพ็กชั่วโมงหักตามเวลาที่เรียนจริง ราคารายเดือนเท่าเดิม</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {Seats.seatOptions(s.minutes).map((o) => (
            <button key={`${o.offset}-${o.minutes}`} type="button" aria-pressed={!custom && same(o, pick)} onClick={() => { setPick(o); setCustom(false) }}
              className={cn("flex items-center justify-between rounded-xl border px-3 py-2 text-sm", !custom && same(o, pick) ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted/50")}>
              <span>{Seats.seatLabel(o, s.minutes)}</span><span className="text-xs text-muted-foreground tabular-nums">{Seats.seatTime(s.start, o)}</span>
            </button>
          ))}
          <div className={cn("space-y-2 rounded-xl border px-3 py-2 text-sm", custom ? "border-primary bg-primary/5" : "")}>
            <button type="button" className="w-full text-left font-medium" onClick={() => setCustom(true)}>กำหนดเอง</button>
            {custom && (
              <div className="flex flex-wrap items-center gap-2">
                เริ่ม <Input type="time" step={300} className="h-8 w-28" value={from} onChange={(e) => setFrom(e.target.value)} />
                เรียน <Input type="number" min={5} step={5} className="h-8 w-20" value={mins} onChange={(e) => setMins(e.target.value)} /> นาที
                {!customError && <span className="text-xs text-muted-foreground tabular-nums">{Seats.seatTime(s.start, customSeat)}</span>}
                {customError && <span className="w-full text-xs text-red-700">{customError}</span>}
              </div>
            )}
          </div>
        </div>
        {klass && (
          <div className="flex gap-1.5">
            {([["session", "เฉพาะคาบนี้"], ["class", "ทุกคาบของคลาสนี้"]] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)}
                className={cn("flex-1 rounded-full border px-3 py-1.5 text-sm", scope === k ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}>{label}</button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={custom && !!customError} onClick={() => report(setSeat(scope, scope === "class" ? klass!.id : s.id, studentId, chosen), "บันทึกเวลาเรียนแล้ว") && onClose()}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Student moved out of this session — says where to, click opens that session, ⋮ undo */
function MovedOutRow({ s, studentId, toSessionId, canManage }: { s: Session; studentId: ID; toSessionId: ID; canManage: boolean }) {
  const to = useStore((st) => st.sessions.find((x) => x.id === toSessionId))
  const toClass = useStore((st) => st.classes.find((k) => k.id === to?.classId))
  const undo = useStore((st) => st.undoReschedule)
  const families = useStore((st) => st.families)
  const L = useLookup()
  const [open, setOpen] = useState(false)
  const stu = L.student(studentId)
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="w-4 shrink-0" />
      <span className="relative shrink-0">
        <span className={cn("grid size-11 place-items-center rounded-full text-base font-semibold opacity-60", avatarTone(studentId))}>{initial(stu?.nickname ?? "?")}</span>
        <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-amber-100 text-amber-700 ring-2 ring-background"><LogOutIcon className="size-3" /></span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-muted-foreground">{stu?.name} ({stu?.nickname})</p>
        <p className="truncate text-xs text-muted-foreground">{families.find((f) => f.id === stu?.familyId)?.name ?? "—"}</p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", gradeTone(stu?.grade ?? ""))}>{stu?.grade}</span>
      {to && (
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-right text-xs text-amber-700 hover:underline" title="เปิดคาบที่ย้ายไป">
          <span className="flex items-center justify-end gap-1 font-medium"><CalendarClockIcon className="size-4" /> ย้ายไป</span>
          <span className="text-[11px]">{fmtDate(to.date, { weekday: true })} · {to.start}–{endTime(to.start, to.minutes)}{toClass ? ` · ${toClass.name}` : ""}</span>
        </button>
      )}
      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="จัดการการย้าย" />}><EllipsisVerticalIcon /></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => report(undo(s.id, studentId), `${stu?.nickname} กลับมาเรียนคาบนี้แล้ว`)}><ChevronLeftIcon /> ยกเลิกการย้าย</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      ) : <span className="w-8 shrink-0" />}
      <SessionSheet sessionId={open ? toSessionId : null} onClose={() => setOpen(false)} />
    </li>
  )
}

/** "Select date for Reschedule" (owner design): same subject, any day of THIS week, sessions grouped by teacher */
function RescheduleDialog({ from, studentId, onClose }: { from: Session; studentId: ID; onClose: () => void }) {
  const sessions = useStore((st) => st.sessions)
  const classes = useStore((st) => st.classes)
  const move = useStore((st) => st.rescheduleStudent)
  const addSession = useStore((st) => st.addSession)
  const staff = useStore((st) => st.staff)
  const branch = useBranch()
  const now = useNow(30_000)
  const L = useLookup()
  const monday = mondayOf(from.date)
  const [subject, setSubject] = useState(from.subject)
  const [day, setDay] = useState(from.date)
  const [pick, setPick] = useState<ID | null>(null)
  // no suitable session that day → open a new one (Admin agreed it with teacher + parent first)
  const [creating, setCreating] = useState(false)
  const [nStart, setNStart] = useState(from.start)
  const [nMinutes, setNMinutes] = useState(from.minutes)
  const [nTeacher, setNTeacher] = useState(from.teacherId ?? "")
  const [nRoom, setNRoom] = useState(from.roomId ?? "")
  const [agreed, setAgreed] = useState(false)
  const teachers = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  const createAndMove = () => {
    const r = addSession({ branchId: from.branchId, classId: null, subject: from.subject, subjects: from.subjects, date: day, start: nStart, minutes: nMinutes, teacherId: nTeacher || null, coTeacherIds: [], roomId: nRoom || null, studentIds: [], trial: false })
    if (!r.ok) return report(r, "")
    if (report(move(from.id, studentId, r.value.id), `สร้างคาบใหม่ ${fmtDate(day, { weekday: true })} ${nStart} และย้ายแล้ว`)) onClose()
  }
  const options = sessions
    .filter((x) => x.branchId === from.branchId && x.date === day && x.id !== from.id && !x.cancelled && subjectsOf(x).includes(subject))
    .sort((a, b) => a.start.localeCompare(b.start))
  const byTeacher = [...new Set(options.map((x) => x.teacherId ?? ""))]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarClockIcon className="size-5" /> เลือกวันสำหรับย้ายคาบ</DialogTitle>
          <DialogDescription>{L.student(studentId)?.nickname} · ย้ายได้ภายในสัปดาห์นี้เท่านั้น ({fmtDate(monday)} – {fmtDate(addDays(monday, 6), { year: true })}) · ข้ามสัปดาห์ให้บันทึกเป็นการลา</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect className="h-9 w-32" value={subject} onChange={(e) => { setSubject(e.target.value); setPick(null) }} options={branch.subjects.map((x) => ({ value: x, label: x }))} />
          <div className="ml-auto flex items-center gap-1 rounded-full bg-muted px-1 py-1">
            <Button size="icon-sm" variant="ghost" aria-label="วันก่อน" disabled={day <= monday} onClick={() => { setDay(addDays(day, -1)); setPick(null) }}><ChevronLeftIcon /></Button>
            <span className="min-w-28 text-center text-sm font-medium">{fmtDate(day, { weekday: true })}{day === from.date && <span className="block text-[10px] font-normal text-muted-foreground">วันเดิม</span>}</span>
            <Button size="icon-sm" variant="ghost" aria-label="วันถัดไป" disabled={day >= addDays(monday, 6)} onClick={() => { setDay(addDays(day, 1)); setPick(null) }}><ChevronRightIcon /></Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {options.length === 0 && <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">วันนี้ไม่มีคาบวิชา{subject} — ลองวันอื่นในสัปดาห์ หรือสร้างคาบใหม่ด้านล่าง</p>}
          {byTeacher.map((tid) => (
            <section key={tid || "none"} className="space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className={cn("grid size-7 place-items-center rounded-full text-xs font-semibold", avatarTone(tid || "none"))}>{initial(L.teacher(tid || null).label)}</span>
                {L.teacher(tid || null).label} <span className="text-xs font-normal text-muted-foreground">· {options.filter((x) => (x.teacherId ?? "") === tid).length} คาบ</span>
              </p>
              {options.filter((x) => (x.teacherId ?? "") === tid).map((x) => {
                const k = classes.find((c) => c.id === x.classId)
                const cap = k ? CAPACITY[k.type] : CAPACITY.group
                const check = canRescheduleStudent(from, x, studentId, now, cap)
                return (
                  <button key={x.id} type="button" disabled={!check.ok} onClick={() => setPick(x.id)} title={check.ok ? undefined : check.error}
                    className={cn("flex w-full items-center gap-3 rounded-2xl p-3 text-left transition", pick === x.id ? "bg-rose-100 ring-2 ring-primary dark:bg-rose-950" : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40", !check.ok && "cursor-not-allowed opacity-50")}>
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", pick === x.id ? "border-primary" : "border-muted-foreground/50")}>{pick === x.id && <span className="size-2.5 rounded-full bg-primary" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{k?.name ?? subjectsOf(x).join(" + ")}</span>
                      <span className="block text-xs text-muted-foreground">{x.start}–{endTime(x.start, x.minutes)} · {L.room(x.roomId)} · {x.studentIds.length}/{cap} คน{!check.ok ? ` · ${check.error}` : ""}</span>
                    </span>
                    <Pill tone={k?.type === "single" ? "gray" : "blue"}>{k?.type === "single" ? "เดี่ยว" : "กลุ่ม"}</Pill>
                    {k?.grades.slice(0, 2).map((g) => <span key={g} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", gradeTone(g))}>{g}</span>)}
                  </button>
                )
              })}
            </section>
          ))}
          <section className={cn("rounded-2xl border border-dashed p-3", creating && "border-primary bg-primary/5")}>
            <button type="button" onClick={() => { setCreating(!creating); setPick(null) }} className="flex w-full items-center gap-2 text-left text-sm font-medium">
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", creating ? "border-primary" : "border-muted-foreground/50")}>{creating && <span className="size-2.5 rounded-full bg-primary" />}</span>
              สร้างคาบใหม่ {fmtDate(day, { weekday: true })} (วัน/เวลาที่ยังไม่มีคาบ)
            </button>
            {creating && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">เวลาเริ่ม</Label><Input type="time" step={300} value={nStart} onChange={(e) => setNStart(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">ความยาว (นาที)</Label><Input type="number" min={5} step={5} value={nMinutes} onChange={(e) => setNMinutes(Number(e.target.value))} /></div>
                  <div className="space-y-1"><Label className="text-xs">ครู</Label><NativeSelect value={nTeacher} onChange={(e) => setNTeacher(e.target.value)} placeholder="ยังไม่มีครู" options={teachers.map((t) => ({ value: t.id, label: t.nickname }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">ห้อง</Label><NativeSelect value={nRoom} onChange={(e) => setNRoom(e.target.value)} placeholder="ยังไม่ระบุ" options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} /></div>
                </div>
                <label className="flex items-start gap-2 text-xs"><Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" /> ตกลงวัน/เวลากับครูและผู้ปกครองแล้ว</label>
                <p className="text-[11px] text-muted-foreground">ระบบตรวจครู/ห้องชน และวันหยุดให้ · คาบใหม่เป็นคาบเดี่ยว ใช้แพ็กเกจเดิมของนักเรียน</p>
              </div>
            )}
          </section>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          {creating
            ? <Button disabled={!agreed || nMinutes < 5} onClick={createAndMove}><CheckIcon /> สร้างคาบและย้าย</Button>
            : <Button disabled={!pick} onClick={() => pick && report(move(from.id, studentId, pick), "ย้ายคาบแล้ว") && onClose()}><CheckIcon /> ยืนยัน</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RemoveDialog({ s, studentId, onClose }: { s: Session; studentId: ID; onClose: () => void }) {
  const removeOne = useStore((st) => st.removeStudentFromSession)
  const removeClass = useStore((st) => st.removeStudentFromClass)
  const L = useLookup()
  const [scope, setScope] = useState<MoveScope>("one")
  const name = L.student(studentId)?.nickname
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เอา {name} ออกจากคลาส?</DialogTitle>
          <DialogDescription>เช่น เพิ่มมาผิดคน · ประวัติการเรียนและการเงินยังอยู่ครบ</DialogDescription>
        </DialogHeader>
        <ScopePick value={scope} onChange={setScope} hasClass={!!s.classId} one="เฉพาะคาบนี้" following="ออกจากคลาสนี้ (คาบนี้และคาบถัดไปทั้งหมด)" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ไม่เอาออก</Button>
          <Button variant="destructive" onClick={() =>
            (scope === "following" && s.classId
              ? report(removeClass(s.classId, studentId), (v) => `เอา ${name} ออกจากคลาสแล้ว · ${v.removedFrom} คาบ`)
              : report(removeOne(s.id, studentId), `เอา ${name} ออกจากคาบนี้แล้ว`)) && onClose()}>
            <UserMinusIcon /> เอาออก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Delete: this session (cancel with reason, team notified) or the whole class (every session not started yet) */
function DeleteDialog({ s, canCancel, onClose, onDone }: { s: Session; canCancel: boolean; onClose: () => void; onDone: () => void }) {
  const cancel = useStore((st) => st.cancelSession)
  const deactivate = useStore((st) => st.deactivateClass)
  const klass = useStore((st) => st.classes.find((c) => c.id === s.classId))
  const [what, setWhat] = useState<"session" | "class">(canCancel ? "session" : "class")
  const [reason, setReason] = useState("")
  const [q] = useState(() => [2 + Math.floor(Math.random() * 7), 2 + Math.floor(Math.random() * 7)])
  const [answer, setAnswer] = useState("")
  const mathOk = Number(answer) === q[0] + q[1]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ลบ</DialogTitle>
          <DialogDescription>ระบบแจ้งทีมงานให้ติดต่อผู้ปกครอง · ประวัติที่เรียนไปแล้วยังอยู่</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <button type="button" disabled={!canCancel} onClick={() => setWhat("session")} className={cn("rounded-2xl border p-3 text-left text-sm disabled:opacity-40", what === "session" && "border-primary bg-primary/5 ring-1 ring-primary")}>
            <b>ยกเลิกคาบนี้</b> · {fmtDate(s.date, { weekday: true })} {s.start} · นักเรียน {s.studentIds.length} คน{!canCancel && " (คาบเริ่มไปแล้ว)"}
          </button>
          {klass?.active && (
            <button type="button" onClick={() => setWhat("class")} className={cn("rounded-2xl border p-3 text-left text-sm", what === "class" && "border-red-500 bg-red-50 ring-1 ring-red-500 dark:bg-red-950/30")}>
              <b>ลบทั้งคลาส {klass.name}</b> · ยกเลิกทุกคาบที่ยังไม่เริ่ม
            </button>
          )}
        </div>
        <div className="space-y-1"><Label>เหตุผล *</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ครูป่วย / ปิดคลาสเพราะนักเรียนไม่พอ" /></div>
        {what === "class" && (
          <div className="space-y-1"><Label>ยืนยัน: {q[0]} + {q[1]} = ?</Label><Input inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} /></div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ไม่ลบ</Button>
          <Button variant="destructive" disabled={!reason.trim() || (what === "class" && !mathOk)}
            onClick={() => (what === "session"
              ? report(cancel(s.id, reason), (v) => `ยกเลิกคาบแล้ว · นักเรียน ${v.students} คน`)
              : report(deactivate(klass!.id, reason), (v) => `ลบคลาสแล้ว · ยกเลิก ${v.cancelled} คาบ`)) && (onClose(), onDone())}>
            <BanIcon /> ยืนยันลบ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Summary right under a present student (owner 2026-09-29) — text is owned by the dialog for multi-select submit */
function SummaryInline({ session, sessionId, studentId, summary, viewOnly, text, setText }: { session: Session; sessionId: ID; studentId: ID; summary?: LessonSummary; viewOnly: boolean; text: string; setText: (t: string) => void }) {
  const now = useNow(60_000)
  const due = Sum.sendDeadline(session, now)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const staff = useStore((s) => s.staff)
  const save = useStore((s) => s.saveSummary)
  const approve = useStore((s) => s.approveSummary)
  const requestChanges = useStore((s) => s.requestSummaryChanges)
  const send = useStore((s) => s.sendSummary)
  const [note, setNote] = useState("")
  const [asking, setAsking] = useState(false)
  // Book / Topic / Lesson Detail (owner 2026-09-30) — a new summary starts where this student left off
  const books = useStore((s) => s.lessonBooks)
  const topics = useStore((s) => s.lessonTopics)
  const allSummaries = useStore((s) => s.summaries)
  const allSessions = useStore((s) => s.sessions)
  const addBook = useStore((s) => s.addLessonBook)
  const addTopic = useStore((s) => s.addLessonTopic)
  const applyLesson = useStore((s) => s.applyLessonToSession)
  const [lesson, setLesson] = useState<SummaryLesson>(() => summary?.bookId || summary?.detail
    ? { bookId: summary.bookId, topicId: summary.topicId, detail: summary.detail ?? "" }
    : { ...Les.suggestLesson(studentId, allSummaries, new Map(allSessions.map((x) => [x.id, x.date])), topics), detail: "" })
  const [managing, setManaging] = useState<"book" | "topic" | null>(null)
  const attendance = useStore((s) => s.attendance)
  const others = attendance.filter((a) => a.sessionId === sessionId && a.status === "present" && a.studentId !== studentId).length
  const branchBooks = Les.booksOf(session.branchId, books)
  const bookTopics = lesson.bookId ? Les.topicsOf(lesson.bookId, topics) : []
  const status = summary?.status
  const editable = !viewOnly && (!status || status === "draft" || status === "changes_requested")
  const lastChange = summary?.history.findLast((h) => h.action === "request_changes")
  const who = (id: ID) => staff.find((x) => x.id === id)?.nickname ?? "?"
  const tone = status === "approved" ? "green" : status === "submitted" ? "amber" : status === "changes_requested" ? "red" : status === "sent" ? "blue" : "gray"

  return (
    <div className="rounded-2xl bg-muted/40 p-2.5">
      <div className="mb-1.5 flex items-center gap-2 text-xs">
        <span className="font-medium">สรุปการเรียน</span>
        <Pill tone={tone}>{status ? SUMMARY_STATUS_LABEL[status] : "ยังไม่เขียน"}</Pill>
        {status !== "sent" && (
          <span className={cn("text-[11px]", due.overdue ? "font-medium text-red-700" : due.daysLeft <= 2 ? "text-amber-700" : "text-muted-foreground")}>
            {due.overdue ? `เลยกำหนดส่งผู้ปกครอง ${-due.daysLeft} วัน` : `ส่งผู้ปกครองภายใน ${fmtDate(due.deadline, { weekday: true })}`}
          </span>
        )}
        {summary && <span className="ml-auto text-[11px] text-muted-foreground">{who(summary.lastEditorId)} · {fmtDateTime(summary.history[summary.history.length - 1]?.at ?? new Date().toISOString())}</span>}
      </div>
      {status === "changes_requested" && lastChange?.note && <p className="mb-1.5 rounded-md bg-red-50 p-2 text-xs text-red-800">ขอแก้: {lastChange.note}</p>}
      {editable ? (
        <div className="space-y-2 pt-1">
          <div className="grid gap-2 sm:grid-cols-2">
            <CatalogCombo label="Book · หนังสือ" items={branchBooks} value={lesson.bookId} placeholder="Book · เลือก/พิมพ์ชื่อหนังสือ"
              onChange={(bookId) => setLesson((l) => ({ ...l, bookId, topicId: undefined }))}
              onCreate={(name) => addBook(session.branchId, name)} onManage={() => setManaging("book")} />
            <CatalogCombo label="Lesson Topic · บทเรียน" items={bookTopics} value={lesson.topicId} disabled={!lesson.bookId} placeholder={lesson.bookId ? "Lesson Topic · เลือก/พิมพ์บทเรียน" : "Lesson Topic · เลือกหนังสือก่อน"}
              onChange={(topicId) => setLesson((l) => ({ ...l, topicId }))}
              onCreate={(name) => addTopic(lesson.bookId!, name)} onManage={() => setManaging("topic")} />
          </div>
          <Input value={lesson.detail ?? ""} onChange={(e) => setLesson((l) => ({ ...l, detail: e.target.value }))} placeholder="Lesson Detail · เช่น หน้า 12–15 แบบฝึกหัด 2.1" aria-label="Lesson Detail" />
          {/* same lesson for the whole class in one tap — anyone different is edited on their own row (owner 2026-09-30) */}
          {others > 0 && (lesson.bookId || lesson.topicId || lesson.detail?.trim()) && (
            <button type="button" className="text-xs text-primary underline"
              onClick={() => report(applyLesson(sessionId, lesson), (v) => `ใช้หนังสือ/บทเรียนนี้กับ ${v.count} คนที่มาเรียนแล้ว — แก้รายคนได้`)}>
              ใช้หนังสือ / บทเรียน / รายละเอียดนี้กับทุกคนที่มาเรียน ({others + 1} คน)
            </button>
          )}
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Feedback Summary · พัฒนาการ / สิ่งที่ทำได้ดี / สิ่งที่ต้องฝึกเพิ่ม" rows={3} aria-label="Feedback Summary" />
        </div>
      ) : (
        <div className="space-y-0.5 text-sm">
          {(summary?.bookId || summary?.topicId) && <p className="text-xs text-muted-foreground">📚 {books.find((b) => b.id === summary.bookId)?.name ?? "—"}{summary.topicId && ` · ${topics.find((t) => t.id === summary.topicId)?.name ?? ""}`}</p>}
          {summary?.detail && <p className="text-xs text-muted-foreground">📝 {summary.detail}</p>}
          <p className="whitespace-pre-wrap">{summary?.text || "ยังไม่มีสรุป"}</p>
        </div>
      )}
      {managing && <CatalogManager kind={managing} items={managing === "book" ? branchBooks : bookTopics} onClose={() => setManaging(null)} />}
      <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
        {editable && (
          <>
            <Button size="xs" variant="ghost" onClick={() => report(save(sessionId, studentId, text, false, lesson), "บันทึกร่างแล้ว")}>Save Draft</Button>
            <Button size="xs" disabled={!text.trim()} onClick={() => report(save(sessionId, studentId, text, true, lesson), "ส่งให้ผู้อนุมัติแล้ว")}><SendIcon /> {status === "changes_requested" ? "ส่งอีกครั้ง" : "ส่งอนุมัติ"}</Button>
          </>
        )}
        {status === "submitted" && can(me, "summary.approve") && summary && !Sum.canApprove(summary, me).ok && (
          <>
            <span className="mr-auto self-center text-xs text-muted-foreground">คุณเป็นคนเขียน/แก้ล่าสุด — ต้องให้คนอื่นอนุมัติ</span>
            {Sum.canForceApprove(summary, me, "x").ok && <ForceApprove onForce={(remark) => approve(summary.id, remark)} success="Force Approve แล้ว — แจ้งทั้งสาขา + Director" />}
          </>
        )}
        {status === "submitted" && summary && Sum.canApprove(summary, me).ok && (
          <>
            <Button size="xs" variant="outline" onClick={() => setAsking(true)}><XIcon /> ขอแก้ไข</Button>
            <Button size="xs" onClick={() => report(approve(summary.id), "อนุมัติแล้ว — ยังไม่ได้ส่งผู้ปกครอง")}><CheckIcon /> อนุมัติ</Button>
          </>
        )}
        {status === "approved" && can(me, "summary.approve") && summary && (
          <>
            <Button size="xs" variant="outline" onClick={() => setAsking(true)}><XIcon /> ดึงกลับไปแก้</Button>
            <Button size="xs" onClick={() => report(send(summary.id), "ส่งผู้ปกครองทาง LINE แล้ว")}><SendIcon /> ส่งผู้ปกครอง</Button>
          </>
        )}
      </div>
      {asking && summary && (
        <div className="mt-1.5 space-y-1.5">
          <Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="บอกครูว่าต้องแก้อะไร (จำเป็น)" rows={2} className="bg-background" />
          <div className="flex justify-end gap-1.5">
            <Button size="xs" variant="ghost" onClick={() => setAsking(false)}>ยกเลิก</Button>
            <Button size="xs" disabled={!note.trim()} onClick={() => report(requestChanges(summary.id, note), "ส่งกลับให้ครูแก้แล้ว") && setAsking(false)}>ส่งกลับ</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Teacher on leave (owner 2026-09-30): a substitute teaches this session, or it is cancelled and every student's
 *  package end moves out by one class. */
function TeacherLeaveDialog({ s, onClose }: { s: Session; onClose: () => void }) {
  const staff = useStore((st) => st.staff)
  const act = useStore((st) => st.teacherLeave)
  const L = useLookup()
  const [reason, setReason] = useState("")
  const [mode, setMode] = useState<"sub" | "cancel">("sub")
  const [subId, setSubId] = useState("")
  // regular teachers first, then part-time ones (owner 2026-09-30: a part-time teacher can cover)
  const teachers = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(s.branchId) && t.id !== s.teacherId)
    .sort((a, b) => Number(!!a.partTime) - Number(!!b.partTime))
  const teaches = (t: (typeof teachers)[number]) => subjectsOf(s).every((x) => t.subjects.includes(x))
  const submit = () => report(act(s.id, { reason, substituteId: mode === "sub" ? subId || null : null }),
    (v) => (mode === "sub" ? `${L.teacher(subId).label} สอนแทนแล้ว` : `ยกเลิกคาบแล้ว · เลื่อนวันจบคอร์สให้นักเรียน ${v.extended} คน`)) && onClose()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{L.teacher(s.teacherId).label} ลา</DialogTitle>
          <DialogDescription>{s.subject} · {fmtDate(s.date, { weekday: true })} {s.start}–{endTime(s.start, s.minutes)} · นักเรียน {s.studentIds.length} คน</DialogDescription>
        </DialogHeader>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เหตุผลที่ลา เช่น ป่วย / ลากิจ" />
        <div className="grid gap-2">
          {([["sub", "มีครูสอนแทน", "นักเรียนเรียนตามปกติ"], ["cancel", "ไม่มีครูสอนแทน — ยกเลิกคาบ", "วันเรียนจบของนักเรียนทุกคนเลื่อนออกไป 1 คาบ"]] as const).map(([k, label, hint]) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}
              className={cn("rounded-xl border p-3 text-left", mode === k ? (k === "cancel" ? "border-red-400 bg-red-50 dark:bg-red-950/30" : "border-primary bg-primary/5") : "hover:bg-muted/50")}>
              <p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{hint}</p>
            </button>
          ))}
        </div>
        {mode === "sub" && (
          <NativeSelect value={subId} onChange={(e) => setSubId(e.target.value)} placeholder="เลือกครูสอนแทน"
            options={[...teachers.filter(teaches), ...teachers.filter((t) => !teaches(t))].map((t) => ({ value: t.id, label: `${t.nickname}${t.partTime ? " · Part-time" : ""}${teaches(t) ? "" : ` (ไม่ได้สอน${s.subject})`}` }))} />
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant={mode === "cancel" ? "destructive" : "default"} disabled={!reason.trim() || (mode === "sub" && !subId)} onClick={submit}>
            {mode === "sub" ? "ให้ครูสอนแทน" : "ยกเลิกคาบ + เลื่อนวันจบ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditSessionDialog({ id, onClose }: { id: ID; onClose: () => void }) {
  const s = useStore((st) => st.sessions.find((x) => x.id === id)!)
  const staff = useStore((st) => st.staff)
  const edit = useStore((st) => st.editSession)
  const branch = useBranch()
  const [date, setDate] = useState(s.date)
  const [start, setStart] = useState(s.start)
  const [teacherId, setTeacherId] = useState(s.teacherId ?? "")
  const [roomId, setRoomId] = useState(s.roomId ?? "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>แก้เฉพาะคาบนี้</DialogTitle>
          <DialogDescription>คาบอื่นของคลาสไม่เปลี่ยน · คาบนี้จะไม่ถูกทับเมื่อแก้ทั้งคลาส</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>วันที่</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>เวลาเริ่ม</Label><Input type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>ครู</Label>
            <NativeSelect value={teacherId} onChange={(e) => setTeacherId(e.target.value)} placeholder="ยังไม่มีครู"
              options={staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id)).map((t) => ({ value: t.id, label: t.nickname }))} />
          </div>
          <div className="space-y-1">
            <Label>ห้อง</Label>
            <NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ยังไม่ระบุ" options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">เดิม: {fmtDate(s.date, { weekday: true })} {s.start} → ใหม่: {fmtDate(date, { weekday: true })} {start}</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => report(edit(id, { date, start, teacherId: teacherId || null, roomId: roomId || null }), "แก้คาบนี้แล้ว") && onClose()}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ScopePick({ value, onChange, hasClass, one, following }: { value: MoveScope; onChange: (v: MoveScope) => void; hasClass: boolean; one: string; following: string }) {
  if (!hasClass) return null
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {([["one", one], ["following", following]] as const).map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={cn("rounded-lg border p-2.5 text-left text-sm", value === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50")}>
          {label}
        </button>
      ))}
    </div>
  )
}

/** Change the primary teacher and/or add co-teachers — this session or this + following */
function TeachersDialog({ id, onClose }: { id: ID; onClose: () => void }) {
  const s = useStore((st) => st.sessions.find((x) => x.id === id)!)
  const staff = useStore((st) => st.staff)
  const update = useStore((st) => st.updateSessionTeachers)
  const branch = useBranch()
  const [sel, setSel] = useState({ ids: [s.teacherId, ...s.coTeacherIds].filter(Boolean) as string[], primaryId: s.teacherId ?? "" })
  const [scope, setScope] = useState<MoveScope>("one")
  const teachers = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>เปลี่ยน / เพิ่มครู</DialogTitle>
          <DialogDescription>เลือกได้หลายคน · กด ★ เพื่อเลือกครูหลัก · ระบบตรวจเวลาชนของครูทุกคน</DialogDescription>
        </DialogHeader>
        <TeacherPicker teachers={teachers} subject={s.subject} value={sel} onChange={setSel} />
        <ScopePick value={scope} onChange={setScope} hasClass={!!s.classId} one="เฉพาะคาบนี้" following="คาบนี้และคาบถัดไปทั้งหมด (อัปเดตคลาสด้วย)" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button
            onClick={() =>
              report(update(id, sel.primaryId || null, sel.ids.filter((x) => x !== sel.primaryId), scope), (v) => `อัปเดตครูแล้ว ${v.changed} คาบ${v.kept ? ` (คงเดิม ${v.kept} คาบที่แก้แยก/เช็คชื่อแล้ว)` : ""}`) && onClose()
            }
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Add a student to this session (trial / make-up) or to the class from now on */
function AddStudentDialog({ id, onClose }: { id: ID; onClose: () => void }) {
  const s = useStore((st) => st.sessions.find((x) => x.id === id)!)
  const klass = useStore((st) => st.classes.find((c) => c.id === s.classId))
  const students = useStore((st) => st.students)
  const entitlements = useEntitlements()
  const add = useStore((st) => st.addStudentToSession)
  const branch = useBranch()
  const [scope, setScope] = useState<MoveScope>(s.classId ? "following" : "one")
  const cap = klass ? CAPACITY[klass.type] : CAPACITY.group
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>เพิ่มนักเรียน</DialogTitle>
          <DialogDescription>ตอนนี้ {s.studentIds.length}/{cap} คน{klass ? ` · คลาส ${klass.name} (${klass.grades.join(", ")})` : ""}</DialogDescription>
        </DialogHeader>
        <ScopePick value={scope} onChange={setScope} hasClass={!!s.classId} one="เฉพาะคาบนี้ (ทดลอง / ชดเชย)" following="เข้าคลาสถาวร (คาบนี้และถัดไป)" />
        <StudentSearch
          autoFocus
          students={students.filter((x) => x.branchId === branch.id)}
          exclude={s.studentIds}
          preferGrades={klass?.grades}
          onPick={(x) => { if (s.studentIds.length < cap && report(add(id, x.id, scope), (v) => `เพิ่ม ${x.nickname} แล้ว ${v.changed} คาบ`)) onClose() }}
          renderMeta={(x) => (
            <span className="shrink-0 text-[11px] text-amber-700">
              {!!klass && Att.gradeMismatch(x, klass) ? "ชั้นไม่ตรงคลาส " : ""}
              {!s.trial && !Att.coveringEntitlement(x.id, s, entitlements) ? "ยังไม่จ่ายค่าเรียน" : ""}
            </span>
          )}
        />
        {s.studentIds.length >= cap && <p className="text-xs text-red-700">คาบนี้เต็มแล้ว ({cap} คน)</p>}
      </DialogContent>
    </Dialog>
  )
}
