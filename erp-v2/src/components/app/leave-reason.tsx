"use client"

// owner 2026-10-15: the teacher-leave reason as chips; อื่นๆ opens a note (the note is optional for the other chips)
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { leaveReasonText, TEACHER_LEAVE_REASONS, type TeacherLeaveReason } from "@/domain/rules/scheduling"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/** returns the reason text through `onChange` ("" until it is complete) */
export function LeaveReasonPicker({ onChange }: { onChange: (reason: string) => void }) {
  const [pick, setPick] = useState<TeacherLeaveReason | "">("")
  const [note, setNote] = useState("")
  const update = (p: TeacherLeaveReason | "", n: string) => { setPick(p); setNote(n); onChange(leaveReasonText(p, n)) }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">เหตุผลที่ลา</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="เหตุผลที่ลา">
        {TEACHER_LEAVE_REASONS.map((r) => (
          <Button variant="chip" size="inline" key={r} type="button" role="radio" aria-checked={pick === r} onClick={() => update(r, note)}
            className="h-8 px-3 text-sm">
            {r}
          </Button>
        ))}
      </div>
      {pick === "อื่นๆ" && (
        <Textarea autoFocus rows={2} value={note} onChange={(e) => update(pick, e.target.value)} placeholder="ระบุเหตุผล (จำเป็น)" />
      )}
    </div>
  )
}
