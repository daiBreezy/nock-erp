"use client"

import { useState } from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** Shared bits for list pages shown as data tables (owner 2026-09-28: tables, not cards — easier to scan).
 *  Lists are always paged so a branch with thousands of rows stays fast. */

export interface SortState<K extends string> { key: K; desc: boolean }

export function useSort<K extends string>(initial: K, desc = false) {
  const [sort, setSort] = useState<SortState<K>>({ key: initial, desc })
  const toggle = (key: K) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }))
  return { sort, toggle }
}

export function SortHeader<K extends string>({ label, k, sort, onSort, className, right }: { label: string; k: K; sort: SortState<K>; onSort: (k: K) => void; className?: string; right?: boolean }) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDownIcon : sort.desc ? ArrowDownIcon : ArrowUpIcon
  return (
    <th className={cn("px-3 py-2.5 text-left font-medium", right && "text-right", className)}>
      <button type="button" onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1 whitespace-nowrap", active && "text-foreground")}>
        {label}<Icon className={cn("size-3", !active && "opacity-40")} />
      </button>
    </th>
  )
}

export function usePage<T>(rows: T[], size = 25) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const p = Math.min(page, pages - 1)
  return { rows: rows.slice(p * size, p * size + size), page: p, pages, total: rows.length, size, setPage }
}

export function Pager({ page, pages, total, size, setPage, unit = "รายการ" }: { page: number; pages: number; total: number; size: number; setPage: (p: number) => void; unit?: string }) {
  if (total === 0) return null
  const from = page * size + 1
  const to = Math.min(total, from + size - 1)
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
      <span>{from.toLocaleString()}–{to.toLocaleString()} จาก {total.toLocaleString()} {unit}</span>
      {pages > 1 && (
        <span className="ml-auto flex items-center gap-1">
          <Button size="icon-xs" variant="ghost" aria-label="หน้าก่อน" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeftIcon /></Button>
          หน้า {page + 1}/{pages}
          <Button size="icon-xs" variant="ghost" aria-label="หน้าถัดไป" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}><ChevronRightIcon /></Button>
        </span>
      )}
    </div>
  )
}

/**
 * `cols` (owner 2026-10-07 — "status สั้นยาวไม่เท่ากันดัน alignment"): fixed column widths (CSS widths, "auto" = take
 * the rest). The table is then table-fixed: a long pill or name truncates inside its own column instead of
 * shifting the others, so every row lines up.
 */
export function TableShell({ children, minWidth = 900, cols }: { children: React.ReactNode; minWidth?: number; cols?: string[] }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm [&_td]:align-middle [&_th]:align-middle", cols && "table-fixed")} style={{ minWidth }}>
          {cols && <colgroup>{cols.map((w, i) => <col key={i} style={w === "auto" ? undefined : { width: w }} />)}</colgroup>}
          {children}
        </table>
      </div>
    </div>
  )
}

/** a plain (not sortable) header cell, same padding as SortHeader */
export function Th({ children, className, right }: { children?: React.ReactNode; className?: string; right?: boolean }) {
  return <th className={cn("px-3 py-2.5 text-left font-medium whitespace-nowrap", right && "text-right", className)}>{children}</th>
}

/** row classes for every data table: middle-aligned, one height, cells padded the same */
export const ROW = "cursor-pointer border-b last:border-0 hover:bg-muted/40 [&>td]:h-14 [&>td]:px-3 [&>td]:py-1.5"
/** header row */
export const HEAD = "border-b bg-muted/40 text-xs text-muted-foreground"

/** grade order for sorting (อ.1 … ป.6 … ม.6 as the branch lists them; unknown grades last, by name) */
export function gradeCompare(grades: string[]) {
  const rank = (g: string) => { const i = grades.indexOf(g); return i < 0 ? grades.length : i }
  return (a: string, b: string) => rank(a) - rank(b) || a.localeCompare(b, "th")
}

/** the grade pill used in every table's own "ชั้น" column */
export function GradeCell({ grade, tone }: { grade: string; tone: string }) {
  return grade ? <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap", tone)}>{grade}</span> : <span className="text-muted-foreground/60">—</span>
}

/**
 * Long codes shortened in the middle (owner 2026-10-07): "690401-02-001-0001" → "690401…0001" — the start (date)
 * and the end (running number) are what people scan for; hover shows the whole thing.
 */
export function MidText({ text, head = 6, tail = 4, className }: { text: string; head?: number; tail?: number; className?: string }) {
  if (text.length <= head + tail + 1) return <span className={className}>{text}</span>
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn("cursor-default whitespace-nowrap", className)} />}>{text.slice(0, head)}…{text.slice(-tail)}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
