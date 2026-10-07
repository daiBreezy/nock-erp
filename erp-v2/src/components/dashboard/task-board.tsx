"use client"

import Link from "next/link"
import { BanknoteIcon, CheckIcon, ChevronRightIcon, ClipboardCheckIcon, GraduationCapIcon, RefreshCwIcon, UserSearchIcon, UsersIcon, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { focusHref, TOPIC_COLUMNS, TOPIC_GROUP_LABEL, type Topic, type TopicGroup } from "@/domain/rules/today"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const GROUP_ICON: Record<TopicGroup, LucideIcon> = {
  today: ClipboardCheckIcon, customers: RefreshCwIcon, money: BanknoteIcon, students: UsersIcon, teaching: GraduationCapIcon, sales: UserSearchIcon,
}

/**
 * "ต้องจัดการ" (owner 2026-10-07): every kind of work as one row with its count — งานประจำวัน, รอต่อคอร์ส, ลีดใหม่
 * and everything Need Attention flags — in two columns. A row opens the page holding that list with ?focus=, which
 * highlights it there. Topics with nothing to do stay listed (ticked) so you can see they were checked.
 */
export function TaskBoard({ topics }: { topics: Topic[] }) {
  const groups = TOPIC_COLUMNS.flat().filter((g) => topics.some((t) => t.group === g))
  // two columns: the planned split when both sides have something, else balance by rows
  let cols = TOPIC_COLUMNS.map((c) => c.filter((g) => groups.includes(g)))
  if (cols.some((c) => !c.length)) {
    const size = (g: TopicGroup) => topics.filter((t) => t.group === g).length + 1
    const total = groups.reduce((n, g) => n + size(g), 0)
    const left: TopicGroup[] = []
    let n = 0
    for (const g of groups) { if (n < total / 2 || !left.length) { left.push(g); n += size(g) } }
    cols = [left, groups.filter((g) => !left.includes(g))]
  }
  const open = topics.filter((t) => t.count > 0)
  const total = open.reduce((n, t) => n + t.count, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("ต้องจัดการ")}</CardTitle>
        <CardDescription>{open.length ? tx("{0} งาน ใน {1} หัวข้อ · กดหัวข้อเพื่อไปที่รายการนั้น", [total, open.length]) : tx("ไม่มีงานค้าง")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {cols.map((col, i) => (
          <div key={i} className={cn("space-y-5", i === 1 && "md:border-l md:pl-8")}>
            {col.map((g) => <Group key={g} group={g} topics={topics.filter((t) => t.group === g)} />)}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Group({ group, topics }: { group: TopicGroup; topics: Topic[] }) {
  const Icon = GROUP_ICON[group]
  const sum = topics.reduce((n, t) => n + t.count, 0)
  // work first (biggest on top), done topics after
  const sorted = [...topics].sort((a, b) => (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0) || (b.urgent ?? 0) - (a.urgent ?? 0) || b.count - a.count)
  return (
    <section className="space-y-1">
      <h3 className="flex items-center gap-2 px-2 pb-1 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {tx(TOPIC_GROUP_LABEL[group])}
        {sum > 0 && <span className="ml-auto tabular-nums">{sum}</span>}
      </h3>
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
                <span className={cn("min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums", group === "today" || group === "customers" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200")}>{t.count}</span>
              </span>
            )}
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        )
      })}
    </section>
  )
}
