"use client"

import { useState } from "react"
import { CheckIcon, FileTextIcon, PlusIcon, SendIcon, UnlinkIcon, WalletIcon, XCircleIcon } from "lucide-react"
import { ForceApprove } from "@/components/app/force-approve"
import { PanelBody, PanelFooter, PanelMore } from "@/components/app/form-shell"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtMoney } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import type { ID, Invoice, Result } from "@/domain/types"
import { InfoTip } from "@/components/app/info-tip"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { useShallow } from "zustand/react/shallow"
import { DocThumbs, type DocItem } from "./doc-thumbs"
import { PaySlipDialog } from "./pay-slip-dialog"
import { invoiceTone } from "./status"

/**
 * The family set as ONE thing (owner 2026-11-05): the children's invoices linked from the start, worked on together —
 * one PDF, one message, one approval, one slip, one choice of receipts. The children's own tabs sit next to this one.
 */
export function BundleOverview({ members, onOpen, onAddChild }: { members: Invoice[]; onOpen: (id: ID) => void; onAddChild: (studentId: ID) => void }) {
  const me = useStore((s) => s.me())
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const act = useStore(useShallow((s) => ({ gen: s.generatePdf, approve: s.approveInvoice, send: s.sendInvoice, void: s.voidInvoice, setNote: s.setInvoiceNote, unlink: s.unlinkInvoice, regroup: s.setReceiptGrouping })))
  const manage = can(me, "billing.manage")
  const first = members[0]
  const stu = (id: ID) => students.find((x) => x.id === id)
  const fam = families.find((f) => f.id === stu(first.studentId)?.familyId)
  const ctxOf = (i: Invoice) => ({ branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays })
  const rows = members.map((inv) => ({ inv, total: Bill.invoiceTotals(inv, ctxOf(inv)).total, owed: Bill.owedOn(inv, Bill.invoiceTotals(inv, ctxOf(inv)).total) }))
  const grand = rows.reduce((a, r) => a + r.total, 0)
  const allDraft = members.every((x) => x.status === "draft")
  const [note, setNote] = useState(first.noteToParent || Bill.lastNoteFor(first.studentId, invoices, first.id))
  const noteSaved = members.every((x) => (x.noteToParent || "") === note.trim())
  const [pay, setPay] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState("")

  // what is next for the set: the earliest stage some member has not passed
  const drafts = members.filter((x) => x.status === "draft")
  const pending = members.filter((x) => x.status === "pending_approval")
  const toSend = members.filter((x) => x.status === "approved" || (x.status === "sent" && (x.delivery === "no_line" || x.delivery === "failed")))
  const payable = rows.filter((r) => (r.inv.status === "approved" || r.inv.status === "sent") && r.owed > 0)
  const canApproveAll = pending.every((x) => Bill.canApprove(x, me).ok)
  const canForceAll = pending.every((x) => Bill.canApprove(x, me).ok || Bill.canForceApprove(x, me, "x").ok)
  const allPaid = members.every((x) => x.status === "paid")
  const group = allPaid ? Bill.paymentGroup(first, invoices) : []
  const combinedCount = group.filter((x) => x.receiptNumber && group.filter((y) => y.receiptNumber === x.receiptNumber).length > 1).length

  const each = (list: Invoice[], f: (i: Invoice) => Result<unknown>) => {
    for (const i of list) { const r = f(i); if (!r.ok) { report(r, ""); return false } }
    return true
  }
  const docs: DocItem[] = members.every((x) => x.pdf === "ready") ? [{ key: "bundle", kind: "invoice", label: `ใบแจ้งหนี้ครอบครัว${fam?.name ?? ""} (${members.length} ใบ)`, src: `/print/bundle/${first.bundleId}` }] : []
  const steps = [
    { label: "สร้าง PDF", done: members.filter((x) => x.pdf === "ready").length, docs },
    { label: "อนุมัติ", done: members.filter((x) => ["approved", "sent", "paid"].includes(x.status)).length },
    { label: "ส่งถึงผู้ปกครอง", done: members.filter((x) => x.delivery === "delivered" || x.status === "paid").length },
    { label: "รับเงิน", done: members.filter((x) => x.status === "paid").length },
  ]

  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-2 pr-8">
          <SheetTitle className="min-w-0 flex-1 truncate text-lg">ครอบครัว{fam?.name ?? ""} · {members.length} ใบ</SheetTitle>
          <span className="font-semibold tabular-nums">{fmtMoney(grand)}</span>
        </div>
        <SheetDescription>ชุดเดียวกัน — ส่ง อนุมัติ และรับเงินพร้อมกัน · แท็บของแต่ละคนอยู่ด้านบน</SheetDescription>
      </SheetHeader>

      <PanelBody>
        <section className="space-y-1.5">
          <Label className="text-xs">ข้อความถึงผู้ปกครอง
            <InfoTip text="ข้อความเดียวสำหรับทั้งชุด — บันทึกให้ทุกใบอัตโนมัติเมื่อพิมพ์เสร็จ ข้อความครั้งก่อนของนักเรียนจะขึ้นมาให้ แก้ได้จนกว่าจะส่ง" />
          </Label>
          <Textarea rows={2} value={note} disabled={!manage} onChange={(e) => setNote(e.target.value)}
            onBlur={() => { if (manage && !noteSaved && each(members.filter((x) => x.status !== "paid"), (i) => act.setNote(i.id, note))) report({ ok: true, value: undefined }, "บันทึกข้อความแล้ว") }}
            placeholder="เช่น ค่าเรียนเดือนตุลาคม ชำระภายใน 5 ต.ค." />
        </section>

        <section className="divide-y rounded-lg border">
          {rows.map(({ inv, total }) => (
            <div key={inv.id} className="flex items-center gap-2 p-2.5 text-sm">
              <button type="button" onClick={() => onOpen(inv.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline">
                <span className="font-medium">{stu(inv.studentId)?.nickname}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{inv.number ?? "ร่าง"}</span>
              </button>
              <Pill tone={invoiceTone(inv)}>{Bill.INVOICE_STATUS_LABEL[inv.status]}</Pill>
              <span className="w-24 text-right tabular-nums">{fmtMoney(total)}</span>
              {allDraft && manage && members.length > 2 && <Button size="icon-xs" variant="ghost" aria-label="ถอดออกจากชุด" onClick={() => report(act.unlink(inv.id), "ถอดออกจากชุดแล้ว")}><UnlinkIcon /></Button>}
            </div>
          ))}
          <div className="flex items-center gap-2 bg-muted/40 p-2.5 text-sm font-semibold"><span className="flex-1">ยอดรวมทั้งชุด</span><span className="tabular-nums">{fmtMoney(grand)}</span></div>
        </section>

        {allDraft && manage && (() => {
          const siblings = students.filter((s) => s.familyId && s.familyId === stu(first.studentId)?.familyId && s.branchId === first.branchId && !members.some((m) => m.studentId === s.id))
          return siblings.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">เพิ่มลูกในชุด:</span>
              {siblings.map((s) => <Button key={s.id} size="xs" variant="outline" onClick={() => onAddChild(s.id)}><PlusIcon /> {s.nickname}</Button>)}
            </div>
          ) : null
        })()}

        <section>
          <h3 className="mb-2 text-sm font-semibold">ขั้นตอนของชุด</h3>
          <ol>
            {steps.map((s, i) => {
              const state = s.done === members.length ? "done" : s.done > 0 ? "current" : "todo"
              return (
                <li key={s.label} className="relative flex items-start gap-2.5 pb-4 last:pb-0">
                  {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[9.5px] top-6 -bottom-0.5 w-px", state === "done" ? "bg-emerald-600" : "bg-border")} />}
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", state === "done" ? "bg-emerald-600 text-white" : state === "current" ? "bg-sky-600 text-white" : "border text-muted-foreground")}>
                    {state === "done" ? <CheckIcon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium">{s.label}</div><div className="text-xs text-muted-foreground">{s.done}/{members.length} ใบ</div></div>
                  {s.docs && <DocThumbs docs={s.docs} />}
                </li>
              )
            })}
          </ol>
        </section>

        {pending.length > 0 && drafts.length === 0 && !canApproveAll && canForceAll && (
          <ForceApprove label="Force Approve ทั้งชุด" onForce={(remark) => { for (const i of pending) { const r = act.approve(i.id, remark); if (!r.ok) return r } return { ok: true, value: undefined } }} success="Force Approve ทั้งชุดแล้ว — แจ้งทั้งสาขา + Director" />
        )}

        {allPaid && group.length > 1 && (
          <section className="space-y-1.5 rounded-lg border p-2.5">
            <p className="text-xs font-medium">ใบเสร็จของชุดนี้</p>
            <div className="flex gap-1.5">
              {([["combined", "รวมทุกใบ", group.map((x) => x.id)], ["separate", "แยกรายนักเรียน", [] as ID[]]] as const).map(([k, label, ids]) => {
                const on = k === "combined" ? combinedCount === group.length : combinedCount === 0
                return <button key={k} type="button" disabled={!manage} aria-pressed={on} onClick={() => !on && report(act.regroup(first.id, [...ids]), k === "combined" ? "รวมเป็นใบเสร็จเดียวแล้ว" : "แยกใบเสร็จรายนักเรียนแล้ว")}
                  className={cn("flex-1 rounded-full border px-3 py-1 text-xs disabled:opacity-60", on ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}>{label}</button>
              })}
            </div>
          </section>
        )}

        {voiding && (
          <section className="space-y-2 rounded-lg border border-red-200 p-3">
            <Label className="text-xs">เหตุผลการยกเลิกทั้งชุด *</Label>
            <Textarea rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ใส่คอร์สผิด จะสร้างชุดใหม่" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setVoiding(false)}>ไม่ยกเลิก</Button>
              <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => each(members, (i) => act.void(i.id, reason)) && (report({ ok: true, value: undefined }, "ยกเลิกทั้งชุดแล้ว"), setVoiding(false))}>ยืนยันยกเลิกทั้งชุด</Button>
            </div>
          </section>
        )}
      </PanelBody>

      {manage && !allPaid && (
        <PanelFooter>
          <PanelMore items={[!voiding && members.every((x) => x.payments.length === 0) && { label: "ยกเลิกทั้งชุด", icon: XCircleIcon, destructive: true, onClick: () => setVoiding(true) }]} />
          {drafts.length > 0 && (
            <Button className="ml-auto" onClick={() => each(drafts, (i) => act.gen(i.id)) && report({ ok: true, value: undefined }, `กำลังสร้าง PDF ${drafts.length} ใบ`)}><FileTextIcon /> สร้าง PDF ทั้งชุด</Button>
          )}
          {drafts.length === 0 && pending.length > 0 && canApproveAll && (
            <Button className="ml-auto" onClick={() => each(pending, (i) => act.approve(i.id)) && report({ ok: true, value: undefined }, "อนุมัติทั้งชุดแล้ว — พร้อมส่งผู้ปกครอง")}><CheckIcon /> อนุมัติทั้งชุด</Button>
          )}
          {drafts.length === 0 && pending.length === 0 && toSend.length > 0 && (
            <Button className="ml-auto" disabled={!note.trim()} onClick={() => report(act.send(toSend[0].id, note), (v) => (v.delivered ? "ส่งทั้งชุดทาง LINE แล้ว (ข้อความเดียว)" : "บันทึกแล้ว แต่ยังไม่ถึงผู้ปกครอง (ไม่มี LINE)"))}><SendIcon /> ส่งผู้ปกครอง (ข้อความเดียว)</Button>
          )}
          {drafts.length === 0 && pending.length === 0 && toSend.length === 0 && payable.length > 0 && (
            <Button className="ml-auto" onClick={() => setPay(true)}><WalletIcon /> รับเงินทั้งชุด</Button>
          )}
        </PanelFooter>
      )}
      {pay && payable.length > 0 && (
        <PaySlipDialog inv={payable[0].inv} owed={payable[0].owed} onClose={() => setPay(false)}
          siblings={payable.slice(1).map((r) => ({ id: r.inv.id, number: r.inv.number ?? "", nickname: stu(r.inv.studentId)?.nickname ?? "", owed: r.owed }))} />
      )}
    </>
  )
}
