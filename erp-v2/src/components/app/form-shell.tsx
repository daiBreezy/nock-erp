"use client"

// One form, two homes (owner 2026-10-09): every create / edit form renders as a popup by default, or — wrapped in
// <PanelForm> — inside the record's side panel as Header · Body (scrolls) · Bottom (CTA). That gives each page the
// same View → Edit → Create flow in one panel without writing every form twice.
import { createContext, useContext, useState, type ComponentType, type ReactNode } from "react"
import { EllipsisIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useSidePanel } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { InfoTip } from "./info-tip"

const InPanel = createContext(false)

/** render the forms inside as panel content (Header · Body · Bottom) instead of a popup */
export function PanelForm({ children }: { children: React.ReactNode }) {
  return <InPanel.Provider value>{children}</InPanel.Provider>
}

/** true inside <PanelForm> — a form saved there hands back to the panel instead of closing */
export const useInPanel = () => useContext(InPanel)

export function FormShell({ title, description, onClose, footer, children, className }: {
  title: React.ReactNode; description?: React.ReactNode; onClose: () => void; footer: React.ReactNode; children: React.ReactNode
  /** popup width / height (ignored in a panel) */
  className?: string
}) {
  if (useContext(InPanel)) {
    return (
      <>
        <SheetHeader className="shrink-0 border-b pb-3">
          {/* owner 2026-10-13: the explanation sits behind an ⓘ next to the title, not as a grey line */}
          <SheetTitle className="flex items-center gap-1.5 pr-8 text-lg">{title}{description && <InfoTip text={description} />}</SheetTitle>
          {description && <SheetDescription className="sr-only">{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">{children}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-popover px-4 py-3">{footer}</div>
      </>
    )
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">{title}{description && <InfoTip text={description} />}</DialogTitle>
          {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter className="items-center">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The side panel itself — Header · Body · Bottom, only the body scrolls (owner 2026-10-09).
 *  resizeKey (owner 2026-11-24): drag the left edge to widen / narrow the panel (double-click = back to normal); the width is remembered per browser. */
export function EntityPanel({ open, onClose, children, wide, className, resizeKey }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean; className?: string; resizeKey?: string }) {
  // phones + tablet-portrait: a bottom sheet; only a wide landscape screen gets the right-hand panel (owner 2026-11-02)
  const sidePanel = useSidePanel()
  const store = resizeKey ? `panel-width:${resizeKey}` : ""
  const [width, setWidth] = useState<number | null>(() => { try { const v = store ? Number(localStorage.getItem(store)) : 0; return v > 0 ? v : null } catch { return null } })
  const clamp = (w: number) => Math.round(Math.min(window.innerWidth - 32, Math.max(480, w)))
  const save = (w: number | null) => { try { if (!store) return; if (w) localStorage.setItem(store, String(w)); else localStorage.removeItem(store) } catch { /* private window */ } }
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    let last = width
    const move = (ev: PointerEvent) => { last = clamp(window.innerWidth - ev.clientX); setWidth(last) }
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); save(last) }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
  }
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={sidePanel ? "right" : "bottom"}
        style={sidePanel ? (resizeKey && width ? { width: clamp(width), maxWidth: "calc(100vw - 2rem)" } : undefined) : { height: "92dvh" }}
        className={cn("flex w-full flex-col gap-0 overflow-hidden p-0",
          sidePanel ? cn("h-full", wide ? "data-[side=right]:sm:max-w-2xl" : "data-[side=right]:sm:max-w-xl", className) : "rounded-t-2xl")}>
        {!sidePanel && <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />}
        {sidePanel && resizeKey && (
          <div role="separator" aria-orientation="vertical" aria-label="ลากเพื่อปรับความกว้างแผง (ดับเบิลคลิก = ขนาดเดิม)" title="ลากเพื่อปรับความกว้าง · ดับเบิลคลิก = ขนาดเดิม"
            onPointerDown={drag} onDoubleClick={() => { setWidth(null); save(null) }}
            className="absolute inset-y-0 left-0 z-20 hidden w-2 cursor-col-resize touch-none transition-colors hover:bg-primary/30 active:bg-primary/40 sm:block" />
        )}
        {children}
      </SheetContent>
    </Sheet>
  )
}

/** body of a view-mode panel */
export function PanelBody({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">{children}</div>
}

/** bottom bar of a view-mode panel — destructive left, primary right */
export function PanelFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-popover px-4 py-3">{children}</div>
}

export interface MoreItem { label: ReactNode; icon?: ComponentType; onClick: () => void; destructive?: boolean; disabled?: boolean; title?: string
  /** owner 2026-11-25: the item opens a submenu (its content) instead of acting — e.g. “แก้ไข” → who to edit */
  sub?: ReactNode }

/**
 * ⋯ on the left of a panel's bottom bar (owner 2026-10-12): every negative / rarely-used action (แจ้งออก, ปิดบัญชี,
 * ปิดขาย, ปิดคลาส, ยกเลิกใบ …) lives here — nothing red sits next to the main buttons, so it can't be hit by mistake.
 * Renders nothing when there is nothing to show.
 */
export function PanelMore({ items, className }: { items: (MoreItem | false | null | undefined)[]; className?: string }) {
  const list = items.filter(Boolean) as MoreItem[]
  if (!list.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon" variant="outline" className={cn("rounded-full", className)} aria-label="เพิ่มเติม" />}><EllipsisIcon /></DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-max min-w-52 max-w-sm">
        {list.map((it, i) => {
          const Icon = it.icon
          if (it.sub) return (
            <DropdownMenuSub key={i}>
              <DropdownMenuSubTrigger disabled={it.disabled}>{Icon && <Icon />}{it.label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-max min-w-56 max-w-sm">{it.sub}</DropdownMenuSubContent>
            </DropdownMenuSub>
          )
          return (
            <DropdownMenuItem key={i} variant={it.destructive ? "destructive" : "default"} disabled={it.disabled} title={it.title} onClick={it.onClick}>
              {Icon && <Icon />}{it.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
