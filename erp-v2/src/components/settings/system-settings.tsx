"use client"

import { useState } from "react"
import { CalendarDaysIcon, CheckIcon, PencilIcon, PlusIcon, ReceiptTextIcon, TrashIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, toDateStr } from "@/domain/dates"
import { holidayImpact } from "@/domain/rules/scheduling"
import { NOTIFY_LABEL } from "@/domain/rules/settings"
import type { Brand, NotifyKey, SystemConfig } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { SaveRow, SettingsCard } from "./common"

const BRANDS: { id: Brand; label: string }[] = [{ id: "nockacademy", label: "Nockacademy" }, { id: "liclass", label: "Liclass" }]

/** Settings → System (staging): brand-wide catalogs + preferences. Each card saves on its own. */
export function SystemSettingsView() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">แคตตาล็อกกลาง (Global Catalogs)</h2>
      <SubjectCatalog />
      <GlobalHolidays />
      <InvoiceMemos />
      <h2 className="pt-2 text-sm font-semibold text-muted-foreground">ค่าระบบ</h2>
      <Preferences />
      <NotificationPrefs />
    </div>
  )
}

function useSystemDraft() {
  const sys = useStore((s) => s.system)
  const saveSystem = useStore((s) => s.saveSystem)
  const [d, setD] = useState<SystemConfig>(sys)
  return { d, setD, sys, dirty: JSON.stringify(d) !== JSON.stringify(sys), reset: () => setD(sys), save: (msg: string) => report(saveSystem(d), msg) }
}

function SubjectCatalog() {
  const subjects = useStore((s) => s.system.subjects)
  const sys = useStore((s) => s.system)
  const saveSystem = useStore((s) => s.saveSystem)
  const rename = useStore((s) => s.renameSubject)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [adding, setAdding] = useState("")
  return (
    <SettingsCard title="วิชา (Subjects)" hint="เปลี่ยนชื่อวิชาที่สอนทุกสาขา — ชื่อที่แสดงอัปเดตทุกที่ (คอร์ส คลาส คาบ ตารางราคา) · สาขาเลือกวิชาจากรายการนี้">
      <div className="divide-y rounded-2xl border">
        {subjects.map((s) => (
          <div key={s} className="flex items-center gap-2 p-2 text-sm">
            {editing === s ? (
              <>
                <Input autoFocus className="h-8 flex-1" value={name} onChange={(e) => setName(e.target.value)} />
                <Button size="icon-sm" aria-label="บันทึก" onClick={() => report(rename(s, name), `เปลี่ยนชื่อเป็น ${name.trim()} ทุกที่แล้ว`) && setEditing(null)}><CheckIcon /></Button>
                <Button size="icon-sm" variant="ghost" aria-label="ยกเลิก" onClick={() => setEditing(null)}><XIcon /></Button>
              </>
            ) : (
              <>
                <span className="flex-1">{s}</span>
                <Button size="icon-sm" variant="ghost" aria-label="เปลี่ยนชื่อ" onClick={() => { setEditing(s); setName(s) }}><PencilIcon /></Button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input className="h-8 max-w-60" value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="เพิ่มวิชาใหม่ เช่น Eng (Grammar)" />
        <Button size="sm" variant="outline" disabled={!adding.trim()} onClick={() => report(saveSystem({ ...sys, subjects: [...subjects, adding.trim()] }), `เพิ่มวิชา ${adding.trim()} แล้ว — เปิดใช้ที่แท็บ Subjects ของแต่ละสาขา`) && setAdding("")}><PlusIcon /> เพิ่ม</Button>
      </div>
    </SettingsCard>
  )
}

/** Company-wide calendar (Holiday.branchId === null) — applies to every branch immediately. */
function GlobalHolidays() {
  const holidays = useStore((s) => s.holidays).filter((h) => h.branchId === null).sort((a, b) => a.date.localeCompare(b.date))
  const sessions = useStore((s) => s.sessions)
  const add = useStore((s) => s.addHoliday)
  const remove = useStore((s) => s.removeHoliday)
  const today = toDateStr(useNow())
  const [date, setDate] = useState("")
  const [name, setName] = useState("")
  const [cancel, setCancel] = useState(true)
  const impact = date ? holidayImpact(date, null, sessions) : []
  return (
    <SettingsCard title="วันหยุดกลาง (Holidays)" hint="ปฏิทินวันหยุดของบริษัท — มีผลกับทุกสาขาทันที · วันหยุดเฉพาะสาขาเพิ่มที่แท็บวันหยุดของสาขานั้น">
      <div className="divide-y rounded-2xl border">
        {holidays.length === 0 && <p className="p-5 text-center text-sm text-muted-foreground">ยังไม่มีวันหยุดกลาง</p>}
        {holidays.map((h) => (
          <div key={h.id} className={cn("flex items-center gap-2 p-2.5 text-sm", h.date < today && "opacity-60")}>
            <CalendarDaysIcon className="size-4 text-muted-foreground" />
            <span className="w-36">{fmtDate(h.date, { weekday: true, year: true })}</span>
            <span className="flex-1">{h.name}</span>
            <Button size="icon-xs" variant="ghost" aria-label="ลบ" onClick={() => report(remove(h.id), "ลบวันหยุดแล้ว")}><TrashIcon /></Button>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 rounded-2xl border p-3">
        <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
          <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder="ชื่อวันหยุด" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {date && impact.length > 0 && (
          <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
            ทุกสาขารวม <b>{impact.length} คาบ</b> ในวันนั้น
            <label className="mt-1 flex items-center gap-2"><Checkbox checked={cancel} onCheckedChange={(v) => setCancel(!!v)} /> ยกเลิกคาบเหล่านี้ + แจ้งทีม</label>
          </div>
        )}
        <Button size="sm" disabled={!date || !name.trim()} onClick={() => report(add({ date, name, branchId: null }, cancel), "เพิ่มวันหยุดกลางแล้ว") && (setDate(""), setName(""))}><PlusIcon /> เพิ่มวันหยุดกลาง</Button>
      </div>
    </SettingsCard>
  )
}

function InvoiceMemos() {
  const { d, setD, dirty, reset, save } = useSystemDraft()
  return (
    <SettingsCard title="Invoice Memo" hint="Memo เริ่มต้น 1 ข้อความต่อแบรนด์ — ทุกสาขาของแบรนด์นั้นใช้ร่วมกัน พิมพ์บนใบแจ้งหนี้ใหม่ทุกใบ (แก้เฉพาะใบได้)">
      <div className="grid gap-3 sm:grid-cols-2">
        {BRANDS.map((br) => (
          <Field key={br.id} label={br.label}>
            <Textarea rows={3} value={d.invoiceMemos[br.id]} onChange={(e) => setD({ ...d, invoiceMemos: { ...d.invoiceMemos, [br.id]: e.target.value } })} placeholder="เช่น กรุณาชำระภายใน 5 วัน" />
          </Field>
        ))}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึก Invoice Memo แล้ว")} />
    </SettingsCard>
  )
}

function Preferences() {
  const { d, setD, dirty, reset, save } = useSystemDraft()
  const p = d.preferences
  const set = (patch: Partial<SystemConfig["preferences"]>) => setD({ ...d, preferences: { ...p, ...patch } })
  return (
    <SettingsCard title="System Preferences" hint="ค่าเริ่มต้นของทั้งระบบ">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ภาษา"><NativeSelect value={p.language} onChange={(e) => set({ language: e.target.value as "th" | "en" })} options={[{ value: "th", label: "ไทย" }, { value: "en", label: "English" }]} /></Field>
        <Field label="เขตเวลา"><NativeSelect value={p.timezone} onChange={(e) => set({ timezone: e.target.value })} options={[{ value: "Asia/Bangkok (UTC+7)", label: "Asia/Bangkok (UTC+7)" }]} /></Field>
        <Field label="สกุลเงิน"><NativeSelect value={p.currency} onChange={(e) => set({ currency: e.target.value })} options={[{ value: "THB (฿)", label: "THB (฿)" }]} /></Field>
        <Field label="รูปแบบวันที่">
          <NativeSelect value={p.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as SystemConfig["preferences"]["dateFormat"] })} options={[{ value: "th-short", label: "จ. 28 ก.ย. 69" }, { value: "iso", label: "2026-09-28" }]} />
        </Field>
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึกค่าระบบแล้ว")} />
    </SettingsCard>
  )
}

function NotificationPrefs() {
  const { d, setD, dirty, reset, save } = useSystemDraft()
  const st = d.settings
  const setNotify = (k: NotifyKey, ch: "inApp" | "line", v: boolean) => setD({ ...d, settings: { ...st, notify: { ...st.notify, [k]: { ...st.notify[k], [ch]: v } } } })
  return (
    <SettingsCard title="การแจ้งเตือน (Notification Preferences)" hint="เปิด/ปิดแจ้งเตือนแต่ละประเภท ในระบบ และทาง LINE">
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr><th className="p-2 text-left font-medium">ประเภท</th><th className="p-2 font-medium">ในระบบ</th><th className="p-2 font-medium">LINE</th></tr>
          </thead>
          <tbody>
            {(Object.keys(NOTIFY_LABEL) as NotifyKey[]).map((k) => (
              <tr key={k} className="border-t">
                <td className="p-2">{NOTIFY_LABEL[k]}</td>
                <td className="p-2 text-center"><Switch size="sm" checked={st.notify[k].inApp} onCheckedChange={(v) => setNotify(k, "inApp", v)} /></td>
                <td className="p-2 text-center"><Switch size="sm" checked={st.notify[k].line} onCheckedChange={(v) => setNotify(k, "line", v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="เตือนคาบใกล้หมด เมื่อเหลือ ≤ (คาบ)"><Input type="number" min={0} value={st.lowSessionThreshold} onChange={(e) => setD({ ...d, settings: { ...st, lowSessionThreshold: Number(e.target.value) } })} /></Field>
        <Field label="เตือนต่อคอร์สล่วงหน้า (วัน)"><Input type="number" min={0} value={st.renewalDaysBefore} onChange={(e) => setD({ ...d, settings: { ...st, renewalDaysBefore: Number(e.target.value) } })} /></Field>
        <Field label="ครูต้องส่งสรุปภายใน (ชม.หลังเลิกคาบ)"><Input type="number" min={1} value={st.summaryDeadlineHours} onChange={(e) => setD({ ...d, settings: { ...st, summaryDeadlineHours: Number(e.target.value) } })} /></Field>
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึกการแจ้งเตือนแล้ว")} />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><ReceiptTextIcon className="size-3.5" /> Staging ยังทำส่วนนี้ไม่เสร็จ (not ready) — ตัวเลขและสวิตช์ที่นี่เป็นแบบให้ Dev ใช้อ้างอิง</p>
    </SettingsCard>
  )
}
