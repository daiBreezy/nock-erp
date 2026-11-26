"use client"

import { useState } from "react"
import { ChevronDownIcon, ClipboardListIcon, DoorOpenIcon, MessageSquareHeartIcon, ReceiptIcon, UserPlusIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pill } from "@/components/app/badges"
import { PanelMore } from "@/components/app/form-shell"
import { EnrollReviewDialog } from "@/components/crm/enroll-review"
import { fmtDate } from "@/domain/dates"
import { FORM_STAGE_LABEL, FORM_STAGE_TONE, type FormItem } from "@/domain/rules/form-hub"
import type { EnrollSubmission, Family, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { EnrollDetail } from "./enroll-form-card"
import { ResponseAnswers } from "./form-builder"

const ICON = { enroll: UserPlusIcon, custom: ClipboardListIcon, exit: DoorOpenIcon, survey: MessageSquareHeartIcon } as const

export interface FormActions {
  onGoBilling?: () => void
  onOpenInvoice?: (id: ID) => void
  onOpenStudent?: (id: ID) => void
}

/**
 * owner 2026-11-26 — ONE card for every form: Header (name · stage · date) · Body (a one-line summary) · CTA (the next step).
 * The details (what the parent still has to fill, the answers …) are hidden until the card is expanded, so many forms fit on one page.
 */
export function FormCard({ item, family, sub, actions, defaultOpen }: { item: FormItem; family: Family; sub?: EnrollSubmission; actions?: FormActions; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  const [review, setReview] = useState(false)
  const [closing, setClosing] = useState(false)
  const Icon = item.kind === "enroll" && item.key === "enroll-wait" ? ReceiptIcon : ICON[item.kind]
  const forms = useStore((s) => s.formDefs)
  const response = useStore((s) => (item.responseId ? s.formResponses.find((r) => r.id === item.responseId) : undefined))
  const invoices = useStore((s) => s.invoices)
  const closeSend = useStore((s) => s.closeFormSend)
  const setWaiting = useStore((s) => s.setEnrollWaiting)
  const setBound = useStore((s) => s.setInvoiceEnroll)
  const unpaid = (item.invoiceIds ?? []).filter((id) => invoices.find((i) => i.id === id)?.status !== "paid")
  const form = response ? forms.find((f) => f.id === response.formId) : undefined
  const hasDetail = item.kind === "enroll" || (item.kind === "custom" && !!response && !!form)
  const cta: { label: string; run: () => void } | null =
    item.stage === "waiting_invoice" ? { label: tx("ไปที่การเงิน"), run: () => actions?.onGoBilling?.() }
    : item.stage === "ready_to_send" && item.invoiceIds?.[0] ? { label: tx("เปิดใบแจ้งหนี้เพื่อส่ง"), run: () => actions?.onOpenInvoice?.(item.invoiceIds![0]) }
    : item.stage === "needs_review" && sub ? { label: tx("ตรวจคำตอบ"), run: () => setReview(true) }
    : item.stage === "needs_close" && item.kind === "enroll" && item.sendId ? { label: tx("จบงาน"), run: () => setClosing(true) }
    : item.stage === "needs_close" && item.kind === "exit" && item.studentIds[0] ? { label: tx("ปิดการออก"), run: () => actions?.onOpenStudent?.(item.studentIds[0]) }
    : null
  const date = item.doneAt ?? item.sentAt
  const more = item.key === "enroll-wait" ? [{ label: tx("ยกเลิกการผูกกับใบแจ้งหนี้"), icon: XCircleIcon, destructive: true, onClick: () => { setWaiting(family.id, false); for (const id of item.invoiceIds ?? []) setBound(id, false) } }] : []
  return (
    <section className={cn("rounded-2xl border", item.open ? "bg-background" : "bg-muted/30")}>
      {/* Header + subtext in one block: name · date · status, the one-line summary right under the name */}
      <Button variant="row" size="inline" type="button" disabled={!hasDetail} aria-expanded={hasDetail ? open : undefined} onClick={() => setOpen(!open)} className="flex w-full flex-col items-stretch gap-0.5 px-3 py-2.5 text-left text-sm">
        <span className="flex w-full items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium">{item.kind === "survey" && item.year ? tx("แบบสอบถามประจำปี {0}", [item.year + 543]) : tx(item.title)}</span>
          {date && <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(date.slice(0, 10))}</span>}
          <Pill tone={FORM_STAGE_TONE[item.stage]}>{tx(FORM_STAGE_LABEL[item.stage])}</Pill>
          {hasDetail && <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />}
        </span>
        <span className="block pl-6 text-xs text-muted-foreground">{tx(item.summary)}</span>
      </Button>
      {open && hasDetail && (
        <div className="space-y-2 border-t bg-muted/20 px-3 py-3">
          {item.kind === "enroll" && <EnrollDetail family={family} />}
          {item.kind === "custom" && response && form && <ResponseAnswers form={form} r={response} />}
        </div>
      )}
      {/* CTA: always at the bottom of the card — the next step on the right, the negative ones behind ⋯ on the left */}
      {(cta || more.length > 0) && (
        <div className="flex items-center gap-2 px-3 pt-1 pb-3">
          <PanelMore items={more} className="size-9" />
          {cta && <Button className="ml-auto" variant={item.stage === "needs_close" || item.stage === "needs_review" ? "default" : "outline"} onClick={cta.run}>{cta.label}</Button>}
        </div>
      )}
      {review && sub && <EnrollReviewDialog sub={sub} onClose={() => setReview(false)} onDone={() => setReview(false)} />}
      {closing && item.sendId && (
        <Dialog open onOpenChange={(o) => !o && setClosing(false)}>
          <DialogContent className="lg:max-w-md">
            <DialogHeader>
              <DialogTitle>{tx("จบงานใบสมัครเรียน + ใบแจ้งหนี้")}</DialogTitle>
              <DialogDescription>{unpaid.length ? tx("ยังมีใบแจ้งหนี้ที่ยังไม่ชำระครบ {0} ใบ — จบงานแล้วจะหายจากภาพรวม ยืนยันไหม", [unpaid.length]) : tx("ชำระครบแล้ว — จบงานนี้ออกจากภาพรวม")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setClosing(false)}>{tx("ยกเลิก")}</Button>
              <Button onClick={() => { if (report(closeSend(item.sendId!), tx("จบงานแล้ว"))) setClosing(false) }}>{tx("จบงาน")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
