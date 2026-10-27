import type { SubjectKey } from '@/data/mock'

/** ชุดข้อสอบ (mock) — ใช้ทั้งหน้ารายการ และรายการซ้ายของแบบ ค บน Tablet แนวนอน */
export type ExamSet = {
  id: string
  subject: SubjectKey
  title: string
  grade: string
  questions: number
  isNew: boolean
  owned: boolean
  tags: string[]
}

export const exams: ExamSet[] = [
  { id: 'e1', subject: 'thai', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: true, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e2', subject: 'english', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาชีววิทยา', grade: 'ม.1-3', questions: 100, isNew: false, owned: false, tags: ['ไทย', 'อังกฤษ', 'วิทย์'] },
  { id: 'e3', subject: 'math', title: 'เตรียมสอบ ม.4 รร.จุฬาภรณ วิชาชีววิทยา', grade: 'ป.4-6', questions: 100, isNew: false, owned: true, tags: ['อังกฤษ'] },
  { id: 'e4', subject: 'thai', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาภาษาอังกฤษ', grade: 'ป.6', questions: 100, isNew: true, owned: false, tags: ['ชีวะ'] },
  { id: 'e5', subject: 'science', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: true, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e6', subject: 'math', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: true, tags: ['ไทย', 'อังกฤษ', 'วิทย์'] },
  { id: 'e7', subject: 'thai', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e8', subject: 'english', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาภาษาอังกฤษ', grade: 'ป.6', questions: 100, isNew: false, owned: false, tags: ['ชีวะ'] },
  { id: 'e9', subject: 'math', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: true, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e10', subject: 'science', title: 'เตรียมสอบ ม.4 รร.จุฬาภรณ วิชาชีววิทยา', grade: 'ป.4-6', questions: 100, isNew: false, owned: false, tags: ['อังกฤษ'] },
  { id: 'e11', subject: 'thai', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาภาษาอังกฤษ', grade: 'ป.6', questions: 100, isNew: false, owned: false, tags: ['ชีวะ'] },
  { id: 'e12', subject: 'science', title: 'เตรียมสอบ ม.4 รร.จุฬาภรณ วิชาชีววิทยา', grade: 'ป.4-6', questions: 100, isNew: false, owned: true, tags: ['อังกฤษ'] },
  { id: 'e13', subject: 'english', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
]
