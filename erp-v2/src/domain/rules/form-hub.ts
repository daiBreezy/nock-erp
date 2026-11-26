import type { Family, FormSend, ID, Invoice, Student, StudentExit } from "../types"

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

/**
 * owner 2026-11-26 — the Enroll Form is for a NEWCOMER only: a child with no paid invoice yet (a Lead, or a new child of an existing
 * family). A child who already paid before is an existing customer → invoice only, never an Enroll Form.
 */
export const isNewcomer = (studentId: ID, invoices: Pick<Invoice, "studentId" | "status">[]) => !invoices.some((i) => i.studentId === studentId && i.status === "paid")

/** an invoice (or a family set) the Enroll Form can be bound to — even before it is approved/numbered (then `ready` is false and nothing can be sent yet) */
export interface EnrollBindChoice extends EnrollInvoiceChoice { ready: boolean; bound: boolean; stage: "draft" | "pending_approval" | "approved_no_number" | "ready" }

export function enrollBindChoices(invoices: Pick<Invoice, "id" | "number" | "status" | "studentId" | "bundleId" | "createdAt" | "withEnroll">[], studentIds: Set<ID>): EnrollBindChoice[] {
  const open = invoices.filter((i) => studentIds.has(i.studentId) && i.status !== "paid" && i.status !== "void")
  const groups = new Map<string, typeof open>()
  for (const i of open) groups.set(i.bundleId ?? i.id, [...(groups.get(i.bundleId ?? i.id) ?? []), i])
  const out: EnrollBindChoice[] = []
  for (const [key, xs] of groups) {
    const allReady = xs.every((x) => !!x.number && (x.status === "approved" || x.status === "sent"))
    const worst = xs.some((x) => x.status === "draft") ? "draft" : xs.some((x) => x.status === "pending_approval") ? "pending_approval" : xs.some((x) => !x.number) ? "approved_no_number" : "ready"
    out.push({ key, kind: xs.length > 1 ? "set" : "single", invoiceIds: xs.map((x) => x.id), numbers: xs.map((x) => x.number ?? ""), studentIds: xs.map((x) => x.studentId), newestAt: xs.map((x) => x.createdAt).sort().at(-1)!, ready: allReady, bound: xs.some((x) => x.withEnroll), stage: worst })
  }
  return out.sort((a, b) => b.newestAt.localeCompare(a.newestAt))
}

export const ENROLL_STAGE_LABEL: Record<EnrollBindChoice["stage"], string> = {
  draft: "ร่าง — ยังไม่ได้สร้าง",
  pending_approval: "รออนุมัติ",
  approved_no_number: "อนุมัติแล้ว — รอออกเลข Official",
  ready: "พร้อมส่ง",
}

// ---------------- "ฟอร์มทั้งหมด" + the overview snapshot (owner 2026-11-26) ----------------

export type FormKind = "enroll" | "custom" | "exit" | "survey"
/**
 * Where a form stands. A form stays on the OVERVIEW until it is done:
 *  money matters (enroll + invoice, exit) → the admin closes them by hand · NPS / survey / custom form → done the moment the parent submits.
 */
export type FormStage = "waiting_invoice" | "ready_to_send" | "waiting_parent" | "needs_review" | "needs_close" | "done"

export const FORM_STAGE_LABEL: Record<FormStage, string> = {
  waiting_invoice: "รอใบแจ้งหนี้",
  ready_to_send: "พร้อมส่ง",
  waiting_parent: "รอผู้ปกครองตอบ",
  needs_review: "รอตรวจคำตอบ",
  needs_close: "รอจบงาน",
  done: "จบงานแล้ว",
}
export const FORM_STAGE_TONE: Record<FormStage, "amber" | "blue" | "green" | "gray"> = {
  waiting_invoice: "amber", ready_to_send: "blue", waiting_parent: "gray", needs_review: "amber", needs_close: "blue", done: "green",
}

export interface FormItem {
  key: string
  kind: FormKind
  title: string
  stage: FormStage
  /** a money matter — only the admin can close it */
  money: boolean
  /** children it is about — empty = the whole family */
  studentIds: ID[]
  sentAt?: string
  doneAt?: string
  sendId?: ID
  subId?: ID
  responseId?: ID
  invoiceIds?: ID[]
  /** survey only: the year (Gregorian) for the title */
  year?: number
  /** one short line for the card's body */
  summary: string
  /** still on the overview (not done) */
  open: boolean
}

export interface FormItemsInput {
  family: Pick<Family, "id" | "enrollWaiting">
  kids: Pick<Student, "id" | "nickname" | "exit">[]
  sends: FormSend[]
  enrollSubs: { id: ID; token: string; status: "pending" | "approved" | "rejected"; submittedAt: string }[]
  responses: { id: ID; formId: ID; token: string; submittedAt: string }[]
  formNames: Record<ID, string>
  invoices: Pick<Invoice, "id" | "number" | "status" | "studentId" | "bundleId" | "withEnroll" | "createdAt">[]
  surveys: { key: string; year: number; sentAt: string; answeredAt?: string }[]
}

export function buildFormItems(i: FormItemsInput): FormItem[] {
  const out: FormItem[] = []
  const kidIds = new Set(i.kids.map((k) => k.id))
  const nick = (id: ID) => i.kids.find((k) => k.id === id)?.nickname ?? ""
  const push = (x: Omit<FormItem, "open">) => out.push({ ...x, open: x.stage !== "done" })

  // 1) an Enroll Form waiting for its invoice (made from the Enroll card or "ออกใบแจ้งหนี้ + ใบสมัครเรียน") — nothing is sent yet
  const bound = enrollBindChoices(i.invoices, kidIds).filter((c) => c.bound)
  if (i.family.enrollWaiting || bound.length) {
    const b = bound[0]
    const ready = !!b?.ready
    push({
      key: "enroll-wait", kind: "enroll", title: "ใบสมัครเรียน + ใบแจ้งหนี้", money: true, stage: ready ? "ready_to_send" : "waiting_invoice",
      studentIds: b?.studentIds ?? [], invoiceIds: b?.invoiceIds,
      summary: b ? `${b.kind === "set" ? `ชุดครอบครัว · ${b.studentIds.map(nick).join(" + ")}` : `${b.numbers[0] || "ใบร่าง"} · ${nick(b.studentIds[0])}`} — ${ENROLL_STAGE_LABEL[b.stage]}` : "ยังไม่ได้เลือก / สร้างใบแจ้งหนี้",
    })
  }
  // 2) what was actually sent
  for (const send of i.sends.filter((x) => x.familyId === i.family.id)) {
    if (send.kind === "enroll") {
      const sub = i.enrollSubs.find((x) => x.token === send.token)
      const money = !!send.invoiceIds?.length
      let stage: FormStage
      if (send.closedAt) stage = "done"
      else if (!sub) stage = "waiting_parent"
      else if (sub.status === "pending") stage = "needs_review"
      else stage = money && sub.status === "approved" ? "needs_close" : "done"
      push({ key: send.id, kind: "enroll", title: send.title, money, stage, studentIds: send.studentIds, sentAt: send.sentAt, doneAt: send.closedAt, sendId: send.id, subId: sub?.id, invoiceIds: send.invoiceIds,
        summary: stage === "waiting_parent" ? "ส่งแล้ว — ผู้ปกครองยังไม่ได้กรอก" : stage === "needs_review" ? "ผู้ปกครองกรอกแล้ว — รอแอดมินตรวจ" : stage === "needs_close" ? "อนุมัติแล้ว — ตรวจยอดชำระแล้วกดจบงาน" : sub?.status === "rejected" ? "ปิดแล้ว (ไม่อนุมัติ)" : "จบงานแล้ว" })
    } else {
      const r = i.responses.find((x) => x.token === send.token)
      push({ key: send.id, kind: "custom", title: send.title, money: false, stage: r ? "done" : "waiting_parent", studentIds: [], sentAt: send.sentAt, doneAt: r?.submittedAt, sendId: send.id, responseId: r?.id,
        summary: r ? "ผู้ปกครองตอบแล้ว" : "ส่งแล้ว — ผู้ปกครองยังไม่ได้ตอบ" })
    }
  }
  // 3) answers that came in without a log (older data) — only in "ฟอร์มทั้งหมด", never on the overview
  const logged = new Set(i.sends.map((x) => x.token))
  for (const r of i.responses.filter((x) => !logged.has(x.token))) {
    push({ key: `resp-${r.id}`, kind: "custom", title: i.formNames[r.formId] ?? "ฟอร์มที่ถูกลบแล้ว", money: false, stage: "done", studentIds: [], doneAt: r.submittedAt, responseId: r.id, summary: "ผู้ปกครองตอบแล้ว" })
  }
  // 4) exit notices — money (refund / credit) → the admin closes them
  for (const k of i.kids) {
    const e: StudentExit | undefined = k.exit
    if (!e) continue
    const stage: FormStage = e.status === "sent" ? "waiting_parent" : e.status === "answered" ? "needs_close" : "done"
    push({ key: `exit-${k.id}`, kind: "exit", title: "แจ้งหยุดเรียน", money: true, stage, studentIds: [k.id], sentAt: e.sentAt,
      summary: `${k.nickname} · ${e.status === "sent" ? "ส่งแล้ว — ผู้ปกครองยังไม่ได้ตอบ" : e.status === "answered" ? "ผู้ปกครองตอบแล้ว — เลือกคืนเงิน / เครดิต แล้วปิดการออก" : "ปิดการออกแล้ว"}` })
  }
  // 5) the yearly survey (NPS) — done when the parent submits
  for (const sv of i.surveys) {
    push({ key: `survey-${sv.key}`, kind: "survey", title: `แบบสอบถามประจำปี ${sv.year + 543}`, year: sv.year, money: false, stage: sv.answeredAt ? "done" : "waiting_parent", studentIds: [], sentAt: sv.sentAt, doneAt: sv.answeredAt,
      summary: sv.answeredAt ? "ผู้ปกครองตอบแล้ว" : "ส่งแล้ว — ผู้ปกครองยังไม่ได้ตอบ" })
  }
  // open ones first (newest send first), then the finished ones
  return out.sort((a, b) => Number(b.open) - Number(a.open) || (b.sentAt ?? b.doneAt ?? "").localeCompare(a.sentAt ?? a.doneAt ?? ""))
}

/** owner 2026-11-26: why a form link is cancelled — chips (pick one) + an optional Remark; "other" asks for the Remark */
export const CANCEL_REASONS: { id: string; label: string }[] = [
  { id: "parent_cancel", label: "ลูกค้าแจ้งยกเลิก" },
  { id: "wrong_send", label: "ส่งผิดคน / ผิดฟอร์ม" },
  { id: "wrong_data", label: "ข้อมูลผิด ต้องส่งใหม่" },
  { id: "invoice_changed", label: "ใบแจ้งหนี้เปลี่ยน / ถูกยกเลิก" },
  { id: "other", label: "อื่นๆ" },
]
