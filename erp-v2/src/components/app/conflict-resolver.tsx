"use client"

import { useState } from "react"
import { AlertTriangleIcon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { endTime, fmtDate } from "@/domain/dates"
import { findConflicts, sessionState, subjectsOf } from "@/domain/rules/scheduling"
import { suggestFixes } from "@/domain/rules/suggest"
import type { ID, Result, Session } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Option = { key: string; label: string; detail: string; apply: () => Result<unknown> }

/** Clashes that still matter: every session involved is still ahead (past ones can't be fixed — owner 2026-10-01). */
export function liveConflicts(ids: ID[], sessions: Session[], ctx: { branch: ReturnType<typeof useBranch>; staff: ReturnType<typeof useStore.getState>["staff"]; now: Date }) {
  const dates = new Set(sessions.filter((x) => ids.includes(x.id)).map((x) => x.date))
  return findConflicts(sessions.filter((x) => dates.has(x.date)), ctx.branch, ctx.staff)
    .filter((c) => c.sessionIds.some((id) => ids.includes(id)))
    .filter((c) => c.sessionIds.every((id) => { const x = sessions.find((y) => y.id === id); return !!x && sessionState(x, ctx.now) === "upcoming" }))
}

/**
 * Fix clashes in one place (owner 2026-10-01): what happened, then a way out per clash — merge (same teacher twice),
 * move room / teacher / time (pre-checked suggestions), or cancel one — applied one by one or all at once.
 */
export function ConflictResolver({ sessionIds, onClose, onOpen }: { sessionIds: ID[]; onClose: () => void; onOpen?: (id: ID) => void }) {
  const sessions = useStore((s) => s.sessions)
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const attendance = useStore((s) => s.attendance)
  const act = useStore.getState
  const branch = useBranch()
  const now = useNow(60_000)
  const L = useLookup()
  const conflicts = liveConflicts(sessionIds, sessions, { branch, staff, now })
  const [pick, setPick] = useState<Record<number, string>>({})
  const label = (x: Session) => `${subjectsOf(x).join(" + ")} ${x.start}–${endTime(x.start, x.minutes)} · ${L.teacher(x.teacherId).label} · ${L.room(x.roomId)} · ${x.studentIds.length} คน`

  const optionsFor = (c: (typeof conflicts)[number]): Option[] => {
    const involved = c.sessionIds.map((id) => sessions.find((x) => x.id === id)!).filter(Boolean)
    const out: Option[] = []
    // the same teacher twice at the same time → one session (the one with more students keeps its room)
    if (c.kind === "teacher" && involved.length === 2) {
      const [keep, drop] = [...involved].sort((a, b) => b.studentIds.length - a.studentIds.length)
      out.push({ key: `merge-${drop.id}`, label: "รวมเป็นคาบเดียว", detail: `ย้ายนักเรียน ${drop.studentIds.length} คนของ ${subjectsOf(drop).join("+")} ${drop.start} เข้า ${L.room(keep.roomId)} (ห้องที่มีคนมากกว่า)`, apply: () => act().mergeSessions(keep.id, drop.id) })
    }
    for (const x of involved) {
      for (const f of suggestFixes(x.id, { sessions, branch, staff, holidays, now, attendance }, 1)) {
        out.push({ key: `${x.id}-${f.kind}`, label: `${f.label} · ${subjectsOf(x).join("+")} ${x.start}`, detail: f.detail + (f.clearsAll ? "" : " (ยังชนบางส่วน)"), apply: () => act().moveSession(x.id, f.target, "one") })
      }
    }
    for (const x of involved) out.push({ key: `cancel-${x.id}`, label: `ยกเลิกคาบ ${subjectsOf(x).join("+")} ${x.start}`, detail: `นักเรียน ${x.studentIds.length} คน · ต้องแจ้งผู้ปกครอง`, apply: () => act().cancelSession(x.id, "ยกเลิกเพื่อแก้คาบชน") })
    return out
  }
  const all = conflicts.map((c, i) => ({ c, i, opts: optionsFor(c) }))
  const chosen = (i: number, opts: Option[]) => opts.find((o) => o.key === pick[i]) ?? opts[0]

  const applyOne = (i: number, opts: Option[]) => { const o = chosen(i, opts); if (o) report(o.apply(), `แก้แล้ว: ${o.label}`) }
  const applyAll = () => {
    let done = 0
    for (const { i, opts } of all) {
      const o = chosen(i, opts)
      if (!o) continue
      const r = o.apply()
      if (r.ok) done++
      else report(r, "")
    }
    if (done) report({ ok: true, value: undefined }, `แก้คาบชนแล้ว ${done} จุด`)
    if (done === all.length) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangleIcon className="size-5 text-red-600" /> แก้คาบชน</DialogTitle>
          <DialogDescription>{conflicts.length ? `${conflicts.length} จุด · เลือกวิธีแก้ของแต่ละจุด แล้วแก้ทีละจุดหรือทั้งหมด` : "ไม่มีคาบชนที่ต้องแก้แล้ว"}</DialogDescription>
        </DialogHeader>
        {all.map(({ c, i, opts }) => {
          const involved = c.sessionIds.map((id) => sessions.find((x) => x.id === id)!).filter(Boolean)
          return (
            <section key={i} className="space-y-2 rounded-2xl border p-3">
              <p className="text-sm font-medium text-red-700">{fmtDate(involved[0].date, { weekday: true })} · {c.message}</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {involved.map((x) => (
                  <li key={x.id} className="flex items-center gap-2">
                    <span className="truncate">{label(x)}</span>
                    {onOpen && <button type="button" className="ml-auto shrink-0 text-primary underline" onClick={() => onOpen(x.id)}>เปิดคาบ</button>}
                  </li>
                ))}
              </ul>
              <div className="grid gap-1.5">
                {opts.map((o) => {
                  const on = chosen(i, opts)?.key === o.key
                  return (
                    <button key={o.key} type="button" aria-pressed={on} onClick={() => setPick((p) => ({ ...p, [i]: o.key }))}
                      className={cn("flex items-start gap-2 rounded-xl border p-2 text-left text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
                      <span><span className="font-medium">{o.label}</span><span className="block text-xs text-muted-foreground">{o.detail}</span></span>
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-end"><Button size="xs" variant="outline" onClick={() => applyOne(i, opts)}>แก้จุดนี้</Button></div>
            </section>
          )
        })}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ปิด</Button>
          {all.length > 0 && <Button onClick={applyAll}>แก้ทั้งหมด ({all.length})</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
