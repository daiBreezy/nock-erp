"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Page, PageHeader, SearchBox } from "@/components/app/page-layout"
import { ARCH_GROUPS, ARCH_LAYERS, ARCH_PAGES, archStats, type ArchPage } from "@/data/architecture"

const STATUS: Record<ArchPage["status"], { label: string; tone: "green" | "gray" | "blue" | "amber" }> = {
  live: { label: "ใช้งานได้", tone: "green" }, soon: { label: "Coming soon", tone: "gray" }, parent: { label: "ฝั่ง LINE", tone: "blue" }, tool: { label: "เครื่องมือ", tone: "amber" },
}

/** ERP Architecture (owner 2026-11-21): every page of the ERP and the features it carries — the content lives in src/data/architecture.ts */
export default function ArchitecturePage() {
  const [q, setQ] = useState("")
  const needle = q.trim().toLowerCase()
  const hit = (p: ArchPage) => !needle || `${p.label} ${p.href} ${p.purpose} ${p.features.flatMap((f) => [f.title, ...f.items]).join(" ")} ${(p.panels ?? []).join(" ")}`.toLowerCase().includes(needle)
  const st = archStats()
  return (
    <Page>
      <PageHeader title="ERP Architecture" description={`${st.pages} หน้า · ${st.features} ฟีเจอร์ — แต่ละหน้ามีอะไรบ้าง (ข้อมูลจาก src/data/architecture.ts)`} />
      <SearchBox value={q} onChange={setQ} placeholder="ค้นหาหน้า / ฟีเจอร์" />
      {!needle && (
        <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ARCH_LAYERS.map((l) => (
            <div key={l.name} className="rounded-2xl bg-card p-3 shadow-sm ring-1 ring-foreground/5">
              <p className="text-sm font-semibold">{l.name} <span className="ml-1 font-mono text-2xs font-normal text-muted-foreground">{l.where}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{l.what}</p>
            </div>
          ))}
        </section>
      )}
      {ARCH_GROUPS.map((g) => {
        const pages = ARCH_PAGES.filter((p) => p.group === g && hit(p))
        if (!pages.length) return null
        return (
          <section key={g} className="mt-6 space-y-3">
            <h2 className="text-base font-semibold">{g} <span className="text-xs font-normal text-muted-foreground">({pages.length})</span></h2>
            {pages.map((p) => (
              <article key={p.href} className="space-y-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
                <header className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{p.label}</h3>
                  <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
                  <Link href={p.href} className="inline-flex items-center gap-0.5 font-mono text-xs text-primary hover:underline">{p.href}<ArrowUpRightIcon className="size-3" /></Link>
                </header>
                <p className="text-sm">{p.purpose}</p>
                <p className="text-xs text-muted-foreground">ใครเห็น: {p.who}</p>
                <div className="grid gap-3 lg:grid-cols-2">
                  {p.features.map((f) => (
                    <div key={f.title}>
                      <p className="text-xs font-semibold">{f.title}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">{f.items.map((i) => <li key={i}>{i}</li>)}</ul>
                    </div>
                  ))}
                </div>
                {(p.panels || p.reads || p.rules) && (
                  <dl className="grid gap-1 border-t pt-2 text-xs sm:grid-cols-[6rem_1fr]">
                    {p.panels && <><dt className="text-muted-foreground">แผง/หน้าต่าง</dt><dd>{p.panels.join(" · ")}</dd></>}
                    {p.reads && <><dt className="text-muted-foreground">ข้อมูลที่ใช้</dt><dd>{p.reads.join(" · ")}</dd></>}
                    {p.rules && <><dt className="text-muted-foreground">กฎธุรกิจ</dt><dd className="font-mono">{p.rules.join(" · ")}</dd></>}
                  </dl>
                )}
              </article>
            ))}
          </section>
        )
      })}
    </Page>
  )
}
