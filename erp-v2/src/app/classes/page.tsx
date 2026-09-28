"use client"

import { useMemo, useState } from "react"
import { PlusIcon, SearchIcon, UserMinusIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { ClassDialog } from "@/components/app/class-dialog"
import { Pager, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { Field } from "@/components/app/student-form"
import { gradeTone, subjectColor } from "@/components/app/subject-color"
import { TeacherPicker } from "@/components/app/teacher-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { endTime, fmtDate, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { CAPACITY, sessionState, subjectsOf } from "@/domain/rules/scheduling"
import { gradeRanges } from "@/domain/rules/settings"
import type { ID, Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type ClassSort = "name" | "day" | "students" | "teacher" | "next"

/** Classes as a data table (owner 2026-09-28: cards were hard to scan). Click a row → edit panel. */
export default function ClassesPage() {
  const branch = useBranch()
  const classes = useStore((s) => s.classes).filter((c) => c.branchId === branch.id)
  const sessions = useStore((s) => s.sessions)
  const courses = useStore((s) => s.courses)
  const staff = useStore((s) => s.staff)
  const L = useLookup()
  const now = useNow()
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("active")
  const [teacherF, setTeacherF] = useState("")
  const [subjectF, setSubjectF] = useState("")
  const [dayF, setDayF] = useState("")
  const [kindF, setKindF] = useState("")
  const [openId, setOpenId] = useState<ID | null>(null)
  const [creating, setCreating] = useState(false)
  const { sort, toggle } = useSort<ClassSort>("day")

  // next upcoming session per class, computed once for the whole table
  const nextOf = useMemo(() => {
    const m = new Map<ID, string>()
    sessions.forEach((x) => {
      if (!x.classId || x.cancelled || sessionState(x, now) !== "upcoming") return
      const cur = m.get(x.classId)
      if (!cur || x.date < cur) m.set(x.classId, x.date)
    })
    return m
  }, [sessions, now])

  const needle = q.trim().toLowerCase()
  const rows = classes
    .filter((c) => (status === "all" ? true : status === "active" ? c.active : !c.active))
    .filter((c) => !teacherF || c.teacherId === teacherF || c.coTeacherIds.includes(teacherF))
    .filter((c) => !subjectF || subjectsOf(c).includes(subjectF))
    .filter((c) => !dayF || c.weekday === Number(dayF))
    .filter((c) => !kindF || c.kind === kindF)
    .filter((c) => !needle || `${c.name} ${subjectsOf(c).join(" ")} ${c.grades.join(" ")} ${L.teacher(c.teacherId).label}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      const v = sort.key === "name" ? a.name.localeCompare(b.name, "th")
        : sort.key === "students" ? a.studentIds.length - b.studentIds.length
          : sort.key === "teacher" ? L.teacher(a.teacherId).label.localeCompare(L.teacher(b.teacherId).label, "th")
            : sort.key === "next" ? (nextOf.get(a.id) ?? "9").localeCompare(nextOf.get(b.id) ?? "9")
              : ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start)
      return sort.desc ? -v : v
    })
  const pg = usePage(rows)
  const teachers = staff.filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id))

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ค้นหาคลาส / วิชา / ชั้น / ครู" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-32" value={teacherF} onChange={(e) => setTeacherF(e.target.value)} placeholder="ครูทุกคน" options={teachers.map((t) => ({ value: t.id, label: t.nickname }))} />
        <NativeSelect className="h-9 w-28" value={subjectF} onChange={(e) => setSubjectF(e.target.value)} placeholder="ทุกวิชา" options={branch.subjects.map((x) => ({ value: x, label: x }))} />
        <NativeSelect className="h-9 w-28" value={dayF} onChange={(e) => setDayF(e.target.value)} placeholder="ทุกวัน" options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: TH_DAYS_FULL[d] }))} />
        <NativeSelect className="h-9 w-32" value={kindF} onChange={(e) => setKindF(e.target.value)} placeholder="ทุกประเภท" options={[{ value: "learning", label: "เรียน" }, { value: "test", label: "สอบ" }, { value: "interview", label: "คุยผู้ปกครอง" }, { value: "other", label: "อื่นๆ" }]} />
        <NativeSelect className="h-9 w-32" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "active", label: "เปิดอยู่" }, { value: "inactive", label: "ปิดแล้ว" }, { value: "all", label: "ทั้งหมด" }]} />
        <Button className="ml-auto" onClick={() => setCreating(true)}><PlusIcon /> สร้างคลาส</Button>
      </div>

      <TableShell minWidth={1050}>
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <SortHeader label="คลาส" k="name" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">คอร์ส</th>
            <SortHeader label="วัน · เวลา" k="day" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">ชั้น</th>
            <SortHeader label="นักเรียน" k="students" sort={sort} onSort={toggle} />
            <SortHeader label="ครู" k="teacher" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">ห้อง</th>
            <SortHeader label="คาบถัดไป" k="next" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((c) => {
            const cap = CAPACITY[c.type]
            const next = nextOf.get(c.id)
            const course = courses.find((x) => x.id === c.courseId)
            return (
              <tr key={c.id} onClick={() => setOpenId(c.id)} className={cn("cursor-pointer border-b last:border-0 hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2.5", !c.active && "opacity-50")}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-8 w-1 shrink-0 rounded-full", subjectColor(c.subject).bar)} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {subjectsOf(c).map((x) => <span key={x} className={cn("rounded-full px-1.5 text-[10px]", subjectColor(x).chip)}>{x}</span>)}
                        <span className="text-[11px] text-muted-foreground">{c.type === "single" ? "เดี่ยว" : "กลุ่ม"}{c.kind !== "learning" ? " · ครั้งเดียว" : ""}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="max-w-40 truncate text-xs text-muted-foreground">{course?.name ?? "—"}</td>
                <td className="whitespace-nowrap">
                  <p>{c.kind === "learning" ? TH_DAYS_FULL[c.weekday] : fmtDate(c.startDate, { weekday: true })}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{c.start}–{endTime(c.start, c.minutes)} · {c.minutes} นาที</p>
                </td>
                <td><div className="flex flex-wrap gap-1">{gradeRanges(c.grades).map((g) => <span key={g} className={cn("rounded-full px-2 py-0.5 text-xs", gradeTone(g))}>{g}</span>)}</div></td>
                <td className={cn("tabular-nums", c.studentIds.length >= cap && "font-semibold text-amber-700")}>{c.studentIds.length}/{cap}</td>
                <td className="whitespace-nowrap">
                  <p className={cn(L.teacher(c.teacherId).missing && "text-amber-700")}>{L.teacher(c.teacherId).label}</p>
                  {c.coTeacherIds.length > 0 && <p className="text-xs text-muted-foreground">+ {c.coTeacherIds.map((t) => L.teacher(t).label).join(", ")}</p>}
                </td>
                <td className="whitespace-nowrap text-xs">{L.room(c.roomId)}</td>
                <td className="whitespace-nowrap text-xs">{next ? fmtDate(next, { weekday: true }) : "—"}</td>
                <td>{c.active ? <Pill tone="green">เปิดอยู่</Pill> : <Pill>ปิดแล้ว</Pill>}</td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">ไม่มีคลาสตามเงื่อนไข</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="คลาส" />
      <ClassSheet id={openId} onClose={() => setOpenId(null)} />
      {creating && <ClassDialog prefill={{}} onClose={() => setCreating(false)} />}
    </div>
  )
}

function ClassSheet({ id, onClose }: { id: ID | null; onClose: () => void }) {
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">{id && <ClassBody id={id} onClose={onClose} />}</SheetContent>
    </Sheet>
  )
}

function ClassBody({ id, onClose }: { id: ID; onClose: () => void }) {
  const k = useStore((s) => s.classes.find((c) => c.id === id)!)
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const update = useStore((s) => s.updateClass)
  const deactivate = useStore((s) => s.deactivateClass)
  const remove = useStore((s) => s.removeStudentFromClass)
  const branch = useBranch()
  const now = useNow()
  const L = useLookup()
  const [weekday, setWeekday] = useState<Weekday>(k.weekday)
  const [start, setStart] = useState(k.start)
  const [minutes, setMinutes] = useState(k.minutes)
  const [roomId, setRoomId] = useState(k.roomId ?? "")
  const [sel, setSel] = useState({ ids: [k.teacherId, ...k.coTeacherIds].filter(Boolean) as string[], primaryId: k.teacherId ?? "" })
  const [closing, setClosing] = useState(false)
  const [reason, setReason] = useState("")
  const [removing, setRemoving] = useState<ID | null>(null)
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)
  const future = sessions.filter((s) => s.classId === k.id && !s.cancelled && sessionState(s, now) === "upcoming")
  const past = sessions.filter((s) => s.classId === k.id && s.date < toDateStr(now)).length
  const teachers = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  const dirty = weekday !== k.weekday || start !== k.start || minutes !== k.minutes || (roomId || null) !== k.roomId || sel.primaryId !== (k.teacherId ?? "") || sel.ids.filter((x) => x !== sel.primaryId).join() !== k.coTeacherIds.join()

  return (
    <>
      <SheetHeader className="border-b pb-3">
        <SheetTitle className="text-lg">{k.name}</SheetTitle>
        <SheetDescription>{k.subject} · {k.grades.join(", ")} · {k.type === "single" ? "เดี่ยว" : "กลุ่ม"} · เรียนไปแล้ว {past} คาบ · เหลือ {future.length} คาบ</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 px-4 pb-6">
        {k.active && (
          <section className="space-y-3 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">ตารางและครู</h3>
            <div className="grid grid-cols-3 gap-2">
              <Field label="วัน"><NativeSelect value={String(weekday)} onChange={(e) => setWeekday(Number(e.target.value) as Weekday)} options={TH_DAYS_FULL.map((d, i) => ({ value: String(i), label: d, disabled: !branch.hours[i as Weekday] }))} /></Field>
              <Field label="เริ่ม"><Input type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="นาที"><Input type="number" min={5} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
            </div>
            <Field label="ห้อง"><NativeSelect value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="ยังไม่ระบุ" options={branch.rooms.map((r) => ({ value: r.id, label: r.name }))} /></Field>
            <Field label="ครู (★ = ครูหลัก)"><TeacherPicker teachers={teachers} subject={k.subject} value={sel} onChange={setSel} /></Field>
            <p className="text-xs text-muted-foreground">มีผลกับคาบที่ยังไม่เริ่มเท่านั้น — คาบที่เรียนไปแล้ว มีเช็คชื่อ หรือแก้แยกไว้ จะไม่ถูกเปลี่ยน</p>
            <Button
              size="sm"
              disabled={!dirty}
              onClick={() =>
                report(
                  update(k.id, { weekday, start, minutes, roomId: roomId || null, teacherId: sel.primaryId || null, coTeacherIds: sel.ids.filter((x) => x !== sel.primaryId) }),
                  (v) => `บันทึกแล้ว · เปลี่ยน ${v.changed} คาบ${v.kept ? ` · คงเดิม ${v.kept} คาบ` : ""}`,
                )
              }
            >
              บันทึกการเปลี่ยนแปลง
            </Button>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">นักเรียน ({k.studentIds.length}/{CAPACITY[k.type]})</h3>
          <ul className="divide-y rounded-lg border">
            {k.studentIds.map((sid) => {
              const st = L.student(sid)
              return (
                <li key={sid} className="flex items-center gap-2 p-2">
                  <button onClick={() => setStudentOpen(sid)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
                    {st?.nickname} <span className={cn("rounded px-1 text-[10px] font-semibold", gradeTone(st?.grade ?? ""))}>{st?.grade}</span>
                  </button>
                  {k.active && (removing === sid ? (
                    <span className="flex items-center gap-1 text-xs">
                      ออกจากคลาส + คาบที่ยังไม่เริ่ม?
                      <Button size="xs" variant="destructive" onClick={() => report(remove(k.id, sid), (v) => `เอาออกแล้ว · ${v.removedFrom} คาบ (ประวัติเดิมยังอยู่)`) && setRemoving(null)}>ยืนยัน</Button>
                      <Button size="xs" variant="ghost" onClick={() => setRemoving(null)}>ไม่</Button>
                    </span>
                  ) : (
                    <Button size="icon-xs" variant="ghost" aria-label="เอาออกจากคลาส" onClick={() => setRemoving(sid)}><UserMinusIcon /></Button>
                  ))}
                </li>
              )
            })}
            {k.studentIds.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">ยังไม่มีนักเรียน — เพิ่มจากปฏิทิน (เปิดคาบ → เพิ่มนักเรียน) หรือเมื่อชำระเงินแล้วระบบเพิ่มให้อัตโนมัติ</li>}
          </ul>
        </section>

        {k.active && (
          <section className="rounded-lg border border-red-200 p-3">
            {!closing ? (
              <Button size="sm" variant="ghost" className="text-red-700" onClick={() => setClosing(true)}>ปิดคลาสนี้</Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">ปิดคลาสจะ <b>ยกเลิก {future.length} คาบที่ยังไม่เริ่ม</b> และคลาสนี้จะไม่ถูกเสนอให้ย้ายเรียนชดเชยอีก · ประวัติที่เรียนไปแล้วยังอยู่</p>
                <Textarea rows={2} placeholder="เหตุผล (จำเป็น)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setClosing(false)}>ไม่ปิด</Button>
                  <Button size="sm" variant="destructive" disabled={!reason.trim()} onClick={() => report(deactivate(k.id, reason), (v) => `ปิดคลาสแล้ว · ยกเลิก ${v.cancelled} คาบ`) && onClose()}>ยืนยันปิดคลาส</Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
    </>
  )
}
