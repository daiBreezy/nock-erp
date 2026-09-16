export type Noti = {
  id: number
  type: 'live' | 'cheer' | 'friend' | 'achievement' | 'system'
  title: string
  detail: string
  time: string
  unread: boolean
}

export const notifications: Noti[] = [
  { id: 1, type: 'live', title: 'ไลฟ์กำลังจะเริ่ม', detail: 'คณิตศาสตร์ ป.5-6 เริ่มใน 15 นาที', time: '5 นาทีที่แล้ว', unread: true },
  { id: 2, type: 'cheer', title: 'ได้รับกำลังใจ', detail: 'มิ้นต์ และอีก 3 คน Cheer คุณ', time: '1 ชม.ที่แล้ว', unread: true },
  { id: 3, type: 'friend', title: 'คำขอเป็นเพื่อน', detail: 'บอส ขอเพิ่มคุณเป็นเพื่อน', time: '3 ชม.ที่แล้ว', unread: true },
  { id: 4, type: 'achievement', title: 'ปลดล็อกความสำเร็จ', detail: 'คุณโฟกัสต่อเนื่อง 30 นาที!', time: 'เมื่อวาน', unread: false },
  { id: 5, type: 'system', title: 'อัปเดตใหม่', detail: 'เพิ่มห้องทำการบ้านแล้ววันนี้', time: '2 วันที่แล้ว', unread: false },
]

export type Person = {
  id: number
  name: string
  nickname: string
  school: string
  province: string
  tone: string
}

const tones = [
  'bg-subject-english text-subject-english-ink',
  'bg-subject-thai text-subject-thai-ink',
  'bg-subject-math text-subject-math-ink',
  'bg-subject-science text-subject-science-ink',
]

function mk(id: number, name: string, nickname: string, school: string, province: string): Person {
  return { id, name, nickname, school, province, tone: tones[id % tones.length] }
}

export const myFriends: Person[] = [
  mk(1, 'มินตรา ดีงาม', 'มิ้นต์', 'ร.ร.สตรีวิทยา', 'กรุงเทพฯ'),
  mk(2, 'ภูริช กล้าหาญ', 'บอส', 'ร.ร.สวนกุหลาบ', 'กรุงเทพฯ'),
  mk(3, 'ปุณยวีร์ ใจดี', 'ปอ', 'ร.ร.เตรียมอุดมฯ', 'กรุงเทพฯ'),
]

export const suggestedFriends: Person[] = [
  mk(11, 'ใบบุญ สุขใจ', 'ใบ', 'ร.ร.หอวัง', 'กรุงเทพฯ'),
  mk(12, 'ณัฐพล เก่งกาจ', 'นัท', 'ร.ร.บดินทรเดชา', 'กรุงเทพฯ'),
  mk(13, 'จุฑามาศ แสนดี', 'จูน', 'ร.ร.สามเสนวิทยาลัย', 'กรุงเทพฯ'),
  mk(14, 'เอมิกา รักเรียน', 'เอม', 'ร.ร.มงฟอร์ต', 'เชียงใหม่'),
  mk(15, 'ฟ้าใส งามตา', 'ฟ้า', 'ร.ร.ขอนแก่นวิทยายน', 'ขอนแก่น'),
]
