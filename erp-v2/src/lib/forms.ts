"use client"

// Shared orchestration for the Test/Trial form flow — the only place that calls the forms/LINE
// API routes, so LeadSheet and Inbox never duplicate this logic (CLAUDE.md rule #1: business
// logic lives in one place, not copy-pasted across components).

import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import { addDays } from "@/domain/dates"
import { notAnswered, surveyRecipients } from "@/domain/rules/survey"
import type { Brand, EnrollSubmission, EnrollToken, ExitResponse, ExitToken, SurveyCampaign, SurveyToken, FormLang, FormOfferSlot, FormPrefill, FormSubjectOffer, FormSubmission, FormToken, FormType, ID, Result } from "@/domain/types"
import { useStore } from "@/store/store"

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  return res.json() as Promise<T>
}

export async function sendTestTrialForm(input: {
  leadId: ID; branchId: ID; conversationId: ID; lineUserId: string; type: FormType; offers: FormSubjectOffer[]; grades: string[]
  branchName?: string; brand?: Brand; lang?: FormLang; prefill?: FormPrefill; subjectNames?: FormToken["subjectNames"]
}): Promise<Result> {
  const tokenRes = await postJson<{ ok: boolean; token?: FormToken; error?: string }>("/api/forms/token", {
    type: input.type, leadId: input.leadId, branchId: input.branchId,
    conversationId: input.conversationId, offers: input.offers, grades: input.grades,
    branchName: input.branchName, brand: input.brand, lang: input.lang, prefill: input.prefill, subjectNames: input.subjectNames,
  })
  if (!tokenRes.ok || !tokenRes.token) return { ok: false, error: tokenRes.error ?? "สร้างลิงก์ไม่สำเร็จ" }

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) return { ok: false, error: "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID ใน .env.local" }

  const url = `https://liff.line.me/${liffId}?token=${tokenRes.token.token}`
  const subjects = input.offers.map((o) => o.subject).join(", ")
  const text = `กรุณากรอกแบบฟอร์ม${FORM_TYPE_LABEL[input.type]}ที่ลิงก์นี้ค่ะ 🙏 (${subjects})\n${url}`

  const sendRes = await postJson<{ ok: boolean; error?: string }>("/api/line/send", {
    conversationId: input.conversationId, text,
    kind: "form_request",
    meta: { formKind: "form_request", token: tokenRes.token.token, type: input.type, subjects: input.offers.map((o) => o.subject) },
  })
  if (!sendRes.ok) return { ok: false, error: sendRes.error ?? "ส่งลิงก์ไม่สำเร็จ" }
  return { ok: true, value: undefined }
}

/** Books this one child's chosen slot(s) as a real Session (or joins an existing class) first — only
 *  marks the submission "approved" server-side if that actually succeeds, so a failed booking never
 *  shows as a false "approved" status. A child's own multiple same-day/same-time subject picks were
 *  already merged into one shared 2-hour room block by `submitForm` — no cross-submission grouping is
 *  needed here since each `FormSubmission` row is already one whole child (see `groupId` for how staff
 *  can tell "these children arrived together" without approval being forced to happen together too). */
export async function approveSubmission(sub: FormSubmission, opts?: { applyChanges?: boolean }): Promise<Result<{ sessionId: ID; studentId: ID; leadId: ID }>> {
  const r = useStore.getState().approveTestTrialSubmission(sub, opts)
  if (!r.ok) return r
  await postJson("/api/forms/review", { id: sub.id, status: "approved", sessionId: r.value.sessionId, studentId: r.value.studentId })
  return r
}

export async function rejectSubmission(sub: FormSubmission): Promise<Result> {
  await postJson("/api/forms/review", { id: sub.id, status: "rejected" })
  return { ok: true, value: undefined }
}

/** Admin correction — free to pick any subject/slot for one of this child's picks, not constrained to
 *  the token's original offers. */
export async function editSubmissionSlot(sub: FormSubmission, pickIndex: number, subject: string, slot: FormOfferSlot): Promise<Result> {
  const r = await postJson<{ ok: boolean; error?: string }>("/api/forms/edit", { id: sub.id, pickIndex, subject, slot })
  if (!r.ok) return { ok: false, error: r.error ?? "แก้ไขไม่สำเร็จ" }
  return { ok: true, value: undefined }
}

/**
 * Exit form (owner 2026-10-05): mint the one-time link, then push it in the family's LINE chat when they have one.
 * Without LINE the admin copies the link (the page works in any browser — the token is all it needs).
 */
export async function sendExitForm(input: Omit<ExitToken, "token" | "kind" | "createdAt" | "expiresAt" | "used">): Promise<Result<{ token: string; url: string; sent: boolean }>> {
  const res = await postJson<{ ok: boolean; token?: ExitToken; error?: string }>("/api/parent-forms/token", input)
  if (!res.ok || !res.token) return { ok: false, error: res.error ?? "สร้างลิงก์ไม่สำเร็จ" }
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const isLine = !!input.conversationId?.startsWith("line_")
  const url = isLine && liffId ? `https://liff.line.me/${liffId}?token=${res.token.token}` : `${window.location.origin}/liff/exit?token=${res.token.token}`
  if (!isLine) return { ok: true, value: { token: res.token.token, url, sent: false } }
  const names = input.students.map((s) => s.nickname).join(", ")
  const sent = await postJson<{ ok: boolean; error?: string }>("/api/line/send", {
    conversationId: input.conversationId, text: `รบกวนผู้ปกครองช่วยตอบแบบฟอร์มสั้นๆ เรื่องการหยุดเรียนของ${names}ค่ะ 🙏 (ประมาณ 2 นาที)\n${url}`,
  })
  if (!sent.ok) return { ok: false, error: sent.error ?? "ส่งทาง LINE ไม่สำเร็จ — คัดลอกลิงก์ส่งเองได้" }
  return { ok: true, value: { token: res.token.token, url, sent: true } }
}

export async function fetchExitResponse(token: string): Promise<ExitResponse | null> {
  const r = await fetch(`/api/parent-forms/responses?token=${encodeURIComponent(token)}`).then((x) => x.json()).catch(() => null)
  return r?.responses?.[0] ?? null
}

/** What the enroll-now form shows for a branch: its grades, subjects and active courses with today's prices. */
export function enrollSnapshot(branchId: ID) {
  const s = useStore.getState()
  const branch = s.branches.find((b) => b.id === branchId)!
  const courses = s.courses.filter((c) => c.branchId === branchId && c.active && (!c.to || c.to >= new Date().toISOString().slice(0, 10)))
  return {
    branchId, branchName: branch.name, brand: branch.brand, lang: s.system.preferences.language, grades: branch.grades, subjects: branch.subjects, subjectNames: s.system.subjectNames,
    courses: courses.map((c) => ({ id: c.id, name: c.name, subjects: c.subjects, grades: c.grades, unit: c.unit, duration: c.duration, price: c.price + c.courseFee })),
  }
}

const enrollUrl = (token: string) => {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  return liffId ? `https://liff.line.me/${liffId}?token=${token}` : `${window.location.origin}/liff/form?token=${token}`
}

/** The branch's reusable link for the LINE Rich Menu — refreshing keeps the same token (the menu never breaks). */
export async function publishEnrollLink(branchId: ID, existingToken?: string): Promise<Result<{ token: string; url: string }>> {
  const res = await postJson<{ ok: boolean; token?: EnrollToken; error?: string }>("/api/parent-forms/enroll", { ...enrollSnapshot(branchId), reusable: true, token: existingToken, conversationId: null })
  if (!res.ok || !res.token) return { ok: false, error: res.error ?? "สร้างลิงก์ไม่สำเร็จ" }
  return { ok: true, value: { token: res.token.token, url: enrollUrl(res.token.token) } }
}

/** A one-time enroll link for one lead — pushed in their LINE chat when linked, else returned to copy. */
export async function sendEnrollForm(lead: { id: ID; branchId: ID; name: string; phone: string; childGrade: string; lineUserId?: string }): Promise<Result<{ url: string; sent: boolean }>> {
  const prefill: FormPrefill = { parents: lead.phone ? [{ name: lead.name, phone: lead.phone, primary: true }] : [], students: [{ name: "", grade: lead.childGrade }] }
  const conversationId = lead.lineUserId ? `line_${lead.lineUserId}` : null
  const res = await postJson<{ ok: boolean; token?: EnrollToken; error?: string }>("/api/parent-forms/enroll", { ...enrollSnapshot(lead.branchId), reusable: false, leadId: lead.id, conversationId, prefill })
  if (!res.ok || !res.token) return { ok: false, error: res.error ?? "สร้างลิงก์ไม่สำเร็จ" }
  const url = enrollUrl(res.token.token)
  if (!conversationId) return { ok: true, value: { url, sent: false } }
  const sent = await postJson<{ ok: boolean; error?: string }>("/api/line/send", { conversationId, text: `กรอกใบสมัครเรียนได้ที่ลิงก์นี้เลยค่ะ 🙏 แอดมินจะจัดคลาสและส่งใบแจ้งหนี้ให้ทันที\n${url}` })
  if (!sent.ok) return { ok: false, error: sent.error ?? "ส่งทาง LINE ไม่สำเร็จ" }
  return { ok: true, value: { url, sent: true } }
}

export async function fetchEnrollSubmissions(): Promise<EnrollSubmission[]> {
  const r = await fetch("/api/parent-forms/enroll-submissions").then((x) => x.json()).catch(() => null)
  return r?.submissions ?? []
}

export async function markEnrollReviewed(id: ID, status: "approved" | "rejected", createdStudentIds?: ID[]) {
  await postJson("/api/parent-forms/enroll-submissions", { id, status, createdStudentIds })
}

const surveyUrl = (token: string) => {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  return liffId ? `https://liff.line.me/${liffId}?token=${token}` : `${window.location.origin}/liff/survey?token=${token}`
}
const surveyText = (url: string) => `ขอเวลา 3 นาทีช่วยตอบแบบสอบถามความพึงพอใจประจำปีหน่อยนะคะ 🙏 ทุกความเห็นช่วยให้เราดูแลน้องๆ ได้ดีขึ้น\n${url}`

/**
 * Yearly parent survey (owner 2026-10-05): one link per family with a child studying today, pushed in LINE where the
 * family has a chat. Dev: run this automatically on the window's first day; the prototype sends it from Settings.
 */
export async function sendYearlySurvey(year: number, from: string, to: string): Promise<Result<{ campaignId: ID; sent: number; lineSent: number }>> {
  const s = useStore.getState()
  const today = new Date().toISOString().slice(0, 10)
  const recips = surveyRecipients(s.families, s.students, s.entitlements, today)
  if (!recips.length) return { ok: false, error: "ยังไม่มีครอบครัวที่มีลูกเรียนอยู่" }
  const campaignId = `sv_${year}`
  const expiresAt = new Date(`${addDays(to, 7)}T23:59:59`).toISOString()
  const inputs = recips.map(({ family, kids }) => {
    const branch = s.branches.find((b) => b.id === kids[0].branchId)!
    const conv = s.conversations.find((c) => c.familyId === family.id)
    return {
      campaignId, year, familyId: family.id, familyName: family.name, branchId: branch.id, branchName: branch.name, brand: branch.brand, lang: s.system.preferences.language,
      usesBus: kids.some((k) => k.usesBus), conversationId: conv?.id ?? null, expiresAt,
      children: kids.map((k) => { const ids = [...new Set(s.classes.filter((c) => c.studentIds.includes(k.id) && c.teacherId).map((c) => c.teacherId!))]; return { id: k.id, nickname: k.nickname, grade: k.grade, teacherIds: ids, teacherNames: ids.map((t) => s.staff.find((x) => x.id === t)?.nickname ?? "") } }),
      wantOptions: [...branch.subjects, "เสาร์เช้า", "เสาร์บ่าย", "อาทิตย์", "เย็นวันธรรมดา"],
    }
  })
  const res = await postJson<{ ok: boolean; tokens?: SurveyToken[]; error?: string }>("/api/parent-forms/survey", { tokens: inputs })
  if (!res.ok || !res.tokens) return { ok: false, error: res.error ?? "สร้างลิงก์ไม่สำเร็จ" }
  let lineSent = 0
  for (const t of res.tokens) {
    if (!t.conversationId?.startsWith("line_")) continue
    const r = await postJson<{ ok: boolean }>("/api/line/send", { conversationId: t.conversationId, text: surveyText(surveyUrl(t.token)) })
    if (r.ok) lineSent++
  }
  const rec = s.recordSurveySent({ id: campaignId, year, from, to, recipients: res.tokens.map((t) => ({ familyId: t.familyId, branchId: t.branchId, token: t.token, viaLine: !!t.conversationId?.startsWith("line_") })) })
  if (!rec.ok) return rec
  return { ok: true, value: { campaignId, sent: res.tokens.length, lineSent } }
}

/** One reminder, 7 days after sending, to families who haven't answered (same link). */
export async function remindSurvey(campaign: SurveyCampaign): Promise<Result<{ reminded: number }>> {
  const s = useStore.getState()
  const waiting = notAnswered(campaign, s.surveyResponses).filter((x) => x.viaLine)
  let n = 0
  for (const x of waiting) {
    const conv = s.conversations.find((c) => c.familyId === x.familyId && c.id.startsWith("line_"))
    if (!conv) continue
    const r = await postJson<{ ok: boolean }>("/api/line/send", { conversationId: conv.id, text: `แจ้งเตือนอีกครั้งค่ะ — ${surveyText(surveyUrl(x.token))}` })
    if (r.ok) n++
  }
  s.markSurveyReminded(campaign.id)
  return { ok: true, value: { reminded: n } }
}

/** Pull answers from the form server into the ERP (new ones only — unhappy families notify their managers). */
export async function pullSurveyResponses() {
  const r = await fetch("/api/parent-forms/survey-responses").then((x) => x.json()).catch(() => null)
  if (r?.responses) useStore.getState().syncSurveyResponses(r.responses)
}

export const surveyLink = (token: string) => (typeof window === "undefined" ? "" : `${window.location.origin}/liff/survey?token=${token}`)
