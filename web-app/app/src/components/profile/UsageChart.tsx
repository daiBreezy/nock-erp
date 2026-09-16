import { weekly, usageTypes } from '../../data/profile'

export default function UsageChart() {
  const totals = weekly.map((d) => d.homework + d.live + d.video)
  const max = Math.max(...totals, 1)

  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
        {weekly.map((d) => {
          const total = d.homework + d.live + d.video
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="flex w-full max-w-7 flex-col-reverse overflow-hidden rounded-md"
                style={{ height: `${(total / max) * 110}px` }}
              >
                <div style={{ height: `${(d.homework / total) * 100}%`, background: usageTypes[0].color }} />
                <div style={{ height: `${(d.live / total) * 100}%`, background: usageTypes[1].color }} />
                <div style={{ height: `${(d.video / total) * 100}%`, background: usageTypes[2].color }} />
              </div>
              <span className="text-[11px] text-ink-mute">{d.day}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {usageTypes.map((t) => (
          <span key={t.key} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}
