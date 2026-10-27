import { Crown, MessageSquare, Play } from 'lucide-react'
import Thumbnail from '@/components/Thumbnail'
import { GradeBadge, SubjectBadge } from '@/components/LearnBadges'
import type { SubjectKey } from '@/data/mock'

export type VideoCardData = {
  thumb: string
  title: string
  subject: SubjectKey
  grades: string[]
  free: boolean
  comments: number
  duration: string
  isNew?: boolean
}

/** มงกุฎ: เขียว = ฟรี · ทอง = พรีเมียม */
export function TierCrown({ free }: { free: boolean }) {
  return <Crown size={14} className={free ? 'text-success' : 'text-math-ink'} fill={free ? '#1D9E75' : '#D9A441'} />
}

/**
 * การ์ดวิดีโอมาตรฐาน (ตาม Figma) — ใช้ทั้งหน้า Learn และวิดีโอที่เกี่ยวข้อง
 * ภาพ (Thumbnail: ไลฟ์ / ไลฟ์สด / บทเรียนการ์ดซ้อน) · แถว มงกุฎ · คอมเมนต์ · ความยาว · ชื่อ 2 บรรทัด · ป้ายวิชา/ชั้น
 */
export default function VideoCard({
  v, onClick, variant = 'lesson',
}: {
  v: VideoCardData; onClick: () => void; variant?: 'live' | 'live-started' | 'lesson'
}) {
  return (
    <button onClick={onClick} className="group flex h-full w-full flex-col text-left">
      <Thumbnail src={v.thumb} variant={variant}>
        {v.isNew && (
          <span className="absolute right-2 top-2 z-10 rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">New</span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85">
            <Play size={18} className="ml-0.5 text-brand" fill="currentColor" />
          </span>
        </div>
      </Thumbnail>
      <div className="mt-2 flex items-center gap-2.5 text-ink-mute">
        <TierCrown free={v.free} />
        <span className="flex items-center gap-1 text-[11px]"><MessageSquare size={12} /> {v.comments}</span>
        <span className="ml-auto text-[11px]">{v.duration}</span>
      </div>
      <p className="mt-1 line-clamp-2 min-h-[2.75em] text-[12px] font-medium leading-snug text-ink group-hover:text-brand">{v.title}</p>
      <div className="mt-auto flex flex-wrap gap-1 pt-1.5">
        <SubjectBadge subject={v.subject} />
        {v.grades.map((g) => <GradeBadge key={g} grade={g} />)}
      </div>
    </button>
  )
}
