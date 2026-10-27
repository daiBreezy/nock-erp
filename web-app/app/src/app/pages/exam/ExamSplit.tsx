import { NavLink } from 'react-router-dom'
import { BookOpenCheck, Crown, ListChecks, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useSavedLayout } from '@/lib/useSavedLayout'
import { subjectBg, subjectText } from '@/lib/subject'
import { exams } from './examSets'
import { ExamDetailContent } from './ExamDetail'

/** ห้องสอบบน Tablet แนวนอน (แบบ ค) — รายการชุดข้อสอบซ้าย | รายละเอียดชุดที่เลือกขวา */
export default function ExamSplit({ id }: { id?: string }) {
  const split = useSavedLayout('app-exam')
  return (
    <ResizablePanelGroup {...split} orientation="horizontal" className="!h-[100dvh] bg-surface-0">
      <ResizablePanel id="list" defaultSize={340} minSize={260} maxSize="50%" className="bg-surface-1">
        <aside className="flex h-full flex-col">
          <div className="border-b border-line px-4 pb-3 pt-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-subject-english text-subject-english-ink"><BookOpenCheck size={18} /></span>
              <div>
                <h1 className="text-lg font-bold text-ink">ห้องสอบ</h1>
                <p className="text-xs text-ink-mute">{exams.length} ชุดข้อสอบ</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-pill border border-line bg-surface-0 px-3.5 py-2">
              <Search size={15} className="text-ink-mute" />
              <Input placeholder="ค้นหาชุดข้อสอบ" className="h-auto w-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0" />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {exams.map((ex) => (
              <NavLink
                key={ex.id}
                to={`/exam/${ex.id}`}
                className={({ isActive }) =>
                  `flex gap-3 rounded-card p-2.5 text-left transition-colors ${isActive ? 'bg-brand-soft' : 'hover:bg-surface-2'}`
                }
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${subjectBg[ex.subject]} ${subjectText[ex.subject]}`}>
                  <BookOpenCheck size={20} />
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
