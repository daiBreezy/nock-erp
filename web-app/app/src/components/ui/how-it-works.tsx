import { useLayoutEffect, useRef, useState } from 'react'
import { Pin } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * How it works — การ์ดโน้ตปักหมุด เอียงสลับซ้าย/ขวา + เส้นประเชื่อมการ์ด
 * ปรับจาก prompt ต้นฉบับ (เจ้าของเลือกใช้กับ "ฟีเจอร์ของเรา" 2026-10-27):
 * - ใส่รูปในการ์ดได้ (image) — ต้นฉบับไม่มีรูป · การ์ดไม่มีรูป = การ์ดเตี้ย ข้อความกลาง (เช่น "และ Feature อื่นๆ")
 * - ไม่มีเลขลำดับ · เส้นประนิ่ง (ไม่วิ่ง) · ไม่ใช้ motion
 * - Tailwind v3 (rotate-[4deg] แทน rotate-8) · ตำแหน่งการ์ดไหลตามเนื้อหา + วัดตำแหน่งจริงวาดเส้น (ต้นฉบับล็อกความสูง 1130px)
 * - สีแบรนด์ / สีวิชา · ฟอนต์ของแอป · ไม่มี dark mode
 */

export type StepTheme = 'pink' | 'blue' | 'purple' | 'amber'

export interface Step {
  title: string
  description?: string
  image?: string
  imageAlt?: string
  theme?: StepTheme
}

const THEME: Record<StepTheme, { bg: string; text: string; border: string }> = {
  pink: { bg: 'bg-brand-soft/60', text: 'text-brand', border: 'border-brand/15' },
  blue: { bg: 'bg-subject-english', text: 'text-subject-english-ink', border: 'border-subject-english-ink/10' },
  purple: { bg: 'bg-subject-science', text: 'text-subject-science-ink', border: 'border-subject-science-ink/10' },
  amber: { bg: 'bg-subject-math', text: 'text-subject-math-ink', border: 'border-subject-math-ink/10' },
}

function Card({ step, rotate }: { step: Step; rotate: string }) {
  const t = THEME[step.theme ?? 'pink']
  return (
    <div className={cn('relative w-full transition-transform duration-300 hover:z-30 hover:rotate-0 hover:scale-[1.03] md:w-[360px] xl:w-full', rotate)}>
      <div className="rounded-[25px] border border-line bg-white p-2 shadow-[0_10px_24px_0_rgba(0,0,0,0.10)]">
        <Pin className={cn('mx-auto mb-3 mt-1 size-7 fill-current', t.text)} />
        {step.image ? (
          <div className={cn('relative flex flex-col overflow-hidden rounded-[15px] border', t.bg, t.border)}>
            <div className="px-5 pt-5">
              <h3 className="text-[21px] font-bold leading-tight text-ink">{step.title}</h3>
              {step.description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{step.description}</p>}
            </div>
            {/* รูป (เช่น iPad) โผล่จากขอบล่างการ์ด — การ์ดสูงพอให้เห็นหน้าจอเกือบเต็ม */}
            <div className="relative mt-4 h-[300px] overflow-hidden">
              <img src={step.image} alt={step.imageAlt ?? ''} loading="lazy" className="absolute left-1/2 top-0 w-[88%] -translate-x-1/2" />
            </div>
          </div>
        ) : (
          <div className={cn('grid min-h-[120px] place-items-center rounded-[15px] border px-5 py-6 text-center', t.bg, t.border)}>
            <div>
              <h3 className={cn('text-[21px] font-bold leading-tight', t.text)}>{step.title}</h3>
              {step.description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">{step.description}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// จอกว้าง (xl) = 3 คอลัมน์ เรียงแบบงู: แถวคี่ซ้าย→ขวา แถวคู่ขวา→ซ้าย (การ์ดถัดไปอยู่ใต้ใบก่อนหน้าเสมอ)
const XL_ORDER = ['xl:order-1', 'xl:order-2', 'xl:order-3', 'xl:order-4', 'xl:order-5', 'xl:order-6', 'xl:order-7', 'xl:order-8', 'xl:order-9']
const xlSlot = (i: number) => {
  const row = Math.floor(i / 3)
  const col = row % 2 === 0 ? i % 3 : 2 - (i % 3)
  return { col, order: row * 3 + col }
}

export default function HowItWorks({ steps, className }: { steps: Step[]; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const [path, setPath] = useState<{ d: string; w: number; h: number } | null>(null)
  const [padBottom, setPadBottom] = useState(0)

  // วัดตำแหน่งการ์ดจริง → วาดเส้นโค้งจากขอบการ์ดหนึ่งไปอีกใบ (จอ md ขึ้นไป)
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const draw = () => {
      const b = box.getBoundingClientRect()
      const rects = cardRefs.current.slice(0, steps.length).map((el) => el?.getBoundingClientRect())
      // การ์ดสุดท้ายในลำดับอาจเตี้ยกว่าใบข้างๆ → เติมที่ว่างด้านล่างให้ใบที่ยื่นต่ำสุดไม่โดนตัด
      const flowBottom = Math.max(...rects.map((r) => (r ? r.bottom : 0)))
      const lastBottom = rects[rects.length - 1]?.bottom ?? flowBottom
      setPadBottom(window.innerWidth >= 768 && window.innerWidth < 1280 ? Math.max(0, flowBottom - lastBottom) : 0)
      if (window.innerWidth < 768) return setPath(null)
      let d = ''
      for (let i = 0; i < rects.length - 1; i++) {
        const a = rects[i]
        const c = rects[i + 1]
        if (!a || !c) continue
        const ax = a.left + a.width / 2
        const cx = c.left + c.width / 2
        if (Math.abs(ax - cx) < a.width / 2) {
          // ใบถัดไปอยู่ข้างล่าง → ลากจากขอบล่างลงขอบบน
          const x1 = ax - b.left, y1 = a.bottom - b.top, x2 = cx - b.left, y2 = c.top - b.top
          const dy = (y2 - y1) * 0.5
          d += `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2} `
          continue
        }
        const toRight = cx > ax
        const x1 = (toRight ? a.right : a.left) - b.left
        const y1 = a.top + Math.min(a.height * 0.3, 140) - b.top
        const x2 = (toRight ? c.left : c.right) - b.left
        const y2 = c.top + Math.min(c.height * 0.3, 140) - b.top
        const dx = (x2 - x1) * 0.5
        d += `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2} `
      }
      setPath({ d, w: b.width, h: b.height })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(box)
    window.addEventListener('resize', draw)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', draw)
    }
  }, [steps.length])

  return (
    // py เผื่อมุมการ์ดที่เอียงล้นขึ้น/ลง ไม่ให้โดนตัด
    <div className={cn('relative overflow-hidden py-8', className)}>
      {/* พื้นเส้นบรรทัดแบบสมุด (ห่าง 48px) จางเฉพาะขอบซ้าย/ขวาสุด */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 48px' }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[12%] bg-gradient-to-r from-white" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[12%] bg-gradient-to-l from-white" />

      <div
        ref={boxRef}
        style={{ paddingBottom: padBottom || undefined }}
        className="relative mx-auto flex max-w-[1000px] flex-col gap-8 md:gap-0 xl:grid xl:max-w-[1120px] xl:grid-cols-3 xl:items-start xl:gap-x-14 xl:gap-y-20"
      >
        {path && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden md:block" width={path.w} height={path.h}>
            <path d={path.d} className="text-ink-mute/60" stroke="currentColor" strokeWidth="2" strokeDasharray="8 6" strokeLinecap="round" fill="none" />
          </svg>
        )}
        {steps.map((s, i) => {
          const left = i % 2 === 0
          const xl = xlSlot(i)
          return (
            <div
              key={s.title}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
              className={cn(
                'relative z-10 w-full md:w-auto',
                // md–lg: ซ้าย/ขวาสลับ เกยการ์ดฝั่งตรงข้ามไม่เกินครึ่งใบ (การ์ดฝั่งเดียวกันไม่ทับกัน)
                left ? 'md:ml-[8%] md:self-start' : 'md:mr-[8%] md:self-end',
                i > 0 && 'md:-mt-52',
                // xl: 3 คอลัมน์ · คอลัมน์กลางเลื่อนลงเล็กน้อยให้ดูไม่แข็ง
                'xl:m-0 xl:w-full xl:self-auto',
                XL_ORDER[xl.order],
                xl.col === 1 && 'xl:mt-14',
              )}
            >
              <Card step={s} rotate={left ? 'md:rotate-[4deg]' : 'md:-rotate-[4deg]'} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
