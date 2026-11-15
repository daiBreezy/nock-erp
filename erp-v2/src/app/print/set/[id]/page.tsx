"use client"

import { useParams } from "next/navigation"
import { PaperStack, setPagesOf } from "@/components/billing/document-set"
import { useStore } from "@/store/store"

/** One accounting document set: Invoice → pay slip(s) → Receipt (owner 2026-11-15) */
export default function SetPrint() {
  const { id } = useParams<{ id: string }>()
  const inv = useStore((s) => s.invoices.find((x) => x.id === id))
  if (!inv || !inv.number) return <p className="p-10 text-center text-sm text-muted-foreground">ไม่พบใบแจ้งหนี้</p>
  const pages = setPagesOf(inv)
  const slips = inv.payments.filter((p) => p.slip).length
  return <PaperStack pages={pages} title={[inv.number, inv.receiptNumber].filter(Boolean).join(" + ")}
    summary={`${pages.length} หน้า · ใบแจ้งหนี้${slips ? ` → สลิป ${slips}` : " (ยังไม่มีสลิป)"}${inv.receiptNumber ? " → ใบเสร็จ" : " (ยังไม่มีใบเสร็จ)"}`} />
}
