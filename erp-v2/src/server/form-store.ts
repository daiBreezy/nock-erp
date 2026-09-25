import { promises as fs } from "fs"
import path from "path"
import type { FormOfferSlot, FormSubjectOffer, FormSubmission, FormToken, FormType, ID } from "@/domain/types"
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
    // defensively tolerate records from before offers/conversationId/grades existed
    return {
      tokens: parsed.tokens.map((t) => ({ ...t, conversationId: t.conversationId ?? null, offers: t.offers ?? [], grades: t.grades ?? [] })),
      submissions: parsed.submissions.map((s) => ({ ...s, conversationId: s.conversationId ?? null })),
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
}): Promise<FormToken> {
  return mutate((store) => {
    const now = new Date()
    const token: FormToken = {
      token: genToken(), type: input.type, leadId: input.leadId, branchId: input.branchId,
      conversationId: input.conversationId, offers: input.offers, grades: input.grades,
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
  token: string; lineUserId: string; parentName: string; parentPhone: string
  studentName: string; studentGrade: string; chosenSubject: string; chosenSlotId: string
}): Promise<{ ok: true; submission: FormSubmission } | { ok: false; error: string }> {
  const check = await checkToken(input.token)
  if (!check.ok) return check
  // never trust a client-supplied slot payload — look up the actual offered slot server-side
  const offer = check.token.offers.find((o) => o.subject === input.chosenSubject)
  const slot = offer?.slots.find((s) => s.id === input.chosenSlotId)
  if (!slot) return { ok: false, error: "ช่วงเวลานี้ไม่ได้อยู่ในตัวเลือกที่เสนอ" }

  const result = await mutate((store) => {
    const t = store.tokens.find((x) => x.token === input.token)!
    t.used = true
    const submission: FormSubmission = {
      id: genId("frm"), token: input.token, type: t.type, leadId: t.leadId, conversationId: t.conversationId,
      lineUserId: input.lineUserId, parentName: input.parentName, parentPhone: input.parentPhone,
      studentName: input.studentName, studentGrade: input.studentGrade,
      chosenSubject: input.chosenSubject, chosenSlot: slot,
      status: "pending", submittedAt: new Date().toISOString(),
    }
    store.submissions.push(submission)
    return submission
  })

  // surface the submission inline in Inbox as a rich chat bubble
  await recordInboundMessage(input.lineUserId, null, `ส่งแบบฟอร์ม${input.chosenSubject} — ${slot.date} ${slot.start} น.`, {
    kind: "form_submission",
    meta: { formKind: "form_submission", submissionId: result.id, type: result.type },
  })

  return { ok: true, submission: result }
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

/** Admin correction — free to pick any subject/slot, not constrained to the token's original offers. */
export async function editSubmissionSlot(id: ID, subject: string, slot: FormOfferSlot): Promise<{ ok: true } | { ok: false; error: string }> {
  return mutate((store) => {
    const sub = store.submissions.find((s) => s.id === id)
    if (!sub) return { ok: false as const, error: "ไม่พบฟอร์มนี้" }
    sub.chosenSubject = subject
    sub.chosenSlot = slot
    return { ok: true as const }
  })
}
