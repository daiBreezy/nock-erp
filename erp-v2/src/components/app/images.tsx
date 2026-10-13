"use client"

// Pictures on questions, answers and Dev tickets (owner 2026-10-13: "เพิ่มรูปได้ เพื่อให้คนอื่น Preview ได้").
// ImageAttach picks / pastes images (shrunk to small JPEGs — the prototype keeps them in the browser);
// ImageGallery shows thumbnails and opens a full-size preview with previous / next.
import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, ImagePlusIcon, XIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { slipDataUrl } from "@/lib/image"
import { cn } from "@/lib/utils"

const MAX = 6

export function ImageAttach({ value, onChange, className }: { value: string[]; onChange: (v: string[]) => void; className?: string }) {
  const [busy, setBusy] = useState(false)
  const add = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX - value.length)
    if (!imgs.length) return
    setBusy(true)
    try { onChange([...value, ...(await Promise.all(imgs.map((f) => slipDataUrl(f, 1400))))]) } finally { setBusy(false) }
  }
  return (
    <div className={cn("space-y-2", className)} onPaste={(e) => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); add(f) } }}>
      <div className="flex flex-wrap gap-2">
        {value.map((src, i) => (
          <span key={i} className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
            <img src={src} alt={`รูป ${i + 1}`} className="size-20 rounded-xl object-cover ring-1 ring-foreground/10" />
            <button type="button" aria-label="เอารูปออก" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background shadow"><XIcon className="size-3" /></button>
          </span>
        ))}
        {value.length < MAX && (
          <label className={cn("grid size-20 cursor-pointer place-items-center rounded-xl border border-dashed text-muted-foreground hover:bg-muted/50", busy && "opacity-50")}>
            <span className="flex flex-col items-center gap-0.5 text-[11px]"><ImagePlusIcon className="size-5" />{busy ? "กำลังใส่…" : "เพิ่มรูป"}</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add([...(e.target.files ?? [])]); e.target.value = "" }} />
          </label>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">แนบได้ {MAX} รูป · วางภาพหน้าจอด้วย ⌘V ได้</p>
    </div>
  )
}

export function ImageGallery({ images, size = "md" }: { images?: string[]; size?: "sm" | "md" }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!images?.length) return null
  const n = images.length
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <button key={i} type="button" onClick={() => setOpen(i)} className="overflow-hidden rounded-xl ring-1 ring-foreground/10 hover:ring-primary/50" aria-label={`ดูรูป ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
            <img src={src} alt={`รูป ${i + 1}`} className={cn("object-cover", size === "sm" ? "size-14" : "size-24")} />
          </button>
        ))}
      </div>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[min(92vw,1100px)] gap-2 p-3 sm:max-w-[min(92vw,1100px)]">
          <DialogTitle className="text-sm">รูป {open !== null ? open + 1 : 0} / {n}</DialogTitle>
          {open !== null && (
            <div className="relative grid place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
              <img src={images[open]} alt={`รูป ${open + 1}`} className="max-h-[78vh] w-auto rounded-xl object-contain" />
              {n > 1 && <>
                <button type="button" aria-label="รูปก่อนหน้า" onClick={() => setOpen((open - 1 + n) % n)} className="absolute top-1/2 left-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow"><ChevronLeftIcon className="size-5" /></button>
                <button type="button" aria-label="รูปถัดไป" onClick={() => setOpen((open + 1) % n)} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/90 shadow"><ChevronRightIcon className="size-5" /></button>
              </>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** label · value rows for the top of a panel — a tidy grid instead of one run-on line */
export function MetaGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 rounded-2xl bg-muted/40 p-3 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-1.5">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
