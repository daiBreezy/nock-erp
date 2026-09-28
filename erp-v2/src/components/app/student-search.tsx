"use client"

import { useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { searchStudents } from "@/domain/rules/people"
import type { Student } from "@/domain/types"
import { cn } from "@/lib/utils"
import { gradeTone } from "./subject-color"

/**
 * Search-as-you-type student picker. Only ever renders a handful of matches, so it stays usable with
 * 100,000 students. Selected students (multi mode) show as removable chips above the box.
 */
export function StudentSearch({
  students, selected = [], onPick, onRemove, preferGrades, exclude = [], placeholder = "พิมพ์ชื่อ / ชื่อเล่น / ชั้น / โรงเรียน", renderMeta, autoFocus,
}: {
  students: Student[]
  selected?: Student[]
  onPick: (s: Student) => void
  onRemove?: (s: Student) => void
  preferGrades?: string[]
  exclude?: string[]
  placeholder?: string
  renderMeta?: (s: Student) => React.ReactNode
  autoFocus?: boolean
}) {
  const [q, setQ] = useState("")
  const { items, total } = searchStudents(students, q, { exclude: [...exclude, ...selected.map((s) => s.id)], preferGrades })

  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s.id} className="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs text-primary">
              {s.nickname} · {s.grade}
              {onRemove && <button type="button" aria-label={`เอา ${s.nickname} ออก`} onClick={() => onRemove(s)} className="rounded-full p-0.5 hover:bg-primary/20"><XIcon className="size-3" /></button>}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      </div>
      {(q.trim() || items.length > 0) && (
        <ul className="divide-y overflow-hidden rounded-xl border">
          {items.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => { onPick(s); setQ("") }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/60">
                <span className="text-sm font-medium">{s.nickname}</span>
                <span className={cn("rounded px-1 text-[10px] font-semibold", gradeTone(s.grade))}>{s.grade}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{s.name}{s.school ? ` · ${s.school}` : ""}</span>
                {renderMeta?.(s)}
              </button>
            </li>
          ))}
          {items.length === 0 && <li className="px-3 py-3 text-center text-xs text-muted-foreground">ไม่พบนักเรียน</li>}
          {total > items.length && <li className="bg-muted/30 px-3 py-1.5 text-center text-[11px] text-muted-foreground">แสดง {items.length} จาก {total.toLocaleString()} คน — พิมพ์เพิ่มเพื่อให้แคบลง</li>}
        </ul>
      )}
      {!q.trim() && items.length === 0 && <p className="text-[11px] text-muted-foreground">พิมพ์เพื่อค้นหา{preferGrades?.length ? " — หรือเลือกระดับชั้นของคลาสก่อน จะขึ้นนักเรียนชั้นนั้นให้" : ""}</p>}
    </div>
  )
}
