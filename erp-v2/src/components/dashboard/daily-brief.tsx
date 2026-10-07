"use client"

import Link from "next/link"
import { ArrowRightIcon, ClockIcon, LightbulbIcon, SparklesIcon, TrendingDownIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyBrief } from "@/domain/rules/today"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const WHEN = {
  now: { label: "ทำเลย", tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", dot: "bg-red-500" },
  today: { label: "วันนี้", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200", dot: "bg-amber-500" },
  soon: { label: "สัปดาห์นี้", tone: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50" },
} as const

/**
 * "AI สรุปงานวันนี้" (owner 2026-10-07): what to do first, in order, and why — from `dailyBrief()` (rule-based in
 * the prototype; Dev can swap in an LLM that writes the same shape). Each step links to its list (?focus=).
 */
export function DailyBriefCard({ brief, className }: { brief: DailyBrief; className?: string }) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><SparklesIcon className="size-4" /></span>
          {tx("AI สรุปงานวันนี้")}
        </CardTitle>
        <CardDescription className="pt-1 text-sm text-foreground/80">{brief.headline}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {brief.steps.length === 0 ? (
          <p className="flex flex-1 items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><SparklesIcon className="size-4 text-emerald-600" /> {tx("ไม่มีงานค้าง — วันนี้เคลียร์หมดแล้ว")}</p>
        ) : (
          <ol className="space-y-1">
            {brief.steps.map((s, i) => {
              const w = WHEN[s.when]
              return (
                <li key={s.key}>
                  <Link href={s.href} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{s.title}</span>
                        <span className="shrink-0 rounded-full bg-foreground/5 px-2 text-xs font-semibold tabular-nums">{s.count}</span>
                      </span>
                      {s.why && <span className="block truncate text-xs text-muted-foreground">{s.why}</span>}
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", w.tone)}>{tx(w.label)}</span>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
        {(brief.notes.length > 0 || brief.more > 0) && (
          <div className="mt-auto space-y-1.5 rounded-2xl bg-muted/50 p-3 text-sm">
            {brief.notes.map((n, i) => {
              const Icon = n.href ? TrendingDownIcon : i === 0 ? ClockIcon : LightbulbIcon
              const body = <><Icon className={cn("mt-0.5 size-4 shrink-0", n.href ? "text-red-600" : "text-violet-600")} /><span className="min-w-0 flex-1">{n.text}</span></>
              return n.href
                ? <Link key={i} href={n.href} className="flex gap-2 hover:underline">{body}</Link>
                : <p key={i} className="flex gap-2">{body}</p>
            })}
            {brief.more > 0 && <p className="flex gap-2 text-muted-foreground"><LightbulbIcon className="mt-0.5 size-4 shrink-0 text-violet-600" />{tx("อีก {0} หัวข้อ ดูได้ใน \"ต้องจัดการ\" ด้านล่าง", [brief.more])}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
