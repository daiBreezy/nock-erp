import type { ComponentProps } from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Option {
  value: string
  label: string
  disabled?: boolean
  /** options with the same group show under one heading (<optgroup>) */
  group?: string
}

/** Native <select>: reliable on iPad/phones and keyboard, styled like shadcn inputs. */
export function NativeSelect({ options, placeholder, className, ...props }: ComponentProps<"select"> & { options: Option[]; placeholder?: string }) {
  return (
    // default h-9; a height in className (h-8, h-6 …) really sets it — the select fills the box (no min-height overflow)
    <div className={cn("relative h-9", className)}>
      <select
        {...props}
        className="h-full w-full appearance-none rounded-3xl border border-transparent bg-input/50 py-1 pr-8 pl-3 text-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {groupsOf(options).map(([group, list]) => {
          const items = list.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)
          return group ? <optgroup key={group} label={group}>{items}</optgroup> : items
        })}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

/** keep the order; consecutive options of one group go under one <optgroup> */
function groupsOf(options: Option[]): [string | undefined, Option[]][] {
  const out: [string | undefined, Option[]][] = []
  for (const o of options) {
    const last = out[out.length - 1]
    if (last && last[0] === o.group) last[1].push(o)
    else out.push([o.group, [o]])
  }
  return out
}
