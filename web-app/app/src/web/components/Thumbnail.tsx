import { Radio } from 'lucide-react'

type Variant = 'live' | 'live-started' | 'lesson'

/**
 * Thumbnail 3 แบบตาม design ref:
 * - live         : ไลฟ์ตั้งเวลา (ยังไม่เริ่ม) → รูปคมชัด
 * - live-started : ไลฟ์กำลังสด → รูปเบลอ + ป้าย Live กลาง
 * - lesson       : คลิปบทเรียน → มีการ์ดซ้อนด้านหลัง (stacked)
 */
export default function Thumbnail({
  src, variant = 'live', className = '', rounded = 'rounded-card', children,
}: {
  src: string; variant?: Variant; className?: string; rounded?: string; children?: React.ReactNode
}) {
  if (variant === 'lesson') {
    return (
      <div className={`relative ${className}`}>
        {/* การ์ดซ้อนด้านหลัง */}
        <div className={`absolute -top-1.5 left-2 right-2 h-4 ${rounded} bg-brand-soft`} />
        <div className={`relative aspect-video overflow-hidden ${rounded} bg-surface-2 shadow-sm`}>
          <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          {children}
        </div>
      </div>
    )
  }

  const started = variant === 'live-started'
  return (
    <div className={`relative aspect-video overflow-hidden ${rounded} bg-surface-2 ${className}`}>
      <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${started ? 'scale-105 blur-[3px] brightness-90' : ''}`} />
      {started && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-1.5 rounded-pill bg-live px-3 py-1.5 text-xs font-semibold text-white shadow">
            <Radio size={13} /> Live
          </span>
        </span>
      )}
      {children}
    </div>
  )
}
