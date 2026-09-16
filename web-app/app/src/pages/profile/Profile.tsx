import { useNavigate } from 'react-router-dom'
import { Pencil, Users, School, MapPin, ChevronRight, Trophy, Medal } from 'lucide-react'
import { me, usageStats, ranking, achievementGroups } from '../../data/profile'
import UsageChart from '../../components/profile/UsageChart'
import UsageCalendar from '../../components/profile/UsageCalendar'
import UpgradeCard from '../../components/pricing/UpgradeCard'

function fmtHours(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h} ชม. ${m} น.` : `${m} น.`
}

export default function Profile() {
  const navigate = useNavigate()
  const unlocked = achievementGroups.flatMap((g) => g.items).filter((i) => i.unlocked).length
  const totalAch = achievementGroups.flatMap((g) => g.items).length
  const myRank = ranking.find((r) => r.me)

  return (
    <div className="min-h-screen bg-surface-0 pb-6">
      <header className="flex items-center justify-between px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">โปรไฟล์</h1>
      </header>

      {/* Upgrade card → ดู Package ทั้งหมด */}
      <section className="px-4 pb-1">
        <UpgradeCard />
      </section>

      {/* General info */}
      <section className="px-4 pt-3">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold ${me.tone}`}>
              {me.initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-ink">{me.name}</p>
              <p className="text-sm text-ink-soft">{me.nickname} · {me.grade}</p>
            </div>
            <button
              onClick={() => navigate('/profile/edit')}
              aria-label="แก้ไขข้อมูล"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft"
            >
              <Pencil size={16} />
            </button>
          </div>

          <button
            onClick={() => navigate('/more/nakama')}
            className="mt-3 flex w-full items-center gap-2 rounded-xl bg-surface-2 p-3 text-left"
          >
            <Users size={18} className="text-brand" />
            <span className="text-sm font-medium text-ink">เพื่อน (Nakama)</span>
            <span className="ml-auto text-sm font-semibold text-ink">{me.nakama}</span>
            <ChevronRight size={16} className="text-ink-mute" />
          </button>

          <p className="mt-3 text-sm text-ink">{me.intro}</p>
          <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
            <p className="flex items-center gap-2"><School size={16} /> {me.school}</p>
            <p className="flex items-center gap-2"><MapPin size={16} /> {me.province}</p>
          </div>
        </div>
      </section>

      {/* Usage Summary */}
      <section className="px-4 pt-4">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <h2 className="text-base font-semibold text-ink">สรุปการใช้งาน</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: 'วันนี้', v: usageStats.today },
              { label: 'เดือนนี้', v: usageStats.month },
              { label: 'ทั้งหมด', v: usageStats.all },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-2 p-3 text-center">
                <p className="text-[11px] text-ink-soft">{s.label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{fmtHours(s.v)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5"><UsageChart /></div>

          <button
            onClick={() => navigate('/profile/ranking')}
            className="mt-4 flex w-full items-center gap-3 rounded-xl bg-brand-soft p-3 text-left"
          >
            <Trophy size={20} className="text-brand" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">อันดับของคุณ</p>
              <p className="text-xs text-ink-soft">ดู Ranking ทั้งหมด</p>
            </div>
            {myRank && <span className="text-lg font-semibold text-brand">#{myRank.rank}</span>}
            <ChevronRight size={16} className="text-ink-mute" />
          </button>
        </div>
      </section>

      {/* Achievement */}
      <section className="px-4 pt-4">
        <button
          onClick={() => navigate('/profile/achievements')}
          className="flex w-full items-center gap-3 rounded-card border border-line bg-surface-1 p-4 text-left"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-subject-math">
            <Medal size={24} className="text-subject-math-ink" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-ink">ความสำเร็จ</p>
            <p className="text-xs text-ink-soft">ปลดล็อกแล้ว {unlocked}/{totalAch}</p>
          </div>
          <ChevronRight size={20} className="text-ink-mute" />
        </button>
      </section>

      {/* Calendar */}
      <section className="px-4 pt-4">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <h2 className="mb-3 text-base font-semibold text-ink">ปฏิทินการใช้งาน</h2>
          <UsageCalendar />
        </div>
      </section>
    </div>
  )
}
