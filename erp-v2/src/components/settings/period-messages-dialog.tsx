"use client"

import { useMemo, useState } from "react"
import { SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Pill } from "@/components/app/badges"
import { PeriodMessageEditor } from "@/components/settings/period-message-editor"
import { toDateStr } from "@/domain/dates"
import type { PeriodImpact } from "@/domain/rules/period-impact"
import { composeFamilyMessage, groupOf, type MsgKid } from "@/domain/rules/period-message"
import * as People from "@/domain/rules/people"
import { invoiceStateFor } from "@/domain/rules/session-credit"
import type { ID, SpecialPeriod } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useEntitlements, useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-25: the Admin's message to parents about a Special Period — ONE message per family (all the children it touches), built from the period's
 * editable set (edit the set here or in the period's card). Nothing goes out by itself: review → edit this family's text if wanted → send (one by one or
 * everyone not yet sent). A family without LINE is listed so the Admin tells them another way.
 */
export function PeriodMessagesDialog({ period, impact, branchId, onClose }: { period: SpecialPeriod; impact: PeriodImpact; branchId: ID; onClose: () => void }) {
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const invoices = useStore((s) => s.invoices)
  const credits = useStore((s) => s.sessionCredits ?? [])
  const sent = useStore((s) => s.periodSent ?? {})
  const send = useStore((s) => s.sendPeriodMessage)
  const setMsgs = useStore((s) => s.setPeriodMessages)
  const ents = useEntitlements()
  const today = toDateStr(useNow(60_000))
  const [edits, setEdits] = useState<Record<ID, string>>({})
  const [open, setOpen] = useState<ID | null>(null)
  const [tpl, setTpl] = useState(false)

  const rows = useMemo(() => {
    const byFamily = new Map<ID, MsgKid[]>()
    for (const sid of impact.students) {
      const stu = students.find((x) => x.id === sid)
      if (!stu?.familyId) continue
      const sub = impact.subscription.find((r) => r.studentId === sid)
      const hourly = impact.hourly.find((r) => r.studentId === sid)
      const r = sub ?? hourly
      if (!r) continue // no package covers it — the Admin handles that one by hand
      const pkg = r.packages[0]
      const kind = sub ? "subscription" : "sessions"
      const mine = credits.filter((c) => c.periodId === period.id && c.studentId === sid && c.status !== "revoked")
      const kid: MsgKid = {
        name: stu.nickname, group: groupOf(kind, invoiceStateFor(sid, pkg.courseId, invoices)), dates: r.sessions.map((x) => x.date),
        newEnd: kind === "sessions" ? ents.find((e) => e.id === pkg.entitlementId)?.to : undefined, credits: kind === "subscription" ? (mine.length || r.sessions.length) : undefined,
      }
      byFamily.set(stu.familyId, [...(byFamily.get(stu.familyId) ?? []), kid])
    }
    return [...byFamily.entries()].map(([familyId, kids]) => {
      const fam = families.find((f) => f.id === familyId)
      const name = fam ? People.familyDisplay(fam.name) : "—"
      return { familyId, name, kids, hasLine: !!(fam && People.mainLineAccount(fam)), text: composeFamilyMessage(period, name, kids) }
    }).sort((a, b) => a.name.localeCompare(b.name, "th"))
  }, [impact, students, families, invoices, credits, ents, period])

  const textOf = (r: (typeof rows)[number]) => edits[r.familyId] ?? r.text
  const sentAt = (id: ID) => sent[`${period.id}|${id}`]
  const todo = rows.filter((r) => r.hasLine && !sentAt(r.familyId))
  const sendOne = (r: (typeof rows)[number]) => report(send(period.id, r.familyId, textOf(r)), tx("ส่งข้อความถึง {0} แล้ว", [r.name]))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tx("ข้อความถึงผู้ปกครอง")} · {period.name}</DialogTitle>
          <DialogDescription>{tx("1 ข้อความต่อ 1 ครอบครัว (รวมลูกทุกคนที่กระทบ) · ตรวจและแก้ได้ก่อนส่ง · ไม่ส่งอัตโนมัติ")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Button size="xs" variant="outline" onClick={() => setTpl(!tpl)}>{tpl ? tx("ซ่อนชุดข้อความ") : tx("แก้ชุดข้อความของช่วงนี้")}</Button>
          {tpl && <div className="rounded-xl bg-muted/40 p-2.5"><PeriodMessageEditor period={period} onChange={(m) => { setEdits({}); report(setMsgs(branchId, period.id, m), tx("บันทึกชุดข้อความแล้ว")) }} /></div>}
          {rows.length === 0 && <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">{tx("ยังไม่มีครอบครัวที่ต้องส่งข้อความ")}</p>}
          <ul className="divide-y rounded-xl bg-muted/40">
            {rows.map((r) => (
              <li key={r.familyId} className="space-y-1.5 p-2.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1"><b>{r.name}</b><span className="ml-1.5 text-xs text-muted-foreground">{r.kids.map((k) => k.name).join(", ")}</span></span>
                  {sentAt(r.familyId) ? <Pill tone="green">{tx("ส่งแล้ว")}</Pill> : !r.hasLine ? <Pill tone="amber">{tx("ไม่มี LINE — แจ้งทางอื่น")}</Pill> : <Pill tone="gray">{tx("ยังไม่ส่ง")}</Pill>}
                  <Button size="xs" variant="ghost" onClick={() => setOpen(open === r.familyId ? null : r.familyId)}>{open === r.familyId ? tx("ซ่อน") : tx("ดู / แก้")}</Button>
                  <Button size="xs" variant="outline" disabled={!r.hasLine} onClick={() => sendOne(r)}><SendIcon /> {sentAt(r.familyId) ? tx("ส่งซ้ำ") : tx("ส่ง")}</Button>
                </div>
                {open === r.familyId && (
                  <div className="space-y-1">
                    <Textarea rows={9} value={textOf(r)} onChange={(e) => setEdits({ ...edits, [r.familyId]: e.target.value })} />
                    {edits[r.familyId] !== undefined && <Button size="xs" variant="ghost" onClick={() => setEdits(({ [r.familyId]: _, ...rest }) => rest)}>{tx("ใช้ข้อความจากชุดข้อความอีกครั้ง")}</Button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ปิด")}</Button>
          <Button disabled={todo.length === 0} onClick={() => todo.forEach(sendOne)}><SendIcon /> {tx("ส่งให้ทุกบ้านที่ยังไม่ส่ง ({0})", [todo.length])}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
