"use client"

import { useState } from "react"
import { CheckIcon, ImageIcon, UploadIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtMoney, toDateStr } from "@/domain/dates"
import type { ID, Invoice } from "@/domain/types"
import { report } from "@/lib/feedback"
import { slipDataUrl } from "@/lib/image"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { Checkbox } from "@/components/ui/checkbox"
import { InfoTip } from "@/components/app/info-tip"

export interface PayableSibling { id: ID; number: string; nickname: string; owed: number }

/**
 * Upload Pay Slip (owner 2026-11-05): payment method · date · amount received (with what is still owed) · slip image ·
 * transaction ref · remarks. Opens from the "+" tile on the invoice's payment step. One slip can pay siblings' invoices too.
 */
export function PaySlipDialog({ inv, owed, siblings, initialSlip, allTicked, onClose }: { inv: Invoice; owed: number; siblings: PayableSibling[]; initialSlip?: string; /** opened from the family set's "รับเงินทั้งชุด": every sibling starts ticked, the amount is the whole set */ allTicked?: boolean; onClose: () => void }) {
  const pay = useStore((s) => s.recordPayment)
  const payGroup = useStore((s) => s.recordGroupPayment)
  const today = toDateStr(useNow(60_000))
  const [method, setMethod] = useState<"transfer" | "cash">("transfer")
  const [paidOn, setPaidOn] = useState(today)
  const [withIds, setWithIds] = useState<ID[]>(() => (allTicked ? siblings.map((x) => x.id) : []))
  const owedAll = owed + siblings.filter((x) => withIds.includes(x.id)).reduce((a, x) => a + x.owed, 0)
  const [amount, setAmount] = useState(() => String(owed + (allTicked ? siblings.reduce((a, x) => a + x.owed, 0) : 0)))
  const [slip, setSlip] = useState<string | undefined>(initialSlip)
  const [ref, setRef] = useState("")
  const [remark, setRemark] = useState("")
  const toggle = (id: ID) => {
    const next = withIds.includes(id) ? withIds.filter((x) => x !== id) : [...withIds, id]
    setWithIds(next)
    setAmount(String(owed + siblings.filter((x) => next.includes(x.id)).reduce((a, x) => a + x.owed, 0)))
  }
  const submit = () => {
    const p = { amount: Number(amount), method, reference: ref, slip, paidOn, remark: remark.trim() || undefined }
    const r = withIds.length ? payGroup([inv.id, ...withIds], p) : pay(inv.id, p)
    if (report(r, withIds.length ? "บันทึกรับเงินแล้ว (สลิปเดียวหลายใบ) — รอคนอื่นยืนยันยอด" : "บันทึกรับเงินแล้ว — รอคนอื่นยืนยันยอด")) onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto lg:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UploadIcon className="size-4" /> อัปโหลดสลิปการชำระเงิน</DialogTitle>
          <DialogDescription className="sr-only">บันทึกรับเงินและแนบสลิป</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-xs">วิธีชำระ</Label>
            <NativeSelect value={method} onChange={(e) => setMethod(e.target.value as "transfer" | "cash")} options={[{ value: "transfer", label: "โอน" }, { value: "cash", label: "เงินสด" }]} /></div>
          <div className="space-y-1"><Label className="text-xs">วันที่ชำระ</Label><Input type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">จำนวนเงินที่ได้รับ</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">ยอดค้างชำระ: {fmtMoney(owedAll)}</p></div>
        </div>
        {siblings.length > 0 && (
          <div className="space-y-1 rounded-2xl bg-muted/40 p-2">
            <p className="text-xs font-medium">จ่ายรวมกับใบของพี่น้อง (สลิปเดียว)</p>
            {siblings.map((x) => (
              <label key={x.id} className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox checked={withIds.includes(x.id)} onCheckedChange={() => toggle(x.id)} />
                <span className="font-mono">{x.number}</span><span>{x.nickname}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">ค้าง {fmtMoney(x.owed)}</span>
              </label>
            ))}
            {withIds.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">ยอดในสลิปต้องเท่ากับยอดค้างรวม {fmtMoney(owedAll)}</p>
              </>
            )}
          </div>
        )}
        <div className="space-y-3 rounded-2xl border p-3">
          <div className="space-y-1">
            <Label className="text-xs">รูปสลิป (ไม่บังคับ)</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed p-2 text-xs text-muted-foreground hover:bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimise */}
              {slip ? <img src={slip} alt="สลิป" className="size-14 rounded-lg object-cover" /> : <span className="grid size-14 place-items-center rounded-lg border border-dashed"><ImageIcon className="size-5" /></span>}
              {slip ? "เปลี่ยนรูปสลิป" : "เลือกรูปสลิป"}
              <Input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setSlip(await slipDataUrl(f)) }} />
            </label>
          </div>
          {/* owner 2026-11-24: every transfer carries the Ref ID printed on its slip — it ties the invoice to the slip; without it the amount cannot be confirmed */}
          {method === "transfer" && (
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs">เลขอ้างอิงในสลิป (Ref ID) * <InfoTip text="เลขอ้างอิง / เลขที่รายการที่พิมพ์บนสลิป — ผูกสลิปกับใบแจ้งหนี้นี้ · ในระบบจริงมี OCR อ่านเลขจากรูปสลิปให้อัตโนมัติ — ช่องนี้ยังกรอกเองได้เมื่อจำเป็น · ไม่มีเลขนี้ ยืนยันยอดเงินไม่ได้" /></Label>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} aria-invalid={!ref.trim()} placeholder="เลขอ้างอิง / เลขที่รายการ จากสลิป" />
            </div>
          )}
        </div>
        <div className="space-y-1"><Label className="text-xs">หมายเหตุ</Label><Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)" /></div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!(Number(amount) > 0) || (method === "transfer" && !ref.trim())} onClick={submit}><CheckIcon /> บันทึกรับเงิน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
