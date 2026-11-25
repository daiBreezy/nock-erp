import type { Entitlement, ID, Invoice, Lead, Student } from "../types"

/**
 * owner 2026-11-25: a Lead is a Customer who has not paid yet — one record, two states. The Families / Students pages list
 * CUSTOMERS only; the CRM lists LEADS only (never mixed). The moment the FIRST payment is confirmed in Billing the Lead becomes a Customer.
 *
 * A family / student is a Lead while a Lead (not enrolled) points at it and nobody in the family has paid or holds a package. Anything
 * no Lead points at (all the existing data) is a Customer. A win-back Lead (a former student who may come back) does NOT make that
 * student a Lead — they were a Customer and stay one.
 */
export interface StateInput {
  students: Pick<Student, "id" | "familyId">[]
  leads: Pick<Lead, "id" | "stage" | "familyId" | "trialStudentId" | "convertedStudentId" | "kids" | "winBackOf">[]
  invoices: Pick<Invoice, "studentId" | "payments">[]
  entitlements: Pick<Entitlement, "studentId">[]
}

export interface LeadSets { familyIds: Set<ID>; studentIds: Set<ID> }

export function leadSets({ students, leads, invoices, entitlements }: StateInput): LeadSets {
  const familyOf = new Map(students.map((s) => [s.id, s.familyId] as const))
  // anyone who paid (a confirmed payment) or holds a package is a Customer — and so is their whole family
  const paidStudents = new Set<ID>([...entitlements.map((e) => e.studentId), ...invoices.filter((i) => i.payments.some((p) => p.confirmedBy)).map((i) => i.studentId)])
  const paidFamilies = new Set<ID>([...paidStudents].map((id) => familyOf.get(id)).filter((x): x is ID => !!x))
  const familyIds = new Set<ID>()
  const studentIds = new Set<ID>()
  for (const l of leads) {
    if (l.stage === "enrolled" || l.winBackOf) continue
    const kidIds = [l.trialStudentId, l.convertedStudentId, ...(l.kids ?? []).map((k) => k.studentId)].filter((x): x is ID => !!x)
    for (const sid of kidIds) {
      const fid = familyOf.get(sid)
      if (!paidStudents.has(sid) && !(fid && paidFamilies.has(fid))) studentIds.add(sid)
    }
    if (l.familyId && !paidFamilies.has(l.familyId)) familyIds.add(l.familyId)
    for (const sid of kidIds) { const fid = familyOf.get(sid); if (fid && !paidFamilies.has(fid) && !paidStudents.has(sid)) familyIds.add(fid) }
  }
  return { familyIds, studentIds }
}

export type PartyState = "lead" | "customer"
export const familyState = (id: ID, sets: LeadSets): PartyState => (sets.familyIds.has(id) ? "lead" : "customer")
export const studentState = (id: ID, sets: LeadSets): PartyState => (sets.studentIds.has(id) ? "lead" : "customer")
