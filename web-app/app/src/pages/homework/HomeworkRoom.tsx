import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Circle } from 'lucide-react'
import { focusSubjects, presetDurations, onlineMembers } from '../../data/homework'

const QUICK_KEY = 'nock.quickDurations'

function loadQuick(): number[] {
  try {
    return JSON.parse(localStorage.getItem(QUICK_KEY) || '[]')
  } catch {
    return []
  }
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
    <div className="min-h-screen bg-surface-0 pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink">
          <ChevronLeft size={24} />
        </button>
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
        <div className="flex flex-wrap gap-2">
          {focusSubjects.map((s) => {
            const active = s.key === subject
            return (
              <button
                key={s.key}
                onClick={() => setSubject(s.key)}
                className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
                  active ? s.tone + ' ring-2 ring-brand' : 'bg-surface-1 text-ink-soft border border-line'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* เลือกเวลา */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-base font-semibold text-ink">ตั้งเวลาโฟกัส</h2>
        <div className="flex flex-wrap gap-2">
          {allDurations.map((d) => (
            <button
              key={d}
              onClick={() => setMinutes(d)}
              className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
                minutes === d ? 'bg-brand text-white' : 'bg-surface-1 text-ink-soft border border-line'
              }`}
            >
              {d} นาที
            </button>
          ))}
          <button
            onClick={() => setMinutes(null)}
            className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
              minutes === null ? 'bg-brand text-white' : 'bg-surface-1 text-ink-soft border border-line'
            }`}
          >
            ไม่จับเวลา
          </button>
          <button
            onClick={() => setCustomOpen(true)}
            className="flex items-center gap-1 rounded-pill border border-dashed border-line bg-surface-1 px-4 py-2 text-sm font-medium text-ink-soft"
          >
            <Plus size={16} /> กำหนดเอง
          </button>
        </div>

        {customOpen && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              placeholder="จำนวนนาที"
              className="h-11 w-32 rounded-xl border border-line bg-surface-1 px-3 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              onClick={addQuick}
              className="h-11 rounded-xl bg-brand px-4 text-sm font-medium text-white"
            >
              เพิ่มเป็น Quick
            </button>
          </div>
        )}
      </section>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[440px] border-t border-line bg-surface-1 p-4">
        <button
          onClick={start}
          className="flex w-full items-center justify-center rounded-2xl bg-brand py-4 text-base font-semibold text-white active:scale-[0.99]"
        >
          เริ่มโฟกัส{minutes ? ` · ${minutes} นาที` : ''}
        </button>
      </div>
    </div>
  )
}
