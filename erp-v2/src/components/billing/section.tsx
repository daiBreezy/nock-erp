"use client"

import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** A titled block of the invoice form / detail (owner 2026-11-05): Student · Promotion · Course · Advance · Bus · Summary —
 *  accordion rows, one open at a time; the collapsed row shows a one-line summary. Content stays mounted when closed. */
export function Section({ n, title, hint, summary, open, onToggle, children }: { n: number; title: string; hint?: string; summary: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="border-b last:border-b-0">
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-2 py-3 text-left">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-[11px] text-background">{n}</span>
        <span className="text-sm font-semibold">{title}</span>
        {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
        {!open && <span className="ml-auto truncate text-xs text-muted-foreground tabular-nums">{summary}</span>}
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open ? "ml-auto" : "-rotate-90")} />
      </button>
      <div hidden={!open} className="space-y-3 pb-4">{children}</div>
    </section>
  )
}
