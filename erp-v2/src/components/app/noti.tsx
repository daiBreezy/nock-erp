"use client"

// Noti (owner 2026-10-15): the notification popup — built on the shadcn / Base UI Toast (components/ui/toast.tsx),
// its own manager so it lives top-right while the system toast (saved / error) stays bottom-right.
// A card: coloured icon · title · 1–2 lines · time · action button · close. Stacks from the top; hover to fan out,
// swipe up or right to dismiss. Important ones (`sticky`) stay until closed.
import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { BellIcon, CalendarOffIcon, DoorOpenIcon, MessageCircleIcon, UndoDotIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToastAction, ToastDescription, ToastProvider, ToastTitle } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export type NotiKind = "exit" | "leave" | "return" | "message" | "info"
const KIND: Record<NotiKind, { icon: typeof BellIcon; tone: string }> = {
  exit: { icon: DoorOpenIcon, tone: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  leave: { icon: CalendarOffIcon, tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  return: { icon: UndoDotIcon, tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  message: { icon: MessageCircleIcon, tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  info: { icon: BellIcon, tone: "bg-primary/10 text-primary" },
}
interface NotiData { kind: NotiKind; at: number }

const notiManager = ToastPrimitive.createToastManager()

/** pop a notification top-right — `sticky` = stays until closed (things someone must act on) */
export function notify({ title, body, kind = "info", action, sticky = false }: {
  title: string; body?: string; kind?: NotiKind; action?: { label: string; onClick: () => void }; sticky?: boolean
}) {
  const id = notiManager.add<NotiData>({
    title, description: body, timeout: sticky ? 0 : 15000, priority: sticky ? "high" : "low",
    data: { kind, at: Date.now() },
    actionProps: action ? { children: action.label, onClick: () => { action.onClick(); notiManager.close(id) } } : undefined,
  })
  return id
}

function ago(at: number) {
  const m = Math.floor((Date.now() - at) / 60000)
  return m < 1 ? "เมื่อสักครู่" : `${m} นาทีที่แล้ว`
}

function NotiList() {
  const { toasts } = ToastPrimitive.useToastManager()
  // re-render once a minute so "x นาทีที่แล้ว" stays true
  const [, tick] = React.useState(0)
  React.useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t) }, [])
  return toasts.map((t) => {
    const data = t.data as NotiData | undefined
    const k = KIND[data?.kind ?? "info"]
    return (
      <ToastPrimitive.Root key={t.id} toast={t} swipeDirection={["up", "right"]} data-slot="noti"
        className={cn(
          // the shadcn toast, mirrored to stack downward from the top
          "group/toast pointer-events-auto absolute top-0 right-0 z-[calc(1000-var(--toast-index))] w-full origin-top rounded-2xl border bg-popover text-popover-foreground shadow-lg will-change-transform outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)+calc(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
          "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_400ms_cubic-bezier(0.65,0,0.35,1),opacity_400ms,height_150ms]",
          "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
          "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",
          "data-limited:opacity-0 data-starting-style:[transform:translateY(-150%)]",
          "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(-150%)]",
          "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
          "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
        )}>
        <ToastPrimitive.Content className="flex h-full items-start gap-3 overflow-hidden p-4 transition-opacity duration-250 data-behind:opacity-0 data-expanded:opacity-100">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", k.tone)}><k.icon className="size-4" /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start gap-2">
              <ToastTitle className="line-clamp-2 min-w-0 flex-1" />
              {data && <span className="mt-0.5 shrink-0 text-[11px] text-muted-foreground">{ago(data.at)}</span>}
            </div>
            <ToastDescription className="line-clamp-2 text-xs" />
            {t.actionProps && <ToastAction render={<Button variant="outline" size="xs" />} className="mt-1 self-start" />}
          </div>
          <ToastPrimitive.Close aria-label="ปิดการแจ้งเตือน" render={<Button variant="ghost" size="icon-xs" />} className="-mt-1 -mr-1 shrink-0 text-muted-foreground hover:text-foreground">
            <XIcon />
          </ToastPrimitive.Close>
        </ToastPrimitive.Content>
      </ToastPrimitive.Root>
    )
  })
}

/** mount once (app shell) — top-right, just under the top bar */
export function NotiToaster() {
  return (
    <ToastProvider toastManager={notiManager} limit={4}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport data-slot="noti-viewport" aria-label="การแจ้งเตือน"
          className="pointer-events-none fixed inset-x-4 top-16 z-50 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full print:hidden">
          <NotiList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastProvider>
  )
}
