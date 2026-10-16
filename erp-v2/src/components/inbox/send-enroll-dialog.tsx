"use client"

// owner 2026-10-16 (round 3): the admin asks the parent in the chat (which course, which days) and picks them on the
// invoice — the one place a course + classes are chosen. The enroll form only collects what the admin doesn't have:
// the family + child details (+ when they'd like to start, bus). No course / class choices here any more.
import { useState } from "react"
import { CheckIcon, ReceiptIcon, SendIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { sendEnrollToChat } from "@/lib/forms"

const ASKS = ["ข้อมูลผู้ปกครอง (ชื่อ · เบอร์ · ที่อยู่ · ใบกำกับภาษี)", "ข้อมูลนักเรียน (ชื่อ · ชั้น · โรงเรียน · วันเกิด)", "อยากเริ่มเรียนวันไหน · ขอใช้รถรับส่งไหม"]

export function SendEnrollDialog({ conversationId, onClose, onInvoice }: { conversationId: ID; onClose: () => void; onInvoice?: () => void }) {
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    const r = await sendEnrollToChat(conversationId, [])
    setBusy(false)
    if (report(r, "ส่งใบสมัครเรียนแล้ว")) onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlusIcon className="size-5" /> ส่งใบสมัครเรียน</DialogTitle>
          <DialogDescription>ขอข้อมูลครอบครัวจากผู้ปกครอง — คอร์สและคลาสที่คุยกันในแชท เลือกตอนสร้างใบแจ้งหนี้</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {ASKS.map((a) => <li key={a} className="flex items-start gap-2"><CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />{a}</li>)}
        </ul>
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
