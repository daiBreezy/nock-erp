"use client"

import { useState } from "react"
import { ClipboardCheckIcon } from "lucide-react"
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

/** Test / Trial record with the teacher's optional note — always there to fill, kept as data (owner 2026-09-28). */
export function AssessmentNote({ a, editable, showWhen = false, className }: { a: Assessment; editable: boolean; showWhen?: boolean; className?: string }) {
  const save = useStore((s) => s.saveAssessmentNote)
  const who = useStore((s) => s.staff.find((x) => x.id === a.notedBy)?.nickname)
  const [result, setResult] = useState(a.result ?? "")
  const [note, setNote] = useState(a.note ?? "")
  const dirty = result !== (a.result ?? "") || note !== (a.note ?? "")
  return (
    <div className={cn("space-y-1.5 rounded-2xl bg-violet-50/60 p-2.5 text-sm dark:bg-violet-950/30", className)}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <ClipboardCheckIcon className="size-3.5 text-violet-700" />
        <Pill tone="violet">{FORM_TYPE_LABEL[a.type]}</Pill>
        <span className="text-muted-foreground">{a.subject}{showWhen && ` · ${fmtDate(a.date, { weekday: true })} ${a.start}`}</span>
        {a.notedAt && <span className="ml-auto text-muted-foreground">บันทึกโดย {who ?? "—"} · {fmtDateTime(a.notedAt)}</span>}
      </div>
      {editable ? (
        <>
          <Input className="h-8 text-sm" value={result} onChange={(e) => setResult(e.target.value)} placeholder={a.type === "test" ? "ผลสอบ เช่น ระดับ ป.5 · 18/25 (ไม่บังคับ)" : "ผลทดลองเรียน เช่น เหมาะกับคลาสกลุ่ม (ไม่บังคับ)"} />
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="โน้ตครู: จุดแข็ง/จุดที่ต้องเสริม ความพร้อม ฯลฯ — เก็บไว้เป็นข้อมูลประเมินผล" />
          <div className="flex justify-end">
            <Button size="xs" variant="outline" disabled={!dirty} onClick={() => report(save(a.id, { result, note }), "บันทึกผลแล้ว")}>บันทึกผล</Button>
          </div>
        </>
      ) : a.result || a.note ? (
        <div className="space-y-0.5">
          {a.result && <p className="font-medium">{a.result}</p>}
          {a.note && <p className="whitespace-pre-line text-muted-foreground">{a.note}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">ยังไม่มีบันทึกผล</p>
      )}
    </div>
  )
}
