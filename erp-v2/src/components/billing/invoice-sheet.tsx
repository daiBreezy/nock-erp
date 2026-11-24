"use client"

import { Tabs } from "@/components/app/page-layout"
import { syncEnrollInvoice } from "@/lib/forms"
import { ForceApprove } from "@/components/app/force-approve"
import Link from "next/link"
import { Fragment, useEffect, useState } from "react"
import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, CopyIcon, FileTextIcon, LayersIcon, PencilIcon, MessagesSquareIcon, PlusIcon, SendIcon, UploadIcon, XCircleIcon, Trash2Icon, UnlinkIcon, Undo2Icon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EntityPanel, PanelBody, PanelFooter, PanelForm, PanelMore } from "@/components/app/form-shell"
import { InvoiceEditor } from "./invoice-editor"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime, fmtMoney, fmtMonth } from "@/domain/dates"
import { mainLineAccount } from "@/domain/rules/people"
import * as Bill from "@/domain/rules/billing"
import * as Bank from "@/domain/rules/bank-accounts"
import { invoiceMemo } from "@/domain/rules/documents"
import { packageLabel } from "@/domain/rules/course"
import { can } from "@/domain/rules/permissions"
import { branchHasBus } from "@/domain/rules/settings"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { slipDataUrl } from "@/lib/image"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useShallow } from "zustand/react/shallow"
import { useStore } from "@/store/store"
import { invoiceTone } from "./status"
import { CreditNotes } from "./credit-notes"
import { type DocItem } from "./doc-thumbs"
import { StepList, type InvoiceStep } from "./step-list"
import { PaySlipDialog } from "./pay-slip-dialog"
import { PaymentRefInput } from "./payment-ref"
import { MergeInvoicesDialog, useMergeCandidates } from "./merge-invoices-dialog"
import { MathGate } from "@/components/app/math-gate"
import { PaymentMenu, RejectedPayments } from "./payment-actions"
import { IssueReceiptDialog } from "./issue-receipt-dialog"
import { AddToReceiptDialog } from "./add-to-receipt-dialog"
import { ReceiptLinesDialog } from "./receipt-lines-dialog"
import { BundleOverview } from "./bundle-overview"
import { InfoTip } from "@/components/app/info-tip"
import { Checkbox } from "@/components/ui/checkbox"

/** a titled group inside the expanded billing info */
function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}{hint && <span className="ml-1.5 font-normal normal-case">· {hint}</span>}</h4>
      {children}
    </div>
  )
}

/**
 * Invoice side panel (owner 2026-10-09 — same pattern as every entity): the invoice and its next step; แก้ไข switches
 * the panel to the editor; "new" opens the editor and becomes the invoice view once saved. Header · Body · Bottom.
 */
export function InvoiceSheet({ id, slipMediaId, defaultStudentId, renewEntitlementId, defaultCourseIds, onClose }: { id: ID | "new" | null; slipMediaId?: string; defaultStudentId?: ID; renewEntitlementId?: ID; /** courses the family is interested in — start ticked on a new invoice */ defaultCourseIds?: ID[]; onClose: () => void }) {
  return (
    <EntityPanel open={!!id} onClose={onClose} wide resizeKey="invoice">
      {id && <Panel key={id} id={id} slipMediaId={slipMediaId} defaultStudentId={defaultStudentId} renewEntitlementId={renewEntitlementId} defaultCourseIds={defaultCourseIds} onClose={onClose} />}
    </EntityPanel>
  )
}

function Panel({ id, slipMediaId, defaultStudentId, renewEntitlementId, defaultCourseIds, onClose }: { id: ID | "new"; slipMediaId?: string; defaultStudentId?: ID; renewEntitlementId?: ID; defaultCourseIds?: ID[]; onClose: () => void }) {
  const isNew = id === "new"
  const [createdId, setCreatedId] = useState<ID | null>(null)
  const [editing, setEditing] = useState(isNew)
  // after Duplicate the panel moves on to the new draft
  const [dupId, setDupId] = useState<ID | null>(null)
  // a family set (owner 2026-11-05): tabs  รวม | child | child …  — the set is worked on as one, a child's own invoice in its tab
  const [tab, setTab] = useState<"all" | ID>("all")
  const [addingFor, setAddingFor] = useState<ID | null>(null)
  const baseId = dupId ?? (isNew ? createdId : id)
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const link = useStore((s) => s.linkInvoices)
  const baseInv = baseId ? invoices.find((x) => x.id === baseId) : undefined
  const members = baseInv?.bundleId ? invoices.filter((x) => x.bundleId === baseInv.bundleId && x.status !== "void") : []
  const isBundle = members.length >= 2
  const shownId = isBundle && tab !== "all" ? tab : baseId
  const inv = shownId ? invoices.find((x) => x.id === shownId) : undefined
  if (addingFor && isBundle) return (
    <PanelForm>
      <InvoiceEditor defaultStudentId={addingFor} onClose={() => setAddingFor(null)}
        onSaved={(v) => { report(link([members[0].id, v.id]), "เพิ่มลูกเข้าชุดแล้ว"); setAddingFor(null); setTab(v.id) }} />
    </PanelForm>
  )
  if (editing && (inv || (isNew && !createdId))) return (
    <PanelForm>
      <InvoiceEditor invoice={inv} defaultStudentId={inv ? undefined : defaultStudentId} renewEntitlementId={inv ? undefined : renewEntitlementId} defaultCourseIds={inv ? undefined : defaultCourseIds}
        onClose={() => (inv ? setEditing(false) : onClose())}
        onSaved={(v) => { if (isNew) setCreatedId(v.id); setEditing(false); if (isBundle) setTab("all") }} />
    </PanelForm>
  )
  // owner 2026-11-20: the family set's tabs are the SAME Tabs as every other panel (a plain underline tab) — they were ghost Buttons, which carry a border on all four sides
  const tabs = isBundle && (
    <Tabs className="shrink-0 px-3" value={tab} onChange={(v) => setTab(v as "all" | ID)}
      options={[{ value: "all", label: `รวม (${members.length})` }, ...members.map((m) => ({ value: m.id as string, label: students.find((x) => x.id === m.studentId)?.nickname ?? "—" }))]} />
  )
  // owner 2026-11-24: after a delete the panel moves on — to what is left of the set (a lone one is a single invoice now), or closes
  const afterDelete = (remaining: ID[]) => { if (!remaining.length) onClose(); else { setDupId(remaining[0]); setTab("all") } }
  if (isBundle && tab === "all") return <BundleOverview members={members} onOpen={setTab} onAddChild={setAddingFor} onDeleted={onClose} onDeletedOne={afterDelete} tabs={tabs} />
  return shownId ? <Body key={shownId} id={shownId} slipMediaId={slipMediaId} onEdit={() => setEditing(true)} onDuplicated={setDupId} onDeleted={afterDelete} tabs={tabs} /> : null
}

function Body({ id, slipMediaId, onEdit, onDuplicated, onDeleted, tabs }: { id: ID; slipMediaId?: string; onEdit: () => void; onDuplicated: (id: ID) => void; onDeleted: (remaining: ID[]) => void; /** the family set's tabs — they sit right under the header */ tabs?: React.ReactNode }) {
  const inv = useStore((s) => s.invoices.find((x) => x.id === id))
  const branch = useBranch()
  const branches = useStore((s) => s.branches)
  const me = useStore((s) => s.me())
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const brandMemos = useStore((s) => s.system.invoiceMemos)
  const act = useStore(useShallow((s) => ({ create: s.createInvoice, issue: s.issueInvoice, del: s.deleteInvoice, delSet: s.deleteInvoiceSet, approve: s.approveInvoice, send: s.sendInvoice, void: s.voidInvoice, notifyVoid: s.notifyVoid, duplicate: s.duplicateInvoice, setNote: s.setInvoiceNote, pay: s.recordPayment, payGroup: s.recordGroupPayment, confirm: s.confirmPayment, regroup: s.setReceiptGrouping, sendAgreement: s.sendAgreement, confirmAgreement: s.confirmAgreement })))
  const invoices = useStore((s) => s.invoices)
  // the message to the parent: this invoice's, else the one from this student's last invoice — editable until it is sent
  const prevNote = inv ? Bill.lastNoteFor(inv.studentId, invoices, inv.id) : ""
  const [note, setNote] = useState(inv?.noteToParent || prevNote)
  const [showAll, setShowAll] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState("")
  const [payOpen, setPayOpen] = useState(!!slipMediaId)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [deleting, setDeleting] = useState<false | "one" | "set">(false)
  const [merging, setMerging] = useState(false)
  const mergeCandidates = useMergeCandidates(inv)
  // owner 2026-11-24: every delete says WHAT it deletes — this child's invoice, or the whole set
  const nickOf = (x: { studentId: ID }) => students.find((y) => y.id === x.studentId)?.nickname ?? "—"
  const setMembers = inv?.bundleId ? invoices.filter((x) => x.bundleId === inv.bundleId && x.status !== "void") : []
  const canDeleteSet = setMembers.length >= 2 && setMembers.every((x) => Bill.hasNoRunNo(x))
  const [refunding, setRefunding] = useState(false) // owner 2026-11-24: opened from the ⋯ menu
  const [addOpen, setAddOpen] = useState(false) // owner 2026-11-24: pull more invoices onto an issued receipt
  const [linesOpen, setLinesOpen] = useState(false) // owner 2026-11-23: receipt combine list
  // owner 2026-11-20: the PDF asks first when the parent has not confirmed the course summary
  const [slip, setSlip] = useState<string | undefined>()
  // one slip for siblings' invoices (owner 2026-10-29)
  const [receiptIds, setReceiptIds] = useState<ID[] | null>(null)
  // "ใช้เป็นสลิป" from the LINE chat: the parent's photo arrives pre-attached, amount = what is still owed
  useEffect(() => {
    if (!slipMediaId) return
    let cancelled = false
    fetch(`/api/line/media/${slipMediaId}`)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => slipDataUrl(new File([b], "slip.jpg", { type: b.type })))
      .then((url) => { if (!cancelled) setSlip(url) })
      .catch(() => report({ ok: false, error: "ดึงรูปสลิปจากแชทไม่สำเร็จ — แนบรูปเองได้" }, ""))
    return () => { cancelled = true }
  }, [slipMediaId])
  if (!inv) return null

  const totals = Bill.invoiceTotals(inv, { branch, courses, classes, holidays })
  const memo = invoiceMemo(inv, { brandMemo: brandMemos[branch.brand], branch, courses, classes })
  const stu = students.find((s) => s.id === inv.studentId)
  const fam = families.find((f) => f.id === stu?.familyId)
  // owner 2026-11-24: who the invoice went to + a chat button to that LINE conversation in Inbox (main LINE account first)
  const convs = useStore((st) => st.conversations)
  const mainAccount = fam ? mainLineAccount(fam) : undefined
  const conv = fam ? convs.find((c) => c.familyId === fam.id && !!mainAccount && c.id === `line_${mainAccount}`) ?? convs.find((c) => c.familyId === fam.id) : undefined
  const who = (uid?: ID) => staff.find((s) => s.id === uid)?.nickname ?? "—"
  const paidConfirmed = Bill.paidAmount(inv)
  const paidAll = inv.payments.reduce((a, p) => a + p.amount, 0)
  const approveCheck = Bill.canApprove(inv, me)
  // "x" stands in for the remark — only asks whether Force is available at all
  const canForce = Bill.canForceApprove(inv, me, "x").ok
  const manage = can(me, "billing.manage")
  // the invoice reached the parent: the next step is the slip — Upload becomes the main button, "send again" the secondary one
  // owner 2026-11-24: a parent with no LINE counts as sent too — the admin gives the invoice another way (download / print / email), so the step is passed and the next one is the payment
  const sentToParent = inv.status === "sent" && (inv.delivery === "delivered" || inv.delivery === "no_line")
  const canAddPayment = ((inv.status === "approved" && !!inv.number) || inv.status === "sent") && manage && paidAll < totals.total
  const ctx = { branch, courses, classes, holidays }
  const owed = (x: typeof inv) => Bill.owedOn(x, Bill.invoiceTotals(x, ctx).total)
  const nick = (studentId: ID) => students.find((x) => x.id === studentId)?.nickname ?? "—"
  // siblings' invoices the same slip can pay: same family + branch, approved, still owed
  const siblingsPayable = fam ? invoices.filter((x) => x.id !== inv.id && x.branchId === inv.branchId && ["approved", "sent"].includes(x.status) && students.find((y) => y.id === x.studentId)?.familyId === fam.id && owed(x) > 0) : []
  const group = Bill.paymentGroup(inv, invoices)
  const combined = receiptIds ?? group.filter((x) => x.receiptNumber && group.filter((y) => y.receiptNumber === x.receiptNumber).length > 1).map((x) => x.id)
  const toggle = (list: ID[], id: ID) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  // owner 2026-11-20: course summary → parent confirms → PDF. A family set shares ONE summary (sent / confirmed for every child together)
  const setIds = (inv.bundleId ? invoices.filter((x) => x.bundleId === inv.bundleId && x.status !== "void") : [inv]).map((x) => x.id)
  const agState = Bill.agreementState(inv, totals)
  // owner 2026-11-24: the course summary (the old LINE text) is OPTIONAL and lives in the first step — creating the invoice never waits for it
  const generate = () => report(act.create(inv.id), "สร้างใบแจ้งหนี้แล้ว — รอคนอื่นอนุมัติ (ยังไม่มีเลข)")
  const issue = () => report(act.issue(inv.id), (v) => `ออกเลข Official แล้ว · ${v.number}`)
  // owner 2026-11-24: a branch with no bank account cannot create / issue / send (an invoice already with the parent keeps its own account)
  const invBranch = branches.find((b) => b.id === inv.branchId)
  const noBank = !inv.bankSnapshot && invBranch ? Bank.billingBlockReason(invBranch) : null
  const setInvs = inv.bundleId ? invoices.filter((x) => x.bundleId === inv.bundleId && x.status !== "void") : [inv]
  const agreementBlock = Bill.agreementBlockReason(setInvs.map((x) => { const stu0 = students.find((y) => y.id === x.studentId); return { inv: x, totals: Bill.invoiceTotals(x, { branch, courses, classes, holidays }), student: stu0, family: families.find((f) => f.id === stu0?.familyId) } }))
  const agreementNode = (inv.status === "draft" && manage) || inv.agreement ? (
    <div className="mt-1.5 space-y-1.5 text-xs">
      <p className="text-muted-foreground">
        สรุปคอร์สให้ผู้ปกครอง (ไม่บังคับ) · {Bill.AGREEMENT_LABEL[agState]}{setIds.length > 1 ? ` · ทั้งชุด ${setIds.length} ใบ` : ""}
        {inv.agreement && ` · ${fmtDateTime(inv.agreement.sentAt)} โดย ${who(inv.agreement.sentBy)}${inv.agreement.confirmedAt ? ` → ยืนยัน ${fmtDateTime(inv.agreement.confirmedAt)}` : ""}`}
      </p>
      {inv.status === "draft" && manage && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" variant="outline" disabled={!!agreementBlock} title={agreementBlock ?? undefined} onClick={() => report(act.sendAgreement(inv.id), agState === "none" ? "ส่งสรุปคอร์สให้ผู้ปกครองแล้ว" : "ส่งสรุปคอร์สอีกครั้งแล้ว")}><SendIcon /> {agState === "none" ? "ส่งสรุปคอร์ส (ข้อความ LINE)" : "ส่งสรุปอีกครั้ง"}</Button>
          {agreementBlock && <span className="basis-full text-warning-ink">ส่งไม่ได้ตอนนี้: {agreementBlock}</span>}
          {agState === "sent" && <Button size="xs" onClick={() => report(act.confirmAgreement(setIds), "บันทึกแล้ว — ผู้ปกครองยืนยันสรุปคอร์ส")}><CheckIcon /> ผู้ปกครองยืนยันแล้ว</Button>}
        </div>
      )}
    </div>
  ) : undefined
  // payments + shared-slip receipt grouping live under their own steps (owner 2026-11-05)
  const paymentsNode = inv.payments.length > 0 || inv.rejectedPayments?.length ? (
    <>
    {inv.payments.length > 0 && <ul className="mt-2.5 divide-y rounded-xl border text-sm">
                  {inv.payments.map((p) => {
                    const c = Bill.canConfirmPayment(p, me, inv.branchId)
                    return (
                      <li key={p.id} className="space-y-2 p-3">
                      {/* owner 2026-11-24: amount on top, the details under it, the actions on the right — one clean block per payment */}
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-semibold tabular-nums">{fmtMoney(p.amount)}</p>
                          <p className="break-words text-xs text-muted-foreground">{p.method === "cash" ? "เงินสด" : "โอน"}{p.reference && ` · Ref ${p.reference}`}</p>
                          <p className="text-xs text-muted-foreground">บันทึกโดย {who(p.recordedBy)}</p>
                          {p.groupId && group.length > 1 && <Pill tone="blue" className="mt-1 whitespace-normal">สลิปเดียวกับ {group.filter((x) => x.id !== inv.id).map((x) => `${x.number} ${nick(x.studentId)}`).join(", ")}</Pill>}
                        </div>
                        <span className="flex shrink-0 items-center gap-1">
                          {p.confirmedBy ? (
                            <Pill tone={p.forced ? "amber" : "green"} title={p.forced?.remark}>{p.forced ? "Force · " : ""}ยืนยันโดย {who(p.confirmedBy)}</Pill>
                          ) : Bill.paymentRefError(p) ? (
                            <Pill tone="amber" className="whitespace-normal">ต้องมี Ref ID ก่อนยืนยันยอด</Pill>
                          ) : c.ok ? (
                            <Button size="xs" onClick={() => report(act.confirm(inv.id, p.id), (v) => (v.paid ? "ยืนยันแล้ว · ชำระครบ ออกใบเสร็จ + เพิ่มเข้าคลาสแล้ว" : "ยืนยันยอดแล้ว"))}>ยืนยันยอด</Button>
                          ) : Bill.canForceConfirmPayment(p, me, inv.branchId, "x").ok ? (
                            <ForceApprove label="Force ยืนยันยอด" onForce={(remark) => act.confirm(inv.id, p.id, remark)} success="Force ยืนยันยอดแล้ว — แจ้งทั้งสาขา + Director" />
                          ) : (
                            <Pill tone="amber" className="whitespace-normal">รอคนอื่นยืนยัน</Pill>
                          )}
                          {!p.confirmedBy && manage && <PaymentMenu invoiceId={inv.id} branchId={inv.branchId} payment={p} />}
                        </span>
                      </div>
                        {!p.confirmedBy && Bill.paymentRefError(p) && manage && <PaymentRefInput invoiceId={inv.id} paymentId={p.id} />}
                      </li>
                    )
                  })}
                </ul>}
    <RejectedPayments list={inv.rejectedPayments ?? []} who={who} />
    </>
  ) : null
  const groupNode = group.length > 1 && group.every((x) => x.status === "paid") && group.some((x) => x.receiptNumber) ? (
    <div className="mt-1.5 space-y-1.5 rounded-lg border p-2.5">
      <p className="text-xs font-medium">ใบเสร็จของสลิปนี้</p>
      <div className="flex gap-1.5">
        {([["combined", "รวมทุกใบ", group.map((x) => x.id)], ["separate", "แยกรายนักเรียน", [] as ID[]]] as const).map(([k, label, ids]) => {
          const on = k === "combined" ? combined.length === group.length : combined.length === 0
          return (
            <Button variant="chip" size="inline" key={k} type="button" disabled={!manage} aria-pressed={on} onClick={() => !on && report(act.regroup(inv.id, [...ids]), k === "combined" ? "รวมเป็นใบเสร็จเดียวแล้ว" : "แยกใบเสร็จรายนักเรียนแล้ว")}
              className="flex-1 px-3 py-1 text-xs disabled:opacity-60">{label}</Button>
          )
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
      {manage && receiptIds && <Button size="xs" variant="outline" onClick={() => report(act.regroup(inv.id, receiptIds), "จัดใบเสร็จแล้ว") && setReceiptIds(null)}>บันทึกการจัดใบเสร็จ</Button>}
    </div>
  ) : null
  // documents shown on their step: invoice PDF · pay slips (one slip shared by siblings counts once) · receipts (one per receipt number)
  const slips = [...new Set(inv.payments.map((p) => p.slip).filter((x): x is string => !!x))]
  const receipts = [...new Map(group.filter((x) => x.receiptNumber).map((x) => [x.receiptNumber!, x])).values()]
  const docsFor = {
    // before the Official number is issued the paper is the same preview as in the form (number "DRAFT") — owner 2026-11-24
    invoice: inv.status === "void" ? [] : [{ key: "inv", kind: "invoice" as const, label: inv.pdf === "ready" ? `ใบแจ้งหนี้ ${inv.number ?? ""}`.trim() : "ตัวอย่างใบแจ้งหนี้ (ยังไม่มีเลข)", src: `/print/invoice/${inv.id}` }],
    slip: slips.map((src, i) => ({ key: `slip${i}`, kind: "slip" as const, label: `สลิป${slips.length > 1 ? ` ${i + 1}` : ""}`, src })),
    receipt: receipts.map((x) => ({ key: `rc${x.id}`, kind: "receipt" as const, label: `ใบเสร็จ ${x.receiptNumber}`, src: `/print/receipt/${x.id}` })),
  } satisfies Record<string, DocItem[]>
  const steps: InvoiceStep[] = [
    { label: "สร้างใบ", state: inv.status === "draft" ? "current" : "done", meta: inv.status === "draft" ? undefined : `${fmtDateTime(inv.createdAt)} · ${who(inv.createdBy)}`, detail: inv.status === "draft" ? "ร่าง — ยังไม่ได้สร้างใบแจ้งหนี้" : "ข้อมูลจริงครบ · ยังไม่มีเลข", extra: agreementNode, onAdd: inv.status === "draft" && manage ? generate : undefined, addLabel: "สร้างใบแจ้งหนี้" },
    {
      label: "อนุมัติ (คนอื่นที่ไม่ใช่คนสร้าง)",
      // Force Approve sits right under its own step (owner 2026-11-05)
      extra: inv.status === "pending_approval" && !approveCheck.ok ? (
        <div className="mt-1.5 space-y-1.5">
          <p className="text-xs text-muted-foreground">{approveCheck.error}</p>
          {canForce && <ForceApprove label="Force Approve" onForce={(remark) => act.approve(inv.id, remark)} success="Force Approve แล้ว — แจ้งทั้งสาขา + Director" />}
        </div>
      ) : undefined,
      state: inv.approvedBy ? "done" : inv.status === "pending_approval" ? "current" : "todo",
      meta: inv.approvedBy ? `${inv.approvedAt ? `${fmtDateTime(inv.approvedAt)} · ` : ""}${who(inv.approvedBy)}` : undefined,
      detail: inv.approvedBy ? (inv.forced ? `Force Approve · เหตุผล: ${inv.forced.remark}` : "") : inv.status === "pending_approval" ? "รออนุมัติ" : "—",
    },
    {
      label: "ออกเลข Official + PDF (Admin)",
      state: inv.number && inv.pdf === "ready" ? "done" : inv.status === "approved" ? "current" : "todo",
      docs: docsFor.invoice,
      detail: inv.number ? inv.number : inv.status === "approved" ? "อนุมัติแล้ว — Admin กดออกเลขได้ทันที" : "—",
    },
    {
      label: "ส่งถึงผู้ปกครอง",
      state: inv.delivery === "delivered" || inv.delivery === "no_line" ? "done" : inv.delivery === "failed" ? "warn" : (inv.status === "approved" && !!inv.number) || inv.delivery === "sending" ? "current" : "todo",
      meta: inv.sentAt ? fmtDateTime(inv.sentAt) : undefined,
      detail: inv.delivery === "delivered" ? "ถึงผู้ปกครองทาง LINE"
        : inv.delivery === "sending" ? "กำลังส่งทาง LINE…"
        : inv.delivery === "failed" ? `ส่ง LINE ไม่สำเร็จ — ${inv.deliveryError ?? "ลองส่งอีกครั้ง"}`
        : inv.delivery === "no_line" ? <span className="inline-flex items-start gap-1.5"><UnlinkIcon role="img" aria-label="ไม่มี LINE" className="mt-0.5 size-3.5 shrink-0 text-warning"><title>ไม่มีผู้ปกครองที่ผูก LINE — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้</title></UnlinkIcon><span>ผู้ปกครองไม่มี LINE — ดาวน์โหลด / พิมพ์ใบ แล้วส่งทางอื่น (อีเมล หรือให้ด้วยตัวเอง) · รอรับเงินต่อได้เลย</span></span> : "—",
      extra: inv.sentAt && fam && inv.delivery !== "no_line" ? (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="min-w-0 truncate text-muted-foreground">ส่งให้ <span className="font-medium text-foreground">{fam.name}</span>{fam.parents.find((p) => p.primary) ? ` · ${fam.parents.find((p) => p.primary)!.name}` : ""}</span>
          <Button size="icon-sm" variant="outline" className="rounded-full" disabled={!conv} aria-label="เปิดแชท LINE ในหน้า Inbox" title={conv ? "เปิดแชท LINE กับผู้ปกครองใน Inbox" : "ครอบครัวนี้ยังไม่มีแชท LINE ใน Inbox"} nativeButton={!conv} render={conv ? <Link href={`/inbox?conversation=${conv.id}`} /> : undefined}><MessagesSquareIcon /></Button>
        </div>
      ) : undefined,
    },
    {
      label: "รับเงิน (บันทึก + ยืนยันโดยอีกคน)",
      // owner 2026-11-24: once the invoice reached the parent this step is the pending one (waiting for the slip)
      state: inv.status === "paid" ? "done" : paidAll > 0 || sentToParent ? "current" : "todo",
      docs: docsFor.slip,
      extra: paymentsNode,
      onAdd: canAddPayment ? () => setPayOpen(true) : undefined,
      addLabel: "อัปโหลดสลิปการชำระเงิน",
      meta: inv.payments.length ? `${fmtDateTime(inv.payments[inv.payments.length - 1].recordedAt)} · ${who(inv.payments[inv.payments.length - 1].recordedBy)}` : undefined,
      detail: inv.payments.length ? `ยืนยันแล้ว ${fmtMoney(paidConfirmed)} / ${fmtMoney(totals.total)}${inv.status === "paid" ? " · นักเรียนเข้าคลาสแล้ว" : " · ยืนยันยอดแล้วนักเรียนเข้าคลาสทันที"}` : sentToParent ? "รอผู้ปกครองชำระเงิน" : "—",
    },
    {
      label: "ใบเสร็จ (ออกภายหลังได้)",
      state: !inv.receiptNumber ? (inv.status === "paid" ? "current" : "todo") : inv.receiptDelivery === "failed" || inv.receiptDelivery === "no_line" ? "warn" : "done",
      docs: docsFor.receipt,
      onAdd: inv.status === "paid" && !inv.receiptNumber && manage ? () => setReceiptOpen(true) : undefined,
      addLabel: "ออกใบเสร็จ",
      extra: <>{groupNode}{inv.receiptNumber && manage && <Button size="xs" variant="outline" className="mt-1.5" onClick={() => setLinesOpen(true)}><LayersIcon /> รวมรายการในใบเสร็จ{inv.receiptMerges?.length ? ` (${inv.receiptMerges.length})` : ""}</Button>}{inv.receiptNumber && manage && <Button size="xs" variant="outline" className="mt-1.5 ml-1.5" onClick={() => setAddOpen(true)}><PlusIcon /> เพิ่มใบอื่นเข้าใบเสร็จ</Button>}</>,
      detail: !inv.receiptNumber ? (inv.status === "paid" ? "ยังไม่ออกใบเสร็จ — ออกภายหลังได้" : "—") : `${inv.receiptNumber}${inv.receiptNumber !== Bill.receiptNumberOf(inv.number) ? ` (รวม)` : ""} · ${inv.receiptDelivery === "delivered" ? "ส่งใบเสร็จทาง LINE แล้ว" : inv.receiptDelivery === "sending" ? "กำลังส่งใบเสร็จทาง LINE…" : inv.receiptDelivery === "failed" ? "ส่งใบเสร็จทาง LINE ไม่สำเร็จ" : inv.receiptDelivery === "no_line" ? "ไม่มี LINE — ส่งใบเสร็จทางอื่น" : "ออกใบเสร็จแล้ว"}`,
    },
  ]

  // the action box only when it has something to show (sending + recording money now live in the Note section / the payment step)
  const showAction = (inv.status === "draft" && manage) || (inv.status === "pending_approval" && approveCheck.ok) || inv.status === "void"
  // owner 2026-11-19: the admin can always send again once it has been sent — the parent may not have seen it, for any reason
  const canSendNote = ((inv.status === "approved" && !!inv.number) || inv.status === "sent") && manage
  const noteEditable = manage && inv.status !== "paid" && inv.status !== "void"
  const noteSaved = (inv.noteToParent || "") === note.trim()
  // owner 2026-11-24: each concern has its own section — the invoice (create → send → receive the money) · the receipt · refund
  const RECEIPT_STEPS = ["ใบเสร็จ (ออกภายหลังได้)"]
  const invoiceSteps = steps.filter((x) => !RECEIPT_STEPS.includes(x.label))
  const receiptSteps = steps.filter((x) => RECEIPT_STEPS.includes(x.label))
  const stepList = (list: typeof steps) => <StepList steps={list} />
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-2 pr-8">
          <SheetTitle className="min-w-0 flex-1 truncate text-lg">{inv.number ?? "ใบแจ้งหนี้ (ยังไม่มีเลข)"}</SheetTitle>
          {/* "no LINE" is an icon everywhere (owner 2026-10-12) — hover explains */}
          {inv.delivery === "no_line" && <UnlinkIcon role="img" aria-label="ไม่มี LINE" className="size-4 shrink-0 text-warning"><title>ไม่มีผู้ปกครองที่ผูก LINE — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้</title></UnlinkIcon>}
          {inv.delivery === "failed" && <UnlinkIcon role="img" aria-label="ส่ง LINE ไม่สำเร็จ" className="size-4 shrink-0 text-danger"><title>ส่ง LINE ไม่สำเร็จ</title></UnlinkIcon>}
          <Pill tone={invoiceTone(inv)}>{Bill.invoiceStatusLabel(inv)}</Pill>
        </div>
        <SheetDescription>
          {stu?.nickname} ({stu?.grade}) · {fam?.name ?? "ยังไม่ผูกครอบครัว"}
        </SheetDescription>
      </SheetHeader>
      {tabs}

      <PanelBody>
        {noBank && ["draft", "pending_approval", "approved"].includes(inv.status) && (
          <p className="flex items-start gap-2 rounded-xl bg-danger-soft/50 p-2.5 text-xs text-danger-ink"><AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />{noBank} {inv.status === "draft" ? "· ใบร่างนี้จะใช้บัญชีใหม่โดยอัตโนมัติเมื่อบัญชีมาถึง" : "· ใบนี้ถูกหยุดไว้ — กลับมาทำต่อได้เมื่อบัญชีมาถึง"}</p>
        )}
        {inv.status === "void" && <p className="rounded-lg bg-danger-soft/60 p-3 text-sm text-danger-ink">ยกเลิกแล้ว: {inv.voidReason}</p>}
        {/* Billing info as an accordion (owner 2026-11-05): Student · Promotion · Course · Advance · Bus · Summary */}
        {/* the message to the parent (owner 2026-11-05): remembered per student — the last one comes back on the next invoice, editable until it is sent */}
        {inv.status !== "void" && (noteEditable || inv.noteToParent) && (
          <section className="space-y-1.5">
            <Label className="text-xs">ข้อความถึงผู้ปกครอง{canSendNote ? " *" : ""}
              <InfoTip text={<>
                <span className="block">ใส่ข้อความถึงผู้ปกครองที่จะไปพร้อมใบแจ้งหนี้ — บันทึกให้อัตโนมัติเมื่อพิมพ์เสร็จ แก้ได้จนกว่าใบจะชำระแล้ว</span>
                <span className="mt-1 block">ข้อความของ{stu?.nickname}ในครั้งก่อนจะขึ้นมาให้เสมอ แก้หรือลบได้ก่อนส่ง</span>
                {canSendNote && <span className="mt-1 block">กด “ส่งผู้ปกครอง” ที่ปุ่มด้านล่าง — ยอด รายการ และเลขบัญชีจะอยู่ในข้อความ{fam?.lineUserId ? ` (ส่งเข้าแชท LINE ของ${fam.name}จริง)` : ""}</span>}
                {canSendNote && !fam?.parents.some((p) => p.lineLinked) && <span className="mt-1 block text-warning">ผู้ปกครองยังไม่ผูก LINE — ระบบจะบันทึกว่าส่งแล้วแต่ “ยังไม่ถึงผู้ปกครอง” ต้องส่งทางอื่น</span>}
              </>} />
            </Label>
            <Textarea rows={2} value={note} disabled={!noteEditable} onChange={(e) => setNote(e.target.value)}
              onBlur={() => { if (noteEditable && !noteSaved) report(act.setNote(inv.id, note), "บันทึกข้อความแล้ว") }}
              placeholder="เช่น ค่าเรียนเดือนตุลาคม ชำระภายใน 5 ต.ค." />
          </section>
        )}

        {/* Billing info (owner 2026-11-05): the summary always visible; one expander opens the whole invoice */}
        <section className="rounded-lg border px-3">
          <Button variant="row" size="inline" type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className="flex w-full items-center gap-2 py-2 text-left text-sm">
            <span className="font-mono text-xs text-muted-foreground">{inv.number ?? (inv.status === "draft" ? "ร่าง" : "ยังไม่มีเลข")}</span>
            <span className="ml-auto text-xs text-muted-foreground">ยอดรวม</span>
            <span className="font-semibold tabular-nums">{fmtMoney(totals.total)}</span>
            <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", showAll && "rotate-180")} />
          </Button>
          {showAll && (
            <div className="space-y-3 border-t py-3">
              <table className="w-full text-xs tabular-nums"><tbody>
                {([["ค่าเรียน", totals.course + totals.courseFee], ["Advance / ค่าหนังสือ", totals.advance + totals.book], ["ค่ารถ", totals.bus + totals.busExtra]] as const).filter(([, v]) => v > 0).map(([l, v]) => <tr key={l}><td className="py-0.5">{l}</td><td className="py-0.5 text-right">{fmtMoney(v)}</td></tr>)}
                {totals.promotion + totals.credit + totals.concession > 0 && <tr className="text-success"><td className="py-0.5">ส่วนลด / โปรโมชัน</td><td className="py-0.5 text-right">−{fmtMoney(totals.promotion + totals.credit + totals.concession)}</td></tr>}
                {totals.rounding > 0 && <tr className="text-muted-foreground"><td className="py-0.5">ปัดเศษ (Liclass ปัดขึ้นหลักสิบ)</td><td className="py-0.5 text-right">+{fmtMoney(totals.rounding)}</td></tr>}
                <tr className="border-t font-semibold"><td className="py-1">ยอดรวม</td><td className="py-1 text-right text-sm">{fmtMoney(totals.total)}</td></tr>
              </tbody></table>
              <div className="space-y-4 border-t pt-3">
          <Block title="Student">
            <p className="text-sm"><span className="font-medium">{stu?.nickname}</span> <span className="text-muted-foreground">{stu?.name} · {stu?.grade}</span></p>
            <p className="text-xs text-muted-foreground">{fam ? `${fam.name} · ${fam.parents.find((p) => p.primary)?.name ?? ""}` : "ยังไม่ผูกครอบครัว"}</p>
            {memo.memo && (
              <p className="rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-line text-muted-foreground">
                <span className="font-medium text-foreground">Memo บนใบแจ้งหนี้ + ใบเสร็จ{memo.periods.length ? ` · จากช่วง ${memo.periods.map((p) => p.name).join(", ")}` : " · ของแบรนด์"}</span>{"\n"}{memo.memo}
              </p>
            )}
          </Block>
          <Block title="Promotion" hint="ส่วนลด / โปรโมชัน">
            <table className="w-full text-sm tabular-nums"><tbody className="divide-y">
              {totals.lines.filter((l) => l.promotion > 0).map((l) => <tr key={l.line.id} className="text-success"><td className="py-1">{l.course?.name} · {l.promotionName}</td><td className="py-1 text-right">−{fmtMoney(l.promotion)}</td></tr>)}
              {totals.lines.filter((l) => l.bonusMinutes > 0).map((l) => <tr key={`b${l.line.id}`} className="text-success"><td className="py-1" colSpan={2}>{l.course?.name} · {l.bonusName} — แถมเวลาเรียนเพิ่ม {l.bonusMinutes / 60} ชม. (ไม่เพิ่มราคา)</td></tr>)}
              {totals.credit > 0 && <tr className="text-special-ink"><td className="py-1">หักเครดิตคอร์ส</td><td className="py-1 text-right">−{fmtMoney(totals.credit)}</td></tr>}
              {totals.concession > 0 && <tr className="text-success"><td className="py-1">ส่วนลดพิเศษ · {inv.concession?.remark}</td><td className="py-1 text-right">−{fmtMoney(totals.concession)}</td></tr>}
            </tbody></table>
            {totals.promotion + totals.credit + totals.concession === 0 && !totals.lines.some((l) => l.bonusMinutes > 0) && <p className="text-xs text-muted-foreground">ไม่มีส่วนลด / โปรโมชันในใบนี้</p>}
          </Block>
          <Block title="Course">
            {totals.lines.length === 0 && <p className="text-xs text-muted-foreground">ใบนี้ไม่มีคอร์ส (เก็บเฉพาะค่าอื่นๆ)</p>}
            <table className="w-full text-sm tabular-nums"><tbody className="divide-y">
              {totals.lines.map(({ line, course, klasses, quote, courseFee }) => course && quote && (
                <Fragment key={line.id}>
                  <tr>
                    <td className="py-2" colSpan={2}>
                      <div className="font-medium">{course.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {klasses.map((k) => k.name).join(" + ")} · {fmtDate(quote.from)} → {fmtDate(quote.to, { year: true })} · {quote.sessions.length} คาบ · {quote.hours} ชม.
                        {quote.skipped.length > 0 && ` · ข้ามวันหยุด ${quote.skipped.map((d) => fmtDate(d)).join(", ")}`}
                      </div>
                    </td>
                  </tr>
                  {quote.periods.map((p) => (
                    <tr key={p.month} className="text-muted-foreground">
                      <td className="py-1 pl-4">{course.unit === "month" ? `${fmtMonth(p.month + "-01")} · ${p.sessions.length} คาบ (${Math.round(p.factor * 100)}%)` : `${packageLabel(course)} × ${line.periods} · ${p.sessions.length} คาบ`}</td>
                      <td className="py-1 text-right">{fmtMoney(p.amount)}</td>
                    </tr>
                  ))}
                  {courseFee > 0 && <tr className="text-muted-foreground"><td className="py-1 pl-4">Course fee (ค่าอุปกรณ์)</td><td className="py-1 text-right">{fmtMoney(courseFee)}</td></tr>}
                </Fragment>
              ))}
            </tbody></table>
          </Block>
          <Block title="Advance" hint="ไม่บังคับ">
            <table className="w-full text-sm tabular-nums"><tbody className="divide-y">
              {inv.advance.map((a) => <tr key={a.feeId}><td className="py-1">{a.name}</td><td className="py-1 text-right">{fmtMoney(a.amount)}</td></tr>)}
              {totals.book > 0 && <tr><td className="py-1">ค่าหนังสือ</td><td className="py-1 text-right">{fmtMoney(totals.book)}</td></tr>}
            </tbody></table>
            {totals.advance + totals.book === 0 && <p className="text-xs text-muted-foreground">ไม่มีค่าแรกเข้า / ค่าสอบ / ค่าหนังสือ</p>}
          </Block>
          {branchHasBus(branch) && (
          <Block title="Bus" hint="ไม่บังคับ">
            <table className="w-full text-sm tabular-nums"><tbody className="divide-y">
              {totals.bus > 0 && <tr><td className="py-1">ค่ารถ {branch.fees.find((f) => f.id === inv.busFeeId)?.name ?? ""} ({inv.bus.reduce((a, l) => a + +l.pickup + +l.dropoff, 0)} เที่ยว)</td><td className="py-1 text-right">{fmtMoney(totals.bus)}</td></tr>}
              {totals.busExtra > 0 && <tr><td className="py-1">ค่ารถเพิ่ม (รอบก่อน) · {(inv.busExtras ?? []).map((x) => fmtDate(x.date)).join(", ")}</td><td className="py-1 text-right">{fmtMoney(totals.busExtra)}</td></tr>}
            </tbody></table>
            {totals.bus + totals.busExtra === 0 && <p className="text-xs text-muted-foreground">ไม่ได้ใช้รถรับส่ง</p>}
          </Block>
          )}
              </div>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">ใบแจ้งหนี้ & รับเงิน</h3>
          {stepList(invoiceSteps)}
        </section>

        {/* ---------- next action for the current state ---------- */}
        {showAction && (
        <section className="space-y-2 rounded-lg border p-3">
          {inv.status === "draft" && manage && <p className="text-sm text-muted-foreground">ร่าง — ตรวจรายการแล้วกด “สร้างใบแจ้งหนี้” ด้านล่าง ใบจะเกิดขึ้นจริง (ยังไม่มีเลข) แล้วรอคนอื่นอนุมัติ</p>}
          {inv.status === "pending_approval" && approveCheck.ok && <p className="text-sm text-muted-foreground">รออนุมัติ — ตรวจใบแล้วกด “อนุมัติ” ด้านล่าง</p>}
          {inv.status === "void" && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">ใบนี้ถูกยกเลิก — ระบบไม่ได้แจ้งผู้ปกครองให้อัตโนมัติ</p>
              {manage && (inv.voidNotifiedAt
                ? <span className="text-xs text-muted-foreground">แจ้งผู้ปกครองแล้ว</span>
                : <Button size="xs" variant="outline" onClick={() => report(act.notifyVoid(inv.id), "ส่งข้อความแจ้งผู้ปกครองแล้ว")}>แจ้งผู้ปกครองว่ายกเลิกใบนี้</Button>)}
            </div>
          )}
        </section>
        )}

        <section className="border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold">ใบเสร็จ</h3>
          {stepList(receiptSteps)}
        </section>


        <CreditNotes inv={inv} creating={refunding} onCreatingChange={setRefunding} />

        {voiding && (
          <section className="space-y-2 rounded-lg border border-danger/30 p-3">
            <Label className="text-xs">เหตุผลการยกเลิก *</Label>
            <Textarea rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ใส่คอร์สผิด จะออกใบใหม่" />
            {inv.payments.length > 0 && <p className="text-xs text-danger">มีการรับเงินแล้ว ยกเลิกไม่ได้</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setVoiding(false)}>ไม่ยกเลิก</Button>
              <Button size="sm" variant="destructive" disabled={!reason.trim() || inv.payments.length > 0} onClick={() => { if (report(act.void(inv.id, reason), "ยกเลิกใบแจ้งหนี้แล้ว")) { void syncEnrollInvoice(inv.id, "void"); setVoiding(false) } }}>ยืนยันยกเลิก</Button>
            </div>
          </section>
        )}
      </PanelBody>
      {receiptOpen && <IssueReceiptDialog invoices={group.filter((x) => x.status === "paid" && !x.receiptNumber)} more={invoices.filter((x) => x.status === "paid" && !x.receiptNumber && x.branchId === inv.branchId && !group.some((g) => g.id === x.id) && students.find((st) => st.id === x.studentId)?.familyId === students.find((st) => st.id === inv.studentId)?.familyId)} onClose={() => setReceiptOpen(false)} />}
      {addOpen && inv.receiptNumber && <AddToReceiptDialog receiptNumber={inv.receiptNumber} candidates={invoices.filter((x) => x.status === "paid" && !x.receiptNumber && x.branchId === inv.branchId && students.find((st) => st.id === x.studentId)?.familyId === students.find((st) => st.id === inv.studentId)?.familyId)} onClose={() => setAddOpen(false)} />}
      {linesOpen && inv.receiptNumber && <ReceiptLinesDialog receiptNumber={inv.receiptNumber} onClose={() => setLinesOpen(false)} />}
      {payOpen && (
        <PaySlipDialog inv={inv} owed={owed(inv)} initialSlip={slip} onClose={() => setPayOpen(false)}
          siblings={siblingsPayable.map((x) => ({ id: x.id, number: x.number ?? "", nickname: nick(x.studentId), owed: owed(x) }))} />
      )}
      {/* a finished invoice can be duplicated into a new Draft (owner 2026-11-05) */}
      {inv.status === "paid" && manage && (
        <PanelFooter>
          {/* owner 2026-11-24: a paid invoice has no main action — Duplicate and Refund sit behind ⋯ */}
          <PanelMore items={[
            { label: "ทำซ้ำเป็น Draft ใหม่", icon: CopyIcon, onClick: () => { const r = act.duplicate(inv.id); if (report(r, (v) => `สร้าง Draft ใหม่จากใบนี้แล้ว · ${v.number}`)) onDuplicated(r.value.id) } },
            { label: "คืนเงิน / ลดหนี้", icon: Undo2Icon, onClick: () => setRefunding(true) },
          ]} />
        </PanelFooter>
      )}
      {/* Header · Body · Bottom — destructive left, edit right (owner 2026-10-09) */}
      {(manage || (inv.status === "pending_approval" && approveCheck.ok)) && inv.status !== "void" && inv.status !== "paid" && (
        <PanelFooter>
          {/* owner 2026-10-12: negative actions behind ⋯ */}
          <PanelMore items={[
            // no running number yet = not a real document: merge into a set / delete for good · a numbered one is voided with a reason, never deleted
            manage && Bill.hasNoRunNo(inv) && mergeCandidates.length > 0 && { label: "รวมเป็นชุดกับใบอื่น…", icon: LayersIcon, onClick: () => setMerging(true) },
            manage && Bill.hasNoRunNo(inv) && { label: `ลบใบแจ้งหนี้ของ${nickOf(inv)}`, icon: Trash2Icon, destructive: true, onClick: () => setDeleting("one") },
            manage && canDeleteSet && { label: `ลบใบแจ้งหนี้ทั้งชุด (${setMembers.length} ใบ)`, icon: Trash2Icon, destructive: true, onClick: () => setDeleting("set") },
            manage && !voiding && !Bill.hasNoRunNo(inv) && { label: "ยกเลิกใบแจ้งหนี้", icon: XCircleIcon, destructive: true, onClick: () => setVoiding(true) },
          ]} />
          {manage && (inv.status === "draft" || inv.status === "pending_approval" || (inv.status === "approved" && !inv.number)) && <Button className="ml-auto" variant="outline" onClick={onEdit}><PencilIcon /> {inv.status === "draft" ? "แก้ไข" : inv.status === "approved" ? "แก้ (ต้องอนุมัติใหม่)" : "แก้"}</Button>}
          {inv.status === "pending_approval" && approveCheck.ok && <Button className={manage ? undefined : "ml-auto"} onClick={() => report(act.approve(inv.id), "อนุมัติแล้ว — Admin ออกเลข Official ได้")}><CheckIcon /> อนุมัติ</Button>}
          {inv.status === "approved" && !inv.number && manage && <Button disabled={!!noBank} title={noBank ?? undefined} onClick={issue}><FileTextIcon /> ออกเลข Official</Button>}
          {canSendNote && (
            <Button className="ml-auto" variant={sentToParent ? "outline" : "default"} disabled={!note.trim() || !!noBank} title={noBank ?? undefined} onClick={() => report(act.send(inv.id, note), (v) => (v.delivered ? "ส่งทาง LINE แล้ว" : "บันทึกแล้ว แต่ยังไม่ถึงผู้ปกครอง (ไม่มี LINE)"))}>
              <SendIcon /> {inv.status === "sent" ? "ส่งอีกครั้ง" : "ส่งผู้ปกครอง"}
            </Button>
          )}
          {sentToParent && canAddPayment && <Button onClick={() => setPayOpen(true)}><UploadIcon /> อัปโหลดสลิป</Button>}
          {inv.status === "draft" && manage && <Button disabled={!!noBank} title={noBank ?? undefined} onClick={generate}><FileTextIcon /> สร้างใบแจ้งหนี้</Button>}
        </PanelFooter>
      )}
      {merging && <MergeInvoicesDialog inv={inv} onClose={() => setMerging(false)} />}
      <MathGate open={deleting !== false} onClose={() => setDeleting(false)} confirmLabel="ลบถาวร"
        title={deleting === "set" ? "ลบใบแจ้งหนี้ทั้งชุด" : `ลบใบแจ้งหนี้ของ${nickOf(inv)}`}
        target={deleting === "set"
          ? <>ใบชุดของ {fam?.name ?? "ครอบครัว"} · {setMembers.length} ใบ: {setMembers.map(nickOf).join(", ")} · รวม {fmtMoney(setMembers.reduce((a, x) => a + Bill.invoiceTotals(x, ctx).total, 0))}</>
          : <>ใบแจ้งหนี้ของ {nickOf(inv)} · {Bill.invoiceStatusLabel(inv)} · {fmtMoney(totals.total)}{inv.bundleId ? ` · อยู่ในชุดของ ${fam?.name ?? "ครอบครัว"}` : ""}</>}
        warning={deleting === "set"
          ? "ใบทุกใบในชุดนี้ยังไม่มีเลขรัน (ยังไม่ใช่เอกสารจริง) — ลบทั้งชุดแล้วกู้คืนไม่ได้"
          : `ใบนี้ยังไม่มีเลขรัน (ยังไม่ใช่เอกสารจริง) ลบแล้วกู้คืนไม่ได้${inv.bundleId ? " · ใบอื่นในชุดอยู่ต่อ — ถ้าเหลือใบเดียวจะกลายเป็นใบเดี่ยวทันที" : ""}`}
        onConfirm={() => {
          const mode = deleting
          setDeleting(false)
          if (mode === "set") { const r = act.delSet(inv.id); if (report(r, "ลบใบแจ้งหนี้ทั้งชุดแล้ว")) onDeleted([]) }
          else { const r = act.del(inv.id); if (report(r, "ลบใบแจ้งหนี้แล้ว")) onDeleted(r.value.remaining) }
        }} />
    </>
  )
}
