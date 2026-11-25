"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckIcon, ChevronDownIcon, CircleDashedIcon, ClipboardListIcon, SendIcon, UserPlusIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pill } from "@/components/app/badges"
import { EnrollReviewDialog } from "@/components/crm/enroll-review"
import { fmtDateTime, fmtMoney } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import { enrollFormReadiness, enrollInvoiceChoices } from "@/domain/rules/form-hub"
import type { EnrollSubmission, Family, ID, Lead, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { fetchEnrollSubmissions, sendEnrollToChat } from "@/lib/forms"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-25 — a form belongs to the panel. The Enroll + Invoice card of a family: what we already have (the parent won't
 * retype it) · what the parent still has to fill · what comes back into the ERP · the forms already sent / answered — and the send
 * button with the invoice (or the whole family set) that travels in the same link. First form on the shared "form in the panel" frame.
 */
export function EnrollFormCard({ family, lead }: { family?: Family; lead?: Lead }) {
  const students = useStore((s) => s.students)
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const conv = useStore((s) => s.conversations.find((c) => (family ? c.familyId === family.id : c.leadId === lead?.id) || (!family && !!lead?.lineUserId && c.id === `line_${lead.lineUserId}`)))
  // a Lead has no family yet: its contact is the one parent, its children are the Students already made for it (else the kids typed on the Lead)
  const kids = useMemo(() => {
    if (family) return students.filter((x) => x.familyId === family.id && !x.archived)
    if (!lead) return []
    const ids = new Set([lead.trialStudentId, lead.convertedStudentId, ...(lead.kids ?? []).map((k) => k.studentId)].filter(Boolean) as ID[])
    const real = students.filter((x) => ids.has(x.id) && !x.archived)
    const typed = (lead.kids ?? []).filter((k) => !k.studentId)
    return [...real, ...typed.map((k) => ({ id: k.id, nickname: k.name, name: k.name, grade: k.grade, targetSchools: k.targetSchools }) as Pick<Student, "id" | "nickname" | "name" | "grade" | "targetSchools">)] as Student[]
  }, [students, family, lead])
  const ctx = useMemo(() => family ?? { parents: lead ? [{ name: lead.name, phone: lead.phone, lineLinked: !!lead.lineUserId, primary: true }] : [] }, [family, lead])
  const ready = useMemo(() => enrollFormReadiness(ctx, kids), [ctx, kids])
  const choices = useMemo(() => enrollInvoiceChoices(invoices, new Set(kids.filter((k) => students.some((x) => x.id === k.id)).map((k) => k.id))), [invoices, kids, students])
  const [pick, setPick] = useState<string | null>(null)
  const [open, setOpen] = useState<"known" | "missing" | "returns" | null>("missing")
  const [busy, setBusy] = useState(false)
  const [subs, setSubs] = useState<EnrollSubmission[]>([])
  const [review, setReview] = useState<EnrollSubmission | null>(null)
  const load = () => { void fetchEnrollSubmissions().then((xs) => setSubs(xs.filter((x) => (!!conv && x.conversationId === conv.id) || (!!lead && x.leadId === lead.id)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)))).catch(() => undefined) }
  useEffect(load, [conv?.id, lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalOf = (ids: ID[]) => ids.reduce((a, id) => {
    const i = invoices.find((x) => x.id === id); const b = i && branches.find((x) => x.id === i.branchId)
    return a + (i && b ? Bill.owedOn(i, Bill.invoiceTotals(i, { branch: b, courses, classes, holidays }).total) : 0)
  }, 0)
  const nick = (id: ID) => kids.find((k) => k.id === id)?.nickname ?? ""
  const chosen = choices.find((c) => c.key === pick)
  const send = async () => {
    if (!conv) return
    setBusy(true)
    const r = await sendEnrollToChat(conv.id, [], undefined, chosen?.invoiceIds)
    setBusy(false)
    if (report(r, chosen ? (chosen.kind === "set" ? tx("ส่งใบสมัครเรียนพร้อมใบแจ้งหนี้ชุดครอบครัวแล้ว") : tx("ส่งใบสมัครเรียนพร้อมใบแจ้งหนี้แล้ว")) : tx("ส่งใบสมัครเรียนแล้ว"))) { setPick(null); load() }
  }

  const sections: { key: "known" | "missing" | "returns"; title: string; count?: number }[] = [
    { key: "missing", title: tx("ผู้ปกครองต้องกรอก"), count: ready.missing.length },
    { key: "known", title: tx("เรามีข้อมูลอยู่แล้ว (ไม่ต้องกรอกซ้ำ)"), count: ready.known.length },
    { key: "returns", title: tx("ส่งแล้วจะได้กลับมา") },
  ]
  return (
    <section className="space-y-3 rounded-2xl border p-3">
      <div className="flex items-center gap-2">
        <UserPlusIcon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{tx("ใบสมัครเรียน + ใบแจ้งหนี้")}</h3>
        {subs.some((x) => x.status === "pending") && <Pill tone="amber">{tx("มีคำตอบรอตรวจ")}</Pill>}
      </div>

      <div className="divide-y rounded-xl bg-muted/30">
        {sections.map((sec) => (
          <div key={sec.key}>
            <Button variant="row" size="inline" type="button" aria-expanded={open === sec.key} onClick={() => setOpen(open === sec.key ? null : sec.key)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
              <span className="flex-1 font-medium">{sec.title}</span>
              {sec.count !== undefined && <Pill tone={sec.key === "missing" && sec.count ? "amber" : "gray"}>{sec.count}</Pill>}
              <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open === sec.key && "rotate-180")} />
            </Button>
            {open === sec.key && (
              <ul className="space-y-1 px-3 pb-2.5 text-xs">
                {sec.key === "missing" && (ready.missing.length ? ready.missing.map((f) => <li key={f.key} className="flex items-center gap-2"><CircleDashedIcon className="size-3.5 shrink-0 text-muted-foreground" />{f.label}</li>) : <li className="text-muted-foreground">{tx("ข้อมูลครบแล้ว — ผู้ปกครองแค่ตรวจและยืนยัน")}</li>)}
                {sec.key === "known" && (ready.known.length ? ready.known.map((f) => <li key={f.key} className="flex items-center gap-2"><CheckIcon className="size-3.5 shrink-0 text-primary" /><span className="shrink-0">{f.label}</span>{f.value && <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">{f.value}</span>}</li>) : <li className="text-muted-foreground">{tx("ยังไม่มีข้อมูล")}</li>)}
                {sec.key === "returns" && ready.returns.map((r) => <li key={r.label} className="flex gap-2"><span className="flex-1">{tx(r.label)}</span><span className="shrink-0 text-muted-foreground">→ {tx(r.to)}</span></li>)}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-semibold">{tx("แนบใบแจ้งหนี้ไปในลิงก์เดียวกัน")} <span className="font-normal text-muted-foreground">· {tx("ไม่บังคับ")}</span></p>
        {choices.length === 0 && <p className="text-xs text-muted-foreground">{tx("ยังไม่มีใบที่ออกเลข Official แล้วและยังค้างชำระ — ส่งได้เฉพาะใบสมัคร")}</p>}
        {choices.map((c) => {
          const on = pick === c.key
          return (
            <Button key={c.key} variant="row" size="inline" type="button" aria-pressed={on} onClick={() => setPick(on ? null : c.key)}
              className={cn("flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm", on ? "border-primary bg-primary/10" : "hover:bg-muted")}>
              <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
              {c.kind === "set" && <UsersIcon className="size-4 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate">{c.kind === "set" ? `${tx("ชุดครอบครัว")} · ${c.studentIds.map(nick).join(" + ")}` : `${c.numbers[0]} · ${nick(c.studentIds[0])}`}</span>
              <span className="shrink-0 tabular-nums">{fmtMoney(totalOf(c.invoiceIds))}</span>
            </Button>
          )
        })}
        <p className="text-xs text-muted-foreground">{tx("ผู้ปกครองเปิดลิงก์เดียว เห็นใบแจ้งหนี้ ชำระ และแนบสลิปได้หลายใบ (แต่ละใบมี Ref ID ยอดรวมต้องเท่ายอดใบ) · ถ้ายกเลิกใบ ลิงก์จะใช้ไม่ได้")}</p>
      </div>

      <div className="flex items-center gap-2">
        {!conv && <p className="flex-1 text-xs text-muted-foreground">{tx("ครอบครัวนี้ยังไม่มีแชท LINE — ผูก LINE ก่อนจึงจะส่งได้")}</p>}
        <Button className="ml-auto" disabled={busy || !conv} onClick={send}><SendIcon /> {chosen ? tx("ส่งใบสมัคร + ใบแจ้งหนี้") : tx("ส่งเฉพาะใบสมัคร")}</Button>
      </div>

      {subs.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-sm font-semibold">{tx("ที่ผู้ปกครองส่งกลับมา")}</p>
          {subs.map((x) => (
            <div key={x.id} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
              <ClipboardListIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{x.children.map((c) => c.nickname || c.name).join(", ")} · {fmtDateTime(x.submittedAt)}</span>
              <Pill tone={x.status === "pending" ? "amber" : x.status === "approved" ? "green" : "gray"}>{x.status === "pending" ? tx("รอตรวจ") : x.status === "approved" ? tx("อนุมัติแล้ว") : tx("ปิดแล้ว")}</Pill>
              {x.status === "pending" && <Button size="xs" variant="outline" onClick={() => setReview(x)}>{tx("ตรวจ")}</Button>}
            </div>
          ))}
        </div>
      )}
      {review && <EnrollReviewDialog sub={review} onClose={() => setReview(null)} onDone={() => load()} />}
    </section>
  )
}
