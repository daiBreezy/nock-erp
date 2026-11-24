"use client"

import Link from "next/link"
import { ArrowUpRightIcon, ChevronRightIcon, MapIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { InfoTip } from "@/components/app/info-tip"
import { Page, PageHeader, Segmented } from "@/components/app/page-layout"
import { FeatureTree } from "@/components/checklist/feature-tree"
import { useQueryState } from "@/lib/hooks"
import { Button } from "@/components/ui/button"
import { CHECK_AREAS, CHECKLIST, type CheckItem, type CheckStatus } from "@/data/checklist"
import { fmtDate } from "@/domain/dates"
import { trFeature } from "@/data/features-en"
import { tx, useUiLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const STATUS: Record<Exclude<CheckStatus, "done">, { label: string; tone: "amber" | "blue" | "gray" }> = {
  open: { label: "ค้าง", tone: "amber" }, decide: { label: "รอตัดสินใจ", tone: "blue" }, todo: { label: "ควรทำ", tone: "gray" },
}
const ORDER: Record<string, number> = { open: 0, decide: 1, todo: 2 }

function Row({ item }: { item: CheckItem }) {
  const lang = useUiLang((s) => s.lang)
  const st = item.status === "done" ? null : STATUS[item.status]
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 w-24 shrink-0">{st ? <Pill tone={st.tone}>{tx(st.label)}</Pill> : <Pill tone="green">{tx("เสร็จ")}</Pill>}</span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", item.status === "done" && "text-muted-foreground")}>{trFeature(item.title, lang)}</p>
        {item.waiting && <p className="mt-0.5 text-xs text-muted-foreground">{tx("รอ")}: {trFeature(item.waiting, lang)}</p>}
      </div>
      {item.how && <InfoTip text={trFeature(item.how, lang)} className="mt-0.5" />}
      {item.href && (
        <Button size="xs" variant="outline" className="shrink-0" nativeButton={false} render={<Link href={item.href} />}>{tx("ไปหน้านี้")}<ArrowUpRightIcon /></Button>
      )}
    </li>
  )
}

/**
 * Checklist (owner 2026-11-24): what is NOT finished, grouped by the part of the ERP — and what is done, folded away.
 * The content is src/data/checklist.ts; Claude updates it at the end of every piece of work.
 */
function TodoView() {
  const lang = useUiLang((s) => s.lang)
  const open = CHECKLIST.filter((i) => i.status !== "done")
  const done = CHECKLIST.filter((i) => i.status === "done")
  const areas = CHECK_AREAS.filter((a) => CHECKLIST.some((i) => i.area === a))
  const rounds = [...new Set(done.map((i) => i.round ?? ""))]
  return (
    <>
      <p className="mt-3 text-sm text-muted-foreground">{`${tx("ยังไม่เสร็จ")} ${open.length} ${tx("ข้อ")} · ${tx("เสร็จแล้ว")} ${done.length} ${tx("ข้อ")}`}</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* the table of contents: each part of the ERP with how many are still open — click to jump */}
        <nav aria-label={tx("สารบัญ")} className="lg:sticky lg:top-4 lg:self-start">
          <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
            {areas.map((a, i) => {
              const n = open.filter((x) => x.area === a).length
              return (
                <li key={a}>
                  <a href={`#area-${i}`} className={cn("flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm hover:bg-muted", n === 0 && "text-muted-foreground")}>
                    <span className="min-w-0 flex-1 truncate">{tx(a)}</span>
                    {n > 0 ? <span className="rounded-full bg-warning-soft px-1.5 text-xs font-medium text-warning-ink tabular-nums">{n}</span> : <span className="text-xs">✓</span>}
                  </a>
                </li>
              )
            })}
            <li><a href="#done" className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"><span className="flex-1">{tx("เสร็จแล้ว")}</span><span className="text-xs tabular-nums">{done.length}</span></a></li>
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          {areas.map((a, i) => {
            const items = open.filter((x) => x.area === a).sort((x, y) => ORDER[x.status] - ORDER[y.status])
            if (!items.length) return null
            return (
              <section key={a} id={`area-${i}`} className="scroll-mt-4 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
                <h2 className="text-base font-semibold">{tx(a)} <span className="text-xs font-normal text-muted-foreground">({items.length})</span></h2>
                <ul className="mt-1 divide-y">{items.map((it) => <Row key={it.id} item={it} />)}</ul>
              </section>
            )
          })}
          {open.length === 0 && <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-sm ring-1 ring-foreground/5">{tx("ไม่มีอะไรค้างแล้ว 🎉")}</p>}
          <section id="done" className="scroll-mt-4 space-y-2">
            <h2 className="text-base font-semibold">{tx("เสร็จแล้ว")} <span className="text-xs font-normal text-muted-foreground">({done.length})</span></h2>
            {rounds.map((r) => {
              const items = done.filter((x) => (x.round ?? "") === r)
              return (
                <details key={r} className="group rounded-3xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/5">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                    <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    {r ? trFeature(r, lang) : tx("อื่นๆ")}
                    <span className="text-xs font-normal text-muted-foreground">{fmtDate(items[0].date, { year: true })} · {items.length} {tx("ข้อ")}</span>
                  </summary>
                  <ul className="mt-1 divide-y">{items.map((it) => <Row key={it.id} item={it} />)}</ul>
                </details>
              )
            })}
          </section>
        </div>
      </div>
    </>
  )
}

/** Checklist (owner 2026-11-24): two views — what is still open (src/data/checklist.ts) and the tree of every feature (src/data/features.ts) */
export default function ChecklistPage() {
  const [view, setView] = useQueryState<"todo" | "features">("view", "todo")
  return (
    <Page>
      <PageHeader title="Checklist" actions={<Button variant="outline" nativeButton={false} render={<Link href="/architecture" />}><MapIcon /> {tx("แผนที่ ERP")}</Button>} />
      <div className="mt-3">
        <Segmented value={view} onChange={setView} options={[{ value: "todo", label: tx("งานค้าง") }, { value: "features", label: tx("ฟีเจอร์ทั้งหมด") }]} label={tx("มุมมอง")} />
      </div>
      {view === "todo" ? <TodoView /> : <div className="mt-4"><FeatureTree /></div>}
    </Page>
  )
}
