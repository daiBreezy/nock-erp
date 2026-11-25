"use client"

import { useEffect, useState } from "react"
import { CheckIcon, CircleDashedIcon, InfoIcon, PencilIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/app/native-select"
import { Pill } from "@/components/app/badges"
import { fmtDate, fmtDateTime, weekdayShort } from "@/domain/dates"
import { formLinkOf } from "@/domain/rules/inbox"
import { enrollFormReadiness } from "@/domain/rules/form-hub"
import type { CourseWish, EnrollSubmission, FormRequestMeta, FormSubmission, ID, Lead, LeadKid, Weekday } from "@/domain/types"
import { fetchEnrollSubmissions, fetchTokenStates, type LinkStateName } from "@/lib/forms"
import { FORM_LABEL, type SentLink } from "@/domain/rules/form-send"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

export type { FormKind } from "@/domain/rules/form-send"
import type { FormKind } from "@/domain/rules/form-send"
import { PeriodNote } from "@/components/app/period-note"

/**
 * owner 2026-11-25 — ONE place for what we know about a Lead: the “ติดต่อ” step. Whatever new comes in (the parent answered in the chat, not in the form)
 * is put THERE — the guardian's phone and family details, each child's grade, the course they agreed, the days / times they like and the day they start.
 * The form steps (Test / Trial / Enroll) only send the form: they point back here with “ขาด N” and never hold a copy of the data.
 */

const FAMILY_KEYS = ["address", "location", "source", "pdpa", "tax"]

/** the ⓘ next to the send button: what the form brings back into the ERP */
export function ReturnsHint({ type }: { type: FormKind }) {
  const returns = type === "enroll"
    ? tx("ข้อมูลผู้ปกครอง · ที่อยู่ · ใบกำกับภาษี · PDPA → ครอบครัว · ข้อมูลนักเรียน · โรงเรียนเป้าหมาย → นักเรียน · สลิปโอนเงิน (หลายใบ แต่ละใบมี Ref ID) → ใบแจ้งหนี้ใน Billing")
    : tx("วัน-เวลาที่เลือก → ปฏิทิน (นัดหมาย) · ผลประเมิน → โน้ตนักเรียน")
  const hint = `${tx("ส่งแล้วจะได้กลับมา")}: ${returns}`
  return <span title={hint} aria-label={hint} className="text-muted-foreground"><InfoIcon className="size-3.5" /></span>
}

const FAMILY_SHORT: Record<string, string> = { address: "ที่อยู่", location: "หมุดบ้าน", source: "รู้จักเราจากไหน", pdpa: "PDPA", tax: "ใบกำกับภาษี" }

/** the guardian's card in the Contact step — a compact preview by default (what we have in one line, what is missing in another); “แก้ไข” → the phone and the way into the family file */
export function LeadParentCard({ lead, canEdit, onOpenFamily }: { lead: Lead; canEdit: boolean; onOpenFamily: () => void }) {
  const saveLead = useStore((s) => s.saveLead)
  const family = useStore((s) => s.families.find((f) => f.id === lead.familyId))
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(lead.phone)
  const r = enrollFormReadiness(family ?? { parents: [] }, [])
  const rows = r.known.concat(r.missing).filter((x) => FAMILY_KEYS.includes(x.key))
  const have = [lead.phone.trim() && `${tx("โทร")} ${lead.phone.trim()}`, ...rows.filter((f) => f.have).map((f) => `${tx(FAMILY_SHORT[f.key] ?? f.label)}${f.value ? ` ${f.value}` : ""}`)].filter(Boolean) as string[]
  const missing = [!lead.phone.trim() && tx("เบอร์"), ...rows.filter((f) => !f.have).map((f) => tx(FAMILY_SHORT[f.key] ?? f.label))].filter(Boolean) as string[]
  const save = () => { if (phone.trim() !== lead.phone) { if (!report(saveLead({ ...lead, phone: phone.trim() }, { quick: true }), tx("บันทึกแล้ว"))) return } setEditing(false) }
  return (
    <section className="space-y-1 rounded-xl bg-muted/40 p-2.5">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold">{tx("ผู้ปกครอง")}</p>
        {canEdit && !editing && <Button size="xs" variant="ghost" type="button" onClick={() => { setPhone(lead.phone); setEditing(true) }}><PencilIcon /> {tx("แก้ไข")}</Button>}
      </div>
      {editing ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex-1 basis-32">{tx("เบอร์ผู้ปกครอง")}</span>
            <Input className="h-8 w-40" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" aria-label={tx("เบอร์ผู้ปกครอง")} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button size="xs" variant="outline" type="button" onClick={onOpenFamily}>{tx("กรอกข้อมูลครอบครัว")}</Button>
            <span className="flex gap-2">
              <Button size="xs" variant="ghost" type="button" onClick={() => setEditing(false)}>{tx("ยกเลิก")}</Button>
              <Button size="xs" type="button" onClick={save}>{tx("บันทึก")}</Button>
            </span>
          </div>
        </>
      ) : (
        <>
          {have.length > 0 && <p className="text-xs">{have.join(" · ")}</p>}
          {missing.length > 0 && <p className="text-xs text-muted-foreground"><span className="text-warning-ink">{tx("ยังไม่มี")}</span> {missing.join(" · ")}</p>}
        </>
      )}
    </section>
  )
}

/** under each interested course of a child: the days / times the parent likes and the day they start — a new invoice starts with exactly this */
export function CourseWishEditor({ kid, courseId, disabled, onChange }: { kid: LeadKid; courseId: ID; disabled: boolean; onChange: (w: CourseWish) => void }) {
  const w = kid.wishes?.[courseId]
  return (
    <div className="mt-1.5 space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {w?.slots.length ? <CheckIcon className="size-3.5 shrink-0 text-primary" /> : <CircleDashedIcon className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="text-muted-foreground">{tx("วัน/เวลาที่สะดวก")}</span>
        <SlotEditor slots={w?.slots ?? []} disabled={disabled} onChange={(slots) => onChange({ ...w, slots })} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {w?.startDate ? <CheckIcon className="size-3.5 shrink-0 text-primary" /> : <CircleDashedIcon className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="text-muted-foreground">{tx("วันเริ่มเรียน")}</span>
        <Input key={w?.startDate} className="h-8 w-40" type="date" disabled={disabled} defaultValue={w?.startDate ?? ""} aria-label={tx("วันเริ่มเรียน")}
          onChange={(e) => { if (e.target.value !== (w?.startDate ?? "")) onChange({ slots: w?.slots ?? [], startDate: e.target.value || undefined }) }} />
        {w?.startDate && <span className="text-muted-foreground">{fmtDate(w.startDate, { weekday: true })}</span>}
        <PeriodNote date={w?.startDate} className="w-full" />
      </div>
    </div>
  )
}

/** the weekly slots a parent likes for a course: chips + one weekday / time to add */
function SlotEditor({ slots, disabled, onChange }: { slots: { weekday: Weekday; start: string }[]; disabled: boolean; onChange: (s: { weekday: Weekday; start: string }[]) => void }) {
  const [day, setDay] = useState<Weekday>(1)
  const [time, setTime] = useState("17:00")
  const add = () => { if (time && !slots.some((s) => s.weekday === day && s.start === time)) onChange([...slots, { weekday: day, start: time }]) }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {slots.map((s) => (
        <span key={`${s.weekday}-${s.start}`} className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs ring-1 ring-foreground/10">
          {weekdayShort(s.weekday)} {s.start}
          {!disabled && <Button size="icon-xs" variant="ghost" type="button" className="size-4" aria-label={tx("เอาออก")} onClick={() => onChange(slots.filter((x) => x !== s))}><XIcon className="size-3" /></Button>}
        </span>
      ))}
      {!disabled && (
        <>
          <NativeSelect className="h-8 w-20" aria-label={tx("วัน")} value={String(day)} onChange={(e) => setDay(Number(e.target.value) as Weekday)} options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: weekdayShort(d) }))} />
          <Input className="h-8 w-24" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} aria-label={tx("เวลา")} />
          <Button size="icon-xs" variant="outline" type="button" aria-label={tx("เพิ่มวัน/เวลา")} onClick={add}><PlusIcon /></Button>
        </>
      )}
    </div>
  )
}

/**
 * owner 2026-11-25: once a form is sent the step SAYS so — read from the chat (the request / link we sent), the answer sheets that came back and the
 * server's word on each link (waiting · answered · expired · cancelled). ALL kinds are read, because ONE live link per lead is the rule (`decideSend`).
 */
export function useSentForms(lead: Lead, type: FormKind, subs: FormSubmission[], subsReady = true) {
  const conversations = useStore((s) => s.conversations)
  const messages = useStore((s) => s.messages)
  const [enrollSubs, setEnrollSubs] = useState<EnrollSubmission[]>([])
  const [states, setStates] = useState<Record<string, LinkStateName> | null>(null)
  const convIds = new Set(conversations.filter((c) => c.leadId === lead.id || (lead.lineUserId && c.id === `line_${lead.lineUserId}`)).map((c) => c.id))
  const sent = messages.filter((m) => convIds.has(m.conversationId)).flatMap((m): { kind: FormKind; at: string; token: string; subjects: string[] }[] => {
    const l = formLinkOf(m)
    if (l?.form === "enroll") return [{ kind: "enroll", at: m.at, token: l.token, subjects: [] }]
    const meta = m.meta as FormRequestMeta | undefined
    return meta?.formKind === "form_request" ? [{ kind: meta.type, at: m.at, token: meta.token, subjects: meta.subjects }] : []
  }).sort((a, b) => b.at.localeCompare(a.at))
  const tokenKey = sent.map((x) => x.token).join(",")
  const refresh = () => {
    void fetchEnrollSubmissions().then(setEnrollSubs).catch(() => undefined)
    void fetchTokenStates(sent.map((x) => x.token)).then(setStates)
  }
  useEffect(() => { refresh() }, [tokenKey, messages.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const ready = subsReady && states !== null
  const withState = sent.map((it) => {
    const answered = it.kind === "enroll" ? enrollSubs.find((x) => x.token === it.token) : subs.find((x) => x.token === it.token)
    const state: LinkStateName = answered ? "answered" : (states?.[it.token] ?? "waiting")
    return { ...it, state, answer: answered?.status as "pending" | "approved" | "rejected" | undefined, enrollSub: it.kind === "enroll" ? (answered as EnrollSubmission | undefined) : undefined }
  })
  const links: SentLink[] = withState.map((x) => ({ token: x.token, kind: x.kind, sentAt: x.at, state: x.state }))
  const mine = withState.filter((x) => x.kind === type)
  // what to LIST: enroll → every one (nothing else shows them) · test / trial → only those still waiting (an answered form has its own card)
  const items = (type === "enroll" ? mine : mine.filter((x) => x.state === "waiting")).slice(0, 3)
  return { items, links, ready, everSent: mine.length > 0 || subs.some((x) => x.type === type), refresh }
}

export function SentForms({ type, items, onCancel }: { type: FormKind; items: ReturnType<typeof useSentForms>["items"]; onCancel?: (token: string) => void }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  if (!items.length) return null
  const label = tx(FORM_LABEL[type])
  const stateOf = (it: (typeof items)[number]): { tone: "blue" | "amber" | "green" | "gray"; text: string } => {
    if (it.state === "cancelled") return { tone: "gray", text: tx("ยกเลิกแล้ว") }
    if (it.state === "expired") return { tone: "gray", text: tx("หมดอายุ") }
    if (it.state === "waiting") return { tone: "blue", text: tx("ส่งแล้ว · รอผู้ปกครองกรอก") }
    // answered — an enroll with an invoice also says whether the pay slip came
    const sub = it.enrollSub
    const slip = sub?.invoiceId ? (sub.slips?.length ?? (sub.slip ? 1 : 0)) : null
    const slipText = slip === null ? "" : slip > 0 ? ` · ${tx("แนบสลิป {0} ใบ", [slip])}` : ` · ${tx("ยังไม่แนบสลิป")}`
    if (it.answer === "approved") return { tone: "green", text: tx("อนุมัติแล้ว") + slipText }
    if (it.answer === "rejected") return { tone: "gray", text: tx("ปิดแล้ว") }
    return { tone: "amber", text: tx("ผู้ปกครองกรอกแล้ว · รอตรวจ") + slipText }
  }
  return (
    <ul className="space-y-1">
      {items.map((it) => {
        const st = stateOf(it)
        return (
          <li key={it.token} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <Pill tone={st.tone}>{st.text}</Pill>
            <span>{label}{it.subjects.length > 0 && <span className="text-muted-foreground"> · {it.subjects.join(", ")}</span>}</span>
            <span className="text-muted-foreground">{fmtDateTime(it.at)}</span>
            {it.state === "waiting" && onCancel && (
              confirming === it.token
                ? <span className="ml-auto flex items-center gap-1"><Button size="xs" variant="ghost" type="button" className="text-danger" onClick={() => { onCancel(it.token); setConfirming(null) }}>{tx("ยืนยันยกเลิกลิงก์")}</Button><Button size="xs" variant="ghost" type="button" onClick={() => setConfirming(null)}>{tx("ไม่")}</Button></span>
                : <Button size="xs" variant="ghost" type="button" className="ml-auto text-muted-foreground" onClick={() => setConfirming(it.token)}>{tx("ยกเลิกลิงก์")}</Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
