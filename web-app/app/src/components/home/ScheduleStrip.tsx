import { useNavigate } from 'react-router-dom'
import { schedule } from '../../data/mock'
import { subjectBg, subjectText } from '../../lib/subject'
import SectionTitle from '../SectionTitle'

export default function ScheduleStrip() {
  const navigate = useNavigate()
  return (
    <section className="pt-1">
      <div className="px-4">
        <SectionTitle subtitle="ถ่ายทอดสดทุกวัน จันทร์ – เสาร์">
          ตารางการถ่ายทอดสด
        </SectionTitle>
      </div>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1">
        {schedule.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/live/${s.id}`)}
            className={`${subjectBg[s.subject]} w-32 shrink-0 rounded-card p-2.5 text-left active:scale-95`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-md bg-white/50 px-1.5 py-0.5 text-[11px] font-medium ${subjectText[s.subject]}`}>
                {s.grade}
              </span>
              {s.premium && (
                <span className="rounded-md bg-premium px-1.5 py-0.5 text-[10px] font-medium text-white">
                  พรีเมียม
                </span>
              )}
            </div>
            <p className={`mt-2 text-[13px] font-medium ${subjectText[s.subject]}`}>
              {s.title}
            </p>
            <p className={`mt-0.5 text-xs ${subjectText[s.subject]} opacity-80`}>
              {s.time}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
