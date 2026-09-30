"use client"

import { useState } from "react"
import { DownloadIcon, FileSpreadsheetIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtDate, fmtMoney, fmtMonth, toDateStr } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import { BUSINESS_LABEL, salesTaxRows, salesTaxTotals } from "@/domain/rules/documents"
import { inBranch } from "@/domain/rules/permissions"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { downloadSalesTaxReport } from "@/lib/sales-tax-export"
import { useStore } from "@/store/store"

/** Months between two YYYY-MM, inclusive */
function monthsBetween(from: string, to: string) {
  const out: string[] = []
  let [y, m] = from.split("-").map(Number)
  const [ty, tm] = to.split("-").map(Number)
  while ((y < ty || (y === ty && m <= tm)) && out.length < 36) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++ } }
  return out
}

/**
 * Sales Tax Report for the accountant (owner 2026-09-30): the whole company in one file — every branch the user can
 * see — one tab per month, rows in statement order (payment date), credit notes as negative rows.
 */
export function SalesTaxDialog() {
  const s = useStore()
  const me = s.staff.find((x) => x.id === s.userId)
  const thisMonth = toDateStr(useNow(60_000)).slice(0, 7)
  const [from, setFrom] = useState(thisMonth)
  const [to, setTo] = useState(thisMonth)
  const [busy, setBusy] = useState(false)
  const branches = s.branches.filter((b) => inBranch(me, b.id))
  const ids = new Set(branches.map((b) => b.id))
  const ctx = {
    invoices: s.invoices.filter((i) => ids.has(i.branchId)), creditNotes: s.creditNotes.filter((n) => ids.has(n.branchId)),
    students: s.students, families: s.families, branches: s.branches,
    totalOf: (inv: (typeof s.invoices)[number]) => invoiceTotals(inv, { branch: s.branches.find((b) => b.id === inv.branchId)!, courses: s.courses, classes: s.classes, holidays: s.holidays }).total,
  }
  const months = from && to && from <= to ? monthsBetween(from, to).map((month) => ({ month, rows: salesTaxRows(month, ctx) })) : []
  const all = months.flatMap((m) => m.rows)
  const totals = salesTaxTotals(all)

  const download = async () => {
    setBusy(true)
    try {
      await downloadSalesTaxReport(months, s.system.company, (id) => s.branches.find((b) => b.id === id)?.name ?? "")
      report({ ok: true, value: undefined }, `ดาวน์โหลดรายงานภาษีขาย ${months.length} เดือนแล้ว`)
    } catch (e) {
      report({ ok: false, error: `สร้างไฟล์ไม่สำเร็จ — ${(e as Error).message}` }, "")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}><FileSpreadsheetIcon /> รายงานภาษีขาย</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>รายงานภาษีขาย (Sales Tax Report)</DialogTitle>
          <DialogDescription>ทั้งบริษัท ({s.system.company.nameTh}) · {branches.map((b) => b.name).join(", ")} · 1 แท็บต่อเดือน เรียงตามวันที่เงินเข้า · ใบลดหนี้เป็นแถวติดลบในเดือนที่ออก</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">ตั้งแต่เดือน</Label><Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">ถึงเดือน</Label><Input type="month" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        {from > to && <p className="text-xs text-red-700">เดือนเริ่มต้องไม่หลังเดือนสุดท้าย</p>}
        <div className="space-y-2">
          {months.map(({ month, rows }) => (
            <details key={month} className="rounded-xl border" open={months.length === 1}>
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{fmtMonth(month + "-01")}</span>
                <span className="text-xs text-muted-foreground">{rows.length} รายการ</span>
                <span className="ml-auto tabular-nums">{fmtMoney(salesTaxTotals(rows).total)}</span>
              </summary>
              <table className="w-full border-t text-xs">
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.number} className="border-b last:border-0 [&>td]:px-3 [&>td]:py-1">
                      <td className="w-8 text-muted-foreground">{i + 1}</td><td>{fmtDate(r.date)}</td><td className="font-mono">{r.number}</td><td>{r.customer}</td>
                      <td className="text-muted-foreground">{BUSINESS_LABEL[r.business]}</td>
                      <td className={r.amount < 0 ? "text-right text-red-700 tabular-nums" : "text-right tabular-nums"}>{fmtMoney(r.amount)}</td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td className="px-3 py-3 text-center text-muted-foreground" colSpan={6}>ไม่มีรายการในเดือนนี้</td></tr>}
                </tbody>
              </table>
            </details>
          ))}
        </div>
        <DialogFooter className="items-center">
          <span className="mr-auto text-sm">รวม <b className="tabular-nums">{fmtMoney(totals.total)}</b>{totals.byBusiness.map((b) => <span key={b.business} className="ml-2 text-xs text-muted-foreground">{BUSINESS_LABEL[b.business]} {fmtMoney(b.amount)}</span>)}</span>
          <Button disabled={!months.length || busy} onClick={download}><DownloadIcon /> ดาวน์โหลด .xlsx</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
