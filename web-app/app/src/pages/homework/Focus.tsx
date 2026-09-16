import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { focusSubjects } from '../../data/homework'
import CheerLayer from '../../components/homework/CheerLayer'

type FocusState = { subject: string; minutes: number | null }

function fmt(totalSec: number) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export default function Focus() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as FocusState) || { subject: 'math', minutes: 30 }
  const subject = focusSubjects.find((s) => s.key === state.subject) ?? focusSubjects[0]
  const countdown = state.minutes != null

  // นับถอยหลัง: เริ่มจาก minutes*60 / นับขึ้น: เริ่มจาก 0
  const [elapsed, setElapsed] = useState(0)
  const total = countdown ? (state.minutes as number) * 60 : 0
  const finishedRef = useRef(false)

  const finish = (sec: number) => {
    if (finishedRef.current) return
    finishedRef.current = true
    navigate('/homework/result', {
      replace: true,
      state: { subject: state.subject, seconds: sec },
    })
  }

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1
        if (countdown && next >= total) {
          finish(total)
          return total
        }
        return next
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remaining = countdown ? Math.max(total - elapsed, 0) : elapsed
  const progress = countdown ? elapsed / total : 0

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-0 px-6">
      <CheerLayer />
      <span className={`rounded-pill px-4 py-1.5 text-sm font-medium ${subject.tone}`}>
        {subject.label}
      </span>

      <div className="relative my-12 flex h-64 w-64 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#E8EAED" strokeWidth="4" />
          {countdown && (
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#FF5A5E"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={2 * Math.PI * 46 * progress}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          )}
        </svg>
        <div className="text-center">
          <p className="font-mono text-4xl font-semibold tabular-nums text-ink">{fmt(remaining)}</p>
          <p className="mt-2 text-sm text-ink-soft">{countdown ? 'เหลือเวลา' : 'กำลังจับเวลา'}</p>
        </div>
      </div>

      <button
        onClick={() => finish(elapsed)}
        className="rounded-pill border border-line bg-surface-1 px-8 py-3 text-base font-medium text-ink active:scale-95"
      >
        จบการโฟกัส
      </button>
    </div>
  )
}
