import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Chips in one line (owner 2026-10-13): the first chip, then "+N" for the rest — hover the badge to see them all.
 * Use in table cells so rows never grow two lines tall.
 */
export function ChipOverflow<T>({ items, render, label }: { items: T[]; render: (item: T) => React.ReactNode; label: (item: T) => string }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>
  const [first, ...rest] = items
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {render(first)}
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex cursor-default items-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums" />}>+{rest.length}</TooltipTrigger>
          <TooltipContent side="bottom" className="flex flex-col gap-1">{rest.map((x, i) => <span key={i}>{label(x)}</span>)}</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
