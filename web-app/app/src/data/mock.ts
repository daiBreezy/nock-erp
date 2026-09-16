export type SubjectKey = 'english' | 'thai' | 'math' | 'science'

export const subjects: { key: SubjectKey; label: string }[] = [
  { key: 'english', label: 'ภาษาอังกฤษ' },
  { key: 'thai', label: 'ภาษาไทย' },
  { key: 'math', label: 'คณิตศาสตร์' },
  { key: 'science', label: 'วิทยาศาสตร์' },
]

export const banners = [
  { id: 1, title: 'วิทยาศาสตร์ สสวท.', subtitle: 'กับครูนนท์ · พร้อมเรียน', subject: 'science' as SubjectKey },
  { id: 2, title: 'คณิตศาสตร์ ม.ปลาย', subtitle: 'ปูพื้นฐานก่อนสอบเข้า', subject: 'math' as SubjectKey },
  { id: 3, title: 'ภาษาอังกฤษเพื่อการสื่อสาร', subtitle: 'เริ่มจากศูนย์', subject: 'english' as SubjectKey },
  { id: 4, title: 'ภาษาไทย ม.ต้น', subtitle: 'หลักภาษาแน่น', subject: 'thai' as SubjectKey },
]

export const liveNext = {
  badge: 'ป.4-6',
  subject: 'math' as SubjectKey,
  title: 'คณิตศาสตร์ (พื้นฐาน) ป.5 และ ป.6 (ครูดาว)',
  episode: 'ยกระดับคณิตศาสตร์ ประถมปลาย ตอนที่ 6',
  date: 'พฤ. 25 มิ.ย. · 19:00 - 19:50',
  waiting: 22,
}

export const schedule = [
  { id: 1, grade: 'ม.3', subject: 'math' as SubjectKey, title: 'คณิตศาสตร์', time: '19:00', premium: false },
  { id: 2, grade: 'ม.3', subject: 'science' as SubjectKey, title: 'MWIT ตอนที่ 6', time: '20:00', premium: true },
  { id: 3, grade: 'ม.2', subject: 'thai' as SubjectKey, title: 'ภาษาไทย', time: '18:00', premium: false },
  { id: 4, grade: 'ป.6', subject: 'english' as SubjectKey, title: 'Grammar', time: '17:00', premium: false },
]

export const exams = [
  { id: 1, subject: 'thai' as SubjectKey, title: 'สอบกลางภาค (เทอม 1)', questions: 105, grade: 'ม.1', premium: true },
  { id: 2, subject: 'math' as SubjectKey, title: 'เตรียมสอบเข้า ม.4 เตรียมอุดมฯ คณิต', questions: 100, grade: 'ม.1–ม.3', premium: false },
]

export const homeworkRoom = {
  online: 38,
  members: ['มน', 'ฟ้า', 'กร', 'ใบ', 'โต', 'พีท', 'นัท'] as string[],
}

// System Update — section มาตรฐานเดียว ใช้เหมือนกันทั้ง Web + App
export const systemUpdates = [
  { id: 1, title: 'เปิดตัวห้องทำการบ้าน', detail: 'จับเวลาโฟกัส + เชียร์เพื่อนแบบเรียลไทม์', date: '26 มิ.ย. 2026' },
  { id: 2, title: 'เพิ่มห้องสอบใหม่', detail: 'สอบเข้าเตรียมอุดมฯ + เฉลยวิดีโอ', date: '20 มิ.ย. 2026' },
  { id: 3, title: 'ปรับปรุงระบบไลฟ์สด', detail: 'ลื่นขึ้น + แชทเร็วขึ้น', date: '15 มิ.ย. 2026' },
]

export const shareTargets = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'line', label: 'LINE' },
  { key: 'messenger', label: 'Messenger' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'copy', label: 'คัดลอกลิงก์' },
]
