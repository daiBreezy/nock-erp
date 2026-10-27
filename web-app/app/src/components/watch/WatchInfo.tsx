import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bell, BellRing, Bookmark, Download, Flag, MessageSquareText, MoreHorizontal, Share2, ThumbsDown, ThumbsUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { GradeBadge, SubjectBadge } from '@/components/LearnBadges'
import type { SubjectKey } from '@/data/mock'
import type { Teacher } from '@/data/watch'
import { cn } from '@/lib/utils'

/* หน้าดูวิดีโอ / ไลฟ์ แบบ YouTube — ชื่อคลิป · แถวครู + ปุ่ม · กล่องรายละเอียด · การ์ดแชทสด · เอกสาร · Goal */

export function WatchTitle({ children }: { children: ReactNode }) {
  return <h1 className="line-clamp-2 text-lg font-bold leading-snug text-ink md:text-xl">{children}</h1>
}

const pill = 'h-9 gap-1.5 rounded-pill bg-surface-2 px-3.5 text-sm font-medium text-ink shadow-none hover:bg-line [&_svg]:size-[18px]'

/** แถวครู (เหมือนแถวช่อง YouTube) + ปุ่ม ถูกใจ / แชร์ / บันทึก / ⋯ — จอแคบปุ่มเลื่อนแนวนอนได้ */
export function ChannelRow({ teacher }: { teacher: Teacher }) {
  const [following, setFollowing] = useState(false)
  const [liked, setLiked] = useState<'up' | 'down' | null>(null)
  const [saved, setSaved] = useState(false)

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-brand-soft text-sm font-semibold text-brand">{teacher.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{teacher.name}</p>
          <p className="text-xs text-ink-soft">{teacher.followers} ผู้ติดตาม</p>
        </div>
        <Button
          onClick={() => setFollowing((v) => !v)}
          className={cn(
            'ml-2 h-9 gap-1.5 rounded-pill px-4 text-sm font-semibold shadow-none [&_svg]:size-4',
            following ? 'bg-surface-2 text-ink hover:bg-line' : 'bg-ink text-white hover:bg-ink/85',
          )}
        >
          {following ? <><BellRing size={16} /> ติดตามแล้ว</> : <><Bell size={16} /> ติดตาม</>}
        </Button>
      </div>

      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <div className="flex shrink-0 items-center rounded-pill bg-surface-2">
          <Button variant="ghost" onClick={() => setLiked(liked === 'up' ? null : 'up')} className={cn(pill, 'rounded-r-none pr-3', liked === 'up' && 'text-brand')}>
            <ThumbsUp size={18} fill={liked === 'up' ? 'currentColor' : 'none'} /> {liked === 'up' ? '1.3K' : '1.2K'}
          </Button>
          <span className="h-5 w-px bg-line" />
          <Button variant="ghost" aria-label="ไม่ชอบ" onClick={() => setLiked(liked === 'down' ? null : 'down')} className={cn(pill, 'rounded-l-none pl-3')}>
            <ThumbsDown size={18} fill={liked === 'down' ? 'currentColor' : 'none'} />
          </Button>
        </div>
        <Button variant="ghost" className={cn(pill, 'shrink-0')}><Share2 size={18} /> แชร์</Button>
        <Button variant="ghost" onClick={() => setSaved((v) => !v)} className={cn(pill, 'shrink-0', saved && 'text-brand')}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'บันทึกแล้ว' : 'บันทึก'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="เพิ่มเติม" className={cn(pill, 'w-9 shrink-0 px-0')}><MoreHorizontal size={18} /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem><Download size={16} /> ดาวน์โหลดเอกสาร</DropdownMenuItem>
            <DropdownMenuItem><Flag size={16} /> รายงานปัญหา</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/** กล่องรายละเอียด (เหมือน description ของ YouTube) — บรรทัดสถิติ · ป้ายวิชา/ชั้น · คำอธิบาย ย่อ/ขยายได้ */
export function DescriptionBox({
  stats, subject, grades, children,
}: {
  stats: string; subject: SubjectKey; grades: string[]; children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-sm text-ink">
      <p className="font-semibold">{stats}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <SubjectBadge subject={subject} />
        {grades.map((g) => <GradeBadge key={g} grade={g} className="bg-surface-1" />)}
      </div>
      <div className={cn('mt-2 whitespace-pre-line leading-relaxed text-ink-soft', !open && 'line-clamp-2')}>{children}</div>
      <Button variant="link" onClick={() => setOpen((v) => !v)} className="mt-1 h-auto p-0 text-sm font-semibold text-ink">
        {open ? 'แสดงน้อยลง' : '...เพิ่มเติม'}
      </Button>
    </div>
  )
}

/** การ์ดแชทสด (ตอนแชทยังปิด) — กดเปิดแผงแชท */
export function LiveChatCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl bg-surface-2 p-3 text-sm">
      <p className="font-semibold text-ink">แชทสด</p>
      <div className="flex items-center gap-3">
        <MessageSquareText size={22} className="shrink-0 text-ink-soft" />
        <p className="flex-1 text-ink-soft">ร่วมพูดคุยกับครูและเพื่อนๆ ที่กำลังดูไลฟ์นี้</p>
        <Button onClick={onOpen} className="h-8 shrink-0 rounded-pill bg-surface-1 px-3 text-xs font-semibold text-ink shadow-none hover:bg-line">
          เปิดแชท
        </Button>
      </div>
    </div>
  )
}

/** เอกสารประกอบการเรียน — แถวไฟล์ดาวน์โหลด */
export function DocumentsRow({ subject, teacher }: { subject: SubjectKey; teacher: Teacher }) {
  return (
    <section>
      <h2 className="mb-2 text-[15px] font-semibold text-ink">เอกสารประกอบการเรียน</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {['จำนวนเต็ม (เอกสาร)', 'จำนวนเต็ม (สไลด์)'].map((d) => (
          <Button key={d} variant="ghost" className="flex h-auto items-center justify-start gap-3 rounded-xl bg-surface-2 p-3 text-left hover:bg-line">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-1 text-brand">📄</span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5"><SubjectBadge subject={subject} /></div>
              <p className="truncate text-sm font-medium text-ink">{d}</p>
              <p className="text-[11px] font-normal text-ink-mute">{teacher.name}</p>
            </div>
            <Download size={18} className="text-ink-soft" />
          </Button>
        ))}
      </div>
    </section>
  )
}

/** แถบชวนตั้งเป้าหมาย */
export function GoalCta() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/goal')} className="flex w-full items-center justify-between gap-3 rounded-xl bg-brand p-3.5 text-left text-white">
      <span className="flex items-center gap-2.5">
        <Flag size={18} />
        <span>
          <span className="block font-bold">Set your Goal!</span>
          <span className="block text-xs opacity-90">ตั้งเป้าหมายเพื่อวางแผน และกระตุ้นการเรียนของคุณเอง!</span>
        </span>
      </span>
      <ArrowRight size={18} />
    </button>
  )
}
