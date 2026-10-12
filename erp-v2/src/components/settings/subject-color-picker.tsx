"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SUBJECT_PALETTE } from "@/components/app/subject-color"
import { cn } from "@/lib/utils"

/** owner 2026-10-12: pick the colour a subject is shown in everywhere (chips, calendar cards, staff table) */
export function SubjectColorPicker({ value, onChange, label }: { value: string; onChange: (key: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const cur = SUBJECT_PALETTE[value] ?? SUBJECT_PALETTE.slate
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button type="button" aria-label={`สีของ ${label}`} title="เปลี่ยนสี" className={cn("grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-foreground/10 hover:ring-2 hover:ring-ring/40", cur.chip)} />}>
        <span className={cn("size-3.5 rounded-full", cur.swatch)} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <p className="px-1 pb-1.5 text-xs text-muted-foreground">สีของวิชา {label}</p>
        <div className="grid grid-cols-6 gap-1.5">
          {Object.entries(SUBJECT_PALETTE).map(([k, c]) => (
            <button key={k} type="button" title={c.label} aria-label={c.label} aria-pressed={k === value}
              onClick={() => { onChange(k); setOpen(false) }}
              className={cn("grid size-7 place-items-center rounded-full text-white", c.swatch, k === value && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-popover")}>
              {k === value && <CheckIcon className="size-3.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
