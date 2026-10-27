import { GraduationCap, User, Bell, MoreHorizontal } from 'lucide-react'

/** เมนูหลักของ App — BottomNav (มือถือ / Tablet แนวตั้ง) กับ NavRail (Tablet แนวนอน) ใช้ชุดเดียวกัน */
export const appNavItems = [
  { to: '/', label: 'เซนเซย์', Icon: GraduationCap },
  { to: '/profile', label: 'โปรไฟล์', Icon: User },
  { to: '/notifications', label: 'แจ้งเตือน', Icon: Bell },
  { to: '/more', label: 'เพิ่มเติม', Icon: MoreHorizontal },
]
