import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Download, FileText, Flag, ListVideo, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GradeBadge, SubjectBadge } from '@/components/LearnBadges'
import type { SubjectKey } from '@/data/mock'
import type { Teacher } from '@/data/watch'

/*
 * หน้าดูวิดีโอ / ไลฟ์ — โครงอ้างอิง YouTube แต่ใช้เฉพาะสิ่งที่ระบบมีจริง
 * (ไม่มี ติดตาม / ถูกใจ / แชร์ / บันทึก / ยอดคนดู) · กล่อง/ปุ่มรองเป็นแบบ outline
 */

export function WatchTitle({ children }: { children: ReactNode }) {
  return <h1 className="line-clamp-2 text-lg font-bold leading-snug text-ink md:text-xl">{children}</h1>
}

/** แถวใต้ชื่อ: ครู · เวลา (เริ่มไลฟ์เมื่อ… / อัปโหลดเมื่อ…) · ป้ายวิชา/ชั้น · (ขวา) ปุ่มเสริมของหน้า เช่น เปิดสารบัญ */
export function WatchMeta({
  teacher, when, subject, grades, action,
}: {
  teacher: Teacher; when: string; subject: SubjectKey; grades: string[]; action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-brand-soft text-sm font-semibold text-brand">{teacher.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{teacher.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
            <span>{when}</span>
            <SubjectBadge subject={subject} />
            {grades.map((g) => <GradeBadge key={g} grade={g} />)}
          </div>
        </div>
      </div>
      {action}
    </div>
  )
}

/** ปุ่มเปิดสารบัญกลับมา (ตอนอยู่โหมดโรงภาพยนตร์) */
export function ShowPanelButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="h-9 gap-1.5 rounded-pill border-line bg-transparent px-3.5 text-sm font-medium text-ink shadow-none hover:bg-surface-2 [&_svg]:size-[18px]">
      <ListVideo size={18} /> แสดงสารบัญ
    </Button>
  )
}

/** แถบแชทสด (ตอนแชทยังปิด) — outline แถวเดียว */
export function LiveChatCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm">
      <MessageSquareText size={20} className="shrink-0 text-brand" />
      <p className="min-w-0 flex-1 text-ink-soft"><span className="font-semibold text-ink">แชทสด</span> · ร่วมพูดคุยกับครูและเพื่อนๆ ที่กำลังดูไลฟ์นี้</p>
      <Button variant="outline" onClick={onOpen} className="h-8 shrink-0 rounded-pill border-line bg-transparent px-3.5 text-xs font-semibold text-ink shadow-none hover:bg-surface-2">
        เปิดแชท
      </Button>
    </div>
  )
}

const tile = 'flex h-auto w-full items-center justify-start gap-3 rounded-xl p-3 text-left shadow-none'

/**
 * เอกสาร + Set your Goal — การ์ดขนาดเท่ากัน เรียงต่อกัน (กว้างสุด ~300px ต่อใบ ไม่ยืดเต็มจอ)
 * Goal เป็นการ์ดใบสุดท้ายในแถวเดียวกัน แทนแถบยาวเต็มกว้าง
 */
export function DocumentsRow({ subject, teacher }: { subject: SubjectKey; teacher: Teacher }) {
  const navigate = useNavigate()
  return (
    <section>
      <h2 className="mb-2 text-[15px] font-semibold text-ink">เอกสารประกอบการเรียน</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,300px))] gap-2">
        {['จำนวนเต็ม (เอกสาร)', 'จำนวนเต็ม (สไลด์)'].map((d) => (
          <Button key={d} variant="outline" className={`${tile} border-line bg-transparent hover:bg-surface-2`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand [&_svg]:size-5"><FileText size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{d}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <SubjectBadge subject={subject} />
                <span className="truncate text-[11px] font-normal text-ink-mute">{teacher.name}</span>
              </div>
            </div>
            <Download size={18} className="text-ink-soft" />
          </Button>
        ))}
        <Button variant="outline" onClick={() => navigate('/goal')} className={`${tile} border-brand/40 bg-brand-soft/60 hover:bg-brand-soft`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white [&_svg]:size-5"><Flag size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Set your Goal!</p>
            <p className="truncate text-[11px] font-normal text-ink-soft">ตั้งเป้าหมาย วางแผนการเรียนของคุณเอง</p>
          </div>
          <ChevronRight size={18} className="text-brand" />
        </Button>
      </div>
    </section>
  )
}
