"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckIcon, FileTextIcon, PlusIcon, ReceiptIcon, MessagesSquareIcon, SendIcon, Trash2Icon, UnlinkIcon, WalletIcon, XCircleIcon } from "lucide-react"
import { ForceApprove } from "@/components/app/force-approve"
import { PaymentRefInput } from "./payment-ref"
import { MathGate } from "@/components/app/math-gate"
import { PaymentMenu, RejectedPayments } from "./payment-actions"
import { StepList, type InvoiceStep } from "./step-list"
import { PanelBody, PanelFooter, PanelMore } from "@/components/app/form-shell"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDateTime, fmtMoney } from "@/domain/dates"
import { mainLineAccount } from "@/domain/rules/people"
import * as Bill from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import type { ID, Invoice, Result } from "@/domain/types"
import { InfoTip } from "@/components/app/info-tip"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { useShallow } from "zustand/react/shallow"
import { type DocItem } from "./doc-thumbs"
import { PaySlipDialog } from "./pay-slip-dialog"
import { IssueReceiptDialog } from "./issue-receipt-dialog"
import { invoiceTone } from "./status"

/**
 * The family set as ONE thing (owner 2026-11-05): the children's invoices linked from the start, worked on together —
 * one PDF, one message, one approval, one slip, one choice of receipts. The children's own tabs sit next to this one.
 */
export function BundleOverview({ members, onOpen, onAddChild, onDeleted, onDeletedOne, tabs }: { members: Invoice[]; onOpen: (id: ID) => void; onAddChild: (studentId: ID) => void; /** the whole set was deleted */ onDeleted: () => void; /** one child's invoice was deleted — move on to what is left of the set */ onDeletedOne: (remaining: ID[]) => void; tabs?: React.ReactNode }) {
  const me = useStore((s) => s.me())
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const staff = useStore((s) => s.staff)
  const convs = useStore((s) => s.conversations)
  const act = useStore(useShallow((s) => ({ create: s.createInvoice, issue: s.issueInvoice, delSet: s.deleteInvoiceSet, delOne: s.deleteInvoice, approve: s.approveInvoice, send: s.sendInvoice, void: s.voidInvoice, setNote: s.setInvoiceNote, unlink: s.unlinkInvoice, regroup: s.setReceiptGrouping, confirm: s.confirmPayment, sendAgreement: s.sendAgreement, confirmAgreement: s.confirmAgreement })))
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
  const [deletingSet, setDeletingSet] = useState(false)
  // owner 2026-11-24: the delete ⋯ is a menu list — ลบทั้งชุด or ลบของ[ชื่อ] for one child; this holds the child being deleted
  const [deletingOne, setDeletingOne] = useState<ID | null>(null)
  const [reason, setReason] = useState("")
  const [receiptIds, setReceiptIds] = useState<ID[] | null>(null)

  // what is next for the set: the earliest stage some member has not passed
  const drafts = members.filter((x) => x.status === "draft")
  const pending = members.filter((x) => x.status === "pending_approval")
  const toSend = members.filter((x) => (x.status === "approved" && !!x.number) || (x.status === "sent" && (x.delivery === "no_line" || x.delivery === "failed")))
  const payable = rows.filter((r) => ((r.inv.status === "approved" && !!r.inv.number) || r.inv.status === "sent") && r.owed > 0)
  const canApproveAll = pending.every((x) => Bill.canApprove(x, me).ok)
  const canForceAll = pending.every((x) => Bill.canApprove(x, me).ok || Bill.canForceApprove(x, me, "x").ok)
  const allPaid = members.every((x) => x.status === "paid")
  const group = allPaid ? Bill.paymentGroup(first, invoices) : []
  // receipts: which invoices of the slip share one receipt (the same logic as the single panel)
  const combined = receiptIds ?? group.filter((x) => x.receiptNumber && group.filter((y) => y.receiptNumber === x.receiptNumber).length > 1).map((x) => x.id)
  const toggle = (list: ID[], id: ID) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

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
    // not issued yet = the same paper preview (number "DRAFT") — owner 2026-11-24
    ...members.filter((x) => x.status !== "void").map((x) => ({ key: x.id, kind: "invoice" as const, label: x.pdf === "ready" ? `ใบแจ้งหนี้ ${stu(x.studentId)?.nickname ?? ""} ${x.number ?? ""}`.trim() : `ตัวอย่างใบแจ้งหนี้ ${stu(x.studentId)?.nickname ?? ""} (ยังไม่มีเลข)`.trim(), src: `/print/invoice/${x.id}` })),
  ]
  // owner 2026-11-20: ONE course summary for the whole set — sent and confirmed for every child together; the PDF asks first when it is not confirmed
  const agStates = members.map((m) => Bill.agreementState(m, Bill.invoiceTotals(m, ctxOf(m))))
  const agState: Bill.AgreementState = agStates.includes("stale") ? "stale" : agStates.includes("none") ? "none" : agStates.every((x) => x === "confirmed") ? "confirmed" : "sent"
  const memberIds = members.map((m) => m.id)
  const runGen = () => each(drafts, (i) => act.create(i.id)) && report({ ok: true, value: undefined }, `สร้างใบแจ้งหนี้ ${drafts.length} ใบแล้ว — รอคนอื่นอนุมัติ`)
  const toIssue = members.filter((x) => x.status === "approved" && !x.number)
  const generateAll = () => runGen()
  const blank = members.filter((m) => !m.lines.length && !m.advance.length && !m.bookFee)
  // owner 2026-11-24: the course summary (the old LINE text) is OPTIONAL and lives in the first step — creating the set never waits for it
  const agreementBlock = Bill.agreementBlockReason(members.map((x) => ({ inv: x, totals: Bill.invoiceTotals(x, ctxOf(x)), student: stu(x.studentId), family: fam })))
  const agreementNode = drafts.length > 0 || members.some((m) => m.agreement) ? (
    <div className="mt-1.5 space-y-1.5 text-xs">
      <p className="text-muted-foreground">สรุปคอร์สให้ผู้ปกครอง (ไม่บังคับ) · {Bill.AGREEMENT_LABEL[agState]}</p>
      {allDraft && manage && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" variant="outline" disabled={!!agreementBlock} title={agreementBlock ?? undefined} onClick={() => report(act.sendAgreement(first.id), agState === "none" ? "ส่งสรุปคอร์สให้ผู้ปกครองแล้ว" : "ส่งสรุปคอร์สอีกครั้งแล้ว")}><SendIcon /> {agState === "none" ? "ส่งสรุปคอร์ส (ข้อความ LINE)" : "ส่งสรุปอีกครั้ง"}</Button>
          {agState === "sent" && <Button size="xs" onClick={() => report(act.confirmAgreement(memberIds), "บันทึกแล้ว — ผู้ปกครองยืนยันสรุปคอร์ส")}><CheckIcon /> ผู้ปกครองยืนยันแล้ว</Button>}
          {agreementBlock && <span className="basis-full text-warning-ink">ส่งไม่ได้ตอนนี้: {agreementBlock}{blank.length > 0 ? " · เปิดแท็บของแต่ละคน → แก้ไข" : ""}</span>}
        </div>
      )}
    </div>
  ) : undefined
  // owner 2026-11-24: the set reads EXACTLY like a single invoice — the same stepper (StepList), the same wording; the data is the set's (every child together)
  const who = (uid?: ID) => staff.find((x) => x.id === uid)?.nickname ?? "—"
  const nick = (id: ID) => stu(id)?.nickname ?? "—"
  const n = members.length
  const approvedList = members.filter((x) => x.approvedBy).sort((x, y) => (x.approvedAt ?? "").localeCompare(y.approvedAt ?? ""))
  const forcedOne = members.find((x) => x.forced)
  const allNumbered = members.every((x) => !!x.number && x.pdf === "ready")
  const numbered = members.filter((x) => x.number)
  const dls = members.map((x) => x.delivery)
  const dl = dls.includes("failed") ? "failed" : dls.includes("sending") ? "sending" : dls.every((d) => d === "delivered") ? "delivered" : dls.every((d) => d === "delivered" || d === "no_line") ? "no_line" : undefined
  const sentAt = members.find((x) => x.sentAt)?.sentAt
  const mainAcc = fam ? mainLineAccount(fam) : undefined
  const conv = fam ? convs.find((c) => c.familyId === fam.id && !!mainAcc && c.id === `line_${mainAcc}`) ?? convs.find((c) => c.familyId === fam.id) : undefined
  const allPays = members.flatMap((m) => m.payments).sort((x, y) => x.recordedAt.localeCompare(y.recordedAt))
  const lastPay = allPays[allPays.length - 1]
  const confirmedSum = allPays.filter((p) => p.confirmedBy).reduce((a, p) => a + p.amount, 0)
  const waitingPay = drafts.length === 0 && pending.length === 0 && toSend.length === 0 && payable.length > 0
  const rcDeliveries = members.filter((x) => x.receiptNumber).map((x) => x.receiptDelivery)
  const rcBad = rcDeliveries.some((d) => d === "failed" || d === "no_line")
  const rcText = rcDeliveries.length && rcDeliveries.every((d) => d === "delivered") ? "ส่งใบเสร็จทาง LINE แล้ว" : rcDeliveries.includes("failed") ? "ส่งใบเสร็จทาง LINE ไม่สำเร็จ" : rcDeliveries.includes("no_line") ? "ไม่มี LINE — ส่งใบเสร็จทางอื่น" : "ออกใบเสร็จแล้ว"

  const paymentsNode = slots.length > 0 || members.some((m) => m.rejectedPayments?.length) ? (
    <>
      {slots.length > 0 && <div className="mt-2.5 divide-y rounded-xl border text-sm">
        {slots.map((slot) => {
          const { inv: fi, p: fp } = slot[0]
          const amount = slot.reduce((a, x) => a + x.p.amount, 0)
          const done = slot.every((x) => x.p.confirmedBy)
          const c = Bill.canConfirmPayment(fp, me, fi.branchId)
          return (
            <div key={fp.groupId ?? fp.id} className="space-y-2 p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold tabular-nums">{fmtMoney(amount)}</p>
                  <p className="break-words text-xs text-muted-foreground">{fp.method === "cash" ? "เงินสด" : "โอน"}{fp.reference && ` · Ref ${fp.reference}`}</p>
                  <p className="text-xs text-muted-foreground">บันทึกโดย {who(fp.recordedBy)}</p>
                  {slot.length > 1 && <Pill tone="blue" className="mt-1 whitespace-normal">สลิปเดียวกัน {slot.map((x) => `${x.inv.number ?? ""} ${nick(x.inv.studentId)}`.trim()).join(" + ")}</Pill>}
                </div>
                <span className="flex shrink-0 items-center gap-1">
                  {done ? <Pill tone={fp.forced ? "amber" : "green"} title={fp.forced?.remark}>{fp.forced ? "Force · " : ""}ยืนยันโดย {who(fp.confirmedBy)}</Pill>
                    : Bill.paymentRefError(fp) ? <Pill tone="amber" className="whitespace-normal">ต้องมี Ref ID ก่อนยืนยันยอด</Pill>
                    : c.ok ? <Button size="xs" onClick={() => report(act.confirm(fi.id, fp.id), (v) => (v.paid ? "ยืนยันแล้ว · ชำระครบ นักเรียนเข้าคลาสแล้ว" : "ยืนยันยอดแล้ว"))}>ยืนยันยอด</Button>
                      : Bill.canForceConfirmPayment(fp, me, fi.branchId, "x").ok ? <ForceApprove label="Force ยืนยันยอด" onForce={(remark) => act.confirm(fi.id, fp.id, remark)} success="Force ยืนยันยอดแล้ว — แจ้งทั้งสาขา + Director" />
                        : <Pill tone="amber" className="whitespace-normal">รอคนอื่นยืนยัน</Pill>}
                  {!done && manage && <PaymentMenu invoiceId={fi.id} branchId={fi.branchId} payment={fp} />}
                </span>
              </div>
              {!done && Bill.paymentRefError(fp) && manage && <PaymentRefInput invoiceId={fi.id} paymentId={fp.id} />}
            </div>
          )
        })}
      </div>}
      {members.map((m) => <RejectedPayments key={m.id} list={m.rejectedPayments ?? []} who={who} />)}
    </>
  ) : null

  const groupNode = allPaid && group.length > 1 && receipts.length > 0 ? (
    <div className="mt-1.5 space-y-1.5 rounded-lg border p-2.5">
      <p className="text-xs font-medium">ใบเสร็จของสลิปนี้</p>
      <div className="flex gap-1.5">
        {([["combined", "รวมทุกใบ", group.map((x) => x.id)], ["separate", "แยกรายนักเรียน", [] as ID[]]] as const).map(([k, label, ids]) => {
          const on = k === "combined" ? combined.length === group.length : combined.length === 0
          return <Button variant="chip" size="inline" key={k} type="button" disabled={!manage} aria-pressed={on} onClick={() => !on && report(act.regroup(first.id, [...ids]), k === "combined" ? "รวมเป็นใบเสร็จเดียวแล้ว" : "แยกใบเสร็จรายนักเรียนแล้ว")}
            className="flex-1 px-3 py-1 text-xs disabled:opacity-60">{label}</Button>
        })}
      </div>
      <p className="text-xs text-muted-foreground">หรือติ๊กเลือกเองว่าใบไหนรวมกัน (ไม่ติ๊ก = แยกใบ)</p>
      {group.map((x) => (
        <label key={x.id} className="flex items-center gap-2 text-xs">
          <Checkbox disabled={!manage} checked={combined.includes(x.id)} onCheckedChange={() => setReceiptIds(toggle(combined, x.id))} />
          <span className="font-mono">{x.number}</span>
          <span>{nick(x.studentId)}</span>
          <span className="ml-auto text-muted-foreground">ใบเสร็จ <span className="font-mono">{x.receiptNumber}</span></span>
        </label>
      ))}
      {manage && receiptIds && <Button size="xs" variant="outline" onClick={() => report(act.regroup(first.id, receiptIds), "จัดใบเสร็จแล้ว") && setReceiptIds(null)}>บันทึกการจัดใบเสร็จ</Button>}
    </div>
  ) : null

  const invoiceSteps: InvoiceStep[] = [
    { label: "สร้างใบ", state: drafts.length > 0 ? "current" : "done", meta: allDraft ? undefined : `${fmtDateTime(first.createdAt)} · ${who(first.createdBy)}`,
      detail: drafts.length === n ? "ร่าง — ยังไม่ได้สร้างใบแจ้งหนี้" : drafts.length > 0 ? `ร่าง ${drafts.length}/${n} ใบ — ยังไม่ได้สร้างใบแจ้งหนี้` : "ข้อมูลจริงครบ · ยังไม่มีเลข", extra: agreementNode,
      onAdd: manage && drafts.length > 0 ? generateAll : undefined, addLabel: "สร้างใบแจ้งหนี้ทั้งชุด" },
    { label: "อนุมัติ (คนอื่นที่ไม่ใช่คนสร้าง)",
      // Force Approve sits right under its own step (owner 2026-11-05)
      extra: pending.length > 0 && drafts.length === 0 && !canApproveAll && canForceAll ? <div className="mt-1.5"><ForceApprove label="Force Approve ทั้งชุด" onForce={(remark) => { for (const i of pending) { const r = act.approve(i.id, remark); if (!r.ok) return r } return { ok: true, value: undefined } }} success="Force Approve ทั้งชุดแล้ว — แจ้งทั้งสาขา + Director" /></div> : undefined,
      state: approvedList.length === n ? "done" : pending.length > 0 ? "current" : "todo",
      meta: approvedList.length ? `${approvedList[approvedList.length - 1].approvedAt ? `${fmtDateTime(approvedList[approvedList.length - 1].approvedAt!)} · ` : ""}${who(approvedList[approvedList.length - 1].approvedBy)}` : undefined,
      detail: approvedList.length === n ? (forcedOne?.forced ? `Force Approve · เหตุผล: ${forcedOne.forced.remark}` : "") : pending.length > 0 ? `รออนุมัติ ${pending.length}/${n} ใบ` : "—" },
    { label: "ออกเลข Official + PDF (Admin)", state: allNumbered ? "done" : toIssue.length > 0 ? "current" : "todo", docs: pdfDocs,
      detail: numbered.length ? <>{numbered.map((x) => <div key={x.id}>{x.number} · {nick(x.studentId)}</div>)}</> : toIssue.length > 0 ? "อนุมัติแล้ว — Admin กดออกเลขได้ทันที" : "—" },
    { label: "ส่งถึงผู้ปกครอง", state: dl === "delivered" || dl === "no_line" || allPaid ? "done" : dl === "failed" ? "warn" : toSend.length > 0 || dl === "sending" ? "current" : "todo",
      meta: sentAt ? fmtDateTime(sentAt) : undefined,
      detail: dl === "delivered" ? "ถึงผู้ปกครองทาง LINE (ข้อความเดียว รวมใบของทุกคน)" : dl === "sending" ? "กำลังส่งทาง LINE…" : dl === "failed" ? "ส่ง LINE ไม่สำเร็จ — ลองส่งอีกครั้ง"
        : dl === "no_line" ? <span className="inline-flex items-start gap-1.5"><UnlinkIcon role="img" aria-label="ไม่มี LINE" className="mt-0.5 size-3.5 shrink-0 text-warning"><title>ไม่มีผู้ปกครองที่ผูก LINE — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้</title></UnlinkIcon><span>ผู้ปกครองไม่มี LINE — ดาวน์โหลด / พิมพ์ใบ แล้วส่งทางอื่น (อีเมล หรือให้ด้วยตัวเอง) · รอรับเงินต่อได้เลย</span></span> : "ข้อความเดียว รวมใบของทุกคน",
      extra: sentAt && fam && dl !== "no_line" ? (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="min-w-0 truncate text-muted-foreground">ส่งให้ <span className="font-medium text-foreground">{fam.name}</span>{fam.parents.find((x) => x.primary) ? ` · ${fam.parents.find((x) => x.primary)!.name}` : ""}</span>
          <Button size="icon-sm" variant="outline" className="rounded-full" disabled={!conv} aria-label="เปิดแชท LINE ในหน้า Inbox" title={conv ? "เปิดแชท LINE กับผู้ปกครองใน Inbox" : "ครอบครัวนี้ยังไม่มีแชท LINE ใน Inbox"} nativeButton={!conv} render={conv ? <Link href={`/inbox?conversation=${conv.id}`} /> : undefined}><MessagesSquareIcon /></Button>
        </div>
      ) : undefined },
    { label: "รับเงิน (บันทึก + ยืนยันโดยอีกคน)", state: allPaid ? "done" : allPays.length > 0 || waitingPay ? "current" : "todo",
      docs: slips.map((src, i) => ({ key: `slip${i}`, kind: "slip" as const, label: `สลิป${slips.length > 1 ? ` ${i + 1}` : ""}`, src })),
      addLabel: "อัปโหลดสลิปการชำระเงิน (ทั้งชุด)", onAdd: manage && payable.length > 0 ? () => setPay(true) : undefined, extra: paymentsNode,
      meta: lastPay ? `${fmtDateTime(lastPay.recordedAt)} · ${who(lastPay.recordedBy)}` : undefined,
      detail: allPays.length ? `ยืนยันแล้ว ${fmtMoney(confirmedSum)} / ${fmtMoney(grand)}${allPaid ? " · นักเรียนเข้าคลาสแล้ว" : " · ยืนยันยอดแล้วนักเรียนเข้าคลาสทันที"}` : waitingPay ? "รอผู้ปกครองชำระเงิน" : "—" },
  ]
  const receiptSteps: InvoiceStep[] = [
    { label: "ใบเสร็จ (ออกภายหลังได้)", state: needReceipt.length > 0 ? "current" : receipts.length === 0 ? "todo" : rcBad ? "warn" : "done",
      docs: receipts.map((m) => ({ key: `rc${m.id}`, kind: "receipt" as const, label: `ใบเสร็จ ${m.receiptNumber}`, src: `/print/receipt/${m.id}` })),
      onAdd: manage && needReceipt.length > 0 ? () => setReceiptOpen(true) : undefined, addLabel: "ออกใบเสร็จ", extra: groupNode,
      detail: needReceipt.length > 0 ? "ยังไม่ออกใบเสร็จ — ออกภายหลังได้ (รวมหรือแยกรายนักเรียน)" : receipts.length > 0 ? `${receipts.map((m) => m.receiptNumber).join(" · ")} · ${rcText}` : "ออกได้หลังยืนยันยอดเงิน" },
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
              <Button variant="row" size="inline" type="button" onClick={() => onOpen(inv.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline">
                <span className="font-medium">{stu(inv.studentId)?.nickname}</span>
                <span className="truncate font-mono text-xs text-muted-foreground">{inv.number ?? "ร่าง"}</span>
                {!inv.lines.length && !inv.advance.length && !inv.bookFee && inv.status === "draft" && <span className="shrink-0 text-xs text-muted-foreground">· ยังไม่มีคอร์ส — กดเพื่อเติม</span>}
              </Button>
              <Pill tone={invoiceTone(inv)}>{Bill.invoiceStatusLabel(inv)}</Pill>
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
          <h3 className="mb-2 text-sm font-semibold">ใบแจ้งหนี้ & รับเงิน</h3>
          <StepList steps={invoiceSteps} />
        </section>

        <section className="border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold">ใบเสร็จ</h3>
          <StepList steps={receiptSteps} />
        </section>

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
          <PanelMore items={[
            // owner 2026-11-24: delete is a MENU LIST — ลบทั้งชุด, then ลบของ[ชื่อ] per child (only children with no running number can be deleted)
            manage && members.length > 1 && members.every((x) => Bill.hasNoRunNo(x)) && { label: `ลบทั้งชุด (${members.length} ใบ)`, icon: Trash2Icon, destructive: true, onClick: () => setDeletingSet(true) },
            ...(manage ? members.filter((x) => Bill.hasNoRunNo(x)).map((x) => ({ label: `ลบของ ${stu(x.studentId)?.nickname ?? "—"}`, icon: Trash2Icon, destructive: true, onClick: () => setDeletingOne(x.id) })) : []),
            // with running numbers = real documents → void the set with a reason
            !voiding && !members.every((x) => Bill.hasNoRunNo(x)) && members.every((x) => x.payments.length === 0) && { label: "ยกเลิกทั้งชุด", icon: XCircleIcon, destructive: true, onClick: () => setVoiding(true) },
          ]} />
          {drafts.length > 0 && (
            <Button className="ml-auto" onClick={generateAll}><FileTextIcon /> สร้างใบแจ้งหนี้ทั้งชุด</Button>
          )}
          {drafts.length === 0 && pending.length === 0 && toIssue.length > 0 && (
            <Button className="ml-auto" onClick={() => each(toIssue, (i) => act.issue(i.id)) && report({ ok: true, value: undefined }, `ออกเลข Official ${toIssue.length} ใบแล้ว`)}><FileTextIcon /> ออกเลข Official ทั้งชุด</Button>
          )}
          {drafts.length === 0 && pending.length > 0 && canApproveAll && (
            <Button className="ml-auto" onClick={() => each(pending, (i) => act.approve(i.id)) && report({ ok: true, value: undefined }, "อนุมัติทั้งชุดแล้ว — Admin ออกเลข Official ได้")}><CheckIcon /> อนุมัติทั้งชุด</Button>
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
        <PaySlipDialog inv={payable[0].inv} owed={payable[0].owed} allTicked onClose={() => setPay(false)}
          siblings={payable.slice(1).map((r) => ({ id: r.inv.id, number: r.inv.number ?? "", nickname: stu(r.inv.studentId)?.nickname ?? "", owed: r.owed }))} />
      )}
      <MathGate open={deletingSet} onClose={() => setDeletingSet(false)} title="ลบทั้งชุด" confirmLabel="ลบถาวร"
        target={<>ใบชุดของ {famLabel} · {members.length} ใบ: {members.map((x) => stu(x.studentId)?.nickname ?? "—").join(", ")} · รวม {fmtMoney(grand)}</>}
        warning="ใบทุกใบในชุดนี้ยังไม่มีเลขรัน (ยังไม่ใช่เอกสารจริง) — ลบทั้งชุดแล้วกู้คืนไม่ได้"
        onConfirm={() => { setDeletingSet(false); if (report(act.delSet(members[0].id), "ลบใบแจ้งหนี้ทั้งชุดแล้ว")) onDeleted() }} />
      {(() => {
        const one = deletingOne ? rows.find((r) => r.inv.id === deletingOne) : undefined
        const nick = one ? stu(one.inv.studentId)?.nickname ?? "—" : ""
        return (
          <MathGate open={!!deletingOne} onClose={() => setDeletingOne(null)} title={`ลบใบแจ้งหนี้ของ ${nick}`} confirmLabel="ลบถาวร"
            target={one ? <>ใบแจ้งหนี้ของ {nick} · {Bill.invoiceStatusLabel(one.inv)} · {fmtMoney(one.total)} · อยู่ในชุดของ {famLabel}</> : null}
            warning="ใบนี้ยังไม่มีเลขรัน (ยังไม่ใช่เอกสารจริง) ลบแล้วกู้คืนไม่ได้ · ใบอื่นในชุดอยู่ต่อ — ถ้าเหลือใบเดียวจะกลายเป็นใบเดี่ยวทันที"
            onConfirm={() => { const delId = deletingOne!; setDeletingOne(null); const r = act.delOne(delId); if (report(r, "ลบใบแจ้งหนี้แล้ว")) onDeletedOne(r.value.remaining) }} />
        )
      })()}
    </>
  )
}
