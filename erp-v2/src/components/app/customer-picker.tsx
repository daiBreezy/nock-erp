"use client"

import { useMemo, useState } from "react"
import { CheckIcon, SearchIcon, UserRoundIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { CUSTOMER_KIND_LABEL, customerRows, filterCustomers, type CustomerKind, type CustomerRow, type CustomerSort } from "@/domain/rules/customers"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Pill } from "./badges"
import { Pager, usePage } from "./data-table"
import { NativeSelect } from "./native-select"
import { avatarTone, gradeTone, initial } from "./subject-color"

/**
 * "Select Customer" (owner design): search + type/grade filter chips + sort + paged radio list + Confirm.
 * Only one page of rows is rendered, so it stays usable with 100,000 records.
 */
export function CustomerPicker({
  kinds, title = "เลือกลูกค้า", onConfirm, onClose, initialKinds,
}: {
  kinds: CustomerKind[]
  title?: string
  initialKinds?: CustomerKind[]
  onConfirm: (row: CustomerRow) => void
  onClose: () => void
}) {
  const branch = useBranch()
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const leads = useStore((s) => s.leads)
  const [q, setQ] = useState("")
  const [on, setOn] = useState<CustomerKind[]>(initialKinds ?? kinds)
  const [grade, setGrade] = useState("")
  const [sort, setSort] = useState<CustomerSort>("name")
  const [picked, setPicked] = useState<CustomerRow | null>(null)

  const all = useMemo(
    () => customerRows({ students: students.filter((s) => s.branchId === branch.id), families, leads: leads.filter((l) => l.branchId === branch.id) }, kinds),
    [students, families, leads, branch.id, kinds],
  )
  const rows = useMemo(() => filterCustomers(all, { q, kinds: on, grade, sort, gradeOrder: branch.grades }), [all, q, on, grade, sort, branch.grades])
  const page = usePage(rows, 30)
  const toggle = (k: CustomerKind) => setOn((cur) => (cur.includes(k) ? (cur.length > 1 ? cur.filter((x) => x !== k) : cur) : [...cur, k]))
  const filtered = q || grade || on.length !== kinds.length

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-3 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-2 border-b pb-3">
          <UserRoundIcon className="size-5" />
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus className="h-10 pl-9" value={q} onChange={(e) => { setQ(e.target.value); page.setPage(0) }} placeholder="ชื่อ / ชื่อเล่น / ครอบครัว / เบอร์โทร" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {kinds.length > 1 && kinds.map((k) => (
            <button key={k} type="button" onClick={() => { toggle(k); page.setPage(0) }}
              className={cn("inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm", on.includes(k) ? "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200" : "border text-muted-foreground")}>
              {on.includes(k) && <CheckIcon className="size-3.5" />}{CUSTOMER_KIND_LABEL[k]}
            </button>
          ))}
          <NativeSelect className="h-8 w-28" value={grade} onChange={(e) => { setGrade(e.target.value); page.setPage(0) }} placeholder="ทุกชั้น" options={branch.grades.map((g) => ({ value: g, label: g }))} />
          <NativeSelect className="h-8 w-32" value={sort} onChange={(e) => setSort(e.target.value as CustomerSort)} options={[{ value: "name", label: "เรียงตามชื่อ" }, { value: "grade", label: "เรียงตามชั้น" }, { value: "recent", label: "เพิ่มล่าสุด" }]} />
          {filtered && <button type="button" className="ml-auto text-sm text-primary" onClick={() => { setQ(""); setGrade(""); setOn(kinds); page.setPage(0) }}>ล้างทั้งหมด</button>}
        </div>
        <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
          {page.rows.map((r) => {
            const sel = picked?.kind === r.kind && picked.id === r.id
            return (
              <li key={`${r.kind}-${r.id}`}>
                <button type="button" onClick={() => setPicked(r)} onDoubleClick={() => onConfirm(r)}
                  className={cn("flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors", sel ? "bg-violet-100 dark:bg-violet-950" : "hover:bg-muted/60")}>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", sel ? "border-violet-700" : "border-muted-foreground/50")}>{sel && <span className="size-2.5 rounded-full bg-violet-700" />}</span>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-semibold", avatarTone(r.id))}>{initial(r.short)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground"><UsersIcon className="size-3 shrink-0" />{r.sub}</span>
                  </span>
                  {kinds.length > 1 && <Pill tone={r.kind === "lead" ? "amber" : r.kind === "family" ? "blue" : "gray"}>{CUSTOMER_KIND_LABEL[r.kind]}</Pill>}
                  {r.grade && <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", gradeTone(r.grade))}>{r.grade}</span>}
                </button>
              </li>
            )
          })}
          {rows.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">ไม่พบ — ลองคำค้นอื่นหรือล้างตัวกรอง</li>}
        </ul>
        <Pager {...page} unit="รายชื่อ" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!picked} onClick={() => picked && onConfirm(picked)}><CheckIcon /> ยืนยัน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
