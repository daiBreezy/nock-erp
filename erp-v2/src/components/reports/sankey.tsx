"use client"

import { useId, useState } from "react"
import { tx } from "@/lib/i18n"
import { fmtNum } from "./charts"

/**
 * A Sankey (owner 2026-10-21: the lead pipeline like their ref) — columns of boxes, bands between neighbouring
 * columns as thick as the count. Hover a band for its count and share of where it came from; hover a box to keep only
 * the bands through it. Each band fades from the colour of the box it leaves to the colour of the box it reaches
 * (owner 2026-10-21). Generic: the rule decides the columns and the flows.
 */
export type SankeyNode = { key: string; label: string; value: number; color: string; hint?: string }
export type SankeyColumn = { title: string; nodes: SankeyNode[] }
export type SankeyLink = { col: number; from: string; to: string; value: number }

const W = 1000, H = 380, TOP = 28, BOTTOM = 6, NW = 10, GAP = 12, PAD = 4

export function Sankey({ columns, flows, total }: { columns: SankeyColumn[]; flows: SankeyLink[]; total: number }) {
  const uid = useId().replace(/:/g, "")
  const [hover, setHover] = useState<{ link: number } | { col: number; key: string } | null>(null)
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
  const label = (ci: number, key: string) => box.get(`${ci}|${key}`)?.node.label ?? key
  const hint = !hover ? tx("ชี้ที่แถบหรือกล่องเพื่อดูจำนวน")
    : "link" in hover ? (() => { const l = links.find((x) => x.i === hover.link)!; const from = box.get(`${l.f.col}|${l.f.from}`)!.node
      return tx("{0} → {1}: {2} คน ({3}% ของ {0})", [from.label, label(l.f.col + 1, l.f.to), fmtNum(l.f.value), String(Math.round((l.f.value / from.value) * 100))]) })()
      : (() => { const n = box.get(`${hover.col}|${hover.key}`)!.node
        return `${tx("{0}: {1} คน ({2}% ของ Lead)", [n.label, fmtNum(n.value), String(Math.round((n.value / total) * 100))])}${n.hint ? ` · ${n.hint}` : ""}` })()

  return (
    <div>
      <p className="mb-2 min-h-5 text-sm text-muted-foreground">{hint}</p>
      <div className="-mx-1 overflow-x-auto px-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[40rem] text-foreground" role="img" aria-label={tx("เส้นทางของ Lead")} onMouseLeave={() => setHover(null)}>
          {columns.map((c, ci) => (
            <text key={ci} x={ci === columns.length - 1 ? xOf(ci) + NW : xOf(ci)} y={14} textAnchor={ci === columns.length - 1 ? "end" : "start"} fontSize={12} fill="currentColor" fillOpacity={0.55}>{c.title}</text>
          ))}
          <defs>
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
              strokeOpacity={on(l) ? (hover ? 0.6 : 0.28) : 0.06} onMouseEnter={() => setHover({ link: l.i })} className="transition-[stroke-opacity]" />
          })}
          {[...box.entries()].map(([k, b]) => {
            const last = b.col === columns.length - 1
            return (
              <g key={k} onMouseEnter={() => setHover({ col: b.col, key: b.node.key })}>
                <rect x={b.x} y={b.y} width={NW} height={b.h} rx={3} fill={b.node.color} />
                <text x={last ? b.x - 6 : b.x + NW + 6} y={b.y + Math.min(b.h / 2, 14) + 4} textAnchor={last ? "end" : "start"} fontSize={12} fill="currentColor" className="pointer-events-none">
                  {b.node.label} <tspan fontWeight={600}>{fmtNum(b.node.value)}</tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
