export type Role = 'student' | 'parent'
export type GoalType = 'improve' | 'entrance'

export const goalSubjects = [
  { key: 'math', label: 'คณิตศาสตร์' },
  { key: 'english', label: 'ภาษาอังกฤษ' },
  { key: 'thai', label: 'ภาษาไทย' },
  { key: 'science', label: 'วิทยาศาสตร์' },
  { key: 'physics', label: 'ฟิสิกส์' },
  { key: 'chemistry', label: 'เคมี' },
]

export const targetSchools = [
  'เตรียมอุดมศึกษา',
  'มหิดลวิทยานุสรณ์ (MWIT)',
  'สวนกุหลาบวิทยาลัย',
  'บดินทรเดชา',
  'สาธิตจุฬาฯ',
]

export const grades = ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']

// Confidence = 5 mood
export const moods = [
  { v: 1, label: 'น้อยมาก', emoji: '😣' },
  { v: 2, label: 'น้อย', emoji: '😕' },
  { v: 3, label: 'กลาง', emoji: '😐' },
  { v: 4, label: 'ดี', emoji: '🙂' },
  { v: 5, label: 'ดีมาก', emoji: '😄' },
]

// Test = 10 ข้อ/วิชา, skip ได้หลังข้อ 5
export function buildGoalTest(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    text: `ข้อ ${i + 1}: เลือกคำตอบที่ถูกต้องที่สุด`,
    choices: ['ตัวเลือก ก', 'ตัวเลือก ข', 'ตัวเลือก ค', 'ตัวเลือก ง'],
    answer: (i * 2) % 4,
  }))
}

// Cut-scene คั่น (ข้อ 3, 5, 10)
export const cutScenes: Record<number, { title: string; detail: string; skippable?: boolean }> = {
  3: { title: 'ระบบเริ่มเห็นแนวทางแล้ว', detail: 'ทำต่ออีกนิด เราจะวิเคราะห์จุดแข็ง-จุดอ่อนได้แม่นขึ้น' },
  5: { title: 'ปลดล็อกผลเบื้องต้นแล้ว', detail: 'ดูผลคร่าวๆ ได้เลย หรือทำต่อให้ครบเพื่อความแม่นยำ', skippable: true },
  10: { title: 'Result พร้อมแล้ว!', detail: 'เราวิเคราะห์ครบทุกข้อแล้ว มาดูผลกัน' },
}

// AI Summary (mock)
export const aiSummary = {
  strength: 'พีชคณิตและการคำนวณพื้นฐานแน่น ทำโจทย์ตรงไปตรงมาได้ดี',
  weak: 'โจทย์ปัญหาประยุกต์และเรขาคณิตยังพลาดบ่อย',
  improve: 'ฝึกโจทย์ประยุกต์วันละ 15 นาที จะดึงคะแนนขึ้นได้เร็วที่สุด',
  current: 58,
  target: 80,
}

export const playlist = [
  { id: 'p1', title: 'โจทย์ปัญหาประยุกต์ ตอนที่ 1', duration: '12:30' },
  { id: 'p2', title: 'เรขาคณิตเบื้องต้น', duration: '15:10' },
  { id: 'p3', title: 'เทคนิคคิดเลขเร็ว', duration: '09:45' },
]

export const planDurations = ['สั้น (14 วัน – 1 เดือน)', 'ยาว (1 – 3 เดือน)']
export const planTimes = ['8:00–12:00', '13:00–16:00', '16:00–18:00', '18:00–20:00', '20:00–22:00']
