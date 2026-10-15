"use client"

// owner 2026-10-15: the system toast (saved / error / undo) is the shadcn / Base UI Toast too — same family as Noti.
// Same call shape as before (toast.success(text, { description, duration, action })) so callers didn't change.
import type { ReactNode } from "react"
import { toast as manager } from "@/components/ui/toast"

type Opts = { description?: ReactNode; duration?: number; action?: { label: string; onClick: () => void } }
type Kind = "success" | "error" | "info" | "warning" | undefined

const show = (type: Kind) => (title: ReactNode, o: Opts = {}) => {
  const id: string = manager.add({
    title, description: o.description, type, timeout: o.duration ?? (type === "error" ? 8000 : 5000),
    actionProps: o.action ? { children: o.action.label, onClick: () => { o.action!.onClick(); manager.close(id) } } : undefined,
  })
  return id
}

export const toast = Object.assign(show(undefined), {
  success: show("success"), error: show("error"), info: show("info"), warning: show("warning"),
  dismiss: (id?: string) => (id ? manager.close(id) : undefined),
})
