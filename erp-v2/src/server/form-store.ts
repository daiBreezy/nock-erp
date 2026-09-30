import { promises as fs } from "fs"
import path from "path"
import type { Brand, FormLang, FormOfferSlot, FormParentInput, FormPick, FormPrefill, FormSubjectOffer, FormSubmission, FormToken, FormType, ID, LeadSource } from "@/domain/types"
import { fmtDate } from "@/domain/dates"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import { recordInboundMessage } from "./line-store"

// File-based store for Test/Trial form tokens + submissions — same rationale as line-store.ts
// (a LIFF page runs server-side with no access to the browser's localStorage, and this data must
// be visible to staff across reloads/devices).

const DATA_DIR = path.join(process.cwd(), ".data")
const DATA_FILE = path.join(DATA_DIR, "forms.json")

interface Store {
  tokens: FormToken[]
  submissions: FormSubmission[]
}

let writeQueue: Promise<unknown> = Promise.resolve()

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw) as Store
    // defensively tolerate records from before offers/conversationId/grades existed, and drop any
    // submission saved under the old flat one-row-per-pick shape (no `picks`/`parents` array) rather
    // than crash on it — this file is local scratch data (gitignored), never a shared source of truth
    return {
      tokens: parsed.tokens.map((t) => ({ ...t, conversationId: t.conversationId ?? null, offers: t.offers ?? [], grades: t.grades ?? [] })),
      submissions: parsed.submissions.filter((s) => Array.isArray((s as FormSubmission).picks) && Array.isArray((s as FormSubmission).parents)).map((s) => ({ ...s, conversationId: s.conversationId ?? null })),
    }
  } catch {
    return { tokens: [], submissions: [] }
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8")
}

function mutate<T>(fn: (store: Store) => T): Promise<T> {
  const result = writeQueue.then(async () => {
    const store = await readStore()
    const value = fn(store)
    await writeStore(store)
    return value
  })
  writeQueue = result.catch(() => undefined)
  return result
}

const genToken = () => `tok_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
const genId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export async function createToken(input: {
  type: FormType; leadId: ID; branchId: ID; conversationId: ID | null; offers: FormSubjectOffer[]; grades: string[]
  branchName?: string; brand?: Brand; lang?: FormLang; prefill?: FormPrefill
}): Promise<FormToken> {
  return mutate((store) => {
    const now = new Date()
    const token: FormToken = {
      token: genToken(), type: input.type, leadId: input.leadId, branchId: input.branchId,
      conversationId: input.conversationId, offers: input.offers, grades: input.grades,
      branchName: input.branchName, brand: input.brand, lang: input.lang, prefill: input.prefill,
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString(), used: false,
    }
    store.tokens.push(token)
    return token
  })
}

export type TokenCheck = { ok: true; token: FormToken } | { ok: false; error: string }

export async function checkToken(token: string): Promise<TokenCheck> {
  const store = await readStore()
  const t = store.tokens.find((x) => x.token === token)
  if (!t) return { ok: false, error: "ลิงก์นี้ไม่ถูกต้อง" }
  if (t.used) return { ok: false, error: "ลิงก์นี้ถูกใช้ไปแล้ว" }
  if (new Date(t.expiresAt) < new Date()) return { ok: false, error: "ลิงก์หมดอายุแล้ว — ติดต่อขอลิงก์ใหม่" }
  return { ok: true, token: t }
}

export async function submitForm(input: {
  token: string
  lineUserId: string
  parents: FormParentInput[]
  familyAddress?: string
  familyPostcode?: string
  familyProvince?: string
  familyLocation?: { lat: number; lng: number }
  familyAddressNote?: string
  acquisitions?: LeadSource[]
  taxInfo?: { customerName: string; taxId: string; address: string }
  students: {
    name: string; nickname?: string; grade: string; birthDate?: string; school?: string; note?: string
    picks: { chosenSubject: string; chosenSlotId: string }[]
  }[]
}): Promise<{ ok: true; submissions: FormSubmission[] } | { ok: false; error: string }> {
  const check = await checkToken(input.token)
  if (!check.ok) return check
  if (!input.parents.length) return { ok: false, error: "ใส่ข้อมูลผู้ปกครองอย่างน้อย 1 คน" }
  if (!input.students.length) return { ok: false, error: "เพิ่มนักเรียนอย่างน้อย 1 คน" }
  // never trust a client-supplied slot payload — look up each offered slot server-side, per student
  const resolvedStudents: { name: string; nickname?: string; grade: string; birthDate?: string; school?: string; note?: string; picks: FormPick[] }[] = []
  for (const student of input.students) {
    if (!student.picks.length) return { ok: false, error: `เลือกวิชา/เวลาให้ ${student.name || "นักเรียน"} อย่างน้อย 1 วิชา` }
    const picks: FormPick[] = []
    for (const pick of student.picks) {
      const offer = check.token.offers.find((o) => o.subject === pick.chosenSubject)
      const slot = offer?.slots.find((s) => s.id === pick.chosenSlotId)
      if (!slot) return { ok: false, error: "ช่วงเวลานี้ไม่ได้อยู่ในตัวเลือกที่เสนอ" }
      picks.push({ chosenSubject: pick.chosenSubject, chosenSlot: slot })
    }
    resolvedStudents.push({ ...student, picks })
  }

  const groupId = genId("grp")
  const submissions = await mutate((store) => {
    const t = store.tokens.find((x) => x.token === input.token)!
    t.used = true
    return resolvedStudents.map((student, i) => {
      const submission: FormSubmission = {
        id: genId("frm"), token: input.token, type: t.type, groupId, primaryLeadId: t.leadId, leadId: i === 0 ? t.leadId : null, branchId: t.branchId, conversationId: t.conversationId,
        lineUserId: input.lineUserId, parents: input.parents, familyAddress: input.familyAddress, familyPostcode: input.familyPostcode,
        familyProvince: input.familyProvince, familyLocation: input.familyLocation, familyAddressNote: input.familyAddressNote, acquisitions: input.acquisitions, taxInfo: input.taxInfo,
        studentName: student.name, studentNickname: student.nickname, studentGrade: student.grade, studentBirthDate: student.birthDate, studentSchool: student.school, studentNote: student.note,
        picks: student.picks,
        status: "pending", submittedAt: new Date().toISOString(),
      }
      store.submissions.push(submission)
      return submission
    })
  })

  // surface each child inline in Inbox as its own rich chat bubble
  for (const sub of submissions) {
    const subjects = sub.picks.map((p) => `${p.chosenSubject} — ${fmtDate(p.chosenSlot.date, { weekday: true })} ${p.chosenSlot.start} น.`).join(", ")
    await recordInboundMessage(input.lineUserId, null, `ส่งแบบฟอร์ม${FORM_TYPE_LABEL[sub.type]} สำหรับ ${sub.studentName}: ${subjects}`, {
      kind: "form_submission",
      meta: { formKind: "form_submission", submissionId: sub.id, type: sub.type },
    })
  }

  return { ok: true, submissions }
}

export async function getAll(): Promise<Store> {
  return readStore()
}

export async function reviewSubmission(id: ID, status: "approved" | "rejected", created?: { sessionId?: ID; studentId?: ID }): Promise<void> {
  await mutate((store) => {
    const sub = store.submissions.find((s) => s.id === id)
    if (sub) {
      sub.status = status
      sub.reviewedAt = new Date().toISOString()
      if (created?.sessionId) sub.createdSessionId = created.sessionId
      if (created?.studentId) sub.createdStudentId = created.studentId
    }
  })
}

/** Admin correction — free to pick any subject/slot for one of this child's picks, not constrained to
 *  the token's original offers. `pickIndex` selects which of the child's subject picks to replace. */
export async function editSubmissionSlot(id: ID, pickIndex: number, subject: string, slot: FormOfferSlot): Promise<{ ok: true } | { ok: false; error: string }> {
  return mutate((store) => {
    const sub = store.submissions.find((s) => s.id === id)
    if (!sub) return { ok: false as const, error: "ไม่พบฟอร์มนี้" }
    if (!sub.picks[pickIndex]) return { ok: false as const, error: "ไม่พบวิชานี้ในฟอร์ม" }
    sub.picks[pickIndex] = { chosenSubject: subject, chosenSlot: slot }
    return { ok: true as const }
  })
}
