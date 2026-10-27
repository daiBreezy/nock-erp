import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, Play, Radio, Flag,
  ListChecks, Bell, Eye, Volume2, Maximize, ArrowRight, CalendarDays, Plus,
} from 'lucide-react'
import DesktopNav from '@/web/components/DesktopNav'
import { Button } from '@/components/ui/button'
import { FilterBar, FilterSelect, GRADE_FILTER, SearchInput, SUBJECT_FILTER, gradeMatches } from '@/components/SearchFilter'
import type { SubjectKey } from '@/data/mock'
import { clipGroups } from '@/data/learn'
import { subjectBg, subjectText } from '@/lib/subject'
import { bannerImg, thumb } from '@/data/media'
import Thumbnail from '@/components/Thumbnail'
import AbstractThumb from '@/components/AbstractThumb'
import VideoCard, { TierCrown } from '@/components/VideoCard'
import { GradeBadge, SubjectBadge } from '@/components/LearnBadges'

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
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-black/[0.06]" />
      <circle
        cx="20" cy="20" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={tone}
      />
    </svg>
  )
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-line bg-transparent text-ink-soft shadow-none hover:border-brand hover:bg-transparent hover:text-brand">
      {children}
    </Button>
  )
}

/**
 * Section เด่น (Goal / ห้องสอบ) — พื้นสีเข้มเต็มแผง + การ์ดขาวด้านใน
 * ให้ต่างจากแถววิดีโอที่วางบนพื้นขาวชัดเจน มองแวบเดียวก็แยกออก
 */
function FeatureBand({
  tone, icon, title, subtitle, action, children,
}: {
  tone: 'goal' | 'exam'; icon: React.ReactNode; title: string; subtitle: string; action: React.ReactNode; children: React.ReactNode
}) {
  const bg = tone === 'goal' ? 'bg-gradient-to-br from-[#FF5A5E] to-[#FF8A6B]' : 'bg-gradient-to-br from-[#3D3A9E] to-premium'
  return (
    <section className={`relative mt-10 overflow-hidden rounded-[20px] ${bg} p-4 md:p-6`}>
      {/* วงกลมจางมุมขวาบน — ตกแต่งเบาๆ */}
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute right-40 -top-10 size-24 rounded-full bg-white/10" />
      <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/20 text-white">{icon}</span>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-sm text-white/80">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </section>
  )
}

const bandAction = 'h-9 gap-1 rounded-pill bg-white px-4 text-sm font-semibold shadow-none hover:bg-white/90'

/** แถว rail มาตรฐาน — 5 ใบ/แถว (grid ยืดหยุ่นตามจอ) */
function Rail({
  title, subtitle, cards, onMore, rows = 1, variant = 'lesson',
}: {
  title: string; subtitle?: string; cards: Card[]; onMore?: () => void; rows?: number; variant?: 'live' | 'lesson'
}) {
  const navigate = useNavigate()
  return (
    <section className="mt-9">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-mute">{subtitle}</p>}
        </div>
        <Button variant="link" onClick={onMore} className="h-auto gap-1 p-0 text-sm font-medium text-brand">
          ดูทั้งหมด <ChevronRight size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {cards.slice(0, rows * 5).map((c) => (
          <VideoCard
            key={c.id}
            v={{ thumb: thumb(c.id), title: c.title, subject: c.subject, grades: ['ป.5', 'ป.6'], free: c.free, comments: c.comments, duration: c.duration, isNew: c.isNew }}
            variant={variant}
            onClick={() => navigate(`/learn/${c.id.split('-x')[0]}`)}
          />
        ))}
      </div>
    </section>
  )
}

/* ---------- desktop hub ---------- */

function DesktopHub() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('all')
  const [grade, setGrade] = useState('all')
  const q = query.trim().toLowerCase()
  const filtered = allCards.filter(
    (c) => (subject === 'all' || c.subject === subject) && gradeMatches(c.grade, grade) && (!q || c.title.toLowerCase().includes(q)),
  )

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
    <main className="mx-auto max-w-[1180px] px-4 pb-16 md:px-6">
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
          <Button className="mb-3 h-auto w-fit gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90 [&_svg]:size-[13px]">
            <Bell size={13} /> รับการแจ้งเตือนแล้ว (4) คนรออยู่
          </Button>
          <p className="text-sm text-ink-soft">วันนี้ 19:00 - 19:30</p>
          <h2 className="mt-1 text-lg font-bold md:text-xl leading-snug text-ink">
            ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น. (เสริม)
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <SubjectBadge subject="math" /><GradeBadge grade="ป.5" /><GradeBadge grade="ป.6" />
          </div>
          <Button onClick={() => navigate('/live/next')} className="mt-5 h-auto w-fit gap-2 rounded-pill bg-brand px-6 py-3 text-sm font-semibold hover:bg-brand-dark">
            <ArrowRight size={16} /> เข้าชมไลฟ์สด
          </Button>
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
            <Button variant="link" onClick={() => navigate('/live/schedule')} className="h-auto gap-1.5 p-0 text-sm font-medium text-brand [&_svg]:size-[15px]">
              <CalendarDays size={15} /> ดูตารางไลฟ์สดทั้งหมด
            </Button>
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
              <Button
                variant="ghost"
                className={`mt-2 h-auto w-full flex-col gap-0 rounded-pill px-2 py-1.5 text-[11px] font-medium [&_svg]:size-3 ${
                  s.reminded ? 'bg-ink text-white hover:bg-ink/90 hover:text-white' : 'border border-line text-ink-soft hover:border-brand hover:bg-transparent hover:text-brand'
                }`}
              >
                <span className="flex items-center gap-1"><Bell size={12} /> {s.reminded ? 'รับการแจ้งเตือนแล้ว' : 'รับการแจ้งเตือน'}</span>
                <span className="text-[10px] opacity-80">({s.waiting} คนรออยู่)</span>
              </Button>
              <p className="mt-2 line-clamp-2 text-[12px] font-medium leading-snug text-ink">
                ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น...
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <SubjectBadge subject={s.subject} /><GradeBadge grade="ป.5" /><GradeBadge grade="ป.6" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5 · Set your Goal! */}
      <FeatureBand
        tone="goal"
        icon={<Flag size={20} />}
        title="Set your Goal!"
        subtitle="ตั้งเป้าหมายเพื่อวางแผน และกระตุ้นการเรียนของคุณเอง"
        action={
          <Button onClick={() => navigate('/goal')} className={`${bandAction} text-brand`}>
            <Plus size={16} /> สร้าง Goal เพิ่มเติม
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {goals.map((g, i) => (
            <button key={i} onClick={() => navigate('/goals')} className="relative rounded-2xl bg-surface-1 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <Ring pct={g.pct} tone={subjectStroke[g.subject]} />
                <span className={`rounded-pill ${subjectBg[g.subject]} px-2 py-0.5 text-[12px] font-bold ${subjectText[g.subject]}`}>{g.pct}%</span>
              </div>
              <p className="mt-3 text-base font-bold text-ink">{g.title}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {g.tags.map((t) => (
                  <span key={t} className="rounded-pill bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-soft">{t}</span>
                ))}
                <GradeBadge grade="ป.6" />
              </div>
            </button>
          ))}
        </div>
      </FeatureBand>

      {/* 6 · Search + filter */}
      <FilterBar
        className="mt-9"
        search={<SearchInput value={query} onChange={setQuery} placeholder="eg. เตรียมสอบ, การคูณเลขยกกำลัง, ..." />}
      >
        <FilterSelect label="วิชา" value={subject} onValueChange={setSubject} options={SUBJECT_FILTER} />
        <FilterSelect label="ชั้นเรียน" value={grade} onValueChange={setGrade} options={GRADE_FILTER} />
      </FilterBar>

      {/* 7-8 · ไลฟ์สดย้อนหลัง — กรองตามค้นหา / วิชา / ชั้น ด้านบน */}
      {filtered.length === 0 ? (
        <p className="mt-9 rounded-card border border-dashed border-line py-10 text-center text-sm text-ink-mute">ไม่พบคลิปที่ตรงกับการค้นหาหรือตัวกรอง</p>
      ) : (
        <>
          <Rail variant="live" title="หัวข้อไลฟ์สดย้อนหลังล่าสุด" subtitle="กดย้อนดูคลิปที่เคยผ่านการไลฟ์สดไปแล้ว เพื่อทบทวนอีกครั้ง" cards={filtered.slice(0, 5)} />
          {filtered.length > 5 && (
            <Rail variant="live" title="หัวข้อไลฟ์สดย้อนหลังยอดนิยม" subtitle="กดย้อนดูคลิปที่เคยผ่านการไลฟ์สดไปแล้ว เพื่อทบทวนอีกครั้ง" cards={filtered.slice(5, 10)} />
          )}
        </>
      )}

      {/* 9 · ห้องสอบ (band) */}
      <FeatureBand
        tone="exam"
        icon={<ListChecks size={20} />}
        title="ห้องสอบ"
        subtitle="เลือกชุดข้อสอบที่ต้องการ"
        action={
          <Button onClick={() => navigate('/exam')} className={`${bandAction} text-[#3D3A9E]`}>
            ดูทั้งหมด <ChevronRight size={16} />
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(['thai', 'science', 'math', 'english', 'thai'] as SubjectKey[]).map((tone, i) => (
            <button key={i} onClick={() => navigate('/exam')} className="group overflow-hidden rounded-2xl bg-surface-1 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                <AbstractThumb seed={`hub-${i}`} className="transition-transform duration-300 group-hover:scale-105" />
                {i % 3 === 0 && <span className="absolute right-2 top-2 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">New</span>}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 text-[11px] font-medium text-ink-soft">
                  <TierCrown free={i % 2 === 0} /> <ListChecks size={12} /> 100 ข้อ · ม.1
                </div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink">
                  เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <SubjectBadge subject={tone} /><SubjectBadge subject="english" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </FeatureBand>

      {/* 10 · ดูต่อจากครั้งที่แล้ว */}
      <Rail title="ดูต่อจากครั้งที่แล้ว" subtitle="กดย้อนดูคลิปที่เคยดูไปแล้ว เพื่อทบทวนอีกครั้ง" cards={allCards.slice(10, 15)} />

      {/* 11 · ห้องเรียนรายวิชา — 2 แถว/วิชา */}
      <Rail title="ห้องเรียน คณิตศาสตร์ (พื้นฐาน)" cards={padTo(cardsFor('math'), 10)} rows={2} onMore={() => navigate('/learn/math')} />
      <Rail title="ห้องเรียน ภาษาอังกฤษ" cards={padTo(cardsFor('english'), 10)} rows={2} onMore={() => navigate('/learn/english')} />
      <Rail title="ห้องเรียน วิทยาศาสตร์" cards={padTo(cardsFor('science'), 10)} rows={2} onMore={() => navigate('/learn/science')} />
    </main>
  )
}

/* ---------- page ---------- */

export default function LearnHub() {
  return (
    <div className="min-h-screen bg-surface-0">
      <DesktopNav />
      <DesktopHub />
    </div>
  )
}
