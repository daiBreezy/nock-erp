"use client"

import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { SalesTaxDialog } from "@/components/billing/sales-tax-dialog"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EyeIcon, EyeOffIcon, PlusIcon, SearchIcon, SendIcon, WalletIcon, type LucideIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
type Filter = "all" | "pending" | "draft" | "pending_approval" | "awaiting_payment" | "to_confirm" | "paid" | "void"

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
  const me = useStore((s) => s.me())
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  // owner 2026-10-06: sync to the URL (?filter=) so a reload or shared link keeps it — the ?open=/?new=/?renew=/?slip= deep-links above are untouched
  const [filter, setFilter] = useQueryState<Filter>("filter", "all")
  const [showVoid, setShowVoid] = useQueryState<"0" | "1">("void", "0")
  const [showDone, setShowDone] = useQueryState<"0" | "1">("done", "1")
  const [q, setQ] = useState("")
  const [openId, setOpenId] = useState<string | null>(() => params.get("open"))
  // ?new=<studentId> opens the editor pre-filled (from the student panel)
  const [editing, setEditing] = useState<Invoice | "new" | null>(() => (params.get("new") ? "new" : null))
  const presetStudent = params.get("new") ?? undefined
  const renewFrom = params.get("renew") ?? undefined
  const slipFromChat = params.get("slip") ?? undefined

  const { sort, toggle } = useSort<BillSort>("created", true)
  const byGrade = gradeCompare(branch.grades)
  // owner 2026-10-09: Director / Area Manager can list several branches at once — totals use each invoice's own branch
  const scope = useBranchScope()
  const allBranches = useStore((s) => s.branches)
  const now = useNow()
  const rows = invoices
    .filter((i) => scope.ids.includes(i.branchId))
    .map((i) => {
      const total = Bill.invoiceTotals(i, { branch: allBranches.find((b) => b.id === i.branchId) ?? branch, courses, classes, holidays }).total
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
  const doneCount = rows.filter((r) => r.inv.status === "paid").length
  /** still needs someone to act: not yet PDF / approved / paid, or money in but not confirmed */
  const isPending = (r: (typeof rows)[number]) => ["draft", "pending_approval", "approved", "sent"].includes(r.inv.status) || r.toConfirm
  const pendingCount = rows.filter(isPending).length
  const visible = rows
    // owner 2026-10-07: Done (paid) and Void are show / hide toggles — picking that status on a card always shows it
    .filter((r) => showVoid === "1" || filter === "void" || r.inv.status !== "void")
    .filter((r) => showDone === "1" || filter === "paid" || r.inv.status !== "paid" || r.toConfirm)
    .filter((r) => {
      if (filter === "all") return true
      if (filter === "pending") return isPending(r)
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
        {scope.select}
        {/* owner 2026-10-07: All / Pending, and Done / Void as show-hide toggles (the cards above still filter one status) */}
        <ToggleGroup value={[filter]} onValueChange={(v) => v[0] && setFilter(v[0] as Filter)} variant="outline" size="sm">
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="pending">Pending{pendingCount > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800 tabular-nums">{pendingCount}</span>}</ToggleGroupItem>
        </ToggleGroup>
        <span className="h-5 w-px bg-border" />
        <ShowToggle label="Done" on={showDone === "1"} count={doneCount} onChange={(v) => setShowDone(v ? "1" : "0")} />
        <ShowToggle label="Void" on={showVoid === "1"} count={voidCount} onChange={(v) => setShowVoid(v ? "1" : "0")} />
        <div className="relative ml-auto w-full sm:w-56">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ค้นหาเลขที่ / ชื่อนักเรียน" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {can(me, "billing.view") && <SalesTaxDialog />}
        {can(me, "billing.manage") && <Button onClick={() => setEditing("new")}><PlusIcon /> สร้างใบแจ้งหนี้</Button>}
      </div>

      {/* owner 2026-10-07: a real table — number, date, student, grade, amounts and status each in their own column
          (fixed widths, so a long status never pushes the row out of line); scrolls inside the card on phones (BL-23) */}
      <TableShell minWidth={1080} cols={["136px", "100px", "140px", "76px", "auto", "120px", "112px", "156px"]}>
        <thead className={HEAD}>
          <tr>
            <SortHeader label="เลขที่" k="number" sort={sort} onSort={toggle} />
            <SortHeader label="สร้างเมื่อ" k="created" sort={sort} onSort={toggle} />
            <SortHeader label="นักเรียน" k="student" sort={sort} onSort={toggle} />
            <SortHeader label="ชั้น" k="grade" sort={sort} onSort={toggle} />
            <Th>รายการ</Th>
            <SortHeader label="ยอด" k="total" sort={sort} onSort={toggle} right />
            <Th right>จ่ายแล้ว</Th>
            <SortHeader label="สถานะ" k="status" sort={sort} onSort={toggle} right />
          </tr>
        </thead>
        <tbody>
          {pg.rows.map(({ inv, total, paid, student, toConfirm }) => (
            <tr key={inv.id} onClick={() => setOpenId(inv.id)} data-focus={[Bill.canApprove(inv, me).ok && "invoice_approve", invoiceOverdue(inv, now) && "unpaid", paymentUnconfirmed(inv, now) && "unconfirmed"].filter(Boolean).join(" ") || undefined} className={ROW}>
              <td className="font-medium tabular-nums">{inv.number ? <MidText text={inv.number} /> : <span className="text-muted-foreground">—</span>}</td>
              <td className="truncate text-muted-foreground tabular-nums">{fmtDate(inv.createdAt.slice(0, 10))}</td>
              <td className="truncate">{student?.nickname ?? "—"}{scope.multi && <span className="ml-1.5 align-middle"><BranchCode code={scope.code(inv.branchId)} /></span>}</td>
              <td>{student && <GradeCell grade={student.grade} tone={gradeTone(student.grade)} />}</td>
              <td className="truncate text-muted-foreground">{inv.lines.map((l) => courses.find((c) => c.id === l.courseId)?.name).filter(Boolean).join(", ") || (inv.busExtras?.length ? "ค่ารถเพิ่ม" : "ค่าอื่นๆ")}</td>
              <td className="text-right font-medium tabular-nums">{fmtMoney(total)}</td>
              <td className="text-right text-muted-foreground tabular-nums">{paid > 0 ? fmtMoney(paid) : "—"}</td>
              <td>
                {/* owner 2026-10-07: the old "การส่ง / เงิน" column folded in — a small icon after the status, hover = what's wrong */}
                <span className="flex items-center justify-end gap-1">
                  <Pill tone={invoiceTone(inv)}>{inv.pdf === "generating" ? "กำลังสร้าง PDF" : inv.pdf === "failed" ? "PDF ไม่สำเร็จ" : Bill.INVOICE_STATUS_LABEL[inv.status]}</Pill>
                  {inv.delivery === "no_line" && <Flag icon={SendIcon} tone="text-amber-600" text="ไม่ถึงผู้ปกครอง — ครอบครัวยังไม่ผูก LINE ต้องส่งใบเอง" />}
                  {inv.delivery === "failed" && <Flag icon={SendIcon} tone="text-red-600" text="ส่ง LINE ไม่สำเร็จ — เช่น ผู้ปกครอง block OA" />}
                  {toConfirm && <Flag icon={WalletIcon} tone="text-violet-600" text="รอยืนยันเงิน — บันทึกรับเงินแล้ว รออีกคนตรวจยืนยัน" />}
                </span>
              </td>
            </tr>
          ))}
          {visible.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">ไม่มีใบแจ้งหนี้ในหมวดนี้</td></tr>}
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

/** Done / Void show-hide toggle: pressed = shown in the list, with how many there are */
function ShowToggle({ label, on, count, onChange }: { label: string; on: boolean; count: number; onChange: (v: boolean) => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => onChange(!on)} title={on ? `ซ่อน ${label}` : `แสดง ${label}`}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors", on ? "border-foreground/20 bg-muted font-medium" : "border-dashed text-muted-foreground hover:bg-muted/50")}>
      {on ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}{label}
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  )
}

/** a small warning icon after the status; hover says what it means */
function Flag({ icon: Icon, tone, text }: { icon: LucideIcon; tone: string; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn("grid size-5 cursor-default place-items-center", tone)} aria-label={text} />}><Icon className="size-3.5" /></TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
