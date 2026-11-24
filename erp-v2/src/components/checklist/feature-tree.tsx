"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRightIcon, ChevronRightIcon, MinusIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { ShowChip } from "@/components/app/page-layout"
import { Button } from "@/components/ui/button"
import { FEATURE_GROUPS, FEATURE_LISTS, featureCount, flagsBelow, hasFlag, holdOf, pendingOf, type FeatureNode } from "@/data/features"
import { trFeature } from "@/data/features-en"
import { tx, useUiLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type Mode = "default" | "all" | "none"

/** Pending / Hold pills: a node's own status in full, and — on a row that is folded — how many sit inside it */
function Flags({ own, below, small }: { own?: FeatureNode; below?: { pending: number; hold: number }; small?: boolean }) {
  return (
    <>
      {own?.pending && <Pill tone="amber">Pending</Pill>}
      {own?.hold && <Pill tone="blue">Hold</Pill>}
      {!!below?.pending && <span className={cn("rounded-full bg-warning-soft px-1.5 text-warning-ink tabular-nums", small ? "text-2xs" : "text-xs font-medium")} title={tx("ข้างในมี Pending")}>Pending {below.pending}</span>}
      {!!below?.hold && <span className={cn("rounded-full bg-info-soft px-1.5 text-info-ink tabular-nums", small ? "text-2xs" : "text-xs font-medium")} title={tx("ข้างในมี Hold")}>Hold {below.hold}</span>}
    </>
  )
}

/** one node of the tree: a row you can open to read how it works and see its sub-features */
function NodeView({ n, depth, mode, only }: { n: FeatureNode; depth: number; mode: Mode; only: boolean }) {
  const lang = useUiLang((s) => s.lang)
  if (only && !hasFlag(n)) return null
  const body = !!(n.how || n.c?.length)
  const head = (
    <>
      <span className={cn("min-w-0 text-sm", depth === 0 && "font-medium")}>{trFeature(n.t, lang)}</span>
      <Flags own={n} below={flagsBelow(n)} small />
      {n.href && <Link href={n.href} onClick={(e) => e.stopPropagation()} aria-label={tx("ไปหน้านี้")} className="text-muted-foreground hover:text-primary"><ArrowUpRightIcon className="size-3.5" /></Link>}
    </>
  )
  if (!body) {
    return <li className="flex items-center gap-2 py-1 pl-6">{<MinusIcon className="size-3 shrink-0 text-muted-foreground/60" />}{head}</li>
  }
  const open = mode === "all" || (mode === "default" && depth === 0) || (only && hasFlag(n))
  return (
    <li>
      <details className="group" open={open}>
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 hover:bg-muted/50">
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          {head}
        </summary>
        <div className="ml-2 border-l pl-4">
          {n.how && <p className="py-1 text-xs leading-relaxed text-muted-foreground">{trFeature(n.how, lang)}</p>}
          {n.c && <ul>{n.c.map((c) => <NodeView key={c.t} n={c} depth={depth + 1} mode={mode} only={only} />)}</ul>}
        </div>
      </details>
    </li>
  )
}

/**
 * Feature tree (owner 2026-11-24): every List of the ERP, its features as a tree you can expand, how each one works, and which
 * parts are Pending. The content is src/data/features.ts. A list that is not written yet is greyed out.
 */
export function FeatureTree() {
  const lang = useUiLang((s) => s.lang)
  const [mode, setMode] = useState<Mode>("default")
  const [ver, setVer] = useState(0)
  const [only, setOnly] = useState(false)
  const pick = (m: Mode) => { setMode(m); setVer((v) => v + 1) }
  const written = FEATURE_LISTS.filter((l) => l.tree)
  const drafts = FEATURE_LISTS.filter((l) => l.draft).length
  const pending = FEATURE_LISTS.reduce((a, l) => a + pendingOf(l), 0)
  const hold = FEATURE_LISTS.reduce((a, l) => a + holdOf(l), 0)
  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label={tx("สารบัญ")} className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
        {FEATURE_GROUPS.map((g) => (
          <div key={g} className="mb-2">
            <p className="px-3 py-1 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">{tx(g)}</p>
            <ul>
              {FEATURE_LISTS.filter((l) => l.group === g).map((l) => (
                <li key={l.id}>
                  <a href={`#f-${l.id}`} className={cn("flex items-center gap-2 rounded-xl px-3 py-1 text-sm hover:bg-muted", !l.tree && "text-muted-foreground/70")}>
                    <span className="min-w-0 flex-1 truncate">{trFeature(l.label, lang)}</span>
                    {pendingOf(l) > 0 && <span className="rounded-full bg-warning-soft px-1.5 text-xs font-medium text-warning-ink tabular-nums" title="Pending">{pendingOf(l)}</span>}
                    {holdOf(l) > 0 && <span className="rounded-full bg-info-soft px-1.5 text-xs font-medium text-info-ink tabular-nums" title="Hold">{holdOf(l)}</span>}
                    {pendingOf(l) + holdOf(l) === 0 && l.tree && <span className="text-xs text-muted-foreground">✓</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">{FEATURE_LISTS.length} List · {tx("เขียนละเอียด")} {written.length - drafts} · {tx("ตรวจกับโค้ดแล้ว")} {drafts} · Pending {pending} · Hold {hold}</p>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <ShowChip label="เฉพาะ Pending / Hold" on={only} onChange={setOnly} />
            <Button variant="outline" size="sm" onClick={() => pick("all")}>{tx("กางทั้งหมด")}</Button>
            <Button variant="outline" size="sm" onClick={() => pick("none")}>{tx("พับทั้งหมด")}</Button>
          </span>
        </div>
        <div key={ver} className="space-y-3">
          {FEATURE_GROUPS.map((g) => (
            <section key={g} className="space-y-2">
              <h2 className="pt-2 text-sm font-semibold text-muted-foreground">{tx(g)}</h2>
              {FEATURE_LISTS.filter((l) => l.group === g).map((l) => {
                if (only && pendingOf(l) + holdOf(l) === 0) return null
                if (!l.tree) {
                  return (
                    <div key={l.id} id={`f-${l.id}`} className="flex items-center gap-2 rounded-3xl bg-card/60 px-4 py-3 text-sm text-muted-foreground ring-1 ring-foreground/5">
                      <span className="flex-1">{trFeature(l.label, lang)}</span><span className="text-xs">{tx("ยังไม่ได้เขียน")}</span>
                    </div>
                  )
                }
                return (
                  <details key={l.id} id={`f-${l.id}`} open={mode !== "none"} className="group scroll-mt-4 rounded-3xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/5">
                    <summary className="flex cursor-pointer list-none items-center gap-2">
                      <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                      <span className="text-base font-semibold">{trFeature(l.label, lang)}</span>
                      <span className="text-xs text-muted-foreground">{featureCount(l)} {tx("ข้อ")}</span>
                      {pendingOf(l) > 0 && <Pill tone="amber">Pending {pendingOf(l)}</Pill>}
                      {holdOf(l) > 0 && <Pill tone="blue">Hold {holdOf(l)}</Pill>}
                      {l.draft && <Pill tone="gray" title={tx("ชื่อฟีเจอร์ทุกข้อถูกตรวจกับโค้ดแล้ว — คำอธิบายยาวยังไม่ได้อ่านเทียบทีละบรรทัด")}>{tx("ตรวจกับโค้ดแล้ว")}</Pill>}
                      {l.href && <Link href={l.href} onClick={(e) => e.stopPropagation()} className="ml-auto inline-flex items-center gap-0.5 font-mono text-xs text-primary hover:underline">{l.href}<ArrowUpRightIcon className="size-3" /></Link>}
                    </summary>
                    {l.purpose && <p className="mt-1 pl-6 text-xs text-muted-foreground">{trFeature(l.purpose, lang)}</p>}
                    <ul className="mt-2">{l.tree.map((n) => <NodeView key={n.t} n={n} depth={0} mode={mode} only={only} />)}</ul>
                  </details>
                )
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
