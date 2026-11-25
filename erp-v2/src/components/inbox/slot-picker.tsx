"use client"

import { useMemo, useState } from "react"
import { addDays, endTime, fmtDate, toDateStr } from "@/domain/dates"
import { commonSlots, findOfferSlots } from "@/domain/rules/forms"
import type { Branch, FormOfferSlot, Holiday, Klass, Session, Staff } from "@/domain/types"
import { cn } from "@/lib/utils"
import { Pill } from "../app/badges"
import { DateRangePicker } from "../app/date-range-picker"
import { NativeSelect } from "../app/native-select"
import { Label } from "../ui/label"
import { Button } from "@/components/ui/button"

/**
 * One subject + date-range + candidate-slot list. Agnostic to single vs multi select — the
 * caller decides by how it manages `selected` and `onToggle` (a Set that only ever holds one
 * slot for a single-select use like Edit, or grows freely for the multi-select send dialog).
 */
export function SlotPicker({
  branch, staff, sessions, classes, holidays, now,
  subject, onSubjectChange, subjectOptions,
  selected, onToggle, skipPeriods,
}: {
  branch: Branch; staff: Staff[]; sessions: Session[]; classes: Klass[]; holidays: Holiday[]; now: Date
  subject: string; onSubjectChange: (subject: string) => void; subjectOptions: string[]
  selected: Set<string>
  onToggle: (slot: FormOfferSlot) => void
  /** owner 2026-11-25: a Trial can't fall inside a Special Period */
  skipPeriods?: boolean
}) {
  const [from, setFrom] = useState(toDateStr(now))
  const [to, setTo] = useState(addDays(toDateStr(now), 14))

  const slots = useMemo(
    () => findOfferSlots({ branch, staff, sessions, classes, holidays, subject, from, to, now, skipPeriods }),
    [branch, staff, sessions, classes, holidays, subject, from, to, now, skipPeriods],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, FormOfferSlot[]>()
    const ordered = slots.toSorted((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    ordered.forEach((s) => map.set(s.date, [...(map.get(s.date) ?? []), s]))
    return [...map.entries()]
  }, [slots])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1.4fr] gap-2">
        <div>
          <Label className="mb-1 text-xs">วิชา</Label>
          <NativeSelect value={subject} onChange={(e) => onSubjectChange(e.target.value)} options={subjectOptions.map((s) => ({ value: s, label: s }))} />
        </div>
        <div>
          <Label className="mb-1 text-xs">ช่วงวันที่</Label>
          {/* owner 2026-11-06: one range control, not a start and an end field */}
          <DateRangePicker plain from={from} to={to} className="w-full justify-start" onChange={(r) => { setFrom(r.from); setTo(r.to) }} />
        </div>
      </div>

      {slots.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีช่วงเวลาว่างในช่วงที่เลือก — ลองขยายวันที่</p>}

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {grouped.map(([date, daySlots]) => (
          <div key={date}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{fmtDate(date, { weekday: true })}</p>
            <div className="flex flex-wrap gap-1.5">
              {daySlots.map((slot) => {
                const active = selected.has(slot.id)
                return (
                  <Button variant="ghost" size="inline"
                    key={slot.id}
                    type="button"
                    onClick={() => onToggle(slot)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    {slot.start}
                    {slot.source === "class" ? (
                      <Pill tone={slot.teacherId ? "special" : "amber"} className="px-1.5 py-0 text-2xs">
                        {classes.find((k) => k.id === slot.classId)?.name ?? "คลาสเดิม"} · {staff.find((t) => t.id === slot.teacherId)?.nickname ?? "ยังไม่มีครู"}
                      </Pill>
                    ) : (
                      <Pill tone="gray" className="px-1.5 py-0 text-2xs" title={slot.fits2h === false ? "ต่อเป็น 2 ชม. ไม่ได้ (ครู/ห้องไม่ว่างชั่วโมงถัดไป หรือใกล้เวลาปิด) — ใช้ได้เฉพาะวิชาเดียว" : undefined}>
                        {slot.fits2h === false ? "ว่าง · 1 ชม." : "ว่าง"}
                      </Pill>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


/** Move every subject of a one-visit form TOGETHER (owner 2026-11-18): only dates + times where all of them are free at once —
 *  the same list the parent was offered. Picking one gives each subject its own part of that visit. */
export function VisitPicker({ branch, staff, sessions, classes, holidays, now, subjects, selectedKey, onPick }: {
  branch: Branch; staff: Staff[]; sessions: Session[]; classes: Klass[]; holidays: Holiday[]; now: Date
  subjects: string[]; selectedKey: string | null; onPick: (key: string, bySubject: Record<string, FormOfferSlot>) => void
}) {
  const [from, setFrom] = useState(toDateStr(now))
  const [to, setTo] = useState(addDays(toDateStr(now), 14))
  const times = useMemo(() => {
    const offers = subjects.map((subject) => ({ subject, slots: findOfferSlots({ branch, staff, sessions, classes, holidays, subject, from, to, now }) }))
    return commonSlots(offers, subjects)
  }, [subjects, branch, staff, sessions, classes, holidays, from, to, now])
  const grouped = useMemo(() => {
    const map = new Map<string, typeof times>()
    times.forEach((x) => map.set(x.date, [...(map.get(x.date) ?? []), x]))
    return [...map.entries()]
  }, [times])
  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-1 text-xs">ช่วงวันที่</Label>
        <DateRangePicker plain from={from} to={to} className="w-full justify-start" onChange={(r) => { setFrom(r.from); setTo(r.to) }} />
      </div>
      <p className="text-xs text-muted-foreground">{subjects.join(" + ")}</p>
      {times.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีเวลาที่ว่างพร้อมกันทุกวิชาในช่วงที่เลือก — ลองขยายวันที่ หรือแก้แยกวิชา</p>}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {grouped.map(([date, day]) => (
          <div key={date}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{fmtDate(date, { weekday: true })}</p>
            <div className="flex flex-wrap gap-1.5">
              {day.map((x) => {
                const key = `${x.date} ${x.start}`
                const active = selectedKey === key
                return (
                  <Button variant="ghost" size="inline" key={key} type="button" onClick={() => onPick(key, x.bySubject)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors", active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                    {x.start}–{endTime(x.start, x.minutes)}
                  </Button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
