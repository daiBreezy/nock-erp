"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toDateStr } from "@/domain/dates"
import { canSaveLeave } from "@/domain/rules/attendance"
import type { ID, StudentLeave } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { Field } from "./student-form"

/** Create / edit a student-level, date-range "ลาพักยาว ไม่หักโควตา" record — editable any time, always re-notifies. */
export function LeaveDialog({ studentId, leave, onClose }: { studentId: ID; leave?: StudentLeave; onClose: () => void }) {
  const today = toDateStr(useNow(60_000))
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const save = useStore((s) => s.saveStudentLeave)
  const [from, setFrom] = useState(leave?.from ?? today)
  const [to, setTo] = useState(leave?.to ?? today)
  const [reason, setReason] = useState(leave?.reason ?? "")
  const [touched, setTouched] = useState(false)
  const r = canSaveLeave(me, from, to, reason)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{leave ? "แก้ไขการลาพักยาว" : "บันทึกการลาพักยาว (ไม่หักโควตา)"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="เริ่มลา *"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="ถึงวันที่ *"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="หมายเหตุ (บังคับ) *" className="sm:col-span-2">
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ไปต่างประเทศ 2 สัปดาห์" />
          </Field>
          {touched && !r.ok && <p className="text-xs text-red-700 sm:col-span-2">{r.error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (report(save({ id: leave?.id, studentId, from, to, reason }), leave ? "แก้ไขการลาแล้ว" : "บันทึกการลาแล้ว")) onClose()
            }}
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
