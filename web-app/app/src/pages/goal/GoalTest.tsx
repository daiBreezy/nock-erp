import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'
import { buildGoalTest, cutScenes } from '../../data/goal'

export default function GoalTest() {
  const navigate = useNavigate()
  const questions = useMemo(() => buildGoalTest(10), [])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [cut, setCut] = useState<number | null>(null)
  const [confirmSkip, setConfirmSkip] = useState(false)

  const goResult = (complete: boolean) =>
    navigate('/goal/result', { replace: true, state: { complete, answered: Object.keys(answers).length } })

  const choose = (ci: number) => {
    const answered = current + 1
    setAnswers((p) => ({ ...p, [current]: ci }))
    setTimeout(() => {
      if (cutScenes[answered]) setCut(answered)
      else setCurrent(answered)
    }, 160)
  }

  const dismissCut = () => {
    if (cut === 10) return goResult(true)
    const c = cut
    setCut(null)
    setCurrent(c as number)
  }

  const q = questions[current]

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="ออก" className="text-ink-soft"><X size={22} /></button>
        <span className="text-sm text-ink-soft">{current + 1}/10</span>
      </header>
      <div className="h-1.5 bg-surface-2"><div className="h-full bg-brand transition-all" style={{ width: `${((current + 1) / 10) * 100}%` }} /></div>

      <div className="flex-1 px-5 pb-8 pt-6">
        <p className="text-xs font-medium text-brand">คำถามที่ {current + 1}</p>
        <p className="mt-2 text-lg font-medium text-ink">{q.text}</p>
        <div className="mt-6 space-y-3">
          {q.choices.map((c, ci) => (
            <button key={ci} onClick={() => choose(ci)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${answers[current] === ci ? 'border-brand bg-brand-soft' : 'border-line bg-surface-1'}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${answers[current] === ci ? 'bg-brand text-white' : 'bg-surface-2 text-ink-soft'}`}>{['ก', 'ข', 'ค', 'ง'][ci]}</span>
              <span className="text-sm text-ink">{c}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cut-scene */}
      {cut && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-[400px] rounded-3xl bg-surface-1 p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-subject-science">
              <Sparkles size={28} className="text-subject-science-ink" />
            </div>
            <p className="text-lg font-semibold text-ink">{cutScenes[cut].title}</p>
            <p className="mt-1.5 text-sm text-ink-soft">{cutScenes[cut].detail}</p>

            {cutScenes[cut].skippable ? (
              <div className="mt-6 space-y-2.5">
                <button onClick={dismissCut} className="w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white">ทำต่อให้ครบ</button>
                <button onClick={() => setConfirmSkip(true)} className="w-full rounded-2xl border border-line py-3 text-sm font-medium text-ink-soft">ดูผลเบื้องต้น</button>
              </div>
            ) : (
              <button onClick={dismissCut} className="mt-6 w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white">
                {cut === 10 ? 'ดูผลวิเคราะห์' : 'ทำต่อ'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ยืนยัน skip → ผลไม่สมบูรณ์ */}
      {confirmSkip && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 px-0 md:items-center md:px-6">
          <div className="w-full max-w-[440px] rounded-t-3xl bg-surface-1 p-6 pb-8 text-center md:rounded-3xl md:pb-6">
            <p className="text-lg font-semibold text-ink">ดูผลแบบไม่สมบูรณ์?</p>
            <p className="mt-1 text-sm text-ink-soft">ทำครบ 10 ข้อ ผลวิเคราะห์จะแม่นยำกว่า · กลับมาทำต่อได้ภายหลัง</p>
            <div className="mt-6 space-y-2.5">
              <button onClick={() => goResult(false)} className="w-full rounded-2xl bg-brand py-4 text-sm font-semibold text-white">ดูผลเบื้องต้น</button>
              <button onClick={() => setConfirmSkip(false)} className="w-full rounded-2xl border border-line py-3 text-sm font-medium text-ink-soft">ทำต่อ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
