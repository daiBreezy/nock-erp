"use client"

// NEGATIVE-ACTIONS.md §4: hand a teacher's work to someone else as its OWN action — A keeps their account, every
// upcoming session + class moves to B. Separate from closing the account (DeactivateDialog).
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

export function TransferDialog({ s, onClose }: { s: Staff; onClose: () => void }) {
  const branch = useBranch()
  const staff = useStore((st) => st.staff)
  const sessions = useStore((st) => st.sessions)
  const transfer = useStore((st) => st.transferStaffWork)
  const today = toDateStr(useNow())
  const future = futureSessionsOf(s.id, sessions, today)
  const [to, setTo] = useState("")
  const candidates = staff.map((t) => staffAt(t, branch.id)).filter((t) => t.id !== s.id && t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>โอนงานของ {s.nickname}</DialogTitle>
          <DialogDescription>คาบในอนาคตและคลาสที่รับผิดชอบทั้งหมดจะย้ายไปครูที่เลือก · {s.nickname} ยังอยู่ในระบบตามเดิม</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>ตอนนี้มี <b>{future.length} คาบ</b> ในอนาคต{future.length > 0 ? ` ตั้งแต่ ${fmtDate(future.map((x) => x.date).sort()[0])}` : ""}</p>
          <NativeSelect value={to} onChange={(e) => setTo(e.target.value)} placeholder="เลือกครูที่รับงาน"
            options={candidates.map((t) => ({ value: t.id, label: `${t.nickname}${t.subjects.length ? ` · ${t.subjects.join(", ")}` : ""}` }))} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!to} onClick={() => report(transfer(s.id, to), (v) => `โอนงานแล้ว · ย้าย ${v.reassigned} คาบ`) && onClose()}>ยืนยันโอนงาน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
