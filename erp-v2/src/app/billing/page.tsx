"use client"

import { SalesTaxDialog } from "@/components/billing/sales-tax-dialog"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EyeIcon, EyeOffIcon, PlusIcon, SearchIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { InvoiceEditor } from "@/components/billing/invoice-editor"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { invoiceTone } from "@/components/billing/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import type { Invoice } from "@/domain/types"
import { useBranch, useNow, useQueryState } from "@/lib/hooks"
import { GradeCell, gradeCompare, HEAD, MidText, Pager, ROW, SortHeader, TableShell, Th, usePage, useSort } from "@/components/app/data-table"
import { gradeTone } from "@/components/app/subject-color"
import { invoiceOverdue, paymentUnconfirmed } from "@/domain/rules/reports"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type BillSort = "number" | "created" | "student" | "grade" | "total" | "status"
type Filter = "all" | "draft" | "pending_approval" | "awaiting_payment" | "to_confirm" | "paid" | "void"

export default function Page() {
  return (
    <Suspense>
      <BillingPage />
    </Suspense>
  )
}

function BillingPage() {
  const params = useSearchParams()
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  // owner 2026-10-06: sync to the URL (?filter=) so a reload or shared link keeps it — the ?open=/?new=/?renew=/?slip= deep-links above are untouched
  const [filter, setFilter] = useQueryState<Filter>("filter", "all")
  const [showVoid, setShowVoid] = useQueryState<"0" | "1">("void", "0")
  const [q, setQ] = useState("")
  const [openId, setOpenId] = useState<string | null>(() => params.get("open"))
  // ?new=<studentId> opens the editor pre-filled (from the student panel)
  const [editing, setEditing] = useState<Invoice | "new" | null>(() => (params.get("new") ? "new" : null))
  const presetStudent = params.get("new") ?? undefined
  const renewFrom = params.get("renew") ?? undefined
  const slipFromChat = params.get("slip") ?? undefined

  const { sort, toggle } = useSort<BillSort>("created", true)
  const byGrade = gradeCompare(branch.grades)
  const ctx = { branch, courses, classes, holidays }
  const now = useNow()
  const rows = invoices
    .filter((i) => i.branchId === branch.id)
    .map((i) => {
      const total = Bill.invoiceTotals(i, ctx).total
      const paid = i.payments.reduce((a, p) => a + p.amount, 0)
      return { inv: i, total, paid, toConfirm: i.payments.some((p) => !p.confirmedBy), student: students.find((s) => s.id === i.studentId) }
    })

  // BL-10: every card says exactly what it counts
  const month = toDateStr(new Date()).slice(0, 7)
  const cards = [
    { key: "pending_approval" as Filter, label: "รออนุมัติ PDF", value: rows.filter((r) => r.inv.status === "pending_approval").length, unit: "ใบ" },
    { key: "awaiting_payment" as Filter, label: "รอชำระ", value: fmtMoney(rows.filter((r) => ["approved", "sent"].includes(r.inv.status)).reduce((a, r) => a + r.total - r.paid, 0)), unit: "" },
    { key: "to_confirm" as Filter, label: "รอยืนยันยอดเงิน", value: rows.filter((r) => r.toConfirm).length, unit: "รายการ" },
    { key: "paid" as Filter, label: "รับเงินแล้วเดือนนี้", value: fmtMoney(rows.flatMap((r) => r.inv.payments).filter((p) => p.confirmedBy && p.recordedAt.slice(0, 7) === month).reduce((a, p) => a + p.amount, 0)), unit: "" },
  ]

  const voidCount = rows.filter((r) => r.inv.status === "void").length
  const visible = rows
    // owner 2026-10-07: voided invoices hidden unless "แสดงใบที่ยกเลิก" is on (or the ยกเลิก filter is picked)
    .filter((r) => showVoid === "1" || filter === "void" || r.inv.status !== "void")
    .filter((r) => {
      if (filter === "all") return true
      if (filter === "awaiting_payment") return ["approved", "sent"].includes(r.inv.status)
      if (filter === "to_confirm") return r.toConfirm
      return r.inv.status === filter
    })
    .filter((r) => !q || `${r.inv.number} ${r.student?.nickname} ${r.student?.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "number" ? (a.inv.number ?? "").localeCompare(b.inv.number ?? "")
        : k === "student" ? (a.student?.nickname ?? "").localeCompare(b.student?.nickname ?? "", "th")
          : k === "grade" ? byGrade(a.student?.grade ?? "", b.student?.grade ?? "")
            : k === "total" ? a.total - b.total
              : k === "status" ? Bill.INVOICE_STATUS_LABEL[a.inv.status].localeCompare(Bill.INVOICE_STATUS_LABEL[b.inv.status], "th")
                : a.inv.createdAt.localeCompare(b.inv.createdAt)
      return sort.desc ? -v : v
    })
  const pg = usePage(visible)

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <button key={c.key} onClick={() => setFilter(c.key)} className="text-left">
            <Card className={cn("transition hover:ring-primary/40", filter === c.key && "ring-2 ring-primary")}>
              <CardContent>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{c.value} <span className="text-xs font-normal text-muted-foreground">{c.unit}</span></div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup value={[filter]} onValueChange={(v) => v[0] && setFilter(v[0] as Filter)} variant="outline" size="sm" className="flex-wrap">
          <ToggleGroupItem value="all">ทั้งหมด</ToggleGroupItem>
          <ToggleGroupItem value="draft">รอสร้าง PDF</ToggleGroupItem>
          <ToggleGroupItem value="pending_approval">รออนุมัติ</ToggleGroupItem>
          <ToggleGroupItem value="awaiting_payment">รอชำระ</ToggleGroupItem>
          <ToggleGroupItem value="paid">ชำระครบ</ToggleGroupItem>
          <ToggleGroupItem value="void">ยกเลิก</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowVoid(showVoid === "1" ? "0" : "1")} title={showVoid === "1" ? "ซ่อนใบแจ้งหนี้ที่ยกเลิกแล้ว" : "แสดงใบแจ้งหนี้ที่ยกเลิกแล้วในรายการ"}>
          {showVoid === "1" ? <EyeOffIcon /> : <EyeIcon />} {showVoid === "1" ? "ซ่อน Void" : "แสดง Void"}{voidCount > 0 && <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{voidCount}</span>}
        </Button>
        <div className="relative ml-auto w-full sm:w-56">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ค้นหาเลขที่ / ชื่อนักเรียน" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {can(me, "billing.view") && <SalesTaxDialog />}
        {can(me, "billing.manage") && <Button onClick={() => setEditing("new")}><PlusIcon /> สร้างใบแจ้งหนี้</Button>}
      </div>

      {/* owner 2026-10-07: a real table — number, date, student, grade, amounts and status each in their own column
          (fixed widths, so a long status never pushes the row out of line); scrolls inside the card on phones (BL-23) */}
      <TableShell minWidth={1080} cols={["136px", "92px", "120px", "76px", "auto", "120px", "104px", "130px", "130px"]}>
        <thead className={HEAD}>
          <tr>
            <SortHeader label="เลขที่" k="number" sort={sort} onSort={toggle} />
            <SortHeader label="สร้างเมื่อ" k="created" sort={sort} onSort={toggle} />
            <SortHeader label="นักเรียน" k="student" sort={sort} onSort={toggle} />
            <SortHeader label="ชั้น" k="grade" sort={sort} onSort={toggle} />
            <Th>รายการ</Th>
            <SortHeader label="ยอด" k="total" sort={sort} onSort={toggle} right />
            <Th right>จ่ายแล้ว</Th>
            <SortHeader label="สถานะ" k="status" sort={sort} onSort={toggle} />
            <Th>การส่ง / เงิน</Th>
          </tr>
        </thead>
        <tbody>
          {pg.rows.map(({ inv, total, paid, student, toConfirm }) => (
            <tr key={inv.id} onClick={() => setOpenId(inv.id)} data-focus={[Bill.canApprove(inv, me).ok && "invoice_approve", invoiceOverdue(inv, now) && "unpaid", paymentUnconfirmed(inv, now) && "unconfirmed"].filter(Boolean).join(" ") || undefined} className={ROW}>
              <td className="font-medium tabular-nums">{inv.number ? <MidText text={inv.number} /> : <span className="text-muted-foreground">—</span>}</td>
              <td className="truncate text-muted-foreground tabular-nums">{fmtDate(inv.createdAt.slice(0, 10))}</td>
              <td className="truncate">{student?.nickname ?? "—"}</td>
              <td>{student && <GradeCell grade={student.grade} tone={gradeTone(student.grade)} />}</td>
              <td className="truncate text-muted-foreground">{inv.lines.map((l) => courses.find((c) => c.id === l.courseId)?.name).filter(Boolean).join(", ") || (inv.busExtras?.length ? "ค่ารถเพิ่ม" : "ค่าอื่นๆ")}</td>
              <td className="text-right font-medium tabular-nums">{fmtMoney(total)}</td>
              <td className="text-right text-muted-foreground tabular-nums">{paid > 0 ? fmtMoney(paid) : "—"}</td>
              <td className="truncate"><Pill tone={invoiceTone(inv)}>{inv.pdf === "generating" ? "กำลังสร้าง PDF" : inv.pdf === "failed" ? "PDF ไม่สำเร็จ" : Bill.INVOICE_STATUS_LABEL[inv.status]}</Pill></td>
              <td className="truncate">
                {inv.delivery === "no_line" && <Pill tone="amber">ไม่ถึงผู้ปกครอง</Pill>}
                {inv.delivery === "failed" && <Pill tone="red">ส่ง LINE ไม่สำเร็จ</Pill>}
                {toConfirm && <Pill tone="violet">รอยืนยันเงิน</Pill>}
                {inv.delivery !== "no_line" && inv.delivery !== "failed" && !toConfirm && <span className="text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
          {visible.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">ไม่มีใบแจ้งหนี้ในหมวดนี้</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="ใบ" />

      <InvoiceSheet id={openId} slipMediaId={openId === params.get("open") ? slipFromChat : undefined} onClose={() => setOpenId(null)} onEdit={(inv) => { setOpenId(null); setEditing(inv) }} />
      {editing && (
        <InvoiceEditor
          invoice={editing === "new" ? undefined : editing}
          defaultStudentId={editing === "new" ? presetStudent : undefined}
          renewEntitlementId={editing === "new" ? renewFrom : undefined}
          onClose={() => setEditing(null)}
          onSaved={(inv) => { setEditing(null); setOpenId(inv.id) }}
        />
      )}
    </div>
  )
}
