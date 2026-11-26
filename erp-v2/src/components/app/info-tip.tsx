"use client"

import { InfoIcon } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

/**
 * An ⓘ that shows an explanation on hover (or tap / keyboard focus) — owner 2026-10-13: helper sub-texts in panels
 * and forms live here instead of as grey lines under the fields. One component for the whole app.
 */
export function InfoTip({ text, title, splitTitle, className }: {
  text: React.ReactNode; className?: string
  /** owner 2026-11-20: a tip with a name has two parts — a Header (what it is — same size as the body, only a darker colour) and a Body (what it means), a thin line between */
  title?: React.ReactNode
  /** the text is "Header · body" (the shape the metric tips are already written in): split at the first " · " */
  splitTitle?: boolean
}) {
  if (splitTitle && typeof text === "string" && !title) {
    const i = text.indexOf(" · ")
    if (i > 0) { title = text.slice(0, i); text = text.slice(i + 3) }
  }
  return (
    <HoverCard>
      {/* a span, not a <button>: an ⓘ often sits inside a clickable row / option (a button can't hold a button) */}
      <HoverCardTrigger render={<span role="button" tabIndex={0} aria-label={typeof title === "string" ? title : typeof text === "string" ? text : "ข้อมูลเพิ่มเติม"} className={cn("inline-grid size-5 shrink-0 place-items-center self-center rounded-full align-middle text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none", className)} />}>
        <InfoIcon className="size-3.5" />
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className={cn("max-w-72 leading-relaxed", title && "p-0")}>
        {title ? (
          <>
            <p className="border-b px-3 py-2 text-foreground">{title}</p>
            <div className="px-3 py-2 text-muted-foreground">{typeof text === "string" ? <TipLines text={text} /> : text}</div>
          </>
        ) : typeof text === "string" ? <TipLines text={text} /> : text}
      </HoverCardContent>
    </HoverCard>
  )
}

/**
 * The shape of an ⓘ that explains a NUMBER (owner 2026-11-26: "แบ่งข้อมูลให้ชัดเจน — ไม่ใช่ประโยคยาวเป็นหางว่าว"):
 *   Title                 ← what is being measured
 *   71%                   ← the headline value (when there is one)
 *   ─────
 *   Test/Trial   14       ← the parts, one per line (label · value)   — or a formula: labels line, then the values line
 *   Enrollment   10
 *   Enrollment ÷ Test/Trial   ← the measure (what it is divided by / compared with), small
 * Short lines, one idea per line — never one run-on sentence. Put it in `<InfoTip text={<TipFacts … />} />`.
 */
export function TipFacts({ title, value, rows, formula, measure }: {
  title: React.ReactNode
  value?: React.ReactNode
  /** the parts: label on the left, value on the right */
  rows?: { label: React.ReactNode; value: React.ReactNode }[]
  /** a sum / ratio written as two short lines: what each part is, then the numbers (e.g. "A + B" / "1,000 + 250") */
  formula?: { labels: React.ReactNode; values: React.ReactNode }
  /** how it is measured, in one short line (e.g. "Test/Trial → Enrollment") */
  measure?: React.ReactNode
}) {
  return (
    <div className="space-y-2 text-foreground">
      <div>
        <p className="font-medium">{title}</p>
        {value !== undefined && <p className="text-xl leading-tight font-semibold tabular-nums">{value}</p>}
      </div>
      {(rows?.length || formula) && (
        <div className="space-y-1 border-t pt-2">
          {formula && <><p className="text-muted-foreground">{formula.labels}</p><p className="font-medium tabular-nums">{formula.values}</p></>}
          {rows?.map((r, i) => <p key={i} className="flex items-baseline justify-between gap-4"><span className="text-muted-foreground">{r.label}</span><span className="font-medium tabular-nums">{r.value}</span></p>)}
        </div>
      )}
      {measure && <p className="border-t pt-2 text-xs text-muted-foreground">{measure}</p>}
    </div>
  )
}

/**
 * owner 2026-11-26: a plain-text tip is never one run-on line. Clauses written with " · " / " — " / ";" each get their own line; a
 * clause shaped "label = what it means" becomes a two-part line (label in the dark colour); a "(remark)" goes on its own small line.
 * (A tip that is one short sentence stays as it is. For a tip that explains a NUMBER use `TipFacts` instead.)
 */
function TipLines({ text }: { text: string }) {
  const parts = text.split(/\s[·—]\s|;\s|\s—\s/).map((t) => t.trim()).filter(Boolean)
  if (parts.length < 2) return <>{text}</>
  const lines = parts.flatMap((p) => {
    const m = p.match(/^(.*?)\s*\(([^()]{6,})\)\s*$/)
    return m && m[1] ? [m[1], `(${m[2]})`] : [p]
  })
  return (
    <ul className="space-y-1.5">
      {lines.map((l, i) => {
        if (l.startsWith("(")) return <li key={i} className="-mt-0.5 text-xs text-muted-foreground/80">{l}</li>
        const kv = l.match(/^(.{1,28}?)\s=\s(.+)$/)
        return kv
          ? <li key={i}><span className="font-medium text-foreground">{kv[1]}</span> <span className="text-muted-foreground">= {kv[2]}</span></li>
          : <li key={i}>{l}</li>
      })}
    </ul>
  )
}
