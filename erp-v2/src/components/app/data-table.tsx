"use client"

import { useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

/** Shared bits for list pages shown as data tables (owner 2026-09-28: tables, not cards — easier to scan).
 *  Lists are always paged so a branch with thousands of rows stays fast. The table itself is `DataTable` (data-grid.tsx). */

/** `custom` = the person picked this column; false = the page's default order (no arrow shown on any header) */
export interface SortState<K extends string> { key: K; desc: boolean; custom?: boolean }

/**
 * Three states per header (owner 2026-10-12): default → ↑ ascending → ↓ descending → default again.
 * In the default state the rows keep the page's own order (`initial` / `desc`).
 */
export function useSort<K extends string>(initial: K, desc = false) {
  const base: SortState<K> = { key: initial, desc, custom: false }
  const [sort, setSort] = useState<SortState<K>>(base)
  const toggle = (key: K) => setSort((s) => (!s.custom || s.key !== key ? { key, desc: false, custom: true } : !s.desc ? { key, desc: true, custom: true } : base))
  return { sort, toggle }
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
    <HoverCard>
      <HoverCardTrigger render={<span className={cn("cursor-default whitespace-nowrap", className)} />}>{text.slice(0, head)}…{text.slice(-tail)}</HoverCardTrigger>
      <HoverCardContent>{text}</HoverCardContent>
    </HoverCard>
  )
}
