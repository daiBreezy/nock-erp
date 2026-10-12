"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface Option {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

type Props = Pick<ComponentProps<"button">, "id" | "disabled" | "className" | "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid" | "title" | "tabIndex"> & {
  value?: string
  defaultValue?: string
  name?: string
  required?: boolean
  options: Option[]
  placeholder?: string
  onChange?: (event: { target: { value: string } }) => void
}

/** Shared Luma select. Keep the existing call-site API while using shadcn for the popup. */
export function NativeSelect({ options, placeholder, className, value, defaultValue, onChange, name, required, disabled, ...props }: Props) {
  const items = placeholder === undefined ? options : [{ value: "", label: placeholder }, ...options.filter((o) => o.value !== "")]
  return (
    <div className={cn("relative h-9", className)}>
      <Select value={value} defaultValue={defaultValue} name={name} required={required} disabled={disabled}
        items={items} onValueChange={(next) => onChange?.({ target: { value: next ?? "" } })}>
        <SelectTrigger {...props} className="h-full! w-full min-w-0" aria-label={props["aria-label"] ?? placeholder}>
          <SelectValue className="min-w-0 truncate" />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false} className="max-h-80">
          {groupsOf(items).map(([group, list], index) => (
            <SelectGroup key={group ?? index}>
              {group && <SelectLabel>{group}</SelectLabel>}
              {list.map((o) => <SelectItem key={o.value} value={o.value} disabled={o.disabled}>{o.label}</SelectItem>)}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
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
