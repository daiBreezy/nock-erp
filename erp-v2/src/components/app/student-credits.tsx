"use client"

import { useMemo, useState } from "react"
import { CoinsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { fmtDate, fmtMoney } from "@/domain/dates"
import { can } from "@/domain/rules/permissions"
import { creditTotal, makeupReady } from "@/domain/rules/session-credit"
import type { CreditSettle, ID, SessionCredit, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"
import { MakeupDialog } from "./makeup-dialog"
import { Pill } from "./badges"
import { NativeSelect } from "./native-select"

export const SETTLE_LABEL: Record<CreditSettle, string> = { refund: "Refund (คืนเงิน)", makeup: "ชดเชยคาบ", discount: "ลดค่าเรียนครั้งถัดไป" }

/**
 * owner 2026-11-25: Credit คาบ (weekly / monthly sessions the school stopped) in the Student / Family Billing tab. Made by itself while a Special Period is
 * Active. The ADMIN records what the parent chose (Refund · make-up · discount on the next payment) or cancels a credit by hand (e.g. the unpaid invoice was
 * reduced instead). v1 records the choice — the money / make-up booking itself is still done in Billing / the calendar.
 */
export function SessionCreditsCard({ kids }: { kids: Student[] }) {
  const all = useStore((s) => s.sessionCredits ?? [])
  const courses = useStore((s) => s.courses)
  const notes = useStore((s) => s.creditNotes)
  const me = useStore((s) => s.me())
  const settle = useStore((s) => s.settleSessionCredits)
  const revoke = useStore((s) => s.revokeSessionCredits)
  const ids = useMemo(() => new Set(kids.map((k) => k.id)), [kids])
  const mine = all.filter((c) => ids.has(c.studentId) && c.status !== "revoked").sort((a, b) => a.date.localeCompare(b.date))
  const [pick, setPick] = useState<Set<ID>>(new Set())
  const [mode, setMode] = useState<CreditSettle>("refund")
  const [note, setNote] = useState("")
  const [makeup, setMakeup] = useState<ID[] | null>(null)
  if (mine.length === 0) return null
  const canAct = can(me, "billing.manage")
  const open = mine.filter((c) => c.status === "open")
  const total = creditTotal(open)
  const toggle = (id: ID) => setPick((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const chosen = mine.filter((c) => pick.has(c.id) && makeupReady(c))
  const done = () => { setPick(new Set()); setNote("") }
  const kidName = (c: SessionCredit) => (kids.length > 1 ? `${kids.find((k) => k.id === c.studentId)?.nickname ?? "—"} · ` : "")
  return (
    <section className="space-y-2 rounded-xl bg-muted/40 p-2.5">
      <div className="flex items-center gap-2">
        <CoinsIcon className="size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-sm font-semibold">{tx("Credit คาบ")}</p>
        {open.length > 0 && <Pill tone="amber">{tx("รอเลือกวิธีใช้")} {total.sessions} {tx("คาบ")} · {fmtMoney(total.money)}</Pill>}
      </div>
      <ul className="divide-y rounded-lg bg-background text-sm">
        {mine.map((c) => (
          <li key={c.id} className="flex items-center gap-2 px-2.5 py-1.5">
            {makeupReady(c) && canAct && <Checkbox checked={pick.has(c.id)} onCheckedChange={() => toggle(c.id)} aria-label={tx("เลือก Credit นี้")} />}
            <span className="min-w-0 flex-1 truncate">{kidName(c)}{courses.find((x) => x.id === c.courseId)?.name ?? "—"}<span className="ml-1.5 text-xs text-muted-foreground">{fmtDate(c.date, { weekday: true })}</span></span>
            <span className="tabular-nums">{fmtMoney(c.value)}</span>
            {c.status === "settled" && makeupReady(c) && canAct && <Button size="xs" variant="outline" onClick={() => setMakeup([c.id])}>{tx("จองคาบ")}</Button>}
            {c.status === "settled" && <Pill tone="green">{tx(SETTLE_LABEL[c.settle!.mode])}{c.settle!.creditNoteId && ` · ${notes.find((n) => n.id === c.settle!.creditNoteId)?.number ?? ""}`}</Pill>}
          </li>
        ))}
      </ul>
      {chosen.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-background p-2">
          <p className="text-xs text-muted-foreground">{tx("เลือกแล้ว {0} คาบ · {1}", [chosen.length, fmtMoney(creditTotal(chosen).money)])}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <NativeSelect className="w-52" value={mode} onChange={(e) => setMode(e.target.value as CreditSettle)} aria-label={tx("วิธีใช้ Credit")}
              options={(Object.keys(SETTLE_LABEL) as CreditSettle[]).map((m) => ({ value: m, label: tx(SETTLE_LABEL[m]) }))} />
            <Input className="h-8 min-w-40 flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tx("หมายเหตุ / เหตุผลที่ยกเลิก")} />
          </div>
          <div className="flex justify-end gap-1.5">
            <Button size="xs" variant="ghost" onClick={() => { if (report(revoke([...pick], note), tx("ยกเลิก Credit แล้ว"))) done() }}>{tx("ยกเลิก Credit (ต้องใส่เหตุผล)")}</Button>
            {mode === "makeup"
              ? <Button size="xs" onClick={() => setMakeup(chosen.map((c) => c.id))}>{tx("เลือกคาบชดเชย")}</Button>
              : <Button size="xs" onClick={() => { if (report(settle([...pick], mode, note), tx("บันทึกการเลือกแล้ว"))) done() }}>{tx("บันทึกการเลือก")}</Button>}
          </div>
          <p className="text-2xs text-muted-foreground">{tx("Refund และส่วนลดสร้างใบลดหนี้จากใบที่จ่ายแล้วให้เอง (ไปอนุมัติ/โอนคืนที่ Billing › ใบลดหนี้) · ใบที่ยังไม่จ่ายให้แก้ยอดใบแล้วยกเลิก Credit · ชดเชยคาบ: เลือกคาบที่ว่างให้ได้เลย (1 Credit = 1 คาบ)")}</p>
        </div>
      )}
      {makeup && <MakeupDialog creditIds={makeup} onClose={() => { setMakeup(null); done() }} />}
    </section>
  )
}
