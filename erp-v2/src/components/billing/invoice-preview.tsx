"use client"
/* eslint-disable no-restricted-syntax -- ds-exception: printed paper sits on a paper-grey backdrop */

import { useEffect, useRef, useState } from "react"
import { ZoomInIcon, ZoomOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Invoice } from "@/domain/types"
import { PrintDocument } from "./print-document"

const PAGE_W = 794 // A4 at 96 dpi
const PAGE_H = Math.round(PAGE_W * 1.414)

/**
 * Invoice paper preview (owner 2026-11-23; side-by-side with the form since 2026-11-24): the same paper as the printed
 * invoice, with no running number ("DRAFT") and nothing saved. The editor shows it next to the form on wide screens.
 */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

/** the paper, fitted to its box, with zoom in / out (owner 2026-11-24) — zoomed past the box it scrolls both ways */
export function InvoicePaper({ draft, className }: { draft: Invoice; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setFit(Math.min(1, el.clientWidth / PAGE_W))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const step = (dir: 1 | -1) => setZoom((z) => (dir > 0 ? ZOOM_STEPS.find((x) => x > z + 0.001) ?? z : [...ZOOM_STEPS].reverse().find((x) => x < z - 0.001) ?? z))
  const scale = fit * zoom
  // owner 2026-11-24: drag the paper to move around it once zoomed in (grab cursor)
  const [grabbing, setGrabbing] = useState(false)
  const pan = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = box.current
    if (!el || e.button !== 0 || (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)) return
    e.preventDefault()
    el.setPointerCapture(e.pointerId)
    setGrabbing(true)
    let x = e.clientX, y = e.clientY
    const move = (ev: PointerEvent) => { el.scrollLeft -= ev.clientX - x; el.scrollTop -= ev.clientY - y; x = ev.clientX; y = ev.clientY }
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); setGrabbing(false) }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointercancel", up)
  }
  const canPan = zoom > 1.001 || fit < 1
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-end gap-1">
        <Button size="icon-xs" variant="outline" aria-label="ซูมออก" title="ซูมออก" disabled={zoom <= ZOOM_STEPS[0]} onClick={() => step(-1)}><ZoomOutIcon /></Button>
        <Button type="button" variant="ghost" size="inline" className="min-w-12 rounded-md px-1 text-center text-xs tabular-nums text-muted-foreground hover:bg-muted" aria-label="พอดีกับความกว้าง" title="พอดีกับความกว้าง" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</Button>
        <Button size="icon-xs" variant="outline" aria-label="ซูมเข้า" title="ซูมเข้า" disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} onClick={() => step(1)}><ZoomInIcon /></Button>
      </div>
      <div ref={box} onPointerDown={pan} className={cn(className ?? "min-h-0 flex-1 overflow-auto rounded-xl bg-neutral-200 p-0", canPan && (grabbing ? "cursor-grabbing select-none" : "cursor-grab"))}>
        <div style={{ width: PAGE_W * scale, height: PAGE_H * scale, margin: "0 auto" }}>
          <div style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <PrintDocument kind="invoice" id={draft.id} bare preview={draft} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function InvoicePreview({ draft, onClose }: { draft: Invoice; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92dvh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>ตัวอย่างใบแจ้งหนี้ (ยังไม่มีเลข)</DialogTitle>
          <DialogDescription>เลขที่จะรันตอน Admin ออกเลข Official หลังอนุมัติ · ตัวอย่างนี้ยังไม่ถูกบันทึก</DialogDescription>
        </DialogHeader>
        <InvoicePaper draft={draft} />
      </DialogContent>
    </Dialog>
  )
}
