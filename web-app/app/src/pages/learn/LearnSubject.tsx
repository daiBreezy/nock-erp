import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, PlayCircle, Lock, Check } from 'lucide-react'
import type { SubjectKey } from '../../data/mock'
import { clipGroups, subjectMeta } from '../../data/learn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function LearnSubject() {
  const navigate = useNavigate()
  const { subject } = useParams<{ subject: SubjectKey }>()
  const key = (subject ?? 'math') as SubjectKey
  const meta = subjectMeta[key]
  const groups = clipGroups[key] ?? []

  const grades = Array.from(new Set(groups.map((g) => g.grade)))
  const [grade, setGrade] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(groups[0]?.id ?? null)

  const list = grade ? groups.filter((g) => g.grade === grade) : groups

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent"><ChevronLeft size={24} /></Button>
        <h1 className="text-lg font-semibold text-ink">{meta.label}</h1>
      </header>

      {/* grade filter */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        <Button
          variant={grade === null ? 'default' : 'outline'}
          onClick={() => setGrade(null)}
          className={`h-auto shrink-0 rounded-pill px-4 py-1.5 text-sm font-medium ${grade === null ? '' : 'border-line bg-surface-1 text-ink-soft hover:bg-surface-2'}`}
        >
          ทุกระดับชั้น
        </Button>
        {grades.map((g) => (
          <Button
            key={g}
            variant={grade === g ? 'default' : 'outline'}
            onClick={() => setGrade(g)}
            className={`h-auto shrink-0 rounded-pill px-4 py-1.5 text-sm font-medium ${grade === g ? '' : 'border-line bg-surface-1 text-ink-soft hover:bg-surface-2'}`}
          >
            {g}
          </Button>
        ))}
      </div>

      <div className="space-y-3 px-4">
        {list.map((g) => {
          const isOpen = open === g.id
          const watched = g.videos.filter((v) => v.watched).length
          return (
            <div key={g.id} className="overflow-hidden rounded-card border border-line bg-surface-1">
              <Button variant="ghost" onClick={() => setOpen(isOpen ? null : g.id)} className="flex h-auto w-full items-center justify-start gap-3 p-4 text-left hover:bg-surface-2">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                  <PlayCircle size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{g.title}</p>
                  <p className="mt-0.5 text-xs font-normal text-ink-soft">{g.grade} · {g.videos.length} วิดีโอ · ดูแล้ว {watched}</p>
                </div>
                <ChevronDown size={20} className={`text-ink-mute transition ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
              {isOpen && (
                <div className="border-t border-line">
                  {g.videos.map((v) => (
                    <Button
                      key={v.id}
                      variant="ghost"
                      onClick={() => navigate(`/learn/${key}/${v.id}`)}
                      className="flex h-auto w-full items-center justify-start gap-3 rounded-none border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-surface-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2">
                        {v.watched ? <Check size={15} className="text-success" /> : v.free ? <PlayCircle size={16} className="text-ink-soft" /> : <Lock size={14} className="text-ink-mute" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-normal text-ink">{v.title}</span>
                      {v.free && !v.watched && <Badge className="rounded-md border-transparent bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success hover:bg-success/10">ฟรี</Badge>}
                      <span className="text-xs font-normal text-ink-mute">{v.duration}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
