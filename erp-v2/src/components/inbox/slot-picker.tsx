"use client"

import { useMemo, useState } from "react"
import { addDays, fmtDate, toDateStr } from "@/domain/dates"
import { findOfferSlots } from "@/domain/rules/forms"
import type { Branch, FormOfferSlot, Holiday, Klass, Session, Staff } from "@/domain/types"
import { cn } from "@/lib/utils"
import { Pill } from "../app/badges"
import { NativeSelect } from "../app/native-select"
import { Label } from "../ui/label"

/**
 * One subject + date-range + candidate-slot list. Agnostic to single vs multi select — the
 * caller decides by how it manages `selected` and `onToggle` (a Set that only ever holds one
 * slot for a single-select use like Edit, or grows freely for the multi-select send dialog).
 */
export function SlotPicker({
  branch, staff, sessions, classes, holidays, now,
  subject, onSubjectChange, subjectOptions,
  selected, onToggle,
}: {
  branch: Branch; staff: Staff[]; sessions: Session[]; classes: Klass[]; holidays: Holiday[]; now: Date
  subject: string; onSubjectChange: (subject: string) => void; subjectOptions: string[]
  selected: Set<string>
  onToggle: (slot: FormOfferSlot) => void
}) {
  const [from, setFrom] = useState(toDateStr(now))
  const [to, setTo] = useState(addDays(toDateStr(now), 14))

  const slots = useMemo(
    () => findOfferSlots({ branch, staff, sessions, classes, holidays, subject, from, to, now }),
    [branch, staff, sessions, classes, holidays, subject, from, to, now],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, FormOfferSlot[]>()
    slots.forEach((s) => map.set(s.date, [...(map.get(s.date) ?? []), s]))
    return [...map.entries()]
  }, [slots])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="mb-1 text-xs">วิชา</Label>
          <NativeSelect value={subject} onChange={(e) => onSubjectChange(e.target.value)} options={subjectOptions.map((s) => ({ value: s, label: s }))} />
        </div>
        <div>
          <Label className="mb-1 text-xs">จากวันที่</Label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-full rounded-3xl border bg-input/50 px-3 text-sm" />
        </div>
        <div>
          <Label className="mb-1 text-xs">ถึงวันที่</Label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-full rounded-3xl border bg-input/50 px-3 text-sm" />
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
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onToggle(slot)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                    )}
                  >
                    {slot.start}
                    <Pill tone={slot.source === "class" ? "violet" : "gray"} className="px-1.5 py-0 text-[10px]">
                      {slot.source === "class" ? "คลาสเดิม" : "ทั่วไป"}
                    </Pill>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
