"use client"

import { useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, FileTextIcon, PlusIcon, Share2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"

/** A document shown on a step of the invoice: the invoice PDF, a pay slip (image) or a receipt PDF. */
export interface DocItem {
  key: string
  kind: "invoice" | "receipt" | "slip"
  label: string
  /** invoice / receipt: the print page path (…/print/invoice/<id>) · slip: the image (data URL) */
  src: string
}

const PAGE_W = 794 // A4 at 96 dpi — the print page is laid out at this width, then scaled down for the thumbnail

const embedSrc = (d: DocItem) => (d.kind === "slip" ? d.src : `${d.src}#embed`)

function Thumb({ doc, w, className }: { doc: DocItem; w: number; className?: string }) {
  const h = w // 1:1 — the top of the page / the middle of the slip
  return (
    <span className={cn("relative block overflow-hidden rounded-md border bg-white shadow-sm", className)} style={{ width: w, height: h }}>
      {doc.kind === "slip" ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL slip
        <img src={doc.src} alt={doc.label} className="size-full object-cover object-top" />
      ) : (
        <iframe src={embedSrc(doc)} title={doc.label} tabIndex={-1} loading="lazy" aria-hidden
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white" style={{ width: PAGE_W, height: Math.round(PAGE_W * 1.414), transform: `scale(${w / PAGE_W})` }} />
      )}
    </span>
  )
}

/**
 * Documents on a stepper step (owner 2026-11-05): one document = a thumbnail; two or more (pay slips / receipts) = a
 * stack, front card tilted −2°, the one behind +2°. Click → the document open as a PDF/image with Download and Share.
 */
export function DocThumbs({ docs, onAdd, addLabel }: { docs: DocItem[]; /** not uploaded yet (or one more to add): a "+" tile that opens the upload dialog */ onAdd?: () => void; addLabel?: string }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!docs.length && !onAdd) return null
  const W = 56
  const stacked = docs.length > 1
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      {docs.length > 0 && <HoverCard>
        <HoverCardTrigger render={<Button variant="ghost" size="inline" type="button" onClick={() => setOpen(0)} className="shrink-0 rounded-lg p-1 hover:bg-muted/50" aria-label={docs.map((d) => d.label).join(", ")} />}>
          {/* one document = a thumbnail · several = a stack, front card −2°, the one behind +2° */}
          <span className="relative block" style={{ width: W + (stacked ? 12 : 0), height: W + (stacked ? 6 : 0) }}>
            {stacked && <Thumb doc={docs[1]} w={W} className="absolute left-3 top-0 rotate-2" />}
            <Thumb doc={docs[0]} w={W} className={cn(stacked ? "absolute left-0 top-1.5 -rotate-2" : "")} />
          </span>
        </HoverCardTrigger>
        <HoverCardContent side="left" className="w-auto max-w-64 text-xs">
          {docs.map((d) => <p key={d.key} className="font-medium">{d.label}</p>)}
          <p className="text-muted-foreground">กดเพื่อเปิด</p>
        </HoverCardContent>
      </HoverCard>}
      {onAdd && (
        <HoverCard>
          <HoverCardTrigger render={<Button variant="ghost" size="inline" type="button" onClick={onAdd} aria-label={addLabel} className="grid shrink-0 place-items-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/50 hover:text-foreground" style={{ width: W, height: W }} />}>
            <PlusIcon className="size-5" />
          </HoverCardTrigger>
          <HoverCardContent side="left" className="w-auto text-xs">{addLabel}</HoverCardContent>
        </HoverCard>
      )}
      {open !== null && <Viewer docs={docs} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Viewer({ docs, index, onIndex, onClose }: { docs: DocItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const doc = docs[index]
  const frame = useRef<HTMLIFrameElement>(null)
  const download = () => {
    if (doc.kind === "slip") {
      const a = document.createElement("a")
      a.href = doc.src
      a.download = `${doc.label}.jpg`
      a.click()
    } else frame.current?.contentWindow?.print() // same-origin print page — "Save as PDF" in the print dialog
  }
  const share = async () => {
    try {
      if (doc.kind === "slip") {
        const blob = await (await fetch(doc.src)).blob()
        const file = new File([blob], `${doc.label}.jpg`, { type: blob.type })
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: doc.label }); return }
        download()
        return
      }
      const url = `${location.origin}${doc.src}`
      if (navigator.share) await navigator.share({ title: doc.label, url })
      else { await navigator.clipboard.writeText(url); report({ ok: true, value: undefined }, "คัดลอกลิงก์เอกสารแล้ว") }
    } catch { /* the user closed the share sheet */ }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[92vh] flex-col gap-3 lg:max-w-220">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2"><FileTextIcon className="size-4" />{doc.label}</DialogTitle>
          <DialogDescription className="sr-only">เปิดเอกสาร ดาวน์โหลด หรือแชร์</DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 items-center gap-2">
          {docs.length > 1 && (
            <>
              <Button size="icon-sm" variant="outline" aria-label="ใบก่อนหน้า" disabled={index === 0} onClick={() => onIndex(index - 1)}><ChevronLeftIcon /></Button>
              <span className="text-xs tabular-nums text-muted-foreground">{index + 1} / {docs.length}</span>
              <Button size="icon-sm" variant="outline" aria-label="ใบถัดไป" disabled={index === docs.length - 1} onClick={() => onIndex(index + 1)}><ChevronRightIcon /></Button>
            </>
          )}
          <Button size="sm" variant="outline" className="ml-auto" onClick={download}><DownloadIcon /> ดาวน์โหลด</Button>
          <Button size="sm" onClick={share}><Share2Icon /> แชร์</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-neutral-100">
          {doc.kind === "slip" ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL slip
            <img src={doc.src} alt={doc.label} className="mx-auto max-h-full object-contain" />
          ) : (
            <iframe ref={frame} key={doc.key} src={embedSrc(doc)} title={doc.label} className="mx-auto block border-0 bg-white" style={{ width: PAGE_W, height: Math.round(PAGE_W * 1.414) }} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
