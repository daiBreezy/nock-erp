import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { goalSubjects, targetSchools, grades, moods, type GoalType } from '../../data/goal'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

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
          <Button variant="ghost" size="icon" onClick={back} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent hover:text-brand"><ChevronLeft size={24} /></Button>
        ) : (
          <span className="w-6" />
        )}
        <Progress value={((step + 1) / totalSteps) * 100} className="h-1.5 flex-1 bg-surface-2" indicatorClassName="bg-brand" />
        <Button variant="ghost" size="icon" onClick={exit} aria-label="ออกจากการสร้าง Goal" className="h-8 w-8 text-ink-mute hover:bg-transparent hover:text-ink"><X size={22} /></Button>
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
                <Button key={o.v} variant="outline" onClick={() => pick(() => setGoal(o.v))} className={`h-auto w-full flex-col items-start gap-0 whitespace-normal rounded-card border p-4 text-left ${goal === o.v ? 'border-brand bg-brand-soft hover:bg-brand-soft' : 'border-line bg-surface-1 hover:border-brand/50 hover:bg-surface-1'}`}>
                  <p className="text-sm font-medium text-ink">{o.label}</p><p className="text-xs font-normal text-ink-soft">{o.desc}</p>
                </Button>
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
                <Button key={s.key} variant={subjects.includes(s.key) ? 'default' : 'outline'} onClick={() => toggleSubject(s.key)} className={`h-auto rounded-pill px-4 py-2 text-sm font-medium ${subjects.includes(s.key) ? '' : 'border-line bg-surface-1 text-ink-soft hover:bg-surface-2'}`}>{s.label}</Button>
              ))}
            </div>
          </>
        )}

        {step === 1 && goal === 'entrance' && (
          <>
            <h1 className="text-xl font-semibold text-ink">โรงเรียนเป้าหมาย</h1>
            <div className="mt-6 space-y-2.5">
              {targetSchools.map((s) => (
                <Button key={s} variant="outline" onClick={() => pick(() => setSchool(s))} className={`h-auto w-full justify-start rounded-card border p-4 text-left text-sm font-medium ${school === s ? 'border-brand bg-brand-soft text-ink hover:bg-brand-soft' : 'border-line bg-surface-1 text-ink-soft hover:border-brand/50 hover:bg-surface-1'}`}>{s}</Button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-semibold text-ink">ระดับชั้น</h1>
            <div className="mt-6 flex flex-wrap gap-2">
              {grades.map((g) => (
                <Button key={g} variant={grade === g ? 'default' : 'outline'} onClick={() => pick(() => setGrade(g))} className={`h-auto rounded-pill px-4 py-2 text-sm font-medium ${grade === g ? '' : 'border-line bg-surface-1 text-ink-soft hover:bg-surface-2'}`}>{g}</Button>
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
                  <m.Icon size={30} strokeWidth={1.75} />
                  <span className={`text-[11px] ${mood === m.v ? 'font-medium text-brand' : 'text-ink-mute'}`}>{m.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {showFooter && (
        <div className="border-t border-line p-4">
          <Button
            onClick={next}
            disabled={subjects.length === 0}
            className="h-auto w-full rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark disabled:opacity-40"
          >
            ถัดไป
          </Button>
        </div>
      )}
    </div>
  )
}
