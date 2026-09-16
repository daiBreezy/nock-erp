import { useLocation, useNavigate } from 'react-router-dom'
import { Check, Heart, Clock } from 'lucide-react'
import { focusSubjects } from '../../data/homework'

type ResultState = { subject: string; seconds: number }

function human(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h) return `${h} ชม. ${m} นาที`
  if (m) return `${m} นาที ${s} วินาที`
  return `${s} วินาที`
}

export default function Result() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as ResultState) || { subject: 'math', seconds: 0 }
  const subject = focusSubjects.find((s) => s.key === state.subject) ?? focusSubjects[0]
  const cheers = Math.floor(state.seconds / 90) + 3 // mock: ยิ่งนานยิ่งได้ cheer

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
        <Check size={40} className="text-success" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-ink">จบการโฟกัสแล้ว!</h1>
      <p className="mt-1 text-sm text-ink-soft">วิชา{subject.label}</p>

      <div className="mt-8 w-full max-w-xs space-y-3">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-1 p-4 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft">
            <Clock size={22} className="text-brand" />
          </div>
          <div>
            <p className="text-xs text-ink-soft">เวลาที่ใช้ไปทั้งหมด</p>
            <p className="text-lg font-semibold text-ink">{human(state.seconds)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-surface-1 p-4 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-subject-thai">
            <Heart size={22} className="text-subject-thai-ink" />
          </div>
          <div>
            <p className="text-xs text-ink-soft">กำลังใจจากเพื่อน</p>
            <p className="text-lg font-semibold text-ink">{cheers} Cheers</p>
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-xs text-xs text-ink-mute">
        บันทึกลงปฏิทินการใช้งานและคำนวณใน Ranking แล้ว
      </p>

      <button
        onClick={() => navigate('/', { replace: true })}
        className="mt-8 w-full max-w-xs rounded-2xl bg-brand py-4 text-base font-semibold text-white active:scale-[0.99]"
      >
        เสร็จสิ้น
      </button>
    </div>
  )
}
