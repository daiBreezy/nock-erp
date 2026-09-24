"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"
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
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

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
  const packages = useStore((s) => s.packages)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const [filter, setFilter] = useState<Filter>("all")
  const [q, setQ] = useState("")
  const [openId, setOpenId] = useState<string | null>(() => params.get("open"))
  // ?new=<studentId> opens the editor pre-filled (from the student panel)
  const [editing, setEditing] = useState<Invoice | "new" | null>(() => (params.get("new") ? "new" : null))
  const presetStudent = params.get("new") ?? undefined

  const ctx = { branch, courses, packages, classes, holidays }
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

  const visible = rows
    .filter((r) => {
      if (filter === "all") return true
      if (filter === "awaiting_payment") return ["approved", "sent"].includes(r.inv.status)
      if (filter === "to_confirm") return r.toConfirm
      return r.inv.status === filter
    })
    .filter((r) => !q || `${r.inv.number} ${r.student?.nickname} ${r.student?.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.inv.createdAt.localeCompare(a.inv.createdAt))

  return (
    <div className="mx-auto max-w-6xl space-y-4">
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
          <ToggleGroupItem value="draft">ร่าง</ToggleGroupItem>
          <ToggleGroupItem value="pending_approval">รออนุมัติ</ToggleGroupItem>
          <ToggleGroupItem value="awaiting_payment">รอชำระ</ToggleGroupItem>
          <ToggleGroupItem value="paid">ชำระครบ</ToggleGroupItem>
          <ToggleGroupItem value="void">ยกเลิก</ToggleGroupItem>
        </ToggleGroup>
        <div className="relative ml-auto w-full sm:w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ค้นหาเลขที่ / ชื่อนักเรียน" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {can(me, "billing.manage") && <Button onClick={() => setEditing("new")}><PlusIcon /> สร้างใบแจ้งหนี้</Button>}
      </div>

      {/* table on desktop, stacked cards on narrow screens (no horizontal overflow — BL-23) */}
      <div className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        <div className="hidden grid-cols-[1.3fr_1.2fr_1.5fr_0.8fr_1.1fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
          <span>เลขที่</span><span>นักเรียน</span><span>รายการ</span><span className="text-right">ยอด</span><span>สถานะ</span>
        </div>
        {visible.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">ไม่มีใบแจ้งหนี้ในหมวดนี้</p>}
        {visible.map(({ inv, total, paid, student, toConfirm }) => (
          <button key={inv.id} onClick={() => setOpenId(inv.id)} className="grid w-full gap-1 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-muted/40 md:grid-cols-[1.3fr_1.2fr_1.5fr_0.8fr_1.1fr] md:items-center md:gap-3">
            <span className="font-medium tabular-nums">{inv.number ?? <span className="text-muted-foreground">ร่าง · ยังไม่มีเลข</span>}<span className="block text-xs font-normal text-muted-foreground">{fmtDate(inv.createdAt.slice(0, 10))}</span></span>
            <span>{student?.nickname} <span className="text-xs text-muted-foreground">{student?.grade}</span></span>
            <span className="truncate text-muted-foreground">{courses.find((c) => c.id === inv.course?.courseId)?.name ?? "ค่าอื่นๆ"}</span>
            <span className="tabular-nums md:text-right">{fmtMoney(total)}{paid > 0 && paid < total && <span className="block text-xs text-muted-foreground">จ่ายแล้ว {fmtMoney(paid)}</span>}</span>
            <span className="flex flex-wrap gap-1">
              <Pill tone={invoiceTone(inv)}>{inv.pdf === "generating" ? "กำลังสร้าง PDF" : inv.pdf === "failed" ? "PDF ไม่สำเร็จ" : Bill.INVOICE_STATUS_LABEL[inv.status]}</Pill>
              {inv.delivery === "no_line" && <Pill tone="amber">ไม่ถึงผู้ปกครอง</Pill>}
              {toConfirm && <Pill tone="violet">รอยืนยันเงิน</Pill>}
            </span>
          </button>
        ))}
      </div>

      <InvoiceSheet id={openId} onClose={() => setOpenId(null)} onEdit={(inv) => { setOpenId(null); setEditing(inv) }} />
      {editing && (
        <InvoiceEditor
          invoice={editing === "new" ? undefined : editing}
          defaultStudentId={editing === "new" ? presetStudent : undefined}
          onClose={() => setEditing(null)}
          onSaved={(inv) => { setEditing(null); setOpenId(inv.id) }}
        />
      )}
    </div>
  )
}
