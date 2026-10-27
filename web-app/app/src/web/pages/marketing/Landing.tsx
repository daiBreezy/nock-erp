import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Autoplay from 'embla-carousel-autoplay'
import {
  Flame, PlayCircle, Monitor, Tablet, Smartphone, Radio, Send,
  Play, MapPin, CalendarClock,
} from 'lucide-react'
import DesktopNav from '@/web/components/DesktopNav'
import { Button } from '@/components/ui/button'
import HowItWorks, { type Step } from '@/components/ui/how-it-works'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import AppShowcase from '@/web/components/AppShowcase'
import MarketingFooter from '@/web/components/MarketingFooter'
import ContactFab from '@/web/components/ContactFab'
import CoursePlans, { LearnersPill, PaymentMethods } from '@/web/components/CoursePlans'
import { subjectMeta } from '@/data/learn'
import type { SubjectKey } from '@/data/mock'
import liveStill from '@/assets/media/Screenshot00006.png'
// Hero visual — ภาพ composition ก้อนเดียว (export จาก Figma Landing Page.png)
import heroVisual from '@/assets/landing/hero-visual.png'

/* Landing (หน้าแรก) — build ตาม Ref Figma (Landing Page.png)
   ลำดับ: Hero → ผลตอบรับ → Live → Course/ราคา → ฟีเจอร์ → วิชา → คนญี่ปุ่น → App → Footer */

/* ---------- ส่วนหัว section กลาง ---------- */
function Heading({ eyebrow, title, sub }: { eyebrow?: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-9 max-w-[640px] text-center">
      {eyebrow && <div className="mb-2.5 flex justify-center">{eyebrow}</div>}
      <h2 className="text-[26px] font-extrabold tracking-tight text-ink sm:text-[32px]">{title}</h2>
      {sub && <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{sub}</p>}
    </div>
  )
}

/* ---------- 1. HERO ---------- */
function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative overflow-hidden bg-[#FFF1F2]">
      <div className="mx-auto max-w-[880px] px-5 pb-2 pt-12 text-center sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/80 px-3.5 py-1.5 text-[13px] font-bold text-brand shadow-sm">
          <Flame size={15} /> ไลฟ์สอนสด อันดับ 1
        </span>
        <h1 className="mt-5 text-[38px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[56px]">
          NockAcademy
          <br />
          ติว เรียนพิเศษ{' '}
          <span className="relative inline-block">
            <span className="absolute inset-x-[-2px] bottom-[6%] -z-0 h-[46%] -rotate-1 bg-[#FFE234]" />
            <span className="relative z-10">ออนไลน์</span>
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-[540px] text-[15px] leading-relaxed text-ink-soft sm:text-[16px]">
          คลิปบทเรียน 4 วิชาหลัก พร้อมแบบฝึกหัด การสอบ และไลฟ์สอนสด ติดตามผลการเรียนได้จริง
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="h-auto gap-2 rounded-pill border-line bg-white px-6 py-3 text-[15px] font-bold text-ink hover:bg-surface-2"
          >
            <PlayCircle size={20} /> ดูตัวอย่างวิดีโอ
          </Button>
          <Button
            onClick={() => navigate('/auth')}
            className="h-auto gap-2 rounded-pill bg-brand px-7 py-3 text-[15px] font-bold hover:bg-brand-dark"
          >
            เริ่มเรียนฟรี
          </Button>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2.5 text-[13px] text-ink-mute">
          <span className="inline-flex gap-2 text-ink-soft">
            <Monitor size={17} /><Tablet size={17} /><Smartphone size={17} />
          </span>
          เรียนได้ทุกที่ ทุกอุปกรณ์ — เว็บ มือถือ แท็บเล็ต
        </div>
      </div>

      {/* Hero visual — ภาพ composition ก้อนเดียว (static) */}
      <div className="mx-auto max-w-[1240px]">
        <img src={heroVisual} alt="ไลฟ์สอนสด NockAcademy — ครูสอนสด พร้อมคลิปบทเรียน" className="w-full select-none" draggable={false} />
      </div>
    </section>
  )
}

/* ---------- 2. ผลตอบรับจากผู้ใช้งานจริง ---------- */
// โปสเตอร์ "ขอแสดงความยินดี น้องผู้ผ่านการสอบคัดเลือก" 23 ใบ — ดาวน์โหลดจาก Production (nockacademy.com) เก็บไว้ที่ public/testimonials
const REVIEW_POSTERS = Array.from({ length: 23 }, (_, i) => `/testimonials/review-${String(i + 1).padStart(2, '0')}.webp`)
// คลิปสัมภาษณ์ (ตาม Production) — youtu.be/wbHOA5RZeaM
const REVIEW_VIDEO = { id: 'wbHOA5RZeaM', title: 'จากนักเรียนประจำจังหวัด สู่ว่าที่นักเรียน "เตรียมอุดม" เตรียมตัวยังไงให้สอบติด กับน้องพราว' }

/** แสดงรูปปก + ปุ่ม Play ก่อน กดแล้วค่อยโหลด YouTube (หน้า Landing ไม่หนัก) */
function YouTubeLite({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false)
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink shadow-lg">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button onClick={() => setPlay(true)} aria-label={`เล่นวิดีโอ: ${title}`} className="group absolute inset-0">
          <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-lg transition group-hover:scale-110">
            <Play size={26} fill="currentColor" className="ml-1" />
          </span>        </button>
      )}
    </div>
  )
}

function Testimonials() {
  const autoplay = useRef(Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true }))
  return (
    <section className="border-t border-line bg-surface-1 py-16">
      <div className="mx-auto max-w-[1200px] px-5">
        <Carousel opts={{ align: 'start', loop: true }} plugins={[autoplay.current]}>
          {/* หัวข้อชิดซ้าย + ปุ่มเลื่อนขวา (ตาม Production) */}
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[26px] font-extrabold tracking-tight text-ink sm:text-[32px]">ผลตอบรับจากผู้ใช้งานจริง</h2>
              <p className="mt-1.5 text-[15px] text-ink-soft">น้องๆ ที่สอบติดโรงเรียนในฝันกับ NockAcademy</p>
            </div>
            <div className="hidden shrink-0 gap-2 sm:flex">
              <CarouselPrevious className="static size-10 translate-y-0 border-line" />
              <CarouselNext className="static size-10 translate-y-0 border-line" />
            </div>
          </div>
          <CarouselContent>
            {REVIEW_POSTERS.map((src, i) => (
              <CarouselItem key={src} className="basis-[78%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <img
                  src={src}
                  alt={`รีวิวจากผู้เรียน NockAcademy ${i + 1}`}
                  loading="lazy"
                  className="aspect-square w-full rounded-2xl border border-line bg-surface-2 object-cover"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* วิดีโอสัมภาษณ์ + ข้อความ */}
        <div className="mt-12 grid items-center gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
          <YouTubeLite id={REVIEW_VIDEO.id} title={REVIEW_VIDEO.title} />
          <div>
            <h3 className="text-[20px] font-bold text-ink sm:text-[22px]">ทุกความสำเร็จ เริ่มต้นจากความเข้าใจ</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              NockAcademy พร้อมซัพพอร์ตทุกเป้าหมาย ด้วยระบบการเรียนที่ยืดหยุ่น ปรับตามไลฟ์สไตล์ของน้องๆ ได้จริง
              ผ่านคลิปบทเรียน แบบฝึกหัดและคลังข้อสอบเพื่อเน้นย้ำจุดสำคัญ รวมถึงไลฟ์สอนสด ที่สามารถถาม-ตอบแบบใกล้ชิดกับคุณครู
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">เสริมสร้างความรู้ พร้อมก้าวสู่เป้าหมายการเรียนได้อย่างมั่นใจ</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 3. ไลฟ์สด ทุกวัน จันทร์–ศุกร์ ---------- */
const liveChat = [
  { u: 'ครูดาว', m: 'สวัสดีค่ะทุกคน วันนี้ตะลุยโจทย์ TEDET กันนะคะ', teacher: true },
  { u: 'น้องมิ้น', m: 'พร้อมแล้วครับ!' },
  { u: 'น้องบีม', m: 'ข้อ 3 คิดยังไงคะครู' },
  { u: 'ครูดาว', m: 'เดี๋ยวครูอธิบายทีละสเต็ปนะ', teacher: true },
]
const liveSchedule = [
  { d: 'จันทร์', s: 'คณิตศาสตร์ (พื้นฐาน) ป.5–6', t: '19:00–20:30' },
  { d: 'พุธ', s: 'ภาษาอังกฤษ ม.1–3', t: '19:00–20:30' },
  { d: 'ศุกร์', s: 'วิทยาศาสตร์ ม.2', t: '18:30–20:00' },
]
function Live() {
  return (
    <section className="border-t border-line bg-surface-0 py-16">
      <div className="mx-auto max-w-[1200px] px-5">
        <Heading
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-live/10 px-3 py-1 text-[13px] font-bold text-live">
              <Radio size={14} /> LIVE
            </span>
          }
          title="ไลฟ์สด ทุกวัน จันทร์–ศุกร์"
          sub="เรียนสดกับครูตัวจริง ถามตอบได้ทันที พร้อมดูย้อนหลังได้ไม่จำกัด"
        />
        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          {/* player */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-black shadow-sm">
            <img src={liveStill} alt="ไลฟ์สอนสด NockAcademy" className="block w-full opacity-95" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-live px-2.5 py-1 text-[12px] font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
            </span>
            <span className="absolute bottom-4 left-4 rounded-md bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white">
              คณิตศาสตร์ (พื้นฐาน) ป.5 และ ป.6 · ครูดาว
            </span>
            <button className="absolute inset-0 grid place-items-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-brand shadow-lg">
                <PlayCircle size={40} />
              </span>
            </button>
          </div>
          {/* chat */}
          <div className="flex flex-col rounded-2xl border border-line bg-white shadow-sm">
            <div className="border-b border-line px-4 py-3 text-[14px] font-bold text-ink">Live Chat</div>
            <div className="flex-1 space-y-3 p-4">
              {liveChat.map((c, i) => (
                <div key={i} className="flex gap-2.5 text-[13px]">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${c.teacher ? 'bg-brand text-white' : 'bg-surface-2 text-ink-soft'}`}>
                    {c.u.slice(-1)}
                  </span>
                  <div>
                    <span className={`font-bold ${c.teacher ? 'text-brand' : 'text-ink'}`}>{c.u}</span>
                    <p className="text-ink-soft">{c.m}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 border-t border-line p-3">
              <input disabled placeholder="พิมพ์ข้อความ..." className="flex-1 rounded-pill bg-surface-2 px-4 py-2 text-[13px] outline-none placeholder:text-ink-mute" />
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white"><Send size={16} /></span>
            </div>
          </div>
        </div>
        {/* schedule */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {liveSchedule.map((s) => (
            <div key={s.d} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><CalendarClock size={20} /></span>
              <div className="leading-tight">
                <p className="text-[13.5px] font-bold text-ink">{s.d} · {s.t}</p>
                <p className="text-[12.5px] text-ink-soft">{s.s}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- 4. Course / ราคา ---------- */
function Pricing() {
  const navigate = useNavigate()
  return (
    <section className="border-t border-line bg-surface-1 py-16">
      <div className="mx-auto max-w-[1200px] px-5">
        <div className="mx-auto mb-8 max-w-[720px] text-center">
          <h2 className="text-[26px] font-extrabold tracking-tight text-ink sm:text-[32px]">Course ของเรา</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            สามารถใช้งานได้ไม่จำกัดวิชา (คณิตศาสตร์, วิทยาศาสตร์, ภาษาอังกฤษ, ภาษาไทย) ไลฟ์สดทุกวัน (จันทร์-ศุกร์)
            <br className="hidden sm:block" /> มีบทเรียน มากกว่า 2,000+ คลิป 4,000+ แบบฝึกหัด และดูประวัติการไลฟ์ได้ บนทุกอุปกรณ์
          </p>
          <div className="mt-5 flex justify-center"><LearnersPill /></div>
          <div className="mt-4"><PaymentMethods /></div>
        </div>
        <CoursePlans />
        <p className="mt-5 text-center text-[12.5px] text-ink-mute">
          Premium Plus+ คิดราคาตามระยะเวลาที่เหลือ ถึงวันสิ้นสุดคอร์ส ·{' '}
          <Button variant="link" onClick={() => navigate('/courses')} className="h-auto p-0 align-baseline text-[12.5px] font-semibold text-brand">ดูรายละเอียดทั้งหมด</Button>
        </p>
      </div>
    </section>
  )
}

/* ---------- 5. ฟีเจอร์ของเรา ---------- */
// เนื้อหา + ภาพหน้าจอแอปบน iPad ตาม Production (nockacademy.com) — ภาพเก็บไว้ที่ public/features
const features: Step[] = [
  { title: 'ไลฟ์สดทุกวัน', description: 'เรียนสดกับคุณครู ถามได้ทันทีระหว่างเรียน', image: '/features/feature-1.webp', theme: 'pink' },
  { title: '4000+ คลิป', description: 'ทบทวนบทเรียนได้ทุกที่ ทุกเวลา ตามจังหวะของตัวเอง', image: '/features/feature-2.webp', theme: 'blue' },
  { title: 'ห้องสอบ', description: 'เตรียมพร้อมก่อนสอบ พร้อมเฉลยให้เข้าใจ', image: '/features/feature-3.webp', theme: 'purple' },
  { title: 'แบบทดสอบ', description: 'ฝึกทำโจทย์และเช็กความเข้าใจในแต่ละบทเรียน', image: '/features/feature-4.webp', theme: 'amber' },
  { title: 'ห้องเรียนไม่จำกัดวิชา', description: 'ครบทุกวิชาหลัก เลือกเรียนได้ตามต้องการ', image: '/features/feature-5.webp', theme: 'pink' },
].map((f) => ({ ...f, imageAlt: `ภาพ${f.title}` }) as Step)
// การ์ดปิดท้าย — ไม่มีรูป จึงเตี้ยกว่าใบอื่น
features.push({ title: 'และ Feature อื่นๆ อีกมากมาย', theme: 'purple' })
function Features() {
  return (
    <section className="border-t border-line bg-white py-16">
      <div className="mx-auto max-w-[1200px] px-5">
        <Heading title="ฟีเจอร์ของเรา" />
        {/* การ์ดปักหมุดเอียงสลับซ้าย/ขวา + เส้นประเชื่อม (How it works) · รูปหน้าจอ iPad ในการ์ด */}
        <HowItWorks steps={features} />
      </div>
    </section>
  )
}

/* ---------- 6. วิชาเรียนของเรา ---------- */
function Subjects() {
  const navigate = useNavigate()
  const order: SubjectKey[] = ['math', 'science', 'english', 'thai']
  return (
    <section className="border-t border-line bg-surface-1 py-16">
      <div className="mx-auto max-w-[1200px] px-5">
        <Heading title="วิชาเรียนของเรา" sub="ครบ 4 วิชาหลัก แยกตามระดับชั้น เลือกเรียนได้ตามที่ต้องการ" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {order.map((k) => (
            <button
              key={k}
              onClick={() => navigate('/')}
              className={`rounded-2xl p-6 text-left transition-transform hover:-translate-y-0.5 ${subjectMeta[k].tone}`}
            >
              <p className="text-[18px] font-extrabold">{subjectMeta[k].label}</p>
              <p className="mt-1 text-[13px] opacity-80">ป.4 – ม.6</p>
              <span className="mt-6 inline-flex items-center gap-1 text-[13px] font-bold">
                เริ่มเรียน <PlayCircle size={16} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- 7. โรงเรียนสำหรับคนญี่ปุ่น ---------- */
function ForJapanese() {
  return (
    <section className="border-t border-line bg-surface-0 py-16">
      <div className="mx-auto grid max-w-[1100px] items-center gap-8 px-5 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft px-3 py-1 text-[13px] font-bold text-brand">
            日本人向け
          </span>
          <h2 className="mt-3 text-[26px] font-extrabold tracking-tight text-ink sm:text-[30px]">
            โรงเรียนสำหรับ<br />“คนญี่ปุ่น” ของเรา
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            หลักสูตรภาษาไทยและวิชาการสำหรับครอบครัวชาวญี่ปุ่นในไทย เรียนกับสถาบันจริง 2 สาขา
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {['สาขา กรุงเทพฯ', 'สาขา ศรีนครินทร์'].map((b) => (
            <div key={b} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><MapPin size={22} /></span>
              <p className="text-[15px] font-bold text-ink">{b}</p>
              <p className="mt-1 text-[13px] text-ink-soft">เรียนที่สถาบัน · สอบถามรอบเรียน</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-1 text-ink">
      <DesktopNav />
      <Hero />
      <Testimonials />
      <Live />
      <Pricing />
      <Features />
      <Subjects />
      <ForJapanese />
      <AppShowcase />
      <MarketingFooter />
      <ContactFab />
    </div>
  )
}
