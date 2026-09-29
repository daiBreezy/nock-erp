"use client"

import { useState } from "react"
import { ArrowDownUpIcon, BookOpenIcon, CalendarIcon, ChevronRightIcon, ClockIcon, DoorOpenIcon, GraduationCapIcon, PlusIcon, RefreshCwIcon, SearchIcon, UserMinusIcon, UserRoundIcon, UsersIcon } from "lucide-react"
import { ClassDialog } from "@/components/app/class-dialog"
import { Pager, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { NativeSelect } from "@/components/app/native-select"
import { StudentSheet } from "@/components/app/student-sheet"
import { Field } from "@/components/app/student-form"
import { avatarTone, gradeTone, initial, subjectColor } from "@/components/app/subject-color"
import { TeacherPicker } from "@/components/app/teacher-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { endTime, fmtDate, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { CAPACITY, sessionState, subjectsOf } from "@/domain/rules/scheduling"
import * as Att from "@/domain/rules/attendance"
import { inBranch } from "@/domain/rules/permissions"
import { gradeRanges, PRICE_UNIT_LABEL, sortGrades } from "@/domain/rules/settings"
import type { ID, Klass, PriceUnit, Weekday } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useEntitlements, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type ClassSort = "subject" | "day" | "time" | "grade" | "students" | "teacher" | "room" | "status"

/** Class page (owner design "Class Page.png", 2026-09-28): KPIs · search + Branch/Subject/Course type/Package
 *  filters · data table. Inactive classes stay in the list, greyed. Click a row → edit panel. */
export default function ClassesPage() {
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const branches = useStore((s) => s.branches)
  const allClasses = useStore((s) => s.classes)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const courses = useStore((s) => s.courses)
  const staff = useStore((s) => s.staff)
  const settings = useStore((s) => s.system.settings)
  const entitlements = useEntitlements()
  const L = useLookup()
  const today = toDateStr(useNow())
  const [q, setQ] = useState("")
  const [branchF, setBranchF] = useState(branch.id)
  const [subjectF, setSubjectF] = useState("")
  const [kindF, setKindF] = useState("")
  const [unitF, setUnitF] = useState("")
  const [openId, setOpenId] = useState<ID | null>(null)
  const [creating, setCreating] = useState(false)
  const { sort, toggle } = useSort<ClassSort>("day")

  const myBranches = branches.filter((b) => inBranch(me, b.id))
  const classes = allClasses.filter((c) => (branchF ? c.branchId === branchF : myBranches.some((b) => b.id === c.branchId)))
  const courseOf = (c: Klass) => courses.find((x) => x.id === c.courseId)
  const teacherOf = (id: ID | null) => staff.find((t) => t.id === id)

  // KPIs over active classes in scope
  const active = classes.filter((c) => c.active)
  const kpiStudents = new Set(active.flatMap((c) => c.studentIds))
  const kpiTeachers = new Set(active.flatMap((c) => [c.teacherId, ...c.coTeacherIds]).filter(Boolean))
  const renewal = new Set(
    entitlements
      .filter((e) => kpiStudents.has(e.studentId) && e.to >= today)
      .filter((e) => Att.lowBalanceAlert(e, Att.balance(e, sessions, attendance), today, { low: settings.lowSessionThreshold, days: settings.renewalDaysBefore }))
      .map((e) => e.studentId),
  ).size

  const needle = q.trim().toLowerCase()
  const rows = classes
    .filter((c) => !subjectF || subjectsOf(c).includes(subjectF))
    .filter((c) => !kindF || courseOf(c)?.kind === kindF)
    .filter((c) => !unitF || courseOf(c)?.unit === unitF)
    .filter((c) => {
      if (!needle) return true
      const t = teacherOf(c.teacherId)
      return `${c.name} ${subjectsOf(c).join(" ")} ${c.grades.join(" ")} ${t?.nickname ?? ""} ${t?.name ?? ""} ${c.coTeacherIds.map((x) => teacherOf(x)?.nickname ?? "").join(" ")} ${L.room(c.roomId)}`.toLowerCase().includes(needle)
    })
    .sort((a, b) => {
      const byDay = ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start)
      const v = sort.key === "subject" ? a.subject.localeCompare(b.subject, "th")
        : sort.key === "time" ? a.start.localeCompare(b.start)
          : sort.key === "grade" ? (sortGrades(a.grades)[0] ?? "").localeCompare(sortGrades(b.grades)[0] ?? "")
            : sort.key === "students" ? a.studentIds.length - b.studentIds.length
              : sort.key === "teacher" ? L.teacher(a.teacherId).label.localeCompare(L.teacher(b.teacherId).label, "th")
                : sort.key === "room" ? L.room(a.roomId).localeCompare(L.room(b.roomId), "th")
                  : sort.key === "status" ? Number(b.active) - Number(a.active)
                    : byDay
      // inactive classes always sink below active ones (shown greyed, like the design)
      return Number(b.active) - Number(a.active) || (sort.desc ? -v : v) || byDay
    })
  const pg = usePage(rows)

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><GraduationCapIcon className="size-5" /></span>
        <h1 className="text-xl font-semibold">คลาส</h1>
        <Button className="ml-auto" onClick={() => setCreating(true)}><PlusIcon /> สร้างคลาส</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={BookOpenIcon} label="คลาสที่เปิดอยู่" value={active.length} />
        <Kpi icon={UsersIcon} label="นักเรียน" value={kpiStudents.size} />
        <Kpi icon={UserRoundIcon} label="ครู" value={kpiTeachers.size} />
        <Kpi icon={RefreshCwIcon} label="ใกล้หมดแพ็กเกจ (ต่อคอร์ส)" value={renewal} tone={renewal ? "text-amber-700" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">รายการคลาส</h2>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-60 pl-9" placeholder="เช่น ชื่อครู, ชั้น, วิชา, ห้อง" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button size="icon" variant="outline" aria-label="สลับลำดับ" onClick={() => toggle(sort.key)}><ArrowDownUpIcon /></Button>
        <NativeSelect className="h-9 w-36" value={branchF} onChange={(e) => setBranchF(e.target.value)} options={[...(myBranches.length > 1 ? [{ value: "", label: "ทุกสาขา" }] : []), ...myBranches.map((b) => ({ value: b.id, label: `สาขา${b.name}` }))]} />
        <NativeSelect className="h-9 w-28" value={subjectF} onChange={(e) => setSubjectF(e.target.value)} placeholder="ทุกวิชา" options={[...new Set(classes.flatMap((c) => subjectsOf(c)))].map((x) => ({ value: x, label: x }))} />
        <NativeSelect className="h-9 w-32" value={kindF} onChange={(e) => setKindF(e.target.value)} placeholder="ประเภทคอร์ส" options={[{ value: "single", label: "Single" }, { value: "bundle", label: "Bundle" }]} />
        <NativeSelect className="h-9 w-32" value={unitF} onChange={(e) => setUnitF(e.target.value)} placeholder="แพ็กเกจ" options={(["hour", "week", "month"] as PriceUnit[]).map((u) => ({ value: u, label: PRICE_UNIT_LABEL[u] }))} />
      </div>

      <TableShell minWidth={1050}>
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <SortHeader label="วิชา" k="subject" sort={sort} onSort={toggle} />
            <SortHeader label="วัน" k="day" sort={sort} onSort={toggle} />
            <SortHeader label="เวลา" k="time" sort={sort} onSort={toggle} />
            <SortHeader label="ชั้น" k="grade" sort={sort} onSort={toggle} />
            <SortHeader label="นักเรียน" k="students" sort={sort} onSort={toggle} />
            <SortHeader label="ครู" k="teacher" sort={sort} onSort={toggle} />
            <SortHeader label="ห้อง" k="room" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">สาขา</th>
            <SortHeader label="สถานะ" k="status" sort={sort} onSort={toggle} />
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((c) => {
            const cap = CAPACITY[c.type]
            const t = teacherOf(c.teacherId)
            const br = branches.find((b) => b.id === c.branchId)
            const autoName = `${subjectsOf(c).join(" + ")} ${c.grades.join(", ")}`.trim()
            return (
              <tr key={c.id} onClick={() => setOpenId(c.id)} className={cn("group cursor-pointer border-b last:border-0 hover:bg-primary/5 [&>td]:px-3 [&>td]:py-2.5", !c.active && "opacity-45")}>
                <td>
                  <div className="flex flex-wrap gap-1">{subjectsOf(c).map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(x).chip)}>{x}</span>)}</div>
                  {c.name !== autoName && <p className="mt-0.5 max-w-48 truncate text-[11px] text-muted-foreground">{c.name}</p>}
                </td>
                <td className="whitespace-nowrap"><span className="flex items-center gap-1.5"><CalendarIcon className="size-4 text-muted-foreground" />{c.kind === "learning" ? TH_DAYS_FULL[c.weekday] : fmtDate(c.startDate, { weekday: true })}</span></td>
                <td className="whitespace-nowrap tabular-nums"><span className="flex items-center gap-1.5"><ClockIcon className="size-4 text-muted-foreground" />{c.start}–{endTime(c.start, c.minutes)}</span></td>
                <td><div className="flex flex-wrap gap-1">{gradeRanges(c.grades).map((g) => <span key={g} className={cn("rounded-full px-2 py-0.5 text-xs", gradeTone(g))}>{g}</span>)}</div></td>
                <td className="tabular-nums"><span className={cn("flex items-center gap-1", c.studentIds.length >= cap && "font-semibold text-amber-700")}><UsersIcon className="size-3.5 text-muted-foreground" />{c.studentIds.length}<span className="text-xs text-muted-foreground">/{cap}</span></span></td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", t ? avatarTone(t.id) : "bg-muted text-muted-foreground")}>{t ? initial(t.nickname) : "?"}</span>
                    <div className="min-w-0 leading-tight">
                      <p className={cn("truncate text-sm", L.teacher(c.teacherId).missing && "text-amber-700")}>{L.teacher(c.teacherId).label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{t?.name ?? ""}{c.coTeacherIds.length > 0 && ` · + ${c.coTeacherIds.map((x) => L.teacher(x).label).join(", ")}`}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap"><span className="flex items-center gap-1.5 text-xs"><DoorOpenIcon className="size-4 text-muted-foreground" />{L.room(c.roomId)}</span></td>
                <td className="leading-tight"><p className="text-sm">{br?.name}</p><p className="text-[11px] text-muted-foreground">{br?.code}</p></td>
                <td>{c.active ? <span className="text-sm font-medium text-emerald-700">เปิดอยู่</span> : <span className="text-sm text-muted-foreground">ปิดแล้ว</span>}</td>
                <td><ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100" /></td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-muted-foreground">ไม่มีคลาสตามเงื่อนไข</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="คลาส" />
      <ClassSheet id={openId} onClose={() => setOpenId(null)} />
      {creating && <ClassDialog prefill={{}} onClose={() => setCreating(false)} />}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof BookOpenIcon; label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</p></div>
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
      <div className="space-y-5 px-4 pt-5 pb-6">
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
