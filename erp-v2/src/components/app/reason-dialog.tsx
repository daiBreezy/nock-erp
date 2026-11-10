"use client"

// NEGATIVE-ACTIONS.md §5 — archive always asks WHY (Q2 default). Shared reason prompt for เก็บเข้าคลัง actions.
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export function ReasonDialog({ open, title, description, placeholder = "เหตุผล (จำเป็น)", confirmLabel = "เก็บเข้าคลัง", onConfirm, onClose }: {
  open: boolean
  title: string
  description?: string
  placeholder?: string
  confirmLabel?: string
  onConfirm: (reason: string) => void
  onClose: () => void
}) {
  const [reason, setReason] = useState("")
  const close = () => { setReason(""); onClose() }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="lg:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Textarea rows={3} autoFocus placeholder={placeholder} value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="ghost" onClick={close}>ยกเลิก</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => { onConfirm(reason.trim()); close() }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
