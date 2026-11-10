"use client"

import { useMemo, useState } from "react"
import { CopyPlusIcon } from "lucide-react"
import { GradeCell } from "@/components/app/data-table"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { addDays, fmtDate, toDateStr } from "@/domain/dates"
import { renewalCandidates } from "@/domain/rules/billing"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { SearchBox } from "@/components/app/page-layout"

/**
 * Renewal for many students at once (owner 2026-11-05): the admin talks to the parents in the Inbox; for everyone who
 * wants to continue, tick them here → a Draft is made from each one's last invoice, waiting to be edited and sent.
 */
export function RenewalDraftsDialog({ branchIds, onClose, onCreated }: { branchIds: ID[]; onClose: () => void; onCreated?: (firstId: ID) => void }) {
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const branches = useStore((s) => s.branches)
  const create = useStore((s) => s.createRenewalDrafts)
  const today = toDateStr(useNow(60_000))
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<ID[]>([])
  const [failed, setFailed] = useState<{ id: ID; error: string }[]>([])
  const rows = useMemo(() => renewalCandidates(invoices.filter((i) => branchIds.includes(i.branchId)), (bid) => ({ branch: branches.find((b) => b.id === bid)!, courses, classes, holidays })),
    [invoices, branchIds, branches, courses, classes, holidays])
  const shown = rows.filter(({ inv }) => { const s = students.find((x) => x.id === inv.studentId); return !q.trim() || `${s?.nickname ?? ""} ${s?.name ?? ""} ${inv.number ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()) })
  const allOn = shown.length > 0 && shown.every((r) => picked.includes(r.inv.id))
  const toggle = (id: ID) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const submit = () => {
    const r = create(picked)
    if (!r.ok) { report(r, ""); return }
    const { created, failed: bad } = r.value
    report({ ok: true, value: undefined }, `สร้าง Draft ต่ออายุแล้ว ${created.length} ใบ${bad.length ? ` · ไม่สำเร็จ ${bad.length} ใบ` : ""}`)
    if (bad.length) { setFailed(bad); setPicked(bad.map((x) => x.id)); return }
    if (created[0]) onCreated?.(created[0].id)
    onClose()
  }
  const name = (id: ID) => students.find((s) => s.id === id)?.nickname ?? "—"
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-3 lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CopyPlusIcon className="size-4" /> สร้าง Draft ต่ออายุหลายคน</DialogTitle>
          <DialogDescription>เลือกนักเรียนที่ผู้ปกครองต้องการต่อคอร์ส — ระบบสร้าง Draft จากใบล่าสุดของแต่ละคน (คอร์ส คลาส จำนวนงวด ข้อความเดิม) เริ่มวันถัดจากที่คอร์สเดิมจบ ให้แอดมินแก้ต่อได้</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex-1"><SearchBox block value={q} onChange={setQ} placeholder="ค้นหาชื่อนักเรียน / เลขที่ใบ" /></div>
          <label className="flex shrink-0 items-center gap-2 text-sm"><Checkbox checked={allOn} onCheckedChange={(v) => setPicked(v ? [...new Set([...picked, ...shown.map((r) => r.inv.id)])] : picked.filter((id) => !shown.some((r) => r.inv.id === id)))} /> เลือกทั้งหมด</label>
        </div>
        <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-lg border">
          {shown.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">ไม่มีนักเรียนที่รอต่ออายุ</p>}
          {shown.map(({ inv, end }) => {
            const s = students.find((x) => x.id === inv.studentId)
            const left = Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)
            const err = failed.find((f) => f.id === inv.id)?.error
            return (
              <label key={inv.id} className={cn("flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-muted/40", err && "bg-red-50 dark:bg-red-950/20")}>
                <Checkbox checked={picked.includes(inv.id)} onCheckedChange={() => toggle(inv.id)} />
                <span className="w-20 shrink-0 font-medium">{s?.nickname}</span>
                {s && <GradeCell grade={s.grade} tone={gradeTone(s.grade)} />}
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{inv.lines.map((l) => courses.find((c) => c.id === l.courseId)?.name).filter(Boolean).join(", ")}{err && <span className="block text-xs text-red-700">{err}</span>}</span>
                <span className={cn("shrink-0 text-xs tabular-nums", left < 0 ? "text-red-700" : left <= 14 ? "text-amber-700" : "text-muted-foreground")}>
                  {left < 0 ? `หมดแล้ว ${fmtDate(end)}` : `จบ ${fmtDate(end)} (อีก ${left} วัน)`}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">เริ่ม {fmtDate(addDays(end, 1) > today ? addDays(end, 1) : today)}</span>
              </label>
            )
          })}
        </div>
        <DialogFooter className="items-center">
          <span className="mr-auto text-sm text-muted-foreground">เลือกแล้ว {picked.length} คน</span>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={picked.length === 0} onClick={submit}><CopyPlusIcon /> สร้าง Draft ({picked.length})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
