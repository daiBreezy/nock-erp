import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, Crown, ListChecks, Clock, Trophy, MoreVertical, ArrowRight, RotateCcw, BookOpenCheck,
} from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'

type State = 'new' | 'progress' | 'done'
type SubjectExam = {
  key: string
  label: string
  questions: number
  state: State
  time?: string
  rank?: number
}

const subjectExams: SubjectExam[] = [
  { key: 'math', label: 'คณิตศาสตร์ (เพิ่มเติม)', questions: 80, state: 'new' },
  { key: 'english', label: 'ภาษาอังกฤษ', questions: 80, state: 'progress' },
  { key: 'bio', label: 'ชีววิทยา', questions: 40, state: 'done', time: '01:02:47', rank: 146 },
]

function SubjectCard({ ex, onStart }: { ex: SubjectExam; onStart: () => void }) {
  const cta =
    ex.state === 'new'
      ? { label: 'เริ่มทำข้อสอบ', Icon: ArrowRight, cls: 'bg-brand text-white hover:bg-brand-dark' }
      : ex.state === 'progress'
        ? { label: 'ทำข้อสอบต่อ', Icon: ArrowRight, cls: 'bg-brand text-white hover:bg-brand-dark' }
        : { label: 'ลองอีกครั้ง', Icon: RotateCcw, cls: 'bg-premium/15 text-premium hover:bg-premium/25' }

  return (
    <div className={`flex min-h-[240px] flex-col rounded-card border-2 bg-surface-1 p-4 ${ex.state === 'progress' ? 'border-math-ink/60' : 'border-line'}`}>
      <div className="flex items-center justify-between">
        <Crown
          size={20}
          className={ex.state === 'done' ? 'text-success' : ex.state === 'progress' ? 'text-math-ink' : 'text-ink-mute'}
          fill={ex.state === 'done' ? '#1D9E75' : ex.state === 'progress' ? '#D9A441' : 'none'}
        />
        <span className="flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-soft">
          <ListChecks size={13} /> {ex.questions} ข้อ
        </span>
      </div>

      <h3 className="mt-3 text-base font-bold text-ink">{ex.label}</h3>

      {ex.state === 'done' && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="flex items-center gap-2"><Clock size={15} /> การจับเวลา</span>
            <span className="font-semibold text-ink">{ex.time}</span>
          </div>
          <div className="flex items-center justify-between text-ink-soft">
            <span className="flex items-center gap-2"><Trophy size={15} /> อันดับของคุณ</span>
            <span className="font-semibold text-ink">{ex.rank}</span>
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <button aria-label="เมนู" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-mute hover:text-ink">
          <MoreVertical size={16} />
        </button>
        <button onClick={onStart} className={`flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2.5 text-sm font-semibold ${cta.cls}`}>
          <cta.Icon size={16} /> {cta.label}
        </button>
      </div>
    </div>
  )
}

function Content({ id, mobile = false }: { id: string; mobile?: boolean }) {
  const navigate = useNavigate()
  return (
    <main className={mobile ? 'px-4 pb-10 pt-4' : 'mx-auto max-w-[1100px] px-6 pb-16 pt-6'}>
      {/* header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={22} /></button>
        <div>
          <h1 className="text-lg font-bold text-ink md:text-xl">ย้อนกลับ</h1>
          <p className="text-xs text-ink-mute md:text-sm">เลือกหัวข้อข้อสอบที่ต้องการ</p>
        </div>
      </div>

      {/* banner */}
      <div className="mt-5 grid overflow-hidden rounded-card sm:grid-cols-[1fr_1.2fr]">
        <div className="relative flex aspect-[16/7] items-center justify-center bg-surface-2 sm:aspect-auto">
          <BookOpenCheck size={30} className="text-ink-mute" />
          <span className="absolute bottom-2 left-2 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">New</span>
        </div>
        <div className="bg-[#B7ECD4] p-5">
          <div className="flex items-center gap-2 text-[#1D7A57]">
            <Crown size={18} fill="#D9A441" className="text-math-ink" />
            <span className="flex items-center gap-1 rounded-pill bg-white/50 px-2.5 py-1 text-xs font-medium"><ListChecks size={13} /> 200 ข้อ</span>
            <span className="rounded-pill bg-white/50 px-2.5 py-1 text-xs font-medium">ม.1-3</span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-[#0F5C40]">เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['คณิต (เพิ่มเติม)', 'อังกฤษ', 'ชีวะ'].map((t) => (
              <span key={t} className="rounded-pill bg-white/60 px-2.5 py-0.5 text-[11px] font-medium text-[#1D7A57]">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* choose subject */}
      <div className="mt-7">
        <h2 className="text-lg font-bold text-ink">เลือกวิชาที่ต้องการสอบ</h2>
        <p className="text-sm text-ink-mute">มากดสอบก่อนลงสนามจริงกันเถอะ</p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjectExams.map((ex) => (
          <SubjectCard key={ex.key} ex={ex} onStart={() => navigate(`/exam/${id}/quiz`)} />
        ))}
      </div>
    </main>
  )
}

export default function ExamDetail() {
  const { id = 'e1' } = useParams()
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="hidden md:block">
        <DesktopNav />
        <Content id={id} />
      </div>
      <div className="mx-auto min-h-screen max-w-[440px] bg-surface-0 shadow-sm md:hidden">
        <Content id={id} mobile />
      </div>
    </div>
  )
}
