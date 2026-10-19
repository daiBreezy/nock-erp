"use client"

// Drivers (owner 2026-10-19: "ใช่เข้าระบบ แต่ก็มีสิทธิ์ว่าจะหา Outsource ในบางครั้ง"): staff with the Driver role — the
// school's own, or an outsource driver (with the company) hired for a day. Each gets their own app link (no login).
import { useState } from "react"
import { CopyIcon, PlusIcon, SaveIcon, UserRoundIcon, XIcon } from "lucide-react"
import { SettingsCard } from "@/components/settings/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import type { Branch, Staff } from "@/domain/types"
import { uid } from "@/data/seed"
import { driverAppUrl } from "@/lib/driver"
import { report } from "@/lib/feedback"
import { toast } from "@/lib/toast"
import { useStore } from "@/store/store"

const newToken = () => `drv_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`

export function DriversCard({ branch }: { branch: Branch }) {
  const staff = useStore((s) => s.staff)
  const saveStaff = useStore((s) => s.saveStaff)
  const drivers = staff.filter((x) => x.roles.includes("driver") && x.branchIds.includes(branch.id))
  const [draft, setDraft] = useState<Staff | null>(null)
  const put = (p: Partial<Staff>) => setDraft((d) => (d ? { ...d, ...p } : d))
  const add = () => setDraft({ id: uid("stf"), name: "", nickname: "", roles: ["driver"], branchIds: [branch.id], subjects: [], active: true, canLogin: false, phone: "", driverToken: newToken() })
  const save = () => { if (draft && report(saveStaff(draft), "บันทึกคนขับแล้ว")) setDraft(null) }
  const copy = async (d: Staff) => {
    let tok = d.driverToken
    if (!tok) { tok = newToken(); if (!report(saveStaff({ ...d, driverToken: tok }), "")) return }
    try { await navigator.clipboard.writeText(driverAppUrl(tok)); toast.success(`คัดลอกลิงก์แอปของ${d.nickname}แล้ว — ส่งทาง LINE ให้คนขับได้เลย`) } catch { toast.error("คัดลอกไม่ได้") }
  }
  return (
    <SettingsCard title={`คนขับ (${drivers.length})`} hint="คนขับของโรงเรียน หรือ Outsource ที่จ้างเป็นครั้งคราว — แต่ละคนมีลิงก์แอปคนขับของตัวเอง (ไม่ต้องล็อกอิน) · เปลี่ยนคนขับเฉพาะวันได้ที่แถวเที่ยวรถ"
      action={<Button size="xs" variant="outline" onClick={add}><PlusIcon /> เพิ่มคนขับ</Button>}>
      <div className="space-y-1.5">
        {drivers.length === 0 && !draft && <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm text-muted-foreground"><UserRoundIcon className="size-4" /> ยังไม่มีคนขับ</p>}
        {drivers.map((d) => draft?.id === d.id ? null : (
          <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-medium">{d.nickname}{d.vendor && <span className="rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">Outsource</span>}{!d.active && <span className="rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">ปิดใช้งาน</span>}</span>
              <span className="block text-xs text-muted-foreground">{[d.name, d.phone].filter(Boolean).join(" · ")}</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => copy(d)}><CopyIcon /> ลิงก์แอปคนขับ</Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(d)}>แก้ไข</Button>
          </div>
        ))}
        {draft && (
          <div className="grid items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2 sm:grid-cols-[1fr_1fr_9rem_auto_auto_auto_auto]">
            <Input value={draft.nickname} placeholder="ชื่อเล่น เช่น น้าเบ้ง" onChange={(e) => put({ nickname: e.target.value })} />
            <Input value={draft.name} placeholder="ชื่อ-นามสกุล" onChange={(e) => put({ name: e.target.value })} />
            <Input value={draft.phone ?? ""} placeholder="เบอร์โทร" onChange={(e) => put({ phone: e.target.value })} />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Switch checked={!!draft.vendor} onCheckedChange={(x) => put({ vendor: x || undefined })} />Outsource (จ้างภายนอก)</label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Switch checked={draft.active} onCheckedChange={(x) => put({ active: x })} />ใช้งาน</label>
            <Button size="sm" onClick={save}><SaveIcon /> บันทึก</Button>
            <Button size="icon-sm" variant="ghost" aria-label="ยกเลิก" onClick={() => setDraft(null)}><XIcon /></Button>
          </div>
        )}
      </div>
    </SettingsCard>
  )
}
