"use client"

import { useState } from "react"
import { DownloadIcon, PlusIcon, SearchIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { StudentForm } from "@/components/app/student-form"
import { STATUS_PILL, StudentSheet } from "@/components/app/student-sheet"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import type { ID } from "@/domain/types"
import { useBranch, useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { toast } from "sonner"

export default function StudentsPage() {
  const branch = useBranch()
  const today = toDateStr(useNow())
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const students = useStore((s) => s.students).filter((s) => s.branchId === branch.id)
  const families = useStore((s) => s.families)
  const classes = useStore((s) => s.classes)
  const entitlements = useEntitlements()
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const [q, setQ] = useState("")
  const [grade, setGrade] = useState("")
  const [status, setStatus] = useState("")
  const [openId, setOpenId] = useState<ID | null>(null)
  const [adding, setAdding] = useState(false)

  const rows = students.map((s) => {
    const st = Att.studentStatus(s.id, entitlements, today)
    const ents = Att.activeEntitlements(s.id, entitlements, today)
    const packs = ents.map((e) => ({ e, b: Att.balance(e, sessions, attendance) }))
    return { s, st, packs, fam: families.find((f) => f.id === s.familyId), inClasses: classes.filter((c) => c.active && c.studentIds.includes(s.id)) }
  })
  const shown = rows
    .filter((r) => !grade || r.s.grade === grade)
    .filter((r) => !status || r.st === status)
    .filter((r) => !q || `${r.s.name} ${r.s.nickname} ${r.fam?.name ?? ""} ${r.fam?.parents.map((p) => p.phone).join(" ") ?? ""}`.includes(q))
    .sort((a, b) => a.s.nickname.localeCompare(b.s.nickname, "th"))

  // G3: export only for roles with student.export — and it is logged in the toast
  const exportCsv = () => {
    const head = ["ชื่อ", "ชื่อเล่น", "ชั้น", "ครอบครัว", "สถานะ"]
    const lines = shown.map((r) => [r.s.name, r.s.nickname, r.s.grade, r.fam?.name ?? "", STATUS_PILL[r.st].label].map((x) => `"${x.replace(/"/g, '""')}"`).join(","))
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `students-${branch.code}-${today}.csv`
    a.click()
    toast.success(`ส่งออก ${shown.length} รายชื่อแล้ว (ไม่รวมเบอร์โทร/ที่อยู่)`)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ชื่อ / ชื่อเล่น / ครอบครัว / เบอร์" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-28" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="ทุกชั้น" options={branch.grades.map((g) => ({ value: g, label: g }))} />
        <NativeSelect className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ทุกสถานะ" options={Object.entries(STATUS_PILL).map(([k, v]) => ({ value: k, label: v.label }))} />
        <span className="text-xs text-muted-foreground">{shown.length} คน</span>
        <div className="ml-auto flex gap-2">
          {can(me, "student.export") && <Button variant="outline" onClick={exportCsv}><DownloadIcon /> ส่งออก</Button>}
          {can(me, "student.manage") && <Button onClick={() => setAdding(true)}><PlusIcon /> เพิ่มนักเรียน</Button>}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        <div className="hidden grid-cols-[1.6fr_1.2fr_1.6fr_1.4fr] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
          <span>นักเรียน</span><span>ครอบครัว</span><span>คลาส</span><span>แพ็กเกจ</span>
        </div>
        {shown.map(({ s, st, packs, fam, inClasses }) => (
          <button key={s.id} onClick={() => setOpenId(s.id)} className="grid w-full gap-1 border-b px-4 py-2.5 text-left text-sm last:border-0 hover:bg-muted/40 md:grid-cols-[1.6fr_1.2fr_1.6fr_1.4fr] md:items-center md:gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(s.id))}>{initial(s.nickname)}</span>
              <span className="min-w-0">
                <span className="font-medium">{s.nickname}</span> <span className={cn("rounded px-1 text-[10px] font-semibold", gradeTone(s.grade))}>{s.grade}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.name}</span>
              </span>
            </span>
            <span className="truncate text-muted-foreground">
              {fam?.name ?? <span className="text-amber-700">ยังไม่ผูกครอบครัว</span>}
              {fam && !fam.parents.some((p) => p.lineLinked) && <span className="text-xs text-amber-700"> · ไม่มี LINE</span>}
            </span>
            <span className="truncate text-muted-foreground">{inClasses.map((c) => c.name).join(", ") || "—"}</span>
            <span className="flex flex-wrap items-center gap-1">
              <Pill tone={STATUS_PILL[st].tone}>{STATUS_PILL[st].label}</Pill>
              {packs.filter(({ e }) => e.kind === "sessions").map(({ e, b }) => <span key={e.id} className={cn("text-xs", b.remaining <= 2 && "font-semibold text-red-700")}>เหลือ {b.remaining} คาบ</span>)}
            </span>
          </button>
        ))}
        {shown.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">ไม่พบนักเรียน</p>}
      </div>
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
      {adding && <StudentForm onClose={() => setAdding(false)} onSaved={(s) => setOpenId(s.id)} />}
    </div>
  )
}
