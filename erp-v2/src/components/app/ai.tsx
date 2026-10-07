import { SparklesIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * AI colour (owner 2026-10-07): anything written by AI is light blue, so it reads as "AI's view", not system data.
 * One place for the classes — Dashboard brief, Reports › สรุป, Generate Summary.
 */
export const AI_TONE = {
  /** a card / section written by AI */
  surface: "bg-gradient-to-br from-sky-50 to-card ring-1 ring-sky-200 dark:from-sky-950/40 dark:ring-sky-900",
  /** an inner box inside it (notes, suggestions) */
  soft: "bg-sky-100/60 dark:bg-sky-950/50",
  /** icons and labels */
  text: "text-sky-700 dark:text-sky-300",
  /** numbered steps, primary marks */
  solid: "bg-sky-600 text-white dark:bg-sky-500",
  /** an outline button that triggers AI */
  button: "border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950",
} as const

/** the sparkle tile next to an AI heading */
export function AiIcon({ className }: { className?: string }) {
  return <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300", className)}><SparklesIcon className="size-4" /></span>
}

/** small "AI" tag for content mixed into other cards */
export function AiChip({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300", className)}><SparklesIcon className="size-3" />AI</span>
}
