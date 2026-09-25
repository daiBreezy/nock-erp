"use client"

// Shared orchestration for the Test/Trial form flow — the only place that calls the forms/LINE
// API routes, so LeadSheet and Inbox never duplicate this logic (CLAUDE.md rule #1: business
// logic lives in one place, not copy-pasted across components).

import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormOfferSlot, FormSubjectOffer, FormSubmission, FormToken, FormType, ID, Result } from "@/domain/types"
import { useStore } from "@/store/store"

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  return res.json() as Promise<T>
}

export async function sendTestTrialForm(input: {
  leadId: ID; branchId: ID; conversationId: ID; lineUserId: string; type: FormType; offers: FormSubjectOffer[]; grades: string[]
}): Promise<Result> {
  const tokenRes = await postJson<{ ok: boolean; token?: FormToken; error?: string }>("/api/forms/token", {
    type: input.type, leadId: input.leadId, branchId: input.branchId,
    conversationId: input.conversationId, offers: input.offers, grades: input.grades,
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

/** Books the chosen slot(s) as a real Session (or joins an existing class) first — only marks
 *  submissions "approved" server-side if that actually succeeds, so a failed booking never shows
 *  as a false "approved" status. If another still-pending submission for the same lead picked a
 *  different subject at the exact same date+time (both admin-offered "generic" slots), they're
 *  approved together into one shared 2-hour room block — the parent only visits once. */
export async function approveSubmission(sub: FormSubmission): Promise<Result<{ sessionId: ID; studentId: ID }>> {
  const listRes = await fetch("/api/forms/submissions").then((r) => r.json()).catch(() => null) as { submissions?: FormSubmission[] } | null
  const all = listRes?.submissions ?? []
  const siblings = all.filter((s) =>
    s.id !== sub.id && s.status === "pending" && s.leadId === sub.leadId &&
    s.chosenSlot.source === "generic" && sub.chosenSlot.source === "generic" &&
    s.chosenSlot.date === sub.chosenSlot.date && s.chosenSlot.start === sub.chosenSlot.start,
  )
  const group = [sub, ...siblings]

  const r = useStore.getState().approveTestTrialSubmission(group)
  if (!r.ok) return r
  await Promise.all(group.map((s) => postJson("/api/forms/review", { id: s.id, status: "approved", sessionId: r.value.sessionId, studentId: r.value.studentId })))
  return r
}

export async function rejectSubmission(sub: FormSubmission): Promise<Result> {
  await postJson("/api/forms/review", { id: sub.id, status: "rejected" })
  return { ok: true, value: undefined }
}

/** Admin correction — free to pick any subject/slot, not constrained to the token's original offers. */
export async function editSubmissionSlot(sub: FormSubmission, subject: string, slot: FormOfferSlot): Promise<Result> {
  const r = await postJson<{ ok: boolean; error?: string }>("/api/forms/edit", { id: sub.id, subject, slot })
  if (!r.ok) return { ok: false, error: r.error ?? "แก้ไขไม่สำเร็จ" }
  return { ok: true, value: undefined }
}
