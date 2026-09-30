"use client"

import { useState } from "react"
import { CheckIcon, PencilIcon, PlusIcon, ReceiptTextIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { NOTIFY_LABEL } from "@/domain/rules/settings"
import type { Brand, FormLang, NotifyKey, SystemConfig } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { SaveRow, SettingsCard } from "./common"
import { HolidayPlanner } from "./holiday-planner"

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

/** Company-wide calendar — same planner as the branch view, in company mode. */
function GlobalHolidays() {
  return (
    <SettingsCard title="วันหยุดบริษัท (Holidays)" hint="วันหยุดตามประเพณี + วันหยุดบริษัท — ทุกสาขาเห็นในแท็บวันหยุดของตัวเอง และเลือกเปิดทำการเป็นรายสาขาได้">
      <HolidayPlanner />
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
        <Field label="ภาษา (ค่าเริ่มต้นของฟอร์มผู้ปกครองด้วย)"><NativeSelect value={p.language} onChange={(e) => set({ language: e.target.value as FormLang })} options={[{ value: "th", label: "ไทย" }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]} /></Field>
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
