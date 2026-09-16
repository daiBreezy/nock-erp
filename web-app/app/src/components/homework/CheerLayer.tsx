import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { onlineMembers } from '../../data/homework'

type Cheer = { id: number; name: string; tone: string; left: number; drift: number }

export default function CheerLayer() {
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [total, setTotal] = useState(0)
  const [bump, setBump] = useState(false)
  const seq = useRef(0)

  // จำลอง cheer เข้ามาแบบสุ่ม (ของจริงมาจาก real-time backend)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const spawn = () => {
      const m = onlineMembers[Math.floor(Math.random() * onlineMembers.length)]
      const id = ++seq.current
      setCheers((prev) => [
        ...prev,
        { id, name: m.name, tone: m.tone, left: 60 + Math.random() * 30, drift: (Math.random() - 0.5) * 40 },
      ])
      // ลบออกหลัง animation จบ + นับเพิ่ม
      setTimeout(() => {
        setCheers((prev) => prev.filter((c) => c.id !== id))
        setTotal((t) => t + 1)
        setBump(true)
        setTimeout(() => setBump(false), 350)
      }, 2500)
      timer = setTimeout(spawn, 1500 + Math.random() * 3000)
    }
    timer = setTimeout(spawn, 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {/* กล่องรวม Cheer — มุมขวาบน เล็กๆ ไม่รบกวน focus */}
      <div className="absolute right-5 top-6 flex items-center gap-1.5 rounded-pill bg-surface-1 px-3 py-1.5 shadow-sm">
        <Heart size={16} className={`text-subject-thai-ink ${bump ? 'cheer-bump' : ''}`} />
        <span className="text-sm font-semibold tabular-nums text-ink">{total}</span>
      </div>

      {/* avatar ลอยขึ้น */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {cheers.map((c) => (
          <div
            key={c.id}
            className={`cheer-float absolute bottom-32 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-medium shadow-sm ${c.tone}`}
            style={{ left: `${c.left}%`, ['--drift' as string]: `${c.drift}px` }}
          >
            {c.name}
          </div>
        ))}
      </div>
    </>
  )
}
