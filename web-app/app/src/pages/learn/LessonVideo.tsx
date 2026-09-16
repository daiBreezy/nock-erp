import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, PanelLeftClose, Play, Check, Crown, ChevronDown, ChevronUp,
  Download, Volume2, Maximize, PencilLine, Menu, Share2, X, ArrowRight, RotateCcw,
} from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'
import { thumb } from '../../data/media'
import type { SubjectKey } from '../../data/mock'
import { clipGroups, subjectMeta, findVideo } from '../../data/learn'

type Tab = 'lesson' | 'practice' | 'exam'
const TABS: { key: Tab; label: string; Icon: typeof Play }[] = [
  { key: 'lesson', label: 'บทเรียน', Icon: Play },
  { key: 'practice', label: 'แบบฝึกหัด', Icon: PencilLine },
  { key: 'exam', label: 'แบบทดสอบ', Icon: Check },
]

/* ---------- shared pieces ---------- */

function Player() {
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-ink md:rounded-none">
      <img src={thumb('lesson-main')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <button className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/85 transition hover:scale-105">
        <Play size={28} className="ml-1 text-brand" fill="currentColor" />
      </button>
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-white">
        <Play size={18} />
        <div className="flex items-center gap-3">
          <Volume2 size={18} />
          <Maximize size={18} />
        </div>
      </div>
    </div>
  )
}

function Details({ title, subject }: { title: string; subject: SubjectKey }) {
  return (
    <>
      <h1 className="text-lg font-bold leading-snug text-ink md:text-xl">{title}</h1>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-pill bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{subjectMeta[subject].label}</span>
        <span className="rounded-pill bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">ป.5</span>
        <span className="rounded-pill bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">ป.6</span>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-ink">เอกสารประกอบการเรียน</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {['จำนวนเต็ม (เอกสาร)', 'จำนวนเต็ม (สไลด์)'].map((d) => (
          <button key={d} className="flex items-center gap-3 rounded-card bg-brand-soft/70 p-3 text-left hover:bg-brand-soft">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand">📄</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-ink-mute">{subjectMeta[subject].label}</p>
              <p className="truncate text-sm font-medium text-ink">{d}</p>
              <p className="text-[11px] text-ink-mute">ครูพี่ดาว · ป.6</p>
            </div>
            <Download size={18} className="text-ink-soft" />
          </button>
        ))}
      </div>
    </>
  )
}

/* ---------- แบบฝึกหัด / แบบทดสอบ ---------- */

const QTEXT = 'จากแผนภูมิแท่ง จงตอบคำถามต่อไปนี้ จำนวนร้อยละ ของผู้สูงอายุเพศหญิง ส่วนใหญ่มีมูลค่า การออมเป็นเท่าใด'
const CHOICES = [
  'Placerat pellentesque erat phasellus nisi.',
  'Mattis placerat pellentesque erat phasellus nisi.',
  'Mi mattis placerat pellentesque erat phasellus nisi.',
  'Lorem ipsum dolor sit amet consectetur.',
]
const QUESTIONS = [
  { n: 1, correct: 2 }, { n: 2, correct: 2 }, { n: 3, correct: 1 },
  { n: 4, correct: 4 }, { n: 5, correct: 3 },
]

type CState = 'idle' | 'selected' | 'correct' | 'wrong'
const borderCls: Record<CState, string> = {
  idle: 'border-line', selected: 'border-premium bg-premium/10',
  correct: 'border-success bg-success/10', wrong: 'border-live bg-live/10',
}

function Bullet({ n, s }: { n: number; s: CState }) {
  if (s === 'correct') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white"><Check size={13} /></span>
  if (s === 'wrong') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-live text-white"><X size={13} /></span>
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s === 'selected' ? 'bg-premium text-white' : 'bg-surface-2 text-ink-soft'}`}>{n}</span>
}

function ChoiceRow({ i, correct, selected, revealed, onSelect }: { i: number; correct: number; selected?: number; revealed: boolean; onSelect: () => void }) {
  const cn = i + 1
  const s: CState = revealed
    ? cn === correct ? 'correct' : cn === selected ? 'wrong' : 'idle'
    : selected === cn ? 'selected' : 'idle'
  return (
    <button disabled={revealed} onClick={onSelect} className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${borderCls[s]} ${!revealed && s === 'idle' ? 'hover:border-premium/50' : ''}`}>
      <Bullet n={cn} s={s} />
      <span className="text-sm text-ink">{CHOICES[i]}</span>
    </button>
  )
}

function Nav({ current, statusOf, onJump }: { current: number; statusOf: (i: number) => CState; onJump: (i: number) => void }) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {QUESTIONS.map((q, i) => {
        const st = statusOf(i)
        const cls = st === 'correct' ? 'bg-success/15 text-success' : st === 'wrong' ? 'bg-live/15 text-live' : i === current ? 'bg-premium text-white' : 'border border-line text-ink-soft'
        return <button key={q.n} onClick={() => onJump(i)} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${cls}`}>ข้อ {q.n}</button>
      })}
    </div>
  )
}

// แบบฝึกหัด — เฉลยทันทีหลังเลือก (immediate feedback)
function PracticePanel() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [current, setCurrent] = useState(0)
  const q = QUESTIONS[current]
  const revealed = answers[q.n] != null

  return (
    <div>
      <Nav
        current={current}
        statusOf={(i) => { const qq = QUESTIONS[i]; return answers[qq.n] == null ? 'idle' : answers[qq.n] === qq.correct ? 'correct' : 'wrong' }}
        onJump={setCurrent}
      />
      <div className="rounded-card border border-line bg-surface-1 p-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-premium/15 text-sm font-semibold text-premium">{q.n}</span>
        <p className="mt-3 text-sm leading-relaxed text-ink">{QTEXT}</p>
        <div className="mt-4 space-y-2.5">
          {CHOICES.map((_, i) => (
            <ChoiceRow key={i} i={i} correct={q.correct} selected={answers[q.n]} revealed={revealed} onSelect={() => setAnswers((a) => ({ ...a, [q.n]: i + 1 }))} />
          ))}
        </div>
        {revealed && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${answers[q.n] === q.correct ? 'bg-success/10 text-success' : 'bg-live/10 text-live'}`}>
            {answers[q.n] === q.correct ? '✓ ถูกต้อง! เก่งมาก' : '✗ ยังไม่ถูก ลองดูเฉลยสีเขียวนะ'}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setCurrent((c) => Math.min(QUESTIONS.length - 1, c + 1))}
            disabled={!revealed || current === QUESTIONS.length - 1}
            className="flex items-center gap-1.5 rounded-pill bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            ข้อถัดไป <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// แบบทดสอบ — ทำครบแล้วส่ง → เฉลยพร้อมคะแนน
function ExamPanel() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const correctCount = QUESTIONS.filter((q) => answers[q.n] === q.correct).length

  return (
    <div>
      {submitted && (
        <div className="mb-5 flex items-center justify-between rounded-card bg-success p-5 text-white">
          <div>
            <p className="text-2xl font-extrabold">ว้าวว!! ทำได้ดีมากเลย</p>
            <p className="mt-1 text-sm opacity-90">ลองทบทวนข้อที่ยังพลาด แล้วไปต่อกันเลย</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold">{correctCount}/{QUESTIONS.length}</p>
            <p className="text-sm opacity-90">คะแนน</p>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {QUESTIONS.map((q) => (
          <div key={q.n} className="rounded-card border border-line bg-surface-1 p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-premium/15 text-sm font-semibold text-premium">{q.n}</span>
            <p className="mt-3 text-sm leading-relaxed text-ink">{QTEXT}</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {CHOICES.map((_, i) => (
                <ChoiceRow key={i} i={i} correct={q.correct} selected={answers[q.n]} revealed={submitted} onSelect={() => setAnswers((a) => ({ ...a, [q.n]: i + 1 }))} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        {submitted ? (
          <button onClick={() => { setAnswers({}); setSubmitted(false) }} className="flex items-center gap-1.5 rounded-pill bg-premium/15 px-5 py-2.5 text-sm font-semibold text-premium">
            <RotateCcw size={16} /> ทำอีกครั้ง
          </button>
        ) : (
          <button onClick={() => setSubmitted(true)} className="flex items-center gap-1.5 rounded-pill bg-brand px-6 py-2.5 text-sm font-semibold text-white">
            <ArrowRight size={16} /> ส่งคำตอบ
          </button>
        )}
      </div>
    </div>
  )
}

function TabPanel({ tab }: { tab: Tab }) {
  return tab === 'practice' ? <PracticePanel /> : <ExamPanel />
}

/* ---------- sidebar (course content) ---------- */

const TAB_ORDER: Tab[] = ['lesson', 'practice', 'exam']

// 3-state ตาม progress: done(เขียว) / current(ทอง+ม่วง) / todo(เทา)
function LessonTabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const ci = TAB_ORDER.indexOf(tab)
  return (
    <div className="mt-3 space-y-1.5">
      {TABS.map(({ key, label, Icon }, i) => {
        const st = i < ci ? 'done' : i === ci ? 'current' : 'todo'
        const dot =
          st === 'done' ? 'bg-success text-white' : st === 'current' ? 'bg-[#F0A92B] text-white' : 'bg-surface-2 text-ink-mute'
        return (
          <button
            key={key}
            onClick={() => onTab(key)}
            className={`flex w-full items-center gap-2.5 rounded-pill px-3 py-2 text-sm font-medium ${
              st === 'current' ? 'bg-premium/15 text-ink' : 'text-ink-soft hover:bg-surface-2'
            }`}
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${dot}`}>
              <Icon size={13} fill={st !== 'todo' && key !== 'exam' ? 'currentColor' : 'none'} />
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function Sidebar({
  subject, courseTitle, groupTitle, lessons, currentId, tab, onTab, onClose,
}: {
  subject: SubjectKey; courseTitle: string; groupTitle: string
  lessons: { id: string; title: string; free: boolean; watched: boolean }[]
  currentId: string; tab: Tab; onTab: (t: Tab) => void; onClose?: () => void
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const current = lessons.find((l) => l.id === currentId) ?? lessons[0]
  const others = lessons.filter((l) => l.id !== current.id)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <button onClick={() => (onClose ? onClose() : navigate('/'))} className="flex items-center gap-2 text-sm font-medium text-ink">
          <ChevronLeft size={18} /> หน้าหลัก
        </button>
        <button onClick={onClose} className="text-ink-mute hover:text-ink">
          {onClose ? <X size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <div className="px-4 pt-4">
        <h2 className="text-lg font-bold leading-tight text-ink">{courseTitle}</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{groupTitle}</p>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-4 pb-6">
        {/* current lesson (expanded) */}
        <div className="rounded-card bg-premium/10 p-3">
          <div className="flex items-start justify-between">
            <Crown size={18} className={tab === 'exam' ? 'text-success' : 'text-math-ink'} fill={tab === 'exam' ? '#1D9E75' : '#D9A441'} />
            <button onClick={() => setExpanded((v) => !v)} className="text-ink-mute">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          <div className="mt-2 flex gap-2.5">
            <img src={thumb(current.id)} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
            <p className="line-clamp-3 text-[12px] font-medium leading-snug text-ink">{current.title}</p>
          </div>
          {expanded && <LessonTabs tab={tab} onTab={onTab} />}
        </div>

        {/* other lessons */}
        <div className="mt-3 space-y-2">
          {others.slice(0, 4).map((l) => (
            <button
              key={l.id}
              onClick={() => navigate(`/learn/${subject}/${l.id}`)}
              className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface-1 p-2 text-left hover:border-brand"
            >
              <Crown size={14} className={l.free ? 'text-success' : 'text-math-ink'} fill={l.free ? '#1D9E75' : '#D9A441'} />
              <img src={thumb(l.id)} alt="" className="h-9 w-12 shrink-0 rounded object-cover" />
              <p className="line-clamp-2 min-w-0 flex-1 text-[11px] font-medium text-ink">{l.title}</p>
              <ChevronDown size={14} className="text-ink-mute" />
            </button>
          ))}
        </div>

        {/* next */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-ink">บทเรียนถัดไป</p>
          {others[4] && (
            <button
              onClick={() => navigate(`/learn/${subject}/${others[4].id}`)}
              className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface-1 p-2 text-left hover:border-brand"
            >
              <Crown size={14} className="text-math-ink" fill="#D9A441" />
              <img src={thumb(others[4].id)} alt="" className="h-9 w-12 shrink-0 rounded object-cover" />
              <p className="line-clamp-2 min-w-0 flex-1 text-[11px] font-medium text-ink">{others[4].title}</p>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- page ---------- */

export default function LessonVideo() {
  const navigate = useNavigate()
  const { subject, videoId } = useParams<{ subject: SubjectKey; videoId: string }>()
  const key = (subject ?? 'math') as SubjectKey
  const found = videoId ? findVideo(key, videoId) : null
  const [tab, setTab] = useState<Tab>('lesson')
  const [drawer, setDrawer] = useState(false)

  if (!found) return <div className="p-6">ไม่พบวิดีโอ</div>
  const { group, video } = found

  // สร้างรายการบทเรียนจากทุกกลุ่มในวิชา (สารบัญคอร์ส)
  const lessons = clipGroups[key].flatMap((g) =>
    g.videos.map((v) => ({
      id: v.id,
      title: 'ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น. (เสริม)',
      free: v.free,
      watched: v.watched,
    })),
  )
  const title = 'ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น. (เสริม)'
  const courseTitle = `${subjectMeta[key].label} (พื้นฐาน) ม.1`

  const sidebarProps = {
    subject: key, courseTitle, groupTitle: `บทที่ 1 ${group.title}`,
    lessons, currentId: video.id, tab, onTab: setTab,
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* ===== Desktop / tablet ===== */}
      <div className="hidden md:block">
        <DesktopNav />
        <div className="grid grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
          <aside className="sticky top-[112px] h-[calc(100vh-112px)] border-r border-line bg-surface-1">
            <Sidebar {...sidebarProps} />
          </aside>
          <div>
            <Player />
            <div className="max-w-4xl px-6 py-5">
              {tab === 'lesson' ? <Details title={title} subject={key} /> : <TabPanel tab={tab} />}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Mobile ===== */}
      <div className="flex min-h-screen flex-col bg-surface-0 md:hidden">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface-0/95 px-3 py-3 backdrop-blur">
          <button onClick={() => setDrawer(true)} aria-label="สารบัญ"><Menu size={20} className="text-ink" /></button>
          <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ"><ChevronLeft size={20} className="text-ink" /></button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{title}</p>
          <button aria-label="แชร์"><Share2 size={18} className="text-ink-soft" /></button>
        </header>

        {/* tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-line bg-surface-1 px-3 py-2 no-scrollbar">
          {TABS.map(({ key: k, label, Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex shrink-0 items-center gap-1.5 rounded-pill px-3.5 py-1.5 text-sm font-medium ${
                tab === k ? 'bg-brand text-white' : 'bg-surface-2 text-ink-soft'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <Player />
        <div className="flex-1 px-4 py-4">
          {tab === 'lesson' ? <Details title={title} subject={key} /> : <TabPanel tab={tab} />}
        </div>

        {/* FAB */}
        <button
          onClick={() => setTab('practice')}
          className="fixed bottom-5 right-5 z-20 flex items-center gap-1.5 rounded-pill bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg"
        >
          <PencilLine size={16} /> ทำแบบฝึกหัด
        </button>

        {/* drawer */}
        {drawer && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
            <div className="absolute left-0 top-0 h-full w-[85%] max-w-[340px] bg-surface-1 shadow-xl">
              <Sidebar {...sidebarProps} onClose={() => setDrawer(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
