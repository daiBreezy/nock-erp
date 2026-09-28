"use client"

import { useState } from "react"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { fmtDate, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { hoursFor, isHoliday } from "@/domain/rules/scheduling"
import { copyHours, everyDay, validateSpecialPeriods } from "@/domain/rules/settings"
import type { Branch, OpenHours, SpecialPeriod, Weekday } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { SaveRow, SettingsCard, useBranchDraft } from "./common"
import { HolidayPlanner } from "./holiday-planner"

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

function HoursRow({ day, h, onChange }: { day: string; h: OpenHours | null; onChange: (h: OpenHours | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex w-28 items-center gap-2"><Checkbox checked={!!h} onCheckedChange={(v) => onChange(v ? { open: "09:00", close: "18:00" } : null)} />{day}</label>
      {h ? (
        <>
          <Input className="w-28" type="time" step={900} value={h.open} onChange={(e) => onChange({ ...h, open: e.target.value })} /> ถึง
          <Input className="w-28" type="time" step={900} value={h.close} onChange={(e) => onChange({ ...h, close: e.target.value })} />
        </>
      ) : <span className="text-muted-foreground">ปิด</span>}
    </div>
  )
}

function OperatingHours({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["hours", "defaultSessionMinutes"])
  const holidays = useStore((s) => s.holidays)
  const today = toDateStr(useNow())
  const [preview, setPreview] = useState(today)
  const [copyFrom, setCopyFrom] = useState<Weekday>(1)
  const setHours = (d: Weekday, h: OpenHours | null) => setB({ ...b, hours: { ...b.hours, [d]: h } })

  // preview reads the SAVED branch, the same way scheduling will
  const ph = hoursFor(branch, preview)
  const phHoliday = isHoliday(preview, branch.id, holidays)
  const phSpecial = branch.specialPeriods.find((p) => p.from <= preview && preview <= p.to)

  return (
    <div className="space-y-4">
      <SettingsCard title="พรีวิว" hint="เลือกวันที่เพื่อดูว่าสาขาเปิดกี่โมงในวันนั้นจริงๆ (รวมวันหยุด/ช่วงเวลาพิเศษ)">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Input type="date" className="w-44" value={preview} onChange={(e) => setPreview(e.target.value || today)} />
          <span>{fmtDate(preview, { weekday: true, year: true })}</span>
          {phHoliday ? <Pill tone="red">วันหยุด: {phHoliday.name}</Pill> : ph ? <Pill tone="green">เปิด {ph.open}–{ph.close}</Pill> : <Pill>ปิด</Pill>}
          {phSpecial && !phHoliday && <Pill tone="violet">ช่วงพิเศษ: {phSpecial.name}</Pill>}
        </div>
      </SettingsCard>

      <SettingsCard title="เวลาเปิด-ปิด (Operating Hours)" hint="เวลาเปิดรายวัน — ใช้ตรวจตอนสร้างคลาส/ย้ายคาบ และแรเงาในปฏิทิน">
        <div className="space-y-1.5">
          {WEEK.map((d) => <HoursRow key={d} day={TH_DAYS_FULL[d]} h={b.hours[d]} onChange={(h) => setHours(d, h)} />)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2 text-sm">
          คัดลอกเวลาของ
          <select className="h-8 rounded-full border bg-background px-2" value={copyFrom} onChange={(e) => setCopyFrom(Number(e.target.value) as Weekday)}>
            {WEEK.map((d) => <option key={d} value={d}>{TH_DAYS_FULL[d]}</option>)}
          </select>
          ไปที่
          <Button size="xs" variant="outline" onClick={() => setB({ ...b, hours: copyHours(b.hours, copyFrom, "weekdays") })}>วันธรรมดา (จ.–ศ.)</Button>
          <Button size="xs" variant="outline" onClick={() => setB({ ...b, hours: copyHours(b.hours, copyFrom, "weekend") })}>เสาร์–อาทิตย์</Button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="ความยาวคาบมาตรฐาน (นาที)">
            <Input type="number" min={15} step={15} value={b.defaultSessionMinutes} onChange={(e) => setB({ ...b, defaultSessionMinutes: Number(e.target.value) })} />
          </Field>
        </div>
        <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึกเวลาเปิด-ปิดแล้ว")} />
      </SettingsCard>

    </div>
  )
}

type Sub = "operating" | "special" | "holidays"

/** Scheduling (owner design 2026-09-28): sub-tabs Operating / Special / Holidays.
 *  Staff without settings.manage (Admin/Manager) only get the Holidays sub-tab. */
export function SchedulingTab({ branch, holidaysOnly = false }: { branch: Branch; holidaysOnly?: boolean }) {
  const [sub, setSub] = useState<Sub>(holidaysOnly ? "holidays" : "operating")
  const tabs: { id: Sub; label: string }[] = holidaysOnly
    ? [{ id: "holidays", label: "วันหยุด" }]
    : [{ id: "operating", label: "เวลาปกติ" }, { id: "special", label: "ช่วงเวลาพิเศษ" }, { id: "holidays", label: "วันหยุด" }]
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full bg-muted p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} className={cn("rounded-full px-4 py-1 text-sm", sub === t.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{t.label}</button>
        ))}
      </div>
      {sub === "operating" && <OperatingHours branch={branch} />}
      {sub === "special" && <SpecialPeriodsCard branch={branch} />}
      {sub === "holidays" && <HolidayPlanner branch={branch} />}
    </div>
  )
}

function SpecialPeriodsCard({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["specialPeriods"])
  const today = toDateStr(useNow())
  const update = (id: string, patch: Partial<SpecialPeriod>) => setB({ ...b, specialPeriods: b.specialPeriods.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const add = () => setB({ ...b, specialPeriods: [...b.specialPeriods, { id: uid("sp"), name: "Summer", from: today, to: today, hours: everyDay({ open: "08:00", close: "22:00" }) }] })
  const list = [...b.specialPeriods].sort((x, y) => x.from.localeCompare(y.from))
  const err = validateSpecialPeriods(b.specialPeriods)
  return (
    <SettingsCard title={`ช่วงเวลาพิเศษ (${b.specialPeriods.length})`}
      hint="ช่วงวันที่ที่โรงเรียนเปิด-ปิดไม่เหมือนปกติ เช่น Summer เปิด 08:00–22:00 ทุกวัน — ระหว่างช่วงนี้ระบบใช้เวลาของช่วงแทนเวลาปกติ (ตอนสร้างคลาส/ย้ายคาบ/ฟอร์ม Trial) · วันปิดทั้งวันใส่ที่แท็บวันหยุด"
      action={<Button size="xs" variant="outline" onClick={add}><PlusIcon /> เพิ่มช่วง</Button>}>
      {list.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">ยังไม่มีช่วงเวลาพิเศษ</p>}
      <div className="space-y-3">
        {list.map((p) => (
          <SpecialPeriodEditor key={p.id} p={p} normal={b.hours} today={today} onChange={(patch) => update(p.id, patch)} onRemove={() => setB({ ...b, specialPeriods: b.specialPeriods.filter((x) => x.id !== p.id) })} />
        ))}
      </div>
      {err && list.length > 0 && <p className="mt-2 text-xs text-red-700">{err}</p>}
      <SaveRow dirty={dirty} onReset={reset} onSave={() => (err ? report({ ok: false, error: err }, "") : save("บันทึกช่วงเวลาพิเศษแล้ว"))} />
    </SettingsCard>
  )
}

function SpecialPeriodEditor({ p, normal, today, onChange, onRemove }: { p: SpecialPeriod; normal: Branch["hours"]; today: string; onChange: (patch: Partial<SpecialPeriod>) => void; onRemove: () => void }) {
  const [all, setAll] = useState<OpenHours>({ open: "08:00", close: "22:00" })
  const status = p.to < today ? { tone: "gray" as const, label: "ผ่านไปแล้ว" } : p.from <= today ? { tone: "green" as const, label: "ใช้อยู่ตอนนี้" } : { tone: "blue" as const, label: "กำลังจะถึง" }
  const fmt = (h: OpenHours | null) => (h ? `${h.open}–${h.close}` : "ปิด")
  return (
    <div className="space-y-3 rounded-2xl border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="ชื่อช่วง" className="min-w-40 flex-1"><Input value={p.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="เช่น Summer" /></Field>
        <Field label="ตั้งแต่"><Input type="date" value={p.from} onChange={(e) => onChange({ from: e.target.value })} /></Field>
        <Field label="ถึง"><Input type="date" value={p.to} onChange={(e) => onChange({ to: e.target.value })} /></Field>
        <Pill tone={status.tone}>{status.label}</Pill>
        <Button size="icon" variant="ghost" aria-label="ลบช่วง" onClick={onRemove}><TrashIcon /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 p-2 text-sm">
        เปิดทุกวัน
        <Input className="h-8 w-28" type="time" step={900} value={all.open} onChange={(e) => setAll({ ...all, open: e.target.value })} /> ถึง
        <Input className="h-8 w-28" type="time" step={900} value={all.close} onChange={(e) => setAll({ ...all, close: e.target.value })} />
        <Button size="xs" onClick={() => onChange({ hours: everyDay(all) })}>ใช้กับทุกวัน</Button>
        <span className="text-xs text-muted-foreground">หรือปรับรายวันด้านล่าง</span>
      </div>
      <div className="space-y-1.5">
        {WEEK.map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-2">
            <HoursRow day={TH_DAYS_FULL[d]} h={p.hours[d]} onChange={(h) => onChange({ hours: { ...p.hours, [d]: h } })} />
            {fmt(p.hours[d]) !== fmt(normal[d]) && <span className="text-[11px] text-muted-foreground">ปกติ {fmt(normal[d])}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
