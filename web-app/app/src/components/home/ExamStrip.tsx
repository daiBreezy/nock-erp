import { ChevronRight, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { exams, statusLabel, statusTone } from '../../data/exam'
import SectionTitle from '../SectionTitle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export default function ExamStrip() {
  const navigate = useNavigate()
  return (
    <section className="pt-5">
      <div className="px-4">
        <SectionTitle
          right={
            <Button
              variant="link"
              onClick={() => navigate('/exam')}
              className="h-auto gap-0.5 p-0 text-xs font-medium text-brand hover:no-underline"
            >
              ดูทั้งหมด <ChevronRight size={14} />
            </Button>
          }
        >
          ห้องสอบ
        </SectionTitle>
      </div>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1">
        {exams.slice(0, 4).map((e) => (
          <Card key={e.id} asChild className="w-44 shrink-0 rounded-card border-line bg-surface-1 shadow-none">
            <button onClick={() => navigate(`/exam/${e.id}`)} className="p-2.5 text-left active:scale-95">
              <div className={`${e.cover} flex h-16 items-center justify-center rounded-xl`}>
                <FileText size={24} />
              </div>
              <p className="mt-2 line-clamp-2 h-9 text-xs font-medium text-ink">{e.title}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="secondary" className="rounded-md border-transparent bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-ink-soft hover:bg-surface-2">
                  {e.totalQuestions} ข้อ
                </Badge>
                <Badge className={`rounded-md border-transparent px-2 py-0.5 text-[11px] font-medium ${statusTone[e.status]}`}>
                  {statusLabel[e.status]}
                </Badge>
              </div>
            </button>
          </Card>
        ))}
      </div>
    </section>
  )
}
