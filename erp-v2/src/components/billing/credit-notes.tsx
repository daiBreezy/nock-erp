"use client"

import { useState } from "react"
import { CheckIcon, ReceiptIcon, Undo2Icon, WalletIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { ForceApprove } from "@/components/app/force-approve"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime, fmtMoney, toDateStr } from "@/domain/dates"
import { invoiceTotals, paidAmount } from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import * as Refund from "@/domain/rules/refunds"
import type { CreditMode, CreditNote, Invoice } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useShallow } from "zustand/react/shallow"
import { useStore } from "@/store/store"

/** Credit Notes of one paid invoice: create (refund / keep as credit), approve (maker–checker), record the transfer back. */
export function CreditNotes({ inv }: { inv: Invoice }) {
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const staff = useStore((s) => s.staff)
  const notes = useStore((s) => s.creditNotes).filter((n) => n.invoiceId === inv.id)
  const [creating, setCreating] = useState(false)
  const manage = can(me, "billing.manage")
  const who = (id?: string) => staff.find((x) => x.id === id)?.nickname ?? "—"
  if (inv.status !== "paid" && !notes.length) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">คืนเงิน / ลดหนี้</h3>
        {manage && inv.status === "paid" && <Button size="xs" variant="outline" className="ml-auto" onClick={() => setCreating(true)}><Undo2Icon /> ทำใบลดหนี้</Button>}
      </div>
      {!notes.length && <p className="text-xs text-muted-foreground">ใบแจ้งหนี้และใบเสร็จที่จ่ายแล้วแก้ไม่ได้ — การคืนเงินหรือเก็บเป็นเครดิตทำเป็นใบลดหนี้ (Credit Note) อ้างถึงใบนี้</p>}
      {notes.map((n) => (
        <NoteCard key={n.id} n={n} who={who} manage={manage} />
      ))}
      {creating && <CreateCreditNote inv={inv} onClose={() => setCreating(false)} />}
    </section>
  )
}

function NoteCard({ n, who, manage }: { n: CreditNote; who: (id?: string) => string; manage: boolean }) {
  const act = useStore(useShallow((s) => ({ approve: s.approveCreditNote, void: s.voidCreditNote, refund: s.recordRefund })))
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const branch = useStore((s) => s.branches.find((b) => b.id === n.branchId)!)
  const today = toDateStr(useNow(60_000))
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState("")
  const [acc, setAcc] = useState("")
  const [date, setDate] = useState(today)
  const [ref, setRef] = useState("")
  const check = Refund.canApproveCreditNote(n, me)
  const canForce = Refund.canForceApproveCreditNote(n, me, "x").ok
  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium tabular-nums">{n.number}</span>
        <Pill tone={n.mode === "refund" ? "blue" : "violet"}>{n.mode === "refund" ? <WalletIcon className="size-3" /> : <ReceiptIcon className="size-3" />}{Refund.CREDIT_MODE_LABEL[n.mode]}</Pill>
        <Pill tone={n.status === "approved" ? "green" : n.status === "void" ? "gray" : "amber"}>{Refund.CREDIT_STATUS_LABEL[n.status]}</Pill>
        <span className="ml-auto font-semibold tabular-nums">{fmtMoney(Refund.creditNoteTotal(n))}</span>
        {n.status === "approved" && <a href={`/print/credit-note/${n.id}`} target="_blank" rel="noreferrer" className="text-xs text-primary underline">PDF</a>}
      </div>
      <ul className="text-xs text-muted-foreground">
        {n.items.map((i) => <li key={i.key} className="flex justify-between"><span>{i.label}</span><span className="tabular-nums">{fmtMoney(i.amount)}</span></li>)}
      </ul>
      <p className="text-xs">เหตุผล: {[...n.reasons, n.remark].filter(Boolean).join(" · ")}{n.stopFrom && ` · หยุดเรียนตั้งแต่ ${fmtDate(n.stopFrom, { weekday: true })}`}</p>
      <p className="text-xs text-muted-foreground">สร้างโดย {who(n.createdBy)} · {fmtDateTime(n.createdAt)}{n.approvedBy && ` · ${n.forced ? "Force " : ""}อนุมัติโดย ${who(n.approvedBy)}`}</p>
      {n.status === "void" && <p className="text-xs text-muted-foreground">ยกเลิก: {n.voidReason}</p>}
      {n.mode === "credit" && n.status === "approved" && <p className="text-xs text-violet-800 dark:text-violet-200">เครดิตผูกกับนักเรียน + คอร์สนี้ — ใบแจ้งหนี้ถัดไปของคอร์สเดียวกันหักให้อัตโนมัติ</p>}

      {n.status === "pending_approval" && (
        <div className="flex flex-wrap items-center gap-2 border-t pt-2">
          {check.ok ? <Button size="xs" onClick={() => report(act.approve(n.id), "อนุมัติใบลดหนี้แล้ว")}><CheckIcon /> อนุมัติ</Button>
            : <span className="text-xs text-muted-foreground">{check.error}</span>}
          {canForce && <ForceApprove onForce={(remark) => act.approve(n.id, remark)} success="Force Approve ใบลดหนี้แล้ว — แจ้งทั้งสาขา + Director" />}
          {manage && !voiding && <Button size="xs" variant="ghost" className="ml-auto text-red-700" onClick={() => setVoiding(true)}>ยกเลิกใบลดหนี้</Button>}
          {voiding && (
            <div className="flex w-full gap-2">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เหตุผลการยกเลิก" />
              <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => report(act.void(n.id, reason), "ยกเลิกใบลดหนี้แล้ว") && setVoiding(false)}>ยืนยัน</Button>
            </div>
          )}
        </div>
      )}

      {n.mode === "refund" && n.status === "approved" && (
        n.refund ? (
          <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            โอนคืนแล้ว {fmtDate(n.refund.date, { year: true })} · จาก {n.refund.fromAccount} · {n.refund.reference} · บันทึกโดย {who(n.refund.recordedBy)}
          </p>
        ) : manage && (
          <div className="space-y-2 border-t pt-2">
            <Label className="text-xs">บันทึกการโอนคืน — บัญชีที่เงินออก ใช้เทียบ Statement</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input list={`acc-${n.id}`} value={acc} onChange={(e) => setAcc(e.target.value)} placeholder="โอนจากบัญชี" />
              <datalist id={`acc-${n.id}`}>{branch.bankAccount.number && <option value={`${branch.bankAccount.bank} ${branch.bankAccount.number}`} />}</datalist>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="เลขอ้างอิงการโอน" />
            </div>
            <Button size="xs" onClick={() => report(act.refund(n.id, { fromAccount: acc, date, reference: ref }), "บันทึกการโอนคืนแล้ว")}>บันทึกโอนคืน</Button>
          </div>
        )
      )}
    </div>
  )
}

function CreateCreditNote({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const branch = useStore((s) => s.branches.find((b) => b.id === inv.branchId)!)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const notes = useStore((s) => s.creditNotes)
  const create = useStore((s) => s.createCreditNote)
  const totals = invoiceTotals(inv, { branch, courses, classes, holidays })
  const items = Refund.refundableItems(inv, totals, notes)
  const [mode, setMode] = useState<CreditMode>("refund")
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<string[]>([])
  const [remark, setRemark] = useState("")
  const [stopFrom, setStopFrom] = useState("")
  const room = paidAmount(inv) - Refund.alreadyGivenBack(inv.id, notes)
  const chosen = items.filter((i) => picked[i.key] !== undefined).map((i) => ({ key: i.key, label: i.label, courseId: i.courseId, amount: Number(picked[i.key]) || 0 }))
  const total = chosen.reduce((a, i) => a + i.amount, 0)
  const lineOf = (key: string) => totals.lines.find((l) => `line:${l.line.id}` === key)
  const hasCourse = items.some((i) => i.key.startsWith("line:"))

  const submit = () => {
    const r = create({ invoiceId: inv.id, mode, items: chosen, reasons, remark, stopFrom: stopFrom || undefined })
    if (report(r, (v) => `สร้างใบลดหนี้ ${v.number} แล้ว — รอคนอื่นอนุมัติ`)) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>ใบลดหนี้ · อ้างถึง {inv.number}</DialogTitle>
          <DialogDescription>ใบแจ้งหนี้และใบเสร็จเดิมไม่เปลี่ยน · ชำระแล้ว {fmtMoney(paidAmount(inv))}{room < paidAmount(inv) && ` · คืนไปแล้ว ${fmtMoney(paidAmount(inv) - room)}`}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {([["refund", "คืนเงิน", "โอนเงินคืนผู้ปกครอง", WalletIcon], ["credit", "เก็บเป็นเครดิต", "หักในใบถัดไปของคอร์สเดียวกัน", ReceiptIcon]] as const).map(([k, label, hint, Icon]) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} disabled={k === "credit" && !hasCourse}
              className={cn("rounded-xl border p-2.5 text-left disabled:opacity-50", mode === k ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted/40")}>
              <div className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-4" /> {label}</div>
              <div className="text-xs text-muted-foreground">{k === "credit" && !hasCourse ? "ใบนี้ไม่มีคอร์ส" : hint}</div>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">เหตุผล *</Label>
          <div className="flex flex-wrap gap-1.5">
            {Refund.REFUND_REASONS.map((r) => {
              const on = reasons.includes(r)
              return <button key={r} type="button" aria-pressed={on} onClick={() => setReasons(on ? reasons.filter((x) => x !== r) : [...reasons, r])}
                className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{r}</button>
            })}
          </div>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="หรือพิมพ์เหตุผลเอง / รายละเอียดเพิ่มเติม" />
        </div>

        {hasCourse && (
          <div className="space-y-1">
            <Label className="text-xs">หยุดเรียนตั้งแต่ (ถ้าเลิกเรียนคอร์สที่คืน)</Label>
            <Input type="date" value={stopFrom} onChange={(e) => setStopFrom(e.target.value)} className="w-48" />
            <p className="text-xs text-muted-foreground">เมื่ออนุมัติ แพ็กเกจของคอร์สที่เลือกจะจบก่อนวันนี้ และนักเรียนถูกเอาออกจากคาบหลังจากนั้น (คาบที่เช็คชื่อแล้วไม่แตะ)</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">คืนอะไรบ้าง · เท่าไร *</Label>
          {!items.length && <p className="text-sm text-muted-foreground">คืนครบทุกรายการแล้ว</p>}
          <div className="divide-y rounded-lg border">
            {items.map((i) => {
              const on = picked[i.key] !== undefined
              const l = lineOf(i.key)
              const hint = l && stopFrom ? Refund.unusedShare(l, stopFrom) : null
              return (
                <div key={i.key} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <Checkbox checked={on} onCheckedChange={(v) => setPicked((p) => { const n = { ...p }; if (v) n[i.key] = String(hint ? Math.min(hint.amount, i.max) : i.max); else delete n[i.key]; return n })} />
                    <span className="truncate">{i.label}</span>
                    <span className="text-xs text-muted-foreground">สูงสุด {fmtMoney(i.max)}</span>
                  </label>
                  {on && (
                    <>
                      {hint && <button type="button" className="text-xs text-primary underline" onClick={() => setPicked((p) => ({ ...p, [i.key]: String(Math.min(hint.amount, i.max)) }))}>ตามคาบที่เหลือ {hint.unused}/{hint.of} = {fmtMoney(hint.amount)}</button>}
                      <Input type="number" min={0} max={i.max} className="w-28" value={picked[i.key]} aria-invalid={Number(picked[i.key]) > i.max} onChange={(e) => setPicked((p) => ({ ...p, [i.key]: e.target.value }))} />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="items-center">
          <span className="mr-auto text-sm font-semibold tabular-nums">{Refund.CREDIT_MODE_LABEL[mode]} {fmtMoney(total)}</span>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={total <= 0} onClick={submit}>สร้างใบลดหนี้</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
