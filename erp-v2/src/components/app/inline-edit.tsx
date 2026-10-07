"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDownIcon, PencilIcon } from "lucide-react"
import type { Option } from "@/components/app/native-select"
import { cn } from "@/lib/utils"

/**
 * Edit right in the table (owner 2026-10-07): hovering an editable cell shows it as a field (outline + pencil);
 * click → it becomes the input. Enter / leaving the cell saves, Esc cancels. Clicks never reach the row, so the row's
 * own click (open the side panel / popup) only fires from cells that aren't editable.
 * `onSave` returns false when the store refused (the toast already explains why) — the field stays open to fix.
 */
type Props = {
  value: string
  /** what to show when not editing (defaults to the value) */
  display?: ReactNode
  onSave: (v: string) => boolean
  /** no permission → plain text, clicks go to the row */
  disabled?: boolean
  placeholder?: string
  className?: string
} & ({ kind?: "text" | "tel" | "email"; options?: never } | { kind: "select"; options: Option[] })

export function EditCell({ value, display, onSave, disabled, placeholder, className, kind = "text", options }: Props) {
  const [editing, setEditing] = useState(false)
  const shown = display ?? (value || <span className="text-muted-foreground/60">{placeholder ?? "—"}</span>)
  if (disabled) return <div className={cn("min-w-0 truncate", className)} title={value || undefined}>{shown}</div>
  if (!editing) {
    return (
      <div
        role="button" tabIndex={0} title="คลิกเพื่อแก้ไข"
        onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); setEditing(true) } }}
        className={cn("group/cell -mx-2 flex h-8 min-w-0 cursor-text items-center gap-1 rounded-lg px-2 ring-inset hover:bg-background hover:ring-1 hover:ring-input focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none", className)}
      >
        <span className="min-w-0 flex-1 truncate" title={value || undefined}>{shown}</span>
        {kind === "select"
          ? <ChevronDownIcon className="hidden size-3.5 shrink-0 text-muted-foreground group-hover/cell:block" />
          : <PencilIcon className="hidden size-3 shrink-0 text-muted-foreground group-hover/cell:block" />}
      </div>
    )
  }
  return kind === "select"
    ? <SelectEditor value={value} options={options!} className={className} onDone={(v) => { if (v === null || v === value || onSave(v)) setEditing(false) }} />
    : <TextEditor value={value} kind={kind} placeholder={placeholder} className={className} onDone={(v) => { if (v === null || v.trim() === value || onSave(v.trim())) setEditing(false) }} />
}

const FIELD = "-mx-2 h-8 w-[calc(100%+1rem)] min-w-0 rounded-lg border-0 bg-background px-2 text-sm ring-2 ring-ring/40 outline-none"

function TextEditor({ value, kind, placeholder, className, onDone }: { value: string; kind: string; placeholder?: string; className?: string; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <input
      ref={ref} type={kind} value={v} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => onDone(v)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Enter") onDone(v)
        if (e.key === "Escape") onDone(null)
      }}
      className={cn(FIELD, className)}
    />
  )
}

function SelectEditor({ value, options, className, onDone }: { value: string; options: Option[]; className?: string; onDone: (v: string | null) => void }) {
  const ref = useRef<HTMLSelectElement>(null)
  useEffect(() => { ref.current?.focus(); try { ref.current?.showPicker?.() } catch { /* needs a fresh click in some browsers — focus is enough */ } }, [])
  return (
    <select
      ref={ref} value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onDone(e.target.value)}
      onBlur={() => onDone(null)}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") onDone(null) }}
      className={cn(FIELD, "pr-6", className)}
    >
      {!options.some((o) => o.value === value) && <option value={value}>{value || "—"}</option>}
      {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>
  )
}
