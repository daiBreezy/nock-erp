"use client"

import { staffAt } from "@/domain/rules/permissions"
import { useState } from "react"
import { PencilIcon, PowerIcon, UserMinusIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { Field } from "@/components/app/student-form"
import { gradeTone } from "@/components/app/subject-color"
import { TeacherPicker } from "@/components/app/teacher-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ClassDialog } from "@/components/app/class-dialog"
import { EntityPanel, FormShell, PanelBody, PanelFooter, PanelForm } from "@/components/app/form-shell"
import { Textarea } from "@/components/ui/textarea"
import { endTime, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { can } from "@/domain/rules/permissions"
import { CAPACITY, sessionState } from "@/domain/rules/scheduling"
import type { ID, Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * Class panel (owner 2026-10-09): View → แก้ไข → back, in one panel; "new" = the create-class form, closed when done
 * (it can create several classes at once). Header · Body · Bottom, actions in the bottom bar.
 * Used by the class list and the session dialog's "แก้คลาส".
 */
export function ClassSheet({ id, onClose, startEditing }: { id: ID | "new" | null; onClose: () => void; startEditing?: boolean }) {
  const [editing, setEditing] = useState(!!startEditing)
  return (
    <EntityPanel open={id !== null} onClose={onClose} wide={id === "new"}>
      {id === "new" ? (
        <PanelForm><ClassDialog prefill={{}} onClose={onClose} /></PanelForm>
      ) : id && (editing ? <ClassEdit id={id} onDone={() => setEditing(false)} /> : <ClassView id={id} onEdit={() => setEditing(true)} onClose={onClose} />)}
    </EntityPanel>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}

function ClassView({ id, onEdit, onClose }: { id: ID; onEdit: () => void; onClose: () => void }) {
  const k = useStore((s) => s.classes.find((c) => c.id === id)!)
  const sessions = useStore((s) => s.sessions)
  const me = useStore((s) => s.me())
  const deactivate = useStore((s) => s.deactivateClass)
  const remove = useStore((s) => s.removeStudentFromClass)
  const branch = useBranch()
  const now = useNow()
  const L = useLookup()
  const [closing, setClosing] = useState(false)
  const [reason, setReason] = useState("")
  const [removing, setRemoving] = useState<ID | null>(null)
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)
  const future = sessions.filter((s) => s.classId === k.id && !s.cancelled && sessionState(s, now) === "upcoming")
  const past = sessions.filter((s) => s.classId === k.id && s.date < toDateStr(now)).length
  const manage = can(me, "class.manage")
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <SheetTitle className="text-lg">{k.name}</SheetTitle>
        <SheetDescription>{k.subject} · {k.grades.join(", ")} · {k.type === "single" ? "เดี่ยว" : "กลุ่ม"}{!k.active && " · ปิดแล้ว"}</SheetDescription>
      </SheetHeader>
      <PanelBody>
        <div className="flex divide-x rounded-2xl bg-muted/50 py-2 text-center">
          <div className="flex-1"><p className="text-[11px] text-muted-foreground">เรียนไปแล้ว</p><p className="text-lg font-semibold tabular-nums">{past} คาบ</p></div>
          <div className="flex-1"><p className="text-[11px] text-muted-foreground">เหลือ</p><p className="text-lg font-semibold tabular-nums">{future.length} คาบ</p></div>
          <div className="flex-1"><p className="text-[11px] text-muted-foreground">นักเรียน</p><p className="text-lg font-semibold tabular-nums">{k.studentIds.length}/{CAPACITY[k.type]}</p></div>
        </div>
        <section className="divide-y rounded-2xl border px-3">
          <Row label="วัน · เวลา">{TH_DAYS_FULL[k.weekday]} {k.start}–{endTime(k.start, k.minutes)} <span className="text-xs text-muted-foreground">({k.minutes} นาที)</span></Row>
          <Row label="ห้อง">{L.room(k.roomId)}</Row>
          <Row label="ครู">{[k.teacherId, ...k.coTeacherIds].filter(Boolean).map((t, i) => <span key={t}>{i > 0 && ", "}{i === 0 && "★ "}{L.teacher(t).label}</span>)}{!k.teacherId && <span className="text-red-700">ยังไม่มีครู</span>}</Row>
          <Row label="สาขา">{branch.name}</Row>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">นักเรียน ({k.studentIds.length}/{CAPACITY[k.type]})</h3>
          <ul className="divide-y rounded-2xl border">
            {k.studentIds.map((sid) => {
              const st = L.student(sid)
              return (
                <li key={sid} className="flex items-center gap-2 p-2">
                  <button onClick={() => setStudentOpen(sid)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
                    {st?.nickname} <span className={cn("rounded px-1 text-[10px] font-semibold", gradeTone(st?.grade ?? ""))}>{st?.grade}</span>
                  </button>
                  {k.active && manage && (removing === sid ? (
                    <span className="flex items-center gap-1 text-xs">
                      ออกจากคลาส + คาบที่ยังไม่เริ่ม?
                      <Button size="xs" variant="destructive" onClick={() => report(remove(k.id, sid), (v) => `เอาออกแล้ว · ${v.removedFrom} คาบ (ประวัติเดิมยังอยู่)`) && setRemoving(null)}>ยืนยัน</Button>
                      <Button size="xs" variant="ghost" onClick={() => setRemoving(null)}>ไม่</Button>
                    </span>
                  ) : (
                    <Button size="icon-xs" variant="ghost" aria-label="เอาออกจากคลาส" onClick={() => setRemoving(sid)}><UserMinusIcon /></Button>
                  ))}
                </li>
              )
            })}
            {k.studentIds.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">ยังไม่มีนักเรียน — เพิ่มจากปฏิทิน (เปิดคาบ → เพิ่มนักเรียน) หรือเมื่อชำระเงินแล้วระบบเพิ่มให้อัตโนมัติ</li>}
          </ul>
        </section>
        {closing && (
          <section className="space-y-2 rounded-2xl border border-red-200 p-3">
            <p className="text-sm">ปิดคลาสจะ <b>ยกเลิก {future.length} คาบที่ยังไม่เริ่ม</b> และคลาสนี้จะไม่ถูกเสนอให้ย้ายเรียนชดเชยอีก · ประวัติที่เรียนไปแล้วยังอยู่</p>
            <Textarea rows={2} placeholder="เหตุผล (จำเป็น)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setClosing(false)}>ไม่ปิด</Button>
              <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => report(deactivate(k.id, reason), (v) => `ปิดคลาสแล้ว · ยกเลิก ${v.cancelled} คาบ`) && onClose()}>ยืนยันปิดคลาส</Button>
            </div>
          </section>
        )}
      </PanelBody>
      {manage && k.active && (
        <PanelFooter>
          <Button variant="ghost" className="text-red-700" onClick={() => setClosing(true)}><PowerIcon /> ปิดคลาส</Button>
          <Button className="ml-auto" onClick={onEdit}><PencilIcon /> แก้ไข</Button>
        </PanelFooter>
      )}
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
    </>
  )
}

/** Edit mode: day · time · length · room · teachers — only sessions that haven't started change */
function ClassEdit({ id, onDone }: { id: ID; onDone: () => void }) {
  const k = useStore((s) => s.classes.find((c) => c.id === id)!)
  const staff = useStore((s) => s.staff)
  const update = useStore((s) => s.updateClass)
  const branch = useBranch()
  const [weekday, setWeekday] = useState<Weekday>(k.weekday)
  const [start, setStart] = useState(k.start)
  const [minutes, setMinutes] = useState(k.minutes)
  const [roomId, setRoomId] = useState(k.roomId ?? "")
  const [sel, setSel] = useState({ ids: [k.teacherId, ...k.coTeacherIds].filter(Boolean) as string[], primaryId: k.teacherId ?? "" })
  const teachers = staff.map((t) => staffAt(t, branch.id)).filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  const dirty = weekday !== k.weekday || start !== k.start || minutes !== k.minutes || (roomId || null) !== k.roomId || sel.primaryId !== (k.teacherId ?? "") || sel.ids.filter((x) => x !== sel.primaryId).join() !== k.coTeacherIds.join()
  const save = () => report(
    update(k.id, { weekday, start, minutes, roomId: roomId || null, teacherId: sel.primaryId || null, coTeacherIds: sel.ids.filter((x) => x !== sel.primaryId) }),
    (v) => `บันทึกแล้ว · เปลี่ยน ${v.changed} คาบ${v.kept ? ` · คงเดิม ${v.kept} คาบ` : ""}`,
  ) && onDone()
  return (
    <PanelForm>
      <FormShell title={`แก้ไข ${k.name}`} description="มีผลกับคาบที่ยังไม่เริ่มเท่านั้น — คาบที่เรียนไปแล้ว มีเช็คชื่อ หรือแก้แยกไว้ จะไม่ถูกเปลี่ยน" onClose={onDone}
        footer={<><Button variant="ghost" onClick={onDone}>ยกเลิก</Button><Button disabled={!dirty} onClick={save}>บันทึก</Button></>}>
        <div className="grid grid-cols-3 gap-2">
          <Field label="วัน"><NativeSelect value={String(weekday)} onChange={(e) => setWeekday(Number(e.target.value) as Weekday)} options={TH_DAYS_FULL.map((d, i) => ({ value: String(i), label: d, disabled: !branch.hours[i as Weekday] }))} /></Field>
          <Field label="เริ่ม"><Input type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="นาที"><Input type="number" min={5} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
        </div>
        <Field label="ห้อง"><NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ยังไม่ระบุ" options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} /></Field>
        <Field label="ครู (★ = ครูหลัก)"><TeacherPicker teachers={teachers} subject={k.subject} value={sel} onChange={setSel} /></Field>
      </FormShell>
    </PanelForm>
  )
}
