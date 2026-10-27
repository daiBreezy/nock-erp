import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { BookOpenCheck, Crown, ListChecks } from 'lucide-react'
import { FilterSelect, GRADE_FILTER, SearchInput, SUBJECT_FILTER, gradeMatches } from '@/components/SearchFilter'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useSavedLayout } from '@/lib/useSavedLayout'
import AbstractThumb from '@/components/AbstractThumb'
import { exams } from './examSets'
import { ExamDetailContent } from './ExamDetail'

/** ห้องสอบบน Tablet แนวนอน (แบบ ค) — รายการชุดข้อสอบซ้าย | รายละเอียดชุดที่เลือกขวา */
export default function ExamSplit({ id }: { id?: string }) {
  const split = useSavedLayout('app-exam')
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('all')
  const [grade, setGrade] = useState('all')
  const q = query.trim().toLowerCase()
  const shown = exams.filter(
    (ex) => (subject === 'all' || ex.subject === subject) && gradeMatches(ex.grade, grade) && (!q || ex.title.toLowerCase().includes(q)),
  )
  return (
    <ResizablePanelGroup {...split} orientation="horizontal" className="!h-[100dvh] bg-surface-0">
      <ResizablePanel id="list" defaultSize={340} minSize={260} maxSize="50%" className="bg-surface-1">
        <aside className="flex h-full flex-col">
          <div className="border-b border-line px-4 pb-3 pt-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-subject-english text-subject-english-ink"><BookOpenCheck size={18} /></span>
              <div>
                <h1 className="text-lg font-bold text-ink">ห้องสอบ</h1>
                <p className="text-xs text-ink-mute">{shown.length} ชุดข้อสอบ</p>
              </div>
            </div>
            {/* แผงแคบ → ค้นหาเต็มแถว แล้วตัวกรอง วิชา · ชั้น เป็นแถวถัดไป */}
            <SearchInput value={query} onChange={setQuery} placeholder="ค้นหาชุดข้อสอบ" className="mt-3" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <FilterSelect label="วิชา" value={subject} onValueChange={setSubject} options={SUBJECT_FILTER} className="w-full min-w-0" />
              <FilterSelect label="ชั้นเรียน" value={grade} onValueChange={setGrade} options={GRADE_FILTER} className="w-full min-w-0" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {shown.map((ex) => (
              <NavLink
                key={ex.id}
                to={`/exam/${ex.id}`}
                className={({ isActive }) =>
                  `flex gap-3 rounded-card p-2.5 text-left transition-colors ${isActive ? 'bg-brand-soft' : 'hover:bg-surface-2'}`
                }
              >
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-xl">
                  <AbstractThumb seed={ex.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{ex.title}</span>
                  <span className="mt-1 flex items-center gap-2 text-[11px] text-ink-mute">
                    <Crown size={12} className={ex.owned ? 'text-success' : 'text-math-ink'} fill={ex.owned ? '#1D9E75' : '#D9A441'} />
                    <span className="flex items-center gap-1"><ListChecks size={11} /> {ex.questions} ข้อ</span>
                    <span>{ex.grade}</span>
                    {ex.isNew && <span className="rounded-pill bg-brand px-1.5 py-px text-[10px] font-semibold text-white">New</span>}
                  </span>
                </span>
              </NavLink>
            ))}
          </div>
        </aside>
      </ResizablePanel>
      <ResizableHandle withHandle />

      <ResizablePanel id="detail" minSize="40%">
        <div className="h-full overflow-y-auto">
          {id ? (
            <ExamDetailContent id={id} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-ink-mute">
              <BookOpenCheck size={36} />
              <p className="text-sm">เลือกชุดข้อสอบทางซ้ายเพื่อดูรายละเอียด</p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
