"use client"

import { useState } from "react"
import { AlertTriangleIcon, PlusIcon } from "lucide-react"
import { avatarTone, initial } from "@/components/app/subject-color"
import { endTime, fromMinutes, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import { isHoliday } from "@/domain/rules/scheduling"
import type { DateStr, Session } from "@/domain/types"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import type { ClassPrefill } from "@/components/app/class-dialog"
import type { MoveTarget } from "@/domain/rules/scheduling"
import { ClassCard, MiniCard, type CardData } from "./class-card"

interface Lane {
  key: string
  title: string
  subtitle: string
  warn?: boolean
  primary: (s: Session) => boolean
  assist: (s: Session) => boolean
  target: Pick<MoveTarget, "teacherId" | "roomId">
}

/**
 * Day board (admin view): columns = teachers (or rooms), rows = hours.
 * Hours with no classes collapse, every card lists its students, clashes stack inside one red cell.
 */
export function DayBoard({
  date, sessions, laneMode, canCreate, onSlot, onMove, d,
}: {
  date: DateStr
  sessions: Session[]
  laneMode: "teacher" | "room"
  canCreate: boolean
  onSlot: (p: ClassPrefill) => void
  onMove: (sessionId: string, target: MoveTarget) => void
  d: CardData
}) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const [over, setOver] = useState<string | null>(null)
  const day = sessions.filter((s) => s.date === date)
  const holiday = isHoliday(date, branch.id, holidays)
  const hours = branch.hours[weekdayOf(date)]

  const knownTeacher = (id: string | null) => !!id && staff.some((t) => t.id === id && t.branchIds.includes(branch.id))
  const lanes: Lane[] =
    laneMode === "teacher"
      ? [
          ...staff
            .filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id) && (t.active || day.some((s) => s.teacherId === t.id)))
            .map((t) => ({
              key: t.id,
              title: t.active ? t.nickname : `${t.nickname} (ออกแล้ว)`,
              subtitle: t.subjects.join(", "),
              warn: !t.active,
              primary: (s: Session) => s.teacherId === t.id,
              assist: (s: Session) => s.coTeacherIds.includes(t.id),
              target: { teacherId: t.id },
            })),
          { key: "none", title: "ยังไม่มีครู", subtitle: "ต้องจัดครู", warn: true, primary: (s: Session) => !knownTeacher(s.teacherId), assist: () => false, target: { teacherId: null } },
        ]
      : [
          ...branch.rooms.map((r) => ({ key: r.id, title: r.name, subtitle: "ห้องเรียน", primary: (s: Session) => s.roomId === r.id, assist: () => false, target: { roomId: r.id } })),
          { key: "none", title: "ยังไม่ระบุห้อง", subtitle: "ต้องจัดห้อง", warn: true, primary: (s: Session) => !s.roomId || !branch.rooms.some((r) => r.id === s.roomId), assist: () => false, target: { roomId: null } },
        ]

  const startMin = Math.min(hours ? toMinutes(hours.open) : 9 * 60, ...day.map((s) => toMinutes(s.start)))
  const endMin = Math.max(hours ? toMinutes(hours.close) : 20 * 60, ...day.map((s) => toMinutes(s.start) + s.minutes))
  const hourList = Array.from({ length: Math.ceil(endMin / 60) - Math.floor(startMin / 60) }, (_, i) => Math.floor(startMin / 60) + i)
  const cols = `64px repeat(${lanes.length}, minmax(300px, 1fr))`

  const cell = (lane: Lane, h: number) => {
    const inHour = (s: Session) => Math.floor(toMinutes(s.start) / 60) === h
    const starting = day.filter((s) => lane.primary(s) && inHour(s)).sort((a, b) => a.start.localeCompare(b.start))
    const continuing = day.filter((s) => lane.primary(s) && toMinutes(s.start) < h * 60 && toMinutes(s.start) + s.minutes > h * 60)
    const assisting = day.filter((s) => lane.assist(s) && inHour(s))
    return { starting, continuing, assisting, empty: !starting.length && !continuing.length && !assisting.length }
  }
  const nowMin = d.now.getHours() * 60 + d.now.getMinutes()
  const today = toDateStr(d.now)
  const isToday = date === today

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="min-w-fit">
        {/* lane headers */}
        <div className="sticky top-0 z-10 grid border-b bg-card" style={{ gridTemplateColumns: cols }}>
          <div />
          {lanes.map((l) => {
            const n = day.filter((s) => l.primary(s) && !s.cancelled).length
            return (
              <div key={l.key} className="flex items-center gap-2.5 border-l px-3 py-2.5">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", l.warn ? "bg-amber-100 text-amber-800" : avatarTone(l.key))}>
                  {l.key === "none" ? "?" : initial(l.title)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className={cn("truncate text-sm font-semibold", l.warn && "text-amber-800")}>{l.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{l.subtitle}</div>
                </div>
                <span className="grid min-w-6 place-items-center rounded-full bg-muted px-1.5 text-xs font-semibold">{n}</span>
              </div>
            )
          })}
        </div>

        {holiday && <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-900">วันหยุด: {holiday.name}</div>}
        {!hours && !holiday && <div className="border-b bg-muted px-4 py-2 text-sm text-muted-foreground">สาขาปิดวันนี้</div>}

        {hourList.map((h) => {
          const rows = lanes.map((l) => cell(l, h))
          const emptyRow = rows.every((r) => r.empty)
          const closed = !hours || h * 60 < toMinutes(hours.open) || h * 60 >= toMinutes(hours.close) || !!holiday
          const past = isToday ? (h + 1) * 60 <= nowMin : date < today
          const nowLine = isToday && Math.floor(nowMin / 60) === h
          return (
            <div key={h} className={cn("relative grid border-b last:border-0", closed && "bg-muted/40")} style={{ gridTemplateColumns: cols }}>
              <div className={cn("px-2 py-2 text-right text-xs font-medium tabular-nums text-muted-foreground", emptyRow && "py-1.5")}>{fromMinutes(h * 60)}</div>
              {lanes.map((l, i) => {
                const { starting, continuing, assisting, empty } = rows[i]
                const key = `${l.key}@${h}`
                // a clash starts in this hour; rows that only continue earlier clashes stay calm
                const live = (x: Session) => !x.cancelled
                const clash = starting.filter(live).length > 1 || (starting.some(live) && continuing.some(live))
                const canDropHere = !closed
                return (
                  <div
                    key={l.key}
                    onDragOver={(e) => {
                      if (!canDropHere || !e.dataTransfer.types.includes("text/session")) return
                      e.preventDefault()
                      setOver(key)
                    }}
                    onDragLeave={() => setOver((o) => (o === key ? null : o))}
                    onDrop={(e) => {
                      setOver(null)
                      const id = e.dataTransfer.getData("text/session")
                      const src = sessions.find((s) => s.id === id)
                      if (!id || !canDropHere) return
                      const minute = src ? toMinutes(src.start) % 60 : 0
                      onMove(id, { date, start: fromMinutes(h * 60 + minute), ...l.target })
                    }}
                    className={cn(
                      "group/cell relative space-y-1.5 border-l p-1.5",
                      emptyRow ? "min-h-8" : "min-h-16",
                      clash && "bg-red-50 ring-2 ring-red-500 ring-inset dark:bg-red-950/30",
                      over === key && "bg-primary/10 ring-2 ring-primary ring-inset",
                    )}
                  >
                    {clash && (
                      <div className="flex items-center gap-1 px-1 text-[11px] font-semibold text-red-700">
                        <AlertTriangleIcon className="size-3" /> ชนกัน {[...starting, ...continuing].filter(live).length} คาบในช่อง{laneMode === "teacher" ? "ครู" : "ห้อง"}นี้
                      </div>
                    )}
                    {continuing.map((s) => <MiniCard key={s.id} s={s} d={d} label={`ต่อถึง ${endTime(s.start, s.minutes)}`} />)}
                    {starting.map((s) => <ClassCard key={s.id} s={s} d={d} />)}
                    {assisting.map((s) => <MiniCard key={s.id} s={s} d={d} label={`ช่วยสอน ${s.start}`} />)}
                    {empty && canCreate && !closed && !past && (
                      <button
                        onClick={() => onSlot({ date, start: fromMinutes(h * 60), ...(laneMode === "teacher" ? { teacherId: l.target.teacherId ?? null } : { roomId: l.target.roomId ?? null }) })}
                        className={cn(
                          "absolute inset-1 flex items-center justify-center gap-1 rounded-lg border border-dashed border-transparent text-xs text-muted-foreground opacity-0 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:opacity-100",
                          over === key && "opacity-100",
                        )}
                      >
                        <PlusIcon className="size-3.5" /> สร้างคลาส {fromMinutes(h * 60)}
                      </button>
                    )}
                  </div>
                )
              })}
              {nowLine && <div className="pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-red-500" style={{ top: `${((nowMin % 60) / 60) * 100}%` }}><span className="absolute -top-1 left-14 size-2 rounded-full bg-red-500" /></div>}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
        <span>ลากการ์ดไปช่องอื่นเพื่อย้ายเวลา/ครู/ห้อง</span>
        <span>คลิกช่องว่างเพื่อสร้างคลาส</span>
        <span>ชั่วโมงที่ไม่มีคลาสจะย่อลง</span>
      </div>
    </div>
  )
}
