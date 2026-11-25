"use client"

import { useMemo, useState } from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { endTime, fmtDate, toDateStr } from "@/domain/dates"
import { staffAt } from "@/domain/rules/permissions"
import { makeupCandidates, makeupReady } from "@/domain/rules/session-credit"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { NativeSelect } from "./native-select"

/**
 * owner 2026-11-25: spend Credit on make-up sessions. DEFAULT = pick from EXISTING sessions of the same course that have a free seat (the Admin ticks up to as many
 * as there are credits; 1 credit = 1 session). OPTIONAL: allow any course of the branch, or create a new one-off make-up session first. Credits with no pick stay open.
 */
export function MakeupDialog({ creditIds, onClose }: { creditIds: ID[]; onClose: () => void }) {
  const allCredits = useStore((s) => s.sessionCredits ?? [])
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const courses = useStore((s) => s.courses)
  const staff = useStore((s) => s.staff)
  const branches = useStore((s) => s.branches)
  const students = useStore((s) => s.students)
  const book = useStore((s) => s.bookMakeupSessions)
  const addSession = useStore((s) => s.addSession)
  const now = useNow(60_000)
  const first = allCredits.find((c) => creditIds.includes(c.id) && makeupReady(c))
  // one course at a time — the make-up list is that course's
  const credits = allCredits.filter((c) => creditIds.includes(c.id) && makeupReady(c) && c.studentId === first?.studentId && c.courseId === first?.courseId)
  const course = courses.find((c) => c.id === first?.courseId)
  const branch = branches.find((b) => b.id === first?.branchId)
  const stu = students.find((x) => x.id === first?.studentId)
  const [other, setOther] = useState(false)
  const [picks, setPicks] = useState<ID[]>([])
  const [mk, setMk] = useState({ date: "", start: "10:00", teacherId: "", roomId: "" })
  const candidates = useMemo(() => (first ? makeupCandidates({ credit: first, sessions, classes, course, now, today: toDateStr(now), otherCourse: other }) : []), [first, sessions, classes, course, now, other])
  if (!first || !branch) return null
  const room = (id: ID | null) => branch.rooms.find((r) => r.id === id)?.name
  const teacher = (id: ID | null) => staff.find((t) => t.id === id)?.nickname
  const teachers = staff.map((t) => staffAt(t, branch.id)).filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  const toggle = (id: ID) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < credits.length ? [...p, id] : p))
  const create = () => {
    if (!mk.date) return report({ ok: false, error: "เลือกวันที่ก่อน" }, "")
    const r = addSession({ branchId: branch.id, classId: null, subject: course?.subjects[0] ?? "", date: mk.date, start: mk.start, minutes: branch.defaultSessionMinutes, teacherId: mk.teacherId || null, coTeacherIds: [], roomId: mk.roomId || null, studentIds: [], trial: false })
    if (report(r, tx("สร้างคาบชดเชยใหม่แล้ว"))) { setPicks((p) => (p.length < credits.length && r.ok ? [...p, r.value.id] : p)); setMk({ ...mk, date: "" }) }
  }
  const submit = () => { if (report(book(credits.map((c) => c.id), picks, other), (v) => tx("จองคาบชดเชย {0} คาบให้ {1} แล้ว", [v.booked, stu?.nickname ?? ""]))) onClose() }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>{tx("ชดเชยคาบ")} · {stu?.nickname}</DialogTitle>
          <DialogDescription>{tx("Credit {0} คาบ · คอร์ส {1} — เลือกคาบที่มีอยู่แล้วและยังมีที่ว่าง (1 Credit = 1 คาบ)", [credits.length, course?.name ?? "—"])}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Checkbox checked={other} onCheckedChange={(v) => { setOther(!!v); setPicks([]) }} /> {tx("อนุญาตให้ชดเชยในคอร์สอื่นได้ (ปกติชดเชยในคอร์สเดียวกัน)")}</label>
          {candidates.length === 0 && <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">{tx("ไม่มีคาบว่างของคอร์สนี้ — สร้างคาบชดเชยใหม่ด้านล่าง หรืออนุญาตคอร์สอื่น")}</p>}
          <ul className="max-h-64 divide-y overflow-y-auto rounded-xl bg-muted/40">
            {candidates.map((x) => {
              const on = picks.includes(x.id)
              return (
                <li key={x.id}>
                  <label className={cn("flex cursor-pointer items-center gap-2 px-2.5 py-2 text-sm", !on && picks.length >= credits.length && "opacity-50")}>
                    <Checkbox checked={on} onCheckedChange={() => toggle(x.id)} />
                    <span className="min-w-0 flex-1 truncate">{fmtDate(x.date, { weekday: true })} {x.start}–{endTime(x.start, x.minutes)}<span className="ml-1.5 text-xs text-muted-foreground">{classes.find((k) => k.id === x.classId)?.name ?? x.subject}{teacher(x.teacherId) ? ` · ${teacher(x.teacherId)}` : ""}{room(x.roomId) ? ` · ${room(x.roomId)}` : ""}</span></span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{x.studentIds.length} {tx("คน")}</span>
                  </label>
                </li>
              )
            })}
          </ul>
          <details className="rounded-xl bg-muted/40 p-2">
            <summary className="cursor-pointer text-sm font-medium">{tx("สร้างคาบชดเชยใหม่ (ตัวเลือก)")}</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="space-y-1"><Label className="text-xs">{tx("วันที่")}</Label><Input type="date" min={toDateStr(now)} value={mk.date} onChange={(e) => setMk({ ...mk, date: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">{tx("เวลาเริ่ม")}</Label><Input type="time" step={900} value={mk.start} onChange={(e) => setMk({ ...mk, start: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">{tx("ครู")}</Label><NativeSelect value={mk.teacherId} onChange={(e) => setMk({ ...mk, teacherId: e.target.value })} placeholder={tx("ยังไม่เลือก")} options={teachers.map((t) => ({ value: t.id, label: t.nickname }))} /></div>
              <div className="space-y-1"><Label className="text-xs">{tx("ห้อง")}</Label><NativeSelect value={mk.roomId} onChange={(e) => setMk({ ...mk, roomId: e.target.value })} placeholder={tx("ยังไม่เลือก")} options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} /></div>
            </div>
            <Button className="mt-2" size="xs" variant="outline" onClick={create}><PlusIcon /> {tx("สร้างคาบและเลือกเลย")}</Button>
          </details>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button disabled={picks.length === 0} onClick={submit}>{tx("จองชดเชย {0} คาบ", [picks.length])}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
