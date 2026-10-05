"use client"

import { useState } from "react"
import { ArchiveIcon, CheckIcon, MessageCircleIcon, MoreHorizontalIcon, PhoneIcon } from "lucide-react"
import { CatalogCombo } from "@/components/app/lesson-picker"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addDays, fmtDate, fmtDateTime, toDateStr } from "@/domain/dates"
import { LEAD_STAGE_LABEL } from "@/domain/rules/crm"
import * as Loss from "@/domain/rules/loss"
import type { ContactChannel, ContactResult, ID, Lead, LeadStage } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const CHANNEL_ICON = { call: PhoneIcon, line: MessageCircleIcon, other: MoreHorizontalIcon } as const
const RESULTS: ContactResult[] = ["talked", "replied", "no_answer", "no_reply", "call_back", "wrong_number"]
const RESULTS_FOR: Record<ContactChannel, ContactResult[]> = {
  call: ["talked", "no_answer", "call_back", "wrong_number"],
  line: ["replied", "no_reply", "wrong_number"],
  other: RESULTS,
}

function Chip({ on, onClick, children, tone }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "red" | "green" }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("rounded-full border px-2.5 py-1 text-xs", on ? (tone === "red" ? "border-red-500 bg-red-50 font-medium text-red-700 dark:bg-red-950/40" : tone === "green" ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/40" : "border-primary bg-primary/10 font-medium text-primary") : "hover:bg-muted")}>
      {children}
    </button>
  )
}

/**
 * Follow-up log (owner 2026-10-05): when a lead goes quiet, the admin calls / messages and records what happened —
 * so anyone can see the lead is really gone before closing it.
 */
export function FollowUpSection({ lead, canManage, onClose }: { lead: Lead; canManage: boolean; onClose: () => void }) {
  const add = useStore((s) => s.addLeadFollowUp)
  const staff = useStore((s) => s.staff)
  const now = useNow(60_000)
  const [channel, setChannel] = useState<ContactChannel>("call")
  const [result, setResult] = useState<ContactResult | null>(null)
  const [note, setNote] = useState("")
  const st = Loss.followUpState(lead, now)
  const open = lead.stage !== "archived" && lead.stage !== "enrolled"
  const save = () => result && report(add(lead.id, { channel, result, note }), "บันทึกการติดตามแล้ว") && (setResult(null), setNote(""))
  const list = [...(lead.followUps ?? [])].reverse()
  return (
    <div className="space-y-2">
      {open && (
        <div className={cn("flex flex-wrap items-center gap-2 rounded-lg p-2 text-xs", st.suggestClose ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" : "bg-muted/50 text-muted-foreground")}>
          <span>{st.lastReach ? `ตอบล่าสุด ${st.silentDays} วันก่อน` : `ยังไม่เคยติดต่อได้ · เข้ามา ${st.silentDays} วันแล้ว`}</span>
          {st.tries > 0 && <span>· ติดต่อไม่ได้ติดกัน {st.tries} ครั้ง</span>}
          {st.suggestClose && canManage && (
            <Button size="xs" variant="outline" className="ml-auto" onClick={onClose}><ArchiveIcon /> ปิด Lead นี้?</Button>
          )}
        </div>
      )}
      {open && canManage && (
        <div className="space-y-2 rounded-lg border p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["call", "line", "other"] as ContactChannel[]).map((c) => { const Icon = CHANNEL_ICON[c]; return (
              <Chip key={c} on={channel === c} onClick={() => { setChannel(c); setResult(null) }}><span className="flex items-center gap-1"><Icon className="size-3.5" />{Loss.CHANNEL_LABEL[c]}</span></Chip>
            ) })}
            <span className="mx-1 h-4 w-px bg-border" />
            {RESULTS_FOR[channel].map((r) => (
              <Chip key={r} on={result === r} tone={Loss.REACHED.includes(r) ? "green" : "red"} onClick={() => setResult(r)}>{Loss.RESULT_LABEL[r]}</Chip>
            ))}
          </div>
          {result && (
            <div className="flex gap-1.5">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ได้คุยอะไร / นัดอะไรไว้ (ไม่บังคับ)" className="h-8" onKeyDown={(e) => e.key === "Enter" && save()} />
              <Button size="sm" onClick={save}><CheckIcon /> บันทึก</Button>
            </div>
          )}
        </div>
      )}
      {list.length > 0 ? (
        <ol className="space-y-1">
          {list.map((f) => { const Icon = CHANNEL_ICON[f.channel]; return (
            <li key={f.id} className="flex items-start gap-2 text-xs">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className={cn("shrink-0 font-medium", Loss.REACHED.includes(f.result) ? "text-emerald-700" : "text-red-700")}>{Loss.RESULT_LABEL[f.result]}</span>
              <span className="min-w-0 flex-1 text-muted-foreground">{f.note}</span>
              <span className="shrink-0 text-muted-foreground">{staff.find((s) => s.id === f.by)?.nickname} · {fmtDateTime(f.at)}</span>
            </li>
          ) })}
        </ol>
      ) : <p className="text-xs text-muted-foreground">ยังไม่มีบันทึกการติดตาม</p>}
    </div>
  )
}

/**
 * Close a lead (owner 2026-10-05: one short popup) — which step it stopped at, why (main + others), where they went,
 * the time they wanted, when to try again, a note.
 */
export function LeadLostDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const archive = useStore((s) => s.archiveLead)
  const system = useStore((s) => s.system)
  const now = useNow(60_000)
  const st = Loss.followUpState(lead, now)
  const [stage, setStage] = useState<LeadStage>(lead.stage)
  const reasons = Loss.reasonsForLead(stage, system.lossReasons)
  const [reasonId, setReasonId] = useState<ID>(st.tries > 0 && (lead.stage === "new" || lead.stage === "contacting") ? (lead.followUps?.at(-1)?.channel === "line" ? "lr_no_reply" : "lr_unreachable") : "")
  const [others, setOthers] = useState<ID[]>([])
  const [competitor, setCompetitor] = useState<string | undefined>()
  const [wantedTime, setWantedTime] = useState("")
  const [followUpOn, setFollowUpOn] = useState("")
  const [note, setNote] = useState("")
  const [more, setMore] = useState(false)
  const comps = (system.competitors ?? []).map((c) => ({ id: c, name: c }))
  const input = { stage, reasonId, otherReasonIds: others.filter((x) => x !== reasonId), competitor, wantedTime: wantedTime.trim() || undefined, followUpOn: followUpOn || undefined, note }
  const err = Loss.validateLeadLost(input, system.lossReasons)
  const today = toDateStr(now)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ปิด Lead · {lead.name}</DialogTitle>
          <DialogDescription>
            {st.total ? `ติดตามแล้ว ${st.total} ครั้ง · ${st.lastReach ? `ตอบล่าสุด ${st.silentDays} วันก่อน` : "ยังไม่เคยติดต่อได้"}` : "ยังไม่มีบันทึกการติดตาม"} · กู้คืนได้ภายหลัง
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[6rem_1fr] items-center gap-2 text-sm">
          <Label>หยุดที่ขั้น</Label>
          <NativeSelect className="h-9" value={stage} onChange={(e) => setStage(e.target.value as LeadStage)}
            options={(["new", "contacting", "test_scheduled", "tested", "trial_scheduled", "trialed", "payment_pending"] as LeadStage[]).map((x) => ({ value: x, label: LEAD_STAGE_LABEL[x] }))} />
        </div>
        <div className="space-y-1.5">
          <Label>เหตุผลหลัก *</Label>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => <Chip key={r.id} on={reasonId === r.id} onClick={() => setReasonId(r.id)}>{r.label}</Chip>)}
          </div>
        </div>
        {reasonId === "lr_competitor" && (
          <div className="space-y-1">
            <Label>ไปเรียนที่ไหน *</Label>
            <CatalogCombo label="ชื่อสถาบัน" placeholder="เลือก หรือพิมพ์ชื่อใหม่ (ไม่รู้ = ไม่ทราบ)" items={comps} value={competitor} onChange={setCompetitor}
              onCreate={(name) => { const n = name.trim(); return n ? { ok: true, value: { id: n, name: n } } : { ok: false, error: "พิมพ์ชื่อสถาบัน" } }} />
          </div>
        )}
        {reasonId === "lr_schedule" && (
          <div className="space-y-1">
            <Label>เวลาที่ลูกค้าต้องการ</Label>
            <Input value={wantedTime} onChange={(e) => setWantedTime(e.target.value)} placeholder="เช่น เสาร์เช้า 9–11 / หลังเลิกเรียน 17:30" />
          </div>
        )}
        <div className="space-y-1.5">
          <button type="button" className="text-xs text-primary" onClick={() => setMore((m) => !m)}>{more ? "▾" : "▸"} เหตุผลอื่นด้วย (เลือกได้หลายข้อ){others.length ? ` · ${others.length}` : ""}</button>
          {more && (
            <div className="flex flex-wrap gap-1.5">
              {reasons.filter((r) => r.id !== reasonId).map((r) => <Chip key={r.id} on={others.includes(r.id)} onClick={() => setOthers((o) => (o.includes(r.id) ? o.filter((x) => x !== r.id) : [...o, r.id]))}>{r.label}</Chip>)}
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
          <div className="space-y-1">
            <Label>ติดต่ออีกครั้งวันที่</Label>
            <Input type="date" min={today} value={followUpOn} onChange={(e) => setFollowUpOn(e.target.value)} />
            <div className="flex gap-1">{[30, 90, 180].map((d) => <button key={d} type="button" className="rounded-full border px-2 text-[11px] hover:bg-muted" onClick={() => setFollowUpOn(addDays(today, d))}>{d === 30 ? "1 เดือน" : d === 90 ? "3 เดือน" : "6 เดือน"}</button>)}</div>
          </div>
          <div className="space-y-1">
            <Label>หมายเหตุ{reasonId === "lr_other" ? " *" : ""}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="รายละเอียดสั้นๆ" />
            {followUpOn && <p className="text-[11px] text-muted-foreground">วันที่ {fmtDate(followUpOn)} จะขึ้นใน Need Attention ให้ติดต่อใหม่</p>}
          </div>
        </div>
        {err && reasonId && <p className="text-xs text-red-700">{err}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" disabled={!!err} onClick={() => report(archive(lead.id, input), "ปิด Lead แล้ว") && onClose()}><ArchiveIcon /> ปิด Lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** What the close form recorded, for the sheet of a closed lead. */
export function LostSummary({ lead }: { lead: Lead }) {
  const system = useStore((s) => s.system)
  const staff = useStore((s) => s.staff)
  const l = lead.lost
  if (!l) return lead.archiveReason ? <p className="text-muted-foreground">{lead.archiveReason}</p> : null
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-2 gap-y-1 text-sm">
      <dt className="text-muted-foreground">หยุดที่ขั้น</dt><dd>{LEAD_STAGE_LABEL[l.stage]}</dd>
      <dt className="text-muted-foreground">เหตุผลหลัก</dt><dd className="font-medium">{Loss.reasonLabel(l.reasonId, system.lossReasons)}</dd>
      {l.otherReasonIds.length > 0 && <><dt className="text-muted-foreground">เหตุผลอื่น</dt><dd>{l.otherReasonIds.map((x) => Loss.reasonLabel(x, system.lossReasons)).join(", ")}</dd></>}
      {l.competitor && <><dt className="text-muted-foreground">ไปเรียนที่</dt><dd>{l.competitor}</dd></>}
      {l.wantedTime && <><dt className="text-muted-foreground">เวลาที่ต้องการ</dt><dd>{l.wantedTime}</dd></>}
      {l.followUpOn && <><dt className="text-muted-foreground">ติดต่ออีกครั้ง</dt><dd>{fmtDate(l.followUpOn, { weekday: true })}</dd></>}
      {l.note && <><dt className="text-muted-foreground">หมายเหตุ</dt><dd>{l.note}</dd></>}
      <dt className="text-muted-foreground">ปิดโดย</dt><dd className="text-muted-foreground">{staff.find((s) => s.id === l.by)?.nickname ?? "—"} · {fmtDateTime(l.at)}</dd>
    </dl>
  )
}
