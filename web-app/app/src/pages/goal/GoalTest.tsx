import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles } from 'lucide-react'
import { buildGoalTest, cutScenes } from '../../data/goal'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ออก" className="h-8 w-8 text-ink-soft hover:bg-transparent"><X size={22} /></Button>
        <span className="text-sm text-ink-soft">{current + 1}/10</span>
      </header>
      <Progress value={((current + 1) / 10) * 100} className="h-1.5 rounded-none bg-surface-2" indicatorClassName="bg-brand" />

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

      {/* Cut-scene — ต้องเลือกปุ่มเท่านั้น (ปิดด้วยฉากหลัง / Esc ไม่ได้) */}
      <Dialog open={cut !== null}>
        <DialogContent
          hideClose
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="w-[calc(100%-3rem)] max-w-[400px] gap-0 rounded-3xl border-0 bg-surface-1 p-6 text-center sm:rounded-3xl"
        >
          {cut !== null && (
            <>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-subject-science">
                <Sparkles size={28} className="text-subject-science-ink" />
              </div>
              <DialogTitle className="text-lg font-semibold text-ink">{cutScenes[cut].title}</DialogTitle>
              <DialogDescription className="mt-1.5 text-sm text-ink-soft">{cutScenes[cut].detail}</DialogDescription>

              {cutScenes[cut].skippable ? (
                <div className="mt-6 space-y-2.5">
                  <Button onClick={dismissCut} className="h-auto w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold hover:bg-brand-dark">ทำต่อให้ครบ</Button>
                  <Button variant="outline" onClick={() => setConfirmSkip(true)} className="h-auto w-full rounded-2xl border-line py-3 text-sm font-medium text-ink-soft hover:bg-surface-2">ดูผลเบื้องต้น</Button>
                </div>
              ) : (
                <Button onClick={dismissCut} className="mt-6 h-auto w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold hover:bg-brand-dark">
                  {cut === 10 ? 'ดูผลวิเคราะห์' : 'ทำต่อ'}
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ยืนยัน skip → ผลไม่สมบูรณ์ */}
      <Dialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <DialogContent hideClose className="w-[calc(100%-2rem)] max-w-[440px] gap-0 rounded-3xl border-0 bg-surface-1 p-6 text-center sm:rounded-3xl">
          <DialogTitle className="text-lg font-semibold text-ink">ดูผลแบบไม่สมบูรณ์?</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-soft">ทำครบ 10 ข้อ ผลวิเคราะห์จะแม่นยำกว่า · กลับมาทำต่อได้ภายหลัง</DialogDescription>
          <div className="mt-6 space-y-2.5">
            <Button onClick={() => goResult(false)} className="h-auto w-full rounded-2xl bg-brand py-4 text-sm font-semibold hover:bg-brand-dark">ดูผลเบื้องต้น</Button>
            <Button variant="outline" onClick={() => setConfirmSkip(false)} className="h-auto w-full rounded-2xl border-line py-3 text-sm font-medium text-ink-soft hover:bg-surface-2">ทำต่อ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
