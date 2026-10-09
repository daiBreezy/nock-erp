"use client"

// One form, two homes (owner 2026-10-09): every create / edit form renders as a popup by default, or — wrapped in
// <PanelForm> — inside the record's side panel as Header · Body (scrolls) · Bottom (CTA). That gives each page the
// same View → Edit → Create flow in one panel without writing every form twice.
import { createContext, useContext } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const InPanel = createContext(false)

/** render the forms inside as panel content (Header · Body · Bottom) instead of a popup */
export function PanelForm({ children }: { children: React.ReactNode }) {
  return <InPanel.Provider value>{children}</InPanel.Provider>
}

export function FormShell({ title, description, onClose, footer, children, className }: {
  title: React.ReactNode; description?: React.ReactNode; onClose: () => void; footer: React.ReactNode; children: React.ReactNode
  /** popup width / height (ignored in a panel) */
  className?: string
}) {
  if (useContext(InPanel)) {
    return (
      <>
        <SheetHeader className="shrink-0 border-b pb-3">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">{children}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-background px-4 py-3">{footer}</div>
      </>
    )
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter className="items-center">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The side panel itself — Header · Body · Bottom, only the body scrolls (owner 2026-10-09) */
export function EntityPanel({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={cn("flex h-full w-full flex-col gap-0 overflow-hidden p-0", wide ? "data-[side=right]:sm:max-w-2xl" : "data-[side=right]:sm:max-w-xl")}>{children}</SheetContent>
    </Sheet>
  )
}

/** body of a view-mode panel */
export function PanelBody({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">{children}</div>
}

/** bottom bar of a view-mode panel — destructive left, primary right */
export function PanelFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-background px-4 py-3">{children}</div>
}
