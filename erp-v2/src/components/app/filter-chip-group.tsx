import { cn } from "@/lib/utils"

type ChipOption<T extends string> = { value: T; label: string; count?: number }

/**
 * Single-select pill filter row, each option showing an optional count (e.g. "ของฉัน 5").
 * Extracted from the inbox assignee filter (owner 2026-10-05) — use this instead of writing a
 * one-off chip row again. For an exclusive filter with no counts to show, prefer `ToggleGroup`.
 * `layout="scroll"` keeps everything on one line with horizontal scroll instead of wrapping —
 * use it in narrow containers (a sidebar) where a growing option list (e.g. staff) would otherwise wrap.
 */
export function FilterChipGroup<T extends string>({ value, onChange, options, className, layout = "wrap" }: { value: T; onChange: (v: T) => void; options: ChipOption<T>[]; className?: string; layout?: "wrap" | "scroll" }) {
  return (
    <div className={cn(
      "flex gap-1.5",
      layout === "wrap" ? "flex-wrap" : "flex-nowrap overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
      className,
    )}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap", value === o.value ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card text-muted-foreground hover:bg-muted")}>
          {o.label}
          {o.count !== undefined && <span className="ml-1 tabular-nums opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
