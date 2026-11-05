"use client"

import { ForceApprove } from "@/components/app/force-approve"
import { Fragment, useEffect, useState } from "react"
import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, CircleIcon, FileTextIcon, ImageIcon, Loader2Icon, PencilIcon, RefreshCwIcon, SendIcon, XCircleIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EntityPanel, PanelBody, PanelFooter, PanelForm, PanelMore } from "@/components/app/form-shell"
import { InvoiceEditor } from "./invoice-editor"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime, fmtMoney, fmtMonth } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import { invoiceMemo } from "@/domain/rules/documents"
import { packageLabel } from "@/domain/rules/course"
import { can } from "@/domain/rules/permissions"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { slipDataUrl } from "@/lib/image"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useShallow } from "zustand/react/shallow"
import { useStore } from "@/store/store"
import { invoiceTone } from "./status"
import { CreditNotes } from "./credit-notes"
import { DocThumbs, type DocItem } from "./doc-thumbs"

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
export function InvoiceSheet({ id, slipMediaId, defaultStudentId, renewEntitlementId, onClose }: { id: ID | "new" | null; slipMediaId?: string; defaultStudentId?: ID; renewEntitlementId?: ID; onClose: () => void }) {
  return (
    <EntityPanel open={!!id} onClose={onClose} wide>
      {id && <Panel key={id} id={id} slipMediaId={slipMediaId} defaultStudentId={defaultStudentId} renewEntitlementId={renewEntitlementId} onClose={onClose} />}
    </EntityPanel>
  )
}

function Panel({ id, slipMediaId, defaultStudentId, renewEntitlementId, onClose }: { id: ID | "new"; slipMediaId?: string; defaultStudentId?: ID; renewEntitlementId?: ID; onClose: () => void }) {
  const isNew = id === "new"
  const [createdId, setCreatedId] = useState<ID | null>(null)
  const [editing, setEditing] = useState(isNew)
  const shownId = isNew ? createdId : id
  const inv = useStore((s) => (shownId ? s.invoices.find((x) => x.id === shownId) : undefined))
  if (editing && (inv || (isNew && !createdId))) return (
    <PanelForm>
      <InvoiceEditor invoice={inv} defaultStudentId={inv ? undefined : defaultStudentId} renewEntitlementId={inv ? undefined : renewEntitlementId}
        onClose={() => (inv ? setEditing(false) : onClose())}
        onSaved={(v) => { if (isNew) setCreatedId(v.id); setEditing(false) }} />
    </PanelForm>
  )
  return shownId ? <Body id={shownId} slipMediaId={slipMediaId} onEdit={() => setEditing(true)} /> : null
}

function Body({ id, slipMediaId, onEdit }: { id: ID; slipMediaId?: string; onEdit: () => void }) {
  const inv = useStore((s) => s.invoices.find((x) => x.id === id))
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const brandMemos = useStore((s) => s.system.invoiceMemos)
  const act = useStore(useShallow((s) => ({ gen: s.generatePdf, approve: s.approveInvoice, send: s.sendInvoice, void: s.voidInvoice, notifyVoid: s.notifyVoid, pay: s.recordPayment, payGroup: s.recordGroupPayment, confirm: s.confirmPayment, regroup: s.setReceiptGrouping })))
  const invoices = useStore((s) => s.invoices)
  const [note, setNote] = useState(inv?.noteToParent ?? "")
  const [showAll, setShowAll] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [reason, setReason] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"transfer" | "cash">("transfer")
  const [ref, setRef] = useState("")
  const [slip, setSlip] = useState<string | undefined>()
  // one slip for siblings' invoices (owner 2026-10-29)
  const [withIds, setWithIds] = useState<ID[]>([])
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
  useEffect(() => {
    if (!slipMediaId || !inv) return
    const owed = Bill.invoiceTotals(inv, { branch, courses, classes, holidays }).total - inv.payments.reduce((a, p) => a + p.amount, 0)
    if (owed > 0) setAmount(String(owed)) // eslint-disable-line react-hooks/set-state-in-effect
  }, [slipMediaId]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!inv) return null

  const totals = Bill.invoiceTotals(inv, { branch, courses, classes, holidays })
  const memo = invoiceMemo(inv, { brandMemo: brandMemos[branch.brand], branch, courses, classes })
  const stu = students.find((s) => s.id === inv.studentId)
  const fam = families.find((f) => f.id === stu?.familyId)
  const who = (uid?: ID) => staff.find((s) => s.id === uid)?.nickname ?? "—"
  const paidConfirmed = Bill.paidAmount(inv)
  const paidAll = inv.payments.reduce((a, p) => a + p.amount, 0)
  const approveCheck = Bill.canApprove(inv, me)
  // "x" stands in for the remark — only asks whether Force is available at all
  const canForce = Bill.canForceApprove(inv, me, "x").ok
  const manage = can(me, "billing.manage")
  const ctx = { branch, courses, classes, holidays }
  const owed = (x: typeof inv) => Bill.owedOn(x, Bill.invoiceTotals(x, ctx).total)
  const nick = (studentId: ID) => students.find((x) => x.id === studentId)?.nickname ?? "—"
  // siblings' invoices the same slip can pay: same family + branch, approved, still owed
  const siblingsPayable = fam ? invoices.filter((x) => x.id !== inv.id && x.branchId === inv.branchId && ["approved", "sent"].includes(x.status) && students.find((y) => y.id === x.studentId)?.familyId === fam.id && owed(x) > 0) : []
  const group = Bill.paymentGroup(inv, invoices)
  const combined = receiptIds ?? group.filter((x) => x.receiptNumber && group.filter((y) => y.receiptNumber === x.receiptNumber).length > 1).map((x) => x.id)
  const toggle = (list: ID[], id: ID) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const pickWith = (ids: ID[]) => {
    setWithIds(ids)
    const picked = invoices.filter((x) => ids.includes(x.id))
    setAmount(ids.length ? String(owed(inv) + picked.reduce((a, x) => a + owed(x), 0)) : "")
  }

  // documents shown on their step: invoice PDF · pay slips (one slip shared by siblings counts once) · receipts (one per receipt number)
  const slips = [...new Set(inv.payments.map((p) => p.slip).filter((x): x is string => !!x))]
  const receipts = [...new Map(group.filter((x) => x.receiptNumber).map((x) => [x.receiptNumber!, x])).values()]
  const docsFor = {
    invoice: inv.pdf === "ready" ? [{ key: "inv", kind: "invoice" as const, label: `ใบแจ้งหนี้ ${inv.number ?? ""}`.trim(), src: `/print/invoice/${inv.id}` }] : [],
    slip: slips.map((src, i) => ({ key: `slip${i}`, kind: "slip" as const, label: `สลิป${slips.length > 1 ? ` ${i + 1}` : ""}`, src })),
    receipt: receipts.map((x) => ({ key: `rc${x.id}`, kind: "receipt" as const, label: `ใบเสร็จ ${x.receiptNumber}`, src: `/print/receipt/${x.id}` })),
  } satisfies Record<string, DocItem[]>
  const steps: { label: string; state: "done" | "current" | "todo" | "warn"; detail: string; docs?: DocItem[] }[] = [
    { label: "สร้างใบ", state: "done", detail: `${who(inv.createdBy)} · ${fmtDateTime(inv.createdAt)}` },
    {
      label: "สร้าง PDF",
      state: inv.pdf === "ready" ? "done" : inv.pdf === "failed" ? "warn" : inv.status === "void" ? "todo" : "current",
      docs: docsFor.invoice,
      detail: inv.pdf === "ready" ? "พร้อม" : inv.pdf === "generating" ? "กำลังสร้าง…" : inv.pdf === "failed" ? "สร้างไม่สำเร็จ — กดลองใหม่" : "ยังไม่สร้าง PDF",
    },
    {
      label: "อนุมัติ (คนอื่นที่ไม่ใช่คนสร้าง)",
      state: inv.approvedBy ? "done" : inv.status === "pending_approval" ? "current" : "todo",
      detail: inv.approvedBy ? (inv.forced ? `Force Approve โดย ${who(inv.approvedBy)} · เหตุผล: ${inv.forced.remark}` : `อนุมัติโดย ${who(inv.approvedBy)}`) : inv.status === "pending_approval" ? "รออนุมัติ" : "—",
    },
    {
      label: "ส่งถึงผู้ปกครอง",
      state: inv.delivery === "delivered" ? "done" : inv.delivery === "no_line" || inv.delivery === "failed" ? "warn" : inv.status === "approved" || inv.delivery === "sending" ? "current" : "todo",
      detail: inv.delivery === "delivered" ? `ถึงผู้ปกครองทาง LINE · ${fmtDateTime(inv.sentAt!)}`
        : inv.delivery === "sending" ? "กำลังส่งทาง LINE…"
        : inv.delivery === "failed" ? `ส่ง LINE ไม่สำเร็จ — ${inv.deliveryError ?? "ลองส่งอีกครั้ง"}`
        : inv.delivery === "no_line" ? "ยังไม่ถึงผู้ปกครอง — ไม่มี LINE (ต้องส่งทางอื่น)" : "—",
    },
    {
      label: "รับเงิน (บันทึก + ยืนยันโดยอีกคน)",
      state: inv.status === "paid" ? "done" : paidAll > 0 ? "current" : "todo",
      docs: docsFor.slip,
      detail: inv.payments.length ? `ยืนยันแล้ว ${fmtMoney(paidConfirmed)} / ${fmtMoney(totals.total)}` : "—",
    },
    {
      label: "ใบเสร็จ + เข้าคลาสอัตโนมัติ",
      state: !inv.receiptNumber ? "todo" : inv.receiptDelivery === "failed" || inv.receiptDelivery === "no_line" ? "warn" : "done",
      docs: docsFor.receipt,
      detail: !inv.receiptNumber ? "—" : `${inv.receiptNumber}${inv.receiptNumber !== inv.number ? ` (รวม)` : ""} · ${inv.receiptDelivery === "delivered" ? "ส่งใบเสร็จทาง LINE แล้ว" : inv.receiptDelivery === "sending" ? "กำลังส่งใบเสร็จทาง LINE…" : inv.receiptDelivery === "failed" ? "ส่งใบเสร็จทาง LINE ไม่สำเร็จ" : inv.receiptDelivery === "no_line" ? "ไม่มี LINE — ส่งใบเสร็จทางอื่น" : "ออกใบเสร็จแล้ว"}`,
    },
  ]

  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-2 pr-8">
          <Pill tone={invoiceTone(inv)}>{Bill.INVOICE_STATUS_LABEL[inv.status]}</Pill>
          {inv.delivery === "no_line" && <Pill tone="amber">ไม่มี LINE</Pill>}
          {inv.delivery === "failed" && <Pill tone="red">ส่ง LINE ไม่สำเร็จ</Pill>}
        </div>
        <SheetTitle className="text-lg">{inv.number ?? "—"}</SheetTitle>
        <SheetDescription>
          {stu?.nickname} ({stu?.grade}) · {fam?.name ?? "ยังไม่ผูกครอบครัว"}
        </SheetDescription>
      </SheetHeader>

      <PanelBody>
        {inv.status === "void" && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">ยกเลิกแล้ว: {inv.voidReason}</p>}
        {/* Billing info as an accordion (owner 2026-11-05): Student · Promotion · Course · Advance · Bus · Summary */}
        {/* Billing info (owner 2026-11-05): the summary always visible; one expander opens the whole invoice */}
        <section className="rounded-xl border px-4 py-3">
          <h3 className="mb-1 text-sm font-semibold">สรุปยอด</h3>
          <table className="w-full text-sm tabular-nums"><tbody>
            {([["ค่าเรียน", totals.course + totals.courseFee], ["Advance / ค่าหนังสือ", totals.advance + totals.book], ["ค่ารถ", totals.bus + totals.busExtra]] as const).filter(([, v]) => v > 0).map(([l, v]) => <tr key={l}><td className="py-0.5">{l}</td><td className="py-0.5 text-right">{fmtMoney(v)}</td></tr>)}
            {totals.promotion + totals.credit + totals.concession > 0 && <tr className="text-emerald-700"><td className="py-0.5">ส่วนลด / โปรโมชัน</td><td className="py-0.5 text-right">−{fmtMoney(totals.promotion + totals.credit + totals.concession)}</td></tr>}
            {totals.rounding > 0 && <tr className="text-muted-foreground"><td className="py-0.5">ปัดเศษ (Liclass ปัดขึ้นหลักสิบ)</td><td className="py-0.5 text-right">+{fmtMoney(totals.rounding)}</td></tr>}
            <tr className="border-t font-semibold"><td className="py-1.5">ยอดรวม</td><td className="py-1.5 text-right text-base">{fmtMoney(totals.total)}</td></tr>
          </tbody></table>
          <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-primary hover:bg-muted/50">
            {showAll ? "ซ่อนรายละเอียด" : "ดูรายละเอียดใบแจ้งหนี้ทั้งหมด"}<ChevronDownIcon className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
          </button>
          {showAll && (
            <div className="mt-2 space-y-4 border-t pt-3">
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
              {totals.lines.filter((l) => l.promotion > 0).map((l) => <tr key={l.line.id} className="text-emerald-700"><td className="py-1">{l.course?.name} · {l.promotionName}</td><td className="py-1 text-right">−{fmtMoney(l.promotion)}</td></tr>)}
              {totals.lines.filter((l) => l.bonusMinutes > 0).map((l) => <tr key={`b${l.line.id}`} className="text-emerald-700"><td className="py-1" colSpan={2}>{l.course?.name} · {l.bonusName} — แถมเวลาเรียนเพิ่ม {l.bonusMinutes / 60} ชม. (ไม่เพิ่มราคา)</td></tr>)}
              {totals.credit > 0 && <tr className="text-violet-700"><td className="py-1">หักเครดิตคอร์ส</td><td className="py-1 text-right">−{fmtMoney(totals.credit)}</td></tr>}
              {totals.concession > 0 && <tr className="text-emerald-700"><td className="py-1">ส่วนลดพิเศษ · {inv.concession?.remark}</td><td className="py-1 text-right">−{fmtMoney(totals.concession)}</td></tr>}
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
          <Block title="Bus" hint="ไม่บังคับ">
            <table className="w-full text-sm tabular-nums"><tbody className="divide-y">
              {totals.bus > 0 && <tr><td className="py-1">ค่ารถ {branch.fees.find((f) => f.id === inv.busFeeId)?.name ?? ""} ({inv.bus.reduce((a, l) => a + +l.pickup + +l.dropoff, 0)} เที่ยว)</td><td className="py-1 text-right">{fmtMoney(totals.bus)}</td></tr>}
              {totals.busExtra > 0 && <tr><td className="py-1">ค่ารถเพิ่ม (รอบก่อน) · {(inv.busExtras ?? []).map((x) => fmtDate(x.date)).join(", ")}</td><td className="py-1 text-right">{fmtMoney(totals.busExtra)}</td></tr>}
            </tbody></table>
            {totals.bus + totals.busExtra === 0 && <p className="text-xs text-muted-foreground">ไม่ได้ใช้รถรับส่ง</p>}
          </Block>
            </div>
          )}
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
                  {s.docs && <DocThumbs docs={s.docs} />}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- next action for the current state ---------- */}
        <section className="space-y-2 rounded-lg border p-3">
          {inv.status === "draft" && manage && <p className="text-sm text-muted-foreground">ร่าง — ตรวจรายการแล้วกด “สร้าง PDF” ด้านล่าง เพื่อส่งให้คนอื่นอนุมัติ</p>}
          {inv.status === "pending_approval" && (
            approveCheck.ok ? (
              <p className="text-sm text-muted-foreground">รออนุมัติ — ตรวจ PDF แล้วกด “อนุมัติ PDF” ด้านล่าง</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{approveCheck.error}</p>
                {canForce && <ForceApprove label="Force Approve PDF" onForce={(remark) => act.approve(inv.id, remark)} success="Force Approve แล้ว — แจ้งทั้งสาขา + Director" />}
              </div>
            )
          )}
          {(inv.status === "approved" || (inv.status === "sent" && (inv.delivery === "no_line" || inv.delivery === "failed"))) && manage && (
            <div className="space-y-2">
              <Label className="text-xs">ข้อความถึงผู้ปกครอง *</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ค่าเรียนเดือนตุลาคม ชำระภายใน 5 ต.ค." />
              {fam?.lineUserId && <p className="text-xs text-emerald-700">ส่งเข้าแชท LINE ของ{fam.name}จริง — ยอด รายการ และเลขบัญชีจะอยู่ในข้อความ</p>}
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
                <Input placeholder="เลขอ้างอิง" value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed p-2 text-xs text-muted-foreground hover:bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimise */}
                {slip ? <img src={slip} alt="สลิป" className="size-12 rounded-lg object-cover" /> : <ImageIcon className="size-5" />}
                {slip ? "เปลี่ยนรูปสลิป" : "แนบรูปสลิป (ไม่บังคับ)"}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setSlip(await slipDataUrl(f)) }} />
              </label>
              {siblingsPayable.length > 0 && (
                <div className="space-y-1 rounded-2xl bg-muted/40 p-2">
                  <p className="text-xs font-medium">จ่ายรวมกับใบของพี่น้อง (สลิปเดียว)</p>
                  {siblingsPayable.map((x) => (
                    <label key={x.id} className="flex cursor-pointer items-center gap-2 text-xs">
                      <input type="checkbox" checked={withIds.includes(x.id)} onChange={() => pickWith(toggle(withIds, x.id))} />
                      <span className="font-mono">{x.number}</span>
                      <span>{nick(x.studentId)}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">ค้าง {fmtMoney(owed(x))}</span>
                    </label>
                  ))}
                  {withIds.length > 0 && <p className="text-xs text-muted-foreground">ยอดในสลิปต้องเท่ากับยอดค้างรวม {fmtMoney(owed(inv) + invoices.filter((x) => withIds.includes(x.id)).reduce((a, x) => a + owed(x), 0))}</p>}
                </div>
              )}
              <Button size="sm" variant="secondary" onClick={() => report(
                withIds.length ? act.payGroup([inv.id, ...withIds], { amount: Number(amount), method, reference: ref, slip }) : act.pay(inv.id, { amount: Number(amount), method, reference: ref, slip }),
                withIds.length ? "บันทึกรับเงินแล้ว (สลิปเดียวหลายใบ) — รอคนอื่นยืนยันยอด" : "บันทึกรับเงินแล้ว — รอคนอื่นยืนยันยอด",
              ) && (setAmount(""), setRef(""), setSlip(undefined), setWithIds([]))}>บันทึกรับเงิน</Button>
            </div>
          )}
          {inv.status === "paid" && <p className="text-sm text-emerald-700">ชำระครบ · ใบเสร็จ {inv.receiptNumber} · นักเรียนถูกเพิ่มเข้าคลาสตามช่วงที่จ่ายแล้ว{inv.receiptDelivery === "delivered" ? " · ส่งใบเสร็จทาง LINE แล้ว" : ""}</p>}
          {/* one slip for several invoices: the admin picks which share one receipt */}
          {group.length > 1 && group.every((x) => x.status === "paid") && (
            <div className="space-y-1.5 border-t pt-2">
              <p className="text-xs font-medium">ใบเสร็จของสลิปนี้ — ติ๊กใบที่จะรวมเป็นใบเสร็จเดียว (ไม่ติ๊ก = แยกใบ)</p>
              {group.map((x) => (
                <label key={x.id} className="flex items-center gap-2 text-xs">
                  <input type="checkbox" disabled={!manage} checked={combined.includes(x.id)} onChange={() => setReceiptIds(toggle(combined, x.id))} />
                  <span className="font-mono">{x.number}</span>
                  <span>{nick(x.studentId)}</span>
                  <span className="ml-auto text-muted-foreground">ใบเสร็จ <span className="font-mono">{x.receiptNumber}</span></span>
                </label>
              ))}
              {manage && receiptIds && <Button size="xs" variant="outline" onClick={() => report(act.regroup(inv.id, receiptIds), "จัดใบเสร็จแล้ว") && setReceiptIds(null)}>บันทึกการจัดใบเสร็จ</Button>}
            </div>
          )}
          {inv.status === "void" && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">ใบนี้ถูกยกเลิก — ระบบไม่ได้แจ้งผู้ปกครองให้อัตโนมัติ</p>
              {manage && (inv.voidNotifiedAt
                ? <span className="text-xs text-muted-foreground">แจ้งผู้ปกครองแล้ว</span>
                : <Button size="xs" variant="outline" onClick={() => report(act.notifyVoid(inv.id), "ส่งข้อความแจ้งผู้ปกครองแล้ว")}>แจ้งผู้ปกครองว่ายกเลิกใบนี้</Button>)}
            </div>
          )}
        </section>

        {inv.payments.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">การรับเงิน</h3>
            <ul className="divide-y rounded-lg border text-sm">
              {inv.payments.map((p) => {
                const c = Bill.canConfirmPayment(p, me, inv.branchId)
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 p-2.5">
                    <span className="font-medium tabular-nums">{fmtMoney(p.amount)}</span>
                    <span className="text-muted-foreground">{p.method === "cash" ? "เงินสด" : "โอน"} {p.reference && `· ${p.reference}`}</span>
                    <span className="text-xs text-muted-foreground">บันทึกโดย {who(p.recordedBy)}</span>
                    {p.groupId && group.length > 1 && <Pill tone="blue">สลิปเดียวกับ {group.filter((x) => x.id !== inv.id).map((x) => `${x.number} ${nick(x.studentId)}`).join(", ")}</Pill>}
                    {p.slip && (
                      <details className="w-full [&[open]>summary]:hidden">
                        {/* eslint-disable @next/next/no-img-element -- data URL slip */}
                        <summary className="flex cursor-pointer items-center gap-2 text-xs text-sky-700"><img src={p.slip} alt="สลิป" className="size-10 rounded-md object-cover" /> ดูสลิป</summary>
                        <img src={p.slip} alt="สลิป" className="mt-1 max-h-96 rounded-lg" />
                        {/* eslint-enable @next/next/no-img-element */}
                      </details>
                    )}
                    <span className="ml-auto">
                      {p.confirmedBy ? (
                        <Pill tone={p.forced ? "amber" : "green"} title={p.forced?.remark}>{p.forced ? "Force · " : ""}ยืนยันโดย {who(p.confirmedBy)}</Pill>
                      ) : c.ok ? (
                        <Button size="xs" onClick={() => report(act.confirm(inv.id, p.id), (v) => (v.paid ? "ยืนยันแล้ว · ชำระครบ ออกใบเสร็จ + เพิ่มเข้าคลาสแล้ว" : "ยืนยันยอดแล้ว"))}>ยืนยันยอด</Button>
                      ) : Bill.canForceConfirmPayment(p, me, inv.branchId, "x").ok ? (
                        <ForceApprove label="Force ยืนยันยอด" onForce={(remark) => act.confirm(inv.id, p.id, remark)} success="Force ยืนยันยอดแล้ว — แจ้งทั้งสาขา + Director" />
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

        <CreditNotes inv={inv} />

        {voiding && (
          <section className="space-y-2 rounded-lg border border-red-200 p-3">
            <Label className="text-xs">เหตุผลการยกเลิก *</Label>
            <Textarea rows={2} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ใส่คอร์สผิด จะออกใบใหม่" />
            {inv.payments.length > 0 && <p className="text-xs text-red-700">มีการรับเงินแล้ว ยกเลิกไม่ได้</p>}
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setVoiding(false)}>ไม่ยกเลิก</Button>
              <Button size="sm" variant="destructive" disabled={!reason.trim() || inv.payments.length > 0} onClick={() => report(act.void(inv.id, reason), "ยกเลิกใบแจ้งหนี้แล้ว") && setVoiding(false)}>ยืนยันยกเลิก</Button>
            </div>
          </section>
        )}
      </PanelBody>
      {/* Header · Body · Bottom — destructive left, edit right (owner 2026-10-09) */}
      {(manage || (inv.status === "pending_approval" && approveCheck.ok)) && inv.status !== "void" && inv.status !== "paid" && (
        <PanelFooter>
          {/* owner 2026-10-12: negative actions behind ⋯ */}
          <PanelMore items={[manage && !voiding && { label: "ยกเลิกใบแจ้งหนี้", icon: XCircleIcon, destructive: true, onClick: () => setVoiding(true) }]} />
          {manage && (inv.status === "draft" || inv.status === "pending_approval") && <Button className="ml-auto" variant="outline" onClick={onEdit}><PencilIcon /> {inv.status === "draft" ? "แก้ไข" : "แก้ (ต้องสร้าง PDF ใหม่)"}</Button>}
          {inv.status === "pending_approval" && approveCheck.ok && <Button className={manage ? undefined : "ml-auto"} onClick={() => report(act.approve(inv.id), "อนุมัติแล้ว — พร้อมส่งผู้ปกครอง")}><CheckIcon /> อนุมัติ PDF</Button>}
          {inv.status === "draft" && (
            <Button disabled={inv.pdf === "generating"} onClick={() => report(act.gen(inv.id), (v) => `กำลังสร้าง PDF · เลขที่ ${v.number}`)}>
              {inv.pdf === "generating" ? <Loader2Icon className="animate-spin" /> : inv.pdf === "failed" ? <RefreshCwIcon /> : <FileTextIcon />}
              {inv.pdf === "generating" ? "กำลังสร้าง PDF…" : inv.pdf === "failed" ? "ลองสร้าง PDF อีกครั้ง" : "สร้าง PDF"}
            </Button>
          )}
        </PanelFooter>
      )}
    </>
  )
}
