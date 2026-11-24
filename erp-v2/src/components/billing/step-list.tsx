"use client"

import { AlertTriangleIcon, CheckIcon, CircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DocThumbs, type DocItem } from "./doc-thumbs"

/**
 * One step of an invoice's life. Shared by the single-invoice panel and the family-set (รวม) panel — owner 2026-11-24:
 * the set must read exactly like a single invoice, so both draw their stepper through this one component.
 */
export interface InvoiceStep {
  label: string
  state: "done" | "current" | "todo" | "warn"
  /** line 1: the date first, then who did it (owner 2026-11-05) · line 2 (detail): everything else */
  meta?: string
  detail?: React.ReactNode
  docs?: DocItem[]
  onAdd?: () => void
  addLabel?: string
  extra?: React.ReactNode
}

export function StepList({ steps }: { steps: InvoiceStep[] }) {
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex items-start gap-2.5 pb-4 last:pb-0">
          {/* the line joining this status icon to the next one — it is a stepper */}
          {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-2.5 top-6 -bottom-0.5 w-px -translate-x-1/2", s.state === "done" ? "bg-success" : "bg-border")} />}
          <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", s.state === "done" ? "bg-success text-white" : s.state === "current" ? "bg-info text-white" : s.state === "warn" ? "bg-warning text-white" : "border text-muted-foreground")}>
            {s.state === "done" ? <CheckIcon className="size-3" /> : s.state === "warn" ? <AlertTriangleIcon className="size-3" /> : <CircleIcon className="size-2" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{s.label}</div>
            {s.meta && <div className="text-xs text-muted-foreground">{s.meta}</div>}
            {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
            {s.extra}
          </div>
          {s.docs && <DocThumbs docs={s.docs} onAdd={s.onAdd} addLabel={s.addLabel} />}
        </li>
      ))}
    </ol>
  )
}
