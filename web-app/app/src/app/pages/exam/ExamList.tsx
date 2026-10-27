import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, Search, Crown, ListChecks, BookOpenCheck } from 'lucide-react'
import { exams, type ExamSet } from './examSets'
import type { SubjectKey } from '@/data/mock'
import { useAppLayout } from '@/app/layout'
import ExamSplit from './ExamSplit'
import { subjectBg, subjectText } from '@/lib/subject'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/** ตัวกรองห้องสอบ — แต่ละอันเป็น Dropdown เลือกได้ 1 ค่า (ค่าแรก = ทั้งหมด) · วิชา / ชั้น กรองรายการจริง */
const filters = [
  { key: 'subject', options: ['ทุกวิชา', 'คณิตศาสตร์', 'ภาษาอังกฤษ', 'ภาษาไทย', 'วิทยาศาสตร์'] },
  { key: 'grade', options: ['ทุกชั้นเรียน', 'ป.4-6', 'ป.6', 'ม.1-3'] },
  { key: 'term', options: ['ทุกช่วงสอบ', 'สอบเข้า ม.1', 'สอบเข้า ม.4', 'กลางภาค', 'ปลายภาค'] },
  { key: 'sort', options: ['ใหม่ที่สุด', 'ยอดนิยม', 'จำนวนข้อน้อย → มาก'] },
  { key: 'status', options: ['ทั้งหมด', 'ยังไม่ได้ทำ', 'ทำแล้ว'] },
] as const

type FilterKey = (typeof filters)[number]['key']

const subjectByLabel: Record<string, SubjectKey> = {
  คณิตศาสตร์: 'math', ภาษาอังกฤษ: 'english', ภาษาไทย: 'thai', วิทยาศาสตร์: 'science',
}

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
  const [view, setView] = useState('exams')
  const [picked, setPicked] = useState<Record<FilterKey, string>>(
    () => Object.fromEntries(filters.map((f) => [f.key, f.options[0]])) as Record<FilterKey, string>,
  )
  const shown = exams.filter(
    (ex) =>
      (picked.subject === filters[0].options[0] || ex.subject === subjectByLabel[picked.subject]) &&
      (picked.grade === filters[1].options[0] || ex.grade === picked.grade),
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

      {/* toggle + filters */}
      <Tabs value={view} onValueChange={setView}>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <TabsList className="h-auto rounded-pill bg-surface-2 p-0.5">
            <TabsTrigger value="exams" className="rounded-pill px-4 py-1.5 text-ink-soft data-[state=active]:bg-ink data-[state=active]:text-white">ข้อสอบ</TabsTrigger>
            <TabsTrigger value="score" className="rounded-pill px-4 py-1.5 text-ink-soft data-[state=active]:bg-ink data-[state=active]:text-white">คะแนนรวม</TabsTrigger>
          </TabsList>
          <div className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">
            {filters.map((f) => (
              <DropdownMenu key={f.key}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`h-auto gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium md:text-sm [&_svg]:size-[13px] ${
                      picked[f.key] !== f.options[0] ? 'bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand' : 'bg-premium/10 text-ink-soft hover:bg-premium/15 hover:text-brand'
                    }`}
                  >
                    {picked[f.key]} <ChevronDown size={13} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup value={picked[f.key]} onValueChange={(v) => setPicked((p) => ({ ...p, [f.key]: v }))}>
                    {f.options.map((o) => (
                      <DropdownMenuRadioItem key={o} value={o}>{o}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
        </div>

        <TabsContent value="exams" className="mt-0">
        {/* section title + search */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">ชุดข้อสอบ</h2>
            <p className="text-sm text-ink-mute">มากดสอบก่อนลงสนามจริงกันเถอะ</p>
          </div>
          <div className="flex items-center gap-2 rounded-pill border border-line bg-surface-1 px-4 py-2.5 md:w-80">
            <Search size={16} className="text-ink-mute" />
            <Input placeholder="eg. เตรียมสอบ, การคูณเลขยกกำลัง, ..." className="h-auto w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0" />
          </div>
        </div>

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
  const layout = useAppLayout()
  if (layout === 'tablet-landscape') return <ExamSplit />
  return (
    <div className="min-h-screen bg-surface-0">
      <div className="min-h-[100dvh] bg-surface-0">
        <Content mobile />
      </div>
    </div>
  )
}
