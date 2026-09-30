"use client"

import { useState } from "react"
import { BusIcon, PlusIcon, TrashIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addDays, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import { billedOn, busAddOnAmount } from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import { busRate } from "@/domain/rules/settings"
import type { Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Day = { date: string; pickup: boolean; dropoff: boolean }

/**
 * Extra bus days after paying (Liclass, owner 2026-09-30): the admin adds them here, the bus runs right away and the
 * charge waits for the student's next invoice (or an invoice for the bus only). Fewer bus days are never refunded.
 */
export function BusAddOns({ stu }: { stu: Student }) {
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const branch = useStore((s) => s.branches.find((b) => b.id === stu.branchId)!)
  const addOns = useStore((s) => s.busAddOns).filter((a) => a.studentId === stu.id).sort((a, b) => b.date.localeCompare(a.date))
  const invoices = useStore((s) => s.invoices)
  const add = useStore((s) => s.addBusAddOns)
  const remove = useStore((s) => s.removeBusAddOn)
  const today = toDateStr(useNow(60_000))
  const busFees = branch.fees.filter((f) => f.kind === "bus")
  const manage = can(me, "billing.manage")

  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<Day[]>([])
  const [feeId, setFeeId] = useState(busFees[0]?.id ?? "")
  const [note, setNote] = useState("")
  const rate = busRate(branch, feeId)
  const start = () => { setDays([{ date: addDays(today, 1), pickup: true, dropoff: true }]); setNote(""); setOpen(true) }
  const patch = (i: number, p: Partial<Day>) => setDays((ds) => ds.map((d, j) => (j === i ? { ...d, ...p } : d)))
  const pending = addOns.filter((a) => !billedOn(a.id, invoices))
  const total = days.reduce((a, d) => a + busAddOnAmount(d, rate), 0)

  const save = () => {
    const r = add(stu.id, days, feeId || null, note)
    if (report(r, r.ok ? `เพิ่มรอบรถ ${r.value.count} วัน · ${fmtMoney(r.value.amount)} รอเรียกเก็บในใบถัดไป` : "")) setOpen(false)
  }

  return (
    <section className="space-y-2 rounded-2xl p-3 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <BusIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">รอบรถเพิ่ม</h3>
        {pending.length > 0 && <Pill tone="amber">รอเรียกเก็บ {fmtMoney(pending.reduce((a, x) => a + x.amount, 0))}</Pill>}
        {manage && !open && <Button size="xs" variant="outline" className="ml-auto" onClick={start}><PlusIcon /> เพิ่มวันใช้รถ</Button>}
      </div>
      <p className="text-xs text-muted-foreground">รถรับส่งตามวันที่เพิ่มได้ทันที · ค่ารถไปรวมในใบแจ้งหนี้ใบถัดไป (หรือออกใบเฉพาะค่ารถ) · ลดวันใช้รถไม่คืนเงิน</p>

      {open && (
        <div className="space-y-2 rounded-xl bg-muted/40 p-2.5">
          {days.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 text-sm">
              <Input type="date" className="w-40" value={d.date} onChange={(e) => patch(i, { date: e.target.value })} />
              {(["pickup", "dropoff"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5"><Checkbox checked={d[k]} onCheckedChange={(v) => patch(i, { [k]: !!v })} />{k === "pickup" ? "รับ" : "ส่ง"}</label>
              ))}
              <span className="text-xs tabular-nums text-muted-foreground">{fmtMoney(busAddOnAmount(d, rate))}</span>
              {days.length > 1 && <Button size="icon-xs" variant="ghost" aria-label="เอาวันนี้ออก" onClick={() => setDays((ds) => ds.filter((_, j) => j !== i))}><XIcon /></Button>}
            </div>
          ))}
          <Button size="xs" variant="ghost" onClick={() => setDays((ds) => [...ds, { date: addDays(ds[ds.length - 1]?.date ?? today, 1), pickup: true, dropoff: true }])}><PlusIcon /> เพิ่มอีกวัน</Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">ประเภทค่ารถ</Label>
              <NativeSelect value={feeId} onChange={(e) => setFeeId(e.target.value)} placeholder={busFees.length ? undefined : `ค่าตั้งต้น ${fmtMoney(branch.busFeePerLeg)}/เที่ยว`}
                options={busFees.map((f) => ({ value: f.id, label: `${f.name} · ${fmtMoney(f.price)}/เที่ยว` }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">หมายเหตุ</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น แม่ติดประชุม ขอส่งกลับบ้าน" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tabular-nums">รวม {fmtMoney(total)}</span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button size="sm" onClick={save}>บันทึก</Button>
          </div>
        </div>
      )}

      {addOns.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {addOns.map((a) => {
              const inv = billedOn(a.id, invoices)
              return (
                <tr key={a.id} className={cn("border-t [&>td]:py-1.5", inv && "text-muted-foreground")}>
                  <td className="whitespace-nowrap">{fmtDate(a.date, { weekday: true })}</td>
                  <td className="text-xs">{[a.pickup && "รับ", a.dropoff && "ส่ง"].filter(Boolean).join(" + ")}{a.note && ` · ${a.note}`}</td>
                  <td className="text-right tabular-nums">{fmtMoney(a.amount)}</td>
                  <td className="pl-2 text-right">{inv ? <span className="text-xs">ใบ {inv.number ?? "—"}</span> : <Pill tone="amber">รอเรียกเก็บ</Pill>}</td>
                  <td className="w-7 text-right">{manage && !inv && <Button size="icon-xs" variant="ghost" aria-label="ลบ" onClick={() => report(remove(a.id), "ลบรอบรถเพิ่มแล้ว")}><TrashIcon /></Button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
