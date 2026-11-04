"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate } from "@/domain/dates"
import { sessionState } from "@/domain/rules/scheduling"
import type { Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { ClassPicker } from "./student-form"

/**
 * Row 25 (owner 2026-11-02): put an EXISTING student into classes from their panel — the same picker as the
 * new-student form. The student joins from each class's next upcoming session onward (ขึ้นปฏิทินทันที). Paying is not
 * required: `addStudentToSession` itself warns to issue an invoice when the student hasn't paid for the class.
 */
export function AddToClassDialog({ stu, onClose }: { stu: Student; onClose: () => void }) {
  const branch = useBranch()
  const classes = useStore((s) => s.classes)
  const sessions = useStore((s) => s.sessions)
  const staff = useStore((s) => s.staff)
  const addToSession = useStore((s) => s.addStudentToSession)
  const now = useNow(60_000)
  const [classIds, setClassIds] = useState<string[]>([])
  const nextSession = (classId: string) => sessions.filter((x) => x.classId === classId && !x.cancelled && sessionState(x, now) === "upcoming").sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
  // classes the student is already in (any session, past or coming) — shown greyed in the picker
  const joined = new Set(sessions.filter((x) => x.studentIds.includes(stu.id)).map((x) => x.classId).filter((x): x is string => !!x))
  const pool = classes.filter((k) => k.branchId === branch.id && k.active && k.kind === "learning")
  const join = () => {
    let ok = true
    for (const cid of classIds) {
      const k = classes.find((c) => c.id === cid)
      const next = nextSession(cid)
      if (!next) { report({ ok: false, error: `${k?.name ?? "คลาส"} ไม่มีคาบข้างหน้า — เพิ่มทีหลังที่ปฏิทิน` }, ""); ok = false; continue }
      ok = report(addToSession(next.id, stu.id, "following"), (v) => `${stu.nickname} เข้าคลาส ${k?.name ?? ""} แล้ว · ${v.changed} คาบ (เริ่ม ${fmtDate(next.date, { weekday: true })})`) && ok
    }
    if (ok) onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader><DialogTitle>{`เพิ่ม ${stu.nickname} เข้าคลาส`}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">เลือกคลาสที่จะเข้า — เริ่มจากคาบถัดไป ขึ้นปฏิทินทันที · ยังไม่จ่ายเงินระบบจะเตือนในคาบให้ออกใบแจ้งหนี้</p>
        <ClassPicker classes={pool} grade={stu.grade} picked={classIds} joined={joined}
          onToggle={(id) => setClassIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))}
          teacherName={(id) => staff.find((t) => t.id === id)?.nickname ?? "ยังไม่มีครู"} hasNext={(id) => !!nextSession(id)} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!classIds.length} onClick={join}>เพิ่มเข้าคลาส</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
