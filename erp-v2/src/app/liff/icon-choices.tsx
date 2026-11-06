"use client"

// Round icon buttons with a caption under each (owner 2026-11-06, for adults: 56px, easy to hit) — negative on the
// left, positive on the right. Used by the exit form; the same look as the face choices of the yearly survey.
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

export interface IconChoice { key: string; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; on: string; active: boolean; fillIcon?: boolean }

export function IconChoices({ choices, onPick, cols }: { choices: IconChoice[]; onPick: (key: string) => void; cols: 3 | 5 }) {
  return (
    <div className={cn("grid", cols === 3 ? "grid-cols-3" : "grid-cols-5")}>
      {choices.map((c) => (
        <button key={c.key} type="button" aria-pressed={c.active} aria-label={c.label} onClick={() => onPick(c.key)} className="flex flex-col items-center gap-1.5">
          <span className={cn("grid size-14 place-items-center rounded-full border-2 transition-colors", c.active ? c.on : "border-border bg-background text-muted-foreground/50")}>
            <c.icon className={cn("size-7", c.active && c.fillIcon && "fill-current")} strokeWidth={1} />
          </span>
          {c.label && <span className={cn("text-sm leading-tight", c.active ? "font-semibold text-foreground" : "text-muted-foreground")}>{c.label}</span>}
        </button>
      ))}
    </div>
  )
}
