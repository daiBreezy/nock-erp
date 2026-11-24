"use client"

import { useState } from "react"
import { CheckIcon, EllipsisIcon, ImageIcon, PencilIcon, XCircleIcon } from "lucide-react"
import { InfoTip } from "@/components/app/info-tip"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import { canRejectPayment } from "@/domain/rules/billing"
import type { ID, Payment, RejectedPayment } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { slipDataUrl } from "@/lib/image"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-24: what staff can do with a payment that is not confirmed yet — fix it (amount, date, Ref ID, change the slip image)
 * or reject it (approver, reason required). A confirmed payment is final: no menu.
 */
export function PaymentMenu({ invoiceId, branchId, payment }: { invoiceId: ID; branchId: ID; payment: Payment }) {
  const me = useStore((s) => s.me())
  const [editing, setEditing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const canReject = canRejectPayment(payment, me, branchId, "x").ok
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon-xs" variant="ghost" aria-label="จัดการรายการรับเงิน" title="แก้ไข / ปฏิเสธ" />}><EllipsisIcon /></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-max min-w-52">
          <DropdownMenuItem onClick={() => setEditing(true)}><PencilIcon /> แก้ไขรายการ / เปลี่ยนรูปสลิป</DropdownMenuItem>
          {canReject && <DropdownMenuItem variant="destructive" onClick={() => setRejecting(true)}><XCircleIcon /> ปฏิเสธรายการนี้ (Reject)</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      {editing && <EditPaymentDialog invoiceId={invoiceId} payment={payment} onClose={() => setEditing(false)} />}
      {rejecting && <RejectPaymentDialog invoiceId={invoiceId} payment={payment} onClose={() => setRejecting(false)} />}
    </>
  )
}

function EditPaymentDialog({ invoiceId, payment: p, onClose }: { invoiceId: ID; payment: Payment; onClose: () => void }) {
  const edit = useStore((s) => s.editPayment)
  const today = toDateStr(useNow(60_000))
  const shared = !!p.groupId
  const [method, setMethod] = useState(p.method)
  const [amount, setAmount] = useState(String(p.amount))
  const [paidOn, setPaidOn] = useState(p.paidOn ?? p.recordedAt.slice(0, 10))
  const [ref, setRef] = useState(p.reference ?? "")
  const [slip, setSlip] = useState<string | undefined>(p.slip)
  const [remark, setRemark] = useState(p.remark ?? "")
  const needRef = method === "transfer" && !ref.trim()
  const submit = () => {
    const r = edit(invoiceId, p.id, { method, amount: Number(amount), paidOn, reference: ref, remark, slip: slip ?? null })
    if (report(r, "บันทึกการแก้ไขแล้ว")) onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto lg:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PencilIcon className="size-4" /> แก้ไขรายการรับเงิน</DialogTitle>
          <DialogDescription>{shared ? "สลิปเดียวหลายใบ — แก้ Ref ID / รูปสลิป / วันที่ได้ (ใช้กับทุกใบบนสลิปนี้) · เปลี่ยนยอดหรือวิธีชำระไม่ได้ ให้ปฏิเสธรายการแล้วบันทึกใหม่" : "แก้ได้จนกว่าจะมีคนยืนยันยอด"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-xs">วิธีชำระ</Label>
            <NativeSelect value={method} disabled={shared} onChange={(e) => setMethod(e.target.value as "transfer" | "cash")} options={[{ value: "transfer", label: "โอน" }, { value: "cash", label: "เงินสด" }]} /></div>
          <div className="space-y-1"><Label className="text-xs">วันที่ชำระ</Label><Input type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">จำนวนเงินที่ได้รับ</Label><Input type="number" min={1} disabled={shared} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <div className="space-y-3 rounded-2xl border p-3">
          <div className="space-y-1">
            <Label className="text-xs">รูปสลิป</Label>
            <div className="flex items-center gap-3 rounded-2xl border border-dashed p-2 text-xs text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimise */}
              {slip ? <img src={slip} alt="สลิป" className="size-14 rounded-lg object-cover object-top" /> : <span className="grid size-14 place-items-center rounded-lg border border-dashed"><ImageIcon className="size-5" /></span>}
              <label className="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted">
                {slip ? "เปลี่ยนรูปสลิป" : "เลือกรูปสลิป"}
                <Input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setSlip(await slipDataUrl(f)) }} />
              </label>
              {slip && <Button size="xs" variant="ghost" className="text-danger" onClick={() => setSlip(undefined)}>เอารูปออก</Button>}
            </div>
          </div>
          {method === "transfer" && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs">เลขอ้างอิงในสลิป (Ref ID) * <InfoTip text="เลขอ้างอิง / เลขที่รายการที่พิมพ์บนสลิป — ผูกสลิปกับใบแจ้งหนี้นี้ · ในระบบจริงมี OCR อ่านเลขจากรูปสลิปให้อัตโนมัติ — ช่องนี้ยังกรอกเองได้เมื่อจำเป็น · ไม่มีเลขนี้ ยืนยันยอดเงินไม่ได้" /></Label>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} aria-invalid={needRef} placeholder="เลขอ้างอิง / เลขที่รายการ จากสลิป" />
            </div>
          )}
        </div>
        <div className="space-y-1"><Label className="text-xs">หมายเหตุ</Label><Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)" /></div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!(Number(amount) > 0) || needRef} onClick={submit}><CheckIcon /> บันทึกการแก้ไข</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectPaymentDialog({ invoiceId, payment: p, onClose }: { invoiceId: ID; payment: Payment; onClose: () => void }) {
  const reject = useStore((s) => s.rejectPayment)
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><XCircleIcon className="size-4 text-danger" /> ปฏิเสธรายการรับเงิน {fmtMoney(p.amount)}</DialogTitle>
          <DialogDescription>รายการนี้จะออกจากใบแจ้งหนี้ (เก็บไว้เป็นประวัติ) — คนบันทึกต้องบันทึกรับเงินใหม่{p.groupId ? " · สลิปนี้ใช้กับหลายใบ จะถูกปฏิเสธทุกใบพร้อมกัน" : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label className="text-xs">เหตุผลที่ปฏิเสธ *</Label>
          <Textarea rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ยอดในสลิปไม่ตรง · สลิปไม่ชัด · สลิปของคนอื่น" aria-invalid={!reason.trim()} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ไม่ปฏิเสธ</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => { if (report(reject(invoiceId, p.id, reason), "ปฏิเสธรายการรับเงินแล้ว")) onClose() }}>ยืนยันปฏิเสธ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** the payments the approver rejected — history under the payment step */
export function RejectedPayments({ list, who }: { list: RejectedPayment[]; who: (id?: ID) => string }) {
  if (!list.length) return null
  return (
    <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
      {list.map((r) => (
        <li key={r.id} className="rounded-lg bg-danger-soft/40 px-2.5 py-1.5">
          <span className="font-medium text-danger-ink">ปฏิเสธแล้ว</span> {fmtMoney(r.amount)}{r.reference && ` · Ref ${r.reference}`} · {fmtDate(r.rejectedAt.slice(0, 10))} โดย {who(r.rejectedBy)}
          <br />เหตุผล: {r.reason}
        </li>
      ))}
    </ul>
  )
}
