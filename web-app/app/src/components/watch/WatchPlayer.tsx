import { ChevronLeft, Maximize, Play, Radio, Settings, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * ตัวเล่นวิดีโอ (แบบ YouTube) — กรอบดำ 16:9 · ไลฟ์มีป้าย LIVE + คนดู
 * fitHeight: จอใหญ่ไม่ให้วิดีโอสูงเกินจอ (ย่อกว้างลงแล้วจัดกลางบนพื้นดำ)
 */
export default function WatchPlayer({
  src, live = false, time, onBack, fitHeight = false, viewMode, className,
}: {
  src: string; live?: boolean; time?: string; onBack?: () => void; fitHeight?: boolean
  /** ปุ่มสลับมุมมอง (แบบ YouTube): ปกติ = มีแผงข้าง · โรงภาพยนตร์ = ซ่อนแผง วิดีโอเต็มกว้าง */
  viewMode?: { theater: boolean; onToggle: () => void }
  className?: string
}) {
  return (
    <div className={cn('bg-black', className)}>
      <div className={cn('relative mx-auto aspect-video w-full overflow-hidden', fitHeight && 'max-w-[min(100%,calc((100vh_-_300px)*16/9))]')}>
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/50 to-transparent p-3 text-white">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="ย้อนกลับ" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white [&_svg]:size-[18px]">
              <ChevronLeft size={18} />
            </Button>
          )}
          {live && (
            <span className="flex items-center gap-1 rounded bg-live px-2 py-0.5 text-[11px] font-semibold">
              <Radio size={11} /> LIVE
            </span>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Button variant="ghost" size="icon" aria-label="เล่น" className="h-16 w-16 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white [&_svg]:size-7">
            <Play size={28} className="ml-1" fill="currentColor" />
          </Button>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2 pt-6 text-white">
          <div className="mb-2 h-1 rounded-full bg-white/30">
            <div className={cn('h-full rounded-full bg-live', live ? 'w-full' : 'w-1/3')} />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Play size={18} fill="currentColor" />
            <Volume2 size={18} />
            {live ? (
              <span className="flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-full bg-live" /> สด</span>
            ) : (
              <span className="text-xs">{time ?? '0:00'}</span>
            )}
            <span className="ml-auto flex items-center gap-3">
              <Settings size={18} />
              {viewMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={viewMode.onToggle}
                  aria-label={viewMode.theater ? 'มุมมองปกติ' : 'โหมดโรงภาพยนตร์'}
                  title={viewMode.theater ? 'มุมมองปกติ' : 'โหมดโรงภาพยนตร์'}
                  className="h-7 w-7 text-white hover:bg-white/15 hover:text-white [&_svg]:size-5"
                >
                  <ViewModeIcon theater={viewMode.theater} />
                </Button>
              )}
              <Maximize size={18} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** ไอคอนสลับมุมมอง (กรอบสี่เหลี่ยม + ลูกศร) — ตอนโรงภาพยนตร์ ลูกศรชี้เข้า >< (กลับมุมมองปกติ) · ตอนปกติ ลูกศรชี้ออก <> */
function ViewModeIcon({ theater }: { theater: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      {theater ? (
        <>
          <path d="M7 9.5 9.5 12 7 14.5" />
          <path d="M17 9.5 14.5 12 17 14.5" />
        </>
      ) : (
        <>
          <path d="M9.5 9.5 7 12l2.5 2.5" />
          <path d="M14.5 9.5 17 12l-2.5 2.5" />
        </>
      )}
    </svg>
  )
}
