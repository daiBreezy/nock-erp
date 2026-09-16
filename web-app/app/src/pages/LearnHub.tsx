import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, Play, Search, Radio, Crown, Flag,
  ListChecks, MessageSquare, Bell, Eye, Volume2, Maximize, ArrowRight, CalendarDays, Check, ChevronDown,
} from 'lucide-react'
import DesktopNav from '../components/web/DesktopNav'
import BottomNav from '../components/BottomNav'
import TopBar from '../components/TopBar'
import Banner from '../components/home/Banner'
import SystemUpdate from '../components/home/SystemUpdate'
import LiveNext from '../components/home/LiveNext'
import ScheduleStrip from '../components/home/ScheduleStrip'
import GoalEntry from '../components/home/GoalEntry'
import SubjectGrid from '../components/home/SubjectGrid'
import ExamStrip from '../components/home/ExamStrip'
import HomeworkCard from '../components/home/HomeworkCard'
import type { SubjectKey } from '../data/mock'
import { clipGroups, subjectMeta } from '../data/learn'
import { subjectBg, subjectText } from '../lib/subject'
import { bannerImg, thumb } from '../data/media'
import Thumbnail from '../components/web/Thumbnail'

// stroke สำหรับ Ring — เขียน class เต็มให้ Tailwind เห็น
const subjectStroke: Record<SubjectKey, string> = {
  english: 'stroke-subject-english-ink',
  thai: 'stroke-subject-thai-ink',
  math: 'stroke-subject-math-ink',
  science: 'stroke-subject-science-ink',
}

/* ---------- data helpers ---------- */

type Card = {
  id: string
  subject: SubjectKey
  title: string
  grade: string
  duration: string
  free: boolean
  watched: boolean
  isNew: boolean
  comments: number
}

function cardsFor(subject: SubjectKey): Card[] {
  const out: Card[] = []
  clipGroups[subject].forEach((g) =>
    g.videos.forEach((v, i) =>
      out.push({
        id: `${subject}/${v.id}`,
        subject,
        title: 'ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น.',
        grade: g.grade,
        duration: '1:40:58',
        free: v.free,
        watched: v.watched,
        isNew: i === 0,
        comments: 4,
      }),
    ),
  )
  return out
}

// เติมการ์ดให้ครบ n ใบ (ทำ 2 แถวเหมือน Figma)
function padTo(cards: Card[], n: number): Card[] {
  const out = [...cards]
  let i = 0
  while (out.length < n) {
    out.push({ ...cards[i % cards.length], id: `${cards[i % cards.length].id}-x${out.length}` })
    i++
  }
  return out.slice(0, n)
}

const allCards = (['math', 'english', 'thai', 'science'] as SubjectKey[]).flatMap(cardsFor)

/* ---------- atoms ---------- */

function Ring({ pct, tone }: { pct: number; tone: string }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-white/50" />
      <circle
        cx="20" cy="20" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={tone}
      />
    </svg>
  )
}

function TierCrown({ free }: { free: boolean }) {
  return <Crown size={14} className={free ? 'text-success' : 'text-math-ink'} fill={free ? '#1D9E75' : '#D9A441'} />
}

function Tag({ children, subject }: { children: React.ReactNode; subject?: SubjectKey }) {
  return (
    <span
      className={`rounded-pill px-2 py-0.5 text-[10px] font-medium ${
        subject ? `${subjectBg[subject]} ${subjectText[subject]}` : 'bg-surface-2 text-ink-soft'
      }`}
    >
      {children}
    </span>
  )
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft hover:border-brand hover:text-brand">
      {children}
    </button>
  )
}

/** การ์ดวิดีโอมาตรฐาน (thumbnail + meta row + title + chips) ตรงตาม Figma */
function VideoCard({ card, onClick, variant = 'lesson' }: { card: Card; onClick: () => void; variant?: 'live' | 'lesson' }) {
  return (
    <button onClick={onClick} className="group w-full text-left">
      <Thumbnail src={thumb(card.id)} variant={variant}>
        {card.isNew && (
          <span className="absolute right-2 top-2 z-10 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">New</span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85">
            <Play size={18} className="ml-0.5 text-brand" fill="currentColor" />
          </span>
        </div>
      </Thumbnail>
      {/* meta row */}
      <div className="mt-2 flex items-center gap-2.5 text-ink-mute">
        <TierCrown free={card.free} />
        <span className="flex items-center gap-1 text-[11px]"><MessageSquare size={12} /> {card.comments}</span>
        <span className="ml-auto text-[11px]">{card.duration}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-ink group-hover:text-brand">
        {card.title}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Tag subject={card.subject}>{subjectMeta[card.subject].label}</Tag>
        <Tag>ป.5</Tag>
        <Tag>ป.6</Tag>
      </div>
    </button>
  )
}

/** แถว rail มาตรฐาน — 5 ใบ/แถว (grid ยืดหยุ่นตามจอ) */
function Rail({
  title, subtitle, cards, onMore, rows = 1, variant = 'lesson',
}: {
  title: string; subtitle?: string; cards: Card[]; onMore?: () => void; rows?: number; variant?: 'live' | 'lesson'
}) {
  const navigate = useNavigate()
  return (
    <section className="mt-9">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
        </div>
        <button onClick={onMore} className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          ดูทั้งหมด <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {cards.slice(0, rows * 5).map((c) => (
          <VideoCard key={c.id} card={c} variant={variant} onClick={() => navigate(`/learn/${c.id.split('-x')[0]}`)} />
        ))}
      </div>
    </section>
  )
}

/* ---------- desktop hub ---------- */

function DesktopHub() {
  const navigate = useNavigate()

  const schedule = [
    { subject: 'math' as SubjectKey, day: 'วันนี้', time: '19:00-19:50', waiting: 12, live: true },
    { subject: 'science' as SubjectKey, day: 'วันนี้', time: '19:00-19:50', waiting: 4, live: true, reminded: true },
    { subject: 'english' as SubjectKey, day: 'วันนี้', time: '20:00-21:30', waiting: 8 },
    { subject: 'math' as SubjectKey, day: 'วันนี้', time: '20:00-20:50', waiting: 24 },
    { subject: 'science' as SubjectKey, day: 'พรุ่งนี้', time: '19:00-19:50', waiting: 156 },
  ]

  const goals = [
    { title: 'เตรียมสอบเข้าจุฬาภรณ', tags: ['สอบเข้า', 'คณิตศาสตร์'], pct: 36, subject: 'science' as SubjectKey },
    { title: 'เพิ่มเกรดคณิตศาสตร์', tags: ['เพิ่มเกรด', 'คณิตศาสตร์'], pct: 84, subject: 'english' as SubjectKey },
    { title: 'เพิ่มเกรดภาษาอังกฤษ', tags: ['สอบเข้า', 'ภาษาอังกฤษ'], pct: 16, subject: 'math' as SubjectKey },
    { title: 'เพิ่มเกรดชีววิทยา', tags: ['สอบเข้า', 'ชีววิทยา'], pct: 0, subject: 'thai' as SubjectKey },
  ]

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-16">
      {/* 2 · Promo banner (รูปจริง) */}
      <div className="mt-6 overflow-hidden rounded-card">
        <img src={bannerImg} alt="สอบปลายภาค ป.6 เทอม 1" className="w-full object-cover" />
      </div>

      {/* 3 · Live ตอนนี้ — วิดีโอคมชัด (player) ซ้าย + รายละเอียดขวา */}
      <section className="mt-8 grid gap-8 md:grid-cols-[1.15fr_1fr] md:items-center">
        <button onClick={() => navigate('/live/next')} className="relative flex aspect-video items-center justify-center overflow-hidden rounded-card bg-ink">
          <img src={thumb('live-hero')} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-3 top-3 z-10 flex items-center gap-2 text-white">
            <span className="flex items-center gap-1 rounded-pill bg-live px-2 py-1 text-[11px] font-semibold"><Radio size={11} /> Live</span>
            <span className="flex items-center gap-1 rounded-pill bg-black/40 px-2 py-1 text-[11px] font-medium"><Eye size={11} /> 18.2K</span>
          </span>
          <span className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-white">
            <span className="flex items-center gap-2 text-sm"><Play size={16} /> 14:06:14</span>
            <span className="flex items-center gap-3"><Volume2 size={18} /><Maximize size={18} /></span>
          </span>
        </button>
        <div className="flex flex-col justify-center">
          <button className="mb-3 flex w-fit items-center gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-xs font-medium text-white">
            <Bell size={13} /> รับการแจ้งเตือนแล้ว (4) คนรออยู่
          </button>
          <p className="text-sm text-ink-soft">วันนี้ 19:00 - 19:30</p>
          <h2 className="mt-1 text-xl font-bold leading-snug text-ink">
            ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น. (เสริม)
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Tag subject="math">คณิตศาสตร์</Tag><Tag>ป.5</Tag><Tag>ป.6</Tag>
          </div>
          <button onClick={() => navigate('/live/next')} className="mt-5 flex w-fit items-center gap-2 rounded-pill bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark">
            <ArrowRight size={16} /> เข้าชมไลฟ์สด
          </button>
        </div>
      </section>

      {/* 4 · ตารางการไลฟ์สดวันต่อไป — แถวเดียวเต็มกว้าง 5 การ์ด */}
      <section className="mt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">ตารางการไลฟ์สดวันต่อไป</h2>
            <p className="mt-0.5 text-sm text-ink-mute">ไลฟ์สดทุกวัน จันทร์ — ศุกร์</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-pill bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">วันนี้: 4 รายการ</span>
            <button onClick={() => navigate('/live/schedule')} className="flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
              <CalendarDays size={15} /> ดูตารางไลฟ์สดทั้งหมด
            </button>
            <div className="flex gap-1">
              <IconBtn><ChevronLeft size={16} /></IconBtn>
              <IconBtn><ChevronRight size={16} /></IconBtn>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {schedule.map((s, i) => (
            <div key={i} className="text-left">
              <p className="mb-1.5 text-[11px] text-ink-soft">{s.day} {s.time}</p>
              <Thumbnail src={thumb(`sched-${i}`)} variant={s.live ? 'live-started' : 'live'} />
              <button
                className={`mt-2 flex w-full flex-col items-center rounded-pill px-2 py-1.5 text-[11px] font-medium ${
                  s.reminded ? 'bg-ink text-white' : 'border border-line text-ink-soft hover:border-brand hover:text-brand'
                }`}
              >
                <span className="flex items-center gap-1"><Bell size={12} /> {s.reminded ? 'รับการแจ้งเตือนแล้ว' : 'รับการแจ้งเตือน'}</span>
                <span className="text-[10px] opacity-80">({s.waiting} คนรออยู่)</span>
              </button>
              <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-snug text-ink">
                ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น...
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Tag subject={s.subject}>{subjectMeta[s.subject].label}</Tag><Tag>ป.5</Tag><Tag>ป.6</Tag>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5 · Set your Goal! */}
      <section className="mt-9 rounded-card bg-brand-soft/50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Flag size={18} /></span>
            <div>
              <h2 className="text-lg font-bold text-ink">Set your Goal!</h2>
              <p className="text-sm text-ink-soft">ตั้งเป้าหมายเพื่อวางแผน และกระตุ้นการเรียนของคุณเอง</p>
            </div>
          </div>
          <button onClick={() => navigate('/goal')} className="rounded-pill border border-brand bg-surface-1 px-4 py-2 text-sm font-medium text-brand">
            + สร้าง Goal เพิ่มเติม
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {goals.map((g, i) => (
            <button key={i} onClick={() => navigate('/goals')} className={`${subjectBg[g.subject]} relative rounded-card p-4 text-left transition hover:brightness-95`}>
              <div className="flex items-start justify-between">
                <Ring pct={g.pct} tone={subjectStroke[g.subject]} />
                <span className="rounded-pill bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white">{g.pct}%</span>
              </div>
              <p className={`mt-3 text-base font-bold ${subjectText[g.subject]}`}>{g.title}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {g.tags.map((t) => (
                  <span key={t} className="rounded-pill bg-white/60 px-2 py-0.5 text-[10px] font-medium text-ink-soft">{t}</span>
                ))}
                <span className="rounded-pill bg-white/60 px-2 py-0.5 text-[10px] font-medium text-ink-soft">ป.6</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 6 · Search + filter */}
      <section className="mt-9 flex flex-wrap items-center gap-3">
        {/* search — magnifier ขวา */}
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-pill bg-surface-2 px-5 py-3">
          <input placeholder="eg. เตรียมสอบ, การคูณเลขยกกำลัง, ..." className="w-full bg-transparent text-sm outline-none placeholder:text-ink-mute" />
          <Search size={18} className="text-ink-mute" />
        </div>
        {/* subject pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['ทั้งหมด', 'อังกฤษ', 'คณิต', 'ชีวะ', 'ไทย'].map((f, i) => (
            <button
              key={f}
              className={`rounded-pill px-4 py-2 text-sm font-medium ${i === 0 ? 'bg-premium/20 text-premium' : 'bg-surface-1 text-ink-soft hover:bg-surface-2'}`}
            >
              {f}
            </button>
          ))}
          <button className="flex items-center gap-1.5 rounded-pill bg-premium/20 px-4 py-2 text-sm font-medium text-premium">
            <Check size={14} /> ทุกชั้นเรียน <ChevronDown size={14} />
          </button>
        </div>
      </section>

      {/* 7-8 · ไลฟ์สดย้อนหลัง */}
      <Rail variant="live" title="หัวข้อไลฟ์สดย้อนหลังล่าสุด" subtitle="กดย้อนดูคลิปที่เคยผ่านการไลฟ์สดไปแล้ว เพื่อทบทวนอีกครั้ง" cards={allCards.slice(0, 5)} />
      <Rail variant="live" title="หัวข้อไลฟ์สดย้อนหลังยอดนิยม" subtitle="กดย้อนดูคลิปที่เคยผ่านการไลฟ์สดไปแล้ว เพื่อทบทวนอีกครั้ง" cards={allCards.slice(5, 10)} />

      {/* 9 · ห้องสอบ (band) */}
      <section className="mt-9 rounded-card bg-subject-english/40 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-subject-english text-subject-english-ink"><ListChecks size={18} /></span>
            <div>
              <h2 className="text-lg font-bold text-ink">ห้องสอบ</h2>
              <p className="text-sm text-ink-soft">เลือกชุดข้อสอบที่ต้องการ</p>
            </div>
          </div>
          <button onClick={() => navigate('/exam')} className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            ดูทั้งหมด <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(['thai', 'science', 'math', 'english', 'thai'] as SubjectKey[]).map((tone, i) => (
            <button key={i} onClick={() => navigate('/exam')} className="group overflow-hidden rounded-card bg-surface-1 text-left shadow-sm">
              <div className="relative flex aspect-[4/3] items-center justify-center bg-surface-2">
                <ListChecks size={22} className="text-ink-mute" />
                {i % 3 === 0 && <span className="absolute right-2 top-2 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">New</span>}
              </div>
              <div className={`${subjectBg[tone]} p-3`}>
                <div className="flex items-center gap-2 text-[11px] font-medium text-ink-soft">
                  <TierCrown free={i % 2 === 0} /> <ListChecks size={12} /> 100 ข้อ · ม.1
                </div>
                <p className={`mt-1.5 line-clamp-2 text-[12px] font-semibold ${subjectText[tone]}`}>
                  เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Tag subject={tone}>{subjectMeta[tone].label}</Tag><Tag>อังกฤษ</Tag>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 10 · ดูต่อจากครั้งที่แล้ว */}
      <Rail title="ดูต่อจากครั้งที่แล้ว" subtitle="กดย้อนดูคลิปที่เคยดูไปแล้ว เพื่อทบทวนอีกครั้ง" cards={allCards.slice(10, 15)} />

      {/* 11 · ห้องเรียนรายวิชา — 2 แถว/วิชา */}
      <Rail title="ห้องเรียน คณิตศาสตร์ (พื้นฐาน)" cards={padTo(cardsFor('math'), 10)} rows={2} onMore={() => navigate('/learn/math')} />
      <Rail title="ห้องเรียน ภาษาอังกฤษ" cards={padTo(cardsFor('english'), 10)} rows={2} onMore={() => navigate('/learn/english')} />
      <Rail title="ห้องเรียน วิทยาศาสตร์" cards={padTo(cardsFor('science'), 10)} rows={2} onMore={() => navigate('/learn/science')} />
    </main>
  )
}

/* ---------- mobile hub (เดิม) ---------- */

function MobileHub() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[440px] flex-col bg-surface-0 shadow-sm md:hidden">
      <main className="flex-1 pb-24">
        <TopBar />
        <SystemUpdate />
        <Banner />
        <LiveNext />
        <div className="mt-4 h-2 bg-surface-2" />
        <ScheduleStrip />
        <GoalEntry />
        <SubjectGrid />
        <ExamStrip />
        <HomeworkCard />
      </main>
      <BottomNav />
    </div>
  )
}

/* ---------- page ---------- */

export default function LearnHub() {
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="hidden md:block">
        <DesktopNav />
        <DesktopHub />
      </div>
      <MobileHub />
    </div>
  )
}
