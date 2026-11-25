"use client"

// Noti (owner 2026-10-15 · redesign 2026-10-28 Row 51): the notification popup — built on the shadcn / Base UI Toast
// (components/ui/toast.tsx), its own manager so it lives top-right while the system toast (saved / error) stays
// bottom-right. A card: coloured by kind (not white — Admin must spot it), SOLID — never see-through (owner 2026-11-16) · icon · title · 1–2 lines · time ·
// action button · close. Stacks from the top; hover to fan out top-to-bottom, close one at a time, or ล้างทั้งหมด.
// Every noti STAYS until closed by hand (owner: ค้างไว้จนกว่าจะปิดเอง). Ones that need a decision carry a CTA.
import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { BellIcon, CalendarOffIcon, ChevronUpIcon, DoorOpenIcon, MessageCircleIcon, StickyNoteIcon, UndoDotIcon, XIcon, BusIcon, MapPinHouseIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToastAction, ToastDescription, ToastProvider, ToastTitle } from "@/components/ui/toast"
import { agoLabel } from "@/domain/dates"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { usePeekOpen } from "./noti-peek-state"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { fmtSpan } from "@/lib/span"
import { useNow } from "@/lib/hooks"
import { fmtDate, toDateStr } from "@/domain/dates"

export type NotiKind = "exit" | "leave" | "return" | "bus" | "home" | "message" | "note" | "info"
// `tone` = the round icon chip · `card` = the whole card (tinted bg + coloured border + thick left accent) so each
// kind reads at a glance and never blends into the page.
export const NOTI_KIND: Record<NotiKind, { icon: typeof BellIcon; tone: string; card: string }> = {
  exit: { icon: DoorOpenIcon, tone: "bg-danger-soft text-danger-ink", card: "border-danger/40 border-l-4 border-l-danger bg-danger-soft" },
  leave: { icon: CalendarOffIcon, tone: "bg-warning-soft text-warning-ink", card: "border-warning/40 border-l-4 border-l-warning bg-warning-soft" },
  bus: { icon: BusIcon, tone: "bg-info-soft text-info-ink", card: "border-info/40 border-l-4 border-l-info bg-info-soft" },
  home: { icon: MapPinHouseIcon, tone: "bg-info-soft text-info-ink", card: "border-info/40 border-l-4 border-l-info bg-info-soft" },
  return: { icon: UndoDotIcon, tone: "bg-success-soft text-success-ink", card: "border-success/40 border-l-4 border-l-success bg-success-soft" },
  // eslint-disable-next-line no-restricted-syntax -- ds-exception: notification kind identity (message indigo · note special)
  message: { icon: MessageCircleIcon, tone: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300", card: "border-indigo-300 border-l-4 border-l-indigo-500 bg-indigo-50 dark:border-indigo-900/60 dark:border-l-indigo-500 dark:bg-indigo-950/50" },
  note: { icon: StickyNoteIcon, tone: "bg-special-soft text-special-ink", card: "border-special/30 border-l-4 border-l-special bg-special-soft" },
  info: { icon: BellIcon, tone: "bg-primary/10 text-primary", card: "border-primary/40 border-l-4 border-l-primary bg-[color-mix(in_oklab,var(--primary)_8%,var(--popover))]" },
}
interface NotiData { kind: NotiKind; at: number }

const notiManager = ToastPrimitive.createToastManager()
let lastAt = 0

/** pop a notification top-right. It stays until the viewer closes it (owner Row 51); pass `sticky: false` only for a
 *  throwaway heads-up that may auto-dismiss. `action` draws a CTA button on the card. */
export function notify({ title, body, kind = "info", action, sticky = true }: {
  title: string; body?: string; kind?: NotiKind; action?: { label: string; onClick: () => void }; sticky?: boolean
}) {
  const id = notiManager.add<NotiData>({
    title, description: body, timeout: sticky ? 0 : 15000, priority: sticky ? "high" : "low",
    data: { kind, at: (lastAt = Math.max(Date.now(), lastAt + 1)) },
    actionProps: action ? { children: action.label, onClick: () => { action.onClick(); notiManager.close(id) } } : undefined,
  })
  return id
}

/** "3 ว ที่แล้ว" compact, the full words on hover (owner 2026-11-25) — past a month it is the DATE, there is no month / year unit */
export function NotiAgo({ at }: { at: number }) {
  const now = useNow(60_000).getTime()
  const a = agoLabel(at, now)
  if (a.kind !== "days") return <>{notiAgo(at, now)}</>
  return (
    <HoverCard>
      <HoverCardTrigger render={<span className="cursor-default" />}>{notiAgo(at, now)}</HoverCardTrigger>
      <HoverCardContent side="top" align="end" className="w-auto px-3 py-2 text-xs">{tx("{0} วันที่แล้ว", [a.n])}</HoverCardContent>
    </HoverCard>
  )
}

export function notiAgo(at: number, now: number = Date.now()) {
  const a = agoLabel(at, now)
  switch (a.kind) {
    case "now": return tx("เมื่อสักครู่")
    case "minutes": return tx("{0} นาทีที่แล้ว", [a.n])
    case "clock": return a.clock!
    case "yesterday": return tx("เมื่อวาน")
    case "days": return tx("{0}ที่แล้ว", [fmtSpan(a.n)])
    case "months": return fmtDate(toDateStr(new Date(at)), { year: true })
    case "years": return fmtDate(toDateStr(new Date(at)), { year: true })
  }
}

/** the soft dark scrim behind the Noti column (owner 2026-11-16): tints only, clicks go through; taller while a list is open */
export function NotiScrim({ tall }: { tall?: boolean }) {
  return <div aria-hidden className={cn("pointer-events-none fixed top-0 right-0 -z-10 w-[min(40rem,100vw)] bg-radial-[ellipse_at_top_right] from-black/45 via-black/20 via-30% to-transparent to-60% transition-[height] duration-300", tall ? "h-dvh" : "h-[min(24rem,100dvh)]")} />
}

/** how many layers show in the collapsed stack (the front card + 2 peeking behind) */
const LAYERS = 3

/** ล้างทั้งหมด (+ ย่อ when the list is open) — shown once there are 2+ notis. Sits above the stack. */
function Bar({ count, list, onCollapse }: { count: number; list: boolean; onCollapse: () => void }) {
  const pill = "pointer-events-auto inline-flex items-center gap-1 rounded-full border bg-popover px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
  return (
    <div className="pointer-events-none mb-2 flex justify-end gap-2">
      {list && <Button variant="outline" size="inline" type="button" onClick={onCollapse} className={pill}><ChevronUpIcon className="size-3.5" />ย่อ</Button>}
      <Button variant="outline" size="inline" type="button" onClick={() => notiManager.close()} className={pill}>
        <XIcon className="size-3.5" />ล้างทั้งหมด<span className="tabular-nums">({count})</span>
      </Button>
    </div>
  )
}

/**
 * One noti card. `list` = the open list (cards in normal flow, all readable); otherwise the collapsed stack: the newest on
 * top, the next two peeking out as layers behind it, the rest hidden until "ดูทั้งหมด".
 */
function NotiCard({ t, list }: { t: ReturnType<typeof ToastPrimitive.useToastManager>["toasts"][number]; list: boolean }) {
  const data = t.data as NotiData | undefined
  const k = NOTI_KIND[data?.kind ?? "info"]
  return (
    <ToastPrimitive.Root toast={t} swipeDirection={["up", "right"]} data-slot="noti"
      className={cn(
        "group/toast pointer-events-auto w-full rounded-2xl border text-popover-foreground shadow-lg outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        k.card,
        list
          ? cn("relative shrink-0 [transition:transform_300ms,opacity_300ms] [transform:translateX(var(--toast-swipe-movement-x))]",
            "data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))]")
          : cn(
            // the shadcn toast, mirrored to stack downward from the top — coloured per kind so it never reads as a plain white card
            "absolute top-0 right-0 z-[calc(1000-var(--toast-index))] origin-top will-change-transform",
            "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
            // only the first LAYERS cards are drawn — the rest fade out behind them
            "[opacity:clamp(0,calc(3-var(--toast-index)),1)] h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_400ms_cubic-bezier(0.65,0,0.35,1),opacity_400ms,height_150ms]",
            "data-starting-style:[transform:translateY(-150%)]",
            "[&[data-ending-style]:not([data-swipe-direction])]:[transform:translateY(-150%)]",
            "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
            "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))]",
          ),
      )}>
      <ToastPrimitive.Content className={cn("flex items-start gap-3 overflow-hidden p-4", !list && "h-full transition-opacity duration-250 data-behind:opacity-0")}>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", k.tone)}><k.icon className="size-4" /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-2">
            <ToastTitle className="line-clamp-2 min-w-0 flex-1 font-semibold" />
            {data && <span className="mt-0.5 shrink-0 text-2xs text-muted-foreground"><NotiAgo at={data.at} /></span>}
          </div>
          <ToastDescription className="line-clamp-2 text-xs" />
          {t.actionProps && <ToastAction render={<Button variant="outline" />} className="mt-2 self-start" />}
        </div>
        <ToastPrimitive.Close aria-label="ปิดการแจ้งเตือน" render={<Button variant="ghost" size="icon" />} className="-mt-1.5 -mr-1.5 shrink-0 text-muted-foreground hover:text-foreground">
          <XIcon />
        </ToastPrimitive.Close>
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  )
}

function NotiStack() {
  const { toasts } = ToastPrimitive.useToastManager()
  const [open, setOpen] = React.useState(false)
  // re-render once a minute so "x นาทีที่แล้ว" stays true
  const [, tick] = React.useState(0)
  React.useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t) }, [])
  const n = toasts.length
  // nothing to expand with fewer than 2 — fall back to the stack so the next noti doesn't open straight into the list
  React.useEffect(() => { if (n < 2) setOpen(false) }, [n]) // eslint-disable-line react-hooks/set-state-in-effect
  const list = open && n > 1
  const newestFirst = [...toasts].sort((a, b) => ((b.data as NotiData | undefined)?.at ?? 0) - ((a.data as NotiData | undefined)?.at ?? 0))
  return (
    <>
      {n > 0 && <NotiScrim tall={list} />}
      {n >= 2 && <Bar count={n} list={list} onCollapse={() => setOpen(false)} />}
      {/* the open list scrolls inside the screen when there are more cards than fit; the stack is as tall as the front card + its layers */}
      <div className={list ? "pointer-events-auto -mx-1 flex max-h-[calc(100dvh-10rem)] flex-col gap-3 overflow-y-auto px-1 py-1" : "relative"}
        style={list ? undefined : { height: `calc(var(--toast-frontmost-height, 0px) + ${Math.min(Math.max(n - 1, 0), LAYERS - 1) * 0.75}rem)` }}>
        {newestFirst.map((t) => <NotiCard key={t.id} t={t} list={list} />)}
      </div>
      {n >= 2 && !list && (
        // a hug button under the stack, at the right edge like ล้างทั้งหมด — not stretched across the card
        <div className="pointer-events-none relative z-[1100] mt-3 flex justify-end">
          <Button variant="outline" type="button" onClick={() => setOpen(true)} className="pointer-events-auto rounded-full bg-popover shadow-sm">
            ดูทั้งหมด <span className="tabular-nums">({n})</span>
          </Button>
        </div>
      )}
    </>
  )
}

/** mount once (app shell) — top-right, just under the top bar */
export function NotiToaster() {
  // while the แจ้งเตือน menu is hovered the column shows the notification list instead (NotificationPeek) — the live popups wait, unseen
  const peeking = usePeekOpen()
  return (
    <ToastProvider toastManager={notiManager} limit={50}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport data-slot="noti-viewport" aria-label="การแจ้งเตือน"
          className={cn("pointer-events-none fixed inset-x-4 top-16 z-50 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full print:hidden", peeking && "invisible")}>
          <NotiStack />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastProvider>
  )
}
