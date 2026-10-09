"use client"

import { useState } from "react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate, toDateStr } from "@/domain/dates"
import { futureSessionsOf } from "@/domain/rules/people"
import { staffAt } from "@/domain/rules/permissions"
import type { Staff } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

/** F2: before closing a teacher's account, hand over every upcoming session */
export function DeactivateDialog({ s, onClose }: { s: Staff; onClose: () => void }) {
  const branch = useBranch()
  const staff = useStore((st) => st.staff)
  const sessions = useStore((st) => st.sessions)
  const deactivate = useStore((st) => st.deactivateStaff)
  const today = toDateStr(useNow())
  const future = futureSessionsOf(s.id, sessions, today)
  const [replacement, setReplacement] = useState("")
  const candidates = staff.map((t) => staffAt(t, branch.id)).filter((t) => t.id !== s.id && t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ปิดบัญชี {s.nickname}?</DialogTitle>
          <DialogDescription>ประวัติการสอนเดิมยังอยู่และแสดงชื่อเป็น &quot;{s.nickname} (ออกแล้ว)&quot;</DialogDescription>
        </DialogHeader>
        {future.length > 0 ? (
          <div className="space-y-2 text-sm">
            <p>ยังมี <b>{future.length} คาบ</b> ตั้งแต่ {fmtDate(future.map((x) => x.date).sort()[0])} ที่ {s.nickname} สอนอยู่ — เลือกครูที่จะรับแทน</p>
            <NativeSelect value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="ยังไม่มีครู (ไปจัดทีหลัง)" options={candidates.map((t) => ({ value: t.id, label: `${t.nickname}${t.subjects.length ? ` · ${t.subjects.join(", ")}` : ""}` }))} />
            {!replacement && <p className="text-xs text-amber-700">คาบเหล่านี้จะไปอยู่ช่อง &quot;ยังไม่มีครู&quot; ในปฏิทิน</p>}
          </div>
        ) : <p className="text-sm text-muted-foreground">ไม่มีคาบในอนาคต</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" onClick={() => report(deactivate(s.id, replacement || null), (v) => `ปิดบัญชีแล้ว${v.reassigned ? ` · ย้าย ${v.reassigned} คาบ` : ""}`) && onClose()}>ยืนยันปิดบัญชี</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
