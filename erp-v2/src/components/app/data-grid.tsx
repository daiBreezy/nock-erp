"use client"

import { Fragment, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon, GripVerticalIcon, InfoIcon, PinIcon, PinOffIcon, RotateCcwIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { HEAD, ROW, type SortState } from "./data-table"

/**
 * Data table each person can arrange for themselves (owner 2026-10-12):
 *  - drag a column by its ⋮⋮ handle (header or the "คอลัมน์" menu) to any position
 *  - pin a column → it jumps to the front and stays put while the table scrolls sideways; unpin → back to where it was
 *  - drag a column edge to make it wider / narrower (the last column by its left edge) — double-click = fit content
 *  - the "คอลัมน์" menu lists the columns in display order: drag · show / hide (checkbox) · lock
 * The layout is saved per person and per table (this browser), so each user keeps their own.
 * Cells never wrap (owner: one line per row) and are never cut off — columns grow to fit their content.
 */
export interface Column<R> {
  id: string
  label: string
  /** minimum width (the column grows to fit its content) */
  width?: string
  align?: "left" | "center" | "right"
  /** sort key — the header becomes a sort button */
  sort?: string
  /** ⓘ after the label — hover explains the column */
  info?: ReactNode
  cell: (row: R) => ReactNode
  /** extra classes for the cell */
  className?: string | ((row: R) => string | undefined)
  /** cannot be hidden (e.g. the name) */
  required?: boolean
  /** owner 2026-10-15: starts unticked in the column menu — shown only when someone turns it on */
  defaultHidden?: boolean
}

/** widths: px per column once someone dragged a column edge (owner 2026-10-29) — none = columns fit their content */
interface Prefs { order: string[]; locked: string[]; hidden: string[]; widths?: Record<string, number> }

const usePrefsStore = create<{ prefs: Record<string, Prefs>; put: (key: string, p: Prefs | null) => void }>()(
  persist((set) => ({
    prefs: {},
    put: (key, p) => set((s) => {
      const prefs = { ...s.prefs }
      if (p) prefs[key] = p
      else delete prefs[key]
      return { prefs }
    }),
  }), { name: "nockerp-table-layout" }),
)

/** the columns as this person arranged them, and the actions that change it */
function useLayout<R>(tableId: string, columns: Column<R>[]) {
  const userId = useStore((s) => s.userId)
  const key = `${userId}:${tableId}`
  const saved = usePrefsStore((s) => s.prefs[key])
  const put = usePrefsStore((s) => s.put)
  const ids = columns.map((c) => c.id)
  // columns added later (not in the saved order yet) keep their place after the saved ones
  const order = saved ? [...saved.order.filter((id) => ids.includes(id)), ...ids.filter((id) => !saved.order.includes(id))] : ids
  const locked = (saved?.locked ?? []).filter((id) => ids.includes(id))
  // a column that starts hidden stays hidden until turned on — also when it is new to an already-saved layout
  const fresh = columns.filter((c) => c.defaultHidden && !saved?.order.includes(c.id)).map((c) => c.id)
  const hidden = [...(saved?.hidden ?? []), ...fresh].filter((id) => ids.includes(id) && !columns.find((c) => c.id === id)?.required)
  const byId = new Map(columns.map((c) => [c.id, c]))
  // locked columns go first — their place in `order` is kept, so unlocking puts them back where they were
  const display = [...order.filter((id) => locked.includes(id)), ...order.filter((id) => !locked.includes(id))].map((id) => byId.get(id)!)
  const widths = saved?.widths
  const save = (p: Partial<Prefs>) => put(key, { order, locked, hidden, widths, ...p })
  return {
    display,
    visible: display.filter((c) => !hidden.includes(c.id)),
    locked, hidden, custom: !!saved, widths,
    setWidths: (w: Record<string, number> | undefined) => save({ widths: w }),
    /** drop `src` onto `target`: it takes the target's place (and its locked / unlocked side) */
    move(src: string, target: string) {
      if (src === target) return
      const di = display.map((c) => c.id)
      const right = di.indexOf(src) < di.indexOf(target)
      const rest = order.filter((id) => id !== src)
      const at = rest.indexOf(target) + (right ? 1 : 0)
      const nextLocked = locked.includes(target) ? [...new Set([...locked, src])] : locked.filter((id) => id !== src)
      save({ order: [...rest.slice(0, at), src, ...rest.slice(at)], locked: nextLocked })
    },
    toggleLock: (id: string) => save({ locked: locked.includes(id) ? locked.filter((x) => x !== id) : [...locked, id] }),
    toggleHidden(id: string) {
      if (hidden.includes(id)) return save({ hidden: hidden.filter((x) => x !== id) })
      // always keep at least one column on screen
      if (display.length - hidden.length <= 1) return
      save({ hidden: [...hidden, id] })
    },
    reset: () => put(key, null),
  }
}

const DRAG_TYPE = "application/x-nock-column"
/** header icons: no width until the header is hovered, then they slide open */
const SLIDE = "flex w-0 shrink-0 items-center overflow-hidden opacity-0 transition-[width,opacity] duration-150 ease-out group-hover/th:w-[18px] group-hover/th:opacity-100 focus-visible:w-[18px] focus-visible:opacity-100"
const justify = (a?: Column<unknown>["align"]) => (a === "right" ? "justify-end" : a === "center" ? "justify-center" : "justify-start")
const textAlign = (a?: Column<unknown>["align"]) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left")

export function DataTable<R>({ id, columns, rows, rowKey, onRowClick, rowClassName, rowProps, sort, onSort, empty, minWidth = 900, expanded }: {
  /** one id per table — the saved layout is kept under it */
  id: string
  columns: Column<R>[]
  rows: R[]
  rowKey: (row: R) => string
  onRowClick?: (row: R) => void
  rowClassName?: (row: R) => string | undefined | false
  rowProps?: (row: R) => HTMLAttributes<HTMLTableRowElement> & Record<`data-${string}`, string | undefined>
  sort?: SortState<string>
  onSort?: (key: never) => void
  empty?: ReactNode
  minWidth?: number
  /** owner 2026-10-19 (Bus Route): a row that opens in place — what to show under it (null = closed) */
  expanded?: (row: R) => ReactNode
}) {
  const L = useLayout(id, columns)
  const cols = L.visible
  const lockedVisible = cols.filter((c) => L.locked.includes(c.id))
  const lastLocked = lockedVisible.at(-1)?.id
  const [over, setOver] = useState<string | null>(null)
  // owner 2026-10-29: the column under the pointer (header) is tinted top to bottom, so you can see which one you are on
  const [hoverCol, setHoverCol] = useState<string | null>(null)
  const fixed = !!L.widths && cols.every((c) => L.widths![c.id])
  const totalWidth = fixed ? cols.reduce((a, c) => a + L.widths![c.id], 0) : 0
  /** drag a column edge: every column's current width is taken as the start, then only the dragged edge moves.
   *  The last column is dragged by its LEFT edge (owner) — it and the column before it trade width. */
  const startResize = (e: React.PointerEvent<HTMLSpanElement>, colId: string) => {
    e.preventDefault(); e.stopPropagation()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const base: Record<string, number> = {}
    for (const c of cols) base[c.id] = L.widths?.[c.id] ?? heads.current.get(c.id)?.offsetWidth ?? 120
    const i = cols.findIndex((c) => c.id === colId)
    const last = i === cols.length - 1 && i > 0
    const x0 = e.clientX
    const MIN = 48
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0
      const next = { ...base }
      if (last) {
        const prev = cols[i - 1].id
        const d = Math.max(MIN - base[prev], Math.min(dx, base[colId] - MIN))
        next[prev] = base[prev] + d
        next[colId] = base[colId] - d
      } else next[colId] = Math.max(MIN, base[colId] + dx)
      L.setWidths(next)
    }
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); document.body.style.cursor = "" }
    document.body.style.cursor = "col-resize"
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
  }
  // sticky offsets of the locked columns, measured from the header cells
  const heads = useRef(new Map<string, HTMLTableCellElement>())
  const [left, setLeft] = useState<Record<string, number>>({})
  const lockKey = lockedVisible.map((c) => c.id).join("|")
  useLayoutEffect(() => {
    const measure = () => {
      let x = 0
      const next: Record<string, number> = {}
      for (const c of lockedVisible) { next[c.id] = x; x += heads.current.get(c.id)?.offsetWidth ?? 0 }
      setLeft((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    heads.current.forEach((el) => ro.observe(el))
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-measure when the locked set or the rows change
  }, [lockKey, rows])

  const sticky = (c: Column<R>) => L.locked.includes(c.id)
  const stickyCls = (c: Column<R>, head: boolean) => sticky(c) && cn("sticky z-10", head ? "bg-[color-mix(in_oklab,var(--muted)_40%,var(--card))]" : "bg-card group-hover/row:shadow-[inset_0_0_0_100vmax_color-mix(in_oklab,var(--muted)_40%,transparent)]", c.id === lastLocked && "border-r")

  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="overflow-x-auto">
        <table className={cn("text-sm [&_td]:align-middle [&_th]:align-middle", fixed ? "table-fixed" : "w-full")} style={fixed ? { width: totalWidth, minWidth: "100%" } : { minWidth }}>
          <colgroup>{cols.map((c) => <col key={c.id} style={fixed ? { width: L.widths![c.id] } : c.width ? { width: c.width } : undefined} />)}</colgroup>
          <thead className={HEAD}>
            <tr>
              {cols.map((c) => {
                const active = !!sort?.custom && sort.key === c.sort
                const SortIcon = !active ? ArrowUpDownIcon : sort!.desc ? ArrowDownIcon : ArrowUpIcon
                const isLocked = L.locked.includes(c.id)
                const isLast = cols.length > 1 && c.id === cols.at(-1)!.id
                return (
                  <th key={c.id} ref={(el) => { if (el) heads.current.set(c.id, el); else heads.current.delete(c.id) }}
                    style={sticky(c) ? { left: left[c.id] ?? 0 } : undefined}
                    onMouseEnter={() => setHoverCol(c.id)} onMouseLeave={() => setHoverCol((h) => (h === c.id ? null : h))}
                    onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setOver(c.id) } }}
                    onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
                    onDrop={(e) => { const src = e.dataTransfer.getData(DRAG_TYPE); setOver(null); if (src) L.move(src, c.id) }}
                    className={cn("group/th relative px-3 py-2.5 font-medium whitespace-nowrap", textAlign(c.align), stickyCls(c, true), hoverCol === c.id && "bg-primary/10 text-foreground", over === c.id && "bg-primary/10 shadow-[inset_2px_0_0_var(--primary)]")}>
                    {/* owner 2026-10-12: the pin / drag icons take no room until the header is hovered — then they slide in
                        and the label gets shorter (…) inside the SAME column width: hovering never widens a column.
                        owner 2026-10-29: drag handle goes LAST, lock → pin. The invisible sizer gives the column its width. */}
                    <span aria-hidden className="invisible flex h-0 items-center gap-1 overflow-hidden">
                      {c.label}{c.sort && onSort && <span className="size-3" />}{c.info && <span className="ml-1 size-4" />}{isLocked && <span className="w-[18px]" />}
                    </span>
                    <span className={cn("flex min-w-0 items-center [contain:inline-size]", justify(c.align))}>
                      {c.sort && onSort ? (
                        <button type="button" title={c.label} onClick={() => (onSort as (k: string) => void)(c.sort!)} className={cn("inline-flex min-w-0 items-center gap-1", active && "text-foreground")}>
                          <span className="truncate">{c.label}</span><SortIcon className={cn("size-3 shrink-0", !active && "opacity-40")} />
                        </button>
                      ) : <span className="truncate" title={c.label}>{c.label}</span>}
                      {c.info && (
                        <HoverCard>
                          <HoverCardTrigger render={<button type="button" aria-label={`เกี่ยวกับคอลัมน์ ${c.label}`} className="ml-1 grid size-4 shrink-0 place-items-center rounded-full hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none" />}>
                            <InfoIcon className="size-3.5" />
                          </HoverCardTrigger>
                          <HoverCardContent side="bottom" align="start" className="leading-relaxed">{c.info}</HoverCardContent>
                        </HoverCard>
                      )}
                      <button type="button" onClick={() => L.toggleLock(c.id)} aria-pressed={isLocked}
                        title={isLocked ? "เลิกปักหมุด — กลับไปที่เดิม" : "ปักหมุดคอลัมน์ — ไว้ด้านหน้า ไม่เลื่อนตาม"} aria-label={isLocked ? `เลิกปักหมุด ${c.label}` : `ปักหมุด ${c.label}`}
                        className={cn("flex items-center hover:text-foreground", isLocked ? "w-[18px] shrink-0 text-primary" : SLIDE)}>
                        <span className="w-1 shrink-0" />{isLocked ? <PinIcon className="size-3.5 shrink-0" /> : <PinOffIcon className="size-3.5 shrink-0" />}
                      </button>
                      <span draggable title="ลากเพื่อย้ายคอลัมน์" aria-label={`ย้ายคอลัมน์ ${c.label}`}
                        onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, c.id); e.dataTransfer.effectAllowed = "move" }}
                        onDragEnd={() => setOver(null)}
                        className={cn(SLIDE, "cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing")}>
                        <span className="w-1 shrink-0" /><GripVerticalIcon className="size-3.5 shrink-0" />
                      </span>
                    </span>
                    {/* resize: right edge — the last column from its left edge */}
                    <span role="separator" aria-orientation="vertical" aria-label={`ปรับความกว้าง ${c.label}`} title="ลากเพื่อปรับความกว้าง · ดับเบิลคลิก = พอดีเนื้อหา"
                      onPointerDown={(e) => startResize(e, c.id)} onDoubleClick={() => L.setWidths(undefined)} onClick={(e) => e.stopPropagation()}
                      className={cn("group/rs absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none", isLast ? "-left-1" : "-right-1")}>
                      <span className="absolute inset-y-1.5 left-1/2 w-px -translate-x-1/2 bg-border opacity-0 transition-opacity group-hover/th:opacity-100 group-hover/rs:w-0.5 group-hover/rs:bg-primary" />
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const more = expanded?.(r)
              return (
                <Fragment key={rowKey(r)}>
                  <tr onClick={onRowClick && (() => onRowClick(r))} {...rowProps?.(r)} className={cn("group/row", ROW, "[&>td]:whitespace-nowrap", !onRowClick && "cursor-default", more != null && "bg-primary/5 hover:bg-primary/5", rowClassName?.(r))}>
                    {cols.map((c) => (
                      <td key={c.id} style={sticky(c) ? { left: left[c.id] ?? 0 } : undefined}
                        className={cn(textAlign(c.align), stickyCls(c, false), fixed && "overflow-hidden text-ellipsis", hoverCol === c.id && "bg-primary/5", typeof c.className === "function" ? c.className(r) : c.className)}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                  {more != null && <tr className="border-b last:border-0"><td colSpan={cols.length} className="p-0">{more}</td></tr>}
                </Fragment>
              )
            })}
            {rows.length === 0 && <tr><td colSpan={cols.length} className="p-10 text-center text-muted-foreground">{empty ?? "ไม่มีข้อมูล"}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** "คอลัมน์" button (owner 2026-10-12): every column in display order — drag to reorder, tick to show / hide, lock */
export function ColumnsMenu<R>({ id, columns }: { id: string; columns: Column<R>[] }) {
  const L = useLayout(id, columns)
  const [over, setOver] = useState<string | null>(null)
  const shown = L.display.length - L.hidden.length
  return (
    <Popover>
      {/* owner 2026-10-12: icon only — "การจัดการคอลัมน์" on hover */}
      <HoverCard>
        <HoverCardTrigger render={<PopoverTrigger render={<button type="button" aria-label="การจัดการคอลัมน์" className={cn("relative grid size-9 shrink-0 place-items-center rounded-full", L.custom ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground")} />} />}>
          <Columns3Icon className="size-4" />
          {L.hidden.length > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums">{L.hidden.length}</span>}
        </HoverCardTrigger>
        <HoverCardContent>การจัดการคอลัมน์{L.hidden.length > 0 ? ` · ซ่อน ${L.hidden.length}` : ""}</HoverCardContent>
      </HoverCard>
      <PopoverContent align="end" className="w-64 gap-0 p-1.5">
        <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">ลากเพื่อเรียง · ติ๊กเพื่อแสดง · หมุด = ปักไว้ด้านหน้า</p>
        <ul>
          {L.display.map((c) => {
            const isLocked = L.locked.includes(c.id)
            const isShown = !L.hidden.includes(c.id)
            return (
              <li key={c.id} draggable
                onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, c.id); e.dataTransfer.effectAllowed = "move" }}
                onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setOver(c.id) } }}
                onDragLeave={() => setOver((o) => (o === c.id ? null : o))}
                onDrop={(e) => { const src = e.dataTransfer.getData(DRAG_TYPE); setOver(null); if (src) L.move(src, c.id) }}
                onDragEnd={() => setOver(null)}
                className={cn("flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm hover:bg-muted", over === c.id && "bg-primary/10 shadow-[inset_0_2px_0_var(--primary)]")}>
                <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground/60" aria-hidden />
                <label className={cn("flex min-w-0 flex-1 items-center gap-2", c.required ? "cursor-default" : "cursor-pointer")}>
                  <input type="checkbox" className="size-4 accent-primary" checked={isShown} disabled={c.required || (isShown && shown <= 1)} onChange={() => L.toggleHidden(c.id)} />
                  <span className={cn("truncate", !isShown && "text-muted-foreground")}>{c.label}</span>
                </label>
                <button type="button" onClick={() => L.toggleLock(c.id)} aria-pressed={isLocked} aria-label={isLocked ? `เลิกปักหมุด ${c.label}` : `ปักหมุด ${c.label}`}
                  title={isLocked ? "เลิกปักหมุด — กลับไปที่เดิม" : "ปักไว้ด้านหน้า"}
                  className={cn("grid size-6 shrink-0 place-items-center rounded-md hover:bg-background", isLocked ? "text-primary" : "text-muted-foreground/60")}>
                  {isLocked ? <PinIcon className="size-3.5" /> : <PinOffIcon className="size-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" disabled={!L.custom} onClick={L.reset}
          className="mt-1 flex w-full items-center gap-2 rounded-lg border-t px-2 pt-2 pb-1 text-left text-xs text-muted-foreground hover:text-foreground disabled:opacity-40">
          <RotateCcwIcon className="size-3.5" />คืนค่าเริ่มต้น
        </button>
      </PopoverContent>
    </Popover>
  )
}
