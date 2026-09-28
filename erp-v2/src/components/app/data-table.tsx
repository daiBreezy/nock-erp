"use client"

import { useState } from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Shared bits for list pages shown as data tables (owner 2026-09-28: tables, not cards — easier to scan).
 *  Lists are always paged so a branch with thousands of rows stays fast. */

export interface SortState<K extends string> { key: K; desc: boolean }

export function useSort<K extends string>(initial: K, desc = false) {
  const [sort, setSort] = useState<SortState<K>>({ key: initial, desc })
  const toggle = (key: K) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : false }))
  return { sort, toggle }
}

export function SortHeader<K extends string>({ label, k, sort, onSort, className }: { label: string; k: K; sort: SortState<K>; onSort: (k: K) => void; className?: string }) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDownIcon : sort.desc ? ArrowDownIcon : ArrowUpIcon
  return (
    <th className={cn("px-3 py-2.5 text-left font-medium", className)}>
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

export function TableShell({ children, minWidth = 900 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>{children}</table>
      </div>
    </div>
  )
}
