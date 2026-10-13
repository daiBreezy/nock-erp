"use client"

import { InfoIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * An ⓘ that shows an explanation on hover (or tap / keyboard focus) — owner 2026-10-13: helper sub-texts in panels
 * and forms live here instead of as grey lines under the fields. One component for the whole app.
 */
export function InfoTip({ text, className }: { text: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" aria-label={typeof text === "string" ? text : "ข้อมูลเพิ่มเติม"} className={cn("inline-grid size-5 shrink-0 place-items-center self-center rounded-full align-middle text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none", className)} />}>
        <InfoIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-72 leading-relaxed">{text}</TooltipContent>
    </Tooltip>
  )
}
