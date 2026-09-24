"use client"

import { useState } from "react"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { fmtDate, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { holidayImpact } from "@/domain/rules/scheduling"
import type { Branch, Weekday } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

export default function SettingsPage() {
  const branch = useBranch()
  // re-mount the editor when switching branch so the draft starts from that branch
  return <BranchSettings key={branch.id} branch={branch} />
}

function BranchSettings({ branch }: { branch: Branch }) {
  const save = useStore((s) => s.saveBranch)
  const [b, setB] = useState<Branch>(branch)
  const dirty = JSON.stringify(b) !== JSON.stringify(branch)
  const setHours = (d: Weekday, h: Branch["hours"][Weekday]) => setB({ ...b, hours: { ...b.hours, [d]: h } })

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-20">
      <Section title="ข้อมูลสาขา">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="ชื่อสาขา"><Input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
          <Field label="รหัส (ใช้ในเลขใบแจ้งหนี้)"><Input value={b.code} disabled /></Field>
          <Field label="แบรนด์"><Input value={b.brand === "nockacademy" ? "Nockacademy" : "Liclass"} disabled /></Field>
          <Field label="ความยาวคาบมาตรฐาน (นาที)"><Input type="number" min={15} step={15} value={b.defaultSessionMinutes} onChange={(e) => setB({ ...b, defaultSessionMinutes: Number(e.target.value) })} /></Field>
          <Field label="ค่ารถต่อเที่ยว (บาท)"><Input type="number" min={0} value={b.busFeePerLeg} onChange={(e) => setB({ ...b, busFeePerLeg: Number(e.target.value) })} /></Field>
        </div>
      </Section>

      <Section title="เวลาเปิด-ปิด" hint="ใช้ตรวจตอนสร้างคลาส/ย้ายคาบ และแสดงพื้นที่เทาในปฏิทิน">
        <div className="space-y-1.5">
          {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => {
            const h = b.hours[d]
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex w-28 items-center gap-2"><Checkbox checked={!!h} onCheckedChange={(v) => setHours(d, v ? { open: "09:00", close: "18:00" } : null)} />{TH_DAYS_FULL[d]}</label>
                {h ? (
                  <>
                    <Input className="w-28" type="time" step={900} value={h.open} onChange={(e) => setHours(d, { ...h, open: e.target.value })} />–
                    <Input className="w-28" type="time" step={900} value={h.close} onChange={(e) => setHours(d, { ...h, close: e.target.value })} />
                  </>
                ) : <span className="text-muted-foreground">ปิด</span>}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title={`ห้องเรียน (${b.rooms.length})`} hint="จำนวนห้องใช้ตรวจ 'ห้องไม่พอ' — ลบห้องที่ยังมีคาบในอนาคตไม่ได้">
        <div className="space-y-1.5">
          {b.rooms.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2">
              <Input className="w-56" value={r.name} onChange={(e) => setB({ ...b, rooms: b.rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              <Button size="icon-sm" variant="ghost" aria-label="ลบห้อง" onClick={() => setB({ ...b, rooms: b.rooms.filter((_, j) => j !== i) })}><TrashIcon /></Button>
            </div>
          ))}
          <Button size="xs" variant="outline" onClick={() => setB({ ...b, rooms: [...b.rooms, { id: uid("rm"), name: `ห้อง ${b.rooms.length + 1}` }] })}><PlusIcon /> เพิ่มห้อง</Button>
        </div>
      </Section>

      <Section title="บัญชีธนาคาร (แสดงในใบแจ้งหนี้)" hint="แยกต่อสาขา — ตรวจให้ชื่อบัญชีตรงกับแบรนด์">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="ธนาคาร"><Input value={b.bankAccount.bank} onChange={(e) => setB({ ...b, bankAccount: { ...b.bankAccount, bank: e.target.value } })} /></Field>
          <Field label="ชื่อบัญชี"><Input value={b.bankAccount.name} onChange={(e) => setB({ ...b, bankAccount: { ...b.bankAccount, name: e.target.value } })} /></Field>
          <Field label="เลขบัญชี"><Input value={b.bankAccount.number} onChange={(e) => setB({ ...b, bankAccount: { ...b.bankAccount, number: e.target.value } })} /></Field>
        </div>
      </Section>

      <Section title="LINE Official Account">
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={b.lineOaConnected} onCheckedChange={(v) => setB({ ...b, lineOaConnected: v })} />
          {b.lineOaConnected ? "เชื่อมแล้ว — ส่งใบแจ้งหนี้/ใบเสร็จ/สรุปการเรียนทาง LINE ได้" : "ยังไม่เชื่อม — ผู้ปกครองสาขานี้ผูก LINE ไม่ได้"}
        </label>
      </Section>

      <HolidaysSection />

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur md:left-[var(--sidebar-width)]">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
            <span className="mr-auto text-sm text-muted-foreground">มีการแก้ไขที่ยังไม่บันทึก</span>
            <Button variant="ghost" onClick={() => setB(branch)}>ยกเลิก</Button>
            <Button onClick={() => report(save(b), "บันทึกการตั้งค่าสาขาแล้ว")}>บันทึก</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** A10: adding a holiday shows which sessions it hits and can cancel them + notify the team */
function HolidaysSection() {
  const branch = useBranch()
  const holidays = useStore((s) => s.holidays)
  const sessions = useStore((s) => s.sessions)
  const add = useStore((s) => s.addHoliday)
  const remove = useStore((s) => s.removeHoliday)
  const today = toDateStr(useNow())
  const [date, setDate] = useState("")
  const [name, setName] = useState("")
  const [allBranches, setAllBranches] = useState(false)
  const [cancel, setCancel] = useState(true)
  const impact = date ? holidayImpact(date, allBranches ? null : branch.id, sessions) : []
  const list = holidays.filter((h) => h.branchId === null || h.branchId === branch.id).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Section title="วันหยุด">
      <div className="space-y-1.5">
        {list.map((h) => (
          <div key={h.id} className="flex items-center gap-2 text-sm">
            <span className="w-32">{fmtDate(h.date, { weekday: true, year: true })}</span>
            <span className="flex-1">{h.name}</span>
            {h.branchId === null && <Pill>ทุกสาขา</Pill>}
            {h.date < today && <Pill>ผ่านไปแล้ว</Pill>}
            <Button size="icon-xs" variant="ghost" aria-label="ลบ" onClick={() => report(remove(h.id), "ลบวันหยุดแล้ว (คาบที่ยกเลิกไปแล้วไม่ถูกคืนอัตโนมัติ)")}><TrashIcon /></Button>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 rounded-lg border p-3">
        <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
          <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder="ชื่อวันหยุด" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={allBranches} onCheckedChange={(v) => setAllBranches(!!v)} /> ใช้กับทุกสาขา</label>
        {date && (
          impact.length ? (
            <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
              วันนี้มี <b>{impact.length} คาบ</b> · นักเรียน {impact.reduce((n, s) => n + s.studentIds.length, 0)} คน
              <label className="mt-1 flex items-center gap-2"><Checkbox checked={cancel} onCheckedChange={(v) => setCancel(!!v)} /> ยกเลิกคาบเหล่านี้ + แจ้งเตือนทีมให้ติดต่อผู้ปกครอง/นัดชดเชย</label>
            </div>
          ) : <p className="text-sm text-muted-foreground">ไม่มีคาบในวันนั้น</p>
        )}
        <Button size="sm" disabled={!date || !name.trim()} onClick={() => report(add({ date, name, branchId: allBranches ? null : branch.id }, cancel), (v) => `เพิ่มวันหยุดแล้ว${v.affected ? ` · ${cancel ? "ยกเลิก" : "กระทบ"} ${v.affected} คาบ` : ""}`) && (setDate(""), setName(""))}>
          <PlusIcon /> เพิ่มวันหยุด
        </Button>
      </div>
    </Section>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5 p-4">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-3 text-xs text-muted-foreground">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  )
}
