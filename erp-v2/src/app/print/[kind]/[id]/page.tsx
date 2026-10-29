"use client"

import { useParams } from "next/navigation"
import { PrinterIcon } from "lucide-react"
import { fmtMoney } from "@/domain/dates"
import { invoiceTotals, invoicesOnReceipt } from "@/domain/rules/billing"
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
  const baseCustomer = stu ? Doc.customerOf(stu, fam) : null
  const number = kind === "credit-note" ? cn?.number : kind === "receipt" ? inv?.receiptNumber : inv?.number

  if (!ready || !baseCustomer) return <p className="p-10 text-center text-sm text-muted-foreground">ไม่พบเอกสาร หรือยังออกเอกสารนี้ไม่ได้</p>

  const ctx = { branch, courses: s.courses, classes: s.classes, holidays: s.holidays }
  const totals = invoiceTotals(inv, ctx)
  // one slip for siblings (owner 2026-10-29): a combined receipt lists every invoice on it, each child's lines labelled
  const onReceipt = kind === "receipt" ? invoicesOnReceipt(inv.receiptNumber!, s.invoices).filter((x) => x.branchId === inv.branchId) : []
  const combined = onReceipt.length > 1
  // a combined receipt is the parent's (they paid for every child) unless the family has its own tax name
  const payer = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]
  const customer = combined && !fam?.taxInfo?.customerName && payer?.name ? { ...baseCustomer, name: payer.name } : baseCustomer
  // owner Row 36 (2026-10-28): Liclass paper prints in Japanese, NockAcademy in Thai — English stays the 2nd line
  const lang = Doc.docLang(branch.brand)
  const L = Doc.DOC_LABELS[lang]
  const nick = (studentId: string) => s.students.find((x) => x.id === studentId)?.nickname ?? ""
  const items = cn ? Doc.creditNoteItems(cn, branch.brand)
    : combined ? onReceipt.flatMap((x) => Doc.invoiceItems(x, invoiceTotals(x, ctx), branch).map((it) => ({ ...it, description: `${nick(x.studentId)} · ${it.description}` })))
    : Doc.invoiceItems(inv, totals, branch)
  const total = cn ? creditNoteTotal(cn) : combined ? onReceipt.reduce((a, x) => a + invoiceTotals(x, ctx).total, 0) : totals.total
  const { date: invDate, dueBy } = Doc.invoiceDates(inv)
  const date = kind === "receipt" ? (combined ? onReceipt.map((x) => Doc.receiptDate(x) ?? "").sort().at(-1) || null : Doc.receiptDate(inv)) : kind === "credit-note" ? cn!.createdAt.slice(0, 10) : invDate
  const signer = Doc.preparedBy(cn ?? inv, s.staff)
  const [, en] = TITLE[kind]
  const titlePrimary = kind === "credit-note" ? L.creditNote : L[kind]
  const memo = [Doc.invoiceMemo(inv, { brandMemo: s.system.invoiceMemos[branch.brand], branch, courses: s.courses, classes: s.classes }).memo, kind === "credit-note" ? `${L.invRef} ${inv.number} · ${[...cn!.reasons, cn!.remark].filter(Boolean).join(", ")}` : combined ? `${L.invRef} ${onReceipt.map((x) => x.number).join(", ")}` : inv.noteToParent].filter(Boolean).join("\n")
  const rows: (typeof items[number] | null)[] = [...items, ...Array.from({ length: Math.max(0, 8 - items.length) }, () => null)]

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
            <p>{L.taxId} / Tax ID Number {company.taxId}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{titlePrimary}</p>
            <p className="text-sm font-semibold tracking-widest">{en}</p>
          </div>
        </header>

        <section className="mt-3 grid grid-cols-[1fr_auto] gap-6">
          <table className="[&_td]:py-0.5 [&_td]:align-top">
            <tbody>
              <tr><td className="w-40">{L.customerName}<br /><span className="text-neutral-500">Customer Name</span></td><td className="font-medium">{customer.name}</td></tr>
              <tr><td>{L.address}<br /><span className="text-neutral-500">Address</span></td><td>{customer.address || "—"}</td></tr>
              <tr><td>{L.taxId}<br /><span className="text-neutral-500">Tax ID Number</span></td><td>{customer.taxId || "—"}</td></tr>
            </tbody>
          </table>
          <table className="self-start [&_td]:px-2 [&_td]:py-0.5">
            <tbody>
              <tr><td className="font-semibold">NO.</td><td className="font-mono">{number}</td></tr>
              <tr><td className="font-semibold">DATE</td><td>{d(date)}</td></tr>
              {kind === "credit-note" && <tr><td className="font-semibold">REF.</td><td className="font-mono">{inv.number}</td></tr>}
              {combined && <tr><td className="font-semibold align-top">REF.</td><td className="font-mono">{onReceipt.map((x) => <div key={x.id}>{x.number}</div>)}</td></tr>}
            </tbody>
          </table>
        </section>

        <table className="mt-3 w-full border border-neutral-800 [&_td]:border-x [&_td]:border-neutral-800 [&_td]:px-2 [&_th]:border [&_th]:border-neutral-800 [&_th]:px-2 [&_th]:py-1">
          <thead className="bg-neutral-100 text-center">
            <tr><th className="w-12">{L.item}<br />Item</th><th>{L.description}<br />Description</th><th className="w-14">{L.qty}<br />Q&apos;ty</th><th className="w-24">{L.unitPrice}<br />Unit Price</th><th className="w-28">{L.amount}<br />Amount (Baht)</th></tr>
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
                <b>{L.payChannel}:</b>{"\n"}{L.bank}{branch.bankAccount.bank} {branch.bankAccount.branchName}{"\n"}{L.accountNo} {branch.bankAccount.number}{"\n"}{L.accountName} {branch.bankAccount.name}
              </p>
            )}
            {kind === "credit-note" && cn!.refund && <p><b>{L.refund}:</b> {d(cn!.refund.date)} · {cn!.refund.fromAccount} · {cn!.refund.reference}</p>}
            <p className="whitespace-pre-line"><b>Memo :</b> {memo}</p>
          </div>
          <table className="w-72 self-start [&_td]:px-2 [&_td]:py-0.5">
            <tbody>
              <tr><td>{L.subTotal} / Sub Total</td><td className="text-right tabular-nums">{money(total)}</td></tr>
              <tr><td>{L.vat} / VAT 7%</td><td className="text-right tabular-nums">{money(0)}</td></tr>
              <tr className="border-t-2 border-neutral-800 font-bold"><td>{L.total} / Total</td><td className="text-right tabular-nums">{money(total)}</td></tr>
              {kind === "invoice" && <tr><td>*Total Due By</td><td className="text-right">{d(dueBy)}</td></tr>}
            </tbody>
          </table>
        </section>

        <footer className="mt-10 grid grid-cols-2 gap-10 text-center">
          <div>
            <p className="border-b border-dotted border-neutral-500 pb-1">{signer}</p>
            <p>{kind === "receipt" ? `${L.payeeBy} / PAYEE BY` : `${L.preparedBy} / PREPARED BY`}</p>
          </div>
          <div>
            <p className="border-b border-dotted border-neutral-500 pb-1">{signer}</p>
            <p>{L.authorized} / AUTHORIZED SIGNATURE</p>
            {kind !== "invoice" && <p className="mt-1">{L.date} / DATE {d(date)}</p>}
          </div>
        </footer>
        <p className="mt-6 text-right text-[10px] text-neutral-400">{fmtMoney(total)} · {number}</p>
      </article>
    </div>
  )
}
