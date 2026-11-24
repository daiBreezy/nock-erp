"use client"

import { useState } from "react"
import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InfoTip } from "@/components/app/info-tip"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-24: a transfer whose pay slip has no Ref ID yet — it cannot be confirmed until the Ref ID is typed.
 * (The real system reads it from the slip with OCR; staff can always type or fix it here.)
 */
export function PaymentRefInput({ invoiceId, paymentId }: { invoiceId: ID; paymentId: ID }) {
  const set = useStore((s) => s.setPaymentReference)
  const [v, setV] = useState("")
  return (
    <div className="flex w-full items-center gap-1.5">
      <Input className="h-8 min-w-0 flex-1 text-xs" value={v} onChange={(e) => setV(e.target.value)} aria-label="เลขอ้างอิงในสลิป (Ref ID)" placeholder="Ref ID จากสลิป *"
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) report(set(invoiceId, paymentId, v), "บันทึกเลขอ้างอิงแล้ว") }} />
      <InfoTip text="ต้องมีเลขอ้างอิงจากสลิปก่อนยืนยันยอดเงิน — ในระบบจริงมี OCR อ่านให้ ช่องนี้กรอกเองได้เมื่อจำเป็น" />
      <Button size="xs" disabled={!v.trim()} onClick={() => report(set(invoiceId, paymentId, v), "บันทึกเลขอ้างอิงแล้ว")}><CheckIcon /> บันทึก</Button>
    </div>
  )
}
