import { Timer, ChevronRight, Circle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { homeworkRoom } from '../../data/mock'
import SectionTitle from '../SectionTitle'

export default function HomeworkCard() {
  const navigate = useNavigate()
  return (
    <section className="px-4 pt-5">
      <SectionTitle>ห้องทำการบ้าน</SectionTitle>
      <button
        onClick={() => navigate('/homework')}
        className="flex w-full items-center gap-3 rounded-card border border-line bg-surface-1 p-3.5 text-left active:scale-[0.99]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10">
          <Timer size={24} className="text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink">ห้องทำการบ้าน</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
            <Circle size={8} className="fill-success text-success" />
            {homeworkRoom.online} คนกำลังเรียน · จับเวลาโฟกัส
          </p>
        </div>
        <ChevronRight size={20} className="text-ink-mute" />
      </button>
    </section>
  )
}
