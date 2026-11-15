"use client"
/* eslint-disable no-restricted-syntax -- ds-exception: printed paper — fixed black/white, never themed */

import { useEffect, useSyncExternalStore } from "react"
import { PrinterIcon } from "lucide-react"
import { PrintDocument } from "@/components/billing/print-document"
import { Button } from "@/components/ui/button"
import type { Invoice } from "@/domain/types"

/**
 * Accounting document set (owner 2026-11-15): per paid invoice — Invoice → the parent's pay slip(s) → Receipt, one A4
 * page each. Shared by /print/set/[id] (one set) and /print/set/batch (many sets in ONE PDF).
 */
export function setPagesOf(inv: Invoice): { key: string; node: React.ReactNode }[] {
  const slips = inv.payments.map((p) => p.slip).filter((x): x is string => !!x)
  return [
    { key: `${inv.id}-inv`, node: <PrintDocument kind="invoice" id={inv.id} bare /> },
    ...slips.map((src, i) => ({
      key: `${inv.id}-slip${i}`,
      // eslint-disable-next-line @next/next/no-img-element -- data URL slip, printed as-is
      node: <div className="flex h-[297mm] flex-col items-center gap-3 p-[15mm]"><p className="self-start text-sm font-semibold">สลิปโอนเงิน · Pay slip {slips.length > 1 ? `${i + 1}/${slips.length}` : ""} · {inv.number}</p><img src={src} alt="" className="min-h-0 max-w-full flex-1 object-contain" /></div>,
    })),
    ...(inv.receiptNumber ? [{ key: `${inv.id}-rc`, node: <PrintDocument kind="receipt" id={inv.id} bare /> }] : []),
  ]
}

/** `#download` = opened by a Download button: the browser's "Save as PDF" dialog comes up by itself once the pages are drawn */
export function useAutoPrint() {
  useEffect(() => {
    if (location.hash !== "#download") return
    const t = setTimeout(() => window.print(), 900)
    return () => clearTimeout(t)
  }, [])
}

export function PaperStack({ pages, title, summary }: { pages: { key: string; node: React.ReactNode }[]; title: string; summary: string }) {
  const embed = useSyncExternalStore(() => () => {}, () => location.hash === "#embed", () => false)
  useAutoPrint()
  return (
    <div className={embed ? "bg-neutral-200 py-4 print:bg-white print:py-0" : "min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0"}>
      <title>{title}</title>
      <div className={embed ? "hidden" : "mx-auto mb-4 flex max-w-[210mm] items-center gap-3 px-2 print:hidden"}>
        <span className="text-sm text-neutral-600">{summary}</span>
        <Button onClick={() => window.print()} className="ml-auto gap-2 bg-neutral-900 px-4 text-white hover:bg-neutral-800"><PrinterIcon className="size-4" /> พิมพ์ / บันทึก PDF</Button>
      </div>
      {pages.map((p, i) => (
        <div key={p.key} className={`mx-auto w-[210mm] bg-white shadow print:shadow-none ${i < pages.length - 1 ? "mb-8 break-after-page print:mb-0" : ""}`}>{p.node}</div>
      ))}
    </div>
  )
}
