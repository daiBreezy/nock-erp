"use client"

import { CheckCircle2Icon, CircleDashedIcon, ClockIcon, XCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// AI Elements "Confirmation" (ui.shadcn.com/docs/ai-elements/confirmation) — a card that asks to approve or deny before
// something runs. owner 2026-10-15: every approve / reject card in the Inbox chat uses this one shell.
//   Confirmation
//   ├── ConfirmationHeader   (icon · title · state)
//   ├── ConfirmationBody
//   └── ConfirmationActions  (only while it waits for someone) | ConfirmationResult (after)

export type ConfirmationState = "waiting" | "pending" | "approved" | "rejected" | "answered"

const STATE: Record<ConfirmationState, { label: string; icon: React.ReactNode; tone: string }> = {
  waiting: { label: "รอผู้ปกครองตอบ", icon: <CircleDashedIcon />, tone: "text-muted-foreground" },
  pending: { label: "รออนุมัติ", icon: <ClockIcon />, tone: "text-amber-700 dark:text-amber-400" },
  approved: { label: "อนุมัติแล้ว", icon: <CheckCircle2Icon />, tone: "text-emerald-700 dark:text-emerald-400" },
  rejected: { label: "ปฏิเสธแล้ว", icon: <XCircleIcon />, tone: "text-red-700 dark:text-red-400" },
  answered: { label: "ผู้ปกครองตอบแล้ว", icon: <CheckCircle2Icon />, tone: "text-emerald-700 dark:text-emerald-400" },
}

export function Confirmation({ state, className, ...props }: React.ComponentProps<"div"> & { state: ConfirmationState }) {
  return (
    <div
      data-slot="confirmation" data-state={state}
      className={cn("w-full max-w-md overflow-hidden rounded-2xl border bg-card text-sm shadow-xs", state === "pending" && "border-amber-300 dark:border-amber-800", className)}
      {...props}
    />
  )
}

export function ConfirmationHeader({ icon, title, state, label, className }: { icon?: React.ReactNode; title: React.ReactNode; state: ConfirmationState; label?: string; className?: string }) {
  const s = STATE[state]
  return (
    <div data-slot="confirmation-header" className={cn("flex items-center gap-2 px-3.5 pt-3", className)}>
      {icon && <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground [&>svg]:size-3.5">{icon}</span>}
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium [&>svg]:size-3.5", s.tone)}>{s.icon}{label ?? s.label}</span>
    </div>
  )
}

export function ConfirmationBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="confirmation-body" className={cn("px-3.5 pt-2 pb-3", className)} {...props} />
}

export function ConfirmationActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="confirmation-actions" className={cn("flex items-center justify-end gap-1.5 border-t bg-muted/30 px-3.5 py-2.5", className)} {...props} />
}

export function ConfirmationResult({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="confirmation-result" className={cn("flex items-center gap-2 border-t px-3.5 py-2 text-xs text-muted-foreground", className)} {...props} />
}
