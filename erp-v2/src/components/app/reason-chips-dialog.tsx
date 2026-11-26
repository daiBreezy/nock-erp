"use client"

// owner 2026-11-26 — "why?" is always a row of CHIPS (pick one) + an optional Remark; ONE dialog for archiving a family and for cancelling a form link.
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export interface ReasonOption { id: string; label: string }
export interface ReasonPick { reasonId: string; label: string; remark?: string }

export function ReasonChipsDialog({ open, title, description, options, remarkRequiredFor = ["other"], confirmLabel, destructive, onConfirm, onClose }: {
  open: boolean
  title: string
  description?: string
  options: ReasonOption[]
  /** picking one of these makes the Remark required (default: the "other" chip) */
  remarkRequiredFor?: string[]
  confirmLabel: string
  destructive?: boolean
  onConfirm: (pick: ReasonPick) => void
  onClose: () => void
}) {
  const [id, setId] = useState<string | null>(null)
  const [remark, setRemark] = useState("")
  const close = () => { setId(null); setRemark(""); onClose() }
  const picked = options.find((o) => o.id === id)
  const needRemark = !!id && remarkRequiredFor.includes(id)
  const ok = !!picked && (!needRemark || !!remark.trim())
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{tx("เหตุผล")} *</Label>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
              <Button key={o.id} variant="ghost" size="inline" type="button" aria-pressed={id === o.id} onClick={() => setId(o.id)}
                className={cn("rounded-full border px-2.5 py-1 text-xs", id === o.id ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{o.label}</Button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{tx("Remark")}{needRemark ? " *" : <span className="font-normal text-muted-foreground"> · {tx("ไม่บังคับ")}</span>}</Label>
          <Textarea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={tx("รายละเอียดสั้นๆ")} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>{tx("ยกเลิก")}</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={!ok} onClick={() => { onConfirm({ reasonId: picked!.id, label: picked!.label, remark: remark.trim() || undefined }); close() }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
