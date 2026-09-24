"use client"

import { useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { endTime, fmtDate, TH_DAYS_FULL, weekdayOf } from "@/domain/dates"
import { findConflicts, moveSession, type MoveScope, type MoveTarget } from "@/domain/rules/scheduling"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** Asked after every drag & drop: this session only, or this and all following sessions of the class. */
export function MoveDialog({ sessionId, target, onClose }: { sessionId: string; target: MoveTarget; onClose: () => void }) {
  const s = useStore((st) => st.sessions.find((x) => x.id === sessionId)!)
  const sessions = useStore((st) => st.sessions)
  const staff = useStore((st) => st.staff)
  const attendance = useStore((st) => st.attendance)
  const klass = useStore((st) => st.classes.find((c) => c.id === s.classId))
  const move = useStore((st) => st.moveSession)
  const branch = useBranch()
  const now = useNow()
  const L = useLookup()
  const [start, setStart] = useState(target.start)
  const [scope, setScope] = useState<MoveScope>("one")
  const t = { ...target, start }

  const preview = (sc: MoveScope) => moveSession(sessions, sessionId, t, sc, now, attendance)
  const following = s.classId ? preview("following") : null
  const chosen = scope === "one" ? preview("one") : following!
  const clash = findConflicts(chosen.sessions, branch, staff).filter((c) => c.kind !== "rooms_full" && c.sessionIds.some((x) => chosen.movedIds.includes(x)))

  const changes: [string, string, string][] = []
  if (t.date !== s.date) changes.push(["วัน", fmtDate(s.date, { weekday: true }), fmtDate(t.date, { weekday: true })])
  if (t.start !== s.start) changes.push(["เวลา", `${s.start}–${endTime(s.start, s.minutes)}`, `${t.start}–${endTime(t.start, s.minutes)}`])
  if (t.teacherId !== undefined && t.teacherId !== s.teacherId) changes.push(["ครูหลัก", L.teacher(s.teacherId).label, L.teacher(t.teacherId ?? null).label])
  if (t.roomId !== undefined && t.roomId !== s.roomId) changes.push(["ห้อง", L.room(s.roomId), L.room(t.roomId ?? null)])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ย้าย {klass?.name ?? s.subject}</DialogTitle>
          <DialogDescription>ตรวจสอบการเปลี่ยนแปลง แล้วเลือกว่าจะใช้กับคาบไหน</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
          {changes.length === 0 && <p className="text-muted-foreground">ไม่มีการเปลี่ยนแปลง</p>}
          {changes.map(([k, a, b]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-14 text-muted-foreground">{k}</span>
              <span className="line-through opacity-60">{a}</span>
              <ArrowRightIcon className="size-3.5" />
              <b>{b}</b>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs">ปรับเวลาเริ่ม</Label>
          <Input className="w-28" type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>

        <div className="space-y-2">
          <ScopeOption active={scope === "one"} onClick={() => setScope("one")} title="เฉพาะคาบนี้" detail={`${fmtDate(t.date, { weekday: true })} เท่านั้น — คาบอื่นของคลาสไม่เปลี่ยน`} />
          {following && (
            <ScopeOption
              active={scope === "following"}
              onClick={() => setScope("following")}
              title="คาบนี้และคาบถัดไปทั้งหมด"
              detail={`${following.movedIds.length} คาบ → ทุกวัน${TH_DAYS_FULL[weekdayOf(t.date)]} ${start}${following.kept ? ` · คงเดิม ${following.kept} คาบที่แก้แยกไว้/มีเช็คชื่อแล้ว` : ""}`}
            />
          )}
        </div>

        {clash.length > 0 && <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">ย้ายไม่ได้: {[...new Set(clash.map((c) => c.message))].join(" · ")}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={clash.length > 0 || changes.length === 0} onClick={() => report(move(sessionId, t, scope), (v) => `ย้ายแล้ว ${v.moved} คาบ${v.kept ? ` (คงเดิม ${v.kept})` : ""}`) && onClose()}>
            ยืนยันย้าย
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ScopeOption({ active, onClick, title, detail }: { active: boolean; onClick: () => void; title: string; detail: string }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-start gap-3 rounded-lg border p-3 text-left", active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50")}>
      <span className={cn("mt-0.5 grid size-4 place-items-center rounded-full border", active && "border-primary")}>{active && <span className="size-2 rounded-full bg-primary" />}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}
