"use client"

// Theme tuner (owner 2026-10-13: "อยากแก้สีและความโปร่งของ BG Card เอง"). Prototype-only: sliders and colour pickers
// that override the CSS tokens in globals.css live, saved in this browser. "คัดลอก CSS" gives the values to put into
// globals.css for good. Opened from โหมดสาธิต; mounted once in the shell so a saved theme applies on every page.
import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon, PaletteIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ThemeSettings {
  pageBg: string
  /** second colour → the page background becomes a gradient (empty = solid) */
  pageBg2: string
  cardColor: string
  /** 0–100 — how solid the card is */
  cardOpacity: number
  /** px of frosted-glass blur behind cards */
  cardBlur: number
  /** 0–100 — the line around cards */
  cardRing: number
  /** empty = the brand default */
  primary: string
  /** 0–100 — the white wash over the AI cards' moving blue */
  aiWash: number
}

const DEFAULTS: ThemeSettings = { pageBg: "#ffffff", pageBg2: "", cardColor: "#ffffff", cardOpacity: 100, cardBlur: 0, cardRing: 5, primary: "", aiWash: 80 }
const KEY = "nockerp-theme"
const EVENT = "nockerp:theme-tuner"

export const openThemeTuner = () => window.dispatchEvent(new Event(EVENT))

/** the CSS variables these settings produce — what the page uses, and what "คัดลอก CSS" hands out */
export function themeVars(t: ThemeSettings): Record<string, string> {
  return {
    "--background": t.pageBg,
    "--page-gradient": t.pageBg2 ? `linear-gradient(135deg, ${t.pageBg} 0%, ${t.pageBg2} 100%)` : "none",
    "--card": t.cardOpacity >= 100 ? t.cardColor : `color-mix(in oklab, ${t.cardColor} ${t.cardOpacity}%, transparent)`,
    "--card-backdrop": t.cardBlur > 0 ? `blur(${t.cardBlur}px) saturate(1.3)` : "none",
    "--card-ring": `${t.cardRing}%`,
    "--ai-wash": String(t.aiWash / 100),
    ...(t.primary ? { "--primary": t.primary, "--ring": `color-mix(in oklab, ${t.primary} 60%, white)` } : {}),
  }
}

function load(): ThemeSettings | null {
  try { const raw = localStorage.getItem(KEY); return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : null } catch { return null }
}

function apply(t: ThemeSettings | null) {
  const root = document.documentElement
  for (const k of Object.keys(themeVars({ ...DEFAULTS, primary: "#000" }))) root.style.removeProperty(k)
  if (t) for (const [k, v] of Object.entries(themeVars(t))) root.style.setProperty(k, v)
  // the ring override only switches on once something was tuned
  if (t) root.setAttribute("data-theme-tuned", "")
  else root.removeAttribute("data-theme-tuned")
}

export function ThemeTuner() {
  const [open, setOpen] = useState(false)
  const [t, setT] = useState<ThemeSettings>(DEFAULTS)
  const [copied, setCopied] = useState(false)

  // a saved theme applies on every page load, panel open or not
  useEffect(() => {
    const saved = load()
    if (saved) { setT(saved); apply(saved) } // eslint-disable-line react-hooks/set-state-in-effect
    const onOpen = () => setOpen(true)
    window.addEventListener(EVENT, onOpen)
    return () => window.removeEventListener(EVENT, onOpen)
  }, [])

  const set = (patch: Partial<ThemeSettings>) => {
    const next = { ...t, ...patch }
    setT(next)
    apply(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode — still applies for this visit */ }
  }
  const reset = () => {
    setT(DEFAULTS)
    apply(null)
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  }
  const copy = () => {
    const css = `:root {\n${Object.entries(themeVars(t)).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`
    navigator.clipboard?.writeText(css)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!open) return null
  return (
    <div role="dialog" aria-label="ปรับสีธีม" className="fixed bottom-5 left-5 z-50 w-80 space-y-3 rounded-3xl bg-popover p-4 text-sm shadow-2xl ring-1 ring-foreground/10 print:hidden">
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary"><PaletteIcon className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">ปรับสีธีม</p>
          <p className="text-[11px] text-muted-foreground">เห็นผลทันที · บันทึกในเบราว์เซอร์นี้</p>
        </div>
        <Button size="icon-sm" variant="ghost" aria-label="ปิด" onClick={() => setOpen(false)}><XIcon /></Button>
      </div>

      <Group title="พื้นหลังหน้า">
        <ColorRow label="สี" value={t.pageBg} onChange={(pageBg) => set({ pageBg })} />
        <ColorRow label="ไล่สีไปที่" value={t.pageBg2} optional onChange={(pageBg2) => set({ pageBg2 })} />
      </Group>

      <Group title="การ์ด">
        <ColorRow label="สี" value={t.cardColor} onChange={(cardColor) => set({ cardColor })} />
        <Slider label="ความทึบ" value={t.cardOpacity} min={20} max={100} unit="%" onChange={(cardOpacity) => set({ cardOpacity })} />
        <Slider label="เบลอด้านหลัง" value={t.cardBlur} min={0} max={30} unit="px" onChange={(cardBlur) => set({ cardBlur })} />
        <Slider label="เส้นขอบ" value={t.cardRing} min={0} max={30} unit="%" onChange={(cardRing) => set({ cardRing })} />
        {t.cardOpacity < 100 && !t.pageBg2 && t.pageBg.toLowerCase() === "#ffffff" && <p className="text-[11px] text-amber-700">การ์ดโปร่งบนพื้นขาวจะไม่เห็นความต่าง — ลองเปลี่ยนสีพื้นหลัง หรือใส่ &quot;ไล่สีไปที่&quot;</p>}
      </Group>

      <Group title="สีอื่น">
        <ColorRow label="สีแบรนด์" value={t.primary} optional placeholder="ค่าเดิม" onChange={(primary) => set({ primary })} />
        <Slider label="ฝ้าขาวบนการ์ด AI" value={t.aiWash} min={0} max={100} unit="%" onChange={(aiWash) => set({ aiWash })} />
      </Group>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={reset}><RotateCcwIcon /> ค่าเดิม</Button>
        <Button size="sm" className="ml-auto" onClick={copy}>{copied ? <CheckIcon /> : <CopyIcon />} {copied ? "คัดลอกแล้ว" : "คัดลอก CSS"}</Button>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl bg-muted/50 p-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
    </section>
  )
}

function ColorRow({ label, value, onChange, optional, placeholder = "ไม่ใช้" }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean; placeholder?: string }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs">{label}</span>
      <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className={cn("h-7 w-9 cursor-pointer rounded-md border bg-transparent p-0.5", !value && "opacity-40")} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-7 min-w-0 flex-1 rounded-lg bg-background px-2 font-mono text-xs uppercase outline-none" />
      {optional && value && <button type="button" onClick={() => onChange("")} className="text-xs text-muted-foreground underline">ล้าง</button>}
    </label>
  )
}

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-primary" />
      <span className="w-10 text-right text-xs tabular-nums">{value}{unit}</span>
    </label>
  )
}
