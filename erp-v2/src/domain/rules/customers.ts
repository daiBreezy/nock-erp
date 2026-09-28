// "Select Customer" (owner design 2026-09-28): one searchable, filterable, sortable list of students, leads and
// families — replaces the plain dropdowns that loaded every record (rule: pickers must cope with 100,000 records).

import type { Family, ID, Lead, Student } from "../types"
import { LEAD_STAGE_LABEL } from "./crm"
import { nicknameFrom } from "./people"

export type CustomerKind = "student" | "lead" | "family"
export type CustomerSort = "name" | "grade" | "recent"

export const CUSTOMER_KIND_LABEL: Record<CustomerKind, string> = { student: "นักเรียน", lead: "Lead", family: "ครอบครัว" }

export interface CustomerRow {
  kind: CustomerKind
  id: ID
  /** "ภูมิ ใจดี (ภูมิ)" / lead or family name */
  title: string
  /** name for the avatar initial — nickname, never a title like "ด.ช." / "คุณ" */
  short: string
  /** family name, lead stage, or parents */
  sub: string
  grade?: string
  familyId?: ID | null
  createdAt?: string
  /** lowercase text the search box matches against (names, family, phones) */
  haystack: string
}

const digits = (s: string) => s.replace(/\D/g, "")

export function customerRows(data: { students: Student[]; families: Family[]; leads: Lead[] }, kinds: CustomerKind[]): CustomerRow[] {
  const fam = new Map(data.families.map((f) => [f.id, f]))
  const rows: CustomerRow[] = []
  if (kinds.includes("student"))
    for (const s of data.students) {
      if (s.archived) continue
      const f = s.familyId ? fam.get(s.familyId) : undefined
      rows.push({
        kind: "student", id: s.id, title: `${s.name} (${s.nickname})`, short: s.nickname, sub: f?.name ?? "ยังไม่ผูกครอบครัว", grade: s.grade, familyId: s.familyId, createdAt: s.createdAt,
        haystack: [s.name, s.nickname, s.school, f?.name, ...(f?.parents.flatMap((p) => [p.name, digits(p.phone)]) ?? [])].join(" ").toLowerCase(),
      })
    }
  if (kinds.includes("lead"))
    for (const l of data.leads) {
      if (l.stage === "archived" || l.stage === "enrolled") continue
      rows.push({
        kind: "lead", id: l.id, title: l.name, short: nicknameFrom(l.name), sub: `${l.subject} · ${LEAD_STAGE_LABEL[l.stage]}`, grade: l.childGrade, createdAt: l.createdAt,
        haystack: [l.name, l.subject, digits(l.phone), l.lineId].join(" ").toLowerCase(),
      })
    }
  if (kinds.includes("family"))
    for (const f of data.families) {
      const kids = data.students.filter((s) => s.familyId === f.id)
      rows.push({
        kind: "family", id: f.id, title: f.name, short: f.name.replace(/^ครอบครัว/, "") || f.name, sub: [f.parents.find((p) => p.primary)?.name, kids.map((k) => k.nickname).join(", ")].filter(Boolean).join(" · "), grade: kids[0]?.grade,
        haystack: [f.name, ...f.parents.flatMap((p) => [p.name, digits(p.phone)]), ...kids.flatMap((k) => [k.name, k.nickname])].join(" ").toLowerCase(),
      })
    }
  return rows
}

export function filterCustomers(rows: CustomerRow[], opts: { q: string; kinds: CustomerKind[]; grade: string; sort: CustomerSort; gradeOrder?: string[] }): CustomerRow[] {
  const q = opts.q.trim().toLowerCase()
  const qd = digits(q)
  const out = rows.filter(
    (r) => opts.kinds.includes(r.kind) && (!opts.grade || r.grade === opts.grade) && (!q || r.haystack.includes(q) || (qd.length >= 3 && r.haystack.includes(qd))),
  )
  const gi = (g?: string) => (g && opts.gradeOrder ? opts.gradeOrder.indexOf(g) : 99)
  return out.sort((a, b) =>
    opts.sort === "recent" ? (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    : opts.sort === "grade" ? gi(a.grade) - gi(b.grade) || a.title.localeCompare(b.title, "th")
    : a.title.localeCompare(b.title, "th"),
  )
}
