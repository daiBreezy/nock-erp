import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GradeBadge, SubjectBadge } from '@/components/LearnBadges'
import { thumb } from '@/data/media'
import type { SubjectKey } from '@/data/mock'
import { relatedVideos, teacherOf, type WatchVideo } from '@/data/watch'
import { subjectName } from '@/lib/labels'
import { cn } from '@/lib/utils'

/** การ์ดวิดีโอ (แบบ YouTube) — ภาพ 16:9 + เวลา/LIVE · รูปครู · ชื่อ 2 บรรทัด · ครู · ยอดดู · เวลา */
export function WatchVideoCard({ v, compact = false }: { v: WatchVideo; compact?: boolean }) {
  const navigate = useNavigate()
  const teacher = teacherOf[v.subject]
  return (
    <button onClick={() => navigate(v.live ? `/live/${v.videoId}` : `/learn/${v.subject}/${v.videoId}`)} className={cn('group text-left', compact && 'flex gap-2.5')}>
      <div className={cn('relative aspect-video overflow-hidden rounded-xl bg-surface-2', compact ? 'w-40 shrink-0' : 'w-full')}>
        <img src={thumb(v.id)} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
        {v.isNew && <span className="absolute left-1.5 top-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">New</span>}
        {v.live ? (
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-live px-1.5 py-0.5 text-[10px] font-semibold text-white"><Radio size={10} /> LIVE</span>
        ) : (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">{v.duration}</span>
        )}
      </div>
      <div className={cn('flex gap-2.5', !compact && 'mt-2.5')}>
        {!compact && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-brand-soft text-[11px] font-semibold text-brand">{teacher.initials}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-brand">{v.title}</p>
          <p className="mt-1 text-xs text-ink-soft">{teacher.name}</p>
          <p className="text-xs text-ink-soft">{v.live ? 'กำลังไลฟ์' : `${v.views} ครั้ง · ${v.ago}`}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <SubjectBadge subject={v.subject} />
            <GradeBadge grade={v.grade} />
          </div>
        </div>
      </div>
    </button>
  )
}

type Chip = 'all' | 'subject' | 'grade' | 'live'

/** วิดีโอที่เกี่ยวข้อง — chip กรอง (ทั้งหมด / วิชานี้ / ชั้นเดียวกัน / ไลฟ์) + ตาราง หรือรายการแนวตั้ง (compact) */
export default function RelatedVideos({
  subject, grade, excludeId, compact = false, className,
}: {
  subject: SubjectKey; grade?: string; excludeId?: string; compact?: boolean; className?: string
}) {
  const [chip, setChip] = useState<Chip>('all')
  const chips: { v: Chip; label: string }[] = [
    { v: 'all', label: 'ทั้งหมด' },
    { v: 'subject', label: `วิชา${subjectName(subject)}` },
    ...(grade ? [{ v: 'grade' as Chip, label: 'ชั้นเดียวกัน' }] : []),
    { v: 'live', label: 'ไลฟ์' },
  ]
  const list = relatedVideos
    .filter((v) => v.id !== excludeId)
    .filter((v) => chip === 'all' || (chip === 'subject' && v.subject === subject) || (chip === 'grade' && v.grade === grade) || (chip === 'live' && v.live))
    .slice(0, 12)

  return (
    <section className={className}>
      <ToggleGroup type="single" value={chip} onValueChange={(v) => v && setChip(v as Chip)} className="no-scrollbar justify-start gap-2 overflow-x-auto pb-1">
        {chips.map((c) => (
          <ToggleGroupItem
            key={c.v}
            value={c.v}
            className="h-8 shrink-0 rounded-lg bg-surface-2 px-3 text-sm font-medium text-ink hover:bg-line hover:text-ink data-[state=on]:bg-ink data-[state=on]:text-white data-[state=on]:hover:bg-ink"
          >
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className={cn('mt-4', compact ? 'flex flex-col gap-3' : 'grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4')}>
        {list.map((v) => <WatchVideoCard key={v.id} v={v} compact={compact} />)}
        {list.length === 0 && <p className="py-6 text-sm text-ink-mute">ยังไม่มีวิดีโอในหมวดนี้</p>}
      </div>
    </section>
  )
}
