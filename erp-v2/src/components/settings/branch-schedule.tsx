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
import { copyHours } from "@/domain/rules/settings"
import type { Branch, OpenHours, Weekday } from "@/domain/types"
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

      <BreaksCard branch={branch} />
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

/** Kept from erp-v2 (staging does not track breaks) — pending owner decision whether to drop it. */
function BreaksCard({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["breaks"])
  const setBreaks = (d: Weekday, list: Branch["breaks"][Weekday]) => setB({ ...b, breaks: { ...b.breaks, [d]: list } })
  return (
    <SettingsCard title="เวลาพัก" hint="ห้ามลงคาบทับเวลาพัก (override ได้พร้อมเหตุผล) — ⚠️ Staging ไม่มีส่วนนี้ รอเจ้าของยืนยันว่าจะเก็บไว้ไหม">
      <div className="space-y-1.5">
        {WEEK.filter((d) => b.hours[d]).map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-28">{TH_DAYS_FULL[d]}</span>
            {b.breaks[d].map((br, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full border px-2 py-0.5">
                <input className="w-16 bg-transparent" type="time" value={br.start} onChange={(e) => setBreaks(d, b.breaks[d].map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />–
                <input className="w-16 bg-transparent" type="time" value={br.end} onChange={(e) => setBreaks(d, b.breaks[d].map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                <button aria-label="ลบ" onClick={() => setBreaks(d, b.breaks[d].filter((_, j) => j !== i))}><TrashIcon className="size-3.5" /></button>
              </span>
            ))}
            <Button size="xs" variant="ghost" onClick={() => setBreaks(d, [...b.breaks[d], { start: "12:00", end: "13:00", label: "พัก" }])}><PlusIcon /> เพิ่ม</Button>
          </div>
        ))}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึกเวลาพักแล้ว")} />
    </SettingsCard>
  )
}

function SpecialPeriodsCard({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["specialPeriods"])
  const update = (i: number, patch: Partial<Branch["specialPeriods"][number]>) => setB({ ...b, specialPeriods: b.specialPeriods.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  return (
    <SettingsCard title={`ช่วงเวลาพิเศษ (${b.specialPeriods.length})`} hint="เวลาเปิดแบบอื่นในช่วงวันที่ (เช่น ปิดเทอม/ช่วงสอบ) — วันปิดทั้งวันให้ใส่ที่แท็บวันหยุด"
      action={<Button size="xs" variant="outline" onClick={() => setB({ ...b, specialPeriods: [...b.specialPeriods, { id: uid("sp"), name: "ปิดเทอม", from: toDateStr(new Date()), to: toDateStr(new Date()), hours: { ...b.hours } }] })}><PlusIcon /> เพิ่มช่วง</Button>}>
      {b.specialPeriods.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">ยังไม่มีช่วงเวลาพิเศษ</p>}
      <div className="space-y-3">
        {b.specialPeriods.map((p, i) => (
          <div key={p.id} className="space-y-2 rounded-2xl border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="ชื่อ" className="min-w-40 flex-1"><Input value={p.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
              <Field label="ตั้งแต่"><Input type="date" value={p.from} onChange={(e) => update(i, { from: e.target.value })} /></Field>
              <Field label="ถึง"><Input type="date" value={p.to} onChange={(e) => update(i, { to: e.target.value })} /></Field>
              <Button size="icon" variant="ghost" aria-label="ลบช่วง" onClick={() => setB({ ...b, specialPeriods: b.specialPeriods.filter((_, j) => j !== i) })}><TrashIcon /></Button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {WEEK.map((d) => <HoursRow key={d} day={TH_DAYS_FULL[d]} h={p.hours[d]} onChange={(h) => update(i, { hours: { ...p.hours, [d]: h } })} />)}
            </div>
            {p.from > p.to && <p className="text-xs text-red-700">วันสิ้นสุดต้องหลังวันเริ่ม</p>}
          </div>
        ))}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => (b.specialPeriods.some((p) => p.from > p.to) ? report({ ok: false, error: "วันสิ้นสุดต้องหลังวันเริ่ม" }, "") : save("บันทึกช่วงเวลาพิเศษแล้ว"))} />
    </SettingsCard>
  )
}
