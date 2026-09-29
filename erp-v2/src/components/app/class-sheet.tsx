"use client"

import { useState } from "react"
import { UserMinusIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { Field } from "@/components/app/student-form"
import { gradeTone } from "@/components/app/subject-color"
import { TeacherPicker } from "@/components/app/teacher-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { CAPACITY, sessionState } from "@/domain/rules/scheduling"
import type { ID, Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** Edit a class (schedule, room, teachers, students, close) — used by the class list and the session dialog's "แก้คลาส". */
export function ClassSheet({ id, onClose }: { id: ID | null; onClose: () => void }) {
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">{id && <ClassBody id={id} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function ClassBody({ id, onClose }: { id: ID; onClose: () => void }) {
  const k = useStore((s) => s.classes.find((c) => c.id === id)!)
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const update = useStore((s) => s.updateClass)
  const deactivate = useStore((s) => s.deactivateClass)
  const remove = useStore((s) => s.removeStudentFromClass)
  const branch = useBranch()
  const now = useNow()
  const L = useLookup()
  const [weekday, setWeekday] = useState<Weekday>(k.weekday)
  const [start, setStart] = useState(k.start)
  const [minutes, setMinutes] = useState(k.minutes)
  const [roomId, setRoomId] = useState(k.roomId ?? "")
  const [sel, setSel] = useState({ ids: [k.teacherId, ...k.coTeacherIds].filter(Boolean) as string[], primaryId: k.teacherId ?? "" })
  const [closing, setClosing] = useState(false)
  const [reason, setReason] = useState("")
  const [removing, setRemoving] = useState<ID | null>(null)
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)
  const future = sessions.filter((s) => s.classId === k.id && !s.cancelled && sessionState(s, now) === "upcoming")
  const past = sessions.filter((s) => s.classId === k.id && s.date < toDateStr(now)).length
  const teachers = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  const dirty = weekday !== k.weekday || start !== k.start || minutes !== k.minutes || (roomId || null) !== k.roomId || sel.primaryId !== (k.teacherId ?? "") || sel.ids.filter((x) => x !== sel.primaryId).join() !== k.coTeacherIds.join()

  return (
    <>
      <SheetHeader className="border-b pb-3">
        <SheetTitle className="text-lg">{k.name}</SheetTitle>
        <SheetDescription>{k.subject} · {k.grades.join(", ")} · {k.type === "single" ? "เดี่ยว" : "กลุ่ม"} · เรียนไปแล้ว {past} คาบ · เหลือ {future.length} คาบ</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 px-4 pt-5 pb-6">
        {k.active && (
          <section className="space-y-3 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">ตารางและครู</h3>
            <div className="grid grid-cols-3 gap-2">
              <Field label="วัน"><NativeSelect value={String(weekday)} onChange={(e) => setWeekday(Number(e.target.value) as Weekday)} options={TH_DAYS_FULL.map((d, i) => ({ value: String(i), label: d, disabled: !branch.hours[i as Weekday] }))} /></Field>
              <Field label="เริ่ม"><Input type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="นาที"><Input type="number" min={5} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
            </div>
            <Field label="ห้อง"><NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ยังไม่ระบุ" options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} /></Field>
            <Field label="ครู (★ = ครูหลัก)"><TeacherPicker teachers={teachers} subject={k.subject} value={sel} onChange={setSel} /></Field>
            <p className="text-xs text-muted-foreground">มีผลกับคาบที่ยังไม่เริ่มเท่านั้น — คาบที่เรียนไปแล้ว มีเช็คชื่อ หรือแก้แยกไว้ จะไม่ถูกเปลี่ยน</p>
            <Button
              size="sm"
              disabled={!dirty}
              onClick={() =>
                report(
                  update(k.id, { weekday, start, minutes, roomId: roomId || null, teacherId: sel.primaryId || null, coTeacherIds: sel.ids.filter((x) => x !== sel.primaryId) }),
                  (v) => `บันทึกแล้ว · เปลี่ยน ${v.changed} คาบ${v.kept ? ` · คงเดิม ${v.kept} คาบ` : ""}`,
                )
              }
            >
              บันทึกการเปลี่ยนแปลง
            </Button>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">นักเรียน ({k.studentIds.length}/{CAPACITY[k.type]})</h3>
          <ul className="divide-y rounded-lg border">
            {k.studentIds.map((sid) => {
              const st = L.student(sid)
              return (
                <li key={sid} className="flex items-center gap-2 p-2">
                  <button onClick={() => setStudentOpen(sid)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
                    {st?.nickname} <span className={cn("rounded px-1 text-[10px] font-semibold", gradeTone(st?.grade ?? ""))}>{st?.grade}</span>
                  </button>
                  {k.active && (removing === sid ? (
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

        {k.active && (
          <section className="rounded-lg border border-red-200 p-3">
            {!closing ? (
              <Button size="sm" variant="ghost" className="text-red-700" onClick={() => setClosing(true)}>ปิดคลาสนี้</Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">ปิดคลาสจะ <b>ยกเลิก {future.length} คาบที่ยังไม่เริ่ม</b> และคลาสนี้จะไม่ถูกเสนอให้ย้ายเรียนชดเชยอีก · ประวัติที่เรียนไปแล้วยังอยู่</p>
                <Textarea rows={2} placeholder="เหตุผล (จำเป็น)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setClosing(false)}>ไม่ปิด</Button>
                  <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => report(deactivate(k.id, reason), (v) => `ปิดคลาสแล้ว · ยกเลิก ${v.cancelled} คาบ`) && onClose()}>ยืนยันปิดคลาส</Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
    </>
  )
}
