"use client"

import { useMemo, useState } from "react"
import { AlertTriangleIcon, BanIcon, CheckIcon, PencilIcon, SearchIcon, SendIcon, StarIcon, UndoIcon, UserPlusIcon, UsersRoundIcon, XIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { endTime, fmtDate, fmtDateTime } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import { findConflicts, sessionState } from "@/domain/rules/scheduling"
import * as Sum from "@/domain/rules/summaries"
import { SUMMARY_STATUS_LABEL } from "@/domain/rules/summaries"
import type { AttendanceStatus, ID, LessonSummary } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Pill, SessionStateBadge } from "./badges"
import { NativeSelect } from "./native-select"
import { StudentSheet } from "./student-sheet"
import { gradeTone } from "./subject-color"
import { TeacherPicker } from "./teacher-picker"
import { CAPACITY, type MoveScope } from "@/domain/rules/scheduling"

const MARKS: { status: AttendanceStatus; label: string; cls: string }[] = [
  { status: "present", label: "มา", cls: "data-[on=true]:bg-emerald-600 data-[on=true]:text-white" },
  { status: "absent", label: "ขาด", cls: "data-[on=true]:bg-red-600 data-[on=true]:text-white" },
  { status: "leave", label: "ลา", cls: "data-[on=true]:bg-amber-500 data-[on=true]:text-white" },
]

export function SessionSheet({ sessionId, onClose }: { sessionId: ID | null; onClose: () => void }) {
  return (
    <Sheet open={!!sessionId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">{sessionId && <Body id={sessionId} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function Body({ id, onClose }: { id: ID; onClose: () => void }) {
  const s = useStore((st) => st.sessions.find((x) => x.id === id))
  const klass = useStore((st) => st.classes.find((c) => c.id === s?.classId))
  const allSessions = useStore((st) => st.sessions)
  const staff = useStore((st) => st.staff)
  const attendance = useStore((st) => st.attendance)
  const summaries = useStore((st) => st.summaries)
  const entitlements = useStore((st) => st.entitlements)
  const me = useStore((st) => st.staff.find((x) => x.id === st.userId)!)
  const mark = useStore((st) => st.mark)
  const clearMark = useStore((st) => st.clearMark)
  const now = useNow(10_000)
  const branch = useBranch()
  const L = useLookup()
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [teachersOpen, setTeachersOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [studentOpen, setStudentOpen] = useState<string | null>(null)

  const conflicts = useMemo(() => (s ? findConflicts(allSessions.filter((x) => x.date === s.date), branch, staff).filter((c) => c.sessionIds.includes(s.id)) : []), [allSessions, s, branch, staff])
  if (!s) return null
  const state = sessionState(s, now)
  const teacher = L.teacher(s.teacherId)
  const canManage = can(me, "session.manage")
  const mine = s.teacherId === me.id
  const canMarkHere = can(me, "attendance.mark") && (canManage || mine)

  return (
    <>
      <SheetHeader className="border-b pb-3">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <SessionStateBadge state={state} />
          {s.trial && <Pill tone="violet">ทดลองเรียน</Pill>}
          {s.customized && s.classId && <Pill>แก้เฉพาะคาบนี้</Pill>}
        </div>
        <SheetTitle className="text-lg">{klass?.name ?? `${s.subject} (คาบเดี่ยว)`}</SheetTitle>
        <SheetDescription>
          {fmtDate(s.date, { weekday: true, year: true })} · {s.start}–{endTime(s.start, s.minutes)} · {L.room(s.roomId)} ·{" "}
          <span className={cn(teacher.missing && "font-medium text-amber-700")}>★ {teacher.label}</span>
          {s.coTeacherIds.length > 0 && <> · ผู้ช่วย {s.coTeacherIds.map((t) => L.teacher(t).label).join(", ")}</>}
        </SheetDescription>
        {s.cancelled && <p className="text-sm text-red-700">ยกเลิกแล้ว: {s.cancelReason}</p>}
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>คาบนี้ชนกับคาบอื่น</AlertTitle>
            <AlertDescription>{conflicts.map((c) => c.message).join(" · ")}</AlertDescription>
          </Alert>
        )}

        {canManage && state === "upcoming" && !s.cancelled && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon /> แก้คาบนี้
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setCancelling(true)}>
              <BanIcon /> ยกเลิกคาบ
            </Button>
          </div>
        )}

        <section className="rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">ครูผู้สอน</h3>
            {canManage && state === "upcoming" && !s.cancelled && (
              <Button size="xs" variant="outline" onClick={() => setTeachersOpen(true)}><UsersRoundIcon /> เปลี่ยน / เพิ่มครู</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {!s.teacherId && <Pill tone="amber">ยังไม่มีครู</Pill>}
            {s.teacherId && <Pill tone="blue"><StarIcon className="size-3 fill-current" /> {L.teacher(s.teacherId).label} · ครูหลัก</Pill>}
            {s.coTeacherIds.map((t) => <Pill key={t}>{L.teacher(t).label} · ผู้ช่วย</Pill>)}
          </div>
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">เช็คชื่อ ({s.studentIds.length} คน)</h3>
            {canManage && state !== "closed" && !s.cancelled && (
              <Button size="xs" variant="outline" onClick={() => setAdding(true)}><UserPlusIcon /> เพิ่มนักเรียน</Button>
            )}
            {state === "upcoming" && <span className="text-xs text-muted-foreground">ยังไม่ถึงเวลาเรียน — บันทึกล่วงหน้าได้เฉพาะ &quot;ลา&quot;</span>}
            {state === "closed" && <span className="text-xs text-muted-foreground">ปิดแล้ว แก้ไม่ได้</span>}
          </div>
          {s.studentIds.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">ยังไม่มีนักเรียนในคาบนี้</p>}
          <ul className="divide-y rounded-lg border">
            {s.studentIds.map((sid) => {
              const stu = L.student(sid)
              const a = attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
              const ent = Att.activeEntitlements(sid, entitlements, s.date).find((e) => e.classId === s.classId)
              const bal = ent && Att.balance(ent, allSessions, attendance)
              return (
                <li key={sid} className="flex flex-wrap items-center gap-3 p-2.5">
                  <div className="min-w-0 flex-1">
                    <button onClick={() => setStudentOpen(sid)} className="truncate text-left text-sm font-medium hover:text-primary hover:underline">
                      {stu?.nickname ?? "?"} <span className="text-xs font-normal text-muted-foreground">{stu?.grade}</span>
                    </button>
                    <div className="text-xs text-muted-foreground">
                      {s.trial ? "ทดลองเรียน" : !ent ? <span className="text-amber-700">ไม่มีแพ็กเกจที่ครอบคลุมวันนี้</span> : ent.kind === "subscription" ? `รายเดือน ถึง ${fmtDate(ent.to)}` : `เหลือ ${bal!.remaining}/${bal!.total} คาบ`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {MARKS.map((m) => {
                      const allowed = canMarkHere && Att.canMark(s, m.status, now).ok
                      return (
                        <button
                          key={m.status}
                          data-on={a?.status === m.status}
                          disabled={!allowed}
                          onClick={() => report(mark(s.id, sid, m.status), `${stu?.nickname}: ${m.label}`)}
                          className={cn("h-8 min-w-11 rounded-md border px-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40", m.cls)}
                        >
                          {m.label}
                        </button>
                      )
                    })}
                    {a && canMarkHere && state !== "closed" && (
                      <Button size="icon-sm" variant="ghost" aria-label="ล้างการเช็คชื่อ" onClick={() => report(clearMark(s.id, sid), `ล้างการเช็คชื่อ ${stu?.nickname}`)}>
                        <UndoIcon />
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">สรุปการเรียน</h3>
          <p className="mb-2 text-xs text-muted-foreground">เขียนได้เฉพาะนักเรียนที่ &quot;มา&quot; · ครูเขียน → ส่งอนุมัติ → คนอื่นอนุมัติ → ส่งผู้ปกครอง</p>
          <div className="space-y-3">
            {s.studentIds
              .filter((sid) => attendance.find((x) => x.sessionId === s.id && x.studentId === sid)?.status === "present")
              .map((sid) => (
                <SummaryEditor key={sid} sessionId={s.id} studentId={sid} summary={summaries.find((x) => x.sessionId === s.id && x.studentId === sid)} />
              ))}
            {!attendance.some((x) => x.sessionId === s.id && x.status === "present") && <p className="text-sm text-muted-foreground">ยังไม่มีนักเรียนที่เช็คว่ามา</p>}
          </div>
        </section>
        <p className="text-[11px] text-muted-foreground">รหัสคาบ {s.id}</p>
      </div>

      {editing && <EditSessionDialog id={s.id} onClose={() => setEditing(false)} />}
      {teachersOpen && <TeachersDialog id={s.id} onClose={() => setTeachersOpen(false)} />}
      {adding && <AddStudentDialog id={s.id} onClose={() => setAdding(false)} />}
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
      {cancelling && <CancelSessionDialog id={s.id} students={s.studentIds.length} onClose={() => setCancelling(false)} onDone={onClose} />}
    </>
  )
}

function SummaryEditor({ sessionId, studentId, summary }: { sessionId: ID; studentId: ID; summary?: LessonSummary }) {
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const staff = useStore((s) => s.staff)
  const save = useStore((s) => s.saveSummary)
  const approve = useStore((s) => s.approveSummary)
  const requestChanges = useStore((s) => s.requestSummaryChanges)
  const send = useStore((s) => s.sendSummary)
  const L = useLookup()
  const [text, setText] = useState(summary?.text ?? "")
  const [note, setNote] = useState("")
  const [asking, setAsking] = useState(false)
  const status = summary?.status
  const editable = !status || status === "draft" || status === "changes_requested"
  const lastChange = summary?.history.findLast((h) => h.action === "request_changes")
  const who = (id: ID) => staff.find((x) => x.id === id)?.nickname ?? "?"
  const tone = status === "approved" ? "green" : status === "submitted" ? "amber" : status === "changes_requested" ? "red" : status === "sent" ? "blue" : "gray"

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{L.student(studentId)?.nickname}</span>
        <Pill tone={tone}>{status ? SUMMARY_STATUS_LABEL[status] : "ยังไม่เขียน"}</Pill>
      </div>
      {status === "changes_requested" && lastChange?.note && <p className="mb-2 rounded-md bg-red-50 p-2 text-xs text-red-800">ขอแก้: {lastChange.note}</p>}
      {editable ? (
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="วันนี้เรียนอะไร / พัฒนาการ / การบ้าน" rows={3} />
      ) : (
        <p className="rounded-md bg-muted/50 p-2 text-sm whitespace-pre-wrap">{summary?.text}</p>
      )}
      {summary && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          เขียนโดย {who(summary.authorId)}
          {summary.lastEditorId !== summary.authorId && ` · แก้ล่าสุดโดย ${who(summary.lastEditorId)}`}
          {summary.history.length > 0 && ` · ${fmtDateTime(summary.history[summary.history.length - 1].at)}`}
        </p>
      )}
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        {editable && (
          <>
            <Button size="sm" variant="ghost" onClick={() => report(save(sessionId, studentId, text, false), "บันทึกร่างแล้ว")}>บันทึกร่าง</Button>
            <Button size="sm" onClick={() => report(save(sessionId, studentId, text, true), "ส่งให้ผู้อนุมัติแล้ว")}>
              <SendIcon /> {status === "changes_requested" ? "ส่งอนุมัติอีกครั้ง" : "ส่งอนุมัติ"}
            </Button>
          </>
        )}
        {status === "submitted" && can(me, "summary.approve") && summary && !Sum.canApprove(summary, me).ok && (
          <span className="mr-auto self-center text-xs text-muted-foreground">คุณเป็นคนเขียน/แก้ล่าสุด — ต้องให้คนอื่นอนุมัติ</span>
        )}
        {status === "submitted" && summary && Sum.canApprove(summary, me).ok && (
          <>
            <Button size="sm" variant="outline" onClick={() => setAsking(true)}><XIcon /> ขอแก้ไข</Button>
            <Button size="sm" onClick={() => summary && report(approve(summary.id), "อนุมัติแล้ว — ยังไม่ได้ส่งผู้ปกครอง")}><CheckIcon /> อนุมัติ</Button>
          </>
        )}
        {status === "approved" && can(me, "summary.approve") && (
          <>
            <Button size="sm" variant="outline" onClick={() => setAsking(true)}><XIcon /> ดึงกลับไปแก้</Button>
            <Button size="sm" onClick={() => summary && report(send(summary.id), "ส่งถึงผู้ปกครองทาง LINE แล้ว")}><SendIcon /> ส่งผู้ปกครอง</Button>
          </>
        )}
      </div>
      {asking && summary && (
        <div className="mt-2 space-y-2 rounded-md bg-muted/50 p-2">
          <Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="บอกครูว่าต้องแก้อะไร (จำเป็น)" rows={2} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>ยกเลิก</Button>
            <Button size="sm" disabled={!note.trim()} onClick={() => report(requestChanges(summary.id, note), "ส่งกลับให้ครูแก้แล้ว") && setAsking(false)}>ส่งกลับ</Button>
          </div>
        </div>
      )}
    </div>
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

function CancelSessionDialog({ id, students, onClose, onDone }: { id: ID; students: number; onClose: () => void; onDone: () => void }) {
  const cancel = useStore((st) => st.cancelSession)
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยกเลิกคาบนี้?</DialogTitle>
          <DialogDescription>
            มีนักเรียน <b>{students} คน</b> ในคาบนี้ — ระบบจะแจ้งเตือนทีมงานให้ติดต่อผู้ปกครอง
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label>เหตุผล *</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ครูป่วย / น้ำท่วม" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ไม่ยกเลิก</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => report(cancel(id, reason), (v) => `ยกเลิกคาบแล้ว · นักเรียน ${v.students} คน`) && (onClose(), onDone())}>
            ยืนยันยกเลิก
          </Button>
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
  const entitlements = useStore((st) => st.entitlements)
  const add = useStore((st) => st.addStudentToSession)
  const branch = useBranch()
  const [q, setQ] = useState("")
  const [scope, setScope] = useState<MoveScope>(s.classId ? "following" : "one")
  const cap = klass ? CAPACITY[klass.type] : CAPACITY.group
  const list = students
    .filter((x) => x.branchId === branch.id && !s.studentIds.includes(x.id))
    .filter((x) => !q || `${x.nickname} ${x.name} ${x.grade}`.includes(q))
    .sort((a, b) => Number(!!klass && Att.gradeMismatch(a, klass)) - Number(!!klass && Att.gradeMismatch(b, klass)))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>เพิ่มนักเรียน</DialogTitle>
          <DialogDescription>ตอนนี้ {s.studentIds.length}/{cap} คน{klass ? ` · คลาส ${klass.name} (${klass.grades.join(", ")})` : ""}</DialogDescription>
        </DialogHeader>
        <ScopePick value={scope} onChange={setScope} hasClass={!!s.classId} one="เฉพาะคาบนี้ (ทดลอง / ชดเชย)" following="เข้าคลาสถาวร (คาบนี้และถัดไป)" />
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" autoFocus placeholder="ค้นหาชื่อ / ชื่อเล่น / ชั้น" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
          {list.map((x) => {
            const mismatch = !!klass && Att.gradeMismatch(x, klass)
            const hasPkg = Att.activeEntitlements(x.id, entitlements, s.date).some((e) => e.classId === s.classId)
            return (
              <li key={x.id} className="flex items-center gap-2 p-2">
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{x.nickname}</span> <span className={cn("rounded px-1 text-[10px] font-semibold", gradeTone(x.grade))}>{x.grade}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {x.name}
                    {mismatch && <span className="text-amber-700"> · เกรดไม่ตรงคลาส</span>}
                    {s.classId && !hasPkg && <span className="text-amber-700"> · ยังไม่มีแพ็กเกจ</span>}
                  </span>
                </span>
                <Button size="xs" disabled={s.studentIds.length >= cap} onClick={() => report(add(id, x.id, scope), (v) => `เพิ่ม ${x.nickname} แล้ว ${v.changed} คาบ`) && onClose()}>เพิ่ม</Button>
              </li>
            )
          })}
          {list.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">ไม่พบนักเรียน</li>}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
