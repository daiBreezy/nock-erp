import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { activeDays } from '../../data/profile'
import { Button } from '@/components/ui/button'

const typeColor: Record<string, string> = {
  homework: '#4F46E5',
  live: '#E24B4A',
  video: '#1D9E75',
  exam: '#BA7517',
}

const monthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export default function UsageCalendar() {
  const today = new Date(2026, 5, 26) // มิ.ย. 2026 (เดือนปัจจุบันใน mock)
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear()

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prev} aria-label="เดือนก่อนหน้า" className="h-auto shadow-none [&_svg]:size-auto w-auto p-0 hover:bg-transparent text-ink-soft"><ChevronLeft size={20} /></Button>
        <span className="text-sm font-medium text-ink">{monthNames[month]} {year + 543}</span>
        <Button variant="ghost" size="icon" onClick={next} aria-label="เดือนถัดไป" className="h-auto shadow-none [&_svg]:size-auto w-auto p-0 hover:bg-transparent text-ink-soft"><ChevronRight size={20} /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((d) => (
          <span key={d} className="py-1 text-[11px] text-ink-mute">{d}</span>
        ))}
        {cells.map((day, i) => {
          const types = isCurrentMonth && day ? activeDays[day] : undefined
          const isToday = isCurrentMonth && day === today.getDate()
          return (
            <div key={i} className="flex aspect-square flex-col items-center justify-center rounded-lg">
              {day && (
                <div className={`flex h-full w-full flex-col items-center justify-center rounded-lg ${isToday ? 'bg-brand-soft' : ''}`}>
                  <span className={`text-xs ${isToday ? 'font-semibold text-brand' : 'text-ink'}`}>{day}</span>
                  <div className="mt-0.5 flex gap-0.5">
                    {types?.slice(0, 4).map((t, k) => (
                      <span key={k} className="h-1 w-1 rounded-full" style={{ background: typeColor[t] }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
