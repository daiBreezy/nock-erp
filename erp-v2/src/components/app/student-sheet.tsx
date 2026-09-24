"use client"

import Link from "next/link"
import { useState } from "react"
import { BusIcon, PencilIcon, PhoneIcon, ReceiptIcon, StickyNoteIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { endTime, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { INVOICE_STATUS_LABEL, invoiceTotals } from "@/domain/rules/billing"
import { can } from "@/domain/rules/permissions"
import { sessionState } from "@/domain/rules/scheduling"
import { SUMMARY_STATUS_LABEL } from "@/domain/rules/summaries"
import type { ID } from "@/domain/types"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Pill } from "./badges"
import { StudentForm } from "./student-form"
import { avatarTone, gradeTone, initial } from "./subject-color"

export const STATUS_PILL = {
  active: { tone: "green" as const, label: "กำลังเรียน" },
  expiring: { tone: "amber" as const, label: "แพ็กเกจใกล้หมด" },
  inactive: { tone: "gray" as const, label: "ไม่มีแพ็กเกจ" },
}

/** Student detail as a side panel — opened from class cards, the students list, families… */
export function StudentSheet({ studentId, onClose }: { studentId: ID | null; onClose: () => void }) {
  return (
    <Sheet open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">{studentId && <Body id={studentId} />}</SheetContent>
    </Sheet>
  )
}

function Body({ id }: { id: ID }) {
  const stu = useStore((s) => s.students.find((x) => x.id === id))
  const families = useStore((s) => s.families)
  const entitlements = useStore((s) => s.entitlements)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const packages = useStore((s) => s.packages)
  const holidays = useStore((s) => s.holidays)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const now = useNow()
  const today = toDateStr(now)
  const [editing, setEditing] = useState(false)
  if (!stu) return null

  const fam = families.find((f) => f.id === stu.familyId)
  const status = Att.studentStatus(stu.id, entitlements, today)
  const ents = entitlements.filter((e) => e.studentId === stu.id).sort((a, b) => b.to.localeCompare(a.to))
  const mine = sessions.filter((s) => s.studentIds.includes(stu.id) && !s.cancelled)
  const upcoming = mine.filter((s) => sessionState(s, now) === "upcoming").sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 5)
  const history = attendance
    .filter((a) => a.studentId === stu.id)
    .map((a) => ({ a, s: sessions.find((x) => x.id === a.sessionId)! }))
    .filter((x) => x.s)
    .sort((x, y) => y.s.date.localeCompare(x.s.date))
    .slice(0, 8)
  const myInvoices = invoices.filter((i) => i.studentId === stu.id)
  const inClasses = classes.filter((c) => c.active && c.studentIds.includes(stu.id))
  const className = (cid: ID | null) => classes.find((c) => c.id === cid)?.name

  return (
    <>
      <SheetHeader className="border-b pb-3">
        <div className="flex items-center gap-3 pr-8">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-lg font-semibold", avatarTone(stu.id))}>{initial(stu.nickname)}</span>
          <div className="min-w-0">
            <SheetTitle className="text-lg">{stu.nickname} <span className={cn("ml-1 rounded px-1.5 py-0.5 align-middle text-xs", gradeTone(stu.grade))}>{stu.grade}</span></SheetTitle>
            <SheetDescription>{stu.name}{stu.school && ` · ${stu.school}`}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={STATUS_PILL[status].tone}>{STATUS_PILL[status].label}</Pill>
          {stu.usesBus && <Pill tone="blue"><BusIcon className="size-3" /> ใช้รถรับส่ง</Pill>}
          <div className="ml-auto flex gap-1.5">
            {can(me, "student.manage") && <Button size="xs" variant="outline" onClick={() => setEditing(true)}><PencilIcon /> แก้ไข</Button>}
            {can(me, "billing.manage") && <Button size="xs" nativeButton={false} render={<Link href={`/billing?new=${stu.id}`} />}><ReceiptIcon /> ออกใบแจ้งหนี้</Button>}
          </div>
        </div>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6 text-sm">
        {stu.note && <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-amber-900"><StickyNoteIcon className="mt-0.5 size-4 shrink-0" />{stu.note}</p>}

        <Section title="ครอบครัว / ผู้ปกครอง">
          {!fam ? (
            <p className="text-muted-foreground">ยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปผ่าน LINE ไม่ได้</p>
          ) : (
            <div className="space-y-1.5">
              <div className="font-medium">{fam.name}</div>
              {fam.parents.map((p) => (
                <div key={p.name} className="flex flex-wrap items-center gap-2">
                  <span>{p.name}{p.primary && <span className="text-xs text-muted-foreground"> (หลัก)</span>}</span>
                  <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline"><PhoneIcon className="size-3" />{p.phone}</a>
                  <Pill tone={p.lineLinked ? "green" : "amber"}>{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="แพ็กเกจ">
          {ents.length === 0 && <p className="text-muted-foreground">ยังไม่มีแพ็กเกจ</p>}
          <ul className="space-y-2">
            {ents.map((e) => {
              const b = Att.balance(e, sessions, attendance)
              const expired = e.to < today
              return (
                <li key={e.id} className={cn("rounded-lg border p-2.5", expired && "opacity-50")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{courses.find((c) => c.id === e.courseId)?.name}</span>
                    <Pill tone={expired ? "gray" : "blue"}>{e.kind === "subscription" ? "รายเดือน" : "นับคาบ"}</Pill>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {className(e.classId)} · {fmtDate(e.from)} → {fmtDate(e.to, { year: true })}
                  </div>
                  <div className="mt-1 text-xs">
                    {e.kind === "sessions" ? <>เหลือ <b>{b.remaining}</b>/{b.total} คาบ</> : <>เรียนแล้ว {b.used} คาบ</>}
                    {" · "}ลาแล้ว {Att.leavesUsed(e, sessions, attendance)}/{Att.leaveQuota(e)} ครั้ง
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>

        <Section title={`คลาสที่เรียน (${inClasses.length})`}>
          {inClasses.map((c) => <div key={c.id}>{c.name} <span className="text-xs text-muted-foreground">· {["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."][c.weekday]} {c.start}</span></div>)}
          {!inClasses.length && <p className="text-muted-foreground">—</p>}
        </Section>

        <Section title="คาบถัดไป">
          {upcoming.length === 0 && <p className="text-muted-foreground">ไม่มีคาบที่นัดไว้</p>}
          {upcoming.map((s) => (
            <div key={s.id} className="flex justify-between gap-2">
              <span>{fmtDate(s.date, { weekday: true })} {s.start}–{endTime(s.start, s.minutes)}</span>
              <span className="truncate text-muted-foreground">{className(s.classId) ?? s.subject}</span>
            </div>
          ))}
        </Section>

        <Section title="เข้าเรียนล่าสุด">
          {history.length === 0 && <p className="text-muted-foreground">ยังไม่มีประวัติ</p>}
          {history.map(({ a, s }) => {
            const sm = summaries.find((x) => x.sessionId === s.id && x.studentId === stu.id)
            return (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-20 shrink-0">{fmtDate(s.date)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{className(s.classId) ?? s.subject}</span>
                <Pill tone={a.status === "present" ? "green" : a.status === "absent" ? "red" : "amber"}>{a.status === "present" ? "มา" : a.status === "absent" ? "ขาด" : "ลา"}</Pill>
                {sm && <span className="text-xs text-muted-foreground">{SUMMARY_STATUS_LABEL[sm.status]}</span>}
              </div>
            )
          })}
        </Section>

        {can(me, "billing.view") && (
          <Section title="ใบแจ้งหนี้">
            {myInvoices.length === 0 && <p className="text-muted-foreground">—</p>}
            {myInvoices.map((i) => {
              const branch = branches.find((b) => b.id === i.branchId)!
              return (
                <Link key={i.id} href={`/billing?open=${i.id}`} className="flex items-center gap-2 hover:underline">
                  <span className="w-40 truncate tabular-nums">{i.number ?? "ร่าง"}</span>
                  <span className="flex-1 tabular-nums">{fmtMoney(invoiceTotals(i, { branch, courses, packages, classes, holidays }).total)}</span>
                  <span className="text-xs text-muted-foreground">{INVOICE_STATUS_LABEL[i.status]}</span>
                </Link>
              )
            })}
          </Section>
        )}
      </div>
      {editing && <StudentForm student={stu} onClose={() => setEditing(false)} />}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}
