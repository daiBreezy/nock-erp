"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { HEAD, ROW, SortHeader, TableShell, Th, useSort } from "@/components/app/data-table"
import { EditCell } from "@/components/app/inline-edit"
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

type StaffSort = "nickname" | "name" | "role" | "type" | "upcoming"

const ROLES: Role[] = ["super_admin", "director", "area_manager", "manager", "admin", "teacher"]

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
  const saveStaff = useStore((s) => s.saveStaff)
  const { sort, toggle } = useSort<StaffSort>("nickname")
  // inline edit (owner 2026-10-07) — same validation as the staff form
  const edit = (st: Staff, patch: Partial<Staff>) => report(saveStaff({ ...st, ...patch }), "บันทึกแล้ว")
  const upcomingOf = (id: string) => futureSessionsOf(id, sessions, today).length
  const list = staff
    .filter((s) => s.branchIds.includes(branch.id))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "nickname" ? a.nickname.localeCompare(b.nickname, "th")
        : k === "name" ? a.name.localeCompare(b.name, "th")
          : k === "role" ? ROLE_LABEL[a.roles[0]].localeCompare(ROLE_LABEL[b.roles[0]], "th")
            : k === "type" ? Number(!!a.partTime) - Number(!!b.partTime)
              : upcomingOf(a.id) - upcomingOf(b.id)
      return Number(b.active) - Number(a.active) || (sort.desc ? -v : v)
    })

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">บุคลากรสาขา{branch.name} {list.filter((s) => s.active).length} คน</p>
        {manage && <Button className="ml-auto" onClick={() => setEditing("new")}><PlusIcon /> เพิ่มบุคลากร</Button>}
      </div>
      {/* owner 2026-10-07: a real table — names / email / full- or part-time edit in place on hover; role, subjects
          and branches (several at once) are edited in the popup: click the other cells or "แก้ไข" */}
      <TableShell minWidth={1100} cols={["150px", "190px", "150px", "auto", "180px", "110px", "88px", "150px"]}>
        <thead className={HEAD}>
          <tr>
            <SortHeader label="ชื่อเล่น" k="nickname" sort={sort} onSort={toggle} />
            <SortHeader label="ชื่อ-นามสกุล" k="name" sort={sort} onSort={toggle} />
            <SortHeader label="ตำแหน่ง" k="role" sort={sort} onSort={toggle} />
            <Th>วิชาที่สอน</Th>
            <Th>อีเมลเข้าระบบ</Th>
            <SortHeader label="ประเภท" k="type" sort={sort} onSort={toggle} />
            <SortHeader label="คาบข้างหน้า" k="upcoming" sort={sort} onSort={toggle} right />
            <Th />
          </tr>
        </thead>
        <tbody>
          {list.map((s) => {
            const ro = !manage || !s.active
            const deact = canDeactivateStaff(s, me, staff)
            return (
              <tr key={s.id} onClick={() => !ro && setEditing(s)} className={cn(ROW, ro && "cursor-default", !s.active && "opacity-50")}>
                <td>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(s.id))}>{initial(s.nickname)}</span>
                    <EditCell value={s.nickname} disabled={ro} className="flex-1 font-medium" onSave={(v) => edit(s, { nickname: v })} />
                  </div>
                </td>
                <td className="text-muted-foreground"><EditCell value={s.name} disabled={ro} onSave={(v) => edit(s, { name: v })} /></td>
                <td className="truncate">{s.roles.map((r) => <Pill key={r} tone={r === "teacher" ? "blue" : "violet"} className="mr-1">{ROLE_LABEL[r]}</Pill>)}{!s.active && <Pill>ปิดบัญชีแล้ว</Pill>}</td>
                <td className="truncate text-muted-foreground" title={s.subjects.join(", ")}>{s.subjects.join(", ") || "—"}</td>
                <td className="text-muted-foreground" title={s.canLogin ? undefined : "เก็บข้อมูลเท่านั้น — ไม่มีสิทธิ์เข้าระบบ"}>
                  {/* S5 (owner 2026-10-09): everyone has an email field — no-login staff keep it as data only */}
                  <span className="flex items-center gap-1.5"><EditCell kind="email" value={s.email ?? ""} disabled={ro} placeholder={s.canLogin ? "ใส่อีเมล" : "ไม่บังคับ"} onSave={(v) => edit(s, { email: v })} />{!s.canLogin && <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px]">ไม่ล็อกอิน</span>}</span>
                </td>
                <td><EditCell kind="select" value={s.partTime ? "part" : "full"} disabled={ro} display={s.partTime ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Part-time</span> : <span className="text-muted-foreground">Full-time</span>} options={[{ value: "full", label: "Full-time" }, { value: "part", label: "Part-time" }]} onSave={(v) => edit(s, { partTime: v === "part" })} /></td>
                <td className="text-right tabular-nums text-muted-foreground">{s.roles.includes("teacher") ? upcomingOf(s.id) : "—"}</td>
                <td className="text-right" onClick={(e) => e.stopPropagation()}>
                  {manage && (s.active ? (
                    <span className="inline-flex gap-1">
                      <Button size="xs" variant="outline" onClick={() => setEditing(s)}>แก้ไข</Button>
                      <Button size="xs" variant="ghost" className="text-red-700" disabled={!deact.ok} title={deact.ok ? undefined : (deact as { error: string }).error} onClick={() => setLeaving(s)}>ปิดบัญชี</Button>
                    </span>
                  ) : <Button size="xs" variant="ghost" onClick={() => report(reactivate(s.id), `เปิดบัญชี ${s.nickname} แล้ว`)}>เปิดใหม่</Button>)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableShell>
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
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!f.partTime} onCheckedChange={(v) => setF({ ...f, partTime: !!v })} /> ครู Part-time (เลือกเป็นครูสอนแทนตอนครูลาได้)</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={f.canLogin} onCheckedChange={(v) => setF({ ...f, canLogin: !!v })} /> มีบัญชีล็อกอินเข้าระบบ</label>
        {/* S5 (owner 2026-10-09): email is always there — required only for a login; otherwise kept as data (may log in later) */}
        <Field label={f.canLogin ? "อีเมล *" : "อีเมล (ไม่บังคับ)"} error={err("email")}><Input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        {!f.canLogin && <p className="text-xs text-muted-foreground">ไม่มีสิทธิ์เข้าระบบ — เก็บข้อมูลไว้เฉยๆ (เปิดบัญชีล็อกอินภายหลังได้) · แอดมินเช็คชื่อ/เขียนสรุปแทนได้</p>}
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
