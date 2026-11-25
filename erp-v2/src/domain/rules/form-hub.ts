import type { Family, ID, Invoice, Student } from "../types"

/**
 * owner 2026-11-25: a form is not a page of its own — it belongs to the panel. Opening a family (or a lead) the admin sees,
 * per form: what we ALREADY have (the parent won't retype it), what is MISSING (what the parent must fill), and what comes BACK
 * (which record the answers write to). Pure rules so every panel shows the same thing. First form: Enroll + Invoice.
 */

export interface FormField {
  key: string
  label: string
  /** child fields name the child so "ชื่อ" of two kids don't look alike */
  childId?: ID
  have: boolean
  /** shown when `have` — what the system already knows */
  value?: string
}

/** one thing that flows back into the ERP when the parent submits and the admin approves */
export interface FormReturn { label: string; to: string }

export interface EnrollReadiness {
  known: FormField[]
  missing: FormField[]
  returns: FormReturn[]
}

const filled = (v?: string | null) => !!v && v.trim().length > 0

export function enrollFormReadiness(family: Pick<Family, "parents"> & Partial<Pick<Family, "address" | "location" | "pdpa" | "taxInfo" | "sources" | "sourceLabels">>, kids: Pick<Student, "id" | "nickname" | "name" | "grade" | "school" | "birthDate" | "targetSchools" | "busLeg">[]): EnrollReadiness {
  const main = family.parents.find((p) => p.primary) ?? family.parents[0]
  const f: FormField[] = [
    { key: "parent", label: "ผู้ปกครองหลัก (ชื่อ · เบอร์)", have: !!main && filled(main.name) && filled(main.phone), value: main ? [main.name, main.phone].filter(Boolean).join(" · ") : undefined },
    { key: "address", label: "ที่อยู่ครอบครัว", have: filled(family.address), value: family.address },
    { key: "location", label: "หมุดบ้าน (สำหรับรถรับส่ง)", have: !!family.location },
    { key: "source", label: "รู้จักเราจากไหน", have: !!(family.sources?.length || family.sourceLabels?.length), value: family.sourceLabels?.join(", ") },
    { key: "pdpa", label: "PDPA (ถ่ายรูปเด็ก)", have: !!family.pdpa },
    { key: "tax", label: "ข้อมูลใบกำกับภาษี", have: !!family.taxInfo && filled(family.taxInfo.taxId) },
  ]
  for (const k of kids) {
    const who = k.nickname || k.name
    f.push(
      { key: `name-${k.id}`, label: `${who} · ชื่อ-นามสกุล`, childId: k.id, have: filled(k.name), value: k.name },
      { key: `grade-${k.id}`, label: `${who} · ชั้น`, childId: k.id, have: filled(k.grade), value: k.grade },
      { key: `school-${k.id}`, label: `${who} · โรงเรียน`, childId: k.id, have: filled(k.school), value: k.school },
      { key: `birth-${k.id}`, label: `${who} · วันเกิด`, childId: k.id, have: !!k.birthDate, value: k.birthDate },
      { key: `target-${k.id}`, label: `${who} · โรงเรียนเป้าหมาย`, childId: k.id, have: !!k.targetSchools?.length, value: k.targetSchools?.map((t) => t.school).join(", ") },
    )
  }
  return {
    known: f.filter((x) => x.have),
    missing: f.filter((x) => !x.have),
    returns: [
      { label: "ข้อมูลผู้ปกครอง · ที่อยู่ · หมุดบ้าน · ใบกำกับภาษี · PDPA", to: "ครอบครัว" },
      { label: "ข้อมูลนักเรียน · โรงเรียน · โรงเรียนเป้าหมาย · รถรับส่ง", to: "นักเรียน" },
      { label: "สลิปโอนเงิน (หลายใบได้ แต่ละใบมี Ref ID)", to: "ใบแจ้งหนี้ → Billing รอยืนยันยอด" },
    ],
  }
}

/** an invoice (or a whole family set) that can travel with the enroll form */
export interface EnrollInvoiceChoice {
  key: string
  kind: "single" | "set"
  invoiceIds: ID[]
  /** numbers in the set's order, for the label */
  numbers: string[]
  studentIds: ID[]
  newestAt: string
}

/**
 * Only invoices the admin has ISSUED (Official Run no.) and that are still owed can be sent — same gate as sending an invoice.
 * Invoices that share a `bundleId` are ONE choice (the family set, one total); the rest are single choices.
 */
export function enrollInvoiceChoices(invoices: Pick<Invoice, "id" | "number" | "status" | "studentId" | "bundleId" | "createdAt">[], studentIds: Set<ID>): EnrollInvoiceChoice[] {
  const open = invoices.filter((i) => studentIds.has(i.studentId) && i.number && i.status !== "paid" && i.status !== "void")
  const sets = new Map<ID, typeof open>()
  const out: EnrollInvoiceChoice[] = []
  for (const i of open) {
    if (!i.bundleId) { out.push({ key: i.id, kind: "single", invoiceIds: [i.id], numbers: [i.number!], studentIds: [i.studentId], newestAt: i.createdAt }); continue }
    sets.set(i.bundleId, [...(sets.get(i.bundleId) ?? []), i])
  }
  for (const [bundleId, xs] of sets) {
    out.push({ key: bundleId, kind: xs.length > 1 ? "set" : "single", invoiceIds: xs.map((x) => x.id), numbers: xs.map((x) => x.number!), studentIds: xs.map((x) => x.studentId), newestAt: xs.map((x) => x.createdAt).sort().at(-1)! })
  }
  return out.sort((a, b) => b.newestAt.localeCompare(a.newestAt))
}

/** the slips a parent attached to one set/invoice: every slip needs its own Ref ID, and together they must equal what is owed */
export interface PaySlip { ref: string; amount: number; image: string }

export function slipsCheck(slips: PaySlip[], owed: number): { ok: boolean; error?: string; sum: number } {
  const sum = slips.reduce((a, s) => a + s.amount, 0)
  if (slips.some((s) => !s.ref.trim())) return { ok: false, error: "ทุกสลิปต้องมี Ref ID", sum }
  const refs = slips.map((s) => s.ref.trim().toLowerCase())
  if (new Set(refs).size !== refs.length) return { ok: false, error: "Ref ID ซ้ำกัน", sum }
  if (slips.some((s) => !(s.amount > 0))) return { ok: false, error: "ยอดของแต่ละสลิปต้องมากกว่า 0", sum }
  if (Math.round(sum * 100) !== Math.round(owed * 100)) return { ok: false, error: "ยอดสลิปรวมต้องเท่ากับยอดใบแจ้งหนี้", sum }
  return { ok: true, sum }
}
