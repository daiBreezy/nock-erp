"use client"

import { useMemo, useState } from "react"
import { CopyIcon, MessageCircleIcon, PencilIcon, PlusIcon, SearchIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Pill } from "@/components/app/badges"
import { Pager, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { FamilyForm } from "@/components/app/family-form"
import { NativeSelect } from "@/components/app/native-select"
import { StudentForm } from "@/components/app/student-form"
import { StudentSheet } from "@/components/app/student-sheet"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { fmtDateTime } from "@/domain/dates"
import { lineCodeValid } from "@/domain/rules/people"
import type { Family, ID, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type FamSort = "name" | "kids" | "line"

/** Families as a data table (owner 2026-09-28: cards were hard to scan). Click a row → detail panel. */
export default function FamiliesPage() {
  const branch = useBranch()
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const [q, setQ] = useState("")
  const [lineF, setLineF] = useState("")
  const [editing, setEditing] = useState<Family | "new" | null>(null)
  const [openId, setOpenId] = useState<ID | null>(null)
  const { sort, toggle } = useSort<FamSort>("name")

  // children per family, built once (not a scan per row)
  const kidsOf = useMemo(() => {
    const m = new Map<ID, Student[]>()
    students.forEach((s) => { if (s.familyId) m.set(s.familyId, [...(m.get(s.familyId) ?? []), s]) })
    return m
  }, [students])

  const linkedCount = (f: Family) => f.parents.filter((p) => p.lineLinked).length
  const needle = q.trim().toLowerCase()
  const rows = families
    // a family belongs to this branch if one of its children studies here (or it has no children yet)
    .filter((f) => { const k = kidsOf.get(f.id) ?? []; return k.length === 0 || k.some((s) => s.branchId === branch.id) })
    .filter((f) => !lineF || (lineF === "linked" ? linkedCount(f) === f.parents.length : linkedCount(f) < f.parents.length))
    .filter((f) => !needle || `${f.name} ${f.parents.map((p) => `${p.name} ${p.phone}`).join(" ")} ${(kidsOf.get(f.id) ?? []).map((s) => `${s.nickname} ${s.name}`).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => {
      const v = sort.key === "name" ? a.name.localeCompare(b.name, "th")
        : sort.key === "kids" ? (kidsOf.get(a.id)?.length ?? 0) - (kidsOf.get(b.id)?.length ?? 0)
          : linkedCount(a) / a.parents.length - linkedCount(b) / b.parents.length
      return sort.desc ? -v : v
    })
  const pg = usePage(rows)
  const orphans = students.filter((s) => s.branchId === branch.id && !s.familyId).length

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ครอบครัว / ผู้ปกครอง / เบอร์ / ชื่อลูก" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-40" value={lineF} onChange={(e) => setLineF(e.target.value)} placeholder="LINE ทั้งหมด" options={[{ value: "linked", label: "ผูก LINE ครบ" }, { value: "missing", label: "ยังผูกไม่ครบ" }]} />
        <Button className="ml-auto" onClick={() => setEditing("new")}><PlusIcon /> เพิ่มครอบครัว</Button>
      </div>
      {orphans > 0 && <p className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">นักเรียน {orphans} คนยังไม่ผูกครอบครัว — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้ (ดูได้ที่หน้านักเรียน)</p>}

      <TableShell minWidth={900}>
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            <SortHeader label="ครอบครัว" k="name" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">ผู้ปกครองหลัก</th>
            <th className="px-3 py-2.5 text-left font-medium">เบอร์โทร</th>
            <SortHeader label="LINE" k="line" sort={sort} onSort={toggle} />
            <SortHeader label="ลูก" k="kids" sort={sort} onSort={toggle} />
            <th className="px-3 py-2.5 text-left font-medium">ที่อยู่</th>
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((f) => {
            const primary = f.parents.find((p) => p.primary) ?? f.parents[0]
            const kids = kidsOf.get(f.id) ?? []
            const lc = linkedCount(f)
            return (
              <tr key={f.id} onClick={() => setOpenId(f.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2.5">
                <td className="font-medium">{f.name}</td>
                <td>{primary?.name}{f.parents.length > 1 && <span className="text-xs text-muted-foreground"> +{f.parents.length - 1}</span>}</td>
                <td className="whitespace-nowrap tabular-nums text-muted-foreground">{primary?.phone}</td>
                <td><Pill tone={lc === f.parents.length ? "green" : lc > 0 ? "amber" : "red"}>{lc}/{f.parents.length} ผูกแล้ว</Pill></td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {kids.slice(0, 3).map((s) => <span key={s.id} className="rounded-full border px-2 py-0.5 text-xs">{s.nickname} <span className={cn("rounded px-1 text-[10px]", gradeTone(s.grade))}>{s.grade}</span></span>)}
                    {kids.length > 3 && <span className="text-xs text-muted-foreground">+{kids.length - 3}</span>}
                    {kids.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="max-w-56 truncate text-xs text-muted-foreground">{f.address ? `${f.address}${f.postcode ? ` ${f.postcode}` : ""}` : "—"}</td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">ไม่มีครอบครัวตามเงื่อนไข</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="ครอบครัว" />

      <FamilySheet id={openId} onClose={() => setOpenId(null)} onEdit={(f) => setEditing(f)} />
      {editing && <FamilyForm family={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

/** Detail panel: parents + LINE linking (Flow E: one code per family, 7-day expiry) + children. */
function FamilySheet({ id, onClose, onEdit }: { id: ID | null; onClose: () => void; onEdit: (f: Family) => void }) {
  const branch = useBranch()
  const f = useStore((s) => s.families.find((x) => x.id === id))
  const kids = useStore((s) => s.students).filter((s) => s.familyId === id)
  const genCode = useStore((s) => s.generateLineCode)
  const simulate = useStore((s) => s.simulateLineLink)
  const now = useNow()
  const [addChild, setAddChild] = useState(false)
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)
  const code = f?.lineCode && lineCodeValid(f, now).ok ? f.lineCode : null

  return (
    <>
      <Sheet open={!!f} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {f && (
            <>
              <SheetHeader className="border-b pb-3">
                <SheetTitle className="text-lg">{f.name}</SheetTitle>
                <SheetDescription>{f.address ? `${f.address}${f.postcode ? ` ${f.postcode}` : ""}` : "ยังไม่มีที่อยู่"}</SheetDescription>
                <Button size="xs" variant="outline" className="w-fit" onClick={() => onEdit(f)}><PencilIcon /> แก้ไขครอบครัว</Button>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">ผู้ปกครอง</h3>
                  <ul className="divide-y rounded-2xl border">
                    {f.parents.map((p, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                        <span className="font-medium">{p.name}</span>{p.primary && <span className="text-xs text-muted-foreground">(หลัก)</span>}
                        <span className="text-muted-foreground tabular-nums">{p.phone}</span>
                        <Pill tone={p.lineLinked ? "green" : "amber"} className="ml-auto">{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                        {code && !p.lineLinked && <Button size="xs" variant="ghost" title="จำลอง: ผู้ปกครองส่งโค้ดเข้า LINE OA" onClick={() => report(simulate(f.id, i), `${p.name} ผูก LINE แล้ว`)}>จำลองส่งโค้ด</Button>}
                      </li>
                    ))}
                  </ul>
                  {!branch.lineOaConnected ? (
                    <p className="text-xs text-muted-foreground">สาขานี้ยังไม่เชื่อม LINE OA — ตั้งค่าที่ Settings → LINE Integration</p>
                  ) : !f.parents.every((p) => p.lineLinked) && (
                    code ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-2 text-sm">
                        <MessageCircleIcon className="size-4 text-emerald-600" />
                        โค้ดผูก LINE: <b className="font-mono tracking-widest">{code.code}</b>
                        <span className="text-xs text-muted-foreground">หมดอายุ {fmtDateTime(code.expiresAt)}</span>
                        <Button size="icon-xs" variant="ghost" aria-label="คัดลอก" onClick={() => { navigator.clipboard?.writeText(`แอด LINE ${branch.lineOa.botBasicId || "@nockacademy"} แล้วพิมพ์โค้ด ${code.code}`); toast.success("คัดลอกข้อความสำหรับส่งผู้ปกครองแล้ว") }}><CopyIcon /></Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => report(genCode(f.id), (v) => `สร้างโค้ด ${v.code} แล้ว (ใช้ได้ 7 วัน)`)}><MessageCircleIcon /> สร้างโค้ดผูก LINE</Button>
                    )
                  )}
                </section>
                <section className="space-y-2">
                  <div className="flex items-center"><h3 className="text-sm font-semibold">ลูก ({kids.length})</h3><Button size="xs" variant="ghost" className="ml-auto" onClick={() => setAddChild(true)}><UserPlusIcon /> เพิ่มลูก</Button></div>
                  <ul className="divide-y rounded-2xl border">
                    {kids.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => setStudentOpen(s.id)} className="flex w-full items-center gap-2 p-2.5 text-left text-sm hover:bg-muted/40">
                          <span className="font-medium">{s.nickname}</span>
                          <span className={cn("rounded px-1 text-[10px]", gradeTone(s.grade))}>{s.grade}</span>
                          <span className="truncate text-xs text-muted-foreground">{s.name}</span>
                        </button>
                      </li>
                    ))}
                    {kids.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">ยังไม่มีลูกในครอบครัวนี้</li>}
                  </ul>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {addChild && f && <StudentForm familyId={f.id} onClose={() => setAddChild(false)} />}
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
    </>
  )
}
