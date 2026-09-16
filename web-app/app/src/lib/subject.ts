import type { SubjectKey } from '../data/mock'

// Static class maps (Tailwind ต้องเห็น class เต็มตอน build)
export const subjectBg: Record<SubjectKey, string> = {
  english: 'bg-subject-english',
  thai: 'bg-subject-thai',
  math: 'bg-subject-math',
  science: 'bg-subject-science',
}

export const subjectText: Record<SubjectKey, string> = {
  english: 'text-subject-english-ink',
  thai: 'text-subject-thai-ink',
  math: 'text-subject-math-ink',
  science: 'text-subject-science-ink',
}
