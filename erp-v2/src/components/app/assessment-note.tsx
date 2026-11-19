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

/** Test / Trial record with the teacher's optional note — kept as data (owner 2026-09-28). Two states (owner 2026-11-19): nothing saved yet = the
 *  form is open to fill · saved = Info (read-only) with an Edit button that opens the form again. */
export function AssessmentNote({ a, editable, showWhen = false, className }: { a: Assessment; editable: boolean; showWhen?: boolean; className?: string }) {
  const save = useStore((s) => s.saveAssessmentNote)
  const who = useStore((s) => s.staff.find((x) => x.id === a.notedBy)?.nickname)
  const [result, setResult] = useState(a.result ?? "")
  const [note, setNote] = useState(a.note ?? "")
  const has = !!(a.result || a.note)
  const [editing, setEditing] = useState(!has)
  const dirty = result !== (a.result ?? "") || note !== (a.note ?? "")
  return (
    <div className={cn("space-y-1.5 rounded-2xl bg-special-soft/50 p-2.5 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <ClipboardCheckIcon className="size-3.5 text-special-ink" />
        <Pill tone="special">{FORM_TYPE_LABEL[a.type]}</Pill>
        <span className="text-muted-foreground">{a.subject}{showWhen && ` · ${fmtDate(a.date, { weekday: true })} ${a.start}`}</span>
        {a.notedAt && <span className="ml-auto text-muted-foreground">บันทึกโดย {who ?? "—"} · {fmtDateTime(a.notedAt)}</span>}
      </div>
      {editable && (editing || !has) ? (
        <>
          <Input className="h-8 text-sm" value={result} onChange={(e) => setResult(e.target.value)} placeholder={a.type === "test" ? "ผลสอบ เช่น ระดับ ป.5 · 18/25 (ไม่บังคับ)" : "ผลทดลองเรียน เช่น เหมาะกับคลาสกลุ่ม (ไม่บังคับ)"} />
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ตครู: จุดแข็ง/จุดที่ต้องเสริม ความพร้อม ฯลฯ — เก็บไว้เป็นข้อมูลประเมินผล" />
          <div className="flex justify-end gap-1.5">
            {has && <Button size="xs" variant="ghost" onClick={() => { setResult(a.result ?? ""); setNote(a.note ?? ""); setEditing(false) }}>ยกเลิก</Button>}
            <Button size="xs" variant="outline" disabled={!dirty} onClick={() => { if (report(save(a.id, { result, note }), "บันทึกผลแล้ว")) setEditing(false) }}>บันทึกผล</Button>
          </div>
        </>
      ) : a.result || a.note ? (
        <div className="space-y-0.5">
          {a.result && <p className="font-medium">{a.result}</p>}
          {a.note && <p className="whitespace-pre-line text-muted-foreground">{a.note}</p>}
          {editable && <div className="flex justify-end"><Button size="xs" variant="ghost" onClick={() => setEditing(true)}><PencilIcon /> แก้ไข</Button></div>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">ยังไม่มีบันทึกผล</p>
      )}
    </div>
  )
}
