"use client"

import { useRef, useState } from "react"
import { ImagePlusIcon, PencilIcon, PlusIcon, QrCodeIcon, Trash2Icon } from "lucide-react"
import { Field } from "@/components/app/student-form"
import { FormShell } from "@/components/app/form-shell"
import { Segmented } from "@/components/app/page-layout"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { uid } from "@/data/seed"
import { BRAND_LABEL, bankScopeLabel, validateBankEntry } from "@/domain/rules/bank-accounts"
import { promptPayKind } from "@/domain/rules/documents"
import type { BankAccountEntry, Brand } from "@/domain/types"
import { report } from "@/lib/feedback"
import { slipDataUrl } from "@/lib/image"
import { toast } from "@/lib/toast"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { SettingsCard } from "./common"

const BRANDS: Brand[] = ["nockacademy", "liclass"]

const blank = (): BankAccountEntry => ({
  id: uid("bk"), label: "", account: { bank: "", branchName: "", name: "", number: "" }, scope: { kind: "brand", brands: ["nockacademy"] },
})

/**
 * Settings › System › การเงิน › Bank Account (owner 2026-11-24): the Director creates a bank account once, uploads its QR and
 * picks who it is for — Liclass, Nockacademy, both, or chosen branches. Save = Global: every targeted branch gets it at once.
 */
export function BankAccounts() {
  const entries = useStore((s) => s.system.bankAccounts) ?? []
  const branches = useStore((s) => s.branches).filter((b) => b.active !== false)
  const save = useStore((s) => s.saveBankAccount)
  const remove = useStore((s) => s.deleteBankAccount)
  const [editing, setEditing] = useState<BankAccountEntry | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <SettingsCard title="Bank Account" hint={tx("บัญชีรับเงินบนใบแจ้งหนี้ — สร้างที่นี่ที่เดียว เลือกว่าใช้กับธุรกิจหรือสาขาไหน · กดบันทึก = ส่งไปทุกสาขาที่เลือกทันที")}
      action={<Button size="sm" onClick={() => setEditing(blank())}><PlusIcon /> New Bank Account</Button>}>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{tx("ยังไม่มีบัญชี — กด New Bank Account")}</p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 p-3">
              <QrThumb entry={e} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.label}</p>
                <p className="truncate text-xs text-muted-foreground">{[e.account.bank, e.account.branchName].filter(Boolean).join(" · ")} · {e.account.number} · {e.account.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                  <Pill tone="blue">{tx(bankScopeLabel(e, branches))}</Pill>
                  {e.account.qrImage ? <span className="text-muted-foreground">{tx("QR ที่อัปโหลด")}</span> : e.account.promptPayId ? <span className="text-muted-foreground">{tx("QR จาก PromptPay ID")}</span> : <span className="text-muted-foreground">{tx("ไม่มี QR บนใบแจ้งหนี้")}</span>}
                </p>
              </div>
              {deleting === e.id ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-danger">{tx("ลบบัญชีนี้?")}</span>
                  <Button size="xs" variant="ghost" onClick={() => setDeleting(null)}>{tx("ไม่ลบ")}</Button>
                  <Button size="xs" variant="destructive" onClick={() => { if (report(remove(e.id), tx("ลบบัญชีแล้ว — สาขายังใช้บัญชีที่มีอยู่ต่อ"))) setDeleting(null) }}>{tx("ยืนยันลบ")}</Button>
                </span>
              ) : (
                <>
                  <Button size="icon-sm" variant="ghost" aria-label={tx("แก้บัญชี")} title={tx("แก้บัญชี")} onClick={() => setEditing(e)}><PencilIcon /></Button>
                  <Button size="icon-sm" variant="ghost" aria-label={tx("ลบบัญชี")} title={tx("ลบบัญชี")} onClick={() => setDeleting(e.id)}><Trash2Icon /></Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <BankForm entry={editing} others={entries} onClose={() => setEditing(null)}
          onSave={(x) => { const r = save(x); if (report(r, (v) => tx("บันทึกแล้ว — ส่งไป {0} สาขา", [v.branches]))) setEditing(null); return r.ok }} />
      )}
    </SettingsCard>
  )
}

function QrThumb({ entry }: { entry: BankAccountEntry }) {
  return entry.account.qrImage
    // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimise
    ? <img src={entry.account.qrImage} alt={entry.label} className="size-12 shrink-0 rounded-lg border bg-white object-contain" />
    : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><QrCodeIcon className="size-5" /></span>
}

function BankForm({ entry, others, onClose, onSave }: { entry: BankAccountEntry; others: BankAccountEntry[]; onClose: () => void; onSave: (e: BankAccountEntry) => boolean }) {
  const branches = useStore((s) => s.branches).filter((b) => b.active !== false)
  const [d, setD] = useState<BankAccountEntry>(entry)
  const file = useRef<HTMLInputElement>(null)
  const exists = others.some((o) => o.id === entry.id)
  const a = d.account
  const setA = (patch: Partial<BankAccountEntry["account"]>) => setD({ ...d, account: { ...a, ...patch } })
  const err = validateBankEntry(d, others, branches)
  const kind = d.scope.kind
  const brands = d.scope.kind === "brand" ? d.scope.brands : []
  const picked = d.scope.kind === "branch" ? d.scope.branchIds : []
  const toggleBrand = (b: Brand) => setD({ ...d, scope: { kind: "brand", brands: brands.includes(b) ? brands.filter((x) => x !== b) : [...brands, b] } })
  const setPicked = (ids: string[]) => setD({ ...d, scope: { kind: "branch", branchIds: ids } })
  const toggleBranch = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  const allIds = branches.map((b) => b.id)

  return (
    <FormShell className="max-h-[92vh] sm:max-w-xl" onClose={onClose} title={exists ? tx("แก้บัญชีธนาคาร") : "New Bank Account"}
      description={tx("กดบันทึก = ส่งบัญชีนี้ไปทุกสาขาที่เลือกทันที (ใบแจ้งหนี้ใหม่ของสาขาเหล่านั้นจะพิมพ์บัญชี + QR นี้)")}
      footer={<>
        {err && <span className="mr-auto text-xs text-danger">{tx(err)}</span>}
        <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
        <Button disabled={!!err} onClick={() => onSave({ ...d, label: d.label.trim(), account: { ...a, promptPayId: a.promptPayId?.trim() || undefined } })}>{tx("บันทึก")}</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tx("ชื่อบัญชี (ไว้เรียกในรายการ)")} className="sm:col-span-2"><Input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder={tx("เช่น บัญชีหลัก Nockacademy")} /></Field>
        <Field label={tx("ธนาคาร")}><Input value={a.bank} onChange={(e) => setA({ bank: e.target.value })} /></Field>
        <Field label={tx("สาขาธนาคาร")}><Input value={a.branchName} onChange={(e) => setA({ branchName: e.target.value })} /></Field>
        <Field label={tx("เลขบัญชี")}><Input value={a.number} onChange={(e) => setA({ number: e.target.value })} /></Field>
        <Field label={tx("ชื่อบัญชี")}><Input value={a.name} onChange={(e) => setA({ name: e.target.value })} /></Field>
        <Field label={tx("PromptPay ID (สร้าง QR จ่ายเงินให้เอง)")} className="sm:col-span-2">
          <Input value={a.promptPayId ?? ""} onChange={(e) => setA({ promptPayId: e.target.value })} placeholder={tx("เบอร์โทร 10 หลัก · เลขผู้เสียภาษี 13 หลัก · e-Wallet 15 หลัก")} />
          {a.promptPayId && !promptPayKind(a.promptPayId) && <p className="mt-1 text-xs text-danger">{tx("PromptPay ID ไม่ถูกต้อง")}</p>}
        </Field>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium">{tx("QR Code ของบัญชีนี้")}</p>
        <div className="flex items-center gap-3">
          {a.qrImage
            // eslint-disable-next-line @next/next/no-img-element -- data URL
            ? <img src={a.qrImage} alt="QR" className="size-24 rounded-xl border bg-white object-contain" />
            : <span className="grid size-24 place-items-center rounded-xl border border-dashed text-muted-foreground"><QrCodeIcon className="size-6" /></span>}
          <div className="space-y-1.5">
            <Button size="sm" variant="outline" onClick={() => file.current?.click()}><ImagePlusIcon /> {a.qrImage ? tx("เปลี่ยนรูป QR") : tx("อัปโหลด QR")}</Button>
            {a.qrImage && <Button size="sm" variant="ghost" className="text-danger" onClick={() => setA({ qrImage: undefined })}>{tx("เอา QR ออก")}</Button>}
            <p className="max-w-64 text-xs text-muted-foreground">{tx("ใช้รูป QR ที่อัปโหลดบนใบแจ้งหนี้ — ถ้าไม่อัปโหลด ระบบสร้าง QR จาก PromptPay ID (พร้อมยอดเงิน) ให้")}</p>
          </div>
          <Input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (!f) return
            try { setA({ qrImage: await slipDataUrl(f, 720) }) } catch { toast.error(tx("อ่านรูปไม่ได้")) }
          }} />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">{tx("ใช้กับ")}</p>
        <Segmented label={tx("ใช้กับ")} value={kind} onChange={(k) => setD({ ...d, scope: k === "brand" ? { kind: "brand", brands: [] } : { kind: "branch", branchIds: [] } })}
          options={[{ value: "brand", label: tx("ตามธุรกิจ (Business type)") }, { value: "branch", label: tx("ตามสาขา") }]} />
        {kind === "brand" ? (
          <div className="flex flex-wrap gap-1.5">
            {BRANDS.map((b) => (
              <Button key={b} variant="ghost" size="inline" type="button" aria-pressed={brands.includes(b)} onClick={() => toggleBrand(b)}
                className={cn("rounded-full border px-3 py-1.5 text-sm", brands.includes(b) ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{BRAND_LABEL[b]}</Button>
            ))}
            <Button variant="ghost" size="inline" type="button" aria-pressed={brands.length === BRANDS.length} onClick={() => setD({ ...d, scope: { kind: "brand", brands: brands.length === BRANDS.length ? [] : [...BRANDS] } })}
              className={cn("rounded-full border px-3 py-1.5 text-sm", brands.length === BRANDS.length ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{tx("ทั้ง 2 ธุรกิจ")}</Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={picked.length === allIds.length && allIds.length > 0} onCheckedChange={(v) => setPicked(v ? allIds : [])} /> {tx("ทุกสาขา")}
            </label>
            <div className="grid max-h-48 gap-1 overflow-y-auto rounded-xl border p-2 sm:grid-cols-2">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={picked.includes(b.id)} onCheckedChange={() => toggleBranch(b.id)} />
                  <span className="truncate">{b.name}</span>
                  <span className="text-2xs text-muted-foreground">{BRAND_LABEL[b.brand]}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormShell>
  )
}
