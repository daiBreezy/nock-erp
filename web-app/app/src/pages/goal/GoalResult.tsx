import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, TrendingUp, ThumbsUp, AlertCircle, Target, PlayCircle, CalendarCheck, MessageCircle } from 'lucide-react'
import { aiSummary, playlist } from '../../data/goal'
import UpgradeCard from '../../components/pricing/UpgradeCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export default function GoalResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const { complete } = (location.state as { complete: boolean; answered: number }) || { complete: true }

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate('/', { replace: true })} aria-label="ปิด" className="h-8 w-8 text-ink hover:bg-transparent"><ChevronLeft size={24} /></Button>
        <h1 className="text-lg font-semibold text-ink">ผลวิเคราะห์</h1>
      </header>

      {!complete && (
        <div className="mx-4 mt-4 rounded-xl border border-subject-math-ink/20 bg-subject-math p-3 text-xs text-subject-math-ink">
          นี่คือผลเบื้องต้น (ทำ 5 จาก 10 ข้อ) — ทำต่อให้ครบเพื่อความแม่นยำ
        </div>
      )}

      {/* Gap visualization */}
      <section className="px-4 pt-4">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink"><Target size={18} className="text-brand" /> เป้าหมายของคุณ</div>
          <div className="mt-3 flex items-end justify-between">
            <div><p className="text-xs text-ink-soft">ตอนนี้</p><p className="text-2xl font-bold text-ink">{aiSummary.current}%</p></div>
            <TrendingUp size={24} className="mb-1 text-success" />
            <div className="text-right"><p className="text-xs text-ink-soft">เป้าหมาย</p><p className="text-2xl font-bold text-success">{aiSummary.target}%</p></div>
          </div>
          <Progress value={aiSummary.current} className="mt-3 h-2.5 bg-surface-2" indicatorClassName="bg-brand" />
          <p className="mt-2 text-xs text-ink-soft">เพิ่มอีก {aiSummary.target - aiSummary.current}% ภายใน 1 เดือน ถ้าฝึกวันละ 15 นาที</p>
        </div>
      </section>

      {/* AI Summary */}
      <section className="px-4 pt-4">
        <h2 className="mb-2 text-base font-semibold text-ink">AI วิเคราะห์</h2>
        <div className="space-y-2.5">
          {[
            { Icon: ThumbsUp, tone: 'text-success', label: 'จุดแข็ง', text: aiSummary.strength },
            { Icon: AlertCircle, tone: 'text-live', label: 'จุดที่ต้องพัฒนา', text: aiSummary.weak },
            { Icon: TrendingUp, tone: 'text-brand', label: 'คำแนะนำ', text: aiSummary.improve },
          ].map((r) => (
            <div key={r.label} className="flex gap-3 rounded-card border border-line bg-surface-1 p-3.5">
              <r.Icon size={20} className={`${r.tone} mt-0.5 shrink-0`} />
              <div><p className="text-sm font-medium text-ink">{r.label}</p><p className="mt-0.5 text-sm text-ink-soft">{r.text}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Playlist */}
      <section className="px-4 pt-5">
        <h2 className="mb-2 text-base font-semibold text-ink">วิดีโอแนะนำสำหรับคุณ</h2>
        <div className="overflow-hidden rounded-card border border-line bg-surface-1">
          {playlist.map((v) => (
            <button key={v.id} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0">
              <PlayCircle size={22} className="text-brand" />
              <span className="flex-1 text-sm text-ink">{v.title}</span>
              <span className="text-xs text-ink-mute">{v.duration}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Learning Plan */}
      <section className="px-4 pt-5">
        <button onClick={() => navigate('/goal/plan')} className="flex w-full items-center gap-3 rounded-card border border-line bg-surface-1 p-4 text-left">
          <CalendarCheck size={22} className="text-brand" />
          <div className="flex-1"><p className="text-sm font-medium text-ink">สร้างแผนการเรียน</p><p className="text-xs text-ink-soft">วางตารางให้ตรงเป้าหมาย</p></div>
        </button>
      </section>

      {/* Package + Contact */}
      <section className="px-4 pt-5">
        <UpgradeCard />
        <Button variant="outline" className="mt-2.5 h-auto w-full gap-2 rounded-card border-line bg-surface-1 py-3 text-sm font-medium text-ink hover:bg-surface-2">
          <MessageCircle size={18} className="text-brand" /> ปรึกษาทีมงาน
        </Button>
      </section>

      {/* CTA ทำต่อให้ครบ (ถ้าไม่สมบูรณ์) */}
      {!complete && (
        <div className="sticky bottom-0 z-10 mt-auto pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-surface-1 p-4 md:static md:z-auto">
          <Button onClick={() => navigate('/goal/test')} className="h-auto w-full rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark">ทำต่อให้ครบ 10 ข้อ</Button>
        </div>
      )}
    </div>
  )
}
