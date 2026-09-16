export const me = {
  name: 'ธนกร ใจดี',
  nickname: 'กร',
  initial: 'กร',
  tone: 'bg-subject-math text-subject-math-ink',
  nakama: 24,
  intro: 'นักเรียน ม.3 ชอบคณิตศาสตร์และฟิสิกส์ ฝันอยากเข้าเตรียมอุดมฯ',
  school: 'โรงเรียนสาธิตมหาวิทยาลัย',
  province: 'กรุงเทพมหานคร',
  grade: 'ม.3',
}

// สรุปเวลาใช้งาน (นาที)
export const usageStats = {
  today: 95,
  month: 1840,
  all: 12450,
}

// กราฟ 7 วันล่าสุด (นาที แยกประเภท)
export const weekly = [
  { day: 'จ', homework: 30, live: 20, video: 15 },
  { day: 'อ', homework: 45, live: 0, video: 25 },
  { day: 'พ', homework: 20, live: 50, video: 10 },
  { day: 'พฤ', homework: 60, live: 30, video: 20 },
  { day: 'ศ', homework: 15, live: 0, video: 40 },
  { day: 'ส', homework: 80, live: 20, video: 30 },
  { day: 'อา', homework: 50, live: 25, video: 20 },
]

export const usageTypes = [
  { key: 'homework', label: 'ห้องทำการบ้าน', color: '#4F46E5' },
  { key: 'live', label: 'ถ่ายทอดสด', color: '#E24B4A' },
  { key: 'video', label: 'วิดีโอบทเรียน', color: '#1D9E75' },
] as const

// Ranking
export type Ranker = { rank: number; name: string; minutes: number; tone: string; me?: boolean }
export const ranking: Ranker[] = [
  { rank: 1, name: 'มิ้นต์', minutes: 3420, tone: 'bg-subject-thai text-subject-thai-ink' },
  { rank: 2, name: 'บอส', minutes: 3180, tone: 'bg-subject-english text-subject-english-ink' },
  { rank: 3, name: 'ปอ', minutes: 2990, tone: 'bg-subject-science text-subject-science-ink' },
  ...Array.from({ length: 17 }, (_, i) => ({
    rank: i + 4,
    name: ['ใบ', 'นัท', 'จูน', 'เอม', 'ฟ้า', 'กร', 'พีท', 'มน', 'ดิว', 'แพร', 'ตี้', 'นิว', 'เฟิร์น', 'อ๋อม', 'กิ๊ก', 'ปลื้ม', 'เจมส์'][i],
    minutes: 2800 - i * 120,
    tone: 'bg-surface-2 text-ink-soft',
    me: i + 4 === 9,
  })),
]

// Achievement
export type Achievement = { id: string; label: string; unlocked: boolean }
export type AchievementGroup = { title: string; items: Achievement[] }
export const achievementGroups: AchievementGroup[] = [
  {
    title: 'เวลาเรียนสะสม',
    items: [
      { id: 't1', label: 'เข้าห้องทำการบ้านครั้งแรก', unlocked: true },
      { id: 't2', label: 'โฟกัสต่อเนื่อง 30 นาที', unlocked: true },
      { id: 't3', label: 'สะสม 100 นาที', unlocked: true },
      { id: 't4', label: 'ใช้งานต่อเนื่อง 7 วัน', unlocked: false },
      { id: 't5', label: 'สะสม 1000 นาที', unlocked: false },
    ],
  },
  {
    title: 'รับชมวิดีโอ',
    items: [
      { id: 'v1', label: 'ดูวิดีโอแรก', unlocked: true },
      { id: 'v2', label: 'ดูครบ 10 วิดีโอ', unlocked: true },
      { id: 'v3', label: 'ทำ Quiz ได้คะแนนเต็มครั้งแรก', unlocked: false },
      { id: 'v4', label: 'ดูครบทุกวิชา', unlocked: false },
    ],
  },
  {
    title: 'เพื่อน',
    items: [
      { id: 'f1', label: 'เพิ่มเพื่อนคนแรก', unlocked: true },
      { id: 'f2', label: 'Cheer เพื่อนครั้งแรก', unlocked: true },
      { id: 'f3', label: 'ได้รับ Cheer 50 ครั้ง', unlocked: false },
    ],
  },
  {
    title: 'ห้องสอบ',
    items: [
      { id: 'e1', label: 'เข้าห้องสอบครั้งแรก', unlocked: true },
      { id: 'e2', label: 'สอบได้คะแนนเต็มครั้งแรก', unlocked: false },
      { id: 'e3', label: 'สอบครบ 10 ครั้ง', unlocked: false },
    ],
  },
]

// ปฏิทินการใช้งาน — วันที่ที่มีกิจกรรม (เดือนปัจจุบัน)
export const activeDays: Record<number, ('homework' | 'live' | 'video' | 'exam')[]> = {
  2: ['homework'],
  3: ['homework', 'video'],
  5: ['live'],
  8: ['homework', 'live', 'video'],
  9: ['video'],
  12: ['homework'],
  15: ['exam', 'homework'],
  16: ['live'],
  19: ['homework', 'video'],
  22: ['homework'],
  23: ['live', 'video'],
  26: ['homework', 'exam'],
}
