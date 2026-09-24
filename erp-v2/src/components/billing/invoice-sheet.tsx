"use client"

import { useState } from "react"
import { AlertTriangleIcon, CheckIcon, CircleIcon, FileTextIcon, Loader2Icon, PencilIcon, RefreshCwIcon, SendIcon, XCircleIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime, fmtMoney, fmtMonth } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import type { ID, Invoice } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useShallow } from "zustand/react/shallow"
import { useStore } from "@/store/store"
import { invoiceTone } from "./status"

export function InvoiceSheet({ id, onClose, onEdit }: { id: ID | null; onClose: () => void; onEdit: (inv: Invoice) => void }) {
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">{id && <Body id={id} onEdit={onEdit} />}</SheetContent>
    </Sheet>
  )
}

function Body({ id, onEdit }: { id: ID; onEdit: (inv: Invoice) => void }) {
  const inv = useStore((s) => s.invoices.find((x) => x.id === id))
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const courses = useStore((s) => s.courses)
  const packages = useStore((s) => s.packages)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const act = useStore(useShallow((s) => ({ gen: s.generatePdf, approve: s.approveInvoice, send: s.sendInvoice, void: s.voidInvoice, pay: s.recordPayment, confirm: s.confirmPayment })))
  const [note, setNote] = useState(inv?.noteToParent ?? "")
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"transfer" | "cash">("transfer")
  const [ref, setRef] = useState("")
  if (!inv) return null

  const totals = Bill.invoiceTotals(inv, { branch, courses, packages, classes, holidays })
  const stu = students.find((s) => s.id === inv.studentId)
  const fam = families.find((f) => f.id === stu?.familyId)
  const course = courses.find((c) => c.id === inv.course?.courseId)
  const klass = classes.find((k) => k.id === inv.course?.classId)
  const who = (uid?: ID) => staff.find((s) => s.id === uid)?.nickname ?? "—"
  const paidConfirmed = Bill.paidAmount(inv)
  const paidAll = inv.payments.reduce((a, p) => a + p.amount, 0)
  const approveCheck = Bill.canApprove(inv, me)
  const manage = can(me, "billing.manage")

  const steps: { label: string; state: "done" | "current" | "todo" | "warn"; detail: string }[] = [
    { label: "สร้างใบ", state: "done", detail: `${who(inv.createdBy)} · ${fmtDateTime(inv.createdAt)}` },
    {
      label: "สร้าง PDF + ออกเลขที่",
      state: inv.pdf === "ready" ? "done" : inv.pdf === "failed" ? "warn" : inv.status === "void" ? "todo" : "current",
      detail: inv.pdf === "ready" ? inv.number! : inv.pdf === "generating" ? "กำลังสร้าง…" : inv.pdf === "failed" ? "สร้างไม่สำเร็จ — กดลองใหม่" : "ยังเป็นร่าง (ยังไม่มีเลขที่)",
    },
    {
      label: "อนุมัติ (คนอื่นที่ไม่ใช่คนสร้าง)",
      state: inv.approvedBy ? "done" : inv.status === "pending_approval" ? "current" : "todo",
      detail: inv.approvedBy ? `อนุมัติโดย ${who(inv.approvedBy)}` : inv.status === "pending_approval" ? "รออนุมัติ" : "—",
    },
    {
      label: "ส่งถึงผู้ปกครอง",
      state: inv.delivery === "delivered" ? "done" : inv.delivery === "no_line" ? "warn" : inv.status === "approved" ? "current" : "todo",
      detail: inv.delivery === "delivered" ? `ส่ง LINE แล้ว · ${fmtDateTime(inv.sentAt!)}` : inv.delivery === "no_line" ? "ยังไม่ถึงผู้ปกครอง — ไม่มี LINE (ต้องส่งทางอื่น)" : "—",
    },
    {
      label: "รับเงิน (บันทึก + ยืนยันโดยอีกคน)",
      state: inv.status === "paid" ? "done" : paidAll > 0 ? "current" : "todo",
      detail: inv.payments.length ? `ยืนยันแล้ว ${fmtMoney(paidConfirmed)} / ${fmtMoney(totals.total)}` : "—",
    },
    { label: "ใบเสร็จ + เข้าคลาสอัตโนมัติ", state: inv.receiptNumber ? "done" : "todo", detail: inv.receiptNumber ?? "—" },
  ]

  return (
    <>
      <SheetHeader className="border-b pb-3">
        <div className="flex items-center gap-2 pr-8">
          <Pill tone={invoiceTone(inv)}>{Bill.INVOICE_STATUS_LABEL[inv.status]}</Pill>
          {inv.delivery === "no_line" && <Pill tone="amber">ไม่มี LINE</Pill>}
        </div>
        <SheetTitle className="text-lg">{inv.number ?? "ใบร่าง (ยังไม่มีเลขที่)"}</SheetTitle>
        <SheetDescription>
          {stu?.nickname} ({stu?.grade}) · {fam?.name ?? "ยังไม่ผูกครอบครัว"}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        {inv.status === "void" && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">ยกเลิกแล้ว: {inv.voidReason}</p>}

        <section className="rounded-lg border">
          <table className="w-full text-sm tabular-nums">
            <tbody className="divide-y">
              {course && totals.quote && (
                <>
                  <tr>
                    <td className="px-3 py-2" colSpan={2}>
                      <div className="font-medium">{course.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {klass?.name} · {fmtDate(totals.quote.from)} → {fmtDate(totals.quote.to, { year: true })} · {totals.quote.sessions.length} คาบ · {totals.quote.hours} ชม.
                        {totals.quote.skipped.length > 0 && ` · ข้ามวันหยุด ${totals.quote.skipped.map((d) => fmtDate(d)).join(", ")}`}
                      </div>
                    </td>
                  </tr>
                  {totals.quote.periods.map((p) => (
                    <tr key={p.month} className="text-muted-foreground">
                      <td className="px-3 py-1 pl-6">{fmtMonth(p.month + "-01")} · {p.sessions.length} คาบ ({Math.round(p.factor * 100)}%)</td>
                      <td className="px-3 py-1 text-right">{fmtMoney(p.amount)}</td>
                    </tr>
                  ))}
                </>
              )}
              {totals.bus > 0 && <tr><td className="px-3 py-1.5">ค่ารถ ({inv.bus.reduce((a, l) => a + +l.pickup + +l.dropoff, 0)} เที่ยว)</td><td className="px-3 py-1.5 text-right">{fmtMoney(totals.bus)}</td></tr>}
              {totals.book > 0 && <tr><td className="px-3 py-1.5">ค่าหนังสือ</td><td className="px-3 py-1.5 text-right">{fmtMoney(totals.book)}</td></tr>}
              {totals.advance > 0 && <tr><td className="px-3 py-1.5">ค่าอื่นๆ</td><td className="px-3 py-1.5 text-right">{fmtMoney(totals.advance)}</td></tr>}
              {totals.concession > 0 && <tr className="text-emerald-700"><td className="px-3 py-1.5">ส่วนลดพิเศษ · {inv.concession?.remark}</td><td className="px-3 py-1.5 text-right">−{fmtMoney(totals.concession)}</td></tr>}
              <tr className="font-semibold"><td className="px-3 py-2">ยอดรวม</td><td className="px-3 py-2 text-right text-base">{fmtMoney(totals.total)}</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">ขั้นตอน</h3>
          <ol className="space-y-2">
            {steps.map((s) => (
              <li key={s.label} className="flex gap-2.5">
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", s.state === "done" ? "bg-emerald-600 text-white" : s.state === "current" ? "bg-sky-600 text-white" : s.state === "warn" ? "bg-amber-500 text-white" : "border text-muted-foreground")}>
                  {s.state === "done" ? <CheckIcon className="size-3" /> : s.state === "warn" ? <AlertTriangleIcon className="size-3" /> : <CircleIcon className="size-2" />}
                </span>
                <div>
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- next action for the current state ---------- */}
        <section className="space-y-2 rounded-lg border p-3">
          {inv.status === "draft" && manage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(inv)}><PencilIcon /> แก้ไข</Button>
              <Button size="sm" disabled={inv.pdf === "generating"} onClick={() => report(act.gen(inv.id), (v) => `กำลังสร้าง PDF · เลขที่ ${v.number}`)}>
                {inv.pdf === "generating" ? <Loader2Icon className="animate-spin" /> : inv.pdf === "failed" ? <RefreshCwIcon /> : <FileTextIcon />}
                {inv.pdf === "generating" ? "กำลังสร้าง PDF…" : inv.pdf === "failed" ? "ลองสร้าง PDF อีกครั้ง" : "สร้าง PDF"}
              </Button>
            </div>
          )}
          {inv.status === "pending_approval" && (
            approveCheck.ok ? (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => report(act.approve(inv.id), "อนุมัติแล้ว — พร้อมส่งผู้ปกครอง")}><CheckIcon /> อนุมัติ PDF</Button>
                {manage && <Button size="sm" variant="outline" onClick={() => onEdit(inv)}><PencilIcon /> แก้ (กลับเป็นร่าง)</Button>}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{approveCheck.error}</p>
                {manage && <Button size="sm" variant="outline" onClick={() => onEdit(inv)}><PencilIcon /> แก้ (กลับเป็นร่าง)</Button>}
              </div>
            )
          )}
          {(inv.status === "approved" || (inv.status === "sent" && inv.delivery === "no_line")) && manage && (
            <div className="space-y-2">
              <Label className="text-xs">ข้อความถึงผู้ปกครอง *</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ค่าเรียนเดือนตุลาคม ชำระภายใน 5 ต.ค." />
              {!fam?.parents.some((p) => p.lineLinked) && <p className="text-xs text-amber-700">ผู้ปกครองยังไม่ผูก LINE — ระบบจะบันทึกว่าส่งแล้วแต่ &quot;ยังไม่ถึงผู้ปกครอง&quot; ต้องส่งทางอื่น</p>}
              <Button size="sm" disabled={!note.trim()} onClick={() => report(act.send(inv.id, note), (v) => (v.delivered ? "ส่งทาง LINE แล้ว" : "บันทึกแล้ว แต่ยังไม่ถึงผู้ปกครอง (ไม่มี LINE)"))}>
                <SendIcon /> {inv.status === "sent" ? "ส่งอีกครั้ง" : "ส่งผู้ปกครอง"}
              </Button>
            </div>
          )}
          {(inv.status === "approved" || inv.status === "sent") && manage && paidAll < totals.total && (
            <div className="space-y-2 border-t pt-2">
              <Label className="text-xs">บันทึกรับเงิน (ค้าง {fmtMoney(totals.total - paidAll)})</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" min={1} placeholder="จำนวนเงิน" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <NativeSelect value={method} onChange={(e) => setMethod(e.target.value as "transfer" | "cash")} options={[{ value: "transfer", label: "โอน" }, { value: "cash", label: "เงินสด" }]} />
                <Input placeholder="เลขอ้างอิง/สลิป" value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
              <Button size="sm" variant="secondary" onClick={() => report(act.pay(inv.id, { amount: Number(amount), method, reference: ref }), "บันทึกรับเงินแล้ว — รอคนอื่นยืนยันยอด") && (setAmount(""), setRef(""))}>บันทึกรับเงิน</Button>
            </div>
          )}
          {inv.status === "paid" && <p className="text-sm text-emerald-700">ชำระครบ · ใบเสร็จ {inv.receiptNumber} · นักเรียนถูกเพิ่มเข้าคลาสตามช่วงที่จ่ายแล้ว</p>}
          {inv.status === "void" && <p className="text-sm text-muted-foreground">ใบนี้ถูกยกเลิก</p>}
        </section>

        {inv.payments.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">การรับเงิน</h3>
            <ul className="divide-y rounded-lg border text-sm">
              {inv.payments.map((p) => {
                const c = Bill.canConfirmPayment(p, me)
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 p-2.5">
                    <span className="font-medium tabular-nums">{fmtMoney(p.amount)}</span>
                    <span className="text-muted-foreground">{p.method === "cash" ? "เงินสด" : "โอน"} {p.reference && `· ${p.reference}`}</span>
                    <span className="text-xs text-muted-foreground">บันทึกโดย {who(p.recordedBy)}</span>
                    <span className="ml-auto">
                      {p.confirmedBy ? (
                        <Pill tone="green">ยืนยันโดย {who(p.confirmedBy)}</Pill>
                      ) : c.ok ? (
                        <Button size="xs" onClick={() => report(act.confirm(inv.id, p.id), (v) => (v.paid ? "ยืนยันแล้ว · ชำระครบ ออกใบเสร็จ + เพิ่มเข้าคลาสแล้ว" : "ยืนยันยอดแล้ว"))}>ยืนยันยอด</Button>
                      ) : (
                        <Pill tone="amber" className="whitespace-normal">รอคนอื่นยืนยัน</Pill>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {manage && inv.status !== "void" && inv.status !== "paid" && (
          <section>
            {!voiding ? (
              <Button size="sm" variant="ghost" className="text-red-700" onClick={() => setVoiding(true)}><XCircleIcon /> ยกเลิกใบแจ้งหนี้</Button>
            ) : (
              <div className="space-y-2 rounded-lg border border-red-200 p-3">
                <Label className="text-xs">เหตุผลการยกเลิก *</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ใส่คอร์สผิด จะออกใบใหม่" />
                {inv.payments.length > 0 && <p className="text-xs text-red-700">มีการรับเงินแล้ว ยกเลิกไม่ได้</p>}
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setVoiding(false)}>ไม่ยกเลิก</Button>
                  <Button size="sm" variant="destructive" disabled={!reason.trim() || inv.payments.length > 0} onClick={() => report(act.void(inv.id, reason), "ยกเลิกใบแจ้งหนี้แล้ว") && setVoiding(false)}>ยืนยันยกเลิก</Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
