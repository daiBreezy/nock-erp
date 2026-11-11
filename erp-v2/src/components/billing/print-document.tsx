"use client"

import { useSyncExternalStore } from "react"
import { PrinterIcon } from "lucide-react"
import qrcode from "qrcode-generator"
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
  // real first name + surname on the signature lines (owner 2026-11-05)
  const signer = Doc.signatureName((cn ?? inv).createdBy, s.staff)
  const authorizer = Doc.signatureName((cn ?? inv).approvedBy, s.staff)
  const [, en] = TITLE[kind]
  const titlePrimary = kind === "credit-note" ? L.creditNote : L[kind]
  const memo = [Doc.invoiceMemo(inv, { brandMemo: s.system.invoiceMemos[branch.brand], branch, courses: s.courses, classes: s.classes }).memo, kind === "credit-note" ? `${L.invRef} ${inv.number} · ${[...cn!.reasons, cn!.remark].filter(Boolean).join(", ")}` : combined ? `${L.invRef} ${onReceipt.map((x) => x.number).join(", ")}` : inv.noteToParent].filter(Boolean).join("\n")
  // QR codes: the branch's LINE add-friend (template: top right of the invoice, green) · PromptPay payment with the amount (owner 2026-11-05)
  const qrOf = (data: string | null | undefined) => {
    if (!data) return null
    const q = qrcode(0, "M")
    q.addData(data)
    q.make()
    const n = q.getModuleCount()
    return { n, dark: Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as const).filter(([x, y]) => q.isDark(y, x)) }
  }
  const qrCells = qrOf(branch.lineOa?.addFriendUrl)
  const payQr = kind === "invoice" ? qrOf(branch.bankAccount.promptPayId ? Doc.promptPayPayload(branch.bankAccount.promptPayId, total) : null) : null
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
      <article className={`mx-auto min-h-[297mm] w-[210mm] bg-white p-[12mm] print:min-h-0 text-2xs leading-snug text-neutral-900 print:w-auto print:p-0 print:shadow-none ${embed ? "" : "shadow"}`}>
        {/* logo left · company name + addresses right-aligned */}
        <header className="flex items-start justify-between gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in a print page */}
          <img src="/brand/invoice-logo.svg" alt="" className="h-[20mm] w-auto shrink-0" />
          <div className="text-right">
            {/* Liclass parents cannot read Thai (Pin, 6 Oct): the Japanese paper drops the Thai name + address, English stays */}
            {lang === "th" && <p className="text-sm font-bold">{company.nameTh}</p>}
            <p className="text-sm font-bold">{company.nameEn}</p>
            {lang === "th" && <p className="text-2xs">{company.addressTh} ({company.office.split("/")[0].trim()})</p>}
            <p className="text-2xs">{company.addressEn} ({company.office.split("/").pop()?.trim()})</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-[1fr_auto_1fr] items-start gap-4">
          <div>
            {/* one line for the label, the number on the second line — left aligned */}
            <p>{L.taxId} / Tax ID Number</p>
            <p className="mt-0.5 w-56 border border-neutral-700 px-2 py-0.5 text-xs tabular-nums">{company.taxId}</p>
          </div>
          <div className="pt-4 text-center">
            <p className="text-sm font-semibold">{titlePrimary}</p>
            <p className="text-xs">{en}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-end gap-1"><span className="text-xs">NO.</span><span className="w-60 whitespace-nowrap border border-neutral-700 px-2 py-0.5 text-center text-xs font-mono">{number}</span></div>
            <div className="flex items-center justify-end gap-1"><span className="text-xs">DATE</span><span className="w-60 border border-neutral-700 px-2 py-0.5 text-center text-xs">{d(date)}</span></div>
            {kind === "credit-note" && <p className="text-right text-2xs">REF. <span className="font-mono">{inv.number}</span></p>}
            {combined && <p className="text-right text-2xs">REF. <span className="font-mono">{onReceipt.map((x) => x.number).join(", ")}</span></p>}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="space-y-1.5 text-xs">
            <p><span>{L.customerName} / Customer Name</span><span className="ml-6 font-semibold text-[#3f6bb5]">{customer.name}</span></p>
            <p><span>{L.address} / Address</span>{customer.address ? <span className="ml-6">{customer.address}</span> : null}</p>
            <p><span>{L.taxId} / Tax ID Number</span>{customer.taxId ? <span className="ml-6">{customer.taxId}</span> : null}</p>
          </div>
          {kind === "invoice" && qrCells && (
            <svg viewBox={`0 0 ${qrCells.n + 2} ${qrCells.n + 2}`} className="size-[24mm] shrink-0" shapeRendering="crispEdges" aria-label="LINE">
              <rect width="100%" height="100%" fill="#fff" />
              {qrCells.dark.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="1" height="1" fill="#06C755" />)}
            </svg>
          )}
        </section>

        <table className="mt-2 w-full border border-neutral-700 [&_td]:px-2 [&_th]:border-b [&_th]:border-neutral-700 [&_th]:px-2 [&_th]:py-1 [&_th+th]:border-l [&_td+td]:border-l [&_td+td]:border-neutral-700">
          <thead className="text-center">
            <tr><th className="w-12">{L.item}<br /><span className="font-normal">Item</span></th><th>{L.description}<br /><span className="font-normal">Description</span></th><th className="w-16">{L.qty}<br /><span className="font-normal">Q&apos;ty</span></th><th className="w-28">{L.unitPrice}<br /><span className="font-normal">Unit Price</span></th><th className="w-32">{L.amount}<br /><span className="font-normal">Amount (Baht)</span></th></tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr key={i} className="align-top">
                <td className="py-0.5 text-right">{it ? i + 1 : ""}</td>
                <td className="relative py-0.5 text-left">{it?.description}</td>
                <td className="py-0.5 text-right tabular-nums">{it ? it.qty : ""}</td>
                <td className="py-0.5">{it && <span className="flex justify-between tabular-nums"><span>฿</span><span>{money(it.unitPrice)}</span></span>}</td>
                <td className="py-0.5">{it && <span className="flex justify-between tabular-nums"><span>฿</span><span>{money(it.amount)}</span></span>}</td>
              </tr>
            ))}
            {/* the open space of the table — a receipt carries its PAID stamp here */}
            <tr className="align-top">
              <td className="h-[46mm]" />
              <td className="relative">
                {kind === "receipt" && <span className="absolute bottom-3 left-1/2 -translate-x-1/2 -rotate-6 rounded-sm border-2 border-[#c0392b] px-3 py-0.5 text-xl font-bold tracking-widest text-[#c0392b] opacity-80">PAID</span>}
              </td>
              <td /><td /><td />
            </tr>
          </tbody>
        </table>

        <section className="grid grid-cols-[1fr_62mm] border-x border-b border-neutral-700">
          <div className="p-2">
            {/* payment QR on the left, the bank account beside it on the same line */}
            {kind === "invoice" && (payQr || branch.bankAccount.number) && (
              <div className="flex items-start gap-3">
                {payQr && (
                  <svg viewBox={`0 0 ${payQr.n + 2} ${payQr.n + 2}`} className="size-[26mm] shrink-0" shapeRendering="crispEdges" aria-label="PromptPay">
                    <rect width="100%" height="100%" fill="#fff" />
                    {payQr.dark.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="1" height="1" fill="#000" />)}
                  </svg>
                )}
                {/* beside the QR, top to bottom: the bank account, then the scan-to-pay sub text */}
                <div className="flex min-h-[26mm] flex-col justify-between">
                  {branch.bankAccount.number && (
                    <p className="whitespace-pre-line text-2xs">
                      {L.bank}：{branch.bankAccount.bank}{"\n"}{branch.bankAccount.branchName ? `${branch.bankAccount.branchName}\n` : ""}{L.accountNo}：{branch.bankAccount.number}{"\n"}{L.accountName}：{branch.bankAccount.name}
                    </p>
                  )}
                  {payQr && (
                    <p className="text-2xs leading-snug text-neutral-700">{L.scanToPay}<br />Scan to pay · PromptPay</p>
                  )}
                </div>
              </div>
            )}
            {kind === "credit-note" && cn!.refund && <p><b>{L.refund}:</b> {d(cn!.refund.date)} · {cn!.refund.fromAccount} · {cn!.refund.reference}</p>}
          </div>
          {/* labels on the left, amounts on the right — no VAT any more */}
          <table className="w-full border-l border-neutral-700 [&_td]:px-2 [&_td]:py-1.5 [&_tr+tr_td]:border-t [&_tr+tr_td]:border-neutral-700">
            <tbody>
              <tr><td className="text-left">{L.subTotal} / Sub Total</td><td className="w-24"><span className="flex justify-between tabular-nums"><span>฿</span><span>{money(total)}</span></span></td></tr>
              <tr className="font-semibold"><td className="text-left">{L.total} / Total</td><td><span className="flex justify-between tabular-nums"><span>฿</span><span>{money(total)}</span></span></td></tr>
            </tbody>
          </table>
        </section>

        <div className="mt-1 border border-neutral-700 px-2 py-1">
          <p className="whitespace-pre-line"><b className="text-xs">Memo :</b> {memo}</p>
        </div>

        {kind === "invoice" && <p className="mt-2 text-right"><b>*Total Due By</b>   <span className="ml-4 text-xs">{d(dueBy)}</span></p>}

        {/* signatures side by side, on the right of the page: handwriting-style real name, role (TH/JP + EN) under the line */}
        <footer className="mt-6 flex justify-end gap-8 text-center">
          {([[kind === "receipt" ? L.payeeBy : L.preparedBy, kind === "receipt" ? "PAYEE BY" : "PREPARED BY", signer], [L.authorized, "AUTHORIZED SIGNATURE", authorizer]] as const).map(([th, en2, name]) => (
            <div key={en2} className="w-[52mm]">
              <p className="min-h-[11mm] border-b border-dotted border-neutral-500 pb-0.5 text-2xl leading-none" style={{ fontFamily: "var(--font-sign), cursive" }}>{name}</p>
              <p className="mt-1">{th} / {en2}</p>
            </div>
          ))}
        </footer>
      </article>
    </div>
  )
}
