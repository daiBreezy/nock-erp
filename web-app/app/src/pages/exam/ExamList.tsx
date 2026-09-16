import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, Search, Crown, ListChecks, BookOpenCheck } from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'
import BottomNav from '../../components/BottomNav'
import type { SubjectKey } from '../../data/mock'
import { subjectBg, subjectText } from '../../lib/subject'

type ExamSet = {
  id: string
  subject: SubjectKey
  title: string
  grade: string
  questions: number
  isNew: boolean
  owned: boolean
  tags: string[]
}

const exams: ExamSet[] = [
  { id: 'e1', subject: 'thai', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: true, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e2', subject: 'english', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาชีววิทยา', grade: 'ม.1-3', questions: 100, isNew: false, owned: false, tags: ['ไทย', 'อังกฤษ', 'วิทย์'] },
  { id: 'e3', subject: 'math', title: 'เตรียมสอบ ม.4 รร.จุฬาภรณ วิชาชีววิทยา', grade: 'ป.4-6', questions: 100, isNew: false, owned: true, tags: ['อังกฤษ'] },
  { id: 'e4', subject: 'thai', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาภาษาอังกฤษ', grade: 'ป.6', questions: 100, isNew: true, owned: false, tags: ['ชีวะ'] },
  { id: 'e5', subject: 'science', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: true, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e6', subject: 'math', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: true, tags: ['ไทย', 'อังกฤษ', 'วิทย์'] },
  { id: 'e7', subject: 'thai', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e8', subject: 'english', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาภาษาอังกฤษ', grade: 'ป.6', questions: 100, isNew: false, owned: false, tags: ['ชีวะ'] },
  { id: 'e9', subject: 'math', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: true, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
  { id: 'e10', subject: 'science', title: 'เตรียมสอบ ม.4 รร.จุฬาภรณ วิชาชีววิทยา', grade: 'ป.4-6', questions: 100, isNew: false, owned: false, tags: ['อังกฤษ'] },
  { id: 'e11', subject: 'thai', title: 'เตรียมสอบ ม.4 รร.เตรียมอุดม วิชาภาษาอังกฤษ', grade: 'ป.6', questions: 100, isNew: false, owned: false, tags: ['ชีวะ'] },
  { id: 'e12', subject: 'science', title: 'เตรียมสอบ ม.4 รร.จุฬาภรณ วิชาชีววิทยา', grade: 'ป.4-6', questions: 100, isNew: false, owned: true, tags: ['อังกฤษ'] },
  { id: 'e13', subject: 'english', title: 'เตรียมสอบเข้า รร.ดัง (จุฬาภรณ, เตรียมอุดมฯ, สวนกุหลาบ)', grade: 'ม.1-3', questions: 100, isNew: false, owned: false, tags: ['คณิต (เพิ่มเติม)', 'อังกฤษ'] },
]

const filters = ['ทุกวิชา', 'ทุกชั้นเรียน', 'ทุกช่วงสอบ', 'ใหม่ที่สุด', 'ยังไม่ได้ทำ']

function ExamCard({ ex, onClick }: { ex: ExamSet; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex h-full flex-col overflow-hidden rounded-card text-left shadow-sm transition hover:shadow-md">
      {/* photo */}
      <div className="relative flex aspect-[4/3] items-center justify-center bg-surface-2">
        <BookOpenCheck size={26} className="text-ink-mute" />
        {ex.isNew && (
          <span className="absolute right-2 top-2 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">New</span>
        )}
      </div>
      {/* body */}
      <div className={`flex flex-1 flex-col ${subjectBg[ex.subject]} p-3`}>
        <div className="flex items-center gap-2 text-[11px] font-medium text-ink-soft">
          <Crown size={13} className={ex.owned ? 'text-success' : 'text-math-ink'} fill={ex.owned ? '#1D9E75' : '#D9A441'} />
          <span className="flex items-center gap-1"><ListChecks size={12} /> {ex.questions} ข้อ</span>
          <span className="ml-auto rounded-pill bg-white/60 px-2 py-0.5">{ex.grade}</span>
        </div>
        <p className={`mt-2 line-clamp-3 text-[13px] font-semibold leading-snug ${subjectText[ex.subject]}`}>{ex.title}</p>
        <div className="mt-auto flex flex-wrap gap-1 pt-3">
          {ex.tags.map((t) => (
            <span key={t} className="rounded-pill bg-white/60 px-2 py-0.5 text-[10px] font-medium text-ink-soft">{t}</span>
          ))}
        </div>
      </div>
    </button>
  )
}

function Content({ mobile = false }: { mobile?: boolean }) {
  const navigate = useNavigate()
  return (
    <main className={mobile ? 'px-4 pb-24 pt-4' : 'mx-auto max-w-[1180px] px-6 pb-16 pt-6'}>
      {/* header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={22} /></button>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-subject-english text-subject-english-ink"><BookOpenCheck size={18} /></span>
        <div>
          <h1 className="text-lg font-bold text-ink md:text-xl">ห้องสอบ</h1>
          <p className="text-xs text-ink-mute md:text-sm">เลือกหัวข้อข้อสอบที่ต้องการ</p>
        </div>
      </div>

      {/* toggle + filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-pill bg-surface-2 p-0.5 text-sm">
          <button className="rounded-pill bg-ink px-4 py-1.5 font-medium text-white">ข้อสอบ</button>
          <button className="rounded-pill px-4 py-1.5 text-ink-soft">คะแนนรวม</button>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">
          {filters.map((f) => (
            <button key={f} className="flex items-center gap-1.5 rounded-pill bg-premium/10 px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-brand md:text-sm">
              {f} <ChevronDown size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* section title + search */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">ชุดข้อสอบ</h2>
          <p className="text-sm text-ink-mute">มากดสอบก่อนลงสนามจริงกันเถอะ</p>
        </div>
        <div className="flex items-center gap-2 rounded-pill border border-line bg-surface-1 px-4 py-2.5 md:w-80">
          <Search size={16} className="text-ink-mute" />
          <input placeholder="eg. เตรียมสอบ, การคูณเลขยกกำลัง, ..." className="w-full bg-transparent text-sm outline-none placeholder:text-ink-mute" />
        </div>
      </div>

      {/* grid */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {exams.map((ex) => (
          <ExamCard key={ex.id} ex={ex} onClick={() => navigate(`/exam/${ex.id}`)} />
        ))}
      </div>
    </main>
  )
}

export default function ExamList() {
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="hidden md:block">
        <DesktopNav />
        <Content />
      </div>
      <div className="mx-auto min-h-screen max-w-[440px] bg-surface-0 shadow-sm md:hidden">
        <Content mobile />
        <BottomNav />
      </div>
    </div>
  )
}
