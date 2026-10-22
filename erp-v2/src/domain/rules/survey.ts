// Yearly parent satisfaction survey (owner 2026-10-05): sent once a year (Sep–Oct window in Settings) to every family
// with a child studying, one form per family, identified (so unhappy families get a call). Since 2026-10-21 the
// questions are the school's real survey (Google Form) so years compare with what they collected before.
// Teachers only ever see their own average.

import { addDays } from "../dates"
import type { DateStr, Entitlement, Family, ID, Student, SurveyAnswers, SurveyCampaign, SurveyImprove, SurveyReason, SurveyResponse, SurveyTopic, SystemConfig } from "../types"

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

// owner 2026-10-21: the questions of the school's real survey (Google Form) — labels as the form words them
export const REASON_KEYS = ["content", "teaching", "feedback", "schedule", "value", "other"] as const satisfies readonly SurveyReason[]
export const REASON_LABEL: Record<SurveyReason, string> = {
  content: "เนื้อหาบทเรียนตรงหลักสูตรและเข้าใจง่าย", teaching: "เทคนิคการสอนของครูช่วยให้เด็กพัฒนาขึ้น", feedback: "ระบบ Feedback รายงานผลการเรียนชัดเจนสม่ำเสมอ",
  schedule: "ตารางเรียนเหมาะสม", value: "ค่าเล่าเรียนคุ้มค่าเมื่อเทียบกับคุณภาพ", other: "อื่นๆ",
}
export const TOPIC_KEYS = ["teacher", "content", "feedback", "value", "place"] as const satisfies readonly SurveyTopic[]
export const TOPIC_LABEL: Record<SurveyTopic, string> = { teacher: "คุณครูผู้สอน", content: "คุณภาพหลักสูตรและเนื้อหาการสอน", feedback: "ระบบการให้ Feedback", value: "ความคุ้มค่าของค่าเล่าเรียน", place: "ห้องเรียน อาคารสถานที่" }
/** the form's 5-point scale, 5 = best */
export const SCALE_LABEL: Record<number, string> = { 5: "มากที่สุด", 4: "มาก", 3: "ปานกลาง", 2: "น้อย", 1: "ไม่พอใจ" }
export const IMPROVE_KEYS = ["exam", "challenge", "activities", "one_on_one", "school", "facility", "other"] as const satisfies readonly SurveyImprove[]
export const IMPROVE_LABEL: Record<SurveyImprove, string> = {
  exam: "เพิ่มความเข้มข้นของเนื้อหาเพื่อการสอบแข่งขัน", challenge: "เพิ่มโจทย์ท้าทายและคลังข้อสอบเก่า", activities: "เพิ่มกิจกรรมเสริมทักษะนอกวิชาหลัก",
  one_on_one: "เพิ่มการสื่อสาร / ปรึกษาตัวต่อตัวกับครู", school: "เนื้อหาตรงกับหลักสูตรของโรงเรียนมากขึ้น", facility: "ความเรียบร้อยและความสะอาดของสถานที่", other: "อื่นๆ",
}

/** NPS group of a 0–10 score */
export const npsGroup = (n: number | null) => (n === null ? null : n >= 9 ? "promoter" : n >= 7 ? "passive" : "detractor")

/** Unhappy = wouldn't recommend (0–6) — a manager calls them. */
export const isUnhappy = (a: Pick<SurveyAnswers, "nps">) => a.nps !== null && a.nps <= 6

/** answers in the current shape (older test answers from before 2026-10-21 are left out) */
export const isCurrent = (r: Pick<SurveyResponse, "answers">) => !!r.answers && typeof r.answers === "object" && "scores" in r.answers

export function summarize(responses: SurveyResponse[], sent: number) {
  const rs = responses.filter(isCurrent)
  const a = rs.map((r) => r.answers)
  const scores = Object.fromEntries(TOPIC_KEYS.map((k) => [k, mean(a.map((x) => x.scores[k]))])) as Record<SurveyTopic, number | null>
  return {
    responses: rs.length, sent, rate: sent ? rs.length / sent : null,
    nps: nps(a.map((x) => x.nps)),
    /** the five topics' average (1–5) */
    overall: mean(TOPIC_KEYS.map((k) => scores[k])),
    scores,
    /** why they scored as they did — per NPS group, most named first */
    reasons: REASON_KEYS.map((k) => {
      const by = (g: string) => a.filter((x) => x.reasons.includes(k) && npsGroup(x.nps) === g).length
      return { key: k, label: REASON_LABEL[k], promoter: by("promoter"), passive: by("passive"), detractor: by("detractor"), total: a.filter((x) => x.reasons.includes(k)).length }
    }).filter((x) => x.total).sort((x, y) => y.total - x.total),
    /** the one thing to improve most, most picked first */
    improve: IMPROVE_KEYS.map((k) => ({ key: k, label: IMPROVE_LABEL[k], count: a.filter((x) => x.improve === k).length })).filter((x) => x.count).sort((x, y) => y.count - x.count),
    unhappy: rs.filter((r) => isUnhappy(r.answers)).length,
  }
}

/** Every topic ranked lowest first — what to fix. */
export function topicRanking(s: ReturnType<typeof summarize>) {
  return TOPIC_KEYS.map((k) => ({ key: k, label: TOPIC_LABEL[k], score: s.scores[k] })).filter((x) => x.score !== null).sort((a, b) => a.score! - b.score!)
}

/** A teacher's average of the "คุณครูผู้สอน" score from the families whose children they teach (their own number only). */
export function teacherScores(responses: SurveyResponse[]) {
  const by = new Map<ID, number[]>()
  for (const r of responses.filter(isCurrent)) {
    const v = r.answers.scores.teacher
    if (v === null) continue
    for (const t of new Set(Object.values(r.teachers).flat())) by.set(t, [...(by.get(t) ?? []), v])
  }
  return [...by.entries()].map(([teacherId, v]) => ({ teacherId, score: v.reduce((a, b) => a + b, 0) / v.length, ratings: v.length })).sort((a, b) => a.score - b.score)
}

/** "subject · ประถม / มัธยม" of each child — the real form's Q1 options, filled in from the enrolment */
export const levelOf = (grade: string) => (grade.startsWith("ม.") ? "มัธยม" : "ประถม")
export const subjectGroups = (r: Pick<SurveyResponse, "kids">) => [...new Set((r.kids ?? []).flatMap((k) => k.subjects.map((s) => `${s} ${levelOf(k.grade)}`)))]

/** Unhappy families nobody has called yet — overdue after CALL_WITHIN_DAYS. */
export function toCall(responses: SurveyResponse[], today: DateStr) {
  return responses.filter((r) => isCurrent(r) && isUnhappy(r.answers) && !r.followUp)
    .map((r) => ({ r, due: addDays(r.submittedAt.slice(0, 10), CALL_WITHIN_DAYS), overdue: addDays(r.submittedAt.slice(0, 10), CALL_WITHIN_DAYS) < today }))
    .sort((a, b) => a.r.submittedAt.localeCompare(b.r.submittedAt))
}

/** Families of a send-out who haven't answered — the reminder goes to them once, 7 days after sending. */
export function notAnswered(c: SurveyCampaign, responses: SurveyResponse[]) {
  const done = new Set(responses.filter((r) => r.campaignId === c.id).map((r) => r.familyId))
  return c.recipients.filter((x) => !done.has(x.familyId))
}
export const canRemind = (c: SurveyCampaign, today: DateStr) => !c.remindedAt && addDays(c.sentAt.slice(0, 10), REMIND_AFTER_DAYS) <= today && today <= addDays(c.to, 7)
