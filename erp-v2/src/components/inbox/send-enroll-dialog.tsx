"use client"

// owner 2026-10-15: the enroll form works like Test / Trial — the admin (who already agreed the course in the chat)
// ticks the real classes to offer; the parent picks the days that suit them; the admin then makes the invoice.
import { useMemo, useState } from "react"
import { SendIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { subjectColor } from "@/components/app/subject-color"
import { endTime, TH_DAYS_FULL } from "@/domain/dates"
import { enrollClassOffers } from "@/domain/rules/forms"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { sendEnrollToChat } from "@/lib/forms"
import { useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export function SendEnrollDialog({ conversationId, onClose }: { conversationId: ID; onClose: () => void }) {
  const conv = useStore((s) => s.conversations.find((c) => c.id === conversationId))
  const classes = useStore((s) => s.classes)
  const lead = useStore((s) => s.leads.find((l) => l.id === conv?.leadId))
  const students = useStore((s) => s.students)
  const kids = students.filter((x) => conv?.familyId && x.familyId === conv.familyId && !x.archived)
  const L = useLookup()
  const offers = useMemo(() => (conv ? enrollClassOffers(classes, conv.branchId, (id) => L.teacher(id).label) : []), [classes, conv, L])
  const subjects = [...new Set(offers.flatMap((o) => o.subjects))]
  // start with what the chat is about: the lead's subject + the child's grade
  const grade = lead?.childGrade ?? kids[0]?.grade ?? ""
  const [subject, setSubject] = useState<string>(lead?.subject && subjects.includes(lead.subject) ? lead.subject : "")
  const [onlyGrade, setOnlyGrade] = useState(!!grade)
  const [picked, setPicked] = useState<Set<ID>>(new Set())
  const [busy, setBusy] = useState(false)
  const shown = offers.filter((o) => (!subject || o.subjects.includes(subject)) && (!onlyGrade || !o.grades.length || o.grades.includes(grade)))
  const toggle = (id: ID) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const send = async () => {
    setBusy(true)
    const r = await sendEnrollToChat(conversationId, offers.filter((o) => picked.has(o.id)))
    setBusy(false)
    if (report(r, `ส่งใบสมัครเรียน + ${picked.size} คลาสให้เลือกแล้ว`)) onClose()
  }
  const chip = (on: boolean) => cn("h-8 rounded-full border px-3 text-sm", on ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card text-muted-foreground hover:bg-muted")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlusIcon className="size-5" /> ส่งใบสมัครเรียน</DialogTitle>
          <DialogDescription>เลือกคลาสที่จะเสนอ — ผู้ปกครองเลือกวันที่สะดวกจากรายการนี้ (คอร์ส / แพ็กเกจที่คุยกันไว้ ใส่ตอนสร้างใบแจ้งหนี้)</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!subject)} onClick={() => setSubject("")}>ทุกวิชา</button>
          {subjects.map((x) => <button key={x} type="button" className={chip(subject === x)} onClick={() => setSubject(x)}>{x}</button>)}
          {grade && <button type="button" className={cn(chip(onlyGrade), "ml-auto")} onClick={() => setOnlyGrade(!onlyGrade)}>เฉพาะ {grade}</button>}
        </div>
        <ul className="divide-y rounded-2xl border">
          {shown.length ? shown.map((o) => {
            const full = o.seatsLeft === 0
            return (
              <li key={o.id}>
                <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/40", picked.has(o.id) && "bg-primary/5")}>
                  <Checkbox checked={picked.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                  <span className={cn("size-2 shrink-0 rounded-full", subjectColor(o.subjects[0]).bar)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.name}</span>
                    <span className="block text-xs text-muted-foreground">ทุก{TH_DAYS_FULL[o.weekday]} {o.start}–{endTime(o.start, o.minutes)}{o.teacher ? ` · ${o.teacher}` : ""}{o.grades.length ? ` · ${o.grades.join(", ")}` : ""}</span>
                  </span>
                  <span className={cn("shrink-0 text-xs tabular-nums", full ? "font-medium text-red-600" : "text-muted-foreground")}>{full ? "เต็ม" : `ว่าง ${o.seatsLeft}`}</span>
                </label>
              </li>
            )
          }) : <li className="px-3 py-6 text-center text-sm text-muted-foreground">ไม่มีคลาสที่ตรงตัวกรอง</li>}
        </ul>
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">เลือกแล้ว {picked.size} คลาส</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
            <Button disabled={!picked.size || busy} onClick={send}><SendIcon /> ส่งในแชท</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
