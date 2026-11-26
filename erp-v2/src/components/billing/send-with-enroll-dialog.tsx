"use client"

import { useState } from "react"
import { SendIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { tx } from "@/lib/i18n"

/**
 * owner 2026-11-26 — confirming the send of an invoice for a NEWCOMER (a Lead / a new child): does it go alone, or WITH the Enroll Form
 * (one link)? An invoice already bound to the Enroll Form (made from the Enroll card) opens with "with the form" chosen.
 */
export function SendWithEnrollDialog({ bound, setLabel, onClose, onInvoiceOnly, onWithEnroll }: {
  bound: boolean
  /** "ชุดครอบครัว · A + B" for a set, else the invoice number */
  setLabel: string
  onClose: () => void
  onInvoiceOnly: () => void
  onWithEnroll: () => Promise<void> | void
}) {
  const [mode, setMode] = useState<"with" | "only">(bound ? "with" : "only")
  const [busy, setBusy] = useState(false)
  const opts: { key: "with" | "only"; title: string; sub: string }[] = [
    { key: "with", title: tx("ส่งพร้อมใบสมัครเรียน"), sub: tx("ลิงก์เดียว: ผู้ปกครองกรอกใบสมัคร เห็นใบแจ้งหนี้ ชำระ และแนบสลิป") },
    { key: "only", title: tx("ส่งใบแจ้งหนี้อย่างเดียว"), sub: tx("ส่งข้อความและใบแจ้งหนี้ตามปกติ — ไม่มีใบสมัครเรียน") },
  ]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlusIcon className="size-5" /> {tx("ส่งใบแจ้งหนี้")} · {setLabel}</DialogTitle>
          <DialogDescription>{bound ? tx("ใบนี้ผูกกับใบสมัครเรียนไว้แล้ว") : tx("ลูกค้าใหม่ — ยังไม่เคยชำระ ส่งพร้อมใบสมัครเรียนไปเลยไหม")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {opts.map((o) => (
            <Button key={o.key} variant="row" size="inline" type="button" aria-pressed={mode === o.key} onClick={() => setMode(o.key)}
              className={cn("flex w-full items-start gap-2 rounded-2xl border px-3 py-2 text-left text-sm", mode === o.key ? "border-primary bg-primary/10" : "hover:bg-muted")}>
              <span className={cn("mt-1 size-3.5 shrink-0 rounded-full border", mode === o.key && "border-4 border-primary")} />
              <span className="min-w-0 flex-1"><span className="block font-medium">{o.title}</span><span className="block text-xs text-muted-foreground">{o.sub}</span></span>
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button disabled={busy} onClick={async () => { if (mode === "only") { onInvoiceOnly(); return } setBusy(true); try { await onWithEnroll() } finally { setBusy(false) } }}><SendIcon /> {tx("ยืนยันส่ง")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
