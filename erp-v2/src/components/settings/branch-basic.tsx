"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2Icon, CopyIcon, ExternalLinkIcon, LoaderCircleIcon, PencilIcon, PlusIcon, ShieldAlertIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROLE_LABEL, staffInBranch } from "@/domain/rules/permissions"
import { fmtDate, fmtMoney, TH_DAYS_FULL } from "@/domain/dates"
import { KNOWN_PROVINCES } from "@/domain/rules/settings"
import type { Branch } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { InfoRow, SaveRow, SettingsCard, useBranchDraft } from "./common"
import { romanizeName } from "@/domain/rules/romanize"
import { RichMenuCard } from "./rich-menu"
import { tx, nm } from "@/lib/i18n"

const BRAND_LABEL: Record<Branch["brand"], string> = { nockacademy: "Nockacademy", liclass: "Liclass" }

/** A small editable list of strings (phones, social links). */
function StringList({ values, onChange, placeholder, addLabel }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <Input value={v} placeholder={placeholder} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button size="icon" variant="ghost" aria-label={tx("ลบ")} onClick={() => onChange(values.filter((_, j) => j !== i))}><TrashIcon /></Button>
        </div>
      ))}
      <Button size="xs" variant="outline" onClick={() => onChange([...values, ""])}><PlusIcon /> {addLabel}</Button>
    </div>
  )
}

function BranchInfoForm({ branch, onDone }: { branch: Branch; onDone: () => void }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["brand", "code", "branchNo", "name", "nameEn", "province", "email", "address", "phones", "socials", "rooms"])
  const hasInvoices = useStore((s) => s.invoices.some((i) => i.branchId === branch.id && i.number))
  return (
    <SettingsCard title={tx("ข้อมูลสาขา")} hint={tx("ข้อมูลทั่วไปของสาขา — รหัสสาขาใช้ในเลขใบแจ้งหนี้/ใบเสร็จ")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tx("แบรนด์ (School type)")}>
          <NativeSelect value={b.brand} onChange={(e) => setB({ ...b, brand: e.target.value as Branch["brand"] })} options={Object.entries(BRAND_LABEL).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label={tx("รหัสสาขา (Branch ID)")} error={hasInvoices && tx("ออกใบแจ้งหนี้ไปแล้ว — เปลี่ยนรหัสไม่ได้")}>
          <Input value={b.code} disabled={hasInvoices} onChange={(e) => setB({ ...b, code: e.target.value.toUpperCase() })} />
        </Field>
        <Field label={tx("เลขสาขา (ในเลขเอกสาร 690930-01-001-0001)")} error={hasInvoices && tx("ออกเอกสารไปแล้ว — เปลี่ยนเลขไม่ได้")}>
          <Input value={b.branchNo} disabled={hasInvoices} maxLength={3} onChange={(e) => setB({ ...b, branchNo: e.target.value.replace(/\D/g, "") })} placeholder="001" />
        </Field>
        <Field label={tx("ชื่อสาขา *")}><Input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
        {/* owner 2026-10-07: shown when the UI is English / Japanese — empty = the standard spelling of the place (placeholder) */}
        <Field label={tx("ชื่อภาษาอังกฤษ")}><Input value={b.nameEn ?? ""} placeholder={romanizeName(b.name)} onChange={(e) => setB({ ...b, nameEn: e.target.value })} /></Field>
        <ProvinceField value={b.province ?? ""} onChange={(province) => setB({ ...b, province })} />
        <Field label={tx("อีเมล")}><Input type="email" value={b.email ?? ""} onChange={(e) => setB({ ...b, email: e.target.value })} /></Field>
        <Field label={tx("ที่อยู่")} className="sm:col-span-2"><Input value={b.address ?? ""} onChange={(e) => setB({ ...b, address: e.target.value })} /></Field>
        <Field label={tx("เบอร์โทร")}><StringList values={b.phones} onChange={(phones) => setB({ ...b, phones })} placeholder="02-xxx-xxxx" addLabel={tx("เพิ่มเบอร์")} /></Field>
        <Field label="Social media"><StringList values={b.socials} onChange={(socials) => setB({ ...b, socials })} placeholder="https://facebook.com/…" addLabel={tx("เพิ่มลิงก์")} /></Field>
        <Field label={tx("ห้องเรียน ({0} ห้อง) — ลบห้องที่ยังมีคาบในอนาคตไม่ได้", [b.rooms.length])} className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {b.rooms.map((r, i) => (
              <div key={r.id} className="flex items-center gap-1">
                <Input className="w-32" value={r.name} onChange={(e) => setB({ ...b, rooms: b.rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <Button size="icon-sm" variant="ghost" aria-label={tx("ลบห้อง")} onClick={() => setB({ ...b, rooms: b.rooms.filter((_, j) => j !== i) })}><TrashIcon /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setB({ ...b, rooms: [...b.rooms, { id: uid("rm"), name: tx("ห้อง {0}", [b.rooms.length + 1]) }] })}><PlusIcon />  {tx("เพิ่มห้อง")}</Button>
          </div>
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty && <span className="mr-auto text-xs text-amber-700">{tx("มีการแก้ไขที่ยังไม่บันทึก")}</span>}
        <Button variant="ghost" size="sm" onClick={() => { reset(); onDone() }}>{tx("ยกเลิก")}</Button>
        <Button size="sm" disabled={!dirty} onClick={() => { if (save(tx("บันทึกข้อมูลสาขาแล้ว"))) onDone() }}>{tx("บันทึก")}</Button>
      </div>
    </SettingsCard>
  )
}

/**
 * Owner 2026-10-13: ข้อมูลสาขา opens as information — everything about the branch from every tab at a glance.
 * แก้ไข switches the branch details to the form; บันทึก brings the information back. The other tabs' summaries
 * jump to their own tab to edit.
 */
export function BranchInfoTab({ branch, onJump }: { branch: Branch; onJump: (tab: string) => void }) {
  const [editing, setEditing] = useState(false)
  const staff = useStore((s) => s.staff)
  if (editing) return <BranchInfoForm branch={branch} onDone={() => setEditing(false)} />
  const b = branch
  const people = staff.filter((x) => x.active && staffInBranch(x, b.id))
  const days = ([1, 2, 3, 4, 5, 6, 0] as const).map((d) => ({ d, h: b.hours[d] }))
  const edit = (tab: string) => <Button size="xs" variant="outline" onClick={() => onJump(tab)}><PencilIcon /> {tx("แก้ไข")}</Button>
  const chips = (xs: string[]) => xs.length ? <span className="flex flex-wrap gap-1">{xs.map((x) => <span key={x} className="rounded-full bg-muted px-2 py-0.5 text-xs">{x}</span>)}</span> : null
  return (
    <div className="space-y-4">
      <SettingsCard title={tx("ข้อมูลสาขา")} hint={tx("ข้อมูลทั่วไปของสาขา — รหัสสาขาใช้ในเลขใบแจ้งหนี้/ใบเสร็จ")}
        action={<Button size="sm" onClick={() => setEditing(true)}><PencilIcon /> {tx("แก้ไข")}</Button>}>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <InfoRow label={tx("แบรนด์ (School type)")}>{BRAND_LABEL[b.brand]}</InfoRow>
          <InfoRow label={tx("รหัสสาขา (Branch ID)")}>{b.code}</InfoRow>
          <InfoRow label={tx("เลขสาขา")}>{b.branchNo}</InfoRow>
          <InfoRow label={tx("ชื่อสาขา")}>{nm(b.name)}</InfoRow>
          <InfoRow label={tx("ชื่อภาษาอังกฤษ")}>{b.nameEn || romanizeName(b.name)}</InfoRow>
          <InfoRow label={tx("จังหวัด")}>{b.province}</InfoRow>
          <InfoRow label={tx("อีเมล")}>{b.email}</InfoRow>
          <InfoRow label={tx("เบอร์โทร")}>{b.phones.filter(Boolean).join(", ")}</InfoRow>
          <InfoRow label="Social media">{b.socials.filter(Boolean).length ? <span className="flex flex-col">{b.socials.filter(Boolean).map((x) => <a key={x} href={x} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">{x}</a>)}</span> : null}</InfoRow>
          <div className="sm:col-span-2"><InfoRow label={tx("ที่อยู่")}>{b.address}</InfoRow></div>
          <InfoRow label={tx("ห้องเรียน ({0} ห้อง)", [b.rooms.length])}>{chips(b.rooms.map((r) => r.name))}</InfoRow>
        </div>
      </SettingsCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard title={tx("บัญชีธนาคาร")} action={edit("bank")}>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label={tx("ธนาคาร")}>{[b.bankAccount.bank, b.bankAccount.branchName].filter(Boolean).join(" · ")}</InfoRow>
            <InfoRow label={tx("เลขบัญชี")}>{b.bankAccount.number}</InfoRow>
            <div className="col-span-2"><InfoRow label={tx("ชื่อบัญชี")}>{b.bankAccount.name}</InfoRow></div>
          </div>
        </SettingsCard>
        <SettingsCard title="LINE Integration" action={edit("line")}>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label={tx("สถานะ")}><Pill tone={b.lineOaConnected ? "green" : "gray"}>{b.lineOaConnected ? tx("เชื่อมต่อแล้ว") : tx("ยังไม่เชื่อมต่อ")}</Pill></InfoRow>
            <InfoRow label="Basic ID">{b.lineOa.botBasicId}</InfoRow>
            <div className="col-span-2"><InfoRow label={tx("ลิงก์เพิ่มเพื่อน")}>{b.lineOa.addFriendUrl}</InfoRow></div>
          </div>
        </SettingsCard>
        <SettingsCard title={tx("เวลาเปิด-ปิด & วันหยุด")} action={edit("scheduling")}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {days.map(({ d, h }) => <li key={d} className="flex justify-between"><span className="text-muted-foreground">{tx(TH_DAYS_FULL[d])}</span><span className="tabular-nums">{h ? `${h.open}–${h.close}` : tx("ปิด")}</span></li>)}
          </ul>
          {b.specialPeriods.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{tx("ช่วงเวลาพิเศษ")}: {b.specialPeriods.map((p) => `${p.name} (${fmtDate(p.from)} – ${fmtDate(p.to)})${p.active ? "" : " · ปิดใช้"}`).join(", ")}</p>}
        </SettingsCard>
        <SettingsCard title={tx("วิชา & ระดับชั้น")} action={<span className="flex gap-1">{edit("subjects")}</span>}>
          <div className="space-y-3">
            <InfoRow label={tx("วิชา ({0})", [b.subjects.length])}>{chips(b.subjects)}</InfoRow>
            <InfoRow label={tx("ระดับชั้น ({0})", [b.grades.length])}>{chips(b.grades)}</InfoRow>
          </div>
        </SettingsCard>
        <SettingsCard title={tx("แพ็กเกจ & ค่าธรรมเนียม")} action={edit("packages")}>
          <div className="space-y-3">
            <InfoRow label={tx("แพ็กเกจ")}>{chips([...b.packageDurations.hour.map((h) => `${h} ชม.`), ...b.packageDurations.week.map((w) => `${w} สัปดาห์`), tx("รายเดือน")])}</InfoRow>
            <InfoRow label={tx("ค่าธรรมเนียม")}>{b.fees.length ? <span className="flex flex-col">{b.fees.map((f) => <span key={f.id} className="flex justify-between gap-3"><span>{f.name}</span><span className="tabular-nums">{fmtMoney(f.price)}</span></span>)}</span> : null}</InfoRow>
          </div>
        </SettingsCard>
        <SettingsCard title={tx("โปรโมชัน & บุคลากร")} action={edit("promotions")}>
          <div className="space-y-3">
            <InfoRow label={tx("โปรโมชันที่เปิดอยู่")}>{chips(b.promotions.filter((p) => p.active).map((p) => `${p.name} · ${p.type === "pct" ? `${p.value}%` : fmtMoney(p.value)}`))}</InfoRow>
            <InfoRow label={tx("บุคลากร ({0} คน)", [people.length])}>{chips(people.map((x) => x.nickname))}</InfoRow>
          </div>
        </SettingsCard>
      </div>
    </div>
  )
}

export function BankTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["bankAccount"])
  const memo = useStore((s) => s.system.invoiceMemos[branch.brand])
  const ba = b.bankAccount
  const set = (patch: Partial<Branch["bankAccount"]>) => setB({ ...b, bankAccount: { ...ba, ...patch } })
  return (
    <div className="space-y-4">
      <SettingsCard title={tx("บัญชีธนาคาร")} hint={tx("พิมพ์บนใบแจ้งหนี้ของสาขานี้ — ตรวจให้ชื่อบัญชีตรงกับแบรนด์")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tx("ธนาคาร")}><Input value={ba.bank} onChange={(e) => set({ bank: e.target.value })} /></Field>
          <Field label={tx("สาขาธนาคาร")}><Input value={ba.branchName} onChange={(e) => set({ branchName: e.target.value })} /></Field>
          <Field label={tx("เลขบัญชี")}><Input value={ba.number} onChange={(e) => set({ number: e.target.value })} /></Field>
          <Field label={tx("ชื่อบัญชี")}><Input value={ba.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        </div>
        <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึกบัญชีธนาคารแล้ว"))} />
      </SettingsCard>
      <SettingsCard title="Invoice Memo" hint={tx("ใช้ร่วมกันทุกสาขาของแบรนด์ {0} — พิมพ์ในช่อง Memo ของใบแจ้งหนี้ใหม่ทุกใบ (แก้เฉพาะใบได้)", [tx(BRAND_LABEL[branch.brand])])}
        action={<Button size="xs" variant="outline" nativeButton={false} render={<Link href="/settings?view=system" />}>{tx("แก้ที่ Settings → System")}</Button>}>
        <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{memo || <span className="text-muted-foreground">{tx("ยังไม่ได้ตั้ง Memo ของแบรนด์นี้")}</span>}</p>
      </SettingsCard>
    </div>
  )
}

interface LineStatus {
  configured: boolean
  connected?: boolean
  displayName?: string
  basicId?: string
  maskedToken?: string
  error?: string
}

/** Non-secret identity lives in branch settings; Channel Secret / Access Token stay server-side (.env.local)
 *  and this tab only reads back a status summary from GET /api/line/status. */
export function LineTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["lineOa"])
  const [status, setStatus] = useState<LineStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const setConnected = useStore((s) => s.setLineOaConnected)
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/line/webhook` : "/api/line/webhook"
  const lo = b.lineOa
  const setLo = (patch: Partial<Branch["lineOa"]>) => setB({ ...b, lineOa: { ...lo, ...patch } })

  const fetchStatus = () =>
    fetch("/api/line/status")
      .then((r) => r.json())
      .then((data: LineStatus) => { setStatus(data); setConnected(b.id, !!data.connected) })
      .catch(() => setStatus({ configured: false, error: tx("เรียก /api/line/status ไม่ได้") }))
      .finally(() => setLoading(false))
  useEffect(() => { fetchStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
    <SettingsCard title="LINE Integration" hint={tx("LINE OA ของสาขานี้ — ใช้ส่งสรุปการเรียน/ใบแจ้งหนี้/ใบเสร็จถึงผู้ปกครอง และผูกผู้ปกครองด้วย link code · 1 Messaging API channel ต่อสาขา")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {loading ? (
          <Pill tone="gray"><LoaderCircleIcon className="size-3 animate-spin" />  {tx("กำลังตรวจสอบ...")}</Pill>
        ) : status?.connected ? (
          <Pill tone="green"><CheckCircle2Icon className="size-3" />  {tx("เชื่อมต่อแล้ว —")} {status.displayName} ({status.basicId})</Pill>
        ) : status?.configured ? (
          <Pill tone="red">{tx("ตั้งค่าไว้แต่เชื่อมไม่สำเร็จ —")} {status.error}</Pill>
        ) : (
          <Pill tone="gray">{tx("ยังไม่ได้ตั้งค่าฝั่ง Server")}</Pill>
        )}
        {status?.maskedToken && <span className="text-xs text-muted-foreground">Token {status.maskedToken}</span>}
        <Button size="xs" variant="ghost" onClick={() => { setLoading(true); fetchStatus() }} disabled={loading}>{tx("Verify อีกครั้ง")}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Channel ID"><Input value={lo.channelId} onChange={(e) => setLo({ channelId: e.target.value })} placeholder={tx("จาก LINE Developers console")} /></Field>
        <Field label={tx("Basic ID (ผู้ปกครองเห็น)")}><Input value={lo.botBasicId} onChange={(e) => setLo({ botBasicId: e.target.value })} placeholder="@abcplex" /></Field>
        <Field label={tx("Add-friend URL (QR/ลิงก์สำหรับผู้ปกครอง)")} className="sm:col-span-2"><Input value={lo.addFriendUrl} onChange={(e) => setLo({ addFriendUrl: e.target.value })} placeholder="https://line.me/R/ti/p/@xxxx" /></Field>
        <Field label={tx("รูป QR (พิมพ์บนใบแจ้งหนี้ — เว้นว่าง = ไม่แสดง QR)")} className="sm:col-span-2">
          <div className="flex items-center gap-3">
            {lo.qrImageDataUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lo.qrImageDataUrl} alt="LINE QR" className="size-20 rounded-lg border object-contain" />
                <Button size="icon-xs" variant="destructive" className="absolute -top-1.5 -right-1.5 rounded-full" aria-label={tx("ลบ QR")} onClick={() => setLo({ qrImageDataUrl: undefined })}><XIcon /></Button>
              </div>
            ) : (
              <label className="flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-muted/50">
                <UploadIcon className="size-4" /><span className="text-[10px]">{tx("อัปโหลด")}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) return report({ ok: false, error: tx("ไฟล์ต้องไม่เกิน 5 MB") }, "")
                  const reader = new FileReader()
                  reader.onload = () => setLo({ qrImageDataUrl: reader.result as string })
                  reader.readAsDataURL(file)
                }} />
              </label>
            )}
            <p className="text-xs text-muted-foreground">{tx("PNG/JPG/WEBP/GIF ไม่เกิน 5 MB")}</p>
          </div>
        </Field>
        <Field label={tx("Webhook URL (วางใน Messaging API settings ของ LINE Developers แล้วเปิด Use webhook)")} className="sm:col-span-2">
          <div className="flex gap-1.5">
            <Input value={webhookUrl} readOnly className="font-mono text-muted-foreground" />
            <Button size="icon" variant="outline" aria-label={tx("คัดลอก")} onClick={() => { navigator.clipboard.writeText(webhookUrl); report({ ok: true, value: undefined }, tx("คัดลอกแล้ว")) }}><CopyIcon /></Button>
          </div>
        </Field>
      </div>
      <Alert className="mt-4">
        <ShieldAlertIcon />
        <AlertTitle>{tx("Channel Secret / Access Token ตั้งที่ไฟล์ .env.local ฝั่ง Server เท่านั้น")}</AlertTitle>
        <AlertDescription>{tx("ค่านี้ส่งข้อความแทน OA ได้ จึงไม่เก็บในเบราว์เซอร์ — ใน Staging ช่องนี้เป็น \"•••• saved\" ที่ Dev เก็บฝั่ง Server เช่นกัน")}</AlertDescription>
      </Alert>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึก LINE Integration แล้ว"))} />
    </SettingsCard>
    <RichMenuCard branch={branch} />
    </div>
  )
}

export function StaffTab({ branch }: { branch: Branch }) {
  const staff = useStore((s) => s.staff).filter((x) => x.active && x.branchIds.includes(branch.id))
  return (
    <SettingsCard title={tx("บุคลากร ({0})", [staff.length])} hint={tx("ครู แอดมิน และผู้จัดการที่ประจำสาขานี้ — แก้ไข/เพิ่มคนที่เมนูบุคลากร")}
      action={<Button size="xs" variant="outline" nativeButton={false} render={<Link href="/staff" />}><ExternalLinkIcon />  {tx("ไปที่บุคลากร")}</Button>}>
      <div className="divide-y rounded-2xl border">
        {staff.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
            <span className="font-medium">{nm(x.name)}</span>
            <span className="text-muted-foreground">&quot;{nm(x.nickname)}&quot;</span>
            {x.email && <span className="text-xs text-muted-foreground">{x.email}</span>}
            <span className="ml-auto flex flex-wrap gap-1">
              {x.roles.map((r) => <Pill key={r} tone="blue">{ROLE_LABEL[r]}</Pill>)}
              {x.subjects.map((s) => <Pill key={s}>{s}</Pill>)}
            </span>
          </div>
        ))}
      </div>
    </SettingsCard>
  )
}

/** จังหวัดของสาขา — shown with the branch name everywhere ("ทองหล่อ · BKK"), owner 2026-09-30 */
export function ProvinceField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label={tx("จังหวัด * (รหัส)")}>
      <Input list="province-codes" value={value} maxLength={4} onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} placeholder="BKK" />
      <p className="mt-1 text-xs text-muted-foreground">{nm(KNOWN_PROVINCES[value]) || tx("BKK = กรุงเทพฯ · CBR = ชลบุรี · จังหวัดใหม่พิมพ์รหัสเองได้")}</p>
      <datalist id="province-codes">{Object.entries(KNOWN_PROVINCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</datalist>
    </Field>
  )
}
