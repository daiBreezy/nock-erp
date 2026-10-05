import { promises as fs } from "fs"
import path from "path"
import type { EnrollSubmission, EnrollToken, ExitAnswers, ExitResponse, ExitToken } from "@/domain/types"

// File-based store for parent forms that are not Test/Trial (owner 2026-10-05: exit form; the yearly survey next) —
// same reason as form-store.ts: the parent's page runs outside the ERP's localStorage, staff must see the answers.

const DATA_DIR = path.join(process.cwd(), ".data")
const DATA_FILE = path.join(DATA_DIR, "parent-forms.json")

interface Store { tokens: ExitToken[]; responses: ExitResponse[] }

let queue: Promise<unknown> = Promise.resolve()

async function read(): Promise<Store> {
  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Store
    return { tokens: parsed.tokens ?? [], responses: parsed.responses ?? [] }
  } catch {
    return { tokens: [], responses: [] }
  }
}

function mutate<T>(fn: (s: Store) => T): Promise<T> {
  const result = queue.then(async () => {
    const s = await read()
    const v = fn(s)
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(s, null, 2), "utf8")
    return v
  })
  queue = result.catch(() => undefined)
  return result
}

/** "pf_" marks a parent-form token — the shared LIFF entry page sends these to /liff/exit */
const genToken = () => `pf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export function createExitToken(input: Omit<ExitToken, "token" | "kind" | "createdAt" | "expiresAt" | "used">): Promise<ExitToken> {
  return mutate((s) => {
    const now = new Date()
    const t: ExitToken = { ...input, token: genToken(), kind: "exit", createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 14 * 86_400_000).toISOString(), used: false }
    s.tokens.push(t)
    return t
  })
}

export async function checkExitToken(token: string): Promise<{ ok: true; token: ExitToken } | { ok: false; error: string }> {
  const s = await read()
  const t = s.tokens.find((x) => x.token === token)
  if (!t) return { ok: false, error: "invalid" }
  if (t.used) return { ok: false, error: "used" }
  if (new Date(t.expiresAt) < new Date()) return { ok: false, error: "expired" }
  return { ok: true, token: t }
}

export function submitExit(token: string, answers: ExitAnswers): Promise<{ ok: true; response: ExitResponse; token: ExitToken } | { ok: false; error: string }> {
  return mutate((s) => {
    const t = s.tokens.find((x) => x.token === token)
    if (!t) return { ok: false as const, error: "invalid" }
    if (t.used) return { ok: false as const, error: "used" }
    t.used = true
    const response: ExitResponse = { id: `ex_${Date.now().toString(36)}`, token, branchId: t.branchId, studentIds: t.students.map((x) => x.id), answers, submittedAt: new Date().toISOString() }
    s.responses.push(response)
    return { ok: true as const, response, token: t }
  })
}

export async function listExitResponses(token?: string) {
  const s = await read()
  return token ? s.responses.filter((r) => r.token === token) : s.responses
}

// ---------- enroll-now (owner 2026-10-05) ----------

interface EnrollStore { tokens: EnrollToken[]; submissions: EnrollSubmission[] }
const ENROLL_FILE = path.join(DATA_DIR, "enroll-forms.json")
let enrollQueue: Promise<unknown> = Promise.resolve()

async function readEnroll(): Promise<EnrollStore> {
  try {
    const parsed = JSON.parse(await fs.readFile(ENROLL_FILE, "utf8")) as EnrollStore
    return { tokens: parsed.tokens ?? [], submissions: parsed.submissions ?? [] }
  } catch {
    return { tokens: [], submissions: [] }
  }
}

function mutateEnroll<T>(fn: (s: EnrollStore) => T): Promise<T> {
  const result = enrollQueue.then(async () => {
    const s = await readEnroll()
    const v = fn(s)
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(ENROLL_FILE, JSON.stringify(s, null, 2), "utf8")
    return v
  })
  enrollQueue = result.catch(() => undefined)
  return result
}

/** "pe_" = enroll-now link. Reusable (Rich Menu) links keep their token when refreshed so the menu never breaks. */
export function upsertEnrollToken(input: Omit<EnrollToken, "token" | "kind" | "createdAt" | "used"> & { token?: string }): Promise<EnrollToken> {
  return mutateEnroll((s) => {
    const now = new Date()
    const existing = input.token ? s.tokens.find((t) => t.token === input.token) : undefined
    if (existing) { Object.assign(existing, input, { kind: "enroll" as const }); return existing }
    const t: EnrollToken = { ...input, token: `pe_${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 8)}`, kind: "enroll", createdAt: now.toISOString(), used: false,
      expiresAt: input.reusable ? undefined : new Date(now.getTime() + 14 * 86_400_000).toISOString() }
    s.tokens.push(t)
    return t
  })
}

export async function checkEnrollToken(token: string): Promise<{ ok: true; token: EnrollToken } | { ok: false; error: string }> {
  const s = await readEnroll()
  const t = s.tokens.find((x) => x.token === token)
  if (!t) return { ok: false, error: "ลิงก์นี้ไม่ถูกต้อง" }
  if (!t.reusable && t.used) return { ok: false, error: "ส่งใบสมัครนี้ไปแล้ว ขอบคุณค่ะ" }
  if (t.expiresAt && new Date(t.expiresAt) < new Date()) return { ok: false, error: "ลิงก์หมดอายุแล้ว — ติดต่อสถาบันเพื่อขอลิงก์ใหม่" }
  return { ok: true, token: t }
}

export function submitEnroll(token: string, input: Omit<EnrollSubmission, "id" | "token" | "branchId" | "leadId" | "conversationId" | "status" | "submittedAt">): Promise<{ ok: true; submission: EnrollSubmission } | { ok: false; error: string }> {
  return mutateEnroll((s) => {
    const t = s.tokens.find((x) => x.token === token)
    if (!t) return { ok: false as const, error: "ลิงก์นี้ไม่ถูกต้อง" }
    if (!t.reusable && t.used) return { ok: false as const, error: "ส่งใบสมัครนี้ไปแล้ว" }
    if (!t.reusable) t.used = true
    const submission: EnrollSubmission = {
      ...input, id: `en_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, token, branchId: t.branchId, leadId: t.leadId,
      conversationId: t.conversationId ?? (input.lineUserId ? `line_${input.lineUserId}` : null), status: "pending", submittedAt: new Date().toISOString(),
    }
    s.submissions.push(submission)
    return { ok: true as const, submission }
  })
}

export async function listEnrollSubmissions() {
  return (await readEnroll()).submissions
}

export function reviewEnroll(id: string, status: "approved" | "rejected", createdStudentIds?: string[]) {
  return mutateEnroll((s) => {
    const sub = s.submissions.find((x) => x.id === id)
    if (!sub) return false
    Object.assign(sub, { status, reviewedAt: new Date().toISOString(), createdStudentIds })
    return true
  })
}
