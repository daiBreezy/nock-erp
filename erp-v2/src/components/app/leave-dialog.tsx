"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { endTime, fmtDate, toDateStr } from "@/domain/dates"
import { canSaveLeave } from "@/domain/rules/attendance"
import type { ID, Session, StudentLeave } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { Field } from "./student-form"
import { Segmented } from "./page-layout"
import { PeriodNote } from "@/components/app/period-note"
import { MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Create / edit a student-level, date-range "ลาพักยาว ไม่หักโควตา" record — editable any time, always re-notifies. */
export function LeaveDialog({ studentId, leave, onClose }: { studentId: ID; leave?: StudentLeave; onClose: () => void }) {
  const today = toDateStr(useNow(60_000))
  const me = useStore((s) => s.me())
  const save = useStore((s) => s.saveStudentLeave)
  const [from, setFrom] = useState(leave?.from ?? today)
  const [to, setTo] = useState(leave?.to ?? today)
  const [reason, setReason] = useState(leave?.reason ?? "")
  const [touched, setTouched] = useState(false)
  const r = canSaveLeave(me, from, to, reason)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{leave ? "แก้ไขการลาพักยาว" : "บันทึกการลาพักยาว (ไม่หักโควตา)"}</DialogTitle>
        </DialogHeader>
        <LongLeaveFields studentId={studentId} from={from} to={to} reason={reason} onChange={(v) => { if (v.from !== undefined) setFrom(v.from); if (v.to !== undefined) setTo(v.to); if (v.reason !== undefined) setReason(v.reason) }} error={touched && !r.ok ? r.error : undefined} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (report(save({ id: leave?.id, studentId, from, to, reason }), leave ? "แก้ไขการลาแล้ว" : "บันทึกการลาแล้ว")) onClose()
            }}
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * owner 2026-11-26: ONE field for "how many sessions" — "−" at its left edge, "+" at its right, the number centred (used by both leave tabs).
 * `value` is the text so a half-typed number is allowed; `max` caps what + and typing can reach.
 */
export function CountStepper({ value, onChange, max = 60, disabled, invalid, className }: { value: string; onChange: (text: string) => void; max?: number; disabled?: boolean; invalid?: boolean; className?: string }) {
  const n = Number(value)
  const valid = Number.isInteger(n) && n >= 1 && n <= max
  const set = (x: number) => onChange(String(Math.max(1, Math.min(max, x))))
  return (
    <div className={cn("flex h-9 w-28 items-center rounded-3xl bg-background px-0.5 ring-1 ring-border focus-within:ring-2 focus-within:ring-ring/40", (invalid ?? !valid) && "ring-destructive/40", className)}>
      <Button variant="ghost" size="icon-sm" type="button" aria-label="ลดจำนวนคาบ" className="shrink-0 rounded-full" disabled={disabled || !valid || n <= 1} onClick={() => set(n - 1)}><MinusIcon /></Button>
      <Input type="number" min={1} max={max} className="h-7 min-w-0 flex-1 border-0 bg-transparent px-0 text-center shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" value={value} disabled={disabled}
        onChange={(e) => { const x = Number(e.target.value); onChange(e.target.value === "" || !Number.isFinite(x) ? e.target.value : String(Math.min(max, x))) }} aria-invalid={invalid ?? !valid} aria-label="จำนวนคาบ" />
      <Button variant="ghost" size="icon-sm" type="button" aria-label="เพิ่มจำนวนคาบ" className="shrink-0 rounded-full" disabled={disabled || !valid || n >= max} onClick={() => set(n + 1)}><PlusIcon /></Button>
    </div>
  )
}

/**
 * The ลาพักยาว fields — the ONE look wherever a long leave is recorded (owner 2026-10-12: student ⋯ › ลาพักยาว and the
 * session's ลา › ลาพักยาว are the same thing, so they show the same form). Two ways to say how long, pick one:
 *  - เลือกคาบ: from a day, the next N sessions of this student (any subject) — the end date follows the last one
 *  - ช่วงวันที่: from – to
 * Either way it is saved as one date range.
 */
export function LongLeaveFields({ studentId, from, to, reason, onChange, error, afterSwitch }: { studentId: ID; from: string; to: string; reason: string; onChange: (v: { from?: string; to?: string; reason?: string }) => void; error?: string
  /** owner 2026-11-26: sits right under the "เลือกคาบ / ช่วงวันที่" switch (the leave dialog puts the student's course there) */
  afterSwitch?: React.ReactNode }) {
  const sessions = useStore((s) => s.sessions)
  // an existing leave (a real range) opens on its dates; a new one on "เลือกคาบ"
  const [mode, setMode] = useState<"sessions" | "dates">(from === to ? "sessions" : "dates")
  const [countText, setCountText] = useState("1")
  const count = Number(countText)
  const countOk = Number.isInteger(count) && count >= 1 && count <= 60
  const upcoming = (start: string) => sessions.filter((x) => x.studentIds.includes(studentId) && !x.cancelled && x.date >= start).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  const run = countOk ? upcoming(from).slice(0, count) : []
  const inRange = upcoming(from).filter((x) => x.date <= to)
  // keep the saved range in step with the sessions picked
  const syncTo = (start: string, n: number) => { const r = upcoming(start).slice(0, n); onChange({ from: start, to: r.at(-1)?.date ?? start }) }
  // opens on "เลือกคาบ · 1 คาบ" — set the end date to that session once (a new leave only; editing keeps its dates)
  const first = useRef(true)
  useEffect(() => {
    if (!first.current) return
    first.current = false
    if (from === to) syncTo(from, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, [])
  return (
    <div className="space-y-3">
      <Segmented label="วิธีเลือก" value={mode} onChange={(m) => { setMode(m); if (m === "sessions" && countOk) syncTo(from, count) }}
        options={[{ value: "sessions", label: "เลือกคาบ" }, { value: "dates", label: "ช่วงวันที่" }]} />
      {afterSwitch}
      {mode === "sessions" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="เริ่มลา *"><Input type="date" value={from} onChange={(e) => { onChange({ from: e.target.value }); if (countOk) syncTo(e.target.value, count) }} /></Field>
            <Field label="จำนวนคาบ *"><CountStepper className="w-full" value={countText} invalid={!countOk} onChange={(t) => { setCountText(t); const n = Number(t); if (Number.isInteger(n) && n >= 1 && n <= 60) syncTo(from, n) }} /></Field>
          </div>
          <PeriodNote date={from} />
          <SessionList sessions={run} more={countOk && run.length < count ? `มีคาบในตารางแค่ ${run.length} คาบ` : undefined}
            empty={countOk ? "ไม่มีคาบตั้งแต่วันนี้ — ใช้แบบ “ช่วงวันที่” แทน" : undefined} />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="เริ่มลา *"><Input type="date" value={from} onChange={(e) => onChange({ from: e.target.value })} /></Field>
            <Field label="ถึงวันที่ *"><Input type="date" value={to} onChange={(e) => onChange({ to: e.target.value })} /></Field>
          </div>
          <PeriodNote date={from} /><PeriodNote date={to} />
          {/* owner 2026-10-12: a date range also shows which sessions it covers — how many, which day, what time */}
          {from && to && from <= to && <SessionList sessions={inRange} empty="ไม่มีคาบในช่วงนี้" />}
        </>
      )}
      <Field label="หมายเหตุ (บังคับ) *">
        <Textarea rows={2} value={reason} onChange={(e) => onChange({ reason: e.target.value })} placeholder="เช่น ไปต่างประเทศ 2 สัปดาห์" />
      </Field>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

/** the sessions a long leave covers: count, day, time, subject — and the range it saves as */
function SessionList({ sessions, more, empty }: { sessions: Session[]; more?: string; empty?: string }) {
  if (!sessions.length) return empty ? <p className="text-xs text-muted-foreground">{empty}</p> : null
  return (
    <div className="rounded-xl bg-muted/40 p-2 text-xs">
      <p className="mb-1 font-medium">หยุด {sessions.length} คาบ · {fmtDate(sessions[0].date, { weekday: true })} – {fmtDate(sessions.at(-1)!.date, { weekday: true, year: true })}</p>
      <ul className="max-h-40 space-y-1 overflow-y-auto">
        {sessions.map((x) => <li key={x.id} className="flex justify-between"><span>{fmtDate(x.date, { weekday: true })} {x.start}–{endTime(x.start, x.minutes)} · {x.subject}</span><span className="text-success">ยืดวันจบ</span></li>)}
        {more && <li className="text-muted-foreground">{more}</li>}
      </ul>
    </div>
  )
}
