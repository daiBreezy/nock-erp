import { useNavigate } from 'react-router-dom'
import { Sparkles, ChevronRight } from 'lucide-react'

export default function GoalEntry() {
  const navigate = useNavigate()
  return (
    <section className="px-4 pt-5">
      <button
        onClick={() => navigate('/goal')}
        className="flex w-full items-center gap-3 rounded-card border border-line bg-surface-1 p-4 text-left active:scale-[0.99]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-subject-science">
          <Sparkles size={24} className="text-subject-science-ink" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">สร้างเป้าหมายของฉัน</p>
          <p className="mt-0.5 text-xs text-ink-soft">ให้ AI วิเคราะห์จุดแข็ง-จุดอ่อน + วางแผนเรียน</p>
        </div>
        <ChevronRight size={20} className="text-ink-mute" />
      </button>
    </section>
  )
}
