import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const grades = ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']

export default function Welcome() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [grade, setGrade] = useState<string | null>(null)

  const done = () => navigate('/', { replace: true })

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 px-6">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-xl font-semibold text-ink">บอกเราอีกนิด</h1>
        <p className="mt-1 text-sm text-ink-soft">เพื่อแนะนำเนื้อหาให้ตรงกับคุณ (ข้ามได้ ค่อยกรอกทีหลัง)</p>

        <label className="mt-7 block">
          <span className="mb-1.5 block text-xs font-medium text-ink-soft">ชื่อเล่น</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="เช่น กร"
            className="h-12 w-full rounded-xl border border-line bg-surface-1 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand"
          />
        </label>

        <div className="mt-5">
          <span className="mb-2 block text-xs font-medium text-ink-soft">ระดับชั้น</span>
          <div className="flex flex-wrap gap-2">
            {grades.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`rounded-pill px-4 py-2 text-sm font-medium ${grade === g ? 'bg-brand text-white' : 'border border-line bg-surface-1 text-ink-soft'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pb-6">
        <button onClick={done} className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white">
          เริ่มเรียนเลย
        </button>
        <button onClick={done} className="w-full py-2 text-sm font-medium text-ink-soft">ข้ามไปก่อน</button>
      </div>
    </div>
  )
}
