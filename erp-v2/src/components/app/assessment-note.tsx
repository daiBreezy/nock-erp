"use client"

import { useState } from "react"
import { ClipboardCheckIcon, PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime } from "@/domain/dates"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { Assessment } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Pill } from "./badges"

/**
 * The result of a Test / Trial with the teacher's optional note — kept as data (owner 2026-09-28). Two states (owner 2026-11-19): nothing saved yet =
 * the form is open to fill · saved = Info (read-only) with an Edit button that opens the form again.
 * owner 2026-11-25: this is JUST the result part, so it can sit inside the form's own card on the Lead panel (recording a result is a Panel thing —
 * the same card in the chat has no such button). `compact` = nothing saved yet is ONE line with a "บันทึกผล" button; opening it always has a ยกเลิก.
 */
export function AssessmentResult({ a, editable, compact = true }: { a: Assessment; editable: boolean; compact?: boolean }) {
  const save = useStore((s) => s.saveAssessmentNote)
  const who = useStore((s) => s.staff.find((x) => x.id === a.notedBy)?.nickname)
  const [result, setResult] = useState(a.result ?? "")
  const [note, setNote] = useState(a.note ?? "")
  const has = !!(a.result || a.note)
  const [editing, setEditing] = useState(!has && !compact)
  const dirty = result !== (a.result ?? "") || note !== (a.note ?? "")
  if (editable && (editing || (!has && !compact))) {
    return (
      <div className="space-y-1.5">
        <Input className="h-8 text-sm" value={result} onChange={(e) => setResult(e.target.value)} placeholder={a.type === "test" ? "ผลสอบ เช่น ระดับ ป.5 · 18/25 (ไม่บังคับ)" : "ผลทดลองเรียน เช่น เหมาะกับคลาสกลุ่ม (ไม่บังคับ)"} />
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ตครู: จุดแข็ง/จุดที่ต้องเสริม ความพร้อม ฯลฯ — เก็บไว้เป็นข้อมูลประเมินผล" />
        <div className="flex justify-end gap-1.5">
          {/* opened by mistake / not ready to save → cancel always works (it only hides the form when nothing is saved yet) */}
          {(has || compact) && <Button size="xs" variant="ghost" onClick={() => { setResult(a.result ?? ""); setNote(a.note ?? ""); setEditing(false) }}>ยกเลิก</Button>}
          <Button size="xs" variant="outline" disabled={!dirty} onClick={() => { if (report(save(a.id, { result, note }), "บันทึกผลแล้ว")) setEditing(false) }}>บันทึกผล</Button>
        </div>
      </div>
    )
  }
  if (has) {
    return (
      <div className="space-y-0.5 text-sm">
        {a.result && <p className="font-medium">{a.result}</p>}
        {a.note && <p className="whitespace-pre-line text-muted-foreground">{a.note}</p>}
        <div className="flex items-center gap-2">
          {a.notedAt && <p className="text-2xs text-muted-foreground">บันทึกโดย {who ?? "—"} · {fmtDateTime(a.notedAt)}</p>}
          {editable && <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}><PencilIcon /> แก้ไข</Button>}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <p className="text-xs text-muted-foreground">ยังไม่มีบันทึกผล</p>
      {editable && compact && <Button size="xs" variant="outline" className="ml-auto" onClick={() => setEditing(true)}>บันทึกผล</Button>}
    </div>
  )
}

/** A Test / Trial record that has no form behind it (booked by hand) — its own small card: what · when, then the result. */
export function AssessmentNote({ a, editable, showWhen = false, compact = false, child, className }: {
  a: Assessment; editable: boolean; showWhen?: boolean; className?: string
  /** owner 2026-11-20: whose result this is — shown when a family has more than one child */
  child?: string
  compact?: boolean
}) {
  const who = useStore((s) => s.staff.find((x) => x.id === a.notedBy)?.nickname)
  return (
    <div className={cn("space-y-1.5 rounded-2xl bg-special-soft/50 p-2.5 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <ClipboardCheckIcon className="size-3.5 text-special-ink" />
        <Pill tone="special">{FORM_TYPE_LABEL[a.type]}</Pill>
        {child && <b className="font-semibold">{child}</b>}
        <span className="text-muted-foreground">{a.subject}{showWhen && ` · ${fmtDate(a.date, { weekday: true })} ${a.start}`}</span>
        {a.notedAt && !(a.result || a.note) && <span className="ml-auto text-muted-foreground">บันทึกโดย {who ?? "—"} · {fmtDateTime(a.notedAt)}</span>}
      </div>
      <AssessmentResult a={a} editable={editable} compact={compact} />
    </div>
  )
}
