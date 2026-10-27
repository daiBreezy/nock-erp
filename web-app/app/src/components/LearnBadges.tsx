import { Badge } from '@/components/ui/badge'
import type { SubjectKey } from '@/data/mock'
import { gradeCode, subjectName, type SubjectForm } from '@/lib/labels'
import { subjectBg, subjectText } from '@/lib/subject'
import { cn } from '@/lib/utils'

const base = 'rounded-pill border-transparent px-2 py-0.5 text-[11px] font-medium shadow-none'

/** ป้ายวิชา (สีวิชา) — ค่าเริ่มต้นชื่อสั้น (คณิต) · ชื่อเต็มขึ้นเมื่อชี้ */
export function SubjectBadge({ subject, form = 'short', className }: { subject: SubjectKey; form?: SubjectForm; className?: string }) {
  return (
    <Badge variant="outline" title={subjectName(subject, 'full')} className={cn(base, subjectBg[subject], subjectText[subject], className)}>
      {subjectName(subject, form)}
    </Badge>
  )
}

/** ป้ายชั้น — แสดง G1–G12 (ป.1–6 = G1–6, ม.1–6 = G7–12) · ชื่อไทยขึ้นเมื่อชี้ */
export function GradeBadge({ grade, className }: { grade: string; className?: string }) {
  return (
    <Badge variant="outline" title={grade} className={cn(base, 'bg-surface-2 text-ink-soft', className)}>
      {gradeCode(grade)}
    </Badge>
  )
}
