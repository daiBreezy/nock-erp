import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Crown } from 'lucide-react'
import { ranking } from '../../data/profile'

function fmtHours(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} ชม. ${m} น.` : `${m} น.`
}

const podiumOrder = [1, 0, 2] // กลาง=ที่1
const podiumHeight = ['h-20', 'h-28', 'h-16']
const podiumColor = ['bg-subject-english', 'bg-subject-math', 'bg-subject-thai']

export default function Ranking() {
  const navigate = useNavigate()
  const top3 = ranking.slice(0, 3)
  const rest = ranking.slice(3, 20)

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">อันดับ</h1>
      </header>

      {/* Top 3 podium */}
      <section className="px-4 pt-6">
        <div className="flex items-end justify-center gap-3">
          {podiumOrder.map((idx, pos) => {
            const r = top3[idx]
            return (
              <div key={r.rank} className="flex flex-1 flex-col items-center">
                {r.rank === 1 && <Crown size={22} className="mb-1 text-subject-math-ink" />}
                <div className={`relative flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold ${r.tone}`}>
                  {r.name.slice(0, 2)}
                </div>
                <p className="mt-1.5 text-sm font-medium text-ink">{r.name}</p>
                <p className="text-[11px] text-ink-soft">{fmtHours(r.minutes)}</p>
                <div className={`mt-2 flex w-full ${podiumHeight[pos]} items-start justify-center rounded-t-xl ${podiumColor[pos]} pt-2`}>
                  <span className="text-lg font-bold text-ink/70">{r.rank}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Top 4-20 */}
      <section className="px-4 pt-6">
        <div className="overflow-hidden rounded-card border border-line bg-surface-1">
          {rest.map((r, i) => (
            <div
              key={r.rank}
              className={`flex items-center gap-3 px-4 py-3 ${i !== rest.length - 1 ? 'border-b border-line' : ''} ${r.me ? 'bg-brand-soft' : ''}`}
            >
              <span className={`w-6 text-center text-sm font-semibold ${r.me ? 'text-brand' : 'text-ink-soft'}`}>{r.rank}</span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium ${r.tone}`}>
                {r.name.slice(0, 2)}
              </div>
              <span className="flex-1 text-sm font-medium text-ink">{r.name}{r.me && ' (คุณ)'}</span>
              <span className="text-sm text-ink-soft">{fmtHours(r.minutes)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
