import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, List } from 'lucide-react'

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
      <div className="mt-4 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-sm text-ink-soft">ใช้เวลา {human(seconds)}</p>

      <div className="mt-10 w-full max-w-xs space-y-2.5">
        <button
          onClick={() => navigate(`/exam/${id}/solution`, { state: { setId } })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-base font-semibold text-white"
        >
          <BookOpen size={18} /> เฉลยข้อสอบ
        </button>
        <button
          onClick={() => navigate('/exam', { replace: true })}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface-1 py-3.5 text-sm font-medium text-ink"
        >
          <List size={18} /> กลับไปหน้ารวมข้อสอบ
        </button>
      </div>
    </div>
  )
}
