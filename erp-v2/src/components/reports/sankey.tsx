"use client"

import { useId, useState, type ReactNode } from "react"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { fmtNum } from "./charts"

/**
 * A Sankey (owner 2026-10-21: the lead pipeline like their ref) — columns of boxes, bands between neighbouring
 * columns as thick as the count. Hover a band for its count and share of where it came from; hover a box to keep only
 * the bands through it. Each band fades from the colour of the box it leaves to the colour of the box it reaches
 * (owner 2026-10-21). Generic: the rule decides the columns and the flows.
 */
export type SankeyNode = { key: string; label: string; value: number; color: string; hint?: string
  /** a box that is two things at once, drawn half and half (top / bottom) — bands still use `color` */
  split?: [string, string] }
export type SankeyColumn = { title: string; nodes: SankeyNode[] }
export type SankeyLink = { col: number; from: string; to: string; value: number }

const BOTTOM = 6, NW = 10, GAP = 12, PAD = 4

/** how see-through the bands are (0 = invisible, 1 = solid) — tweak here */
export const BAND_OPACITY = {
  /** every band, nothing hovered */
  rest: 0.12,
  /** the band(s) being hovered */
  focus: 0.24,
  /** the other bands while something is hovered */
  dim: 0.04,
}

/** owner 2026-10-22: the light running along a hovered band (left → right), after the ref's flame button (no white centre) — tweak here */
export const BAND_FLOW = {
  /** seconds for the light to cross one column of bands */
  seconds: 0.80,
  /** length of the light, as a share of one column of bands */
  length: 10,
  /** how soft the light's top / bottom edge is (blur across the band, capped at a quarter of its thickness) */
  blur: 20,
  /** how strong the light is (0 = invisible, 1 = full) */
  opacity: 0.50,
  /** owner 2026-10-22: the bright centre of the light (at its brightest point) — its colour and strength (0 = no centre) */
  core: "#ffffff",
  coreOpacity: 0.2,
  /** owner 2026-10-22: white glowing sparkles inside the light, thickest where the light is brightest — at most this many per band (0 = none) */
  sparks: 200,
  /** sparkle size (radius) */
  sparkSize: 0.24,
  /** how many sparkles per unit of band thickness (a thick band gets more) */
  sparkDensity: 1.5,
  /** how soft the sparkles' glow is */
  sparkGlow: 0.6,
  /** how far a sparkle wanders around its spot (share of the band's thickness) */
  sparkWander: 4.35,
}

/** where the light is brightest along its window (0 = tail end, 1 = head) — a long tail behind, a short head in front */
const PEAK = 0.86
/** the light's opacity along its window, tail → head: a long soft tail, a short bright head */
const WINDOW: [number, number][] = [[0, 0], [0.12, 0.02], [0.28, 0.08], [0.44, 0.2], [0.58, 0.42], [0.7, 0.68], [0.8, 0.92], [PEAK, 1], [0.92, 0.6], [0.97, 0.15], [1, 0]]
/** a steady pseudo-random number in 0…1 for a seed (sparkles look scattered but don't jump between renders) */
const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
/** the light's opacity at a point of its window (0 = tail end, 1 = head) */
const windowAt = (u: number) => { const i = WINDOW.findIndex(([o]) => o >= u); if (i <= 0) return WINDOW[0][1]; const [a, va] = WINDOW[i - 1], [b, vb] = WINDOW[i]; return va + ((vb - va) * (u - a)) / (b - a) }
/** spots along the window for n sparkles, more where the light is brighter (few → many → few, like the light) */
const sparkSpots = (seed: number, n: number) => {
  const out: number[] = []
  for (let k = 0; out.length < n && k < n * 40; k++) { const u = 0.03 + rand(seed + k * 2) * 0.94; if (rand(seed + k * 2 + 1) < windowAt(u)) out.push(u) }
  return out
}

export function Sankey({ columns, flows, total, heads, size = { w: 1000, h: 380 }, unit = "คน", name = "เส้นทางของ Lead", minWidth = "min-w-[40rem]" }: {
  columns: SankeyColumn[]; flows: SankeyLink[]; total: number
  /** drawing size — a narrower one keeps the text readable in a half-width card */
  size?: { w: number; h: number }
  /** what is counted ("คน" / "คอร์ส") — in the hover line */
  unit?: string; name?: string; minWidth?: string
  /** owner 2026-10-21: a headline over each column (its number), sitting right above that column's boxes — replaces the plain titles */
  heads?: ReactNode[] }) {
  const TOP = heads ? 6 : 28
  const W = size.w, H = size.h
  const uid = useId().replace(/:/g, "")
  const [hover, setHover] = useState<{ link: number } | { col: number; key: string } | null>(null)
  const [still] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  if (!total) return <p className="py-6 text-center text-sm text-muted-foreground">{tx("ยังไม่มีข้อมูลในช่วงนี้")}</p>

  const most = Math.max(...columns.map((c) => c.nodes.length))
  const scale = (H - TOP - BOTTOM - GAP * (most - 1)) / total
  const xOf = (c: number) => PAD + (c * (W - 2 * PAD - NW)) / (columns.length - 1)
  // boxes: stacked from the top of each column, centred in the height
  const box = new Map<string, { x: number; y: number; h: number; node: SankeyNode; col: number; out: number; in: number }>()
  columns.forEach((c, ci) => {
    const used = c.nodes.reduce((a, n) => a + n.value * scale, 0) + GAP * (c.nodes.length - 1)
    let y = TOP + (H - TOP - BOTTOM - used) / 2
    c.nodes.forEach((n) => { box.set(`${ci}|${n.key}`, { x: xOf(ci), y, h: Math.max(2, n.value * scale), node: n, col: ci, out: 0, in: 0 }); y += n.value * scale + GAP })
  })
  const order = (ci: number, key: string) => columns[ci].nodes.findIndex((n) => n.key === key)
  // bands leave a box in the order of where they go, and arrive in the order of where they came from — no crossings at the box
  const links = flows.filter((f) => f.value > 0).map((f, i) => ({ f, i, h: f.value * scale, y0: 0, y1: 0 }))
  for (const l of [...links].sort((a, b) => order(a.f.col + 1, a.f.to) - order(b.f.col + 1, b.f.to))) { const b = box.get(`${l.f.col}|${l.f.from}`)!; l.y0 = b.y + b.out + l.h / 2; b.out += l.h }
  for (const l of [...links].sort((a, b) => order(a.f.col, a.f.from) - order(b.f.col, b.f.from))) { const b = box.get(`${l.f.col + 1}|${l.f.to}`)!; l.y1 = b.y + b.in + l.h / 2; b.in += l.h }

  const on = (l: (typeof links)[number]) => !hover || ("link" in hover ? hover.link === l.i : (l.f.col === hover.col && l.f.from === hover.key) || (l.f.col + 1 === hover.col && l.f.to === hover.key))
  // the hovered band(s) carry a light running left → right (none when the viewer asks for less motion)
  const flowing = hover && !still ? links.filter(on) : []
  // owner 2026-10-22: ONE light for every flowing band, running across the whole drawing (left → middle → right without a
  // break): the window lives in drawing coordinates, so it passes from a left band through the box into the right band.
  // It crosses one column of bands in BAND_FLOW.seconds; its length is BAND_FLOW.length × one column of bands.
  const firstCol = flowing.length ? Math.min(...flowing.map((l) => l.f.col)) : 0, lastCol = flowing.length ? Math.max(...flowing.map((l) => l.f.col)) : 0
  const span = xOf(1) - xOf(0), win = span * BAND_FLOW.length
  const runFrom = xOf(firstCol) + NW, runTo = xOf(lastCol + 1), cycle = (BAND_FLOW.seconds * (runTo - runFrom + win)) / span
  // what's hovered: its colour(s) and one short line — "from → to · count · % of from" / "box · count · % of all"
  const hint: { colors: string[]; text: string } | null = !hover ? null
    : "link" in hover ? (() => { const l = links.find((x) => x.i === hover.link)!; const from = box.get(`${l.f.col}|${l.f.from}`)!.node, to = box.get(`${l.f.col + 1}|${l.f.to}`)!.node
      return { colors: [from.color, to.color], text: `${from.label} → ${to.label} · ${fmtNum(l.f.value)} ${tx(unit)} · ${Math.round((l.f.value / from.value) * 100)}%` } })()
      : (() => { const n = box.get(`${hover.col}|${hover.key}`)!.node
        return { colors: [n.color], text: `${n.label} · ${fmtNum(n.value)} ${tx(unit)} · ${Math.round((n.value / total) * 100)}%` } })()

  return (
    <div>
      {/* owner 2026-10-21: one short line, never wrapping; while something is hovered it sits in a frame of that thing's
          colour (a band: from-colour edge, both colours as dots). What a box means is in its own tooltip (hover the box). */}
      <div className="mb-2 flex h-7 items-center">
        {hint ? (
          <span className="inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 text-sm"
            style={{ borderColor: hint.colors[0], background: `color-mix(in oklab, ${hint.colors[hint.colors.length - 1]} 8%, transparent)` }}>
            {hint.colors.map((c, i) => <span key={i} className="size-2 shrink-0 rounded-full" style={{ background: c }} />)}
            <span className="truncate">{hint.text}</span>
          </span>
        ) : <span className="truncate text-sm text-muted-foreground">{tx("ชี้ที่แถบหรือกล่องเพื่อดูจำนวน")}</span>}
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        {heads && (
          <div className={cn("relative mb-1 h-[4.75rem]", minWidth)}>
            {heads.map((h, ci) => {
              const last = ci === columns.length - 1
              return (
                <div key={ci} className={cn("absolute top-0 whitespace-nowrap [&_p]:truncate", columns.length > 2 ? "w-[28%]" : "w-[48%]", last && "text-right")}
                  style={last ? { right: `${((W - xOf(ci) - NW) / W) * 100}%` } : { left: `${(xOf(ci) / W) * 100}%` }}>{h}</div>
              )
            })}
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full text-foreground", minWidth)} role="img" aria-label={tx(name)} onMouseLeave={() => setHover(null)}>
          {!heads && columns.map((c, ci) => (
            <text key={ci} x={ci === columns.length - 1 ? xOf(ci) + NW : xOf(ci)} y={14} textAnchor={ci === columns.length - 1 ? "end" : "start"} fontSize={12} fill="currentColor" fillOpacity={0.55}>{c.title}</text>
          ))}
          <defs>
            {[...box.entries()].filter(([, b]) => b.node.split).map(([k, b]) => (
              <linearGradient key={k} id={`${uid}-n${k.replace(/[^a-z0-9]/gi, "")}`} x1={0} x2={0} y1={0} y2={1}>
                <stop offset="50%" stopColor={b.node.split![0]} /><stop offset="50%" stopColor={b.node.split![1]} />
              </linearGradient>
            ))}
            {/* the light: a moving window (white = see-through) over each band's own left → right colours — near the left it shows
                the left box's colour, turning into the right box's as it runs. Opacity: a long soft tail rising to a short bright head (WINDOW). */}
            <filter id={`${uid}-spark`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={BAND_FLOW.sparkGlow} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {flowing.length > 0 && (
              <linearGradient id={`${uid}-fw`} gradientUnits="userSpaceOnUse" x1={runFrom - win} x2={runFrom} y1={0} y2={0}>
                {WINDOW.map(([o, a]) => <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />)}
                <animate attributeName="x1" from={runFrom - win} to={runTo} dur={`${cycle}s`} repeatCount="indefinite" />
                <animate attributeName="x2" from={runFrom} to={runTo + win} dur={`${cycle}s`} repeatCount="indefinite" />
              </linearGradient>
            )}
            {/* the bright centre: the same moving window, lit only around the light's brightest point (owner 2026-10-22: back) */}
            {flowing.length > 0 && (
              <linearGradient id={`${uid}-fc`} gradientUnits="userSpaceOnUse" x1={runFrom - win} x2={runFrom} y1={0} y2={0}>
                {[[0, 0], [PEAK - 0.1, 0], [PEAK - 0.04, 0.5], [PEAK, 1], [PEAK + 0.03, 0.5], [Math.min(1, PEAK + 0.07), 0], [1, 0]].map(([o, a]) => <stop key={o} offset={o} stopColor={BAND_FLOW.core} stopOpacity={a * BAND_FLOW.coreOpacity} />)}
                <animate attributeName="x1" from={runFrom - win} to={runTo} dur={`${cycle}s`} repeatCount="indefinite" />
                <animate attributeName="x2" from={runFrom} to={runTo + win} dur={`${cycle}s`} repeatCount="indefinite" />
              </linearGradient>
            )}
            {links.map((l) => (
              <linearGradient key={l.i} id={`${uid}-g${l.i}`} gradientUnits="userSpaceOnUse" x1={xOf(l.f.col) + NW} x2={xOf(l.f.col + 1)} y1={0} y2={0}>
                <stop offset="0%" stopColor={box.get(`${l.f.col}|${l.f.from}`)!.node.color} />
                <stop offset="100%" stopColor={box.get(`${l.f.col + 1}|${l.f.to}`)!.node.color} />
              </linearGradient>
            ))}
          </defs>
          {links.map((l) => {
            const x0 = xOf(l.f.col) + NW, x1 = xOf(l.f.col + 1), mx = (x0 + x1) / 2
            return <path key={l.i} d={`M${x0},${l.y0} C${mx},${l.y0} ${mx},${l.y1} ${x1},${l.y1}`} fill="none" stroke={`url(#${uid}-g${l.i})`} strokeWidth={Math.max(1, l.h)}
              strokeOpacity={on(l) ? (hover ? BAND_OPACITY.focus : BAND_OPACITY.rest) : BAND_OPACITY.dim} onMouseEnter={() => setHover({ link: l.i })} className="transition-[stroke-opacity]" />
          })}
          {/* owner 2026-10-22: the soft light stays inside its band — the mask is the band's shape seen through the moving window */}
          {flowing.map((l) => {
            const x0 = xOf(l.f.col) + NW, x1 = xOf(l.f.col + 1), mx = (x0 + x1) / 2
            const d = `M${x0},${l.y0} C${mx},${l.y0} ${mx},${l.y1} ${x1},${l.y1}`, w = Math.max(1.5, l.h)
            return (
              <g key={`f${l.i}`} className="pointer-events-none">
                <mask id={`${uid}-m${l.i}`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><path d={d} fill="none" stroke={`url(#${uid}-fw)`} strokeWidth={w} /></mask>
                {/* blur only across the band (at most a quarter of its thickness — more washed thin bands out); along the band the
                    window's own fade is the softness — a blur along it dimmed the light near the boxes (0 → 100 → 60). The blur
                    area is the whole drawing (sized from the centre line it cut thick bands). owner 2026-10-22 */}
                <filter id={`${uid}-b${l.i}`} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                  <feGaussianBlur stdDeviation={`0 ${Math.min(BAND_FLOW.blur, w / 4)}`} />
                </filter>
                <g mask={`url(#${uid}-m${l.i})`}><path d={d} fill="none" stroke={`url(#${uid}-g${l.i})`} strokeWidth={w} filter={`url(#${uid}-b${l.i})`} opacity={BAND_FLOW.opacity} /></g>
                <mask id={`${uid}-s${l.i}`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}><path d={d} fill="none" stroke="#fff" strokeWidth={w} /></mask>
                <g mask={`url(#${uid}-s${l.i})`}><path d={d} fill="none" stroke={`url(#${uid}-fc)`} strokeWidth={w} filter={`url(#${uid}-b${l.i})`} /></g>
                {/* sparkles (owner 2026-10-22): many white glowing dots inside the light — where the light is brighter there are more
                    and they shine more (few → many → few), each wandering a little at its own pace and twinkling; inside the band */}
                <g mask={`url(#${uid}-s${l.i})`} filter={`url(#${uid}-spark)`}>
                  {sparkSpots(l.i * 997, Math.min(BAND_FLOW.sparks, Math.max(4, Math.round(w * BAND_FLOW.sparkDensity)))).map((u, k) => {
                    const seed = l.i * 7919 + k * 13, glow = windowAt(u)
                    // when this spot of the window is at the band's start / end — keyTimes must stay strictly inside 0…1
                    const at = (x: number) => (x - runFrom + win * (1 - u)) / (runTo - runFrom + win)
                    const tA = at(x0), tB = at(x1), e = Math.min(0.01, (tB - tA) / 4)
                    if (!(tA > 0 && tB < 1 && tB - tA > 4 * e)) return null
                    const r = BAND_FLOW.sparkSize * (0.5 + rand(seed + 3) * 1.2), dy = (rand(seed + 7) - 0.5) * w * 0.85
                    const jx = (rand(seed + 9) - 0.5) * w * BAND_FLOW.sparkWander * 2, jy = (rand(seed + 11) - 0.5) * w * BAND_FLOW.sparkWander
                    return (
                      <g key={k} transform={`translate(0 ${dy})`}>
                        <g>
                          <animateTransform attributeName="transform" type="translate" values={`0 0;${jx} ${jy};${-jy} ${jx / 2};0 0`} dur={`${0.8 + rand(seed + 13) * 1.6}s`} repeatCount="indefinite" />
                          <circle r={r} fill="#fff" opacity={0}>
                            <animateMotion path={d} keyPoints="0;0;1;1" keyTimes={`0;${tA};${tB};1`} calcMode="linear" dur={`${cycle}s`} repeatCount="indefinite" />
                            <animate attributeName="opacity" values={`0;0;${glow};${glow};0;0`} keyTimes={`0;${tA};${tA + e};${tB - e};${tB};1`} dur={`${cycle}s`} repeatCount="indefinite" />
                            <animate attributeName="r" values={`${r};${r * 1.8};${r * 0.6};${r}`} dur={`${0.4 + rand(seed + 5) * 0.9}s`} repeatCount="indefinite" />
                          </circle>
                        </g>
                      </g>
                    )
                  })}
                </g>
              </g>
            )
          })}
          {[...box.entries()].map(([k, b]) => {
            const last = b.col === columns.length - 1
            return (
              <g key={k} onMouseEnter={() => setHover({ col: b.col, key: b.node.key })}>
                {b.node.hint && <title>{b.node.hint}</title>}
                <rect x={b.x} y={b.y} width={NW} height={b.h} rx={3} fill={b.node.split ? `url(#${uid}-n${k.replace(/[^a-z0-9]/gi, "")})` : b.node.color} />
                <text x={last ? b.x - 6 : b.x + NW + 6} y={b.y + Math.min(b.h / 2, 14) + 4} textAnchor={last ? "end" : "start"} fontSize={12} fill="currentColor" className="pointer-events-none">
                  {/* owner 2026-10-21: the number next to its box — before the name when the name runs right, after it on the last column */}
                  {last ? <>{b.node.label} <tspan fontWeight={600}>{fmtNum(b.node.value)}</tspan></> : <><tspan fontWeight={600}>{fmtNum(b.node.value)}</tspan> {b.node.label}</>}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
