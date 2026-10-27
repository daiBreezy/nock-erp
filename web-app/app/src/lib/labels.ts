import type { SubjectKey } from '@/data/mock'

/**
 * ชื่อวิชา 4 แบบ (เจ้าของกำหนด 2026-10-27) — ยาว → สั้น ตามพื้นที่
 * full: คณิตศาสตร์ · short: คณิต · en: Math · code: Ma
 */
export type SubjectForm = 'full' | 'short' | 'en' | 'code'

export const SUBJECT_NAMES: Record<SubjectKey, Record<SubjectForm, string>> = {
  math: { full: 'คณิตศาสตร์', short: 'คณิต', en: 'Math', code: 'Ma' },
  science: { full: 'วิทยาศาสตร์', short: 'วิทย์', en: 'Science', code: 'Sc' },
  thai: { full: 'ภาษาไทย', short: 'ไทย', en: 'Thai', code: 'Th' },
  english: { full: 'ภาษาอังกฤษ', short: 'อังกฤษ', en: 'English', code: 'En' },
}

export const subjectName = (key: SubjectKey, form: SubjectForm = 'short') => SUBJECT_NAMES[key][form]

/**
 * ชั้นเรียน → G1–G12 · ป.1–6 = G1–6 · ม.1–6 = G7–12
 * รับช่วงด้วย: 'ม.1-3' → 'G7–9', 'ป.4-6' → 'G4–6' · ไม่ใช่รูปแบบนี้ = คืนค่าเดิม
 */
export function gradeCode(label: string): string {
  const m = label.trim().match(/^(ป|ม)\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?$/)
  if (!m) return label
  const base = m[1] === 'ป' ? 0 : 6
  const from = base + Number(m[2])
  const to = m[3] ? base + Number(m[3]) : null
  return to ? `G${from}–${to}` : `G${from}`
}
