"use client"

import { Page, PageHeader, Tabs } from "@/components/app/page-layout"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Building2Icon, ChevronRightIcon, MapPinIcon, PlusIcon, SettingsIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { ProvinceField } from "@/components/settings/branch-basic"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { SystemSettingsView } from "@/components/settings/system-settings"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { can, inBranch } from "@/domain/rules/permissions"
import type { Branch } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { tx, nm } from "@/lib/i18n"

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <Settings />
    </Suspense>
  )
}

/** Mirrors staging: Settings → General (branch list → per-branch tabs) | System (brand-wide). */
function Settings() {
  const me = useStore((s) => s.me())
  // Admin/Manager reach Settings only to manage their branch's holidays
  const full = can(me, "settings.manage")
  const wantsSystem = useSearchParams().get("view") === "system"
  const view = full && wantsSystem ? "system" : "general"
  const router = useRouter()
  return (
    <Page className="pb-16">
      <PageHeader title="Settings" description={tx("ตั้งค่าระบบ NockERP")} />
      <Tabs value={view} onChange={(v) => router.replace(v === "system" ? "/settings?view=system" : "/settings")}
        options={[{ value: "general", label: tx("สาขา (General)"), icon: Building2Icon }, ...(full ? [{ value: "system", label: tx("ระบบ (System)"), icon: SettingsIcon }] : [])]} />
      {view === "system" ? <SystemSettingsView /> : <BranchList />}
    </Page>
  )
}

function BranchList() {
  const me = useStore((s) => s.me())
  const full = can(me, "settings.manage")
  const branches = useStore((s) => s.branches).filter((b) => full || inBranch(me, b.id))
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const [adding, setAdding] = useState(false)
  const count = (b: Branch, role: string) => staff.filter((x) => x.active && x.branchIds.includes(b.id) && x.roles.includes(role as never)).length
  return (
    <div className="space-y-2">
      {branches.map((b) => (
        <Link key={b.id} href={`/settings/branches/${b.id}`} className="flex items-center gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5 hover:bg-muted/30">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><MapPinIcon className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold">{nm(b.name)}</span>
              <Pill tone="violet">{b.brand === "nockacademy" ? "Nockacademy" : "Liclass"}</Pill>
              <Pill tone={b.active ? "green" : "gray"}>{b.active ? tx("เปิดอยู่") : tx("ปิดแล้ว")}</Pill>
              <span className="text-xs text-muted-foreground">{b.code}</span>
            </span>
            <span className="block truncate text-sm text-muted-foreground">{b.address || tx("ยังไม่มีที่อยู่")}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {b.rooms.length}  {tx("ห้อง · เปิด")} {Object.values(b.hours).filter(Boolean).length}  {tx("วัน · ช่วงพิเศษ")} {b.specialPeriods.length}  {tx("· วันหยุด")} {holidays.filter((h) => h.branchId === b.id).length}  {tx("· ครู")} {count(b, "teacher")}  {tx("· แอดมิน")} {count(b, "admin")}  {tx("· ผู้จัดการ")} {count(b, "manager")}
            </span>
          </span>
          <ChevronRightIcon className="size-5 text-muted-foreground" />
        </Link>
      ))}
      {full ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => setAdding(true)}><PlusIcon />  {tx("เพิ่มสาขา")}</Button>
        </div>
      ) : <p className="pt-2 text-center text-xs text-muted-foreground">{tx("บทบาทของคุณจัดการได้เฉพาะวันหยุดของสาขาตัวเอง — ตั้งค่าอื่นเป็นของ Director")}</p>}
      {adding && <AddBranchDialog onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddBranchDialog({ onClose }: { onClose: () => void }) {
  const add = useStore((s) => s.addBranch)
  const router = useRouter()
  const [f, setF] = useState<{ name: string; code: string; brand: Branch["brand"]; province: string }>({ name: "", code: "", brand: "nockacademy", province: "BKK" })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tx("เพิ่มสาขา")}</DialogTitle>
          <DialogDescription>{tx("ตั้งค่าที่เหลือ (เวลาเปิด วิชา ราคา ฯลฯ) ต่อได้ในหน้าสาขา — เวลาเปิดตั้งต้นคัดลอกจากสาขาปัจจุบัน")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tx("ชื่อสาขา *")} className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={tx("เช่น สีลม")} /></Field>
          <Field label={tx("รหัสสาขา * (ในเลขใบแจ้งหนี้)")}><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="SLM" /></Field>
          <Field label={tx("แบรนด์")}>
            <NativeSelect value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value as Branch["brand"] })} options={[{ value: "nockacademy", label: "Nockacademy" }, { value: "liclass", label: "Liclass" }]} />
          </Field>
          <ProvinceField value={f.province} onChange={(province) => setF({ ...f, province })} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button onClick={() => { const r = add(f); if (report(r, tx("เพิ่มสาขา{0}แล้ว", [nm(f.name)]))) router.push(`/settings/branches/${r.value.id}`) }}>{tx("เพิ่มสาขา")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
