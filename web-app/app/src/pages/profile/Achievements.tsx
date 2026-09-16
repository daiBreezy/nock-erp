import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Medal, Lock } from 'lucide-react'
import { achievementGroups } from '../../data/profile'

export default function Achievements() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">ความสำเร็จ</h1>
      </header>

      <div className="space-y-6 px-4 pt-4">
        {achievementGroups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-sm font-semibold text-ink-soft">{g.title}</h2>
            <div className="grid grid-cols-3 gap-3">
              {g.items.map((a) => (
                <div
                  key={a.id}
                  className={`flex flex-col items-center gap-2 rounded-card border p-3 text-center ${
                    a.unlocked ? 'border-line bg-surface-1' : 'border-line bg-surface-2'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      a.unlocked ? 'bg-subject-math' : 'bg-surface-0'
                    }`}
                  >
                    {a.unlocked ? (
                      <Medal size={24} className="text-subject-math-ink" />
                    ) : (
                      <Lock size={20} className="text-ink-mute" />
                    )}
                  </div>
                  <span className={`text-[11px] leading-tight ${a.unlocked ? 'text-ink' : 'text-ink-mute'}`}>
                    {a.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
