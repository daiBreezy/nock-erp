"use client"

import { useState } from "react"
import { AlertTriangleIcon, PlusIcon, UsersRoundIcon } from "lucide-react"
import { avatarTone, initial, subjectColor } from "@/components/app/subject-color"
import { endTime, fromMinutes, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import { isHoliday } from "@/domain/rules/scheduling"
import type { DateStr, Session } from "@/domain/types"
import { useBranch, useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import type { ClassPrefill } from "@/components/app/class-dialog"
import type { MoveTarget } from "@/domain/rules/scheduling"
import { ClassCard, type CardData } from "./class-card"

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
  date, sessions, laneMode, canCreate, onSlot, onMove, d, onlyBooked = false,
}: {
  date: DateStr
  sessions: Session[]
  laneMode: "teacher" | "room"
  /** hide free hours, idle teachers/rooms and empty slots */
  onlyBooked?: boolean
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
  const allLanes: Lane[] =
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

  const lanes = onlyBooked ? allLanes.filter((l) => day.some((x) => l.primary(x) || l.assist(x))) : allLanes

  const startMin = Math.min(hours ? toMinutes(hours.open) : 9 * 60, ...day.map((s) => toMinutes(s.start)))
  const endMin = Math.max(hours ? toMinutes(hours.close) : 20 * 60, ...day.map((s) => toMinutes(s.start) + s.minutes))
  const hourList = Array.from({ length: Math.ceil(endMin / 60) - Math.floor(startMin / 60) }, (_, i) => Math.floor(startMin / 60) + i)
  const cols = `64px repeat(${lanes.length}, minmax(300px, 1fr))`

  const firstHour = Math.floor(startMin / 60)
  const rowOf = (min: number) => Math.floor(min / 60) - firstHour
  const span = (x: Session) => {
    const a = toMinutes(x.start)
    return [rowOf(a), Math.max(rowOf(a) + 1, Math.ceil((a + x.minutes) / 60) - firstHour)] as const // [first row, end row exclusive]
  }
  const nowMin = d.now.getHours() * 60 + d.now.getMinutes()
  const today = toDateStr(d.now)
  const isToday = date === today

  // Per lane: group items whose hour rows touch into one block, so every class is ONE card spanning its real length.
  type Item = { s: Session; assist: boolean }
  type Block = { lane: number; from: number; to: number; items: Item[] }
  const blocks: Block[] = []
  lanes.forEach((l, li) => {
    const items: Item[] = day
      .filter((x) => l.primary(x) || l.assist(x))
      .map((x) => ({ s: x, assist: !l.primary(x) }))
      .sort((a, b) => a.s.start.localeCompare(b.s.start))
    for (const it of items) {
      const [f, t] = span(it.s)
      const last = blocks.findLast((b) => b.lane === li)
      if (last && f < last.to) {
        last.items.push(it)
        last.to = Math.max(last.to, t)
      } else blocks.push({ lane: li, from: f, to: t, items: [it] })
    }
  })
  const covered = (li: number, r: number) => blocks.some((b) => b.lane === li && r >= b.from && r < b.to)
  const rowBusy = hourList.map((_, r) => lanes.some((_, li) => covered(li, r)))
  // visible rows → display position (compact mode drops free hours entirely)
  const shownRows = hourList.map((_, r) => r).filter((r) => !onlyBooked || rowBusy[r])
  const disp = new Map(shownRows.map((r, i) => [r, i + 1]))
  const gapBefore = (r: number) => onlyBooked && disp.get(r)! > 1 && !disp.has(r - 1)
  const gridRows = shownRows.map((r) => (rowBusy[r] ? "minmax(4rem, auto)" : "2rem")).join(" ") || "4rem"

  const dropProps = (key: string, start: (id: string) => string, target: Lane["target"], enabled: boolean) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!enabled || !e.dataTransfer.types.includes("text/session")) return
      e.preventDefault()
      setOver(key)
    },
    onDragLeave: () => setOver((o) => (o === key ? null : o)),
    onDrop: (e: React.DragEvent) => {
      setOver(null)
      const id = e.dataTransfer.getData("text/session")
      if (id && enabled) onMove(id, { date, start: start(id), ...target })
    },
  })
  const keepMinute = (h: number) => (id: string) => {
    const src = sessions.find((x) => x.id === id)
    return fromMinutes(h * 60 + (src ? toMinutes(src.start) % 60 : 0))
  }
  const isClosed = (h: number) => !hours || h * 60 < toMinutes(hours.open) || h * 60 >= toMinutes(hours.close) || !!holiday
  const live = (x: Session) => !x.cancelled
  const overlapsInTime = (a: Session, b: Session) => {
    const [as, bs] = [toMinutes(a.start), toMinutes(b.start)]
    return as < bs + b.minutes && bs < as + a.minutes
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* one scroll box: teacher header sticks to the top (scrolls sideways), time column sticks to the left (scrolls vertically) */}
      <div className="max-h-[calc(100dvh-15rem)] min-h-96 overflow-auto overscroll-contain">
      <div className="min-w-fit">
        {/* lane headers */}
        <div className="sticky top-0 z-20 grid border-b bg-card shadow-[0_1px_0_var(--border)]" style={{ gridTemplateColumns: cols }}>
          <div className="sticky left-0 z-30 bg-card" />
          {lanes.map((l) => {
            const n = day.filter((x) => l.primary(x) && !x.cancelled).length
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

        {onlyBooked && blocks.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">วันนี้ไม่มีคลาส</p>}
        <div className="grid" style={{ gridTemplateColumns: cols, gridTemplateRows: gridRows }}>
          {/* row backgrounds + hour labels */}
          {hourList.map((h, r) =>
            disp.has(r) ? (
              <div key={`bg${h}`} className={cn("border-b", isClosed(h) && "bg-muted/40", gapBefore(r) && "border-t-4 border-t-muted")} style={{ gridRow: disp.get(r), gridColumn: "1 / -1" }} />
            ) : null,
          )}
          {hourList.map((h, r) => !disp.has(r) ? null : (
            <div key={`t${h}`} className="sticky left-0 z-[6] border-r border-b bg-card px-2 py-1.5 text-right text-xs font-medium tabular-nums text-muted-foreground" style={{ gridRow: disp.get(r), gridColumn: 1 }}>
              {fromMinutes(h * 60)}
            </div>
          ))}
          {lanes.map((l, li) => (
            <div key={`line${l.key}`} className="border-l" style={{ gridRow: `1 / ${shownRows.length + 1}`, gridColumn: li + 2 }} />
          ))}

          {/* empty cells: click to create, drop to move */}
          {lanes.flatMap((l, li) =>
            hourList.map((h, r) => {
              if (covered(li, r) || !disp.has(r)) return null
              const key = `${l.key}@${h}`
              const closed = isClosed(h)
              const past = isToday ? (h + 1) * 60 <= nowMin : date < today
              return (
                <div key={key} className={cn("group/cell relative", over === key && "bg-primary/10 ring-2 ring-primary ring-inset")} style={{ gridRow: disp.get(r), gridColumn: li + 2 }} {...dropProps(key, keepMinute(h), l.target, !closed)}>
                  {canCreate && !closed && !past && !onlyBooked && (
                    <button
                      onClick={() => onSlot({ date, start: fromMinutes(h * 60), ...(laneMode === "teacher" ? { teacherId: l.target.teacherId ?? null } : { roomId: l.target.roomId ?? null }) })}
                      className="absolute inset-1 flex items-center justify-center gap-1 rounded-lg border border-dashed border-transparent text-xs text-muted-foreground opacity-0 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:opacity-100"
                    >
                      <PlusIcon className="size-3.5" /> สร้างคลาส {fromMinutes(h * 60)}
                    </button>
                  )}
                </div>
              )
            }),
          )}

          {/* class blocks: one card per class, spanning all hours it runs */}
          {blocks.map((b) => {
            const l = lanes[b.lane]
            const own = b.items.filter((i) => !i.assist && live(i.s))
            const busy = b.items.filter((i) => live(i.s))
            const clash = busy.some((a, i) => busy.some((c, j) => j > i && overlapsInTime(a.s, c.s)))
            const key = `${l.key}@block${b.from}`
            const h = hourList[b.from]
            return (
              <div
                key={key}
                style={{ gridRow: `${disp.get(b.from)} / ${disp.get(b.to - 1)! + 1}`, gridColumn: b.lane + 2 }}
                className={cn("relative z-[1] flex flex-col gap-1.5 p-1.5", clash && "m-0.5 rounded-lg bg-red-50 ring-2 ring-red-500 dark:bg-red-950/30", over === key && "ring-2 ring-primary")}
                {...dropProps(key, keepMinute(h), l.target, !isClosed(h))}
              >
                {clash && (
                  <div className="flex items-center gap-1 px-1 text-[11px] font-semibold text-red-700">
                    <AlertTriangleIcon className="size-3" /> ชนกัน {busy.length} คาบ{own.length < busy.length ? " (รวมคาบที่ช่วยสอน)" : ""}ในช่อง{laneMode === "teacher" ? "ครู" : "ห้อง"}นี้
                  </div>
                )}
                {b.items.map((i) =>
                  i.assist ? (
                    <AssistBlock key={i.s.id} s={i.s} d={d} teacher={l.title} />
                  ) : (
                    <ClassCard key={i.s.id} s={i.s} d={d} />
                  ),
                )}
              </div>
            )
          })}

          {/* now line */}
          {isToday && nowMin >= firstHour * 60 && disp.has(rowOf(nowMin)) && (
            <div className="pointer-events-none relative z-[5]" style={{ gridRow: disp.get(rowOf(nowMin)), gridColumn: "1 / -1" }}>
              <div className="absolute inset-x-0 border-t-2 border-red-500" style={{ top: `${((nowMin % 60) / 60) * 100}%` }}>
                <span className="absolute -top-1 left-14 size-2 rounded-full bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
        <span>การ์ดยาวตามเวลาเรียนจริง</span>
        <span>แถบลายทาง = ครูคนนี้ไปช่วยสอนคลาสของครูอื่น</span>
        <span>ลากการ์ดไปช่องอื่นเพื่อย้ายเวลา/ครู/ห้อง · คลิกช่องว่างเพื่อสร้างคลาส</span>
      </div>
    </div>
  )
}

/** Co-teacher lane: shows the teacher is busy, clearly NOT a separate class */
function AssistBlock({ s, d, teacher }: { s: Session; d: CardData; teacher: string }) {
  const L = useLookup()
  const c = subjectColor(s.subject)
  const klass = d.classes.find((k) => k.id === s.classId)
  return (
    <button
      onClick={() => d.onOpen(s.id)}
      className={cn(
        "rounded-xl border border-dashed p-2.5 text-left text-xs",
        "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(0_0_0/0.04)_6px,rgb(0_0_0/0.04)_12px)]",
        d.dim(s) && "opacity-25",
      )}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <UsersRoundIcon className="size-3.5 text-muted-foreground" />
        {teacher} ช่วยสอน
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={cn("size-2 shrink-0 rounded-full", c.bar)} />
        <span className={cn("truncate font-semibold", c.text)}>{klass?.name ?? s.subject}</span>
      </div>
      <div className="text-muted-foreground">
        {s.start}–{endTime(s.start, s.minutes)} · ครูหลัก {L.teacher(s.teacherId).label} · {L.room(s.roomId)}
      </div>
    </button>
  )
}
