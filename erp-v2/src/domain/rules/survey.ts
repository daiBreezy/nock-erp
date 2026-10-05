// Yearly parent satisfaction survey (owner 2026-10-05): sent once a year (Sep–Oct window in Settings) to every family
// with a child studying, one form per family with ratings per child, identified (so unhappy families get a call),
// core questions the same every year so years compare. Teachers only ever see their own average.

import { addDays } from "../dates"
import type { DateStr, Entitlement, Family, ID, Student, SurveyAnswers, SurveyCampaign, SurveyResponse, SystemConfig } from "../types"

export const DEFAULT_WINDOW = { from: "09-15", to: "10-15" }
export const REMIND_AFTER_DAYS = 7
export const CALL_WITHIN_DAYS = 3

export function surveyWindow(system: Pick<SystemConfig, "survey">, year: number) {
  const w = system.survey ?? DEFAULT_WINDOW
  return { from: `${year}-${w.from}`, to: `${year}-${w.to}` }
}

/** Families with at least one child whose package covers the day — who the survey goes to. */
export function surveyRecipients<S extends Pick<Student, "id" | "familyId" | "archived" | "branchId">>(families: Family[], students: S[], ents: Pick<Entitlement, "studentId" | "from" | "to">[], date: DateStr) {
  return families.map((f) => {
    const kids = students.filter((s) => s.familyId === f.id && !s.archived && ents.some((e) => e.studentId === s.id && e.from <= date && date <= e.to))
    return { family: f, kids }
  }).filter((x) => x.kids.length > 0)
}

/** NPS = % who'd recommend (9–10) − % who wouldn't (0–6). */
export function nps(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null)
  if (!v.length) return null
  return Math.round(((v.filter((x) => x >= 9).length - v.filter((x) => x <= 6).length) / v.length) * 100)
}

const mean = (vals: (number | null | undefined)[]) => { const v = vals.filter((x): x is number => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }

export const SERVICE_KEYS = ["admin", "summary", "schedule", "place", "bus", "value"] as const
export const SERVICE_LABEL: Record<(typeof SERVICE_KEYS)[number], string> = { admin: "การติดต่อแอดมิน", summary: "สรุปการเรียน", schedule: "ตารางเรียน / ความยืดหยุ่น", place: "สถานที่", bus: "รถรับส่ง", value: "ความคุ้มค่า" }
export const CHILD_LABEL = { teacher: "ครูผู้สอน", progress: "พัฒนาการของลูก", level: "เนื้อหาเหมาะกับระดับ" } as const

/** Unhappy = wouldn't recommend (0–6) or not coming back next year — a manager calls them. */
export const isUnhappy = (a: Pick<SurveyAnswers, "nps" | "continueNext">) => (a.nps !== null && a.nps <= 6) || a.continueNext === "no"

export function summarize(responses: SurveyResponse[], sent: number) {
  const a = responses.map((r) => r.answers)
  const kids = a.flatMap((x) => x.children)
  return {
    responses: responses.length, sent, rate: sent ? responses.length / sent : null,
    nps: nps(a.map((x) => x.nps)), overall: mean(a.map((x) => x.overall)),
    continueNext: { yes: a.filter((x) => x.continueNext === "yes").length, maybe: a.filter((x) => x.continueNext === "maybe").length, no: a.filter((x) => x.continueNext === "no").length },
    child: { teacher: mean(kids.map((k) => k.teacher)), progress: mean(kids.map((k) => k.progress)), level: mean(kids.map((k) => k.level)) },
    service: Object.fromEntries(SERVICE_KEYS.map((k) => [k, mean(a.map((x) => x.service[k]))])) as Record<(typeof SERVICE_KEYS)[number], number | null>,
    unhappy: responses.filter((r) => isUnhappy(r.answers)).length,
  }
}

/** Every topic ranked lowest first — what to fix. */
export function topicRanking(s: ReturnType<typeof summarize>) {
  return [
    ...Object.entries(CHILD_LABEL).map(([k, label]) => ({ key: k, label, score: s.child[k as keyof typeof CHILD_LABEL] })),
    ...SERVICE_KEYS.map((k) => ({ key: k, label: SERVICE_LABEL[k], score: s.service[k] })),
  ].filter((x) => x.score !== null).sort((a, b) => a.score! - b.score!)
}

/** A teacher's average from the children they teach (their own number only — never who said what). */
export function teacherScores(responses: SurveyResponse[]) {
  const by = new Map<ID, number[]>()
  for (const r of responses) for (const c of r.answers.children) {
    if (c.teacher === null) continue
    for (const t of r.teachers[c.studentId] ?? []) by.set(t, [...(by.get(t) ?? []), c.teacher])
  }
  return [...by.entries()].map(([teacherId, v]) => ({ teacherId, score: v.reduce((a, b) => a + b, 0) / v.length, ratings: v.length })).sort((a, b) => a.score - b.score)
}

export function wantsCount(responses: SurveyResponse[]) {
  const by = new Map<string, number>()
  responses.forEach((r) => r.answers.wants.forEach((w) => by.set(w, (by.get(w) ?? 0) + 1)))
  return [...by.entries()].map(([want, count]) => ({ want, count })).sort((a, b) => b.count - a.count)
}

/** Unhappy families nobody has called yet — overdue after CALL_WITHIN_DAYS. */
export function toCall(responses: SurveyResponse[], today: DateStr) {
  return responses.filter((r) => isUnhappy(r.answers) && !r.followUp)
    .map((r) => ({ r, due: addDays(r.submittedAt.slice(0, 10), CALL_WITHIN_DAYS), overdue: addDays(r.submittedAt.slice(0, 10), CALL_WITHIN_DAYS) < today }))
    .sort((a, b) => a.r.submittedAt.localeCompare(b.r.submittedAt))
}

/** Families of a send-out who haven't answered — the reminder goes to them once, 7 days after sending. */
export function notAnswered(c: SurveyCampaign, responses: SurveyResponse[]) {
  const done = new Set(responses.filter((r) => r.campaignId === c.id).map((r) => r.familyId))
  return c.recipients.filter((x) => !done.has(x.familyId))
}
export const canRemind = (c: SurveyCampaign, today: DateStr) => !c.remindedAt && addDays(c.sentAt.slice(0, 10), REMIND_AFTER_DAYS) <= today && today <= addDays(c.to, 7)
