"use client"

// Design System › ThemeSettings (2026-11-10): what one person may change for themselves — mode, density, size, their
// own main colour and a tinted page. Everything stays inside the Core: status / tag colours never change, the colour
// runs through the same formula as a business's brand colour (contrast-checked), and the tint has locked lightness.
// Saved in this browser (prototype: no backend). Mounted once in the shell via <ThemeChip />.
import { useEffect, useSyncExternalStore } from "react"
import { CheckIcon, MonitorIcon, MoonIcon, PaletteIcon, RotateCcwIcon, SunIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Segmented } from "./page-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ThemePrefs {
  mode: "light" | "dark" | "system"
  density: "comfortable" | "compact"
  scale: "md" | "lg"
  /** "" = the business's brand colour */
  primary: string
  tint: boolean
}

const DEFAULTS: ThemePrefs = { mode: "light", density: "comfortable", scale: "md", primary: "", tint: false }
const KEY = "nockerp-theme-prefs"
const SWATCHES = ["#047857", "#0369a1", "#6d28d9", "#c2410c", "#334155", "#be123c"]
/** the hue (OKLCH) of each business's brand — used for the tint when the person hasn't picked a colour */
const BRAND_HUE: Record<string, number> = { nockacademy: 12, liclass: 230 }

// ---------- tiny store (localStorage + subscribers) ----------
let current: ThemePrefs = DEFAULTS
let loaded = false
const subs = new Set<() => void>()
function read(): ThemePrefs {
  if (!loaded && typeof window !== "undefined") {
    loaded = true
    try { const raw = localStorage.getItem(KEY); if (raw) current = { ...DEFAULTS, ...JSON.parse(raw) } } catch { /* private mode */ }
  }
  return current
}
function write(patch: Partial<ThemePrefs>) {
  current = { ...read(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(current)) } catch { /* private mode */ }
  subs.forEach((f) => f())
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
export function useThemePrefs(): [ThemePrefs, (p: Partial<ThemePrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULTS)
  return [prefs, write]
}

// ---------- colour maths (OKLCH ⇄ sRGB) ----------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
}
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const enc = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
function rgbToOklch([r, g, b]: [number, number, number]): [number, number, number] {
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360]
}
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  return rgb.map((x) => Math.min(1, Math.max(0, enc(Math.max(0, x))))) as [number, number, number]
}
const luminance = (rgb: [number, number, number]) => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a: [number, number, number], b: [number, number, number]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

/**
 * One colour → the brand-driven tokens, light and dark (the same formula as Design System › ธีมและแบรนด์).
 * Light: L ≤ 0.55 and lowered until white text reaches 4.5:1. Dark: L 0.72 with dark text on it.
 */
export function tokensFromColour(hex: string, dark: boolean): Record<string, string> {
  const [, C0, H] = rgbToOklch(hexToRgb(hex))
  if (dark) {
    const C = Math.min(C0, 0.16)
    return { "--primary": `oklch(0.72 ${C.toFixed(3)} ${H.toFixed(1)})`, "--primary-foreground": `oklch(0.2 0.02 ${H.toFixed(1)})`, "--ring": "var(--primary)" }
  }
  const C = Math.min(C0, 0.2)
  let L = 0.55
  const white: [number, number, number] = [1, 1, 1]
  while (L > 0.3 && contrast(oklchToRgb(L, C, H), white) < 4.5) L -= 0.01
  return {
    "--primary": `oklch(${L.toFixed(2)} ${C.toFixed(3)} ${H.toFixed(1)})`,
    "--primary-foreground": "oklch(0.985 0 0)",
    "--ring": `oklch(0.7 ${Math.min(C, 0.14).toFixed(3)} ${H.toFixed(1)})`,
    "--sidebar": `oklch(0.985 0.003 ${H.toFixed(1)})`,
    "--sidebar-accent": `oklch(0.95 0.02 ${H.toFixed(1)})`,
    "--sidebar-accent-foreground": `oklch(0.3 0.08 ${H.toFixed(1)})`,
  }
}

const USER_VARS = ["--primary", "--primary-foreground", "--ring", "--sidebar", "--sidebar-accent", "--sidebar-accent-foreground", "--page-tint"]

/** applies the prefs to <html>; mount once (ThemeChip does) */
function useApplyPrefs(prefs: ThemePrefs) {
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = prefs.mode === "dark" || (prefs.mode === "system" && mq.matches)
      root.classList.toggle("dark", dark)
      root.setAttribute("data-density", prefs.density)
      root.setAttribute("data-scale", prefs.scale)
      for (const v of USER_VARS) root.style.removeProperty(v)
      if (prefs.primary) for (const [k, v] of Object.entries(tokensFromColour(prefs.primary, dark))) root.style.setProperty(k, v)
      if (prefs.tint) {
        const hue = prefs.primary ? rgbToOklch(hexToRgb(prefs.primary))[2] : BRAND_HUE[root.getAttribute("data-brand") ?? ""] ?? 12
        root.style.setProperty("--page-tint", dark ? `oklch(0.17 0.015 ${hue.toFixed(1)})` : `oklch(0.98 0.012 ${hue.toFixed(1)})`)
        root.setAttribute("data-tint", "")
      } else root.removeAttribute("data-tint")
    }
    apply()
    // follow the system while on "ตามระบบ", and re-tint when the branch (brand) changes
    mq.addEventListener("change", apply)
    const obs = new MutationObserver(apply)
    obs.observe(root, { attributes: true, attributeFilter: ["data-brand"] })
    return () => { mq.removeEventListener("change", apply); obs.disconnect() }
  }, [prefs])
}

/** the palette chip in the top bar — opens the person's theme settings */
export function ThemeChip() {
  const [prefs, set] = useThemePrefs()
  useApplyPrefs(prefs)
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="inline" type="button" aria-label="ธีม" className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted" />}>
        <PaletteIcon className="size-3.5 text-muted-foreground" />ธีม
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-4">
        <Row label="โหมด">
          <Segmented label="โหมด" value={prefs.mode} onChange={(mode) => set({ mode })}
            options={[{ value: "light", label: "สว่าง", icon: SunIcon }, { value: "dark", label: "มืด", icon: MoonIcon }, { value: "system", label: "ระบบ", icon: MonitorIcon }]} />
        </Row>
        <Row label="ความแน่น">
          <Segmented label="ความแน่น" value={prefs.density} onChange={(density) => set({ density })} options={[{ value: "comfortable", label: "สบายตา" }, { value: "compact", label: "กระชับ" }]} />
        </Row>
        <Row label="ขนาด">
          <Segmented label="ขนาด" value={prefs.scale} onChange={(scale) => set({ scale })} options={[{ value: "md", label: "ปกติ" }, { value: "lg", label: "ใหญ่" }]} />
        </Row>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">สีหลักของฉัน</span>
            {prefs.primary && (
              <Button variant="ghost" size="inline" type="button" onClick={() => set({ primary: "" })} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <RotateCcwIcon className="size-3" />กลับไปใช้สีแบรนด์
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Swatch on={!prefs.primary} onClick={() => set({ primary: "" })} label="สีแบรนด์" style={{ background: "var(--brand)" }} />
            {SWATCHES.map((c) => <Swatch key={c} on={prefs.primary === c} onClick={() => set({ primary: c })} label={c} style={{ background: c }} />)}
            <label className="relative grid size-7 cursor-pointer place-items-center rounded-full border border-dashed text-muted-foreground" title="เลือกสีเอง">
              <PaletteIcon className="size-3.5" />
              <Input type="color" className="absolute inset-0 h-full cursor-pointer border-0 p-0 opacity-0" value={prefs.primary || "#be123c"} onChange={(e) => set({ primary: e.target.value })} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">สีสถานะ (เขียว · เหลือง · แดง) ไม่เปลี่ยนตาม</p>
        </div>
        <Row label="พื้นหลังอมสี">
          <Switch checked={prefs.tint} onCheckedChange={(tint) => set({ tint })} />
        </Row>
      </PopoverContent>
    </Popover>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{label}</span>{children}</div>
}

function Swatch({ on, onClick, label, style }: { on: boolean; onClick: () => void; label: string; style: React.CSSProperties }) {
  return (
    <Button variant="ghost" size="inline" type="button" aria-label={label} aria-pressed={on} onClick={onClick} style={style}
      className={cn("grid size-7 place-items-center rounded-full text-white ring-offset-2 ring-offset-popover", on && "ring-2 ring-foreground")}>
      {on && <CheckIcon className="size-3.5" />}
    </Button>
  )
}
