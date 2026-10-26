import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

type ResultState = { score: number; total: number; seconds: number; setId?: string }

function human(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m ? `${m} นาที ${s} วินาที` : `${s} วินาที`
}

export default function ExamResult() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const { score, total, seconds, setId } = (location.state as ResultState) || {
    score: 0,
    total: 20,
    seconds: 0,
  }
  const pct = Math.round((score / total) * 100)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center">
      <p className="text-sm text-ink-soft">คะแนนของคุณ</p>
      <p className="mt-2 text-5xl font-semibold text-ink">
        {score}<span className="text-2xl text-ink-mute">/{total}</span>
      </p>
      <Progress value={pct} className="mt-4 h-2.5 w-full max-w-xs bg-surface-2" indicatorClassName="bg-success" />
      <p className="mt-3 text-sm text-ink-soft">ใช้เวลา {human(seconds)}</p>

      <div className="mt-10 w-full max-w-xs space-y-2.5">
        <Button
          onClick={() => navigate(`/exam/${id}/solution`, { state: { setId } })}
          className="h-auto w-full gap-2 rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark"
        >
          <BookOpen size={18} /> เฉลยข้อสอบ
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/exam', { replace: true })}
          className="h-auto w-full gap-2 rounded-2xl border-line bg-surface-1 py-3.5 text-sm font-medium text-ink hover:bg-surface-2"
        >
          <List size={18} /> กลับไปหน้ารวมข้อสอบ
        </Button>
      </div>
    </div>
  )
}
