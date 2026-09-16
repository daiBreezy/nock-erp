import { useNavigate } from 'react-router-dom'
import {
  Flame, PlayCircle, Monitor, Tablet, Smartphone, Radio, Send, Check, Crown,
  Star, Video, FileText, Target, Users, MapPin, GraduationCap, CalendarClock,
} from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'
import AppShowcase from '../../components/web/AppShowcase'
import MarketingFooter from '../../components/web/MarketingFooter'
import { plusPricing, premiumPlans, perMonth, fmtBaht } from '../../data/packages'
import { subjectMeta } from '../../data/learn'
import type { SubjectKey } from '../../data/mock'
import liveStill from '../../assets/media/Screenshot00006.png'
// Hero visual — ภาพ composition ก้อนเดียว (export จาก Figma Landing Page.png)
import heroVisual from '../../assets/landing/hero-visual.png'

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
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-pill border border-line bg-white px-6 py-3 text-[15px] font-bold text-ink hover:bg-surface-2"
          >
            <PlayCircle size={20} /> ดูตัวอย่างวิดีโอ
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-2 rounded-pill bg-brand px-7 py-3 text-[15px] font-bold text-white hover:bg-brand-dark"
          >
            เริ่มเรียนฟรี
          </button>
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
const testimonials = [
  { q: 'คลิปสั้น เข้าใจง่าย ลูกชอบเรียนเอง ไม่ต้องบังคับเลยค่ะ', name: 'คุณแม่น้องปีใหม่', role: 'ผู้ปกครอง · ม.2' },
  { q: 'จากไม่ชอบเลข ตอนนี้ทำข้อสอบได้เกือบเต็ม ขอบคุณครูดาวมากครับ', name: 'น้องพลอย', role: 'นักเรียน · ม.3' },
  { q: 'ไลฟ์สอนสดถามได้ทันที เหมือนเรียนพิเศษตัวต่อตัวเลย', name: 'น้องเจ', role: 'นักเรียน · ม.5' },
  { q: 'แบบฝึกหัดเยอะ ระบบสอบช่วยให้รู้จุดอ่อนของลูกได้จริง', name: 'คุณพ่อน้องข้าวปั้น', role: 'ผู้ปกครอง · ป.6' },
]
function Testimonials() {
  return (
    <section className="border-t border-line bg-surface-1 py-16">
      <div className="mx-auto max-w-[1200px] px-5">
        <Heading title="ผลตอบรับจากผู้ใช้งานจริง" sub="เสียงจากผู้ปกครองและนักเรียนที่เรียนกับเราจริง" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((t) => (
            <div key={t.name} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-sm">
              <div className="mb-3 flex gap-0.5 text-[#FFB300]">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
              </div>
              <p className="flex-1 text-[14.5px] leading-relaxed text-ink">“{t.q}”</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                  {t.name.slice(-1)}
                </span>
                <div className="leading-tight">
                  <p className="text-[13.5px] font-bold text-ink">{t.name}</p>
                  <p className="text-[12px] text-ink-mute">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- 3. ไลฟ์สด ทุกวัน จันทร์–ศุกร์ ---------- */
const liveChat = [
  { u: 'ครูดาว', m: 'สวัสดีค่ะทุกคน วันนี้ตะลุยโจทย์ TEDET กันนะคะ', teacher: true },
  { u: 'น้องมิ้น', m: 'พร้อมแล้วครับ 🔥' },
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
  const plus = plusPricing()
  const p = (m: number) => premiumPlans.find((x) => x.months === m)!
  const cols = [
    { key: 'plus', name: 'Premium+', badge: 'ยอดนิยม', price: plus.price, note: `เหลือ ${plus.remaining} วัน`, live: true, highlight: true },
    { key: 'p12', name: 'Premium 12 เดือน', price: p(12).price, note: `~฿${fmtBaht(perMonth(p(12)))}/เดือน`, live: false },
    { key: 'p6', name: 'Premium 6 เดือน', price: p(6).price, note: `~฿${fmtBaht(perMonth(p(6)))}/เดือน`, live: false },
    { key: 'p3', name: 'Premium 3 เดือน', price: p(3).price, note: `~฿${fmtBaht(perMonth(p(3)))}/เดือน`, live: false },
  ]
  const rows: { label: string; all?: boolean; plusOnly?: boolean }[] = [
    { label: 'คลิปบทเรียนครบ 4 วิชา', all: true },
    { label: 'แบบฝึกหัด + ระบบสอบ', all: true },
    { label: 'Personalize Goal (AI)', all: true },
    { label: 'ดูไลฟ์ย้อนหลังทั้งหมด', all: true },
    { label: 'ไลฟ์สอนสดทุกวัน', plusOnly: true },
  ]
  const cell = (has: boolean) =>
    has ? <Check size={18} className="mx-auto text-success" /> : <span className="mx-auto block h-px w-3 bg-line" />

  return (
    <section className="border-t border-line bg-surface-1 py-16">
      <div className="mx-auto max-w-[1100px] px-5">
        <Heading
          eyebrow={
            <span className="inline-flex items-center gap-2 rounded-pill bg-brand-soft px-3.5 py-1.5 text-[13px] font-bold text-brand">
              <Users size={15} /> เพื่อนร่วมเรียนกว่า 17,573+ คน
            </span>
          }
          title="Course ของเรา"
          sub="เลือกแพ็กเกจที่ใช่ ครบทุกวิชา ป.4–ม.6 · Premium+ รวมไลฟ์สอนสดทุกวัน"
        />
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            {/* header */}
            <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] gap-3">
              <div />
              {cols.map((c) => (
                <div key={c.key} className={`rounded-t-2xl border-x border-t p-4 text-center ${c.highlight ? 'border-brand bg-brand-soft/40' : 'border-line bg-white'}`}>
                  {c.badge && (
                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-pill bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white">
                      <Crown size={11} /> {c.badge}
                    </span>
                  )}
                  <p className="text-[13.5px] font-bold text-ink">{c.name}</p>
                  <p className="mt-1 text-[22px] font-extrabold text-brand">฿{fmtBaht(c.price)}</p>
                  <p className="text-[11.5px] text-ink-mute">{c.note}</p>
                </div>
              ))}
            </div>
            {/* rows */}
            {rows.map((r, ri) => (
              <div key={r.label} className="grid grid-cols-[1.4fr_repeat(4,1fr)] gap-3">
                <div className={`flex items-center px-1 py-3 text-[13.5px] text-ink ${ri === rows.length - 1 ? '' : 'border-b border-line'}`}>{r.label}</div>
                {cols.map((c) => (
                  <div key={c.key} className={`flex items-center justify-center border-x px-4 py-3 ${c.highlight ? 'border-brand bg-brand-soft/20' : 'border-line bg-white'}`}>
                    {cell(r.all ? true : r.plusOnly ? c.live : false)}
                  </div>
                ))}
              </div>
            ))}
            {/* CTA row */}
            <div className="grid grid-cols-[1.4fr_repeat(4,1fr)] gap-3">
              <div />
              {cols.map((c) => (
                <div key={c.key} className={`rounded-b-2xl border-x border-b p-3 ${c.highlight ? 'border-brand bg-brand-soft/40' : 'border-line bg-white'}`}>
                  <button
                    onClick={() => navigate('/checkout', { state: { name: c.name, price: c.price } })}
                    className={`w-full rounded-pill py-2.5 text-[13px] font-bold ${c.highlight ? 'bg-brand text-white hover:bg-brand-dark' : 'border border-line text-ink hover:bg-surface-2'}`}
                  >
                    เลือก
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-[12.5px] text-ink-mute">
          Premium+ ยิ่งสมัครเร็ว ยิ่งคุ้ม — ราคาลดลงทุกวันจนถึงขั้นต่ำ ฿500 ·{' '}
          <button onClick={() => navigate('/courses')} className="font-semibold text-brand hover:underline">ดูรายละเอียดทั้งหมด</button>
        </p>
      </div>
    </section>
  )
}

/* ---------- 5. ฟีเจอร์ของเรา ---------- */
const features = [
  { icon: Video, title: 'คลิปบทเรียน 2,000+', desc: 'ครบ 4 วิชาหลัก ทุกระดับชั้น ป.4–ม.6 เรียนซ้ำได้ไม่จำกัด' },
  { icon: FileText, title: 'แบบฝึกหัด 4,000+', desc: 'ฝึกจริงหลังเรียนทุกบท พร้อมเฉลยละเอียดทีละขั้น' },
  { icon: GraduationCap, title: 'ระบบการสอบ', desc: 'ห้องสอบเสมือนจริง วัดผลและรู้จุดอ่อนรายวิชา' },
  { icon: Target, title: 'Personalize Goal (AI)', desc: 'AI วิเคราะห์จุดอ่อน วางแผนการเรียนเฉพาะคน' },
  { icon: Radio, title: 'ไลฟ์สอนสดทุกวัน', desc: 'เรียนสดกับครูตัวจริง ถามตอบได้ทันที (Premium+)' },
  { icon: Monitor, title: 'เรียนได้ทุกอุปกรณ์', desc: 'เว็บ มือถือ แท็บเล็ต ข้อมูลซิงก์ต่อเนื่องทุกเครื่อง' },
]
function Features() {
  return (
    <section className="border-t border-line bg-surface-0 py-16">
      <div className="mx-auto max-w-[1200px] px-5">
        <Heading title="ฟีเจอร์ของเรา" sub="ทุกเครื่องมือที่ช่วยให้ลูกคุณเรียนเก่งขึ้นจริง ครบในที่เดียว" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-white p-6 shadow-sm">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand"><f.icon size={24} /></span>
              <h3 className="text-[16px] font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
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
    </div>
  )
}
