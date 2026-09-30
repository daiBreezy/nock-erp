"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2Icon, CopyIcon, ExternalLinkIcon, LoaderCircleIcon, PlusIcon, ShieldAlertIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import { KNOWN_PROVINCES } from "@/domain/rules/settings"
import type { Branch } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { SaveRow, SettingsCard, useBranchDraft } from "./common"

const BRAND_LABEL: Record<Branch["brand"], string> = { nockacademy: "Nockacademy", liclass: "Liclass" }

/** A small editable list of strings (phones, social links). */
function StringList({ values, onChange, placeholder, addLabel }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <div className="space-y-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <Input value={v} placeholder={placeholder} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button size="icon" variant="ghost" aria-label="ลบ" onClick={() => onChange(values.filter((_, j) => j !== i))}><TrashIcon /></Button>
        </div>
      ))}
      <Button size="xs" variant="outline" onClick={() => onChange([...values, ""])}><PlusIcon /> {addLabel}</Button>
    </div>
  )
}

export function BranchInfoTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["brand", "code", "name", "province", "email", "address", "phones", "socials", "rooms"])
  const hasInvoices = useStore((s) => s.invoices.some((i) => i.branchId === branch.id && i.number))
  return (
    <SettingsCard title="ข้อมูลสาขา" hint="ข้อมูลทั่วไปของสาขา — รหัสสาขาใช้ในเลขใบแจ้งหนี้/ใบเสร็จ">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="แบรนด์ (School type)">
          <NativeSelect value={b.brand} onChange={(e) => setB({ ...b, brand: e.target.value as Branch["brand"] })} options={Object.entries(BRAND_LABEL).map(([value, label]) => ({ value, label }))} />
        </Field>
        <Field label="รหัสสาขา (Branch ID)" error={hasInvoices && "ออกใบแจ้งหนี้ไปแล้ว — เปลี่ยนรหัสไม่ได้"}>
          <Input value={b.code} disabled={hasInvoices} onChange={(e) => setB({ ...b, code: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="ชื่อสาขา *"><Input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
        <ProvinceField value={b.province ?? ""} onChange={(province) => setB({ ...b, province })} />
        <Field label="อีเมล"><Input type="email" value={b.email ?? ""} onChange={(e) => setB({ ...b, email: e.target.value })} /></Field>
        <Field label="ที่อยู่" className="sm:col-span-2"><Input value={b.address ?? ""} onChange={(e) => setB({ ...b, address: e.target.value })} /></Field>
        <Field label="เบอร์โทร"><StringList values={b.phones} onChange={(phones) => setB({ ...b, phones })} placeholder="02-xxx-xxxx" addLabel="เพิ่มเบอร์" /></Field>
        <Field label="Social media"><StringList values={b.socials} onChange={(socials) => setB({ ...b, socials })} placeholder="https://facebook.com/…" addLabel="เพิ่มลิงก์" /></Field>
        <Field label={`ห้องเรียน (${b.rooms.length} ห้อง) — ลบห้องที่ยังมีคาบในอนาคตไม่ได้`} className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {b.rooms.map((r, i) => (
              <div key={r.id} className="flex items-center gap-1">
                <Input className="w-32" value={r.name} onChange={(e) => setB({ ...b, rooms: b.rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <Button size="icon-sm" variant="ghost" aria-label="ลบห้อง" onClick={() => setB({ ...b, rooms: b.rooms.filter((_, j) => j !== i) })}><TrashIcon /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setB({ ...b, rooms: [...b.rooms, { id: uid("rm"), name: `ห้อง ${b.rooms.length + 1}` }] })}><PlusIcon /> เพิ่มห้อง</Button>
          </div>
        </Field>
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึกข้อมูลสาขาแล้ว")} />
    </SettingsCard>
  )
}

export function BankTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["bankAccount"])
  const memo = useStore((s) => s.system.invoiceMemos[branch.brand])
  const ba = b.bankAccount
  const set = (patch: Partial<Branch["bankAccount"]>) => setB({ ...b, bankAccount: { ...ba, ...patch } })
  return (
    <div className="space-y-4">
      <SettingsCard title="บัญชีธนาคาร" hint="พิมพ์บนใบแจ้งหนี้ของสาขานี้ — ตรวจให้ชื่อบัญชีตรงกับแบรนด์">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ธนาคาร"><Input value={ba.bank} onChange={(e) => set({ bank: e.target.value })} /></Field>
          <Field label="สาขาธนาคาร"><Input value={ba.branchName} onChange={(e) => set({ branchName: e.target.value })} /></Field>
          <Field label="เลขบัญชี"><Input value={ba.number} onChange={(e) => set({ number: e.target.value })} /></Field>
          <Field label="ชื่อบัญชี"><Input value={ba.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        </div>
        <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึกบัญชีธนาคารแล้ว")} />
      </SettingsCard>
      <SettingsCard title="Invoice Memo" hint={`ใช้ร่วมกันทุกสาขาของแบรนด์ ${BRAND_LABEL[branch.brand]} — พิมพ์ในช่อง Memo ของใบแจ้งหนี้ใหม่ทุกใบ (แก้เฉพาะใบได้)`}
        action={<Button size="xs" variant="outline" nativeButton={false} render={<Link href="/settings?view=system" />}>แก้ที่ Settings → System</Button>}>
        <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{memo || <span className="text-muted-foreground">ยังไม่ได้ตั้ง Memo ของแบรนด์นี้</span>}</p>
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
      .catch(() => setStatus({ configured: false, error: "เรียก /api/line/status ไม่ได้" }))
      .finally(() => setLoading(false))
  useEffect(() => { fetchStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SettingsCard title="LINE Integration" hint="LINE OA ของสาขานี้ — ใช้ส่งสรุปการเรียน/ใบแจ้งหนี้/ใบเสร็จถึงผู้ปกครอง และผูกผู้ปกครองด้วย link code · 1 Messaging API channel ต่อสาขา">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {loading ? (
          <Pill tone="gray"><LoaderCircleIcon className="size-3 animate-spin" /> กำลังตรวจสอบ...</Pill>
        ) : status?.connected ? (
          <Pill tone="green"><CheckCircle2Icon className="size-3" /> เชื่อมต่อแล้ว — {status.displayName} ({status.basicId})</Pill>
        ) : status?.configured ? (
          <Pill tone="red">ตั้งค่าไว้แต่เชื่อมไม่สำเร็จ — {status.error}</Pill>
        ) : (
          <Pill tone="gray">ยังไม่ได้ตั้งค่าฝั่ง Server</Pill>
        )}
        {status?.maskedToken && <span className="text-xs text-muted-foreground">Token {status.maskedToken}</span>}
        <Button size="xs" variant="ghost" onClick={() => { setLoading(true); fetchStatus() }} disabled={loading}>Verify อีกครั้ง</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Channel ID"><Input value={lo.channelId} onChange={(e) => setLo({ channelId: e.target.value })} placeholder="จาก LINE Developers console" /></Field>
        <Field label="Basic ID (ผู้ปกครองเห็น)"><Input value={lo.botBasicId} onChange={(e) => setLo({ botBasicId: e.target.value })} placeholder="@abcplex" /></Field>
        <Field label="Add-friend URL (QR/ลิงก์สำหรับผู้ปกครอง)" className="sm:col-span-2"><Input value={lo.addFriendUrl} onChange={(e) => setLo({ addFriendUrl: e.target.value })} placeholder="https://line.me/R/ti/p/@xxxx" /></Field>
        <Field label="รูป QR (พิมพ์บนใบแจ้งหนี้ — เว้นว่าง = ไม่แสดง QR)" className="sm:col-span-2">
          <div className="flex items-center gap-3">
            {lo.qrImageDataUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lo.qrImageDataUrl} alt="LINE QR" className="size-20 rounded-lg border object-contain" />
                <Button size="icon-xs" variant="destructive" className="absolute -top-1.5 -right-1.5 rounded-full" aria-label="ลบ QR" onClick={() => setLo({ qrImageDataUrl: undefined })}><XIcon /></Button>
              </div>
            ) : (
              <label className="flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:bg-muted/50">
                <UploadIcon className="size-4" /><span className="text-[10px]">อัปโหลด</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 5 * 1024 * 1024) return report({ ok: false, error: "ไฟล์ต้องไม่เกิน 5 MB" }, "")
                  const reader = new FileReader()
                  reader.onload = () => setLo({ qrImageDataUrl: reader.result as string })
                  reader.readAsDataURL(file)
                }} />
              </label>
            )}
            <p className="text-xs text-muted-foreground">PNG/JPG/WEBP/GIF ไม่เกิน 5 MB</p>
          </div>
        </Field>
        <Field label="Webhook URL (วางใน Messaging API settings ของ LINE Developers แล้วเปิด Use webhook)" className="sm:col-span-2">
          <div className="flex gap-1.5">
            <Input value={webhookUrl} readOnly className="font-mono text-muted-foreground" />
            <Button size="icon" variant="outline" aria-label="คัดลอก" onClick={() => { navigator.clipboard.writeText(webhookUrl); report({ ok: true, value: undefined }, "คัดลอกแล้ว") }}><CopyIcon /></Button>
          </div>
        </Field>
      </div>
      <Alert className="mt-4">
        <ShieldAlertIcon />
        <AlertTitle>Channel Secret / Access Token ตั้งที่ไฟล์ .env.local ฝั่ง Server เท่านั้น</AlertTitle>
        <AlertDescription>ค่านี้ส่งข้อความแทน OA ได้ จึงไม่เก็บในเบราว์เซอร์ — ใน Staging ช่องนี้เป็น &quot;•••• saved&quot; ที่ Dev เก็บฝั่ง Server เช่นกัน</AlertDescription>
      </Alert>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึก LINE Integration แล้ว")} />
    </SettingsCard>
  )
}

export function StaffTab({ branch }: { branch: Branch }) {
  const staff = useStore((s) => s.staff).filter((x) => x.active && x.branchIds.includes(branch.id))
  return (
    <SettingsCard title={`บุคลากร (${staff.length})`} hint="ครู แอดมิน และผู้จัดการที่ประจำสาขานี้ — แก้ไข/เพิ่มคนที่เมนูบุคลากร"
      action={<Button size="xs" variant="outline" nativeButton={false} render={<Link href="/staff" />}><ExternalLinkIcon /> ไปที่บุคลากร</Button>}>
      <div className="divide-y rounded-2xl border">
        {staff.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
            <span className="font-medium">{x.name}</span>
            <span className="text-muted-foreground">&quot;{x.nickname}&quot;</span>
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
    <Field label="จังหวัด * (รหัส)">
      <Input list="province-codes" value={value} maxLength={4} onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} placeholder="BKK" />
      <p className="mt-1 text-xs text-muted-foreground">{KNOWN_PROVINCES[value] ?? "BKK = กรุงเทพฯ · CBR = ชลบุรี · จังหวัดใหม่พิมพ์รหัสเองได้"}</p>
      <datalist id="province-codes">{Object.entries(KNOWN_PROVINCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</datalist>
    </Field>
  )
}
