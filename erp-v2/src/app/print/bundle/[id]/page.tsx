"use client"

import { useSyncExternalStore } from "react"
import { useParams } from "next/navigation"
import { PrinterIcon } from "lucide-react"
import { PrintDocument } from "@/components/billing/print-document"
import { useStore } from "@/store/store"

/** Family set (owner 2026-11-05): every child's invoice in ONE PDF — one page each, each with its own number. */
export default function BundlePrint() {
  const { id } = useParams<{ id: string }>()
  const invoices = useStore((s) => s.invoices)
  const embed = useSyncExternalStore(() => () => {}, () => location.hash === "#embed", () => false)
  const members = invoices.filter((x) => x.bundleId === id && x.status !== "void" && x.number).sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""))
  if (!members.length) return <p className="p-10 text-center text-sm text-muted-foreground">ไม่พบชุดใบแจ้งหนี้</p>
  return (
    <div className={embed ? "bg-neutral-200 py-4 print:bg-white print:py-0" : "min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0"}>
      <title>{members.map((m) => m.number).join(" + ")}</title>
      <div className={embed ? "hidden" : "mx-auto mb-4 flex max-w-[210mm] items-center gap-3 px-2 print:hidden"}>
        <span className="text-sm text-neutral-600">{members.length} ใบ · {members.map((m) => m.number).join(" + ")}</span>
        <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"><PrinterIcon className="size-4" /> พิมพ์ / บันทึก PDF</button>
      </div>
      {members.map((m, i) => (
        // every paper is exactly A4 (210 × 297 mm) with a clear gap to the next one on screen; one page each when printed
        <div key={m.id} className={`mx-auto w-[210mm] bg-white shadow print:shadow-none ${i < members.length - 1 ? "mb-8 break-after-page print:mb-0" : ""}`}>
          <PrintDocument kind="invoice" id={m.id} bare />
        </div>
      ))}
    </div>
  )
}
