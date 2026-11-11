"use client"

// Component gallery (owner 2026-11-05, "ระดับ B") — an internal dev/design tool, NOT a real ERP page.
// Every design-system component (layer 2) is shown live inside its own iframe frame whose width you DRAG (reusing
// the sheet's edge-drag, ui/sheet.tsx → useEdgeDrag). Because each frame is a real nested viewport, the components'
// sm:/lg: breakpoints react to the FRAME width — so responsive gets checked here once instead of screenshotting
// every page at every size (RESPONSIVE.md). One light/dark switch flips all frames at once.
import { useEffect, useRef, useState } from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEdgeDrag } from "@/components/ui/sheet"
import { Page, PageHeader, Segmented, type SegmentOption } from "@/components/app/page-layout"
import { Button } from "@/components/ui/button"

const SECTIONS: { key: string; title: string; tall?: boolean }[] = [
  { key: "buttons", title: "Button — ทุก variant / size" },
  { key: "badges", title: "Badge · Pill" },
  { key: "tags", title: "Tags · Chips · Grade · Package" },
  { key: "cards", title: "Card" },
  { key: "kpi", title: "KPI (2 → 3 → 4 คอลัมน์)" },
  { key: "toolbar", title: "Page · Toolbar · Filters · Tabs", tall: true },
  { key: "table", title: "DataTable (เรียง · หมุด · ลากกว้าง · คอลัมน์)", tall: true },
  { key: "panel", title: "Panel · Form (ข้าง ↔ ล่าง ตามความกว้าง)", tall: true },
]

/** width presets tied to the 3 breakpoints (RESPONSIVE.md) · null = เต็มเฟรม */
const PRESETS: { label: string; w: number | null }[] = [
  { label: "base 375", w: 375 },
  { label: "sm 700", w: 700 },
  { label: "lg 1180", w: 1180 },
  { label: "เต็ม", w: null },
]

const MODE_OPTS: SegmentOption<"light" | "dark">[] = [
  { value: "light", label: "สว่าง", icon: SunIcon },
  { value: "dark", label: "มืด", icon: MoonIcon },
]

function band(w: number) {
  return w < 640 ? "base" : w < 1024 ? "sm" : "lg"
}

function Frame({ title, section, tall, dark }: { title: string; section: string; tall?: boolean; dark: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [w, setW] = useState<number | null>(null) // px, null = fill the frame
  const [eff, setEff] = useState(0) // the width actually on screen, for the band readout
  // keep the initial mode in the URL so the first paint matches; later toggles arrive by postMessage (no reload)
  const [src] = useState(() => `/kit/preview?only=${section}&mode=${dark ? "dark" : "light"}`)

  const postMode = () => iframeRef.current?.contentWindow?.postMessage({ type: "kit:mode", dark }, "*")
  useEffect(postMode, [dark])
  // a frame that just loaded (or asks when ready) gets the current mode
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "kit:ready" && e.source === iframeRef.current?.contentWindow) postMode()
    }
    window.addEventListener("message", onMsg)
    return () => window.removeEventListener("message", onMsg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark])

  // keep the on-screen width readout live (drag + fill mode + window resize)
  useEffect(() => {
    const measure = () => setEff(w ?? wrapRef.current?.clientWidth ?? 0)
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [w])

  const drag = useEdgeDrag((x) => {
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box) return
    setW(Math.round(Math.min(Math.max(x - box.left, 300), box.width)))
  })

  return (
    <section ref={wrapRef} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {eff ? `${eff}px · ${band(eff)}` : "—"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => {
            const active = w === p.w
            return (
              <Button variant="chip" size="inline" key={p.label} type="button" onClick={() => setW(p.w)} aria-pressed={active} className="px-2.5 py-1 text-xs">
                {p.label}
              </Button>
            )
          })}
        </div>
      </div>
      {/* the frame: a draggable right edge (reused from the sheet) + a nested-viewport iframe */}
      <div className="relative" style={{ width: w ? `min(${w}px, 100%)` : "100%" }}>
        <iframe ref={iframeRef} src={src} title={title} onLoad={postMode}
          className="w-full rounded-3xl border bg-card shadow-sm" style={{ height: tall ? 580 : 440 }} />
        <div role="separator" aria-orientation="vertical" aria-label={`ลากปรับความกว้าง ${title}`}
          title="ลากเพื่อปรับความกว้าง · ดับเบิลคลิก = เต็มเฟรม"
          onPointerDown={drag} onDoubleClick={() => setW(null)}
          className="group/rs absolute inset-y-0 -right-1.5 z-10 hidden w-3 cursor-col-resize touch-none sm:block">
          <span className="absolute inset-y-6 left-1/2 w-1 -translate-x-1/2 rounded-full bg-border transition-colors group-hover/rs:bg-primary/50 group-active/rs:bg-primary" />
        </div>
      </div>
    </section>
  )
}

export default function KitPage() {
  const [mode, setMode] = useState<"light" | "dark">("light")
  const dark = mode === "dark"
  return (
    <Page>
      <PageHeader title="คลังคอมโพเนนต์ (Component Gallery)"
        description="เครื่องมือภายใน — ตรวจ responsive ของ design system ที่เดียว · ลากขอบเฟรมเพื่อดู reflow lg → sm → base"
        actions={<Segmented value={mode} onChange={setMode} options={MODE_OPTS} label="โหมดแสง" />} />
      <p className="rounded-2xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        แต่ละกรอบคือ viewport ย่อยจริง — ลากขอบขวา (หรือกดปุ่ม base/sm/lg) แล้ว breakpoint ของคอมโพเนนต์จะตอบสนองตามความกว้างกรอบ
        ไม่ใช่ความกว้างเบราว์เซอร์ จึงไม่ต้องย่อ-ขยายหน้าต่างหรือถ่ายภาพทุกขนาด
      </p>
      <div className="space-y-6">
        {SECTIONS.map((s) => <Frame key={s.key} title={s.title} section={s.key} tall={s.tall} dark={dark} />)}
      </div>
    </Page>
  )
}
