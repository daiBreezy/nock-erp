export type ExamStatus = 'done' | 'in-progress' | 'todo'

export type Question = {
  id: number
  text: string
  choices: string[]
  answer: number // index ของคำตอบที่ถูก
}

export type ExamSet = {
  id: string
  name: string
  subjectKey?: string // ใช้เมื่อเป็น exam แบบหลายวิชา
  questionCount: number
}

export type ExamSubject = { key: string; label: string; tone: string }

export type Exam = {
  id: string
  title: string
  type: 'multi' | 'single' // multi = ต้องเลือกวิชาก่อน
  grades: string[]
  totalQuestions: number
  status: ExamStatus
  cover: string // class สีพื้น
  subjects?: ExamSubject[]
  sets: ExamSet[]
}

export const allGrades = ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']

const examSubjects: ExamSubject[] = [
  { key: 'math', label: 'คณิตศาสตร์', tone: 'bg-subject-math text-subject-math-ink' },
  { key: 'english', label: 'ภาษาอังกฤษ', tone: 'bg-subject-english text-subject-english-ink' },
  { key: 'thai', label: 'ภาษาไทย', tone: 'bg-subject-thai text-subject-thai-ink' },
  { key: 'science', label: 'วิทยาศาสตร์', tone: 'bg-subject-science text-subject-science-ink' },
]

export const exams: Exam[] = [
  {
    id: 'midterm-1',
    title: 'สอบกลางภาค (เทอม 1)',
    type: 'multi',
    grades: ['ม.1'],
    totalQuestions: 105,
    status: 'todo',
    cover: 'bg-subject-thai text-subject-thai-ink',
    subjects: examSubjects,
    sets: [
      { id: 'mid-math-a', name: 'ชุดที่ 1', subjectKey: 'math', questionCount: 20 },
      { id: 'mid-math-b', name: 'ชุดที่ 2', subjectKey: 'math', questionCount: 20 },
      { id: 'mid-eng-a', name: 'ชุดที่ 1', subjectKey: 'english', questionCount: 20 },
      { id: 'mid-thai-a', name: 'ชุดที่ 1', subjectKey: 'thai', questionCount: 25 },
      { id: 'mid-sci-a', name: 'ชุดที่ 1', subjectKey: 'science', questionCount: 20 },
    ],
  },
  {
    id: 'triam-math',
    title: 'เตรียมสอบเข้า ม.4 เตรียมอุดมฯ คณิตศาสตร์',
    type: 'single',
    grades: ['ม.1', 'ม.2', 'ม.3'],
    totalQuestions: 100,
    status: 'in-progress',
    cover: 'bg-subject-math text-subject-math-ink',
    sets: [
      { id: 'triam-1', name: 'ชุดที่ 1 · พีชคณิต', questionCount: 20 },
      { id: 'triam-2', name: 'ชุดที่ 2 · เรขาคณิต', questionCount: 20 },
      { id: 'triam-3', name: 'ชุดที่ 3 · จำนวนและพีชคณิต', questionCount: 20 },
    ],
  },
  {
    id: 'final-1',
    title: 'สอบปลายภาค (เทอม 1)',
    type: 'multi',
    grades: ['ม.2'],
    totalQuestions: 90,
    status: 'done',
    cover: 'bg-subject-science text-subject-science-ink',
    subjects: examSubjects,
    sets: [
      { id: 'fin-math-a', name: 'ชุดที่ 1', subjectKey: 'math', questionCount: 20 },
      { id: 'fin-eng-a', name: 'ชุดที่ 1', subjectKey: 'english', questionCount: 20 },
    ],
  },
  {
    id: 'mwit',
    title: 'สอบเข้า MWIT วิทยาศาสตร์',
    type: 'single',
    grades: ['ม.3'],
    totalQuestions: 40,
    status: 'todo',
    cover: 'bg-subject-science text-subject-science-ink',
    sets: [
      { id: 'mwit-1', name: 'ชุดที่ 1 · ฟิสิกส์', questionCount: 20 },
      { id: 'mwit-2', name: 'ชุดที่ 2 · เคมี', questionCount: 20 },
    ],
  },
]

export const statusLabel: Record<ExamStatus, string> = {
  done: 'ทำแล้ว',
  'in-progress': 'ทำค้างไว้',
  todo: 'ยังไม่ทำ',
}

export const statusTone: Record<ExamStatus, string> = {
  done: 'bg-success/10 text-success',
  'in-progress': 'bg-subject-math text-subject-math-ink',
  todo: 'bg-surface-2 text-ink-soft',
}

export function getExam(id: string | undefined) {
  return exams.find((e) => e.id === id)
}

export function getSet(exam: Exam | undefined, setId: string | undefined) {
  return exam?.sets.find((s) => s.id === setId)
}

// สร้างชุดคำถาม mock ตามจำนวนข้อ
export function buildQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    text: `ข้อที่ ${i + 1}: ผลลัพธ์ของข้อใดต่อไปนี้ถูกต้อง?`,
    choices: ['ตัวเลือก ก', 'ตัวเลือก ข', 'ตัวเลือก ค', 'ตัวเลือก ง'],
    answer: (i * 3) % 4,
  }))
}
