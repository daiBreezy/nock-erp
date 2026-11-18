"use client"

import { ChevronDownIcon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** A dropdown you tick several things in (owner 2026-11-18) — looks like the NativeSelect, shows the picks as one line. */
export function MultiPick<T extends string>({ value, onChange, options, placeholder }: { value: T[]; onChange: (v: T[]) => void; options: { value: T; label: string }[]; placeholder?: string }) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const shown = options.filter((o) => value.includes(o.value)).map((o) => o.label).join(", ")
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="inline" type="button" className="flex h-9 w-full items-center justify-between gap-2 rounded-3xl bg-input/50 px-3 text-left text-base font-normal sm:text-sm" />}>
        <span className={cn("min-w-0 flex-1 truncate", !shown && "text-muted-foreground")}>{shown || placeholder}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-52 space-y-0.5 p-1.5">
        {options.map((o) => {
          const on = value.includes(o.value)
          return (
            <Button key={o.value} variant="ghost" size="inline" type="button" aria-pressed={on} onClick={() => toggle(o.value)} className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-normal hover:bg-muted">
              {o.label}<CheckIcon className={cn("size-4 text-primary", on ? "opacity-100" : "opacity-0")} />
            </Button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
