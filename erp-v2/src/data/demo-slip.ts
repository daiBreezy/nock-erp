// Demo pay slips (owner 2026-11-24): every transfer in the demo data carries a slip image, so the "รับเงิน" step of an
// invoice shows its Payslip preview like the invoice and the receipt do. A small SVG drawn from the payment itself — in real
// use the slip is the photo staff upload. Marked "สลิปตัวอย่าง" so nobody mistakes it for a real one.

import type { Invoice, Payment } from "@/domain/types"

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const baht = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function demoSlip(p: Pick<Payment, "amount" | "reference" | "paidOn" | "recordedAt">): string {
  const date = p.paidOn ?? p.recordedAt.slice(0, 10)
  const font = "font-family='Noto Sans Thai,Sarabun,Tahoma,sans-serif'"
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='520' viewBox='0 0 360 520'>` +
    `<rect width='360' height='520' fill='#f3f6f4'/><rect width='360' height='96' fill='#2e9e6b'/>` +
    `<circle cx='180' cy='40' r='18' fill='#fff'/><path d='M171 40l7 7 13-14' stroke='#2e9e6b' stroke-width='4' fill='none' stroke-linecap='round'/>` +
    `<text x='180' y='80' text-anchor='middle' fill='#fff' font-size='16' ${font}>โอนเงินสำเร็จ</text>` +
    `<text x='180' y='150' text-anchor='middle' fill='#111' font-size='30' font-weight='bold' ${font}>${baht(p.amount)}</text>` +
    `<text x='180' y='174' text-anchor='middle' fill='#666' font-size='13' ${font}>บาท</text>` +
    `<line x1='28' y1='198' x2='332' y2='198' stroke='#d9ded9'/>` +
    `<text x='28' y='230' fill='#888' font-size='12' ${font}>วันที่ทำรายการ</text><text x='332' y='230' text-anchor='end' fill='#222' font-size='13' ${font}>${esc(date)}</text>` +
    `<text x='28' y='266' fill='#888' font-size='12' ${font}>เลขอ้างอิง</text><text x='332' y='266' text-anchor='end' fill='#222' font-size='13' ${font}>${esc(p.reference || "-")}</text>` +
    `<text x='28' y='302' fill='#888' font-size='12' ${font}>ถึง</text><text x='332' y='302' text-anchor='end' fill='#222' font-size='13' ${font}>บัญชีสถาบัน</text>` +
    `<text x='180' y='490' text-anchor='middle' fill='#aaa' font-size='11' ${font}>สลิปตัวอย่าง (Demo)</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** every transfer without a slip gets a demo one (cash has no slip) — saved data is kept, only `slip` is added */
export function withDemoSlips<T extends { invoices: Invoice[] }>(s: T): T {
  if (!s.invoices.some((i) => i.payments.some((p) => p.method === "transfer" && !p.slip))) return s
  return { ...s, invoices: s.invoices.map((i) => (i.payments.some((p) => p.method === "transfer" && !p.slip) ? { ...i, payments: i.payments.map((p) => (p.method === "transfer" && !p.slip ? { ...p, slip: demoSlip(p) } : p)) } : i)) }
}
