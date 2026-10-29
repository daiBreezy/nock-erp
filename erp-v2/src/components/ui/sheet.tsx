"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * Every right-side panel can be dragged wider / narrower by its left edge (owner 2026-10-29). The width is kept
 * per panel size (this browser) — double-click the edge to go back to the default.
 */
const WIDTH_PREFIX = "nockerp-panel-width:"
function usePanelWidth(key: string) {
  const [width, setWidth] = React.useState<number | null>(() => {
    try { const v = Number(localStorage.getItem(WIDTH_PREFIX + key)); return v > 0 ? v : null } catch { return null }
  })
  const save = (w: number | null) => {
    setWidth(w)
    try { if (w) localStorage.setItem(WIDTH_PREFIX + key, String(w)); else localStorage.removeItem(WIDTH_PREFIX + key) } catch {}
  }
  return [width, save] as const
}

function ResizeHandle({ onResize, onReset }: { onResize: (w: number) => void; onReset: () => void }) {
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => onResize(Math.min(Math.max(window.innerWidth - ev.clientX, 360), window.innerWidth - 48))
    const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); document.body.style.cursor = "" }
    document.body.style.cursor = "col-resize"
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
  }
  return (
    <div role="separator" aria-orientation="vertical" aria-label="ลากเพื่อขยาย / ย่อ" title="ลากเพื่อขยาย / ย่อ · ดับเบิลคลิก = ขนาดเดิม"
      onPointerDown={start} onDoubleClick={onReset}
      className="group/resize absolute inset-y-0 -left-1.5 z-20 hidden w-3 cursor-col-resize touch-none sm:block">
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover/resize:bg-primary/40 group-active/resize:bg-primary" />
    </div>
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  resizeKey,
  style,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
  /** panels sharing a key share their dragged width — defaults to the panel's max-w size */
  resizeKey?: string
}) {
  const key = resizeKey ?? (typeof className === "string" ? className.match(/max-w-\w+/)?.[0] : undefined) ?? "sm"
  const [width, setWidth] = usePanelWidth(key)
  const resizable = side === "right"
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        style={resizable && width ? { width: `min(${width}px, 100vw)`, maxWidth: "none", ...(typeof style === "object" ? style : {}) } : style}
        className={cn(
          "fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-xl transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {resizable && <ResizeHandle onResize={setWidth} onReset={() => setWidth(null)} />}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4 bg-secondary"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

/** Pinned top of the 3-part Header/Body/Footer sheet layout — pair with a `min-h-0 flex-1 overflow-y-auto`
 *  body div and `SheetFooter` below it (see lead-sheet.tsx). `shrink-0` keeps it from being squashed by
 *  the scrolling body in the flex column. */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex shrink-0 flex-col gap-1.5 p-6", className)}
      {...props}
    />
  )
}

/** Pinned bottom CTA bar of the 3-part sheet layout — stays visible while the body scrolls behind it. */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex shrink-0 flex-col gap-2 border-t bg-popover p-6", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
