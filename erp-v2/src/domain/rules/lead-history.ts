import type { Assessment, DateStr, ID, Invoice, Lead, Student } from "../types"

/**
 * owner 2026-11-25: once a Lead has paid it is a Customer and the journey is past — nobody needs the whole stepper again. A short straight timeline
 * is enough: when something happened and what came of it. Top to bottom, oldest first.
 */
export interface HistoryEvent { at: DateStr; kind: "created" | "test" | "trial" | "enroll"; who?: string; result?: string }

type LeadLink = Pick<Lead, "id" | "familyId" | "trialStudentId" | "convertedStudentId" | "kids" | "createdAt" | "winBackOf">

/** the Lead this family came from (a win-back Lead is a former Customer coming back — not where they started) */
export function leadOfFamily(familyId: ID, leads: LeadLink[], students: Pick<Student, "id" | "familyId">[]): LeadLink | undefined {
  const mine = new Set(students.filter((s) => s.familyId === familyId).map((s) => s.id))
  return leads.find((l) => !l.winBackOf && (l.familyId === familyId || [l.trialStudentId, l.convertedStudentId, ...(l.kids ?? []).map((k) => k.studentId)].some((id) => !!id && mine.has(id))))
}

export function leadHistory(
  lead: LeadLink,
  assessments: Pick<Assessment, "leadId" | "studentId" | "type" | "date" | "result">[],
  students: Pick<Student, "id" | "nickname" | "name">[],
  invoices: Pick<Invoice, "studentId" | "payments">[],
): HistoryEvent[] {
  const nick = (id: ID) => { const s = students.find((x) => x.id === id); return s?.nickname || s?.name }
  const ev: HistoryEvent[] = [{ at: lead.createdAt.slice(0, 10), kind: "created" }]
  for (const a of assessments.filter((x) => x.leadId === lead.id)) ev.push({ at: a.date, kind: a.type === "trial" ? "trial" : "test", who: nick(a.studentId), result: a.result })
  // "Enroll" = the day each child's FIRST payment was confirmed (money received)
  const kidIds = new Set([lead.trialStudentId, lead.convertedStudentId, ...(lead.kids ?? []).map((k) => k.studentId)].filter((x): x is ID => !!x))
  for (const id of kidIds) {
    const first = invoices.filter((i) => i.studentId === id).flatMap((i) => i.payments).filter((p) => p.confirmedBy).map((p) => p.paidOn ?? p.recordedAt.slice(0, 10)).sort()[0]
    if (first) ev.push({ at: first, kind: "enroll", who: nick(id) })
  }
  const order = { created: 0, test: 1, trial: 2, enroll: 3 } as const
  return ev.sort((a, b) => a.at.localeCompare(b.at) || order[a.kind] - order[b.kind])
}
