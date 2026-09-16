import { Radio, Heart, UserPlus, Medal, Megaphone } from 'lucide-react'
import { notifications, type Noti } from '../data/social'

const iconFor: Record<Noti['type'], { Icon: typeof Radio; tone: string }> = {
  live: { Icon: Radio, tone: 'bg-subject-thai text-subject-thai-ink' },
  cheer: { Icon: Heart, tone: 'bg-subject-thai text-subject-thai-ink' },
  friend: { Icon: UserPlus, tone: 'bg-subject-english text-subject-english-ink' },
  achievement: { Icon: Medal, tone: 'bg-subject-math text-subject-math-ink' },
  system: { Icon: Megaphone, tone: 'bg-surface-2 text-ink-soft' },
}

export default function Notifications() {
  return (
    <div className="min-h-screen bg-surface-0">
      <header className="flex items-center justify-between px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">การแจ้งเตือน</h1>
        <button className="text-sm font-medium text-brand">อ่านทั้งหมด</button>
      </header>

      <div className="divide-y divide-line border-y border-line bg-surface-1">
        {notifications.map((n) => {
          const { Icon, tone } = iconFor[n.type]
          return (
            <button key={n.id} className={`flex w-full items-start gap-3 px-4 py-3.5 text-left ${n.unread ? 'bg-brand-soft/40' : ''}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{n.title}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{n.detail}</p>
                <p className="mt-1 text-xs text-ink-mute">{n.time}</p>
              </div>
              {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
