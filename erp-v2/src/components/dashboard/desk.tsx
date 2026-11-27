"use client"

import Link from "next/link"
import { BanknoteIcon, CheckIcon, ChevronRightIcon, GraduationCapIcon, LightbulbIcon, SchoolIcon, SunIcon, UserSearchIcon, type LucideIcon } from "lucide-react"
import { PILE_ORDER, type Pile, type PileKey } from "@/domain/rules/desk"
import { focusHref } from "@/domain/rules/today"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const ICON: Record<PileKey, LucideIcon> = { classroom: SchoolIcon, finance: BanknoteIcon, customer: GraduationCapIcon, lead: UserSearchIcon, impact: SunIcon }

/** the piles in their fixed places (piles with nothing at all in them are left out) */
export const orderPiles = (piles: Pile[]) => PILE_ORDER.map((k) => piles.find((p) => p.key === k)!).filter((p) => p && (p.total > 0 || p.done.length > 0))

/** one pile on the desk: its name + how much is in it, then its rows in story order. `children` = rows the page draws itself (impact). */
export function PileCard({ pile, children, className }: { pile: Pile; children?: React.ReactNode; className?: string }) {
  const Icon = ICON[pile.key]
  // nothing left in the whole pile: a slim faded card (not on a phone — there only what is still open is shown)
  if (pile.total === 0 && pile.hints.length === 0) {
    return (
      <section id={`pile-${pile.key}`} className={cn("hidden scroll-mt-4 items-start gap-3 rounded-3xl bg-card/60 p-3 text-muted-foreground ring-1 ring-foreground/5 sm:flex", className)}>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="size-4" /></span>
        <span className="flex h-8 items-center text-sm">{tx(pile.title)}</span>
        <span className="ml-auto flex h-8 items-center gap-1 text-xs"><CheckIcon className="size-3.5" /> {tx("เคลียร์แล้ว")}</span>
      </section>
    )
  }
  return (
    <section id={`pile-${pile.key}`} className={cn("flex scroll-mt-4 flex-col rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5", className)}>
      {/* owner 2026-11-27: compact so the whole desk fits one screen — the pile carries its own number, rows are ONE line each (detail on hover) */}
      <div className="mb-1 flex items-center gap-2 border-b pb-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span>
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground"><span className="truncate">{tx(pile.title)}</span></h2>
        <span className={cn("text-2xl font-semibold leading-none tabular-nums", "text-foreground")}>{pile.total}</span>
      </div>
      <ul className="flex flex-1 flex-col space-y-0">
        {pile.stages.map((st) => (
          <li key={st.key}>
            <Link href={focusHref(st.href, st.key)} title={st.detail || undefined} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-muted/60">
              <span className={cn("size-1.5 shrink-0 rounded-full", st.red ? "bg-danger" : "bg-muted-foreground/40")} />
              <span className="min-w-0 flex-1 truncate text-sm">{st.title}{st.urgent > 0 && <span className="text-muted-foreground"> · {tx("ด่วน {0}", [st.urgent])}</span>}</span>
              <span className={cn("shrink-0 text-sm font-medium tabular-nums", st.red ? "text-danger" : "text-foreground")}>{st.count}</span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
        {children}
        {/* owner 2026-11-27: suggestions — apart from the work, lighter, no number in the pile's total, not on a phone */}
        {pile.hints.map((h, i) => (
          <li key={h.key} className={cn("hidden sm:block", i === 0 && pile.stages.length > 0 && "mt-1 border-t pt-1")}>
            <Link href={focusHref(h.href, h.key)} title={h.detail || undefined} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-muted-foreground hover:bg-muted/60">
              <LightbulbIcon className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm">{h.title}</span>
              <span className="shrink-0 text-sm tabular-nums">{h.count}</span>
            </Link>
          </li>
        ))}
        {/* finished rows folded into ONE faded line at the bottom (names on hover); not on a phone */}
        {pile.done.length > 0 && (
          <li className="mt-auto hidden pt-1 sm:block">
            <span title={pile.done.map((x) => x.title).join(" · ")} className={cn("mt-0.5 flex items-center gap-1.5 px-1.5 pt-1 text-xs text-muted-foreground/70", (pile.stages.length > 0 || pile.hints.length > 0) && "border-t")}>
              <CheckIcon className="size-3.5 shrink-0" /> {tx("เรียบร้อย {0}", [pile.done.length])}
            </span>
          </li>
        )}
      </ul>
    </section>
  )
}
