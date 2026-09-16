export type FocusSubject = {
  key: string
  label: string
  tone: string // class สี (bg + text)
}

// วิชาในห้องทำการบ้าน (กว้างกว่าห้องเรียน 4 วิชา)
export const focusSubjects: FocusSubject[] = [
  { key: 'math', label: 'คณิตศาสตร์', tone: 'bg-subject-math text-subject-math-ink' },
  { key: 'english', label: 'ภาษาอังกฤษ', tone: 'bg-subject-english text-subject-english-ink' },
  { key: 'thai', label: 'ภาษาไทย', tone: 'bg-subject-thai text-subject-thai-ink' },
  { key: 'physics', label: 'ฟิสิกส์', tone: 'bg-subject-science text-subject-science-ink' },
  { key: 'biology', label: 'ชีววิทยา', tone: 'bg-subject-english text-subject-english-ink' },
  { key: 'social', label: 'สังคมศึกษา', tone: 'bg-subject-math text-subject-math-ink' },
  { key: 'chemistry', label: 'เคมี', tone: 'bg-subject-thai text-subject-thai-ink' },
]

// ตัวเลือกเวลา (นาที) — 0 = ไม่จับเวลา
export const presetDurations = [10, 15, 30, 60]

// สมาชิกที่ออนไลน์ในห้อง (โชว์สูงสุด 40)
export const onlineMembers = Array.from({ length: 38 }, (_, i) => {
  const names = ['มน', 'ฟ้า', 'กร', 'ใบ', 'โต', 'พีท', 'นัท', 'จูน', 'ปอ', 'มิ้น', 'เอม', 'บอส']
  const tones = [
    'bg-subject-english text-subject-english-ink',
    'bg-subject-thai text-subject-thai-ink',
    'bg-subject-math text-subject-math-ink',
    'bg-subject-science text-subject-science-ink',
  ]
  return {
    id: i + 1,
    name: names[i % names.length],
    tone: tones[i % tones.length],
  }
})
