"use client"

import { useParams } from "next/navigation"
import { PrinterIcon } from "lucide-react"
import { fmtMoney } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import * as Doc from "@/domain/rules/documents"
import { creditNoteTotal } from "@/domain/rules/refunds"
import { useStore } from "@/store/store"

type Kind = "invoice" | "receipt" | "credit-note"

const TITLE: Record<Kind, [string, string]> = {
  invoice: ["ใบแจ้งหนี้", "INVOICE"],
  receipt: ["ใบเสร็จรับเงิน", "RECEIPT"],
  "credit-note": ["ใบลดหนี้", "CREDIT NOTE"],
}

const d = (s: string | null | undefined) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString("en-GB") : "—")
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * The paper document (owner template "INV + REC.xlsx"): A4, issued by the parent company, same number on the invoice
 * and its receipt. "Print / Save as PDF" uses the browser — the file name defaults to "<number> <customer>".
 */
export default function PrintDocument() {
  const { kind, id } = useParams<{ kind: Kind; id: string }>()
  const s = useStore()
  const cn = kind === "credit-note" ? s.creditNotes.find((x) => x.id === id) : undefined
  const inv = s.invoices.find((x) => x.id === (cn ? cn.invoiceId : id))
  const branch = s.branches.find((b) => b.id === inv?.branchId)
  const stu = s.students.find((x) => x.id === inv?.studentId)
  const fam = s.families.find((f) => f.id === stu?.familyId)
  const company = s.system.company

  const ready = inv && branch && stu && (kind !== "receipt" || inv.receiptNumber) && (kind !== "credit-note" || cn)
  const customer = stu ? Doc.customerOf(stu, fam) : null
  const number = kind === "credit-note" ? cn?.number : kind === "receipt" ? inv?.receiptNumber : inv?.number

  if (!ready || !customer) return <p className="p-10 text-center text-sm text-muted-foreground">ไม่พบเอกสาร หรือยังออกเอกสารนี้ไม่ได้</p>

  const totals = invoiceTotals(inv, { branch, courses: s.courses, classes: s.classes, holidays: s.holidays })
  const items = cn ? Doc.creditNoteItems(cn) : Doc.invoiceItems(inv, totals, branch)
  const total = cn ? creditNoteTotal(cn) : totals.total
  const { date: invDate, dueBy } = Doc.invoiceDates(inv)
  const date = kind === "receipt" ? Doc.receiptDate(inv) : kind === "credit-note" ? cn!.createdAt.slice(0, 10) : invDate
  const signer = Doc.preparedBy(cn ?? inv, s.staff)
  const [th, en] = TITLE[kind]
  const memo = [s.system.invoiceMemos[branch.brand], kind === "credit-note" ? `อ้างอิงใบแจ้งหนี้ ${inv.number} · ${[...cn!.reasons, cn!.remark].filter(Boolean).join(", ")}` : inv.noteToParent].filter(Boolean).join("\n")
  const rows = [...items, ...Array.from({ length: Math.max(0, 8 - items.length) }, () => null)]

  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      {/* React 19 hoists <title> — the saved PDF is named like the template: "<number> <customer>" */}
      <title>{Doc.documentFileName(number!, customer.name)}</title>
      <style>{`@page { size: A4; margin: 12mm } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center gap-3 px-2 print:hidden">
        <span className="text-sm text-neutral-600">{Doc.documentFileName(number!, customer.name)}.pdf</span>
        <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"><PrinterIcon className="size-4" /> พิมพ์ / บันทึก PDF</button>
      </div>

      <article className="mx-auto w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-neutral-900 shadow print:w-auto print:p-0 print:shadow-none">
        <header className="flex items-start gap-4 border-b-2 border-neutral-800 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in a print page */}
          <img src="/brand/logo-full.png" alt="" className="h-12 w-auto" />
          <div className="flex-1">
            <p className="text-sm font-bold">{company.nameTh}</p>
            <p className="font-semibold">{company.nameEn}</p>
            <p>{company.addressTh} ({company.office.split("/")[0].trim()})</p>
            <p>{company.addressEn} ({company.office.split("/").pop()?.trim()})</p>
            <p>เลขประจำตัวผู้เสียภาษี / Tax ID Number {company.taxId}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{th}</p>
            <p className="text-sm font-semibold tracking-widest">{en}</p>
          </div>
        </header>

        <section className="mt-3 grid grid-cols-[1fr_auto] gap-6">
          <table className="[&_td]:py-0.5 [&_td]:align-top">
            <tbody>
              <tr><td className="w-40">ชื่อลูกค้า<br /><span className="text-neutral-500">Customer Name</span></td><td className="font-medium">{customer.name}</td></tr>
              <tr><td>ที่อยู่<br /><span className="text-neutral-500">Address</span></td><td>{customer.address || "—"}</td></tr>
              <tr><td>เลขประจำตัวผู้เสียภาษี<br /><span className="text-neutral-500">Tax ID Number</span></td><td>{customer.taxId || "—"}</td></tr>
            </tbody>
          </table>
          <table className="self-start [&_td]:px-2 [&_td]:py-0.5">
            <tbody>
              <tr><td className="font-semibold">NO.</td><td className="font-mono">{number}</td></tr>
              <tr><td className="font-semibold">DATE</td><td>{d(date)}</td></tr>
              {kind === "credit-note" && <tr><td className="font-semibold">REF.</td><td className="font-mono">{inv.number}</td></tr>}
            </tbody>
          </table>
        </section>

        <table className="mt-3 w-full border border-neutral-800 [&_td]:border-x [&_td]:border-neutral-800 [&_td]:px-2 [&_th]:border [&_th]:border-neutral-800 [&_th]:px-2 [&_th]:py-1">
          <thead className="bg-neutral-100 text-center">
            <tr><th className="w-12">ลำดับ<br />Item</th><th>รายการ<br />Description</th><th className="w-14">จำนวน<br />Q&apos;ty</th><th className="w-24">ราคาต่อหน่วย<br />Unit Price</th><th className="w-28">จำนวนเงิน (บาท)<br />Amount (Baht)</th></tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr key={i} className="h-6 align-top">
                <td className="text-center">{it ? i + 1 : ""}</td>
                <td>{it?.description}</td>
                <td className="text-center">{it ? it.qty : ""}</td>
                <td className="text-right tabular-nums">{it ? money(it.unitPrice) : ""}</td>
                <td className="text-right tabular-nums">{it ? money(it.amount) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-3 grid grid-cols-[1fr_auto] gap-6">
          <div className="space-y-2">
            {kind === "invoice" && branch.bankAccount.number && (
              <p className="whitespace-pre-line">
                <b>ช่องทางชำระเงิน:</b>{"\n"}ธนาคาร{branch.bankAccount.bank} {branch.bankAccount.branchName}{"\n"}เลขที่บัญชี {branch.bankAccount.number}{"\n"}ชื่อบัญชี {branch.bankAccount.name}
              </p>
            )}
            {kind === "credit-note" && cn!.refund && <p><b>โอนคืน:</b> {d(cn!.refund.date)} · จาก {cn!.refund.fromAccount} · {cn!.refund.reference}</p>}
            <p className="whitespace-pre-line"><b>Memo :</b> {memo}</p>
          </div>
          <table className="w-72 self-start [&_td]:px-2 [&_td]:py-0.5">
            <tbody>
              <tr><td>รวมราคา / Sub Total</td><td className="text-right tabular-nums">{money(total)}</td></tr>
              <tr><td>{Doc.VAT_RATE_LABEL}</td><td className="text-right tabular-nums">{money(0)}</td></tr>
              <tr className="border-t-2 border-neutral-800 font-bold"><td>จำนวนเงินรวมทั้งสิ้น / Total</td><td className="text-right tabular-nums">{money(total)}</td></tr>
              {kind === "invoice" && <tr><td>*Total Due By</td><td className="text-right">{d(dueBy)}</td></tr>}
            </tbody>
          </table>
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-10 text-center">
          <div>
            <p className="border-b border-dotted border-neutral-500 pb-1">{signer}</p>
            <p>{kind === "receipt" ? "ผู้รับเงิน / PAYEE BY" : "ผู้จัดทำ / PREPARED BY"}</p>
          </div>
          <div>
            <p className="border-b border-dotted border-neutral-500 pb-1">{signer}</p>
            <p>ผู้มีอำนาจ / AUTHORIZED SIGNATURE</p>
            {kind !== "invoice" && <p className="mt-1">วันที่ / DATE {d(date)}</p>}
          </div>
        </footer>
        <p className="mt-6 text-right text-[10px] text-neutral-400">{fmtMoney(total)} · {number}</p>
      </article>
    </div>
  )
}
