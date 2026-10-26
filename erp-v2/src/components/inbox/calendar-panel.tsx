"use client"

import { useMemo, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, CornerDownLeftIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/app/date-range-picker"
import { subjectHex } from "@/components/app/subject-color"
import { addDays, fmtDate, fromMinutes, toDateStr, toMinutes } from "@/domain/dates"
import { findOfferSlots, freeTimesReply } from "@/domain/rules/forms"
import { classCapacity } from "@/domain/rules/scheduling"
import type { ID } from "@/domain/types"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { SlotDays } from "./send-form-dialog"

/**
 * Calendar Preview beside the chat (owner 2026-10-22: "แผงข้างแชท + หาเวลาว่าง") — answering "ว่างวันไหนคะ" without
 * leaving the chat. หาเวลาว่าง: pick a subject → the free hours (a qualified teacher + a room, same engine as the
 * Test / Trial form) and real classes with a seat → tick times → they go into the reply box as text.
 * ตารางสัปดาห์: the branch's week of sessions, to look at.
 */
export function CalendarPanel({ branchId, subject: initialSubject, onInsert, onClose }: { branchId: ID; subject?: string; onInsert: (text: string) => void; onClose: () => void }) {
  const branch = useStore((s) => s.branches.find((b) => b.id === branchId))!
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const courses = useStore((s) => s.courses)
  const now = useNow(60_000)
  const today = toDateStr(now)
  const [tab, setTab] = useState<"free" | "week">("free")
  const [subject, setSubject] = useState(initialSubject && branch.subjects.includes(initialSubject) ? initialSubject : branch.subjects[0] ?? "")
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(addDays(today, 7))
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const slots = useMemo(() => (subject ? findOfferSlots({ branch, staff, sessions, classes, holidays, subject, from, to, now, courses }) : []), [branch, staff, sessions, classes, holidays, subject, from, to, now, courses])
  const items = slots.map((x) => ({
    key: x.id, date: x.date, start: x.start, end: fromMinutes(toMinutes(x.start) + x.minutes), kind: x.source === "class" ? "class" as const : "free" as const,
    label: x.source === "class" ? classes.find((k) => k.id === x.classId)?.name ?? "คลาสเดิม" : undefined,
  }))
  const chosen = items.filter((x) => picked.has(x.key))
  const toggle = (key: string) => setPicked((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n })

  return (
    <aside className="flex w-[25rem] shrink-0 flex-col border-l bg-background">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <div className="flex rounded-full bg-muted p-0.5 text-sm">
          {([["free", "หาเวลาว่าง"], ["week", "ตารางสัปดาห์"]] as const).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setTab(v)} className={cn("rounded-full px-3 py-1", tab === v ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{label}</button>
          ))}
        </div>
        <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="ปิด" onClick={onClose}><XIcon /></Button>
      </div>

      {tab === "free" ? (
        <>
          <div className="space-y-2 border-b px-3 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {branch.subjects.map((s) => (
                <button key={s} type="button" onClick={() => { setSubject(s); setPicked(new Set()) }}
                  className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm", subject === s ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60")}>
                  <span className="size-2 rounded-full" style={{ background: subjectHex(s) }} />{s}
                </button>
              ))}
            </div>
            <DateRangePicker plain from={from} to={to} min={today} onChange={(r) => { setFrom(r.from); setTo(r.to); setPicked(new Set()) }} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <SlotDays tall title={subject} color={subjectHex(subject)} items={items} picked={picked} onToggle={toggle} empty="ไม่มีเวลาว่างในช่วงนี้ — ลองขยายช่วงวันที่" />
          </div>
          {/* the bottom bar carries the one action (panel standard): put the ticked times into the reply box */}
          <div className="flex items-center gap-2 border-t px-3 py-2.5">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">{chosen.length ? `เลือก ${chosen.length} ช่วงเวลา` : "กดเลือกเวลาที่จะเสนอ"}</p>
            {chosen.length > 0 && <Button size="sm" variant="ghost" onClick={() => setPicked(new Set())}>ล้าง</Button>}
            <Button size="sm" disabled={!chosen.length} onClick={() => { onInsert(freeTimesReply(subject, chosen)); setPicked(new Set()) }}><CornerDownLeftIcon /> ใส่ในข้อความ</Button>
          </div>
        </>
      ) : (
        <WeekView branchId={branchId} today={today} />
      )}
    </aside>
  )
}

function WeekView({ branchId, today }: { branchId: ID; today: string }) {
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  // weeks start on Monday everywhere (E7)
  const monday = (d: string) => addDays(d, -((new Date(`${d}T00:00:00`).getDay() + 6) % 7))
  const [week, setWeek] = useState(monday(today))
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))
  const byDay = useMemo(() => {
    const end = addDays(week, 6)
    const list = sessions.filter((s) => s.branchId === branchId && !s.cancelled && s.date >= week && s.date <= end).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    return new Map(days.map((d) => [d, list.filter((s) => s.date === d)]))
  }, [sessions, branchId, week]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <Button size="icon-sm" variant="ghost" aria-label="สัปดาห์ก่อน" onClick={() => setWeek(addDays(week, -7))}><ChevronLeftIcon /></Button>
        <p className="flex-1 text-center text-sm font-medium">{fmtDate(week)} – {fmtDate(addDays(week, 6))}</p>
        <Button size="icon-sm" variant="ghost" aria-label="สัปดาห์ถัดไป" onClick={() => setWeek(addDays(week, 7))}><ChevronRightIcon /></Button>
        {week !== monday(today) && <Button size="sm" variant="outline" onClick={() => setWeek(monday(today))}>สัปดาห์นี้</Button>}
      </div>
      <div className="min-h-0 flex-1 divide-y overflow-y-auto">
        {days.map((d) => {
          const list = byDay.get(d) ?? []
          return (
            <div key={d} className={cn("px-3 py-2.5", d < today && "opacity-60")}>
              <p className={cn("mb-1.5 text-xs font-medium", d === today ? "text-primary" : "text-muted-foreground")}>{fmtDate(d, { weekday: true })}{d === today && " · วันนี้"}</p>
              {!list.length ? <p className="text-xs text-muted-foreground">ไม่มีคาบ</p> : (
                <ul className="space-y-1">
                  {list.map((s) => {
                    const k = classes.find((c) => c.id === s.classId)
                    const cap = classCapacity(k)
                    return (
                      <li key={s.id} className="flex items-center gap-2 text-xs">
                        <span className="w-[5.5rem] shrink-0 tabular-nums">{s.start}–{fromMinutes(toMinutes(s.start) + s.minutes)}</span>
                        <span className="size-2 shrink-0 rounded-full" style={{ background: subjectHex(s.subject) }} />
                        <span className="min-w-0 flex-1 truncate">{k?.name ?? s.subject}{s.trial && " (ทดลอง)"} · {staff.find((t) => t.id === s.teacherId)?.nickname ?? "ยังไม่มีครู"}</span>
                        <span className={cn("shrink-0 tabular-nums", s.studentIds.length >= cap ? "text-muted-foreground" : "text-emerald-700 dark:text-emerald-300")}>{s.studentIds.length}/{cap}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
