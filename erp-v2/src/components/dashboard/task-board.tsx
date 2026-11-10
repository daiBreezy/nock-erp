"use client"

import Link from "next/link"
import { CheckIcon, ChevronRightIcon, ClipboardCheckIcon, UsersIcon, type LucideIcon } from "lucide-react"
import { focusHref, type Topic, type TopicGroup } from "@/domain/rules/today"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// NEGATIVE of clutter (owner 2026-11-10 dashboard round): two FIXED boxes that never move — operational work on the
// left, customer follow-up on the right. Each box keeps its place for every role; a box with nothing shows a tidy
// "เรียบร้อย" empty state instead of disappearing, so the layout is muscle-memory stable.
const LEFT_GROUPS: TopicGroup[] = ["today", "teaching", "money"]
const RIGHT_GROUPS: TopicGroup[] = ["customers", "sales", "students"]

/** "ต้องจัดการ" split into two permanent columns (owner 2026-11-10). */
export function TaskBoard({ topics }: { topics: Topic[] }) {
  return (
    <section className="grid items-stretch gap-4 lg:grid-cols-2">
      <TaskColumn title={tx("ต้องทำวันนี้")} icon={ClipboardCheckIcon} topics={topics.filter((t) => LEFT_GROUPS.includes(t.group))}
        empty={tx("งานประจำวันเคลียร์หมดแล้ว")} />
      <TaskColumn title={tx("ติดตามลูกค้า")} icon={UsersIcon} topics={topics.filter((t) => RIGHT_GROUPS.includes(t.group))}
        empty={tx("ไม่มีลูกค้าที่ต้องติดตามตอนนี้")} />
    </section>
  )
}

/** One fixed box: work rows first (most on top), done topics ticked after; a designed empty state when there is none. */
function TaskColumn({ title, icon: Icon, topics, empty }: { title: string; icon: LucideIcon; topics: Topic[]; empty: string }) {
  const open = topics.filter((t) => t.count > 0)
  const total = open.reduce((n, t) => n + t.count, 0)
  const sorted = [...topics].sort((a, b) => (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0) || (b.urgent ?? 0) - (a.urgent ?? 0) || b.count - a.count)
  return (
    <section className="flex flex-col rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5">
      <h2 className="flex items-center gap-2 px-2 pb-2 text-sm font-semibold">
        <span className={cn("grid size-8 place-items-center rounded-xl", total > 0 ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300")}><Icon className="size-4" /></span>
        {title}
        {total > 0
          ? <span className="ml-auto text-xs font-medium text-muted-foreground tabular-nums">{tx("{0} งาน", [total])}</span>
          : <span className="ml-auto text-xs font-normal text-emerald-700">{tx("เรียบร้อย")}</span>}
      </h2>
      {/* empty state: no topics at all for this box — keep the box, fill it (owner: อย่าโล่ง) */}
      {topics.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-8 text-center">
          <span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckIcon className="size-4.5" /></span>
          <p className="text-sm text-muted-foreground">{empty}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sorted.map((t) => {
            const done = t.count === 0
            return (
              <Link key={t.key} href={focusHref(t.href, t.key)} className={cn("group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60", done && "opacity-55")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.detail}</span>
                </span>
                {done ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckIcon className="size-3.5" /></span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    {!!t.urgent && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">{tx("ด่วน {0}", [t.urgent])}</span>}
                    <span className={cn("min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums", t.group === "today" || t.group === "customers" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200")}>{t.count}</span>
                  </span>
                )}
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
