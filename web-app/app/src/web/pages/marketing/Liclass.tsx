import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import DesktopNav from '@/web/components/DesktopNav'
import MarketingFooter from '@/web/components/MarketingFooter'
import { Button } from '@/components/ui/button'
import { LineIcon } from '@/components/BrandIcons'

/* Liclass School (โรงเรียนสำหรับคนญี่ปุ่น) — หน้า Coming Soon จนกว่าจะมีเว็บ/ลิงก์จริง (route /liclass)
   รูปพื้น = ห้องเรียนแบบญี่ปุ่นจาก Unsplash (ใช้ฟรี) ชุดเดียวกับการ์ดบน Landing — เปลี่ยนเป็นรูปจริงเมื่อได้มา */
const BG = 'https://images.unsplash.com/photo-1617721926586-4eecce739745?w=2000&q=70&auto=format&fit=crop'
const LINE_URL = 'https://line.me/R/ti/p/@nockacademy'

export default function Liclass() {
  useEffect(() => {
    document.title = 'Liclass School — เร็วๆ นี้ | NockAcademy'
  }, [])

  return (
    <div className="min-h-screen bg-surface-1 text-ink">
      <DesktopNav />

      <section className="relative isolate overflow-hidden">
        <img src={BG} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        {/* ม่านสว่างทับรูป — ข้อความอ่านชัด โทนเดียวกับทั้งเว็บ */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-white/85 via-white/75 to-white/95" />

        <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-[760px] flex-col items-center justify-center px-5 py-20 text-center">
          <span className="rounded-pill bg-subject-english px-3.5 py-1 text-[14px] font-bold text-subject-english-ink">日本人向け</span>
          <h1 className="mt-5 text-[40px] font-extrabold leading-tight tracking-tight sm:text-[56px]">Liclass School</h1>
          <p className="mt-2 text-[15px] text-ink-soft sm:text-[17px]">โรงเรียนสำหรับ “คนญี่ปุ่น” ของเรา</p>

          <div className="mt-8 flex items-center gap-3">
            <span className="hidden h-px w-16 bg-ink/15 sm:block" />
            <p className="whitespace-nowrap text-[34px] font-extrabold tracking-tight text-brand sm:text-[44px]">Coming Soon</p>
            <span className="hidden h-px w-16 bg-ink/15 sm:block" />
          </div>
          <p className="mt-2 text-[16px] font-semibold text-ink-soft">เร็วๆ นี้ · 近日公開</p>

          <p className="mt-6 max-w-[520px] text-[15px] leading-relaxed text-ink-soft">
            เรากำลังเตรียมหน้าเว็บของ Liclass School อยู่ ระหว่างนี้สอบถามรายละเอียดกับทีมงานทาง LINE ได้เลย
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="h-12 gap-2 rounded-pill bg-[#06C755] px-6 text-[15px] font-bold text-white hover:bg-[#05b14c]">
              <a href={LINE_URL} target="_blank" rel="noopener noreferrer">
                <LineIcon size={20} /> สอบถามทาง LINE
              </a>
            </Button>
            <Button asChild variant="outline" className="h-12 gap-2 rounded-pill border-line bg-white px-6 text-[15px] font-bold text-ink hover:bg-surface-2">
              <Link to="/landing">
                <ArrowLeft size={18} /> กลับหน้าแรก
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
