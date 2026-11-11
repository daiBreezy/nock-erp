"use client"

import { useState } from "react"
import { CheckIcon, FileTextIcon, PlusIcon, ReceiptIcon, SendIcon, UnlinkIcon, WalletIcon, XCircleIcon } from "lucide-react"
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
import { IssueReceiptDialog } from "./issue-receipt-dialog"
import { invoiceTone } from "./status"

/**
 * The family set as ONE thing (owner 2026-11-05): the children's invoices linked from the start, worked on together —
 * one PDF, one message, one approval, one slip, one choice of receipts. The children's own tabs sit next to this one.
 */
export function BundleOverview({ members, onOpen, onAddChild, tabs }: { members: Invoice[]; onOpen: (id: ID) => void; onAddChild: (studentId: ID) => void; tabs?: React.ReactNode }) {
  const me = useStore((s) => s.me())
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const act = useStore(useShallow((s) => ({ gen: s.generatePdf, approve: s.approveInvoice, send: s.sendInvoice, void: s.voidInvoice, setNote: s.setInvoiceNote, unlink: s.unlinkInvoice, regroup: s.setReceiptGrouping, confirm: s.confirmPayment })))
  const manage = can(me, "billing.manage")
  const first = members[0]
  const stu = (id: ID) => students.find((x) => x.id === id)
  const fam = families.find((f) => f.id === stu(first.studentId)?.familyId)
  const ctxOf = (i: Invoice) => ({ branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays })
  const rows = members.map((inv) => ({ inv, total: Bill.invoiceTotals(inv, ctxOf(inv)).total, owed: Bill.owedOn(inv, Bill.invoiceTotals(inv, ctxOf(inv)).total) }))
  // family names already start with "ครอบครัว" ("ครอบครัวชัยมงคล")
  const famLabel = fam ? (fam.name.startsWith("ครอบครัว") ? fam.name : `ครอบครัว${fam.name}`) : "ครอบครัว"
  const grand = rows.reduce((a, r) => a + r.total, 0)
  const allDraft = members.every((x) => x.status === "draft")
  // each child keeps their own message (editable here or in their tab — both are the same data)
  const [notes, setNotes] = useState<Record<ID, string>>(() => Object.fromEntries(members.map((m) => [m.id, m.noteToParent || Bill.lastNoteFor(m.studentId, invoices, m.id)])))
  const anyNote = members.some((m) => (notes[m.id] ?? m.noteToParent).trim())
  const [pay, setPay] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
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

  // pay slips (owner 2026-11-05): ONE slot per slip — a shared slip is one slot (one confirmation for everyone on it),
  // children who paid separately are one slot each. Confirming = paid + the student joins the class right away.
  const slotMap = new Map<string, { inv: Invoice; p: Invoice["payments"][number] }[]>()
  members.forEach((m) => m.payments.forEach((p) => slotMap.set(p.groupId ?? p.id, [...(slotMap.get(p.groupId ?? p.id) ?? []), { inv: m, p }])))
  const slots = [...slotMap.values()]
  const needReceipt = members.filter((x) => x.status === "paid" && !x.receiptNumber)

  const each = (list: Invoice[], f: (i: Invoice) => Result<unknown>) => {
    for (const i of list) { const r = f(i); if (!r.ok) { report(r, ""); return false } }
    return true
  }
  // documents of the set on their steps (owner 2026-11-05): create PDFs · upload the slip · receipts
  const slips = [...new Set(members.flatMap((m) => m.payments.map((p) => p.slip)).filter((x): x is string => !!x))]
  const receipts = [...new Map(members.filter((m) => m.receiptNumber).map((m) => [m.receiptNumber!, m])).values()]
  const pdfDocs: DocItem[] = [
    ...(members.every((x) => x.pdf === "ready") ? [{ key: "bundle", kind: "invoice" as const, label: `ใบแจ้งหนี้${famLabel} (${members.length} ใบ)`, src: `/print/bundle/${first.bundleId}` }] : []),
    ...members.filter((x) => x.pdf === "ready").map((x) => ({ key: x.id, kind: "invoice" as const, label: `ใบแจ้งหนี้ ${stu(x.studentId)?.nickname ?? ""} ${x.number ?? ""}`.trim(), src: `/print/invoice/${x.id}` })),
  ]
  const generating = members.some((x) => x.pdf === "generating")
  const steps: { label: string; done: number; detail?: string; docs?: DocItem[]; onAdd?: () => void; addLabel?: string; extra?: React.ReactNode }[] = [
    { label: "สร้าง PDF", done: members.filter((x) => x.pdf === "ready").length, docs: pdfDocs, addLabel: "สร้าง PDF ทั้งชุด",
      onAdd: manage && drafts.length > 0 && !generating ? () => each(drafts, (i) => act.gen(i.id)) && report({ ok: true, value: undefined }, `กำลังสร้าง PDF ${drafts.length} ใบ`) : undefined },
    { label: "อนุมัติ", done: members.filter((x) => ["approved", "sent", "paid"].includes(x.status)).length },
    { label: "ส่งถึงผู้ปกครอง", done: members.filter((x) => x.delivery === "delivered" || x.status === "paid").length, detail: "ข้อความเดียว รวมใบของทุกคน" },
    { label: "รับเงิน (สลิปเดียวทั้งชุด)", done: members.filter((x) => x.status === "paid").length, docs: slips.map((src, i) => ({ key: `slip${i}`, kind: "slip" as const, label: `สลิป${slips.length > 1 ? ` ${i + 1}` : ""}`, src })),
      addLabel: "อัปโหลดสลิปการชำระเงิน (ทั้งชุด)", onAdd: manage && payable.length > 0 ? () => setPay(true) : undefined,
      detail: "ยืนยันยอดแล้ว นักเรียนเข้าคลาสทันที — ใบเสร็จออกทีหลังได้",
      extra: slots.length > 0 ? (
        <div className="mt-1.5 divide-y rounded-lg border text-sm">
          {slots.map((slot) => {
            const { inv: fi, p: fp } = slot[0]
            const amount = slot.reduce((a, x) => a + x.p.amount, 0)
            const done = slot.every((x) => x.p.confirmedBy)
            const c = Bill.canConfirmPayment(fp, me, fi.branchId)
            return (
              <div key={fp.groupId ?? fp.id} className="flex flex-wrap items-center gap-2 p-2.5">
                <span className="font-medium tabular-nums">{fmtMoney(amount)}</span>
                <span className="text-xs text-muted-foreground">{fp.method === "cash" ? "เงินสด" : "โอน"} · {slot.map((x) => stu(x.inv.studentId)?.nickname).join(" + ")}{slot.length > 1 ? " (สลิปเดียว)" : ""}</span>
                <span className="ml-auto">
                  {done ? <Pill tone={fp.forced ? "amber" : "green"} title={fp.forced?.remark}>{fp.forced ? "Force · " : ""}ยืนยันแล้ว</Pill>
                    : c.ok ? <Button size="xs" onClick={() => report(act.confirm(fi.id, fp.id), (v) => (v.paid ? "ยืนยันแล้ว · ชำระครบ นักเรียนเข้าคลาสแล้ว" : "ยืนยันยอดแล้ว"))}>ยืนยันยอด</Button>
                      : Bill.canForceConfirmPayment(fp, me, fi.branchId, "x").ok ? <ForceApprove label="Force ยืนยันยอด" onForce={(remark) => act.confirm(fi.id, fp.id, remark)} success="Force ยืนยันยอดแล้ว — แจ้งทั้งสาขา + Director" />
                        : <Pill tone="amber">รอคนอื่นยืนยัน</Pill>}
                </span>
              </div>
            )
          })}
        </div>
      ) : undefined },
    { label: "ใบเสร็จ (ออกภายหลังได้)", done: members.filter((x) => x.receiptNumber).length, detail: needReceipt.length ? "ยืนยันยอดแล้ว — ยังไม่ออกใบเสร็จ ออกภายหลังได้ (รวมหรือแยกรายนักเรียน)" : receipts.length ? undefined : "ออกได้หลังยืนยันยอดเงิน",
      addLabel: "ออกใบเสร็จ", onAdd: manage && needReceipt.length > 0 ? () => setReceiptOpen(true) : undefined,
      docs: receipts.map((m) => ({ key: `rc${m.id}`, kind: "receipt" as const, label: `ใบเสร็จ ${m.receiptNumber}`, src: `/print/receipt/${m.id}` })) },
  ]

  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-2 pr-8">
          <SheetTitle className="min-w-0 flex-1 truncate text-lg">{famLabel} · {members.length} ใบ</SheetTitle>
          <span className="font-semibold tabular-nums">{fmtMoney(grand)}</span>
        </div>
        <SheetDescription>ชุดเดียวกัน — ส่ง อนุมัติ และรับเงินพร้อมกัน · แท็บของแต่ละคนอยู่ด้านบน</SheetDescription>
      </SheetHeader>
      {tabs}

      <PanelBody>
        <section className="space-y-1.5">
          <Label className="text-xs">ข้อความถึงผู้ปกครอง
            <InfoTip text="ข้อความของนักเรียนแต่ละคนอยู่ในกล่องเดียวกัน — แก้ที่นี่หรือในแท็บของแต่ละคนก็ได้ (เป็นข้อมูลเดียวกัน) บันทึกให้อัตโนมัติเมื่อพิมพ์เสร็จ ข้อความครั้งก่อนของนักเรียนจะขึ้นมาให้ แก้ได้จนกว่าจะส่ง" />
          </Label>
          <div className="divide-y rounded-2xl bg-input/50">
            {members.map((m) => (
              <div key={m.id} className="px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">{stu(m.studentId)?.nickname}</p>
                <Textarea rows={1} value={notes[m.id] ?? ""} disabled={!manage || m.status === "paid"} placeholder="เช่น ค่าเรียนเดือนตุลาคม ชำระภายใน 5 ต.ค."
                  onChange={(e) => setNotes((n) => ({ ...n, [m.id]: e.target.value }))}
                  onBlur={() => { if (manage && m.status !== "paid" && (notes[m.id] ?? "").trim() !== (m.noteToParent || "")) report(act.setNote(m.id, notes[m.id] ?? ""), "บันทึกข้อความแล้ว") }}
                  className="min-h-8 rounded-none border-0 bg-transparent px-0 py-0 text-sm disabled:opacity-60" />
              </div>
            ))}
          </div>
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
                  {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-2.375 top-6 -bottom-0.5 w-px", state === "done" ? "bg-success" : "bg-border")} />}
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", state === "done" ? "bg-success text-white" : state === "current" ? "bg-info text-white" : "border text-muted-foreground")}>
                    {state === "done" ? <CheckIcon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium">{s.label}</div><div className="text-xs text-muted-foreground">{s.done}/{members.length} ใบ</div>{s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}{s.extra}</div>
                  {s.docs && <DocThumbs docs={s.docs} onAdd={s.onAdd} addLabel={s.addLabel} />}
                </li>
              )
            })}
          </ol>
        </section>

        {pending.length > 0 && drafts.length === 0 && !canApproveAll && canForceAll && (
          <ForceApprove label="Force Approve ทั้งชุด" onForce={(remark) => { for (const i of pending) { const r = act.approve(i.id, remark); if (!r.ok) return r } return { ok: true, value: undefined } }} success="Force Approve ทั้งชุดแล้ว — แจ้งทั้งสาขา + Director" />
        )}

        {allPaid && group.length > 1 && receipts.length > 0 && (
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
          <section className="space-y-2 rounded-lg border border-danger/30 p-3">
            <Label className="text-xs">เหตุผลการยกเลิกทั้งชุด *</Label>
            <Textarea rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ใส่คอร์สผิด จะสร้างชุดใหม่" />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setVoiding(false)}>ไม่ยกเลิก</Button>
              <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => each(members, (i) => act.void(i.id, reason)) && (report({ ok: true, value: undefined }, "ยกเลิกทั้งชุดแล้ว"), setVoiding(false))}>ยืนยันยกเลิกทั้งชุด</Button>
            </div>
          </section>
        )}
      </PanelBody>

      {manage && (!allPaid || needReceipt.length > 0) && (
        <PanelFooter>
          <PanelMore items={[!voiding && members.every((x) => x.payments.length === 0) && { label: "ยกเลิกทั้งชุด", icon: XCircleIcon, destructive: true, onClick: () => setVoiding(true) }]} />
          {drafts.length > 0 && (
            <Button className="ml-auto" onClick={() => each(drafts, (i) => act.gen(i.id)) && report({ ok: true, value: undefined }, `กำลังสร้าง PDF ${drafts.length} ใบ`)}><FileTextIcon /> สร้าง PDF ทั้งชุด</Button>
          )}
          {drafts.length === 0 && pending.length > 0 && canApproveAll && (
            <Button className="ml-auto" onClick={() => each(pending, (i) => act.approve(i.id)) && report({ ok: true, value: undefined }, "อนุมัติทั้งชุดแล้ว — พร้อมส่งผู้ปกครอง")}><CheckIcon /> อนุมัติทั้งชุด</Button>
          )}
          {drafts.length === 0 && pending.length === 0 && toSend.length > 0 && (
            <Button className="ml-auto" disabled={!anyNote} onClick={() => report(act.send(toSend[0].id, notes[toSend[0].id] ?? toSend[0].noteToParent), (v) => (v.delivered ? "ส่งทั้งชุดทาง LINE แล้ว (ข้อความเดียว)" : "บันทึกแล้ว แต่ยังไม่ถึงผู้ปกครอง (ไม่มี LINE)"))}><SendIcon /> ส่งผู้ปกครอง (ข้อความเดียว)</Button>
          )}
          {needReceipt.length > 0 && payable.length === 0 && (
            <Button className="ml-auto" onClick={() => setReceiptOpen(true)}><ReceiptIcon /> ออกใบเสร็จ</Button>
          )}
          {drafts.length === 0 && pending.length === 0 && toSend.length === 0 && payable.length > 0 && (
            <Button className="ml-auto" onClick={() => setPay(true)}><WalletIcon /> รับเงินทั้งชุด</Button>
          )}
        </PanelFooter>
      )}
      {receiptOpen && <IssueReceiptDialog invoices={needReceipt} onClose={() => setReceiptOpen(false)} />}
      {pay && payable.length > 0 && (
        <PaySlipDialog inv={payable[0].inv} owed={payable[0].owed} onClose={() => setPay(false)}
          siblings={payable.slice(1).map((r) => ({ id: r.inv.id, number: r.inv.number ?? "", nickname: stu(r.inv.studentId)?.nickname ?? "", owed: r.owed }))} />
      )}
    </>
  )
}
