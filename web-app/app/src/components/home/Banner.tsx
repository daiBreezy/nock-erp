import { useEffect, useRef, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { banners } from '../../data/mock'
import { subjectBg, subjectText } from '../../lib/subject'

export default function Banner() {
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const paused = useRef(false)

  // auto-scroll ทุก 4.5 วิ หยุดเมื่อ user แตะ/ปัด
  useEffect(() => {
    const t = setInterval(() => {
      if (paused.current) return
      setIndex((i) => (i + 1) % banners.length)
    }, 4500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }, [index])

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <section className="px-4 pt-3">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={() => (paused.current = true)}
        onPointerUp={() => (paused.current = false)}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {banners.map((b) => (
          <div key={b.id} className="w-full shrink-0 snap-center pr-0">
            <div
              className={`${subjectBg[b.subject]} flex h-32 items-center justify-center rounded-card`}
            >
              <div className={`text-center ${subjectText[b.subject]}`}>
                <FlaskConical className="mx-auto" size={26} />
                <p className="mt-1.5 text-[15px] font-semibold">{b.title}</p>
                <p className="mt-0.5 text-xs opacity-90">{b.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {banners.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-4 bg-brand' : 'w-1.5 bg-line'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
