import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Users, Radio } from 'lucide-react'
import { liveNext } from '../../data/mock'
import { subjectBg, subjectText } from '../../lib/subject'
import SectionTitle from '../SectionTitle'

export default function LiveNext() {
  const navigate = useNavigate()
  const [level, setLevel] = useState<'primary' | 'secondary'>('primary')
  return (
    <section className="px-4 pt-4">
      <SectionTitle
        right={
          <div className="flex rounded-pill bg-surface-2 p-0.5 text-xs">
            <button
              onClick={() => setLevel('primary')}
              className={`rounded-pill px-3 py-1 ${level === 'primary' ? 'bg-brand text-white' : 'text-ink-soft'}`}
            >
              ประถม
            </button>
            <button
              onClick={() => setLevel('secondary')}
              className={`rounded-pill px-3 py-1 ${level === 'secondary' ? 'bg-brand text-white' : 'text-ink-soft'}`}
            >
              มัธยม
            </button>
          </div>
        }
      >
        รายการเรียนสดถัดไป
      </SectionTitle>

      <button onClick={() => navigate('/live/next')} className="block w-full text-left active:scale-[0.99]">
        <div
          className={`${subjectBg[liveNext.subject]} relative flex h-40 items-end rounded-card p-3`}
        >
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-pill bg-live px-2 py-1 text-[11px] font-medium text-white">
            <Radio size={11} /> LIVE
          </span>
          <span className="absolute right-3 top-3 rounded-pill bg-white/70 px-2.5 py-1 text-[11px] font-medium text-ink">
            {liveNext.badge}
          </span>
          <div className="rounded-xl bg-white/55 px-3 py-2 backdrop-blur-sm">
            <p className={`text-[13px] font-medium ${subjectText[liveNext.subject]}`}>
              คณิตศาสตร์ · {liveNext.date}
            </p>
            <p className={`mt-0.5 text-xs ${subjectText[liveNext.subject]} opacity-90`}>
              {liveNext.episode}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${subjectBg[liveNext.subject]}`}>
            <Users size={18} className={subjectText[liveNext.subject]} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{liveNext.title}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {liveNext.waiting} คนกำลังรออยู่
            </p>
          </div>
          <Bookmark size={20} className="text-ink-mute" />
        </div>
      </button>
    </section>
  )
}
