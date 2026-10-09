"use client"

// Staff side panel (owner 2026-10-09): click a person → their information with tabs (Info · Classes · Sessions ·
// Summaries · Note · Log). "แก้ไข" switches the same panel to the edit form; "เพิ่มบุคลากร" opens it empty and turns
// into the information view once saved. Roles / subjects / working days are set per branch.
import { useMemo, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon, UserXIcon } from "lucide-react"
import { SessionSheet } from "@/components/app/session-sheet"
import { WorkChip } from "@/components/app/work-state"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { EnNameField, nativeLabel } from "@/components/app/name-fields"
import { Field } from "@/components/app/student-form"
import { avatarTone, initial } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { addDays, dayShort, endTime, fmtDate, fmtDateTime, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { mondayOf, studentsOfTeacher, teacherWeek, type TeacherSessionRow } from "@/domain/rules/staff-overview"
import { validateStaff } from "@/domain/rules/people"
import { allBranches, areaOf, assignmentAt, BRANCH_ROLES, can, canDeactivateStaff, GLOBAL_ROLES, rolesAt, ROLE_LABEL, withAssignments } from "@/domain/rules/permissions"
import { sessionState, subjectsOf, workState } from "@/domain/rules/scheduling"
import type { ID, Session, Staff, StaffAssignment, Weekday } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { DeactivateDialog } from "./deactivate-dialog"

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]
type Tab = "info" | "sessions" | "summaries" | "notes" | "log"
const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "ข้อมูล" }, { key: "sessions", label: "คาบสอน" },
  { key: "summaries", label: "สรุปการเรียน" }, { key: "notes", label: "โน้ต" }, { key: "log", label: "Log" },
]

/** Monday of the week a date falls in */
export { mondayOf }

/** "new" = create · an id = that person · null = closed */
export function StaffPanel({ target, onClose }: { target: ID | "new" | null; onClose: () => void }) {
  const [createdId, setCreatedId] = useState<ID | null>(null)
  const [editing, setEditing] = useState(target === "new")
  const id = target === "new" ? createdId : target
  const s = useStore((st) => (id ? st.staff.find((x) => x.id === id) : undefined))
  const close = () => { setCreatedId(null); setEditing(false); onClose() }
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && close()}>
      {/* Header · Body · Bottom — only the body scrolls (owner 2026-10-09) */}
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-xl">
        {editing || !s ? (
          <StaffEdit staff={s} onCancel={() => (s ? setEditing(false) : close())}
            onSaved={(saved) => { if (target === "new") setCreatedId(saved.id); setEditing(false) }} />
        ) : <StaffView s={s} onEdit={() => setEditing(true)} />}
      </SheetContent>
    </Sheet>
  )
}

function StaffView({ s, onEdit }: { s: Staff; onEdit: () => void }) {
  const branch = useBranch()
  const me = useStore((st) => st.me())
  const staff = useStore((st) => st.staff)
  const reactivate = useStore((st) => st.reactivateStaff)
  const [tab, setTab] = useState<Tab>("info")
  const [leaving, setLeaving] = useState(false)
  // one week for the overview / sessions / summaries tabs, and the session panel opened from them
  const today = toDateStr(useNow())
  const [week, setWeek] = useState(() => mondayOf(today))
  const [openSession, setOpenSession] = useState<ID | null>(null)
  const manage = can(me, "staff.manage")
  const deact = canDeactivateStaff(s, me, staff)
  const roles = rolesAt(s, branch.id)
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-lg font-semibold", avatarTone(s.id))}>{initial(s.nickname)}</span>
          <div className="min-w-0">
            <SheetTitle className="text-lg">{s.nickname}{!s.active && <span className="ml-2 text-sm font-normal text-muted-foreground">(ปิดบัญชีแล้ว)</span>}</SheetTitle>
            <SheetDescription className="truncate">{s.name}{s.nameEn ? ` · ${s.nameEn}` : ""}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {roles.map((r) => <Pill key={r} tone={r === "teacher" ? "blue" : "violet"}>{ROLE_LABEL[r]}</Pill>)}
          {s.partTime && <Pill tone="amber">Part-time</Pill>}
          {!s.canLogin && <Pill>ไม่ล็อกอิน</Pill>}
        </div>
      </SheetHeader>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("shrink-0 rounded-full px-3 py-1 text-sm", tab === t.key ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>{t.label}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-4 pb-6">
        {(tab === "info" || tab === "sessions" || tab === "summaries") && <WeekNav week={week} today={today} onChange={setWeek} />}
        {tab === "info" ? <InfoTab s={s} week={week} onTab={setTab} /> : tab === "sessions" ? <SessionsTab s={s} week={week} onOpen={setOpenSession} />
          : tab === "summaries" ? <SummariesTab s={s} week={week} onOpen={setOpenSession} /> : tab === "notes" ? <NotesTab s={s} canAdd={manage} /> : <LogTab s={s} />}
      </div>
      {/* Panel = Header · Body · Bottom — actions (CTA) live in the bottom bar (owner 2026-10-09) */}
      {manage && (
        <div className="flex shrink-0 items-center gap-2 border-t bg-background px-4 py-3">
          {s.active ? (
            <>
              <Button variant="ghost" className="text-red-700" disabled={!deact.ok} title={deact.ok ? undefined : (deact as { error: string }).error} onClick={() => setLeaving(true)}><UserXIcon /> ปิดบัญชี</Button>
              <Button className="ml-auto" onClick={onEdit}><PencilIcon /> แก้ไข</Button>
            </>
          ) : <Button className="ml-auto" onClick={() => report(reactivate(s.id), `เปิดบัญชี ${s.nickname} แล้ว`)}>เปิดบัญชีใหม่</Button>}
        </div>
      )}
      {leaving && <DeactivateDialog s={s} onClose={() => setLeaving(false)} />}
      {/* the session's own panel — check attendance / write summaries right there (owner 2026-10-09) */}
      <SessionSheet sessionId={openSession} onClose={() => setOpenSession(null)} />
    </>
  )
}

function WeekNav({ week, today, onChange }: { week: string; today: string; onChange: (w: string) => void }) {
  const current = week === mondayOf(today)
  return (
    <div className="flex items-center gap-1">
      <Button size="icon-sm" variant="outline" aria-label="สัปดาห์ก่อน" onClick={() => onChange(addDays(week, -7))}><ChevronLeftIcon /></Button>
      <Button size="sm" variant="outline" disabled={current} onClick={() => onChange(mondayOf(today))}>สัปดาห์นี้</Button>
      <Button size="icon-sm" variant="outline" aria-label="สัปดาห์ถัดไป" onClick={() => onChange(addDays(week, 7))}><ChevronRightIcon /></Button>
      <span className="ml-2 text-sm font-medium">{fmtDate(week)} – {fmtDate(addDays(week, 6), { year: true })}</span>
    </div>
  )
}

function useWeek(teacherId: ID, week: string) {
  const sessions = useStore((st) => st.sessions)
  const attendance = useStore((st) => st.attendance)
  const summaries = useStore((st) => st.summaries)
  const now = useNow()
  return useMemo(() => teacherWeek(teacherId, week, { sessions, attendance, summaries, now }), [teacherId, week, sessions, attendance, summaries, now])
}

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="flex-1 px-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}

function InfoTab({ s, week, onTab }: { s: Staff; week: string; onTab: (t: Tab) => void }) {
  const branches = useStore((st) => st.branches)
  const w = useWeek(s.id, week)
  const sessions = useStore((st) => st.sessions)
  const classes = useStore((st) => st.classes)
  const students = useStore((st) => st.students)
  const leaves = useStore((st) => st.leaves)
  const ents = useEntitlements()
  const today = toDateStr(useNow())
  const mine = studentsOfTeacher(s.id, { sessions, classes, today })
  const renew = mine.map((id) => students.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x && Att.studentStatus(x, ents, leaves, today) === "renewal")
  const teaches = s.roles.includes("teacher")
  const global = s.roles.filter((r) => GLOBAL_ROLES.includes(r))
  // branches where they actually have a role — a Director with no branch work shows none
  const rows = branches.map((b) => ({ b, a: assignmentAt(s, b.id) })).filter((x) => x.a && x.a.roles.length > 0)
  return (
    <>
      {/* overview of this teacher's week (owner 2026-10-09) */}
      {teaches && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => onTab("sessions")} className="rounded-2xl border p-3 text-left hover:bg-muted/40">
              <p className="text-xs text-muted-foreground">คาบสอนสัปดาห์นี้</p>
              <p className="text-2xl font-semibold tabular-nums">{w.sessions.total} <span className="text-sm font-normal text-muted-foreground">คาบ · {Math.round(w.minutes / 6) / 10} ชม.</span></p>
              <Progress done={w.sessions.done} total={w.sessions.total} />
              <p className="mt-1 text-xs"><span className="text-emerald-700">เสร็จ {w.sessions.done}</span> · <span className={w.sessions.left ? "text-amber-700" : "text-muted-foreground"}>เหลือ {w.sessions.left}</span></p>
            </button>
            <button type="button" onClick={() => onTab("summaries")} className="rounded-2xl border p-3 text-left hover:bg-muted/40">
              <p className="text-xs text-muted-foreground">สรุปการเรียนสัปดาห์นี้</p>
              <p className="text-2xl font-semibold tabular-nums">{w.summaries.total} <span className="text-sm font-normal text-muted-foreground">ฉบับ</span></p>
              <Progress done={w.summaries.written} total={w.summaries.total} />
              <p className="mt-1 text-xs"><span className="text-emerald-700">เขียนแล้ว {w.summaries.written}</span> · <span className={w.summaries.left ? "text-amber-700" : "text-muted-foreground"}>เหลือ {w.summaries.left}</span></p>
            </button>
          </div>
          <div className="flex divide-x rounded-2xl bg-muted/50 py-2">
            <Stat label="นักเรียนในมือ" value={mine.length} sub="คน" />
            <Stat label="ต้องต่อคอร์ส" value={renew.length} sub="คน" tone={renew.length ? "text-amber-700" : undefined} />
          </div>
          {renew.length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-sm font-semibold">ต้องต่อคอร์ส</h3>
              <ul className="divide-y rounded-2xl border">
                {renew.map((x) => {
                  const end = ents.filter((e) => e.studentId === x.id && e.to >= today).map((e) => e.to).sort().at(-1)
                  return (
                    <li key={x.id} className="flex items-center gap-2 p-2.5 text-sm">
                      <span className="font-medium">{x.nickname}</span><span className="text-xs text-muted-foreground">{x.grade}</span>
                      {end && <span className="ml-auto text-xs text-amber-700">แพ็กหมด {fmtDate(end)}</span>}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
      <section className="divide-y rounded-2xl border px-3">
        <Row label="ชื่อ-นามสกุล">{s.name}{s.nameEn && <span className="text-muted-foreground"> · {s.nameEn}</span>}</Row>
        <Row label="ชื่อที่แสดง">{s.nickname}{s.nicknameEn && <span className="text-muted-foreground"> · {s.nicknameEn}</span>}</Row>
        <Row label="อีเมล">{s.email || <span className="text-muted-foreground">—</span>}{!s.canLogin && <span className="text-xs text-muted-foreground"> · ไม่มีสิทธิ์เข้าระบบ</span>}</Row>
        <Row label="ประเภท">{s.partTime ? "Part-time (เป็นครูสอนแทนได้)" : "Full-time"}</Row>
        {allBranches(s) && <Row label="ดูแล">ทุกสาขา ({global.filter((r) => r !== "area_manager").map((r) => ROLE_LABEL[r]).join(", ")})</Row>}
        {s.roles.includes("area_manager") && (
          <Row label="Area Manager">{(() => { const area = areaOf(s); return area === null ? "ทุกสาขา (ยังไม่ได้เลือก)" : branches.filter((b) => area.includes(b.id)).map((b) => b.name).join(", ") })()}</Row>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">งานแต่ละสาขา</h3>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">{allBranches(s) ? "ไม่ได้ประจำสาขาใด — ดูแลทุกสาขา" : "ยังไม่ได้กำหนดสาขา"}</p>}
        {rows.map(({ b, a }) => (
          <div key={b.id} className="rounded-2xl border p-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{b.name}</span>
              {a!.roles.map((r) => <Pill key={r} tone={r === "teacher" ? "blue" : "violet"}>{ROLE_LABEL[r]}</Pill>)}
            </div>
            {a!.subjects.length > 0 && <p className="mt-1 text-muted-foreground">วิชา: {a!.subjects.join(", ")}</p>}
            <p className="mt-1 flex flex-wrap gap-1">
              {a!.weekdays.length ? WEEK.filter((d) => a!.weekdays.includes(d)).map((d) => <span key={d} className="rounded-full bg-muted px-2 py-0.5 text-xs">{dayShort(d)}</span>)
                : <span className="text-xs text-muted-foreground">ทุกวัน</span>}
            </p>
          </div>
        ))}
      </section>
    </>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
    </div>
  )
}

/** the week split by day — what each day has (owner 2026-10-09) */
function byDay(rows: TeacherSessionRow[], week: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((date) => ({ date, rows: rows.filter((r) => r.session.date === date) }))
}

function SessionsTab({ s, week, onOpen }: { s: Staff; week: string; onOpen: (id: ID) => void }) {
  const w = useWeek(s.id, week)
  const classes = useStore((st) => st.classes)
  const attendance = useStore((st) => st.attendance)
  const summaries = useStore((st) => st.summaries)
  const now = useNow()
  const today = toDateStr(now)
  const name = (x: Session) => classes.find((k) => k.id === x.classId)?.name ?? subjectsOf(x).join(" + ")
  return (
    <>
      <div className="flex divide-x rounded-2xl bg-muted/50 py-2">
        <Stat label="คาบสัปดาห์นี้" value={w.sessions.total} />
        <Stat label="ชั่วโมง" value={Math.round(w.minutes / 6) / 10} />
        <Stat label="เสร็จแล้ว" value={w.sessions.done} tone="text-emerald-700" />
        <Stat label="เหลือ" value={w.sessions.left} tone={w.sessions.left ? "text-amber-700" : undefined} />
      </div>
      {byDay(w.rows, week).map(({ date, rows }) => (
        <section key={date} className="space-y-1">
          <p className={cn("text-xs font-semibold", date === today ? "text-primary" : "text-muted-foreground")}>{fmtDate(date, { weekday: true })}{date === today && " · วันนี้"}</p>
          {rows.length === 0 ? <p className="rounded-xl border border-dashed px-3 py-1.5 text-xs text-muted-foreground">ไม่มีคาบ</p> : (
            <ul className="divide-y rounded-2xl border">
              {rows.map((r) => (
                <li key={r.session.id}>
                  <button type="button" onClick={() => onOpen(r.session.id)} className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-muted/40">
                    <span className="w-24 shrink-0 text-xs tabular-nums">{r.session.start}–{endTime(r.session.start, r.session.minutes)}</span>
                    <span className="min-w-0 flex-1 truncate">{name(r.session)}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{r.session.studentIds.length} คน</span>
                    <WorkChip w={workState(r.session, now, attendance, summaries)} students={r.session.studentIds.length} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}

/** the week's sessions with how many summaries are written — click to open the session and write (owner 2026-10-09) */
function SummariesTab({ s, week, onOpen }: { s: Staff; week: string; onOpen: (id: ID) => void }) {
  const w = useWeek(s.id, week)
  const classes = useStore((st) => st.classes)
  const now = useNow()
  const name = (x: Session) => classes.find((k) => k.id === x.classId)?.name ?? subjectsOf(x).join(" + ")
  const started = (x: Session) => sessionState(x, now) !== "upcoming"
  return (
    <>
      <div className="flex divide-x rounded-2xl bg-muted/50 py-2">
        <Stat label="สรุปสัปดาห์นี้" value={w.summaries.total} />
        <Stat label="เขียนแล้ว" value={w.summaries.written} tone="text-emerald-700" />
        <Stat label="ยังไม่ได้เขียน" value={w.summaries.left} tone={w.summaries.left ? "text-amber-700" : undefined} />
      </div>
      {w.rows.length === 0 ? <Empty text="ไม่มีคาบในสัปดาห์นี้" /> : (
        <ul className="divide-y rounded-2xl border">
          {w.rows.map((r) => {
            const all = r.needed > 0 && r.written >= r.needed
            const state = !started(r.session) ? { t: "ยังไม่ถึงคาบ", c: "bg-muted text-muted-foreground" } : all ? { t: "เขียนครบ", c: "bg-emerald-100 text-emerald-800" } : r.needed === 0 ? { t: "ไม่มีนักเรียนมาเรียน", c: "bg-muted text-muted-foreground" } : { t: "ยังไม่ได้เขียน", c: "bg-amber-100 text-amber-900" }
            return (
              <li key={r.session.id}>
                <button type="button" onClick={() => onOpen(r.session.id)} className="flex w-full items-center gap-2 p-2.5 text-left text-sm hover:bg-muted/40">
                  <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{fmtDate(r.session.date, { weekday: true })} {r.session.start}</span>
                  <span className="min-w-0 flex-1 truncate">{name(r.session)}</span>
                  <span className="shrink-0 text-xs tabular-nums">{r.written}/{r.needed}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", state.c)}>{state.t}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

function NotesTab({ s, canAdd }: { s: Staff; canAdd: boolean }) {
  const add = useStore((st) => st.addStaffNote)
  const staff = useStore((st) => st.staff)
  const [text, setText] = useState("")
  return (
    <>
      {canAdd && (
        <div className="space-y-1.5">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="บันทึกเกี่ยวกับบุคลากรคนนี้ เช่น ขอสอนแค่ช่วงเย็น" />
          <div className="flex justify-end"><Button size="sm" disabled={!text.trim()} onClick={() => report(add(s.id, text), "บันทึกโน้ตแล้ว") && setText("")}><PlusIcon /> เพิ่มโน้ต</Button></div>
        </div>
      )}
      {!s.notes?.length ? <Empty text="ยังไม่มีโน้ต" /> : (
        <ul className="divide-y rounded-2xl border">
          {s.notes.map((n) => (
            <li key={n.id} className="p-2.5 text-sm">
              <p className="text-xs text-muted-foreground">{fmtDateTime(n.at)} · {staff.find((x) => x.id === n.by)?.nickname ?? "?"}</p>
              <p className="whitespace-pre-line">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function LogTab({ s }: { s: Staff }) {
  const logs = useStore((st) => st.logs)
  const students = useStore((st) => st.students)
  const mine = logs.filter((l) => l.by === s.id).slice(0, 50)
  if (!mine.length) return <Empty text="ยังไม่มีประวัติการทำงานในระบบ" />
  return (
    <ul className="divide-y rounded-2xl border">
      {mine.map((l) => (
        <li key={l.id} className="p-2.5 text-sm">
          <p className="text-xs text-muted-foreground">{fmtDateTime(l.at)}{l.studentIds.length ? ` · ${l.studentIds.map((id) => students.find((x) => x.id === id)?.nickname).filter(Boolean).join(", ")}` : ""}</p>
          <p><span className="font-medium">{l.action}</span> {l.detail}</p>
        </li>
      ))}
    </ul>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>
}

// ---------------- edit ----------------

/** Assignment rows for the form — older records get one row per branch from their flat roles / subjects */
const rowsOf = (s: Staff): StaffAssignment[] => s.assignments?.length ? s.assignments
  : s.roles.some((r) => BRANCH_ROLES.includes(r)) ? s.branchIds.map((b) => ({ branchId: b, roles: s.roles.filter((r) => BRANCH_ROLES.includes(r)), subjects: s.subjects, weekdays: [] })) : []

function StaffEdit({ staff: initial, onCancel, onSaved }: { staff?: Staff; onCancel: () => void; onSaved: (s: Staff) => void }) {
  const branch = useBranch()
  const all = useStore((st) => st.staff)
  const branches = useStore((st) => st.branches)
  const save = useStore((st) => st.saveStaff)
  const [f, setF] = useState<Staff>(initial ?? { id: uid("u"), name: "", nickname: "", roles: [], branchIds: [], subjects: [], active: true, canLogin: true, email: "" })
  const [rows, setRows] = useState<StaffAssignment[]>(() => (initial ? rowsOf(initial) : [{ branchId: branch.id, roles: ["teacher"], subjects: [], weekdays: [] }]))
  // older Area Manager records had no list — start from the branches they were in
  const [touched, setTouched] = useState(false)
  const next = withAssignments(f, rows)
  const errs = validateStaff(next, all, f.id)
  const err = (k: string) => touched && errs.find((e) => e.field === k)?.message
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const setRow = (i: number, patch: Partial<StaffAssignment>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const free = branches.filter((b) => b.active !== false && !rows.some((r) => r.branchId === b.id))

  const submit = () => {
    setTouched(true)
    const r = save(next)
    if (report(r, initial ? "บันทึกแล้ว" : `เพิ่ม ${next.nickname} แล้ว`)) onSaved(r.value)
  }

  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <SheetTitle className="text-lg">{initial ? `แก้ไข ${initial.nickname}` : "เพิ่มบุคลากร"}</SheetTitle>
        <SheetDescription>บทบาท วิชา และวันทำงาน แยกตามสาขา</SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-4 pb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={nativeLabel(branch.brand, "ชื่อ-นามสกุล")} error={err("name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <EnNameField label="ชื่อ-นามสกุล" native={f.name} value={f.nameEn} onChange={(v) => setF({ ...f, nameEn: v })} />
          <Field label={nativeLabel(branch.brand, "ชื่อที่แสดง")} error={err("nickname")}><Input value={f.nickname} onChange={(e) => setF({ ...f, nickname: e.target.value })} placeholder="ครูมิ้นท์" /></Field>
          <EnNameField label="ชื่อที่แสดง" native={f.nickname} value={f.nicknameEn} onChange={(v) => setF({ ...f, nicknameEn: v })} />
        </div>

        <Field label="บทบาทระดับบริษัท (ถ้ามี)">
          <div className="flex flex-wrap gap-3">
            {GLOBAL_ROLES.map((r) => <label key={r} className="flex items-center gap-1.5 text-sm"><Checkbox checked={f.roles.includes(r)} onCheckedChange={() => setF({ ...f, roles: toggle(f.roles, r) })} />{ROLE_LABEL[r]}</label>)}
          </div>
          {allBranches(f) && <p className="mt-1 text-xs text-muted-foreground">Director / Super Admin ดูแลทุกสาขา — ไม่ต้องเลือกสาขา</p>}
        </Field>
        {/* owner 2026-10-09: an Area / Region Manager looks after chosen branches only */}
        {f.roles.includes("area_manager") && !allBranches(f) && (
          <div className={cn("space-y-1 rounded-2xl border p-3", err("area") && "border-red-300")}>
            <Chips label="สาขาที่ดูแล (Area Manager)" items={branches.filter((b) => b.active !== false).map((b) => ({ key: b.id, label: b.name }))}
              on={(k) => !!f.areaBranchIds?.includes(k)} toggle={(k) => setF({ ...f, areaBranchIds: toggle(f.areaBranchIds ?? [], k) })} />
            {err("area") && <p className="text-xs text-red-700">{err("area")}</p>}
          </div>
        )}

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">งานแต่ละสาขา{f.roles.some((r) => GLOBAL_ROLES.includes(r)) && <span className="font-normal text-muted-foreground"> (ถ้าสอน / ทำงานประจำสาขาด้วย)</span>}</h3>
            {free.length > 0 && (
              <NativeSelect className="ml-auto h-8 w-48" value="" placeholder="+ เพิ่มสาขา"
                onChange={(e) => e.target.value && setRows([...rows, { branchId: e.target.value, roles: ["teacher"], subjects: [], weekdays: [] }])}
                options={free.map((b) => ({ value: b.id, label: b.name }))} />
            )}
          </div>
          {(err("roles") || err("branchIds")) && <p className="text-xs text-red-700">{err("roles") || err("branchIds")}</p>}
          {rows.map((r, i) => {
            const b = branches.find((x) => x.id === r.branchId)
            const e = err(`branch:${r.branchId}`)
            return (
              <div key={r.branchId} className={cn("space-y-2 rounded-2xl border p-3", e && "border-red-300")}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{b?.name ?? r.branchId}</span>
                  <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="เอาสาขานี้ออก" onClick={() => setRows(rows.filter((_, j) => j !== i))}><TrashIcon /></Button>
                </div>
                <Chips label="บทบาท" items={BRANCH_ROLES.map((x) => ({ key: x, label: ROLE_LABEL[x] }))} on={(k) => r.roles.includes(k as never)} toggle={(k) => setRow(i, { roles: toggle(r.roles, k as never) })} />
                {r.roles.includes("teacher") && (
                  <Chips label="วิชาที่สอน" items={(b?.subjects ?? []).map((x) => ({ key: x, label: x }))} on={(k) => r.subjects.includes(k)} toggle={(k) => setRow(i, { subjects: toggle(r.subjects, k) })} />
                )}
                <Chips label="วันทำงาน (ไม่เลือก = ทุกวัน)" items={WEEK.map((d) => ({ key: String(d), label: dayShort(d) }))} on={(k) => r.weekdays.includes(Number(k) as Weekday)} toggle={(k) => setRow(i, { weekdays: toggle(r.weekdays, Number(k) as Weekday) })} />
                {e && <p className="text-xs text-red-700">{e}</p>}
              </div>
            )
          })}
        </section>

        <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!f.partTime} onCheckedChange={(v) => setF({ ...f, partTime: !!v })} /> ครู Part-time (เลือกเป็นครูสอนแทนตอนครูลาได้)</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.canLogin} onCheckedChange={(v) => setF({ ...f, canLogin: !!v })} /> มีบัญชีล็อกอินเข้าระบบ</label>
        {/* S5 (owner 2026-10-09): email is always there — required only for a login */}
        <Field label={f.canLogin ? "อีเมล *" : "อีเมล (ไม่บังคับ)"} error={err("email")}><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        {!f.canLogin && <p className="text-xs text-muted-foreground">ไม่มีสิทธิ์เข้าระบบ — เก็บข้อมูลไว้เฉยๆ (เปิดบัญชีล็อกอินภายหลังได้)</p>}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t bg-background px-4 py-3">
        <Button variant="ghost" onClick={onCancel}>ยกเลิก</Button>
        <Button onClick={submit}>{initial ? "บันทึก" : "เพิ่มบุคลากร"}</Button>
      </div>
    </>
  )
}

function Chips({ label, items, on, toggle }: { label: string; items: { key: string; label: string }[]; on: (k: string) => boolean; toggle: (k: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => (
          <button key={x.key} type="button" aria-pressed={on(x.key)} onClick={() => toggle(x.key)}
            className={cn("rounded-full border px-2.5 py-0.5 text-xs", on(x.key) ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{x.label}</button>
        ))}
      </div>
    </div>
  )
}
