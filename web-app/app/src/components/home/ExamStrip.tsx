import { ChevronRight, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { exams, statusLabel, statusTone } from '../../data/exam'
import SectionTitle from '../SectionTitle'

export default function ExamStrip() {
  const navigate = useNavigate()
  return (
    <section className="pt-5">
      <div className="px-4">
        <SectionTitle
          right={
            <button
              onClick={() => navigate('/exam')}
              className="flex items-center gap-0.5 text-xs font-medium text-brand"
            >
              ดูทั้งหมด <ChevronRight size={14} />
            </button>
          }
        >
          ห้องสอบ
        </SectionTitle>
      </div>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1">
        {exams.slice(0, 4).map((e) => (
          <button
            key={e.id}
            onClick={() => navigate(`/exam/${e.id}`)}
            className="w-44 shrink-0 rounded-card border border-line bg-surface-1 p-2.5 text-left active:scale-95"
          >
            <div className={`${e.cover} flex h-16 items-center justify-center rounded-xl`}>
              <FileText size={24} />
            </div>
            <p className="mt-2 line-clamp-2 h-9 text-xs font-medium text-ink">{e.title}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-ink-soft">
                {e.totalQuestions} ข้อ
              </span>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusTone[e.status]}`}>
                {statusLabel[e.status]}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
