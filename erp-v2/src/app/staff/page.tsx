"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { avatarTone, initial } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtDate, toDateStr } from "@/domain/dates"
import { futureSessionsOf, validateStaff } from "@/domain/rules/people"
import { can, canDeactivateStaff, ROLE_LABEL } from "@/domain/rules/permissions"
import type { Role, Staff } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const ROLES: Role[] = ["director", "manager", "admin", "teacher"]

export default function StaffPage() {
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const reactivate = useStore((s) => s.reactivateStaff)
  const today = toDateStr(useNow())
  const [editing, setEditing] = useState<Staff | "new" | null>(null)
  const [leaving, setLeaving] = useState<Staff | null>(null)
  const manage = can(me, "staff.manage")
  const list = staff.filter((s) => s.branchIds.includes(branch.id)).sort((a, b) => Number(b.active) - Number(a.active) || a.nickname.localeCompare(b.nickname, "th"))

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">บุคลากรสาขา{branch.name} {list.filter((s) => s.active).length} คน</p>
        {manage && <Button className="ml-auto" onClick={() => setEditing("new")}><PlusIcon /> เพิ่มบุคลากร</Button>}
      </div>
      <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        {list.map((s) => {
          const upcoming = futureSessionsOf(s.id, sessions, today).length
          return (
            <div key={s.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", !s.active && "opacity-50")}>
              <span className={cn("grid size-9 place-items-center rounded-full text-sm font-semibold", avatarTone(s.id))}>{initial(s.nickname)}</span>
              <div className="min-w-40 flex-1">
                <div className="text-sm font-medium">{s.nickname} <span className="font-normal text-muted-foreground">· {s.name}</span></div>
                <div className="text-xs text-muted-foreground">
                  {s.canLogin ? s.email : "ไม่มีบัญชีล็อกอิน (พาร์ทไทม์)"}
                  {s.subjects.length > 0 && ` · สอน ${s.subjects.join(", ")}`}
                  {s.roles.includes("teacher") && ` · คาบข้างหน้า ${upcoming}`}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">{s.roles.map((r) => <Pill key={r} tone={r === "teacher" ? "blue" : "violet"}>{ROLE_LABEL[r]}</Pill>)}</div>
              {!s.active && <Pill>ปิดบัญชีแล้ว</Pill>}
              {manage && (
                <div className="flex gap-1">
                  {s.active && <Button size="xs" variant="outline" onClick={() => setEditing(s)}>แก้ไข</Button>}
                  {s.active ? (
                    <Button size="xs" variant="ghost" className="text-red-700" disabled={!canDeactivateStaff(s, me, staff).ok} title={canDeactivateStaff(s, me, staff).ok ? undefined : (canDeactivateStaff(s, me, staff) as { error: string }).error} onClick={() => setLeaving(s)}>ปิดบัญชี</Button>
                  ) : (
                    <Button size="xs" variant="ghost" onClick={() => report(reactivate(s.id), `เปิดบัญชี ${s.nickname} แล้ว`)}>เปิดใหม่</Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {editing && <StaffForm staff={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {leaving && <DeactivateDialog s={leaving} onClose={() => setLeaving(null)} />}
    </div>
  )
}

function StaffForm({ staff: initialStaff, onClose }: { staff?: Staff; onClose: () => void }) {
  const branch = useBranch()
  const all = useStore((s) => s.staff)
  const branches = useStore((s) => s.branches)
  const save = useStore((s) => s.saveStaff)
  const [f, setF] = useState<Staff>(initialStaff ?? { id: uid("u"), name: "", nickname: "", roles: ["teacher"], branchIds: [branch.id], subjects: [], active: true, canLogin: true, email: "" })
  const [touched, setTouched] = useState(false)
  const errs = validateStaff(f, all, f.id)
  const err = (k: string) => touched && errs.find((e) => e.field === k)?.message
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const subjects = [...new Set(branches.filter((b) => f.branchIds.includes(b.id)).flatMap((b) => b.subjects))]

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{initialStaff ? `แก้ ${initialStaff.nickname}` : "เพิ่มบุคลากร"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล *" error={err("name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="ชื่อที่แสดง *" error={err("nickname")}><Input value={f.nickname} onChange={(e) => setF({ ...f, nickname: e.target.value })} placeholder="ครูมิ้นท์" /></Field>
        </div>
        <Field label="บทบาท (เลือกได้หลายอัน)" error={err("roles")}>
          <div className="flex flex-wrap gap-3">
            {ROLES.map((r) => <label key={r} className="flex items-center gap-1.5 text-sm"><Checkbox checked={f.roles.includes(r)} onCheckedChange={() => setF({ ...f, roles: toggle(f.roles, r) })} />{ROLE_LABEL[r]}</label>)}
          </div>
        </Field>
        <Field label="สาขา" error={err("branchIds")}>
          <div className="flex flex-wrap gap-3">
            {branches.map((b) => <label key={b.id} className="flex items-center gap-1.5 text-sm"><Checkbox checked={f.branchIds.includes(b.id)} onCheckedChange={() => setF({ ...f, branchIds: toggle(f.branchIds, b.id) })} />{b.name}</label>)}
          </div>
        </Field>
        {f.roles.includes("teacher") && (
          <Field label="วิชาที่สอน">
            <div className="flex flex-wrap gap-3">
              {subjects.map((s) => <label key={s} className="flex items-center gap-1.5 text-sm"><Checkbox checked={f.subjects.includes(s)} onCheckedChange={() => setF({ ...f, subjects: toggle(f.subjects, s) })} />{s}</label>)}
            </div>
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.canLogin} onCheckedChange={(v) => setF({ ...f, canLogin: !!v })} /> มีบัญชีล็อกอินเข้าระบบ</label>
        {f.canLogin ? (
          <Field label="อีเมล *" error={err("email")}><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        ) : (
          <p className="text-xs text-muted-foreground">ครูพาร์ทไทม์ที่ไม่ใช้ระบบ ไม่ต้องมีอีเมล — แอดมินเช็คชื่อ/เขียนสรุปแทนได้</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => { setTouched(true); if (report(save(f), "บันทึกแล้ว")) onClose() }}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** F2: before closing a teacher's account, hand over every upcoming session */
function DeactivateDialog({ s, onClose }: { s: Staff; onClose: () => void }) {
  const branch = useBranch()
  const staff = useStore((st) => st.staff)
  const sessions = useStore((st) => st.sessions)
  const deactivate = useStore((st) => st.deactivateStaff)
  const today = toDateStr(useNow())
  const future = futureSessionsOf(s.id, sessions, today)
  const [replacement, setReplacement] = useState("")
  const candidates = staff.filter((t) => t.id !== s.id && t.active && t.roles.includes("teacher") && t.branchIds.includes(branch.id))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ปิดบัญชี {s.nickname}?</DialogTitle>
          <DialogDescription>ประวัติการสอนเดิมยังอยู่และแสดงชื่อเป็น &quot;{s.nickname} (ออกแล้ว)&quot;</DialogDescription>
        </DialogHeader>
        {future.length > 0 ? (
          <div className="space-y-2 text-sm">
            <p>ยังมี <b>{future.length} คาบ</b> ตั้งแต่ {fmtDate(future.map((x) => x.date).sort()[0])} ที่ {s.nickname} สอนอยู่ — เลือกครูที่จะรับแทน</p>
            <NativeSelect value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="ยังไม่มีครู (ไปจัดทีหลัง)" options={candidates.map((t) => ({ value: t.id, label: `${t.nickname}${t.subjects.length ? ` · ${t.subjects.join(", ")}` : ""}` }))} />
            {!replacement && <p className="text-xs text-amber-700">คาบเหล่านี้จะไปอยู่ช่อง &quot;ยังไม่มีครู&quot; ในปฏิทิน</p>}
          </div>
        ) : <p className="text-sm text-muted-foreground">ไม่มีคาบในอนาคต</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" onClick={() => report(deactivate(s.id, replacement || null), (v) => `ปิดบัญชีแล้ว${v.reassigned ? ` · ย้าย ${v.reassigned} คาบ` : ""}`) && onClose()}>ยืนยันปิดบัญชี</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
