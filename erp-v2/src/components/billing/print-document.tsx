"use client"

import { useSyncExternalStore } from "react"
import { PrinterIcon } from "lucide-react"
import qrcode from "qrcode-generator"
import { fmtMoney } from "@/domain/dates"
import { invoiceTotals, invoicesOnReceipt } from "@/domain/rules/billing"
import * as Doc from "@/domain/rules/documents"
import { creditNoteTotal } from "@/domain/rules/refunds"
import { useStore } from "@/store/store"

export type Kind = "invoice" | "receipt" | "credit-note"

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
export function PrintDocument({ kind, id, bare = false }: { kind: Kind; id: string; /** no toolbar / backdrop — pages of a longer PDF */ bare?: boolean }) {
  const s = useStore()
  // #embed = shown inside the invoice panel (thumbnail / viewer): no toolbar, no grey backdrop
  const hashEmbed = useSyncExternalStore(() => () => {}, () => location.hash === "#embed", () => false)
  const embed = bare || hashEmbed
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
  // the branch's LINE add-friend QR (template: top right of the invoice, green)
  const qrCells = (() => {
    const url = branch.lineOa?.addFriendUrl
    if (!url) return null
    const q = qrcode(0, "M")
    q.addData(url)
    q.make()
    const n = q.getModuleCount()
    return { n, dark: Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as const).filter(([x, y]) => q.isDark(y, x)) }
  })()
  const rows: (typeof items[number] | null)[] = [...items, ...Array.from({ length: 0 }, () => null)]

  return (
    <div className={embed ? "bg-white" : "min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0"}>
      {/* React 19 hoists <title> — the saved PDF is named like the template: "<number> <customer>" */}
      {!bare && <title>{Doc.documentFileName(number!, customer.name)}</title>}
      <style>{`@page { size: A4; margin: 12mm } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className={embed ? "hidden" : "mx-auto mb-4 flex max-w-[210mm] items-center gap-3 px-2 print:hidden"}>
        <span className="text-sm text-neutral-600">{Doc.documentFileName(number!, customer.name)}.pdf</span>
        <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"><PrinterIcon className="size-4" /> พิมพ์ / บันทึก PDF</button>
      </div>

      {/* Layout follows the owner's template (Invocie asset/INV Test.jpg · RE Test.jpg): logo on top, company name + addresses
          centred, Tax ID box left / NO. + DATE boxes right with the title in the middle, customer block (+ LINE QR on an
          invoice), a tall bordered items table, bank info / PAID stamp, totals, Memo, signatures */}
      <article className={`mx-auto min-h-[297mm] w-[210mm] bg-white p-[12mm] print:min-h-0 text-[11px] leading-snug text-neutral-900 print:w-auto print:p-0 print:shadow-none ${embed ? "" : "shadow"}`}>
        <header className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in a print page */}
          <img src="/brand/invoice-logo.svg" alt="" className="mx-auto h-[18mm] w-auto" />
          <p className="mt-2 text-[13px] font-bold">{company.nameTh}</p>
          <p className="text-[13px] font-bold">{company.nameEn}</p>
          <p className="text-[12px]">{company.addressTh} ({company.office.split("/")[0].trim()})</p>
          <p className="text-[12px]">{company.addressEn} ({company.office.split("/").pop()?.trim()})</p>
        </header>

        <section className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-4">
          <div>
            <p>{L.taxId}</p>
            <p className="text-center text-neutral-700">Tax ID Number</p>
            <p className="mt-0.5 w-56 border border-neutral-800 px-2 py-0.5 text-center text-[12px] tabular-nums">{company.taxId}</p>
          </div>
          <div className="pt-6 text-center">
            <p className="text-[12px]">{titlePrimary}</p>
            <p className="text-[12px]">{en}</p>
          </div>
          <div className="space-y-1">
            <p className="text-right">{en}</p>
            <div className="flex items-center justify-end gap-1"><span className="text-[12px]">NO.</span><span className="w-40 border border-neutral-800 px-2 py-0.5 text-center text-[12px] font-mono">{number}</span></div>
            <div className="flex items-center justify-end gap-1 pt-3"><span className="text-[12px]">DATE</span><span className="w-40 border border-neutral-800 px-2 py-0.5 text-center text-[12px]">{d(date)}</span></div>
            {kind === "credit-note" && <p className="text-right text-[10px]">REF. <span className="font-mono">{inv.number}</span></p>}
            {combined && <p className="text-right text-[10px]">REF. <span className="font-mono">{onReceipt.map((x) => x.number).join(", ")}</span></p>}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="space-y-1.5">
            <p><span className="text-[12px]">{L.customerName}</span><span className="ml-8 text-[12px] font-semibold text-[#3f6bb5]">{customer.name}</span></p>
            <p className="text-neutral-700">Customer Name</p>
            <p className="text-[12px]">{L.address}{customer.address ? <span className="ml-8">{customer.address}</span> : null}</p>
            <p className="text-neutral-700">Address</p>
            <p className="text-[12px]">{L.taxId}{customer.taxId ? <span className="ml-8">{customer.taxId}</span> : null}</p>
            <p className="text-neutral-700">Tax ID Number</p>
          </div>
          {kind === "invoice" && qrCells && (
            <svg viewBox={`0 0 ${qrCells.n + 2} ${qrCells.n + 2}`} className="size-[24mm] shrink-0" shapeRendering="crispEdges" aria-label="LINE">
              <rect width="100%" height="100%" fill="#fff" />
              {qrCells.dark.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="1" height="1" fill="#06C755" />)}
            </svg>
          )}
        </section>

        <table className="mt-2 w-full border-2 border-neutral-800 [&_td]:px-2 [&_th]:border-b [&_th]:border-neutral-800 [&_th]:px-2 [&_th]:py-1 [&_th+th]:border-l [&_td+td]:border-l [&_td+td]:border-neutral-800">
          <thead className="text-center">
            <tr><th className="w-12">{L.item}<br /><span className="font-normal">Item</span></th><th>{L.description}<br /><span className="font-normal">Description</span></th><th className="w-16">{L.qty}<br /><span className="font-normal">Q&apos;ty</span></th><th className="w-28">{L.unitPrice}<br /><span className="font-normal">Unit Price</span></th><th className="w-32">{L.amount}<br /><span className="font-normal">Amount (Baht)</span></th></tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr key={i} className="align-top">
                <td className="py-0.5 text-right">{it ? i + 1 : ""}</td>
                <td className="relative py-0.5 text-right">{it?.description}</td>
                <td className="py-0.5 text-right tabular-nums">{it ? it.qty : ""}</td>
                <td className="py-0.5">{it && <span className="flex justify-between tabular-nums"><span>฿</span><span>{money(it.unitPrice)}</span></span>}</td>
                <td className="py-0.5">{it && <span className="flex justify-between tabular-nums"><span>฿</span><span>{money(it.amount)}</span></span>}</td>
              </tr>
            ))}
            {/* the open space of the table — a receipt carries its PAID stamp here */}
            <tr className="align-top">
              <td className="h-[30mm]" />
              <td className="relative">
                {kind === "receipt" && <span className="absolute bottom-3 left-1/2 -translate-x-1/2 -rotate-6 rounded-sm border-2 border-[#c0392b] px-3 py-0.5 text-[20px] font-bold tracking-widest text-[#c0392b] opacity-80">PAID</span>}
              </td>
              <td /><td /><td />
            </tr>
          </tbody>
        </table>

        <section className="grid grid-cols-[1fr_58mm] border-x-2 border-b-2 border-neutral-800">
          <div className="p-2">
            {kind === "invoice" && branch.bankAccount.number && (
              <p className="whitespace-pre-line text-[11px]">
                {L.bank}：{branch.bankAccount.bank}{"\n"}{branch.bankAccount.branchName ? `${branch.bankAccount.branchName}\n` : ""}{L.accountNo}：{branch.bankAccount.number}{"\n"}{L.accountName}：{branch.bankAccount.name}
              </p>
            )}
            {kind === "credit-note" && cn!.refund && <p><b>{L.refund}:</b> {d(cn!.refund.date)} · {cn!.refund.fromAccount} · {cn!.refund.reference}</p>}
          </div>
          <table className="w-full border-l-2 border-neutral-800 [&_td]:px-2 [&_td]:py-1 [&_tr+tr_td]:border-t [&_tr+tr_td]:border-neutral-800">
            <tbody>
              <tr><td className="text-center">{L.subTotal}<br /><span className="text-neutral-700">Sub Total</span></td><td className="w-24"><span className="flex justify-between tabular-nums"><span>฿</span><span>{money(total)}</span></span></td></tr>
              <tr><td className="text-center">{L.vat}<br /><span className="text-neutral-700">VAT 7%</span></td><td><span className="flex justify-between tabular-nums"><span>฿</span><span>{money(0)}</span></span></td></tr>
              <tr className="font-semibold"><td className="text-center">{L.total}<br /><span className="font-normal text-neutral-700">Total</span></td><td><span className="flex justify-between tabular-nums"><span>฿</span><span>{money(total)}</span></span></td></tr>
            </tbody>
          </table>
        </section>

        <div className="mt-1 border-2 border-neutral-800 px-2 py-1">
          <p className="whitespace-pre-line"><b className="text-[12px]">Memo :</b> {memo}</p>
        </div>

        {kind === "invoice" ? (
          <footer className="mt-2 grid grid-cols-[1fr_auto] items-start gap-6">
            <p />
            <p className="text-right"><b>*Total Due By</b>   <span className="ml-4 text-[12px]">{d(dueBy)}</span></p>
            <div />
            <div className="mt-2 text-center">
              <p>{L.preparedBy}</p><p>PREPARED BY</p>
              <p className="mt-1 font-serif italic">......{signer}......</p>
              <p className="mt-2">{L.authorized}</p><p>AUTHORIZED SIGNATURE</p>
              <p className="mt-1 font-serif italic">...............</p>
            </div>
          </footer>
        ) : (
          <footer className="mt-4 grid grid-cols-2 gap-6 text-center">
            <div className="pt-6">
              <p>{L.payeeBy}</p><p>PAYEE BY</p>
              <p className="mt-1 font-serif italic">...............{signer}...............</p>
            </div>
            <div>
              <p>REMARK</p>
              <p>{L.authorized}</p><p>AUTHORIZED SIGNATURE</p>
              <p className="mt-1 font-serif italic">...............................</p>
              <p className="mt-2">{L.date}</p><p>DATE...............{d(date)}...............</p>
            </div>
          </footer>
        )}
      </article>
    </div>
  )
}
