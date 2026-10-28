import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Autoplay from 'embla-carousel-autoplay'
import {
  Flame, PlayCircle, Monitor, Tablet, Smartphone, Radio, Send,
  Play, ArrowRight, FileText, Download, Bell,
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
import { branches } from '@/data/school'
import type { SubjectKey } from '@/data/mock'
import liveStill from '@/assets/media/Screenshot00006.png'
import { thumb } from '@/data/media'
// Hero visual — ภาพ composition ก้อนเดียว (export จาก Figma Landing Page.png)
import heroVisual from '@/assets/landing/hero-visual.png'

/* Landing (หน้าแรก) — build ตาม Ref Figma (Landing Page.png)
   ลำดับ: Hero → ผลตอบรับ → Live → Course/ราคา → ฟีเจอร์ → วิชา → โรงเรียน (Liclass | NockAcademy) → App → Footer */

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
                  className="aspect-square w-full rounded-card border border-line bg-surface-2 object-cover"
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

/* ---------- 3. ไลฟ์สด ทุกวัน จันทร์–ศุกร์ — Hook หลักของ Landing ----------
   แผงเข้ม (แยกจาก section ขาวรอบข้าง) · ซ้าย = วิดีโอ + (ไลฟ์สดวันนี้ | เอกสาร) · ขวา = แชทสดแบบสะอาด (ไม่มีเส้นคั่น) */
const liveChat = [
  { u: 'ครูดาว', m: 'สวัสดีค่ะทุกคน วันนี้ตะลุยโจทย์ TEDET กันนะคะ', teacher: true },
  { u: 'น้องมิ้น', m: 'พร้อมแล้วครับ!' },
  { u: 'น้องบีม', m: 'ข้อ 3 คิดยังไงคะครู' },
  { u: 'ครูดาว', m: 'เดี๋ยวครูอธิบายทีละสเต็ปนะ เริ่มจากหา ห.ร.ม. ก่อนเลย', teacher: true },
  { u: 'น้องต้นกล้า', m: 'เข้าใจแล้วครับ ขอบคุณครับ' },
]
// ตาม Figma (Landing Page.png): รูปปก · Live Now! / เวลา · ชื่อคลาส · ครู • ชั้น · ปุ่มกระดิ่งแจ้งเตือน
const liveToday = [
  { t: '17:00–17:50', s: 'คณิตศาสตร์ (พื้นฐาน)', grade: 'ป.5–6', teacher: 'ครูดาว', now: true },
  { t: '19:00–19:50', s: 'ภาษาอังกฤษ', grade: 'ม.1–3', teacher: 'Teacher Amy' },
  { t: '20:00–20:50', s: 'วิทยาศาสตร์', grade: 'ม.2', teacher: 'ครูนนท์' },
]
const liveDocs = [
  { subject: 'คณิตศาสตร์', name: 'ห.ร.ม. และ ค.ร.น. (เอกสาร)' },
  { subject: 'คณิตศาสตร์', name: 'ห.ร.ม. และ ค.ร.น. (สไลด์)' },
  { subject: 'คณิตศาสตร์', name: 'แบบฝึกหัด TEDET ชุดที่ 3' },
]

function Live() {
  const navigate = useNavigate()
  const box = 'rounded-card bg-white p-5'
  return (
    <section className="live-flow relative overflow-hidden py-16 text-white">
      {/* แสงสีจางๆ ลอยช้าๆ ให้รู้สึก "กำลังออนแอร์" (index.css: live-flow / live-drift) */}
      <div aria-hidden className="live-drift pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-live/25 blur-[120px]" />
      <div aria-hidden className="live-drift pointer-events-none absolute -bottom-48 -right-32 size-[480px] rounded-full bg-premium/20 blur-[120px] [animation-delay:-8s]" />
      <div className="relative mx-auto max-w-[1200px] px-5">
        {/* หัวข้อ: ป้าย Live + ข้อความ (ซ้าย) · ปุ่มเข้าดู (ขวา) — ไม่มีคำโปรย */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex flex-wrap items-center gap-3 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
            <span className="inline-flex items-center gap-2 rounded-pill bg-live px-3.5 py-1 text-[15px] font-bold tracking-normal sm:text-[17px]">
              <span className="size-2.5 animate-pulse rounded-full bg-white" /> Live
            </span>
            ไลฟ์สด ทุกวัน จันทร์–ศุกร์
          </h2>
          <Button onClick={() => navigate('/live/next')} className="h-12 gap-2 rounded-pill bg-live px-6 text-[15px] font-bold text-white hover:bg-live/90">
            <Radio size={18} /> เข้าดูไลฟ์ตอนนี้
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          {/* ซ้าย: วิดีโอ + (ไลฟ์สดวันนี้ | เอกสาร) */}
          <div className="flex min-w-0 flex-col gap-4">
            <button onClick={() => navigate('/live/next')} className="group relative block overflow-hidden rounded-card bg-black text-left">
              <img src={liveStill} alt="ไลฟ์สอนสด NockAcademy" className="block aspect-video w-full object-cover opacity-95 transition group-hover:opacity-100" />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-live px-2.5 py-1 text-[12px] font-bold">
                <span className="size-2 animate-pulse rounded-full bg-white" /> LIVE
              </span>
              <span className="absolute bottom-4 left-4 rounded-md bg-black/60 px-2.5 py-1 text-[12px] font-medium">คณิตศาสตร์ (พื้นฐาน) ป.5 และ ป.6 · ครูดาว</span>
              <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand shadow-lg transition group-hover:scale-110">
                <Play size={28} fill="currentColor" className="ml-1" />
              </span>
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={box}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-bold text-ink">ไลฟ์สดวันนี้</p>
                  <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-ink-soft">{liveToday.length} Live</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {liveToday.map((l, i) => (
                    <li key={l.t} className={`flex items-center gap-3 rounded-xl p-2 ${l.now ? 'bg-brand-soft' : ''}`}>
                      <img src={thumb(`live-today-${i}`)} alt="" className="aspect-[16/10] w-24 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className={`text-[12px] font-semibold ${l.now ? 'text-live' : 'text-ink-mute'}`}>{l.now ? 'Live Now!' : l.t}</p>
                        <p className="mt-0.5 truncate text-[13.5px] font-bold text-ink">{l.s}</p>
                        <p className="mt-0.5 text-[12px] text-ink-soft">{l.teacher} • {l.grade}</p>
                      </div>
                      <span aria-label="แจ้งเตือน" className="grid size-9 shrink-0 place-items-center rounded-full bg-premium/15 text-premium"><Bell size={16} /></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={box}>
                <p className="text-[15px] font-bold text-ink">เอกสารประกอบการเรียน</p>
                <ul className="mt-3 space-y-1">
                  {liveDocs.map((d) => (
                    <li key={d.name} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><FileText size={17} /></span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[12px] text-ink-mute">{d.subject}</p>
                        <p className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">{d.name}</p>
                      </div>
                      <Download size={16} className="shrink-0 text-ink-mute" />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ขวา: แชทสด — สะอาดแบบแอปแชท AI: ไม่มีเส้นคั่นหัว/ช่องพิมพ์ · สูงเท่าฝั่งซ้าย (จอใหญ่) */}
          <div className="flex h-[440px] flex-col rounded-card bg-white text-ink lg:h-auto">
            <div className="flex items-center gap-2 px-5 pb-2 pt-5">
              <span className="size-2 animate-pulse rounded-full bg-live" />
              <p className="text-[15px] font-bold">แชทสด</p>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3">
              {liveChat.map((c, i) => (
                <div key={i} className="text-[14px] leading-relaxed">
                  <p className={`text-[12px] font-semibold ${c.teacher ? 'text-brand' : 'text-ink-mute'}`}>
                    {c.u}{c.teacher && <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-px text-[10.5px] font-bold text-brand">ครู</span>}
                  </p>
                  <p className="mt-0.5 text-ink">{c.m}</p>
                </div>
              ))}
            </div>
            <div className="p-4 pt-2">
              <div className="flex items-center gap-2 rounded-[22px] bg-surface-2 py-2 pl-4 pr-2">
                <input disabled placeholder="ถามครูได้เลย..." className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-mute" />
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white"><Send size={16} /></span>
              </div>
            </div>
          </div>
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
              className={`rounded-card p-6 text-left transition-transform hover:-translate-y-0.5 ${subjectMeta[k].tone}`}
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

/* ---------- 7. โรงเรียนของเรา — ซ้าย Liclass School (คนญี่ปุ่น) | ขวา NockAcademy School (→ หน้าโรงเรียน) ---------- */
// ลิงก์ Liclass School — เจ้าของจะส่งให้ทีหลัง (ว่าง = ปุ่มแสดง "เร็วๆ นี้" กดไม่ได้)
const LICLASS_URL = ''

function Schools() {
  const navigate = useNavigate()
  const cards = [
    {
      eyebrow: '日本人向け',
      name: 'Liclass School',
      desc: 'โรงเรียนสำหรับ “คนญี่ปุ่น” ของเรา',
      cta: LICLASS_URL ? 'ดูรายละเอียด' : 'เร็วๆ นี้',
      onClick: LICLASS_URL ? () => window.open(LICLASS_URL, '_blank', 'noopener') : undefined,
      tone: 'bg-subject-english text-subject-english-ink',
      // ห้องเรียนแบบญี่ปุ่น (Unsplash, ใช้ฟรี) — เปลี่ยนเป็นรูปจริงของ Liclass เมื่อได้มา
      image: 'https://images.unsplash.com/photo-1617721926586-4eecce739745?w=900&q=70&auto=format&fit=crop',
    },
    {
      eyebrow: 'สถาบันกวดวิชา',
      name: 'NockAcademy School',
      desc: `เรียนพิเศษที่สถาบัน ${branches.length} สาขา กรุงเทพฯ และชลบุรี`,
      cta: 'ดูสาขาทั้งหมด',
      onClick: () => navigate('/school'),
      tone: 'bg-brand-soft text-brand',
      image: '/school/paradise-park-1.jpg', // รูปสาขาจริง
    },
  ]
  return (
    // พื้นขาว ไม่มีเส้นคั่น ระยะบนล่างน้อย
    <section className="bg-white py-8">
      <div className="mx-auto grid max-w-[1200px] gap-4 px-5 md:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.name}
            onClick={c.onClick}
            disabled={!c.onClick}
            className="group relative flex flex-col items-start overflow-hidden rounded-card border border-line bg-white p-6 text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-default sm:p-8"
          >
            {/* รูปพื้นหลังชิดขวา จางเข้าสีขาวทางซ้าย ให้ข้อความอ่านชัด */}
            <img
              src={c.image}
              alt=""
              loading="lazy"
              className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/4 object-cover transition-transform duration-500 [mask-image:linear-gradient(to_right,transparent,black_100%)] group-enabled:group-hover:scale-105"
            />
            <span className={`relative rounded-pill px-3 py-1 text-[13px] font-bold ${c.tone}`}>{c.eyebrow}</span>
            <h2 className="relative mt-4 text-[26px] font-extrabold tracking-tight text-ink sm:text-[30px]">{c.name}</h2>
            <p className="relative mt-2 max-w-[50%] text-[15px] leading-relaxed text-ink-soft">{c.desc}</p>
            <span className={`relative mt-6 inline-flex items-center gap-1.5 text-[14px] font-bold ${c.onClick ? 'text-brand' : 'text-ink-mute'}`}>
              {c.cta} {c.onClick && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
            </span>
          </button>
        ))}
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
      <Schools />
      <AppShowcase />
      <MarketingFooter />
      <ContactFab />
    </div>
  )
}
