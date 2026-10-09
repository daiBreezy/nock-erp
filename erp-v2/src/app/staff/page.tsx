"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { HEAD, ROW, SortHeader, TableShell, Th, useSort } from "@/components/app/data-table"
import { avatarTone, initial } from "@/components/app/subject-color"
import { mondayOf, StaffPanel } from "@/components/staff/staff-panel"
import { Button } from "@/components/ui/button"
import { addDays, toDateStr } from "@/domain/dates"
import { can, rolesAt, ROLE_LABEL, staffInBranch, subjectsAt } from "@/domain/rules/permissions"
import { teachersOf } from "@/domain/rules/scheduling"
import type { ID } from "@/domain/types"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type StaffSort = "nickname" | "name" | "role" | "type" | "week"

/** owner 2026-10-09: the table only shows — click a row for the side panel (information · แก้ไข · ปิดบัญชี) */
export default function StaffPage() {
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const today = toDateStr(useNow())
  const [open, setOpen] = useState<ID | "new" | null>(null)
  const manage = can(me, "staff.manage")
  const { sort, toggle } = useSort<StaffSort>("nickname")
  // "สอนสัปดาห์นี้" (owner 2026-10-09) — sessions this Monday–Sunday at this branch
  const from = mondayOf(today), to = addDays(from, 6)
  const weekOf = (id: string) => sessions.filter((x) => !x.cancelled && x.branchId === branch.id && x.date >= from && x.date <= to && teachersOf(x).includes(id))
  const list = staff
    .filter((s) => staffInBranch(s, branch.id))
    .map((s) => ({ s, roles: rolesAt(s, branch.id), subjects: subjectsAt(s, branch.id), week: weekOf(s.id) }))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "nickname" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "name" ? a.s.name.localeCompare(b.s.name, "th")
          : k === "role" ? (ROLE_LABEL[a.roles[0]] ?? "").localeCompare(ROLE_LABEL[b.roles[0]] ?? "", "th")
            : k === "type" ? Number(!!a.s.partTime) - Number(!!b.s.partTime)
              : a.week.length - b.week.length
      return Number(b.s.active) - Number(a.s.active) || (sort.desc ? -v : v)
    })

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">บุคลากรสาขา{branch.name} {list.filter((x) => x.s.active).length} คน · กดที่แถวเพื่อดูข้อมูล / แก้ไข</p>
        {manage && <Button className="ml-auto" onClick={() => setOpen("new")}><PlusIcon /> เพิ่มบุคลากร</Button>}
      </div>
      <TableShell minWidth={1000} cols={["160px", "200px", "170px", "auto", "200px", "110px", "120px"]}>
        <thead className={HEAD}>
          <tr>
            <SortHeader label="ชื่อเล่น" k="nickname" sort={sort} onSort={toggle} />
            <SortHeader label="ชื่อ-นามสกุล" k="name" sort={sort} onSort={toggle} />
            <SortHeader label="ตำแหน่ง (สาขานี้)" k="role" sort={sort} onSort={toggle} />
            <Th>วิชาที่สอน</Th>
            <Th>อีเมล</Th>
            <SortHeader label="ประเภท" k="type" sort={sort} onSort={toggle} />
            <SortHeader label="สอนสัปดาห์นี้" k="week" sort={sort} onSort={toggle} right />
          </tr>
        </thead>
        <tbody>
          {list.map(({ s, roles, subjects, week }) => (
            <tr key={s.id} onClick={() => setOpen(s.id)} className={cn(ROW, !s.active && "opacity-50")}>
              <td>
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(s.id))}>{initial(s.nickname)}</span>
                  <span className="truncate font-medium">{s.nickname}</span>
                </div>
              </td>
              <td className="truncate text-muted-foreground">{s.name}</td>
              <td className="truncate">{roles.map((r) => <Pill key={r} tone={r === "teacher" ? "blue" : "violet"} className="mr-1">{ROLE_LABEL[r]}</Pill>)}{!s.active && <Pill>ปิดบัญชีแล้ว</Pill>}</td>
              <td className="truncate text-muted-foreground" title={subjects.join(", ")}>{subjects.join(", ") || "—"}</td>
              <td className="truncate text-muted-foreground">
                {s.email || "—"}{!s.canLogin && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px]">ไม่ล็อกอิน</span>}
              </td>
              <td>{s.partTime ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Part-time</span> : <span className="text-muted-foreground">Full-time</span>}</td>
              <td className="text-right tabular-nums text-muted-foreground" title="คาบที่สอน จ.–อา. สัปดาห์นี้ ที่สาขานี้">
                {roles.includes("teacher") ? <>{week.length} คาบ <span className="text-xs">· {Math.round(week.reduce((m, x) => m + x.minutes, 0) / 6) / 10} ชม.</span></> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      <StaffPanel key={String(open)} target={open} onClose={() => setOpen(null)} />
    </div>
  )
}
