"use client"

import { Pill } from "@/components/app/badges"
import { STATUS_PILL } from "@/components/app/student-status"
import type { StudentStatus } from "@/domain/rules/attendance"
import { useLeadSets } from "@/lib/hooks"
import { tx } from "@/lib/i18n"

/**
 * owner 2026-11-25: a student who has not paid yet is a LEAD — one record, two states — and the pill says so instead of "Inactive".
 * Everyone else keeps the usual status (Active / Renewal / Inactive …).
 */
export function StudentStatusPill({ studentId, status }: { studentId: string; status: StudentStatus }) {
  const sets = useLeadSets()
  if (sets.studentIds.has(studentId)) return <Pill tone="blue">{tx("Lead")}</Pill>
  return <Pill tone={STATUS_PILL[status].tone}>{STATUS_PILL[status].label}</Pill>
}
