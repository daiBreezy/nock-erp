import type { ComponentProps } from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Option {
  value: string
  label: string
  disabled?: boolean
}

/** Native <select>: reliable on iPad/phones and keyboard, styled like shadcn inputs. */
export function NativeSelect({ options, placeholder, className, ...props }: ComponentProps<"select"> & { options: Option[]; placeholder?: string }) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className="h-full min-h-9 w-full appearance-none rounded-3xl border border-transparent bg-input/50 py-1 pr-8 pl-3 text-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50 aria-invalid:border-destructive"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
