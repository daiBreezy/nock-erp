"use client"

// NEGATIVE-ACTIONS.md §4 + owner 2026-11-19: hand ALL of a teacher's work to someone else, always possible — also for a teacher
// who already left. From the effective date on, A's sessions + classes + open leads go to B; the past stays with A (pay + history).
// A clash with B's own classes only WARNS. B may be at any branch.
import { useState } from "react"
import { AlertTriangleIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtDate, toDateStr } from "@/domain/dates"
import { futureSessionsOf, transferConflicts } from "@/domain/rules/people"
import type { Staff } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

export function TransferDialog({ s, onClose }: { s: Staff; onClose: () => void }) {
  const branch = useBranch()
  const staff = useStore((st) => st.staff)
  const sessions = useStore((st) => st.sessions)
  const branches = useStore((st) => st.branches)
  const leads = useStore((st) => st.leads)
  const transfer = useStore((st) => st.transferStaffWork)
  const today = toDateStr(useNow())
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState("")
  const eff = from < today ? today : from
  const future = futureSessionsOf(s.id, sessions, eff)
  const openLeads = leads.filter((l) => l.assigneeId === s.id && l.stage !== "enrolled" && l.stage !== "archived").length
  const clashes = to ? transferConflicts(s.id, to, sessions, eff) : []
  // anyone still working can take it — teachers of this branch first, then the rest (any branch)
  const candidates = staff.filter((t) => t.id !== s.id && t.active)
    .sort((a, b) => Number(b.branchIds.includes(branch.id) && b.roles.includes("teacher")) - Number(a.branchIds.includes(branch.id) && a.roles.includes("teacher")) || a.nickname.localeCompare(b.nickname, "th"))
  const label = (t: Staff) => `${t.nickname}${t.subjects.length ? ` · ${t.subjects.join(", ")}` : ""}${t.branchIds.includes(branch.id) ? "" : ` · ${t.branchIds.map((id) => branches.find((b) => b.id === id)?.code).filter(Boolean).join("/") || "สาขาอื่น"}`}`
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>โอนงานของ {s.nickname}</DialogTitle>
          <DialogDescription>โอนทั้งหมด: คาบตั้งแต่วันที่มีผล · คลาสที่รับผิดชอบ · Lead ที่ยังติดตามอยู่ — ไปครูที่เลือก คาบที่ผ่านมาแล้วยังเป็นของ {s.nickname}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">วันที่มีผล</p>
            <Input type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <p>จะย้าย <b>{future.length} คาบ</b>{future.length > 0 ? ` ตั้งแต่ ${fmtDate(future.map((x) => x.date).sort()[0])}` : ""}{openLeads > 0 ? ` และ ${openLeads} Lead` : ""}</p>
          <NativeSelect value={to} onChange={(e) => setTo(e.target.value)} placeholder="เลือกผู้รับงาน" options={candidates.map((t) => ({ value: t.id, label: label(t) }))} />
          {clashes.length > 0 && (
            <p className="flex items-start gap-2 rounded-2xl bg-warning-soft px-3 py-2 text-xs text-warning-ink"><AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              ผู้รับงานมีคาบชนกัน {clashes.length} คาบ (เช่น {fmtDate(clashes[0].date)} {clashes[0].start}) — โอนได้ แต่ควรจัดเวลาใหม่ภายหลัง</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!to} onClick={() => report(transfer(s.id, to, from), (v) => `โอนงานแล้ว · ย้าย ${v.reassigned} คาบ${v.leads ? ` + ${v.leads} Lead` : ""}`) && onClose()}>ยืนยันโอนงาน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
