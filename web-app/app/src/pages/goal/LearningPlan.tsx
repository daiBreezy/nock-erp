import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'
import { planDurations, planTimes } from '../../data/goal'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

export default function LearningPlan() {
  const navigate = useNavigate()
  const [duration, setDuration] = useState<string | null>(null)
  const [minutes, setMinutes] = useState<number>(30)
  const [slots, setSlots] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const toggleSlot = (s: string) => setSlots((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))
  const ready = duration && slots.length > 0

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10"><Check size={40} className="text-success" /></div>
        <h1 className="mt-5 text-xl font-semibold text-ink">สร้างแผนเรียนแล้ว!</h1>
        <p className="mt-2 max-w-xs text-sm text-ink-soft">แผน {duration?.split(' ')[0]} · วันละ {minutes} นาที ในช่วง {slots.join(', ')} ถูกบันทึกแล้ว</p>
        <Button onClick={() => navigate('/', { replace: true })} className="mt-8 h-auto w-full max-w-xs rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark">ไปหน้าหลัก</Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent"><ChevronLeft size={24} /></Button>
        <h1 className="text-lg font-semibold text-ink">สร้างแผนการเรียน</h1>
      </header>

      <div className="space-y-6 px-4 pt-4">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">ระยะเวลา</h2>
          <div className="space-y-2.5">
            {planDurations.map((d) => (
              <Button key={d} variant="outline" onClick={() => setDuration(d)} className={`h-auto w-full justify-start rounded-card border p-4 text-left text-sm font-medium ${duration === d ? 'border-brand bg-brand-soft text-ink hover:bg-brand-soft' : 'border-line bg-surface-1 text-ink-soft hover:bg-surface-2'}`}>{d}</Button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">เวลาเรียน/วัน · {minutes} นาที</h2>
          <Slider min={10} max={120} step={5} value={[minutes]} onValueChange={([v]) => setMinutes(v)} aria-label="เวลาเรียนต่อวัน (นาที)" className="py-2 [&_.bg-primary]:bg-brand [&_[role=slider]]:border-brand" />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink">ช่วงเวลาที่สะดวก</h2>
          <div className="flex flex-wrap gap-2">
            {planTimes.map((t) => (
              <Button key={t} variant={slots.includes(t) ? 'default' : 'outline'} onClick={() => toggleSlot(t)} className={`h-auto rounded-pill px-4 py-2 text-sm font-medium ${slots.includes(t) ? '' : 'border-line bg-surface-1 text-ink-soft hover:bg-surface-2'}`}>{t}</Button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-auto pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-surface-1 p-4 md:static md:z-auto">
        <Button onClick={() => setDone(true)} disabled={!ready} className="h-auto w-full rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark disabled:opacity-40">สร้างแผนเรียน</Button>
      </div>
    </div>
  )
}
