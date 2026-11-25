"use client"

// Yearly grade change (owner 2026-11-19) — the alert on the Students page and the Dashboard, and the dialog where the Admin approves it.
// Reminder from 7 days before; on the day it waits for the Admin's tap (Manual) — or the branch's Auto mode does it by itself.
import { useEffect, useState } from "react"
import { ArrowRightIcon, CheckIcon, GraduationCapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtDate, toDateStr } from "@/domain/dates"
import { can } from "@/domain/rules/permissions"
import { planRollover, rolloverState } from "@/domain/rules/rollover"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { fmtSpan } from "@/lib/span"
import { tx } from "@/lib/i18n"

const MAX_LISTED = 200

/** the notice itself (null = nothing to say) — the Students page shows it as a banner, the Dashboard as a row of ต้องรู้ไว้ (owner 2026-11-25: the banner was in the way) */
export function useRolloverNotice(branchId: ID) {
  const me = useStore((s) => s.me())
  const branch = useStore((s) => s.branches.find((b) => b.id === branchId))
  const cfg = useStore((s) => s.system.gradeRollover)
  const done = useStore((s) => s.gradeRollovers)
  const students = useStore((s) => s.students)
  const today = toDateStr(useNow(60_000))
  if (!branch || !can(me, "student.manage")) return null
  const st = rolloverState(today, cfg, branch.brand, branchId, done)
  if (st.kind === "none") return null
  const count = planRollover(students, branchId).length
  if (!count) return null
  const auto = branch.gradeRolloverMode === "auto"
  const due = st.kind === "due"
  return {
    due, auto, count,
    title: due ? `ถึงเวลาเลื่อนชั้นประจำปี ${st.year + 543} แล้ว` : `${tx("อีก {0}", [fmtSpan(st.daysLeft)])} (${fmtDate(st.date)}) จะเลื่อนชั้นประจำปี`,
    sub: `${count} คนจะขึ้นชั้นถัดไป · ${auto ? "สาขานี้ตั้งเป็น Auto — ระบบจะเลื่อนให้เองในวันนั้น" : "ต้องให้ Admin กดอนุมัติ"}`,
    action: due ? (auto ? "เลื่อนเลย" : "ตรวจสอบและอนุมัติ") : null,
  }
}

export function RolloverBanner({ branchId }: { branchId: ID }) {
  const n = useRolloverNotice(branchId)
  const [open, setOpen] = useState(false)
  if (!n) return null
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning-ink">
        <GraduationCapIcon className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{n.title}</p>
          <p className="text-xs">{n.sub}</p>
        </div>
        {n.action && <Button size="sm" onClick={() => setOpen(true)}>{n.action}</Button>}
      </div>
      {open && <RolloverDialog branchId={branchId} onClose={() => setOpen(false)} />}
    </>
  )
}

/** the list the Admin approves — grouped by grade, with every student tickable so one can be left out (repeated a year, skipped ahead) */
export function RolloverDialog({ branchId, onClose }: { branchId: ID; onClose: () => void }) {
  const students = useStore((s) => s.students)
  const apply = useStore((s) => s.applyGradeRollover)
  const plan = planRollover(students, branchId)
  const [skip, setSkip] = useState<Set<ID>>(new Set())
  const [q, setQ] = useState("")
  const groups = new Map<string, number>()
  for (const c of plan) if (!skip.has(c.student.id)) { const k = `${c.from} → ${c.to === "graduated" ? "จบการศึกษา" : c.to}`; groups.set(k, (groups.get(k) ?? 0) + 1) }
  const listed = plan.filter((c) => !q.trim() || `${c.student.nickname} ${c.student.name}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, MAX_LISTED)
  const toggle = (id: ID) => setSkip((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const go = () => { if (report(apply(branchId, [...skip]), (v) => `เลื่อนชั้นแล้ว ${v.moved} คน · จบการศึกษา ${v.graduated} คน`)) onClose() }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col lg:max-w-lg">
        <DialogHeader>
          <DialogTitle>เลื่อนชั้นประจำปี</DialogTitle>
          <DialogDescription>ทุกคนขึ้นชั้นถัดไป · ม.6 จบการศึกษา · ติ๊กออกคนที่ไม่ต้องเลื่อน (เช่น ซ้ำชั้น)</DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {[...groups].map(([k, n]) => <li key={k} className="flex items-center gap-1.5"><ArrowRightIcon className="size-3 text-muted-foreground" /><span className="flex-1">{k}</span><b className="tabular-nums">{n}</b></li>)}
        </ul>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ เพื่อยกเว้นรายคน" />
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-2xl bg-muted/40 p-2 text-sm">
          {listed.map((c) => (
            <li key={c.student.id}><label className="flex items-center gap-2"><Checkbox checked={!skip.has(c.student.id)} onCheckedChange={() => toggle(c.student.id)} />
              <span className="min-w-0 flex-1 truncate">{c.student.nickname}</span><span className="text-xs text-muted-foreground">{c.from} → {c.to === "graduated" ? "จบ" : c.to}</span></label></li>
          ))}
          {plan.length > MAX_LISTED && !q.trim() && <li className="px-1 text-xs text-muted-foreground">แสดง {MAX_LISTED} คนแรก — พิมพ์ชื่อเพื่อค้นหาคนอื่น</li>}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ไว้ก่อน</Button>
          <Button disabled={plan.length === skip.size} onClick={go}><CheckIcon /> อนุมัติเลื่อนชั้น {plan.length - skip.size} คน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Auto mode (owner 2026-11-19): on the day, a branch set to Auto moves its students up by itself — mounted once in the app shell */
export function GradeRolloverAuto() {
  const today = toDateStr(useNow(60_000))
  const branches = useStore((s) => s.branches)
  const cfg = useStore((s) => s.system.gradeRollover)
  const done = useStore((s) => s.gradeRollovers)
  const apply = useStore((s) => s.applyGradeRollover)
  useEffect(() => {
    for (const b of branches) {
      if (!b.active || b.gradeRolloverMode !== "auto") continue
      if (rolloverState(today, cfg, b.brand, b.id, done).kind === "due") apply(b.id, [], "auto")
    }
  }, [today, branches, cfg, done, apply])
  return null
}
