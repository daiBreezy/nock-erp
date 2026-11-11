import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type ChipOption<T extends string> = { value: T; label: string; count?: number }

/**
 * Single-select pill filter row, each option showing an optional count (e.g. "ของฉัน 5").
 * Extracted from the inbox assignee filter (owner 2026-10-05) — use this instead of writing a
 * one-off chip row again. For an exclusive filter with no counts to show, prefer `ToggleGroup`.
 * `layout="scroll"` keeps everything on one line with horizontal scroll instead of wrapping (no scrollbar drawn — the fade on the right edge says there is more, owner 2026-11-09) —
 * use it in narrow containers (a sidebar) where a growing option list (e.g. staff) would otherwise wrap.
 */
export function FilterChipGroup<T extends string>({ value, onChange, options, className, layout = "wrap" }: { value: T; onChange: (v: T) => void; options: ChipOption<T>[]; className?: string; layout?: "wrap" | "scroll" }) {
  return (
    <div className={cn(
      "flex gap-1.5",
      layout === "wrap" ? "flex-wrap" : "flex-nowrap overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className,
    )}>
      {options.map((o) => (
        <Button variant="chip" size="inline" key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value} className="shrink-0 px-2.5 py-0.5 text-xs whitespace-nowrap">
          {o.label}
          {o.count !== undefined && <span className="ml-1 tabular-nums opacity-70">{o.count}</span>}
        </Button>
      ))}
    </div>
  )
}
