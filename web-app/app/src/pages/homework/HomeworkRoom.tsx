import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Circle } from 'lucide-react'
import { focusSubjects, presetDurations, onlineMembers } from '../../data/homework'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const QUICK_KEY = 'nock.quickDurations'

function loadQuick(): number[] {
  try {
    return JSON.parse(localStorage.getItem(QUICK_KEY) || '[]')
  } catch {
    return []
  }
}

// chip วิชาที่เลือก: คงสีวิชาไว้ตอน hover (ToggleGroup ตั้ง hover:bg-muted ไว้) — เขียนคลาสเต็มให้ Tailwind เห็น
const keepBgOnHover: Record<string, string> = {
  'bg-subject-math': 'hover:bg-subject-math hover:text-subject-math-ink',
  'bg-subject-english': 'hover:bg-subject-english hover:text-subject-english-ink',
  'bg-subject-thai': 'hover:bg-subject-thai hover:text-subject-thai-ink',
  'bg-subject-science': 'hover:bg-subject-science hover:text-subject-science-ink',
}

export default function HomeworkRoom() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState(focusSubjects[0].key)
  const [minutes, setMinutes] = useState<number | null>(30)
  const [quick, setQuick] = useState<number[]>(loadQuick)
  const [customOpen, setCustomOpen] = useState(false)
  const [customVal, setCustomVal] = useState('')

  const shown = onlineMembers.slice(0, 40)

  const addQuick = () => {
    const v = parseInt(customVal, 10)
    if (!v || v <= 0) return
    setMinutes(v)
    if (!quick.includes(v) && !presetDurations.includes(v)) {
      const next = [...quick, v].sort((a, b) => a - b)
      setQuick(next)
      localStorage.setItem(QUICK_KEY, JSON.stringify(next))
    }
    setCustomOpen(false)
    setCustomVal('')
  }

  const start = () =>
    navigate('/homework/focus', { state: { subject, minutes } })

  const allDurations = [...presetDurations, ...quick]

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent">
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-lg font-semibold text-ink">ห้องทำการบ้าน</h1>
      </header>

      {/* รายชื่อออนไลน์ */}
      <section className="px-4 pt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-ink-soft">
          <Circle size={8} className="fill-success text-success" />
          {onlineMembers.length} คนกำลังเรียนอยู่ตอนนี้
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {shown.map((m) => (
            <button
              key={m.id}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-medium ${m.tone}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </section>

      {/* เลือกวิชา */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-base font-semibold text-ink">เลือกวิชา</h2>
        <ToggleGroup type="single" value={subject} onValueChange={(v) => v && setSubject(v as typeof subject)} className="flex-wrap justify-start gap-2">
          {focusSubjects.map((s) => (
            <ToggleGroupItem
              key={s.key}
              value={s.key}
              className={`h-auto rounded-pill border px-4 py-2 text-sm font-medium transition ${
                s.key === subject ? `${s.tone} ${keepBgOnHover[s.tone.split(' ')[0]] ?? ''} border-transparent ring-2 ring-brand` : 'border-line bg-surface-1 text-ink-soft hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {s.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </section>

      {/* เลือกเวลา */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-base font-semibold text-ink">ตั้งเวลาโฟกัส</h2>
        <div className="flex flex-wrap gap-2">
          <ToggleGroup
            type="single"
            value={minutes === null ? 'none' : String(minutes)}
            onValueChange={(v) => v && setMinutes(v === 'none' ? null : Number(v))}
            className="contents"
          >
            {[...allDurations.map((d) => ({ v: String(d), label: `${d} นาที` })), { v: 'none', label: 'ไม่จับเวลา' }].map((o) => (
              <ToggleGroupItem
                key={o.v}
                value={o.v}
                className="h-auto rounded-pill border border-line bg-surface-1 px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-2 hover:text-ink data-[state=on]:border-transparent data-[state=on]:bg-brand data-[state=on]:text-white data-[state=on]:hover:bg-brand-dark data-[state=on]:hover:text-white"
              >
                {o.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            variant="outline"
            onClick={() => setCustomOpen(true)}
            className="h-auto gap-1 rounded-pill border-dashed border-line bg-surface-1 px-4 py-2 text-sm font-medium text-ink-soft shadow-none hover:bg-surface-2"
          >
            <Plus size={16} /> กำหนดเอง
          </Button>
        </div>

        {customOpen && (
          <div className="mt-3 flex items-center gap-2">
            <Input
              type="number"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              placeholder="จำนวนนาที"
              className="h-11 w-32 rounded-xl border-line bg-surface-1 text-sm focus-visible:ring-2 focus-visible:ring-brand"
            />
            <Button
              onClick={addQuick}
              className="h-11 rounded-xl bg-brand px-4 text-sm font-medium hover:bg-brand-dark"
            >
              เพิ่มเป็น Quick
            </Button>
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="sticky bottom-0 z-10 mt-auto pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-surface-1 p-4">
        <Button
          onClick={start}
          className="h-auto w-full rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark active:scale-[0.99]"
        >
          เริ่มโฟกัส{minutes ? ` · ${minutes} นาที` : ''}
        </Button>
      </div>
    </div>
  )
}
