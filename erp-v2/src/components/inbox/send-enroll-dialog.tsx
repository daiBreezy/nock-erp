"use client"

// owner 2026-10-16 (round 3): the admin asks the parent in the chat (which course, which days) and picks them on the
// invoice — the one place a course + classes are chosen. The enroll form only collects what the admin doesn't have:
// the family + child details (+ when they'd like to start, bus). No course / class choices here any more.
import { useState } from "react"
import { fmtMoney } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import { useStore } from "@/store/store"
import { cn } from "@/lib/utils"
import { CheckIcon, ReceiptIcon, SendIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { sendEnrollToChat } from "@/lib/forms"

const ASKS = ["ข้อมูลผู้ปกครอง (ชื่อ · เบอร์ · ที่อยู่ · ใบกำกับภาษี)", "ข้อมูลนักเรียน (ชื่อ · ชั้น · โรงเรียน · วันเกิด)", "อยากเริ่มเรียนวันไหน · ขอใช้รถรับส่งไหม"]

export function SendEnrollDialog({ conversationId, onClose, onInvoice, preferNewest }: { conversationId: ID; onClose: () => void; onInvoice?: () => void; /** came back from drafting an invoice → pick the newest unpaid one */ preferNewest?: boolean }) {
  const [busy, setBusy] = useState(false)
  // owner 2026-11-19: send the invoice WITH the form — the parent opens one link, sees it, pays and attaches the slip.
  // Only this chat's own unpaid invoices are offered (the family's children, or the lead's child)
  const conv = useStore((s) => s.conversations.find((c) => c.id === conversationId))
  const students = useStore((s) => s.students)
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const lead = useStore((s) => s.leads.find((l) => l.id === conv?.leadId))
  const mine = new Set(students.filter((x) => (conv?.familyId && x.familyId === conv.familyId) || x.id === lead?.trialStudentId || x.id === lead?.convertedStudentId).map((x) => x.id))
  const open = invoices.filter((i) => mine.has(i.studentId) && i.number && i.status !== "paid" && i.status !== "void")
  const [invoiceId, setInvoiceId] = useState<ID | null>(() => (preferNewest ? [...open].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.id ?? null : null))
  const totalOf = (i: (typeof invoices)[number]) => { const b = branches.find((x) => x.id === i.branchId); return b ? Bill.invoiceTotals(i, { branch: b, courses, classes, holidays }).total : 0 }
  const send = async () => {
    setBusy(true)
    const r = await sendEnrollToChat(conversationId, [], undefined, invoiceId ?? undefined)
    setBusy(false)
    if (report(r, invoiceId ? "ส่งใบสมัครเรียนพร้อมใบแจ้งหนี้แล้ว" : "ส่งใบสมัครเรียนแล้ว")) onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlusIcon className="size-5" /> ส่งใบสมัครเรียน</DialogTitle>
          <DialogDescription>ขอข้อมูลครอบครัวจากผู้ปกครอง — คอร์สและคลาสที่คุยกันในแชท เลือกตอนสร้างใบแจ้งหนี้</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {ASKS.map((a) => <li key={a} className="flex items-start gap-2"><CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />{a}</li>)}
        </ul>
        {open.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">แนบใบแจ้งหนี้ไปด้วย <span className="font-normal text-muted-foreground">· ไม่บังคับ</span></p>
            {open.map((i) => { const on = invoiceId === i.id; return (
              <Button key={i.id} variant="row" size="inline" type="button" aria-pressed={on} onClick={() => setInvoiceId(on ? null : i.id)}
                className={cn("flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm", on ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
                <span className="min-w-0 flex-1 truncate">{i.number} · {students.find((x) => x.id === i.studentId)?.nickname}</span>
                <span className="shrink-0 tabular-nums">{fmtMoney(totalOf(i))}</span>
              </Button>
            ) })}
          </div>
        )}
        <p className="rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">ผู้ปกครองส่งกลับมา → การ์ดในแชท &quot;สร้างนักเรียน + ใบแจ้งหนี้&quot; → เลือกคอร์ส + คลาสในใบแจ้งหนี้</p>
        <DialogFooter className="items-center sm:justify-between">
          {onInvoice ? <Button variant="ghost" onClick={() => { onClose(); onInvoice() }}><ReceiptIcon /> ข้ามไปสร้างใบแจ้งหนี้</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
            <Button disabled={busy} onClick={send}><SendIcon /> ส่งในแชท</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
