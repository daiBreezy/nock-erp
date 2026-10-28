import { useEffect, useRef, useState } from 'react'
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

/* ภาพ Hero แยกชิ้น (public/landing-hero) วางทับกันตามรูปรวม Figma "Full Hero.png" (4714×1908)
   left/top/width = % ของรูปรวม (หาโดยเทียบแต่ละชิ้นกับรูปรวมอัตโนมัติ · เมฆแยกก้อนจากไฟล์เมฆรวม)
   เรียงหลัง → หน้า
   float = ระยะลอยขึ้นลง (px) · dur = วินาทีต่อรอบ (ยิ่งมากยิ่งช้า) · delay = ให้แต่ละชิ้นลอยไม่พร้อมกัน
   rise = ความเร็วเลื่อนขึ้นตอน scroll (Parallax) เทียบกับหน้า — 0 = นิ่งกับ Tablet · ยิ่งมากยิ่งขึ้นเร็ว */
type HeroLayer = { src: string; left: number; top: number; width: number; float?: number; dur?: number; delay?: number; rise?: number }
const HERO_LAYERS: HeroLayer[] = [
  // เมฆอยู่หลังสุด (ตาม Figma วิดีโอซ้อนอยู่หน้าเมฆ)
  { src: 'cloud-1', left: 0.74, top: 32.97, width: 17.39, float: 10, dur: 19, delay: -11, rise: 0.5 },
  { src: 'cloud-4', left: 69.28, top: 32.49, width: 28.91, float: 12, dur: 21, delay: -6, rise: 0.42 },
  { src: 'cloud-2', left: 9.06, top: 2.57, width: 5.09, float: 6, dur: 16, delay: -4, rise: 0.45 },
  { src: 'cloud-3', left: 22.93, top: 7.18, width: 9.59, float: 8, dur: 18, delay: -9, rise: 0.3 },
  { src: 'cloud-5', left: 70.2, top: 7.18, width: 9.59, float: 8, dur: 17, delay: -2, rise: 0.38 },
  { src: 'tablet-screen', left: 25.63, top: 0, width: 42.02 },
  { src: 'float-video-left-top', left: 18.6, top: 12.26, width: 11.79, float: 10, dur: 11, delay: -1, rise: 0.22 },
  { src: 'float-video-left-center', left: 15.23, top: 29.35, width: 9.42, float: 12, dur: 13, delay: -6, rise: 0.34 },
  { src: 'float-video-left-bottom', left: 21.13, top: 55.35, width: 9.91, float: 10, dur: 12, delay: -9, rise: 0.16 },
  { src: 'chat', left: 58.97, top: 12.58, width: 10.33, float: 8, dur: 14, delay: -3, rise: 0.25 },
  { src: 'float-video-right-center', left: 68.52, top: 31.34, width: 9.93, float: 12, dur: 11.5, delay: -7, rise: 0.28 },
  { src: 'float-video-right-bottom', left: 63.22, top: 55.35, width: 12.35, float: 10, dur: 13, delay: -2.5, rise: 0.19 },
  { src: 'krudao-shadow', left: 44.44, top: 7.39, width: 22.19 },
  { src: 'krudao', left: 45.44, top: 9.22, width: 20.2 },
  { src: 'live-quiz', left: 22.44, top: 28.51, width: 16.97, float: 8, dur: 15, delay: -5, rise: 0.13 },
]

/** Parallax — ใช้ CSS scroll-driven animation (.hero-rise ใน index.css) วิ่งพร้อมการ scroll ของเบราว์เซอร์ ไม่หน่วง
 *  hook นี้แค่ตั้ง --hero-k (ภาพเล็ก/มือถือ ขยับน้อยตามสัดส่วน) ตอนเปลี่ยนขนาดจอ
 *  เบราว์เซอร์ที่ยังไม่รองรับ → fallback: เขียน scroll ลง --hero-scroll ทุกเฟรม */
function useHeroParallax() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const setK = () => el.style.setProperty('--hero-k', String(Math.min(1, el.offsetWidth / 2400)))
    setK()
    const ro = new ResizeObserver(setK)
    ro.observe(el)
    if (CSS.supports('animation-timeline: scroll()')) return () => ro.disconnect()
    let raf = 0
    const update = () => {
      raf = 0
      el.style.setProperty('--hero-scroll', String(Math.min(window.scrollY, 1400)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
  return ref
}

function Hero() {
  const stage = useHeroParallax()
  return (
    // พื้นท้องฟ้ายามเช้า (index.css: hero-sky) + แสงแดดอุ่นฟุ้งหลังแท็บเล็ต — นิ่ง ไม่วาดใหม่ตอน scroll
    <section className="hero-sky relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] size-[min(1100px,120vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,206,160,0.55)_0%,rgba(255,226,214,0.35)_35%,transparent_65%)]" />
      <div className="relative z-10 mx-auto max-w-[880px] px-5 pb-2 pt-12 text-center sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/80 px-3.5 py-1.5 text-[13px] font-bold text-brand shadow-sm">
          <Flame size={15} /> ไลฟ์สอนสด อันดับ 1
        </span>
        {/* isolate = ชั้นซ้อนแยกของหัวข้อ → แถบเหลือง -z-10 อยู่หลังตัวอักษรทุกตัวในหัวข้อ (ไม่บัง "NockAcademy" บรรทัดบน) */}
        <h1 className="isolate mt-5 text-[38px] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[56px]">
          NockAcademy
          <br />
          ติว เรียนพิเศษ{' '}
          <span className="relative inline-block">
            <span className="absolute inset-x-[-2px] bottom-[6%] -z-10 h-[104%] -rotate-1 bg-[#FFE234]" />
            ออนไลน์
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-[540px] text-[15px] leading-relaxed text-ink-soft sm:text-[16px]">
          คลิปบทเรียน 4 วิชาหลัก พร้อมแบบฝึกหัด การสอบ และไลฟ์สอนสด ติดตามผลการเรียนได้จริง
        </p>
        <div className="mt-5 flex items-center justify-center gap-2.5 text-[13px] text-ink-mute">
          <span className="inline-flex gap-2 text-ink-soft">
            <Monitor size={17} /><Tablet size={17} /><Smartphone size={17} />
          </span>
          เรียนได้ทุกที่ ทุกอุปกรณ์ — เว็บ มือถือ แท็บเล็ต
        </div>
      </div>

      {/* Hero visual — แยกชิ้น ลอยแยกกัน · กล่องสัดส่วนเท่ารูปรวม (ขนาด/ตำแหน่งกล่องเหมือนรูปเดิม) */}
      <div className="mx-auto max-w-[1920px] overflow-x-clip">
        <div
          ref={stage}
          role="img"
          aria-label="ไลฟ์สอนสด NockAcademy — ครูสอนสด พร้อมคลิปบทเรียน"
          // -mb = ตัดพื้นใสใต้รูป (รูปรวมว่างล่าง ~16% ของความสูง) → ระยะห่างล่างของ Hero
          // translateY = ทั้งภาพเลื่อนขึ้นช้ากว่าหน้า → ขอบล่างของ Hero (overflow-hidden) ค่อยๆ วิ่งขึ้นมาบังรูป
          className="hero-rise relative -mb-[8%] -ml-[20%] aspect-[4714/1908] w-[140%] max-w-none select-none will-change-transform sm:-mb-[8.5%] sm:-ml-[25%] sm:w-[160%]"
          // --rise ติดลบ = ทั้งภาพเลื่อนลงสวนทาง → ขึ้นช้ากว่าหน้า (0.16 = ช้ากว่าหน้า 16%)
          style={{ '--rise': -0.16 } as React.CSSProperties}
        >
          {HERO_LAYERS.map((l) => (
            // กล่องนอก = ตำแหน่ง + Parallax ตอน scroll · รูปใน = ลอยขึ้นลง (แยก transform กัน)
            <div
              key={l.src}
              className={`absolute ${l.rise ? 'hero-rise will-change-transform' : ''}`}
              style={{
                left: `${l.left}%`,
                top: `${l.top}%`,
                width: `${l.width}%`,
                ...(l.rise && ({ '--rise': l.rise } as React.CSSProperties)),
              }}
            >
              <img
                src={`/landing-hero/${l.src}.webp`}
                alt=""
                draggable={false}
                className={`block h-auto w-full max-w-none ${l.float ? 'hero-float' : ''}`}
                style={l.float ? ({ '--float': `-${l.float}px`, '--dur': `${l.dur}s`, '--delay': `${l.delay ?? 0}s` } as React.CSSProperties) : undefined}
              />
            </div>
          ))}
        </div>
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
    <section className="bg-surface-1 py-16">
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

// คลิปไลฟ์ตัวอย่างบน Production (Landing › Live) — ลิงก์ upload ของ API ไม่เปลี่ยนตาม build
const LIVE_VIDEO = 'https://api.nockacademy.com/upload/schedule/file1789727990.mp4'

/** แชทสด — สะอาดแบบแอปแชท AI (ไม่มีเส้นคั่น) · พิมพ์ + Enter / ปุ่มส่ง → ข้อความขึ้นฝั่งขวา · เลื่อนลงล่างสุดอัตโนมัติ */
function LiveChat() {
  const [msgs, setMsgs] = useState<{ u?: string; m: string; teacher?: boolean; me?: boolean }[]>(liveChat)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs.length])
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const m = text.trim()
    if (!m) return
    setMsgs((x) => [...x, { m, me: true }])
    setText('')
  }
  return (
    <div className="flex h-[440px] flex-col rounded-card bg-white text-ink shadow-[0_8px_30px_rgba(226,75,74,0.08)] lg:h-auto">
      <div className="flex items-center gap-2 px-5 pb-2 pt-5">
        <span className="size-2 animate-pulse rounded-full bg-live" />
        <p className="text-[15px] font-bold">แชทสด</p>
      </div>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-3">
        {msgs.map((c, i) =>
          c.me ? (
            <p key={i} className="max-w-[85%] self-end break-words rounded-2xl rounded-br-md bg-surface-2 px-3.5 py-2 text-[14px] leading-relaxed">{c.m}</p>
          ) : (
            <div key={i} className="text-[14px] leading-relaxed">
              <p className={`text-[12px] font-semibold ${c.teacher ? 'text-brand' : 'text-ink-mute'}`}>
                {c.u}{c.teacher && <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-px text-[10.5px] font-bold text-brand">ครู</span>}
              </p>
              <p className="mt-0.5 text-ink">{c.m}</p>
            </div>
          ),
        )}
      </div>
      <form onSubmit={send} className="p-4 pt-2">
        <div className="flex items-center gap-2 rounded-[22px] bg-surface-2 py-2 pl-4 pr-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ถามครูได้เลย..."
            aria-label="พิมพ์ข้อความ"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-mute"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="ส่งข้อความ"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white transition disabled:bg-ink-mute/30"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}

function Live() {
  const navigate = useNavigate()
  const box = 'rounded-card bg-white p-5 shadow-[0_8px_30px_rgba(226,75,74,0.08)]'
  return (
    <section className="live-bg relative overflow-hidden py-16 text-ink">
      {/* พื้นไล่สีสว่าง (นิ่ง) + แสงฟุ้งลอยช้าๆ ด้วย transform — ให้รู้สึก "กำลังออนแอร์" แต่ไม่ต้องวาดพื้นใหม่ทุกเฟรม (index.css: live-bg / live-drift) */}
      <div aria-hidden className="live-drift pointer-events-none absolute -left-32 -top-40 size-[520px] rounded-full bg-live/20 blur-[110px]" />
      <div aria-hidden className="live-drift pointer-events-none absolute -bottom-48 -right-24 size-[480px] rounded-full bg-[#FF9F68]/25 blur-[110px] [animation-delay:-8s]" />
      <div aria-hidden className="live-drift pointer-events-none absolute left-1/3 top-1/3 size-[380px] rounded-full bg-premium/15 blur-[110px] [animation-delay:-4s] [animation-duration:22s]" />
      <div className="relative mx-auto max-w-[1200px] px-5">
        {/* หัวข้อ: ป้าย Live + ข้อความ (ซ้าย) · ปุ่มเข้าดู (ขวา) — ไม่มีคำโปรย */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex flex-wrap items-center gap-3 text-[30px] font-extrabold leading-tight tracking-tight sm:text-[40px]">
            <span className="inline-flex items-center gap-2 rounded-pill bg-live px-3.5 py-1 text-[15px] font-bold tracking-normal text-white sm:text-[17px]">
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
            <button onClick={() => navigate('/live/next')} className="group relative block overflow-hidden rounded-card bg-black text-left shadow-[0_12px_40px_rgba(226,75,74,0.18)]">
              {/* คลิปวนสั้นๆ จาก Production (11 วิ · ~10 MB) — ระหว่างโหลดแสดงภาพนิ่ง */}
              <video
                src={LIVE_VIDEO}
                poster={liveStill}
                autoPlay
                muted
                loop
                playsInline
                aria-label="ไลฟ์สอนสด NockAcademy"
                className="block aspect-video w-full object-cover"
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-live px-2.5 py-1 text-[12px] font-bold text-white">
                <span className="size-2 animate-pulse rounded-full bg-white" /> LIVE
              </span>
              <span className="absolute bottom-4 left-4 rounded-md bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white">คณิตศาสตร์ (พื้นฐาน) ป.5 และ ป.6 · ครูดาว</span>
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={box}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-bold text-ink">ไลฟ์สดวันนี้</p>
                  <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-ink-soft">{liveToday.length} Live</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {liveToday.map((l, i) => (
                    <li key={l.t} className={`flex cursor-default items-center gap-3 rounded-xl p-2 transition-colors ${l.now ? 'bg-brand-soft hover:bg-brand-soft/70' : 'hover:bg-surface-2'}`}>
                      <img src={thumb(`live-today-${i}`)} alt="" className="aspect-[16/10] w-24 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className={`text-[12px] font-semibold ${l.now ? 'text-live' : 'text-ink-mute'}`}>{l.now ? 'Live Now!' : l.t}</p>
                        <p className="mt-0.5 truncate text-[13.5px] font-bold text-ink">{l.s}</p>
                        <p className="mt-0.5 text-[12px] text-ink-soft">{l.teacher} • {l.grade}</p>
                      </div>
                      <Bell size={17} aria-label="แจ้งเตือน" className="mr-1 shrink-0 text-ink-mute" />
                    </li>
                  ))}
                </ul>
              </div>
              <div className={box}>
                <p className="text-[15px] font-bold text-ink">เอกสารประกอบการเรียน</p>
                <ul className="mt-3 space-y-1">
                  {liveDocs.map((d) => (
                    <li key={d.name} className="flex cursor-default items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
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

          {/* ขวา: แชทสด — พิมพ์แล้วส่งได้จริง (Gimmick แบบ Production: ข้อความเราขึ้นฝั่งขวา ไม่ส่งไปไหน) */}
          <LiveChat />
        </div>
      </div>
    </section>
  )
}

/* ---------- 4. Course / ราคา ---------- */
function Pricing() {
  const navigate = useNavigate()
  return (
    <section className="bg-surface-1 py-16">
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
    <section className="bg-white py-16">
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
    <section className="bg-surface-1 py-16">
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
