"use client"

import { useState } from "react"
import { ChevronDownIcon, DownloadIcon, EyeIcon, FileSpreadsheetIcon, Share2Icon, TriangleAlertIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { BranchCode } from "@/components/app/branch-scope"
import { DateRangePicker } from "@/components/app/date-range-picker"
import { InfoTip } from "@/components/app/info-tip"
import { Segmented } from "@/components/app/page-layout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { endOfMonth, fmtDate, fmtMoney, fmtMonth, toDateStr } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import { BUSINESS_LABEL, accountingOutstanding, receiptDate, salesTaxRows, salesTaxTotals, type OutstandingReason } from "@/domain/rules/documents"
import { can, inBranch } from "@/domain/rules/permissions"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { downloadSalesTaxReport, shareSalesTaxReport } from "@/lib/sales-tax-export"
import { useStore } from "@/store/store"

/** Months between two YYYY-MM, inclusive */
function monthsBetween(from: string, to: string) {
  const out: string[] = []
  let [y, m] = from.split("-").map(Number)
  const [ty, tm] = to.split("-").map(Number)
  while ((y < ty || (y === ty && m <= tm)) && out.length < 36) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++ } }
  return out
}

/** what the admin still has to do — and the colour of the pill */
const OUTSTANDING: Record<OutstandingReason, { label: string; tone: "amber" | "blue" | "special" }> = {
  unconfirmed: { label: "เงินเข้าแล้ว รอยืนยัน · ยังไม่อยู่ในรายงาน", tone: "special" },
  draft: { label: "ร่าง · รอสร้าง PDF", tone: "amber" },
  pending_approval: { label: "รออนุมัติ", tone: "amber" },
  approved: { label: "อนุมัติแล้ว · รอส่งผู้ปกครอง", tone: "blue" },
  sent: { label: "ส่งแล้ว · รอชำระ", tone: "blue" },
}

/** share a link: the device's share sheet where there is one, otherwise copy it */
async function shareLink(path: string, title: string) {
  const url = new URL(path, location.origin).href
  try {
    if (navigator.share) await navigator.share({ title, url })
    else { await navigator.clipboard.writeText(url); report({ ok: true, value: undefined }, "คัดลอกลิงก์ชุดเอกสารแล้ว") }
  } catch (e) {
    if ((e as Error).name !== "AbortError") report({ ok: false, error: "แชร์ไม่สำเร็จ" }, "")
  }
}

/** a small icon button with a hover hint (Hover Card, like the rest of the app) */
function IconAction({ label, icon: Icon, onClick, href, disabled }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void; href?: string; disabled?: boolean }) {
  const cls = "size-8 rounded-full"
  return (
    <HoverCard>
      <HoverCardTrigger render={<span className="inline-flex" />}>
        {href && !disabled
          ? <Button variant="ghost" size="icon-sm" className={cls} aria-label={label} nativeButton={false} render={<a href={href} target="_blank" rel="noreferrer" />}><Icon className="size-4" /></Button>
          : <Button variant="ghost" size="icon-sm" className={cls} aria-label={label} disabled={disabled} onClick={onClick}><Icon className="size-4" /></Button>}
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-auto px-2.5 py-1.5 text-xs">{label}</HoverCardContent>
    </HoverCard>
  )
}

/**
 * Accounting pack for the outsourced accountant (owner 2026-09-30, reworked 2026-11-15): the whole company — every branch
 * the user can see — in one date range. Two tabs: the Sales Tax Report (.xlsx) and a document set per paid invoice
 * (Invoice → pay slip → Receipt). Unpaid invoices never block a send (the report is by the day the money arrived), but the
 * admin is told which ones are still open so they can be cleared first.
 * Header · Body · CTA bottom: only the body scrolls.
 */
/** `open`/`onOpenChange` = controlled (opened from a menu, no trigger button of its own); leave both off for the standalone button */
export function SalesTaxDialog({ open, onOpenChange, onOpenInvoice }: { open?: boolean; onOpenChange?: (open: boolean) => void; onOpenInvoice?: (id: string) => void } = {}) {
  const s = useStore()
  const me = s.me()
  const today = toDateStr(useNow(60_000))
  const [range, setRange] = useState(() => ({ from: today.slice(0, 8) + "01", to: endOfMonth(today) }))
  const [busy, setBusy] = useState(false)
  // everyone with billing access may PREVIEW; downloading / sharing the files needs billing.export (Director / Super Admin / Manager / Area Manager)
  const canSend = can(me, "billing.export")
  const [tab, setTab] = useState<"tax" | "sets">("tax")
  const branches = s.branches.filter((b) => inBranch(me, b.id))
  const ids = new Set(branches.map((b) => b.id))
  const ctx = {
    invoices: s.invoices.filter((i) => ids.has(i.branchId)), creditNotes: s.creditNotes.filter((n) => ids.has(n.branchId)),
    students: s.students, families: s.families, branches: s.branches,
    totalOf: (inv: (typeof s.invoices)[number]) => invoiceTotals(inv, { branch: s.branches.find((b) => b.id === inv.branchId)!, courses: s.courses, classes: s.classes, holidays: s.holidays }).total,
  }
  const inRange = (d: string) => d >= range.from && d <= range.to
  const months = monthsBetween(range.from.slice(0, 7), range.to.slice(0, 7)).map((month) => ({ month, rows: salesTaxRows(month, ctx).filter((r) => inRange(r.date)) }))
  const all = months.flatMap((m) => m.rows)
  const totals = salesTaxTotals(all)
  // one document set per paid invoice — Invoice → pay slip → Receipt — by the day the money arrived
  const sets = ctx.invoices
    .filter((i) => i.status === "paid" && i.number && i.receiptNumber)
    .map((i) => ({ inv: i, date: receiptDate(i) }))
    .filter((x): x is { inv: typeof x.inv; date: string } => !!x.date && inRange(x.date))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.inv.number ?? "").localeCompare(b.inv.number ?? ""))
  const outstanding = accountingOutstanding(ctx.invoices, range.from, range.to)
  const batchPath = `/print/set/batch?ids=${sets.map((x) => x.inv.id).join(",")}`
  const spanLabel = `${fmtDate(range.from, { year: range.from.slice(0, 4) !== range.to.slice(0, 4) })} – ${fmtDate(range.to, { year: true })}`

  const rowsFor = () => months.filter((m) => m.rows.length)
  const download = async () => {
    setBusy(true)
    try {
      await downloadSalesTaxReport(rowsFor(), s.system.company, (id) => s.branches.find((b) => b.id === id)?.name ?? "")
      report({ ok: true, value: undefined }, `ดาวน์โหลดรายงานภาษีขาย ${spanLabel} แล้ว`)
    } catch (e) {
      report({ ok: false, error: `สร้างไฟล์ไม่สำเร็จ — ${(e as Error).message}` }, "")
    } finally {
      setBusy(false)
    }
  }
  const share = async () => {
    setBusy(true)
    try {
      const shared = await shareSalesTaxReport(rowsFor(), s.system.company, (id) => s.branches.find((b) => b.id === id)?.name ?? "")
      if (!shared) {
        await downloadSalesTaxReport(rowsFor(), s.system.company, (id) => s.branches.find((b) => b.id === id)?.name ?? "")
        report({ ok: true, value: undefined }, "เครื่องนี้แชร์ไฟล์ตรงไม่ได้ — ดาวน์โหลดไฟล์ให้แทน นำไปส่งต่อได้เลย")
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") report({ ok: false, error: `แชร์ไม่สำเร็จ — ${(e as Error).message}` }, "")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open === undefined && <DialogTrigger render={<Button variant="outline" />}><FileSpreadsheetIcon /> รายงานภาษีขาย</DialogTrigger>}
      {/* owner 2026-11-15: Header · Body · CTA bottom — only the body scrolls, the buttons never leave the screen */}
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 lg:max-w-2xl">
        <div className="shrink-0 space-y-3 p-6 pr-14 pb-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">ส่งบัญชี (Accounting)
              <InfoTip text={<>ทั้งบริษัท ({s.system.company.nameTh}) · {branches.map((b) => b.name).join(", ")}<br />รายงานภาษีขายเรียงตามวันที่เงินเข้า · ใบลดหนี้เป็นแถวติดลบในเดือนที่ออก</>} />
            </DialogTitle>
            <DialogDescription>ทั้งบริษัท · {branches.length} สาขา</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented label="ชุดรายงาน" value={tab} onChange={setTab} options={[{ value: "tax", label: "รายงานภาษีขาย" }, { value: "sets", label: "ชุดเอกสารต่อใบ" }]} />
            <DateRangePicker plain from={range.from} to={range.to} onChange={setRange} />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-4">
          {outstanding.length > 0 && (
            <details className="rounded-xl bg-warning-soft/60 text-warning-ink" open={outstanding.length <= 5}>
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium">
                <TriangleAlertIcon className="size-4 shrink-0" />
                ช่วงนี้เหลือ {outstanding.length} ใบที่ยังไม่เสร็จสิ้น — ควรจัดการก่อนส่งบัญชี
                <InfoTip text="ใบที่ยังไม่ชำระไม่ได้บล็อกการส่ง — รายงานนับตามวันที่เงินเข้า จึงไปอยู่ในเดือนที่จ่ายจริง · แต่เงินที่เข้าแล้วแต่ยังไม่ยืนยันจะไม่อยู่ในรายงาน" />
                <ChevronDownIcon className="ml-auto size-4 shrink-0" />
              </summary>
              <ul className="divide-y divide-warning/20 border-t border-warning/20">
                {outstanding.map(({ inv, reason }) => {
                  const stu = s.students.find((x) => x.id === inv.studentId)
                  const r = OUTSTANDING[reason]
                  return (
                    <li key={inv.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                      <BranchCode code={s.branches.find((b) => b.id === inv.branchId)?.code ?? ""} />
                      <span className="w-36 shrink-0 truncate font-mono">{inv.number ?? "ร่าง"}</span>
                      <span className="min-w-0 flex-1 truncate">{stu?.nickname ?? "—"}</span>
                      <Pill tone={r.tone}>{r.label}</Pill>
                      {onOpenInvoice && <Button variant="outline" size="sm" className="h-7 shrink-0" onClick={() => onOpenInvoice(inv.id)}>เปิดใบ</Button>}
                    </li>
                  )
                })}
              </ul>
            </details>
          )}
          {tab === "sets" && (
            <table className="w-full rounded-xl border text-xs">
              <tbody>
                {sets.map(({ inv, date }) => {
                  const stu = s.students.find((x) => x.id === inv.studentId)
                  const path = `/print/set/${inv.id}`
                  return (
                    <tr key={inv.id} className="border-b last:border-0 [&>td]:px-3 [&>td]:py-1">
                      <td>{fmtDate(date)}</td><td className="font-mono">{inv.number}</td><td>{stu?.nickname ?? "—"}</td>
                      <td className="text-muted-foreground">{inv.payments.filter((p) => p.slip).length} สลิป</td>
                      <td className="text-right whitespace-nowrap">
                        <IconAction label="ดูตัวอย่าง" icon={EyeIcon} href={path} />
                        <IconAction label={canSend ? "ดาวน์โหลด PDF" : "ดาวน์โหลด PDF — เฉพาะ Director / Super Admin"} icon={DownloadIcon} href={`${path}#download`} disabled={!canSend} />
                        <IconAction label={canSend ? "แชร์ลิงก์" : "แชร์ — เฉพาะ Director / Super Admin"} icon={Share2Icon} onClick={() => shareLink(path, inv.number ?? "")} disabled={!canSend} />
                      </td>
                    </tr>
                  )
                })}
                {!sets.length && <tr><td className="px-3 py-6 text-center text-muted-foreground" colSpan={5}>ไม่มีใบที่รับเงิน + ออกใบเสร็จแล้วในช่วงนี้</td></tr>}
              </tbody>
            </table>
          )}
          {tab === "tax" && months.map(({ month, rows }) => (
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
                      <td className={r.amount < 0 ? "text-right text-danger tabular-nums" : "text-right tabular-nums"}>{fmtMoney(r.amount)}</td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td className="px-3 py-3 text-center text-muted-foreground" colSpan={6}>ไม่มีรายการในเดือนนี้</td></tr>}
                </tbody>
              </table>
            </details>
          ))}
        </div>
        <DialogFooter className="shrink-0 flex-row flex-wrap items-center gap-2 border-t p-4 px-6">
          {tab === "sets"
            ? <span className="mr-auto text-sm">{sets.length} ชุด <InfoTip text="1 ชุด = ใบแจ้งหนี้ → สลิปโอนเงิน → ใบเสร็จ ใน PDF เดียว (เลือกช่วงตามวันที่เงินเข้า)" /></span>
            : <span className="mr-auto text-sm">รวม <b className="tabular-nums">{fmtMoney(totals.total)}</b>{totals.byBusiness.map((b) => <span key={b.business} className="ml-2 text-xs text-muted-foreground">{BUSINESS_LABEL[b.business]} {fmtMoney(b.amount)}</span>)}</span>}
          {!canSend && <InfoTip text="ดูตัวอย่างได้ทุกคนที่เห็นเมนูนี้ · ดาวน์โหลด / แชร์ได้เฉพาะ Director / Super Admin" />}
          {tab === "tax" ? (
            <>
              <Button variant="outline" disabled={!canSend || !all.length || busy} onClick={share}><Share2Icon /> แชร์</Button>
              <Button disabled={!canSend || !all.length || busy} onClick={download}><DownloadIcon /> ดาวน์โหลด .xlsx</Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={!sets.length} nativeButton={false} render={<a href={batchPath} target="_blank" rel="noreferrer" />}><EyeIcon /> ดูทั้งหมด</Button>
              <Button disabled={!canSend || !sets.length} nativeButton={false} render={<a href={`${batchPath}#download`} target="_blank" rel="noreferrer" />}><DownloadIcon /> ดาวน์โหลดทั้งหมด (PDF)</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
