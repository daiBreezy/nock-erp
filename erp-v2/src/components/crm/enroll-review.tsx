"use client"

import { useEffect, useState } from "react"
import { ClipboardListIcon, ReceiptIcon, UserPlusIcon, XIcon } from "lucide-react"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate, fmtDateTime } from "@/domain/dates"
import { matchExistingFamily } from "@/domain/rules/people"
import type { EnrollSubmission, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { fetchEnrollSubmissions, markEnrollReviewed } from "@/lib/forms"
import { useStore } from "@/store/store"
import { FamilyMatchChoice } from "@/components/app/family-match-choice"

const PKG = { month: "รายเดือน", hour: "แพ็กชั่วโมง", week: "รายสัปดาห์", unsure: "ยังไม่แน่ใจ" } as const
const DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]
const PERIOD = { am: "เช้า", pm: "บ่าย", eve: "เย็น" } as Record<string, string>
const timeLabel = (k: string) => { const [d, p] = k.split("-"); return `${DAYS[Number(d)]} ${PERIOD[p]}` }

/** Enroll-now applications waiting at the top of CRM (owner 2026-10-05). */
export function EnrollInbox({ branchId }: { branchId: ID }) {
  const [subs, setSubs] = useState<EnrollSubmission[]>([])
  const [open, setOpen] = useState<EnrollSubmission | null>(null)
  const [invoiceFor, setInvoiceFor] = useState<ID | null>(null)
  const load = () => fetchEnrollSubmissions().then(setSubs)
  useEffect(() => { load() }, [])
  const pending = subs.filter((x) => x.status === "pending" && x.branchId === branchId).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  if (!pending.length) return null
  return (
    <section className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900">
      <p className="mb-2 flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100"><UserPlusIcon className="size-5" /> ใบสมัครเรียนรอจัดคลาส ({pending.length})</p>
      <ul className="space-y-1.5">
        {pending.map((x) => {
          const p = x.parents.find((y) => y.primary) ?? x.parents[0]
          return (
            <li key={x.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-background px-3 py-2 text-sm">
              <span className="font-medium">{x.children.map((c) => `${c.nickname || c.name} (${c.grade})`).join(", ")}</span>
              <span className="text-muted-foreground">· {p?.name} {p?.phone}</span>
              <span className="text-xs text-muted-foreground">· {x.leadId ? "Admin ส่งลิงก์" : "จาก Rich Menu"} · {fmtDateTime(x.submittedAt)}</span>
              <Button size="xs" className="ml-auto" onClick={() => setOpen(x)}>สร้างนักเรียน + ใบแจ้งหนี้</Button>
            </li>
          )
        })}
      </ul>
      {open && <EnrollReviewDialog sub={open} onClose={() => setOpen(null)} onDone={(ids) => { load(); if (ids?.[0]) setInvoiceFor(ids[0]) }} />}
      {invoiceFor && <InvoiceSheet id="new" defaultStudentId={invoiceFor} onClose={() => setInvoiceFor(null)} />}
    </section>
  )
}

/**
 * Review an application (owner 2026-10-16): who the parents and children are → family + student + lead in one go,
 * then the invoice panel opens — the course + classes agreed in the chat are picked there (the one place for it).
 */
export function EnrollReviewDialog({ sub, onClose, onDone }: { sub: EnrollSubmission; onClose: () => void; onDone: (studentIds?: ID[]) => void }) {
  const s = useStore()
  const approve = useStore((st) => st.approveEnrollment)
  const matched = matchExistingFamily(s.families, { lineUserId: sub.lineUserId, phones: sub.parents.map((p) => p.phone) })
  const [busy, setBusy] = useState(false)
  // owner 2026-10-29: the match is a suggestion — the admin picks รวม / แยก before approving
  const [newFamily, setNewFamily] = useState(false)

  const submit = async () => {
    setBusy(true)
    const r = approve(sub, sub.children.map((_, i) => ({ childIndex: i })), { newFamily })
    if (report(r, (v) => `สร้างนักเรียน ${v.studentIds.length} คนแล้ว — เลือกคอร์ส + คลาสในใบแจ้งหนี้ได้เลย`)) {
      await markEnrollReviewed(sub.id, "approved", r.value.studentIds)
      onDone(r.value.studentIds); onClose()
    }
    setBusy(false)
  }
  const reject = async () => { await markEnrollReviewed(sub.id, "rejected"); report({ ok: true, value: undefined }, "ปิดใบสมัครแล้ว"); onDone(); onClose() }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardListIcon className="size-5" /> ใบสมัครเรียน · ส่งเมื่อ {fmtDateTime(sub.submittedAt)}</DialogTitle>
          <DialogDescription>ตรวจข้อมูล → สร้างครอบครัว + นักเรียน แล้วเปิดใบแจ้งหนี้ให้เลือกคอร์ส + คลาสที่ตกลงในแชท · ตอบเป็นภาษา {sub.lang.toUpperCase()}</DialogDescription>
        </DialogHeader>
        <section className="space-y-1 rounded-2xl border p-3 text-sm">
          <p className="font-medium">ผู้ปกครอง</p>
          {sub.parents.map((p, i) => <p key={i}>{p.name} · {p.phone}{p.relationship ? ` · ${p.relationship}` : ""}{p.primary ? " · ผู้ติดต่อหลัก" : ""}</p>)}
          {sub.familyAddress && <p className="text-muted-foreground">{[sub.familyAddress, sub.familyProvince, sub.familyPostcode].filter(Boolean).join(" ")}</p>}
          {sub.taxInfo?.taxId && <p className="text-muted-foreground">ใบกำกับภาษี: {sub.taxInfo.customerName} · {sub.taxInfo.taxId}</p>}
          {matched ? <FamilyMatchChoice familyName={matched.name} reason="LINE หรือเบอร์ตรงกัน" newFamily={newFamily} onChange={setNewFamily} /> : <p className="text-xs text-muted-foreground">ครอบครัวใหม่</p>}
        </section>
        {sub.children.map((c, i) => (
          <section key={i} className="space-y-1 rounded-2xl border p-3 text-sm">
            <p className="font-medium">{c.name}{c.nickname ? ` (${c.nickname})` : ""} · {c.grade}{c.school ? ` · ${c.school}` : ""}</p>
            <div className="grid gap-1 text-xs text-muted-foreground">
              {/* older forms asked the parent for these — still shown when they're there */}
              {c.classIds?.length ? <p>เลือกคลาส: <span className="text-foreground">{c.classIds.map((id) => { const k = s.classes.find((x) => x.id === id); return k ? `${k.name} · ${DAYS[k.weekday]} ${k.start}` : "คลาสที่ปิดไปแล้ว" }).join(" / ")}</span></p> : null}
              {c.subjects.length > 0 && <p>อยากเรียน: <span className="text-foreground">{c.subjects.join(", ")}</span>{c.pkg !== "unsure" ? ` · ${PKG[c.pkg]}` : ""}</p>}
              {c.times.length > 0 && <p>สะดวก: <span className="text-foreground">{c.times.map(timeLabel).join(", ")}</span></p>}
              <p>อยากเริ่ม: <span className="text-foreground">{fmtDate(c.startDate, { weekday: true })}</span>{c.bus ? ` · รถรับส่ง${c.busLeg === "pickup" ? " ขาไป" : c.busLeg === "dropoff" ? " ขากลับ" : " ไป-กลับ"}` : ""}</p>
              {c.placement && <p className="text-amber-700">ขอให้ครูประเมินระดับในคาบแรก (จะบันทึกในโน้ตนักเรียน)</p>}
              {c.note && <p>โน้ต: {c.note}</p>}
            </div>
          </section>
        ))}
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" className="text-muted-foreground" onClick={reject}><XIcon /> ปิดใบสมัคร (ไม่รับ)</Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>ไว้ก่อน</Button>
            <Button disabled={busy} onClick={submit}><ReceiptIcon /> สร้างนักเรียน + ใบแจ้งหนี้</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
