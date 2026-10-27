import type { SubjectKey } from './mock'
import { clipGroups } from './learn'

/** ข้อมูล (mock) สำหรับหน้าดูวิดีโอ / ไลฟ์ แบบ YouTube — ครูผู้สอน + วิดีโอที่เกี่ยวข้อง */

// ใช้ตัวอักษรย่อแทนรูป — รูปครูจริงใน public/teachers เป็นของครูแต่ละสาขา ห้ามใส่ผิดคน
export type Teacher = { name: string; initials: string }

export const teacherOf: Record<SubjectKey, Teacher> = {
  math: { name: 'ครูพี่ดาว', initials: 'ดา' },
  science: { name: 'ครูนนท์', initials: 'นน' },
  thai: { name: 'ครูพี่ฝน', initials: 'ฝน' },
  english: { name: 'Teacher Amy', initials: 'AM' },
}

export type WatchVideo = {
  id: string
  subject: SubjectKey
  videoId: string // สำหรับลิงก์ /learn/:subject/:videoId
  title: string
  grade: string
  duration: string
  free: boolean
  comments: number
  live?: boolean
  isNew?: boolean
}


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
      free: v.free,
      comments: (i * 3 + v.id.length) % 9,
      live: i === 1,
      isNew: i === 0,
    })),
  ),
)
