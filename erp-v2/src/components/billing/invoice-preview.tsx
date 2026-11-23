"use client"
/* eslint-disable no-restricted-syntax -- ds-exception: printed paper sits on a paper-grey backdrop */

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Invoice } from "@/domain/types"
import { PrintDocument } from "./print-document"

const PAGE_W = 794 // A4 at 96 dpi
const PAGE_H = Math.round(PAGE_W * 1.414)

/**
 * Invoice paper preview (owner 2026-11-23): open any time while filling the invoice — the same paper as the printed
 * invoice, but with no running number ("DRAFT") and nothing saved. When happy, the admin presses Create in the editor.
 */
export function InvoicePreview({ draft, onClose }: { draft: Invoice; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / PAGE_W))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>ตัวอย่างใบแจ้งหนี้ (ยังไม่ออกเลข)</DialogTitle>
          <DialogDescription>เลขที่จะรันตอนกด &quot;สร้างใบแจ้งหนี้&quot; · ตัวอย่างนี้ยังไม่ถูกบันทึก</DialogDescription>
        </DialogHeader>
        <div ref={box} className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-neutral-200 p-0">
          <div style={{ width: PAGE_W * scale, height: PAGE_H * scale, margin: "0 auto" }}>
            <div style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <PrintDocument kind="invoice" id={draft.id} bare preview={draft} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
