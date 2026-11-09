"use client"

import { useEffect, useRef, useState } from "react"
import { NativeSelect } from "@/components/app/native-select"
import type { FormLang } from "@/domain/types"
import { cn } from "@/lib/utils"

/** The header every parent form shares (owner 2026-11-09): the form's name on top, "business · branch" under it, the language dropdown on the right.
 *  It SHRINKS with the scroll instead of vanishing: sticky with a negative `top` = its big block, so the two-line title scrolls away and a slim bar
 *  with the form name stays. --p (0→1) fades that bar in; the bar hangs OUT of flow so the page has no empty gap and nothing jumps. */
export function ShrinkHeader({ title, subtitle, lang, onLang, className }: { title: string; subtitle: string; lang: FormLang; onLang?: (l: FormLang) => void; className?: string }) {
  const [hdr, setHdr] = useState<HTMLElement | null>(null)
  const bigRef = useRef<HTMLDivElement>(null)
  const [bigH, setBigH] = useState(60)
  useEffect(() => {
    const big = bigRef.current
    if (!hdr || !big) return
    const h = big.offsetHeight
    setBigH(h)
    let box: HTMLElement | null = hdr.parentElement
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement
    let raf = 0
    const update = () => { raf = 0; hdr.style.setProperty("--p", String(Math.min(1, Math.max(0, (box ? box.scrollTop : window.scrollY) / Math.max(1, h))))) }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    const target: HTMLElement | Window = box ?? window
    target.addEventListener("scroll", onScroll, { passive: true })
    return () => { target.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [hdr])
  return (
    <header ref={setHdr} style={{ top: -bigH }} className={cn("sticky z-20 bg-background [--p:0]", className)}>
      <div ref={bigRef} className="flex items-center gap-3 px-4 pb-2.5 pt-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {onLang && <NativeSelect className="w-32 shrink-0" value={lang} onChange={(e) => onLang(e.target.value as FormLang)} options={[{ value: "th", label: "ไทย" }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]} />}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-full flex h-10 items-center border-b bg-background/95 px-4 backdrop-blur" style={{ opacity: "var(--p)" }}>
        <p className="truncate text-sm font-semibold">{title}</p>
      </div>
    </header>
  )
}
