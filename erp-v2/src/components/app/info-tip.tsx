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
            <div className="px-3 py-2 text-muted-foreground">{text}</div>
          </>
        ) : text}
      </HoverCardContent>
    </HoverCard>
  )
}
