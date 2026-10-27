import { useEffect, useState } from 'react'

/** true เมื่อ media query ตรง — ใช้เลือกโครงหน้า (เช่น แชทข้างวิดีโอเมื่อจอกว้าง) โดยไม่ต้อง render ซ้ำ 2 ชุด */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}
