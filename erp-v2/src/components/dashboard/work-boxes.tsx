"use client"

// Dashboard round 2 (owner 2026-11-10, DASHBOARD.md): the daily work split into three fixed boxes —
//  • ต้องทำ (ฮีโร่)  = Action, big-number tiles (ขนาด = ความสำคัญ)
//  • ⚠️ ต้องรู้ไว้     = Alert, compact rows in a yellow-framed box
//  • ลีด / ขาย        = Sales follow-up
// Housekeeping topics (no_family/no_line/…) are intentionally dropped here — they live as badges on their own pages.
import Link from "next/link"
import { AlertTriangleIcon, CheckIcon, ChevronRightIcon, ClipboardCheckIcon, SparklesIcon, UserSearchIcon } from "lucide-react"
import { focusHref, type Topic } from "@/domain/rules/today"
import { DASH_BOX } from "./box"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export const HERO_KEYS = ["unmarked", "summary_write", "summary_approve", "invoice_approve", "unconfirmed", "parent_requests", "renewal", "exiting"]
export const ALERT_KEYS = ["no_teacher", "conflict", "teacher_leave", "unpaid"]
export const SALES_KEYS = ["lead_new", "lead_follow_again", "lead_quiet", "survey_call", "trial_idle"]
/** red (ด่วนสุด) vs amber (ปกติ) for a hero tile */
const URGENT_KEYS = new Set(["unmarked", "parent_requests", "conflict", "no_teacher"])

export const pick = (topics: Topic[], keys: string[]) => keys.map((k) => topics.find((t) => t.key === k)).filter((t): t is Topic => !!t)

/**
 * ต้องทำ — the hero (owner 2026-11-10, ref redesign): a left "total" panel (icon · title · big total · "งานทั้งหมด")
 * next to a FLAT divided grid of the breakdown — no coloured fills, thin dividers only, so the number size does the
 * ranking and the box reads calm. Urgent work keeps a red number + "· ด่วน N" so it never hides. AI line sits thin
 * at the bottom as "start here".
 */
export function HeroTasks({ topics, aiLine, title }: { topics: Topic[]; aiLine?: string; title: string }) {
  const open = topics.filter((t) => t.count > 0).sort((a, b) => (b.urgent ?? 0) - (a.urgent ?? 0) || b.count - a.count)
  const total = open.reduce((n, t) => n + t.count, 0)
  return (
    <section className={cn("flex flex-col", DASH_BOX)}>
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* left: the total — icon anchors the box, the big number is "how much is on my plate today" */}
        <div className="flex shrink-0 flex-col border-b pb-3 lg:w-40 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <span className="mb-2 grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><ClipboardCheckIcon className="size-5" /></span>
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="mt-0.5 text-5xl font-semibold leading-none tabular-nums text-primary">{total}</span>
          <span className="mt-1 text-xs text-muted-foreground">{tx("งานทั้งหมด")}</span>
        </div>
        {/* right: the breakdown, flat with hairline dividers (gap-px over the border colour) */}
        {open.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success-ink"><CheckIcon className="size-5" /></span>
            <p className="text-sm text-muted-foreground">{tx("เคลียร์หมดแล้ว — ไม่มีงานค้าง")}</p>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-2 gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-3">
            {open.map((t) => {
              const red = URGENT_KEYS.has(t.key) || !!t.urgent
              return (
                <Link key={t.key} href={focusHref(t.href, t.key)} className="flex flex-col bg-card p-3 transition-colors hover:bg-muted/40">
                  <div className={cn("text-3xl font-semibold leading-none tabular-nums", red ? "text-danger" : "text-primary")}>{t.count}</div>
                  <div className="mt-1.5 text-xs leading-snug text-muted-foreground">
                    {t.title}{!!t.urgent && <span className="font-medium text-danger"> · {tx("ด่วน {0}", [t.urgent])}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      {aiLine && open.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-info-soft/60 px-3 py-2 text-sm text-info-ink">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 text-info" />
          <span className="min-w-0">{aiLine}</span>
        </div>
      )}
    </section>
  )
}

/** ⚠️ ต้องรู้ไว้ — alerts you should see even if they aren't yours to do. Compact, yellow-framed. */
export function AlertBox({ topics }: { topics: Topic[] }) {
  const open = topics.filter((t) => t.count > 0)
  return (
    <section className={cn("flex flex-col", DASH_BOX)}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <AlertTriangleIcon className="size-4 text-warning" /> {tx("ต้องรู้ไว้")}
        {open.length > 0 && <span className="ml-auto text-xs text-muted-foreground tabular-nums">{open.length}</span>}
      </h2>
      {open.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">{tx("ไม่มีเรื่องผิดปกติ")}</p>
      ) : (
        <ul className="space-y-0.5">
          {open.map((t) => {
            const red = URGENT_KEYS.has(t.key)
            return (
              <li key={t.key}>
                <Link href={focusHref(t.href, t.key)} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-muted/60">
                  <span className={cn("size-1.5 shrink-0 rounded-full", red ? "bg-danger" : "bg-warning")} />
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  <span className={cn("shrink-0 font-semibold tabular-nums", red ? "text-danger" : "text-warning")}>{t.count}</span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** ลีด / ขาย — CRM follow-up as counted rows. */
export function SalesBox({ topics }: { topics: Topic[] }) {
  const open = topics.filter((t) => t.count > 0)
  return (
    <section className={cn("flex flex-col", DASH_BOX)}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <UserSearchIcon className="size-4 text-muted-foreground" /> {tx("ลีด / ขาย")}
      </h2>
      {open.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">{tx("ไม่มีลีดที่ต้องติดตาม")}</p>
      ) : (
        <ul className="space-y-0.5">
          {open.map((t) => (
            <li key={t.key}>
              <Link href={focusHref(t.href, t.key)} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-muted/60">
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{t.count}</span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
