import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Crown, ListChecks, BookOpenCheck } from 'lucide-react'
import { FilterBar, FilterSelect, GRADE_FILTER, SearchInput, SUBJECT_FILTER, gradeMatches } from '@/components/SearchFilter'
import AbstractThumb from '@/components/AbstractThumb'
import DesktopNav from '@/web/components/DesktopNav'
import type { SubjectKey } from '@/data/mock'
import { subjectBg, subjectText } from '@/lib/subject'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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


function ExamCard({ ex, onClick }: { ex: ExamSet; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex h-full flex-col overflow-hidden rounded-card text-left shadow-sm transition hover:shadow-md">
      {/* photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <AbstractThumb seed={ex.id} className="transition-transform duration-300 group-hover:scale-105" />
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
  const [view, setView] = useState('exams')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('all')
  const [grade, setGrade] = useState('all')
  const q = query.trim().toLowerCase()
  const shown = exams.filter(
    (ex) => (subject === 'all' || ex.subject === subject) && gradeMatches(ex.grade, grade) && (!q || ex.title.toLowerCase().includes(q)),
  )
  return (
    <main className={mobile ? 'px-4 pb-24 pt-4' : 'mx-auto max-w-[1180px] px-6 pb-16 pt-6'}>
      {/* header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent"><ChevronLeft size={22} /></Button>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-subject-english text-subject-english-ink"><BookOpenCheck size={18} /></span>
        <div>
          <h1 className="text-lg font-bold text-ink md:text-xl">ห้องสอบ</h1>
          <p className="text-xs text-ink-mute md:text-sm">เลือกหัวข้อข้อสอบที่ต้องการ</p>
        </div>
      </div>

      {/* toggle */}
      <Tabs value={view} onValueChange={setView}>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <TabsList className="h-auto rounded-pill bg-surface-2 p-0.5">
            <TabsTrigger value="exams" className="rounded-pill px-4 py-1.5 text-ink-soft data-[state=active]:bg-ink data-[state=active]:text-white">ข้อสอบ</TabsTrigger>
            <TabsTrigger value="score" className="rounded-pill px-4 py-1.5 text-ink-soft data-[state=active]:bg-ink data-[state=active]:text-white">คะแนนรวม</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="exams" className="mt-0">
        {/* section title + ค้นหา (ซ้าย) / ตัวกรอง วิชา · ชั้น (ขวา) */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-ink">ชุดข้อสอบ</h2>
          <p className="text-sm text-ink-mute">มากดสอบก่อนลงสนามจริงกันเถอะ</p>
        </div>
        <FilterBar
          className="mt-4"
          search={<SearchInput value={query} onChange={setQuery} placeholder="eg. เตรียมสอบ, การคูณเลขยกกำลัง, ..." />}
        >
          <FilterSelect label="วิชา" value={subject} onValueChange={setSubject} options={SUBJECT_FILTER} />
          <FilterSelect label="ชั้นเรียน" value={grade} onValueChange={setGrade} options={GRADE_FILTER} />
        </FilterBar>

        {/* grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((ex) => (
            <ExamCard key={ex.id} ex={ex} onClick={() => navigate(`/exam/${ex.id}`)} />
          ))}
        </div>
        {shown.length === 0 && <p className="mt-10 text-center text-sm text-ink-mute">ไม่มีชุดข้อสอบที่ตรงกับตัวกรอง</p>}
        </TabsContent>
        <TabsContent value="score">
          <div className="mt-10 flex flex-col items-center gap-2 text-center text-ink-mute">
            <BookOpenCheck size={32} />
            <p className="text-sm">ยังไม่มีคะแนนรวม — ทำข้อสอบชุดแรกแล้วคะแนนจะขึ้นที่นี่</p>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}

export default function ExamList() {
  return (
    <div className="min-h-screen bg-surface-0">
      <DesktopNav />
      <div className="hidden md:block">
        <Content />
      </div>
      <div className="md:hidden">
        <Content mobile />
      </div>
    </div>
  )
}
