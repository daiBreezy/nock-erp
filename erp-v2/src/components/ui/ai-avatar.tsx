"use client"

// AI avatar — a glowing orb with blinking eyes (owner 2026-10-13: Nock's face, "น่ารักกว่า"). From the pasted
// "components-primitives-avatar"; the tap squish is plain CSS here instead of the `motion` package (one less dependency).
import { useEffect, useId, useRef } from "react"
import { cn } from "@/lib/utils"

export type AvatarColor = "blue" | "orange" | "red" | "green" | "purple" | "yellow" | "cyan" | "pink" | "indigo" | "lime" | "turquoise" | "violet"
export type AvatarSize = "xs" | "sm" | "md" | "lg"
export type AvatarShape = "circle" | "square" | "squircle"

export interface AvatarProps {
  blinking?: boolean
  color?: AvatarColor
  size?: AvatarSize
  shape?: AvatarShape
  className?: string
  /** owner 2026-10-13: the eyes look toward the mouse */
  followMouse?: boolean
}

const BLINK_KEYFRAMES = `
@keyframes av-blink {
  0%, 88%, 100% { transform: scaleY(1); }
  93%            { transform: scaleY(0.07); }
  97%            { transform: scaleY(0.07); }
}
`

const SHINE = "radial-gradient(ellipse at 30% 24%, rgba(255,255,255,.75) 0%, rgba(255,255,255,.1) 50%, transparent 70%)"
const glow = (rgb: string) => `0 0 4px 0px rgba(${rgb},.35), 0 0 16px 6px rgba(${rgb},.18), inset 0 0 0 1px rgba(255,255,255,.05)`
const orb = (a: string, b: string, c: string, d: string) => `radial-gradient(circle at 50% 45%, ${a} 0%, ${b} 40%, ${c} 68%, ${d} 100%)`

const PRESETS: Record<AvatarColor, { gradient: string; boxShadow: string; iris: string }> = {
  blue: { gradient: orb("#0d4d9a", "#3d7dd8", "#6fb3ff", "#e0eeff"), boxShadow: glow("20,102,216"), iris: "linear-gradient(135deg, #ffffff 0%, #d4ecff 100%)" },
  orange: { gradient: orb("#a63e10", "#e27a2a", "#ffb46a", "#ffe8cc"), boxShadow: glow("232,100,0"), iris: "linear-gradient(135deg, #ffffff 0%, #ffd9b8 100%)" },
  red: { gradient: orb("#a60033", "#e74668", "#ff8aaa", "#ffd6e8"), boxShadow: glow("223,24,92"), iris: "linear-gradient(135deg, #ffffff 0%, #ffcde4 100%)" },
  green: { gradient: orb("#0d6632", "#2a9d5f", "#6dd187", "#d1fadd"), boxShadow: glow("12,168,82"), iris: "linear-gradient(135deg, #ffffff 0%, #c5f5d8 100%)" },
  purple: { gradient: orb("#4a0080", "#8b3fd1", "#c896ff", "#e8d4ff"), boxShadow: glow("110,46,224"), iris: "linear-gradient(135deg, #ffffff 0%, #e0c9ff 100%)" },
  yellow: { gradient: orb("#8a5500", "#d4a000", "#ffc93a", "#fff5cc"), boxShadow: glow("214,142,0"), iris: "linear-gradient(135deg, #ffffff 0%, #fff0a8 100%)" },
  cyan: { gradient: orb("#003d66", "#0a8fb5", "#5dd4ff", "#cdf5ff"), boxShadow: glow("10,143,181"), iris: "linear-gradient(135deg, #ffffff 0%, #d0f0ff 100%)" },
  pink: { gradient: orb("#7a0055", "#d63384", "#ff6bb3", "#ffe5f5"), boxShadow: glow("214,51,132"), iris: "linear-gradient(135deg, #ffffff 0%, #ffd6ed 100%)" },
  indigo: { gradient: orb("#2d157a", "#4f46e5", "#8b7eff", "#ddd6ff"), boxShadow: glow("79,70,229"), iris: "linear-gradient(135deg, #ffffff 0%, #e0d9ff 100%)" },
  lime: { gradient: orb("#4a5910", "#84cc16", "#bef264", "#ecfccf"), boxShadow: glow("132,204,22"), iris: "linear-gradient(135deg, #ffffff 0%, #f7fee8 100%)" },
  turquoise: { gradient: orb("#1a5555", "#0d9488", "#2dd4bf", "#ccfbf1"), boxShadow: glow("13,148,136"), iris: "linear-gradient(135deg, #ffffff 0%, #c0fdf5 100%)" },
  violet: { gradient: orb("#4a2a7a", "#a855f7", "#d8b4fe", "#f3e8ff"), boxShadow: glow("168,85,247"), iris: "linear-gradient(135deg, #ffffff 0%, #ede9fe 100%)" },
}

const SIZE: Record<AvatarSize, { orb: string; eye: string; eyeGap: string; eyeY: string }> = {
  xs: { orb: "size-6", eye: "w-[3px] h-[5px]", eyeGap: "gap-1", eyeY: "-translate-y-px" },
  sm: { orb: "size-8", eye: "w-1 h-1.5", eyeGap: "gap-1.5", eyeY: "-translate-y-0.5" },
  md: { orb: "size-12", eye: "w-1.5 h-2.5", eyeGap: "gap-2.5", eyeY: "-translate-y-0.5" },
  lg: { orb: "size-16", eye: "w-2 h-3", eyeGap: "gap-3.5", eyeY: "-translate-y-1" },
}

/** how far the eyes may move from the centre, px */
const LOOK: Record<AvatarSize, number> = { xs: 2, sm: 3, md: 5, lg: 7 }

const SHAPE_RADIUS: Record<AvatarShape, string> = { circle: "rounded-full", square: "rounded-[0%]", squircle: "rounded-[40%]" }

function Eye({ blinking, delayMs = 0, irisGradient, sizeClass }: { blinking: boolean; delayMs?: number; irisGradient: string; sizeClass: string }) {
  return <div className={cn("rounded-full", sizeClass)} style={{ background: irisGradient, ...(blinking ? { animation: `av-blink 3.6s ease-in-out ${delayMs}ms infinite` } : {}) }} />
}

export function AiAvatar({ blinking = true, color = "blue", size = "md", shape = "circle", className, followMouse = false }: AvatarProps) {
  const uid = useId().replace(/\W/g, "")
  const orbRef = useRef<HTMLDivElement>(null)
  const eyesRef = useRef<HTMLDivElement>(null)

  // follow the mouse: move the eyes toward the pointer (in the orb's own frame, so a tilted orb still looks the right way)
  useEffect(() => {
    if (!followMouse) return
    let frame = 0
    const max = LOOK[size] ?? LOOK.md
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const orb = orbRef.current
        const eyes = eyesRef.current
        if (!orb || !eyes) return
        const r = orb.getBoundingClientRect()
        let dx = e.clientX - (r.left + r.width / 2)
        let dy = e.clientY - (r.top + r.height / 2)
        // undo any rotation on the orb or its parent (Nock peeks tilted 45°)
        let angle = 0
        for (const el of [orb, orb.parentElement]) {
          if (!el) continue
          const cs = getComputedStyle(el)
          // Tailwind v4 rotates with the `rotate` property, older CSS with `transform` — read both
          if (cs.rotate && cs.rotate !== "none") angle += (parseFloat(cs.rotate) * Math.PI) / 180
          if (cs.transform && cs.transform !== "none") { const m = new DOMMatrixReadOnly(cs.transform); angle += Math.atan2(m.b, m.a) }
        }
        if (angle) { const c = Math.cos(-angle), sn = Math.sin(-angle); [dx, dy] = [dx * c - dy * sn, dx * sn + dy * c] }
        const dist = Math.hypot(dx, dy) || 1
        const k = (max * Math.min(1, dist / 160)) / dist
        eyes.style.transform = `translate(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px)`
      })
    }
    window.addEventListener("pointermove", onMove)
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(frame) }
  }, [followMouse, size])

  const preset = PRESETS[color] ?? PRESETS.blue
  const dims = SIZE[size] ?? SIZE.md
  return (
    <>
      <style>{BLINK_KEYFRAMES}</style>
      <div ref={orbRef} aria-hidden="true"
        // the squish on press (was motion's whileTap) — a springy CSS transition
        className={cn("relative flex shrink-0 items-center justify-center overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-x-[1.15] active:scale-y-[1.3]", dims.orb, SHAPE_RADIUS[shape], className)}
        style={{ background: preset.gradient, boxShadow: preset.boxShadow }}>
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.2] mix-blend-overlay" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={`av-n${uid}`} x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#av-n${uid})`} />
        </svg>
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.2] mix-blend-overlay" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={`av-g${uid}`} x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="3.2" numOctaves="1" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter={`url(#av-g${uid})`} />
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: SHINE }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 blur-xs" style={{ background: "radial-gradient(circle at 62% 68%, rgba(0,0,0,0.18) 0%, transparent 55%)" }} />
        <div className={dims.eyeY}>
        <div ref={eyesRef} className={cn("relative z-10 flex items-center transition-transform duration-150 ease-out", dims.eyeGap)}>
          <Eye blinking={blinking} delayMs={0} irisGradient={preset.iris} sizeClass={dims.eye} />
          <Eye blinking={blinking} delayMs={60} irisGradient={preset.iris} sizeClass={dims.eye} />
        </div>
        </div>
      </div>
    </>
  )
}
