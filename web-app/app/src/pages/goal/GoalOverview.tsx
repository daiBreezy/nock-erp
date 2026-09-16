import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Flag, Plus } from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'
import type { SubjectKey } from '../../data/mock'
import { subjectBg, subjectText } from '../../lib/subject'

const subjectStroke: Record<SubjectKey, string> = {
  english: 'stroke-subject-english-ink',
  thai: 'stroke-subject-thai-ink',
  math: 'stroke-subject-math-ink',
  science: 'stroke-subject-science-ink',
}

type Goal = { id: string; title: string; pct: number; subject: SubjectKey; tags: string[] }

const goals: Goal[] = [
  { id: 'g1', title: 'เตรียมสอบเข้าจุฬาภรณ', pct: 36, subject: 'science', tags: ['สอบเข้า', 'คณิตศาสตร์'] },
  { id: 'g2', title: 'เพิ่มเกรดคณิตศาสตร์', pct: 84, subject: 'english', tags: ['เพิ่มเกรด', 'คณิตศาสตร์'] },
  { id: 'g3', title: 'เพิ่มเกรดคณิตศาสตร์', pct: 16, subject: 'math', tags: ['สอบเข้า', 'ภาษาอังกฤษ'] },
  { id: 'g4', title: 'เพิ่มเกรดคณิตศาสตร์', pct: 0, subject: 'thai', tags: ['สอบเข้า', 'ชีววิทยา'] },
  { id: 'g5', title: 'เพิ่มเกรดคณิตศาสตร์', pct: 16, subject: 'math', tags: ['สอบเข้า', 'ภาษาอังกฤษ'] },
  { id: 'g6', title: 'เพิ่มเกรดคณิตศาสตร์', pct: 0, subject: 'thai', tags: ['สอบเข้า', 'ชีววิทยา'] },
  { id: 'g7', title: 'เพิ่มเกรดคณิตศาสตร์', pct: 16, subject: 'math', tags: ['สอบเข้า', 'ภาษาอังกฤษ'] },
  { id: 'g8', title: 'เตรียมสอบเข้าจุฬาภรณ', pct: 36, subject: 'science', tags: ['สอบเข้า', 'คณิตศาสตร์'] },
  { id: 'g9', title: 'เพิ่มเกรดคณิตศาสตร์', pct: 84, subject: 'english', tags: ['เพิ่มเกรด', 'คณิตศาสตร์'] },
]

function Ring({ pct, tone }: { pct: number; tone: string }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" className="stroke-white/50" />
      <circle cx="20" cy="20" r={r} fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className={tone} />
    </svg>
  )
}

function GoalCard({ g, onClick }: { g: Goal; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`${subjectBg[g.subject]} relative rounded-card p-4 text-left transition hover:brightness-95`}>
      <div className="flex items-start justify-between">
        <Ring pct={g.pct} tone={subjectStroke[g.subject]} />
        <span className="rounded-pill bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white">{g.pct}%</span>
      </div>
      <p className={`mt-3 text-base font-bold leading-snug ${subjectText[g.subject]}`}>{g.title}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {g.tags.map((t) => (
          <span key={t} className="rounded-pill bg-white/60 px-2 py-0.5 text-[10px] font-medium text-ink-soft">{t}</span>
        ))}
        <span className="rounded-pill bg-white/60 px-2 py-0.5 text-[10px] font-medium text-ink-soft">ป.6</span>
      </div>
    </button>
  )
}

function Content({ mobile = false }: { mobile?: boolean }) {
  const navigate = useNavigate()
  return (
    <main className={mobile ? 'px-4 pb-10 pt-4' : 'mx-auto max-w-[1180px] px-6 pb-16 pt-6'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={22} /></button>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Flag size={18} /></span>
          <div>
            <h1 className="text-lg font-bold text-ink md:text-xl">Set your Goal!</h1>
            <p className="text-xs text-ink-mute md:text-sm">ตั้งเป้าหมายเพื่อวางแผน และกระตุ้นการเรียนของคุณเอง!</p>
          </div>
        </div>
        <button onClick={() => navigate('/goal')} className="flex items-center gap-1.5 rounded-pill border border-brand bg-surface-1 px-4 py-2 text-sm font-medium text-brand">
          <Plus size={16} /> สร้าง Goal เพิ่มเติม
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {goals.map((g) => (
          <GoalCard key={g.id} g={g} onClick={() => navigate('/goal/plan')} />
        ))}
      </div>
    </main>
  )
}

export default function GoalOverview() {
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="hidden md:block">
        <DesktopNav />
        <Content />
      </div>
      <div className="mx-auto min-h-screen max-w-[440px] bg-surface-0 shadow-sm md:hidden">
        <Content mobile />
      </div>
    </div>
  )
}
