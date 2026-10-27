import type { SubjectKey } from './mock'
import { clipGroups } from './learn'

/** ข้อมูล (mock) สำหรับหน้าดูวิดีโอ / ไลฟ์ แบบ YouTube — ครูผู้สอน + วิดีโอที่เกี่ยวข้อง */

// ใช้ตัวอักษรย่อแทนรูป — รูปครูจริงใน public/teachers เป็นของครูแต่ละสาขา ห้ามใส่ผิดคน
export type Teacher = { name: string; initials: string; followers: string }

export const teacherOf: Record<SubjectKey, Teacher> = {
  math: { name: 'ครูพี่ดาว', initials: 'ดา', followers: '12.4K' },
  science: { name: 'ครูนนท์', initials: 'นน', followers: '8.1K' },
  thai: { name: 'ครูพี่ฝน', initials: 'ฝน', followers: '5.6K' },
  english: { name: 'Teacher Amy', initials: 'AM', followers: '9.9K' },
}

export type WatchVideo = {
  id: string
  subject: SubjectKey
  videoId: string // สำหรับลิงก์ /learn/:subject/:videoId
  title: string
  grade: string
  duration: string
  views: string
  ago: string
  live?: boolean
  isNew?: boolean
}

const AGO = ['2 ชั่วโมงที่แล้ว', 'เมื่อวาน', '3 วันที่แล้ว', '1 สัปดาห์ที่แล้ว', '2 สัปดาห์ที่แล้ว']
const VIEWS = ['1.2K', '860', '3.4K', '12K', '540', '2.1K']

/** วิดีโอที่เกี่ยวข้อง — ดึงจากคลิปทุกวิชา (บทเรียน + ไลฟ์ย้อนหลังบางส่วน) */
export const relatedVideos: WatchVideo[] = (['math', 'science', 'english', 'thai'] as SubjectKey[]).flatMap((subject) =>
  clipGroups[subject].flatMap((g) =>
    g.videos.map((v, i) => ({
      id: `${subject}/${v.id}`,
      subject,
      videoId: v.id,
      title: `${v.title} — ${g.title}`,
      grade: g.grade,
      duration: v.duration,
      views: VIEWS[(v.id.length + i) % VIEWS.length],
      ago: AGO[i % AGO.length],
      live: i === 1,
      isNew: i === 0,
    })),
  ),
)
