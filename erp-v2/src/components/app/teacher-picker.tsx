"use client"

import type { ID, Staff } from "@/domain/types"
import { cn } from "@/lib/utils"

export interface TeacherSelection {
  ids: ID[]
  primaryId: ID | ""
}

/** Pick any number of teachers and mark one ★ as primary (responsible for attendance + summaries). */
export function TeacherPicker({ teachers, subject, value, onChange }: { teachers: Staff[]; subject?: string; value: TeacherSelection; onChange: (v: TeacherSelection) => void }) {
  const { ids, primaryId } = value
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {teachers.map((t) => {
          const on = ids.includes(t.id)
          const primary = primaryId === t.id
          const toggle = () => {
            const next = on ? ids.filter((x) => x !== t.id) : [...ids, t.id]
            onChange({ ids: next, primaryId: on && primary ? (next[0] ?? "") : !on && !primaryId ? t.id : primaryId })
          }
          return (
            <span key={t.id} className={cn("inline-flex items-center overflow-hidden rounded-full border text-xs", on ? "border-primary bg-primary/10" : "hover:bg-muted")}>
              <button type="button" onClick={toggle} className="px-2.5 py-1">
                {t.nickname}
                {subject && !t.subjects.includes(subject) && <span className="text-muted-foreground"> · ไม่ได้สอน{subject}</span>}
              </button>
              {on && (
                <button type="button" onClick={() => onChange({ ids, primaryId: t.id })} title="ตั้งเป็นครูหลัก" className={cn("border-l px-2 py-1", primary ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {primary ? "★ ครูหลัก" : "☆"}
                </button>
              )}
            </span>
          )
        })}
      </div>
      {ids.length > 1 && <p className="text-xs text-muted-foreground">ครูหลักรับผิดชอบเช็คชื่อและสรุปการเรียน · คนอื่นเป็นผู้ช่วยสอน (ระบบเช็คเวลาชนให้ทุกคน)</p>}
    </div>
  )
}
