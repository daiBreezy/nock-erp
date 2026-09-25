"use client"

import { AlertTriangleIcon, CheckIcon, DoorOpenIcon, GripVerticalIcon, NotebookPenIcon, StarIcon, UsersIcon, XIcon } from "lucide-react"
import { avatarTone, gradeTone, initial, subjectColor } from "@/components/app/subject-color"
import { WorkChip } from "@/components/app/work-state"
import { endTime } from "@/domain/dates"
import { activeLeave } from "@/domain/rules/attendance"
import { CAPACITY, workState } from "@/domain/rules/scheduling"
import type { Attendance, Klass, LessonSummary, Session, Staff, StudentLeave } from "@/domain/types"
import { useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"

export interface CardData {
  now: Date
  attendance: Attendance[]
  summaries: LessonSummary[]
  classes: Klass[]
  staff: Staff[]
  leaves: StudentLeave[]
  conflictMsg: Map<string, string[]>
  dim: (s: Session) => boolean
  draggable: (s: Session) => boolean
  onOpen: (id: string) => void
}

/** Day-view class card: who is in the room, at a glance (admin request, ref. Figma Day view). */
export function ClassCard({ s, d }: { s: Session; d: CardData }) {
  const L = useLookup()
  const c = subjectColor(s.subject)
  const w = workState(s, d.now, d.attendance, d.summaries)
  const klass = d.classes.find((k) => k.id === s.classId)
  const cap = klass ? CAPACITY[klass.type] : s.trial ? 1 : CAPACITY.group
  const live = w.state === "live"
  const conflicts = d.conflictMsg.get(s.id)
  const canDrag = d.draggable(s)
  const teachers = [s.teacherId, ...s.coTeacherIds].filter(Boolean) as string[]

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/session", s.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      onClick={() => d.onOpen(s.id)}
      className={cn(
        "group/card relative cursor-pointer overflow-hidden rounded-xl border text-left shadow-sm transition hover:shadow-md",
        live ? c.strong : c.soft,
        w.state === "done" && "opacity-60 saturate-50",
        w.state === "cancelled" && "opacity-50 grayscale",
        w.state === "needs_attendance" && "ring-2 ring-red-500",
        w.state === "needs_summary" && "ring-2 ring-amber-400",
        conflicts && "outline-2 outline-offset-1 outline-red-600 outline-dashed",
        d.dim(s) && "opacity-25",
        canDrag && "active:cursor-grabbing",
      )}
    >
      {!live && <span className={cn("absolute inset-y-0 left-0 w-1.5", c.bar)} />}
      <div className="py-2 pr-2.5 pl-3.5">
        <div className="flex items-start gap-1.5">
          {canDrag && <GripVerticalIcon className="-ml-2 mt-0.5 size-3.5 shrink-0 opacity-0 transition group-hover/card:opacity-50" />}
          <div className="min-w-0 flex-1">
            <div className={cn("truncate text-sm font-semibold", !live && c.text, w.state === "cancelled" && "line-through")}>
              {klass?.name ?? s.subject}
              {s.trial && <span className="ml-1.5 rounded bg-violet-600 px-1 py-px text-[10px] font-medium text-white">ทดลองเรียน</span>}
            </div>
            <div className={cn("text-xs tabular-nums", live ? "text-white/80" : "text-muted-foreground")}>
              {s.start}–{endTime(s.start, s.minutes)} · {s.minutes} นาที
            </div>
          </div>
          <WorkChip w={w} students={s.studentIds.length} />
        </div>

        <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs", live ? "text-white/85" : "text-muted-foreground")}>
          <span className="inline-flex items-center gap-1"><DoorOpenIcon className="size-3.5" />{L.room(s.roomId)}</span>
          <span className={cn("inline-flex items-center gap-1", s.studentIds.length > cap && "font-semibold text-red-600")}><UsersIcon className="size-3.5" />{s.studentIds.length}/{cap}</span>
          {teachers.length === 0 && <span className="font-medium text-amber-700">ยังไม่มีครู</span>}
          {teachers.map((t, i) => (
            <span key={t} className="inline-flex items-center gap-0.5">
              {i === 0 && <StarIcon className="size-3 fill-current" />}
              {L.teacher(t).label}
            </span>
          ))}
        </div>

        {conflicts && (
          <ul className="mt-1.5 space-y-0.5 rounded-md bg-red-600 px-1.5 py-1 text-[11px] font-medium text-white">
            {conflicts.map((m) => (
              <li key={m} className="flex items-center gap-1"><AlertTriangleIcon className="size-3 shrink-0" />{m}</li>
            ))}
            {canDrag && <li className="pt-0.5 font-normal underline underline-offset-2 opacity-90">คลิกดูทางแก้ที่ระบบแนะนำ</li>}
          </ul>
        )}

        {s.studentIds.length > 0 && (
          <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
            {s.studentIds.map((sid) => {
              const stu = L.student(sid)
              const a = d.attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
              const wrote = d.summaries.some((x) => x.sessionId === s.id && x.studentId === sid && x.status !== "draft" && x.status !== "changes_requested")
              const onLeave = activeLeave(sid, s.date, d.leaves)
              return (
                <li key={sid} className={cn("flex min-w-0 items-center gap-1.5", onLeave && "opacity-50")} title={onLeave ? `${stu?.name} · ลาพักยาว: ${onLeave.reason}` : stu?.name}>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold", avatarTone(sid))}>{initial(stu?.nickname ?? "?")}</span>
                  <span className={cn("min-w-0 flex-1 truncate text-xs", a?.status === "absent" && "line-through opacity-60")}>{stu?.nickname}</span>
                  {a?.status === "present" && <CheckIcon className={cn("size-3 shrink-0", live ? "text-white" : "text-emerald-600")} />}
                  {a?.status === "absent" && <XIcon className="size-3 shrink-0 text-red-600" />}
                  {a?.status === "leave" && <span className="shrink-0 text-[10px] font-semibold text-amber-600">ลา</span>}
                  {onLeave && <span className="shrink-0 text-[10px] font-semibold text-violet-600">ลาพักยาว</span>}
                  {wrote && <NotebookPenIcon className={cn("size-3 shrink-0", live ? "text-white" : "text-sky-600")} />}
                  <span className={cn("shrink-0 rounded px-1 text-[10px] font-semibold", gradeTone(stu?.grade ?? ""))}>{stu?.grade}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {live && w.progress !== undefined && (
        <div className="h-1 bg-white/20"><div className="h-full bg-white/80" style={{ width: `${Math.min(100, w.progress * 100)}%` }} /></div>
      )}
    </div>
  )
}
