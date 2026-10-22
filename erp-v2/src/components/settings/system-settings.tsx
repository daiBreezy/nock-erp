"use client"

import { useEffect, useState } from "react"
import { BellIcon, BookOpenIcon, CalendarDaysIcon, ClipboardListIcon, SparklesIcon, CheckIcon, PencilIcon, PlusIcon, ReceiptTextIcon, SlidersHorizontalIcon, UsersIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { NOTIFY_LABEL, subjectAbbr } from "@/domain/rules/settings"
import type { Brand, FormLang, LossReason, NotifyKey, SystemConfig } from "@/domain/types"
import * as Loss from "@/domain/rules/loss"
import * as Survey from "@/domain/rules/survey"
import Link from "next/link"
import { addDays, fmtDate, toDateStr, yearOf } from "@/domain/dates"
import { useNow, useQueryState } from "@/lib/hooks"
import { Tabs } from "@/components/app/page-layout"
import { pullSurveyResponses, remindSurvey, sendYearlySurvey, surveyLink } from "@/lib/forms"
import { cn } from "@/lib/utils"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { SaveRow, SettingsCard } from "./common"
import { FormsList } from "@/components/forms/form-builder"
import { HolidayPlanner } from "./holiday-planner"
import { AiSettings } from "./ai-settings"
import { SubjectColorPicker } from "./subject-color-picker"
import { SUBJECT_PALETTE, subjectColor, subjectColorKey } from "@/components/app/subject-color"
import { tx, nm } from "@/lib/i18n"

const BRANDS: { id: Brand; label: string }[] = [{ id: "nockacademy", label: "Nockacademy" }, { id: "liclass", label: "Liclass" }]

/** Settings → System (owner 2026-10-06): was one long scroll of 7 cards — split into the same left-nav tab
 *  tabs as Settings → Branch, grouped by what an admin is actually trying to do. */
const SYSTEM_TABS: { id: string; label: string; icon: typeof SlidersHorizontalIcon; body: () => React.ReactNode }[] = [
  { id: "general", label: "ทั่วไป", icon: SlidersHorizontalIcon, body: () => <Preferences /> },
  // owner 2026-10-13: subjects and holidays are different topics — one tab each
  { id: "subjects", label: "วิชา", icon: BookOpenIcon, body: () => <SubjectCatalog /> },
  { id: "holidays", label: "วันหยุด", icon: CalendarDaysIcon, body: () => <GlobalHolidays /> },
  { id: "billing", label: "การเงิน", icon: ReceiptTextIcon, body: () => <InvoiceMemos /> },
  { id: "customers", label: "ลูกค้าและ CRM", icon: UsersIcon, body: () => <><LossReasons /><YearlySurvey /></> },
  // owner 2026-10-22: the form builder — the company makes its own forms and tunes the ERP's
  { id: "forms", label: "ฟอร์ม", icon: ClipboardListIcon, body: () => <FormsList /> },
  { id: "notifications", label: "การแจ้งเตือน", icon: BellIcon, body: () => <NotificationPrefs /> },
  // owner 2026-10-14: the AI model Nock uses — set here like LINE Integration
  { id: "ai", label: "AI (Nock)", icon: SparklesIcon, body: () => <><AiHelperToggle /><AiSettings /></> },
]

/** Settings → System: brand-wide catalogs + preferences. Each card saves on its own.
 *  Owner 2026-10-13: the same underline tabs as the branch page and Reports (was a left menu). */
export function SystemSettingsView() {
  const [tab, setTab] = useQueryState<string>("sys", SYSTEM_TABS[0].id)
  const current = SYSTEM_TABS.find((t) => t.id === tab) ?? SYSTEM_TABS[0]
  return (
    <div className="space-y-4">
      <Tabs value={current.id} onChange={setTab} options={SYSTEM_TABS.map((t) => ({ value: t.id, label: tx(t.label), icon: t.icon }))} />
      <div key={current.id} className="space-y-4">{current.body()}</div>
    </div>
  )
}

/** owner 2026-10-15: เปิด/ปิด AI Helper — switching saves right away (one switch, nothing to review) */
function AiHelperToggle() {
  const sys = useStore((s) => s.system)
  const saveSystem = useStore((s) => s.saveSystem)
  const on = sys.aiHelper !== false
  return (
    <SettingsCard title={tx("AI Helper (Nock)")} hint={tx("ผู้ช่วย Nock ที่มุมจอ — ปิดแล้วทุกคนจะไม่เห็นปุ่ม Nock ในทุกหน้า (คลังความรู้ยังอยู่ เปิดกลับมาได้ทุกเมื่อ)")}
      action={<Switch checked={on} onCheckedChange={(v) => report(saveSystem({ ...sys, aiHelper: v }), v ? tx("เปิด AI Helper แล้ว") : tx("ปิด AI Helper แล้ว"))} aria-label={tx("เปิด/ปิด AI Helper")} />}>
      <p className="text-sm text-muted-foreground">{on ? tx("เปิดอยู่ — ทุกคนเห็น Nock ที่มุมจอ") : tx("ปิดอยู่ — ไม่มีใครเห็น Nock")}</p>
    </SettingsCard>
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
  // a new subject starts on a colour no other subject uses yet
  const freeColor = Object.keys(SUBJECT_PALETTE).find((k) => !subjects.some((x) => subjectColorKey(x) === k)) ?? "slate"
  const [addColor, setAddColor] = useState<string | null>(null)
  const setColor = (subject: string, key: string) => report(saveSystem({ ...sys, subjectColors: { ...sys.subjectColors, [subject]: key } }), tx("เปลี่ยนสีวิชา {0} แล้ว", [subject]))
  return (
    <SettingsCard title={tx("วิชา (Subjects)")} hint={tx("เปลี่ยนชื่อวิชาที่สอนทุกสาขา — ชื่อที่แสดงอัปเดตทุกที่ (คอร์ส คลาส คาบ ตารางราคา) · สาขาเลือกวิชาจากรายการนี้ · ช่อง English / 日本語 = ชื่อที่ฟอร์มผู้ปกครองแสดงในภาษานั้น (ว่าง = ใช้ชื่อไทย)")}>
      <div className="divide-y rounded-2xl border">
        {subjects.map((s) => (
          <div key={s} className="flex items-center gap-2 p-2 text-sm">
            {editing === s ? (
              <>
                <Input autoFocus className="h-8 flex-1" value={name} onChange={(e) => setName(e.target.value)} />
                <Button size="icon-sm" aria-label={tx("บันทึก")} onClick={() => report(rename(s, name), tx("เปลี่ยนชื่อเป็น {0} ทุกที่แล้ว", [name.trim()])) && setEditing(null)}><CheckIcon /></Button>
                <Button size="icon-sm" variant="ghost" aria-label={tx("ยกเลิก")} onClick={() => setEditing(null)}><XIcon /></Button>
              </>
            ) : (
              <>
                <SubjectColorPicker label={s} value={subjectColorKey(s)} onChange={(k) => setColor(s, k)} />
                <span className="flex-1"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(s).chip)}>{s}</span></span>
                {/* owner 2026-10-15: the short code (En / Ma …) for tight spots — empty = the standard one shown greyed */}
                <Input key={`${s}-abbr-${sys.subjectNames?.[s]?.abbr ?? ""}`} className="h-8 w-16 text-center" aria-label={tx("ตัวย่อ")} title={tx("ตัวย่อ")}
                  placeholder={subjectAbbr(s, { ...sys.subjectNames, [s]: { ...sys.subjectNames?.[s], abbr: undefined } })} defaultValue={sys.subjectNames?.[s]?.abbr ?? ""} maxLength={4}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v === (sys.subjectNames?.[s]?.abbr ?? "")) return
                    report(saveSystem({ ...sys, subjectNames: { ...sys.subjectNames, [s]: { ...sys.subjectNames?.[s], abbr: v || undefined } } }), tx("บันทึกตัวย่อของ {0} แล้ว", [s]))
                  }} />
                {/* how the parent form shows it in English / Japanese — saved when leaving the box */}
                {(["en", "ja"] as const).map((l) => (
                  <Input key={`${s}-${l}-${sys.subjectNames?.[s]?.[l] ?? ""}`} className="h-8 w-28" placeholder={l === "en" ? "English" : "日本語"} defaultValue={sys.subjectNames?.[s]?.[l] ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v === (sys.subjectNames?.[s]?.[l] ?? "")) return
                      report(saveSystem({ ...sys, subjectNames: { ...sys.subjectNames, [s]: { ...sys.subjectNames?.[s], [l]: v || undefined } } }), tx("บันทึกชื่อ{0}ของ {1} แล้ว", [l === "en" ? tx("ภาษาอังกฤษ") : tx("ภาษาญี่ปุ่น"), s]))
                    }} />
                ))}
                <Button size="icon-sm" variant="ghost" aria-label={tx("เปลี่ยนชื่อ")} onClick={() => { setEditing(s); setName(s) }}><PencilIcon /></Button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <SubjectColorPicker label={adding.trim() || tx("วิชาใหม่")} value={addColor ?? freeColor} onChange={setAddColor} />
        <Input className="h-8 max-w-60" value={adding} onChange={(e) => setAdding(e.target.value)} placeholder={tx("เพิ่มวิชาใหม่ เช่น Eng (Grammar)")} />
        <Button size="sm" variant="outline" disabled={!adding.trim()} onClick={() => report(saveSystem({ ...sys, subjects: [...subjects, adding.trim()], subjectColors: { ...sys.subjectColors, [adding.trim()]: addColor ?? freeColor } }), tx("เพิ่มวิชา {0} แล้ว — เปิดใช้ที่แท็บ Subjects ของแต่ละสาขา", [adding.trim()])) && (setAdding(""), setAddColor(null))}><PlusIcon />  {tx("เพิ่ม")}</Button>
      </div>
    </SettingsCard>
  )
}

/** Company-wide calendar — same planner as the branch view, in company mode. */
function GlobalHolidays() {
  return (
    <SettingsCard title={tx("วันหยุดบริษัท (Holidays)")} hint={tx("วันหยุดตามประเพณี + วันหยุดบริษัท — ทุกสาขาเห็นในแท็บวันหยุดของตัวเอง และเลือกเปิดทำการเป็นรายสาขาได้")}>
      <HolidayPlanner />
    </SettingsCard>
  )
}

/** Why customers stop (owner 2026-10-05) — one list for the close-lead form and the student exit form (TH/EN/JP). */
function LossReasons() {
  const saved = useStore((s) => s.system.lossReasons)
  const saveList = useStore((s) => s.saveLossReasons)
  const base = Loss.lossReasonsOf(saved)
  const [list, setList] = useState<LossReason[]>(base)
  const dirty = JSON.stringify(list) !== JSON.stringify(base)
  const put = (id: string, patch: Partial<LossReason>) => setList((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const FOR = [{ value: "both", label: tx("ทั้งสองฝั่ง") }, { value: "lead", label: tx("เฉพาะ Lead") }, { value: "student", label: tx("เฉพาะนักเรียนออก") }]
  return (
    <SettingsCard title={tx("เหตุผลที่ลูกค้าหยุด / ออก")} hint={tx("ใช้ทั้งฟอร์มปิด Lead (Admin กรอก) และฟอร์มนักเรียนออก (ผู้ปกครองกรอก — แสดงตามภาษาที่เลือก) · ปิดใช้แทนการลบ เพื่อให้รายงานย้อนหลังยังอ่านได้")}
      action={<Button size="xs" variant="outline" onClick={() => setList((l) => [...l.filter((r) => r.id !== "lr_other"), { id: `lr_${Date.now().toString(36)}`, label: "", for: "both", active: true }, ...l.filter((r) => r.id === "lr_other")])}><PlusIcon />  {tx("เพิ่มเหตุผล")}</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr><th className="text-left font-normal">{tx("ไทย *")}</th><th className="text-left font-normal">English</th><th className="text-left font-normal">日本語</th><th className="text-left font-normal">{tx("ใช้กับ")}</th><th className="font-normal">{tx("ใช้งาน")}</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} className={cn("border-t", !r.active && "opacity-50")}>
              <td className="py-1 pr-1"><Input className="h-8" value={r.label} onChange={(e) => put(r.id, { label: e.target.value })} placeholder={tx("ชื่อเหตุผล")} />{r.contactOnly && <span className="text-[10px] text-muted-foreground">{tx("ใช้เมื่อยังติดต่อไม่ได้")}</span>}</td>
              <td className="py-1 pr-1"><Input className="h-8" value={r.en ?? ""} onChange={(e) => put(r.id, { en: e.target.value })} /></td>
              <td className="py-1 pr-1"><Input className="h-8" value={r.ja ?? ""} onChange={(e) => put(r.id, { ja: e.target.value })} /></td>
              <td className="py-1 pr-1"><NativeSelect className="h-8 w-40" value={r.for} onChange={(e) => put(r.id, { for: e.target.value as LossReason["for"] })} options={FOR} /></td>
              <td className="text-center"><Switch size="sm" checked={r.active} onCheckedChange={(v) => put(r.id, { active: v })} aria-label={tx("ใช้งาน")} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <SaveRow dirty={dirty} onReset={() => setList(base)} onSave={() => report(saveList(list), tx("บันทึกรายการเหตุผลแล้ว"))} />
    </SettingsCard>
  )
}

/**
 * Yearly parent survey (owner 2026-10-05): the window (Sep–Oct), this year's send-out, one reminder after 7 days.
 * Dev: send automatically on the window's first day — the prototype sends from here.
 */
function YearlySurvey() {
  const system = useStore((s) => s.system)
  const campaigns = useStore((s) => s.surveyCampaigns)
  const responses = useStore((s) => s.surveyResponses)
  const families = useStore((s) => s.families)
  const saveWindow = useStore((s) => s.saveSurveyWindow)
  const today = toDateStr(useNow(60_000))
  const year = Number(today.slice(0, 4))
  const win = Survey.surveyWindow(system, year)
  const [from, setFrom] = useState(win.from)
  const [to, setTo] = useState(win.to)
  const [busy, setBusy] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  useEffect(() => { pullSurveyResponses() }, [])
  const current = campaigns.find((c) => c.year === year)
  const answered = current ? responses.filter((r) => r.campaignId === current.id).length : 0
  const waiting = current ? Survey.notAnswered(current, responses) : []
  const dirty = from !== win.from || to !== win.to
  const send = async () => {
    setBusy(true)
    const r = await sendYearlySurvey(year, from, to)
    setBusy(false)
    report(r, (v) => tx("ส่งแบบสอบถามปี {0} แล้ว · {1} ครอบครัว (LINE {2})", [yearOf(year), v.sent, v.lineSent]))
  }
  const remind = async () => { if (!current) return; setBusy(true); const r = await remindSurvey(current); setBusy(false); report(r, (v) => tx("ส่งเตือนแล้ว {0} ครอบครัว", [v.reminded])) }
  return (
    <SettingsCard title={tx("แบบสอบถามความพึงพอใจประจำปี (ผู้ปกครอง)")} hint={tx("ปีละครั้ง ส่งให้ทุกครอบครัวที่ลูกยังเรียนอยู่ (1 ฟอร์มต่อครอบครัว ให้คะแนนแยกรายลูก · ไทย / EN / 日本語) · ไม่ตอบใน 7 วัน → เตือน 1 ครั้ง · ไม่พอใจ (แนะนำเพื่อน 0–6 หรือไม่เรียนต่อ) → แจ้ง Manager ให้โทรใน 3 วัน · ผลดูที่ Reports › ความพึงพอใจ")}>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={tx("เริ่มส่ง (ทุกปี)")}><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></Field>
        <Field label={tx("ปิดรับคำตอบ")}><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></Field>
        {dirty && <Button size="sm" onClick={() => report(saveWindow({ from: from.slice(5), to: to.slice(5) }), tx("บันทึกช่วงแบบสอบถามแล้ว"))}>{tx("บันทึกช่วง")}</Button>}
      </div>
      <div className="mt-4 rounded-2xl bg-muted/50 p-3 text-sm">
        {current ? (
          <div className="space-y-2">
            <p className="font-medium">{tx("ปี")} {yearOf(year)}{tx(": ส่งแล้ว")} {fmtDate(current.sentAt.slice(0, 10))} · {current.recipients.length}  {tx("ครอบครัว · ตอบแล้ว")} {answered} ({current.recipients.length ? Math.round((answered / current.recipients.length) * 100) : 0}%)</p>
            <p className="text-xs text-muted-foreground">{tx("ทาง LINE")} {current.recipients.filter((x) => x.viaLine).length}  {tx("· ไม่มี LINE")} {current.recipients.filter((x) => !x.viaLine).length}  {tx("(ส่งลิงก์เอง) ·")} {current.remindedAt ? tx("เตือนแล้ว {0}", [fmtDate(current.remindedAt.slice(0, 10))]) : tx("เตือนได้ตั้งแต่ {0}", [fmtDate(addDays(current.sentAt.slice(0, 10), Survey.REMIND_AFTER_DAYS))])}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy || !Survey.canRemind(current, today)} onClick={remind}>{tx("ส่งเตือนคนที่ยังไม่ตอบ (")}{waiting.filter((x) => x.viaLine).length})</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowLinks((v) => !v)}>{tx("ลิงก์ของครอบครัวที่ไม่มี LINE (")}{waiting.filter((x) => !x.viaLine).length})</Button>
              <Button size="sm" variant="ghost" nativeButton={false} render={<Link href="/reports?tab=satisfaction" />}>{tx("ดูผล ›")}</Button>
            </div>
            {showLinks && (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">{waiting.filter((x) => !x.viaLine).map((x) => (
                <li key={x.token} className="flex items-center gap-2"><span className="w-40 truncate">{nm(families.find((f) => f.id === x.familyId)?.name)}</span>
                  <button type="button" className="text-primary underline" onClick={() => { navigator.clipboard?.writeText(surveyLink(x.token)); report({ ok: true, value: undefined }, tx("คัดลอกลิงก์แล้ว")) }}>{tx("คัดลอกลิงก์")}</button></li>
              ))}</ul>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p>{tx("ปี")} {yearOf(year)}  {tx("ยังไม่ได้ส่ง")} {today < from ? tx("· ถึงช่วงส่ง {0}", [fmtDate(from)]) : ""}</p>
            <Button size="sm" className="ml-auto" disabled={busy} onClick={send}>{tx("ส่งแบบสอบถามปี")} {yearOf(year)}  {tx("ตอนนี้")}</Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{tx("ดูตัวอย่างฟอร์ม:")} <a className="text-primary underline" href="/liff/survey?preview=1" target="_blank" rel="noreferrer">{tx("เปิด")}</a></p>
      </div>
    </SettingsCard>
  )
}

function InvoiceMemos() {
  const { d, setD, dirty, reset, save } = useSystemDraft()
  return (
    <SettingsCard title="Invoice Memo" hint={tx("Memo เริ่มต้น 1 ข้อความต่อแบรนด์ — ทุกสาขาของแบรนด์นั้นใช้ร่วมกัน พิมพ์บนใบแจ้งหนี้ใหม่ทุกใบ (แก้เฉพาะใบได้)")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {BRANDS.map((br) => (
          <Field key={br.id} label={br.label}>
            <Textarea rows={3} value={d.invoiceMemos[br.id]} onChange={(e) => setD({ ...d, invoiceMemos: { ...d.invoiceMemos, [br.id]: e.target.value } })} placeholder={tx("เช่น กรุณาชำระภายใน 5 วัน")} />
          </Field>
        ))}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึก Invoice Memo แล้ว"))} />
    </SettingsCard>
  )
}

function Preferences() {
  const { d, setD, dirty, reset, save } = useSystemDraft()
  const p = d.preferences
  const set = (patch: Partial<SystemConfig["preferences"]>) => setD({ ...d, preferences: { ...p, ...patch } })
  return (
    <SettingsCard title="System Preferences" hint={tx("ค่าเริ่มต้นของทั้งระบบ")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tx("ภาษา (ค่าเริ่มต้นของฟอร์มผู้ปกครองด้วย)")}><NativeSelect value={p.language} onChange={(e) => set({ language: e.target.value as FormLang })} options={[{ value: "th", label: tx("ไทย") }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]} /></Field>
        <Field label={tx("เขตเวลา")}><NativeSelect value={p.timezone} onChange={(e) => set({ timezone: e.target.value })} options={[{ value: "Asia/Bangkok (UTC+7)", label: "Asia/Bangkok (UTC+7)" }]} /></Field>
        <Field label={tx("สกุลเงิน")}><NativeSelect value={p.currency} onChange={(e) => set({ currency: e.target.value })} options={[{ value: tx("THB (฿)"), label: tx("THB (฿)") }]} /></Field>
        <Field label={tx("รูปแบบวันที่")}>
          <NativeSelect value={p.dateFormat} onChange={(e) => set({ dateFormat: e.target.value as SystemConfig["preferences"]["dateFormat"] })} options={[{ value: "th-short", label: tx("จ. 28 ก.ย. 69") }, { value: "iso", label: "2026-09-28" }]} />
        </Field>
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึกค่าระบบแล้ว"))} />
    </SettingsCard>
  )
}

function NotificationPrefs() {
  const { d, setD, dirty, reset, save } = useSystemDraft()
  const st = d.settings
  const setNotify = (k: NotifyKey, ch: "inApp" | "line", v: boolean) => setD({ ...d, settings: { ...st, notify: { ...st.notify, [k]: { ...st.notify[k], [ch]: v } } } })
  return (
    <SettingsCard title={tx("การแจ้งเตือน (Notification Preferences)")} hint={tx("เปิด/ปิดแจ้งเตือนแต่ละประเภท ในระบบ และทาง LINE")}>
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr><th className="p-2 text-left font-medium">{tx("ประเภท")}</th><th className="p-2 font-medium">{tx("ในระบบ")}</th><th className="p-2 font-medium">LINE</th></tr>
          </thead>
          <tbody>
            {(Object.keys(NOTIFY_LABEL) as NotifyKey[]).map((k) => (
              <tr key={k} className="border-t">
                <td className="p-2">{tx(NOTIFY_LABEL[k])}</td>
                <td className="p-2 text-center"><Switch size="sm" checked={st.notify[k].inApp} onCheckedChange={(v) => setNotify(k, "inApp", v)} /></td>
                <td className="p-2 text-center"><Switch size="sm" checked={st.notify[k].line} onCheckedChange={(v) => setNotify(k, "line", v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label={tx("เตือนคาบใกล้หมด เมื่อเหลือ ≤ (คาบ)")}><Input type="number" min={0} value={st.lowSessionThreshold} onChange={(e) => setD({ ...d, settings: { ...st, lowSessionThreshold: Number(e.target.value) } })} /></Field>
        <Field label={tx("เตือนต่อคอร์สล่วงหน้า (วัน)")}><Input type="number" min={0} value={st.renewalDaysBefore} onChange={(e) => setD({ ...d, settings: { ...st, renewalDaysBefore: Number(e.target.value) } })} /></Field>
        <Field label={tx("ครูต้องส่งสรุปภายใน (ชม.หลังเลิกคาบ)")}><Input type="number" min={1} value={st.summaryDeadlineHours} onChange={(e) => setD({ ...d, settings: { ...st, summaryDeadlineHours: Number(e.target.value) } })} /></Field>
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึกการแจ้งเตือนแล้ว"))} />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><ReceiptTextIcon className="size-3.5" />  {tx("Staging ยังทำส่วนนี้ไม่เสร็จ (not ready) — ตัวเลขและสวิตช์ที่นี่เป็นแบบให้ Dev ใช้อ้างอิง")}</p>
    </SettingsCard>
  )
}
