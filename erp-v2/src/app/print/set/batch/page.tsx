"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { PaperStack, setPagesOf } from "@/components/billing/document-set"
import { useStore } from "@/store/store"

/** Many accounting document sets in ONE PDF — `?ids=a,b,c` in the order given (owner 2026-11-15) */
export default function Page() {
  return <Suspense><Batch /></Suspense>
}

function Batch() {
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean)
  const invoices = useStore((s) => s.invoices)
  const sets = ids.map((id) => invoices.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x?.number)
  if (!sets.length) return <p className="p-10 text-center text-sm text-muted-foreground">ไม่พบชุดเอกสาร</p>
  const pages = sets.flatMap(setPagesOf)
  return <PaperStack pages={pages} title={`ชุดเอกสารบัญชี ${sets.length} ชุด`} summary={`${sets.length} ชุด · ${pages.length} หน้า — ใบแจ้งหนี้ → สลิป → ใบเสร็จ ต่อกันทีละใบ`} />
}
