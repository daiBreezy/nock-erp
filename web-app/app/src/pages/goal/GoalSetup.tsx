import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { goalSubjects, targetSchools, grades, moods, type GoalType } from '../../data/goal'

// ในแอป = Student เท่านั้น (Parent journey อยู่บน Web)
export default function GoalSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<GoalType | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [school, setSchool] = useState<string | null>(null)
  const [grade, setGrade] = useState<string | null>(null)
  const [mood, setMood] = useState<number | null>(null)

  const totalSteps = 4
  const back = () => setStep((s) => Math.max(0, s - 1))
  const exit = () => navigate('/goals') // ยกเลิกการสร้าง Goal
  const next = () => setStep((s) => s + 1)
  const finish = () => navigate('/goal/test', { state: { goal, subjects, school, grade } })

  // เลือกแล้วไปข้อถัดไปทันที (single-select) — หน่วงนิดให้เห็น state ที่เลือก
  const pick = (fn: () => void, last = false) => { fn(); setTimeout(last ? finish : next, 200) }

  const toggleSubject = (k: string) =>
    setSubjects((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))

  const showFooter = step === 1 && goal === 'improve' // เลือกหลายวิชา → ต้องกดถัดไป

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <header className="flex items-center gap-3 px-4 py-3">
        {step > 0 ? (
          <button onClick={back} aria-label="ย้อนกลับ" className="text-ink hover:text-brand"><ChevronLeft size={24} /></button>
        ) : (
          <span className="w-6" />
        )}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
        <button onClick={exit} aria-label="ออกจากการสร้าง Goal" className="text-ink-mute hover:text-ink"><X size={22} /></button>
      </header>

      <div className="flex-1 px-5 pb-8 pt-4">
        {step === 0 && (
          <>
            <h1 className="text-xl font-semibold text-ink">เป้าหมายคืออะไร?</h1>
            <p className="mt-1 text-sm text-ink-soft">เพื่อปรับคำแนะนำให้เหมาะกับคุณ</p>
            <div className="mt-6 space-y-3">
              {[
                { v: 'improve' as GoalType, label: 'เพิ่มคะแนนสอบ', desc: 'ดึงคะแนนวิชาที่อยากพัฒนา' },
                { v: 'entrance' as GoalType, label: 'สอบเข้า', desc: 'เตรียมสอบเข้าโรงเรียนเป้าหมาย' },
              ].map((o) => (
                <button key={o.v} onClick={() => pick(() => setGoal(o.v))} className={`w-full rounded-card border p-4 text-left transition ${goal === o.v ? 'border-brand bg-brand-soft' : 'border-line bg-surface-1 hover:border-brand/50'}`}>
                  <p className="text-sm font-medium text-ink">{o.label}</p><p className="text-xs text-ink-soft">{o.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && goal === 'improve' && (
          <>
            <h1 className="text-xl font-semibold text-ink">เลือกวิชาที่อยากพัฒนา</h1>
            <p className="mt-1 text-sm text-ink-soft">เลือกได้หลายวิชา</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {goalSubjects.map((s) => (
                <button key={s.key} onClick={() => toggleSubject(s.key)} className={`rounded-pill px-4 py-2 text-sm font-medium ${subjects.includes(s.key) ? 'bg-brand text-white' : 'border border-line bg-surface-1 text-ink-soft'}`}>{s.label}</button>
              ))}
            </div>
          </>
        )}

        {step === 1 && goal === 'entrance' && (
          <>
            <h1 className="text-xl font-semibold text-ink">โรงเรียนเป้าหมาย</h1>
            <div className="mt-6 space-y-2.5">
              {targetSchools.map((s) => (
                <button key={s} onClick={() => pick(() => setSchool(s))} className={`w-full rounded-card border p-4 text-left text-sm font-medium transition ${school === s ? 'border-brand bg-brand-soft text-ink' : 'border-line bg-surface-1 text-ink-soft hover:border-brand/50'}`}>{s}</button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-semibold text-ink">ระดับชั้น</h1>
            <div className="mt-6 flex flex-wrap gap-2">
              {grades.map((g) => (
                <button key={g} onClick={() => pick(() => setGrade(g))} className={`rounded-pill px-4 py-2 text-sm font-medium transition ${grade === g ? 'bg-brand text-white' : 'border border-line bg-surface-1 text-ink-soft hover:border-brand/50'}`}>{g}</button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-xl font-semibold text-ink">คุณมั่นใจแค่ไหน?</h1>
            <p className="mt-1 text-sm text-ink-soft">ช่วยให้เราปรับแผนให้เหมาะ</p>
            <div className="mt-8 flex justify-between">
              {moods.map((m) => (
                <button key={m.v} onClick={() => pick(() => setMood(m.v), true)} className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition ${mood === m.v ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}>
                  <span className="text-3xl">{m.emoji}</span>
                  <span className={`text-[11px] ${mood === m.v ? 'font-medium text-brand' : 'text-ink-mute'}`}>{m.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {showFooter && (
        <div className="border-t border-line p-4">
          <button
            onClick={next}
            disabled={subjects.length === 0}
            className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      )}
    </div>
  )
}
