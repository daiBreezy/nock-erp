// Asset จริง — Banner โปรโมท + Screenshot วิดีโอ (ใช้เป็น thumbnail ทั่วเว็บ)
import banner from '../assets/media/banner.png'
import s1 from '../assets/media/Screenshot00001.avif'
import s2 from '../assets/media/Screenshot00002.avif'
import s3 from '../assets/media/Screenshot00003.avif'
import s4 from '../assets/media/Screenshot00004.png'
import s5 from '../assets/media/Screenshot00005.png'
import s6 from '../assets/media/Screenshot00006.png'
import s7 from '../assets/media/Screenshot00007.png'
import s8 from '../assets/media/Screenshot00008.png'

export const bannerImg = banner

export const thumbs = [s1, s2, s3, s4, s5, s6, s7, s8]

// เลือก thumbnail แบบคงที่จาก key/index (กระจายทั่ว list)
export function thumb(seed: number | string): string {
  const n = typeof seed === 'number' ? seed : [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0)
  return thumbs[Math.abs(n) % thumbs.length]
}
