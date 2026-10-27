import { ChevronLeft, Eye, Maximize, Play, Radio, Settings, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * ตัวเล่นวิดีโอ (แบบ YouTube) — กรอบดำ 16:9 · ไลฟ์มีป้าย LIVE + คนดู
 * fitHeight: จอใหญ่ไม่ให้วิดีโอสูงเกินจอ (ย่อกว้างลงแล้วจัดกลางบนพื้นดำ)
 */
export default function WatchPlayer({
  src, live = false, viewers, time, onBack, fitHeight = false, className,
}: {
  src: string; live?: boolean; viewers?: string; time?: string; onBack?: () => void; fitHeight?: boolean; className?: string
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
          {viewers && (
            <span className="flex items-center gap-1 rounded bg-black/50 px-2 py-0.5 text-[11px] font-medium">
              <Eye size={11} /> {viewers}
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
            <span className="text-xs">{live ? '● สด' : time ?? '0:00'}</span>
            <span className="ml-auto flex items-center gap-3"><Settings size={18} /><Maximize size={18} /></span>
          </div>
        </div>
      </div>
    </div>
  )
}
