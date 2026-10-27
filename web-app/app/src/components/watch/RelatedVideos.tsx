import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import VideoCard from '@/components/VideoCard'
import { thumb } from '@/data/media'
import type { SubjectKey } from '@/data/mock'
import { relatedVideos } from '@/data/watch'
import { subjectName } from '@/lib/labels'
import { cn } from '@/lib/utils'

type Chip = 'all' | 'subject' | 'grade' | 'live'

/** วิดีโอที่เกี่ยวข้อง — chip กรอง (ทั้งหมด / วิชานี้ / ชั้นเดียวกัน / ไลฟ์) + การ์ดวิดีโอมาตรฐาน (แบบเดียวกับหน้า Learn) */
export default function RelatedVideos({
  subject, grade, excludeId, className,
}: {
  subject: SubjectKey; grade?: string; excludeId?: string; className?: string
}) {
  const navigate = useNavigate()
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
            className="h-8 shrink-0 rounded-lg border border-line bg-transparent px-3 text-sm font-medium text-ink hover:bg-surface-2 hover:text-ink data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-white data-[state=on]:hover:bg-ink"
          >
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className={cn('mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5')}>
        {list.map((v) => (
          <VideoCard
            key={v.id}
            v={{ thumb: thumb(v.id), title: v.title, subject: v.subject, grades: [v.grade], free: v.free, comments: v.comments, duration: v.live ? 'กำลังไลฟ์' : v.duration, isNew: v.isNew }}
            variant={v.live ? 'live-started' : 'lesson'}
            onClick={() => navigate(v.live ? `/live/${v.videoId}` : `/learn/${v.subject}/${v.videoId}`)}
          />
        ))}
        {list.length === 0 && <p className="col-span-full py-6 text-sm text-ink-mute">ยังไม่มีวิดีโอในหมวดนี้</p>}
      </div>
    </section>
  )
}
