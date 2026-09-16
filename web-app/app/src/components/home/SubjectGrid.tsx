import { useNavigate } from 'react-router-dom'
import { subjects } from '../../data/mock'
import { subjectBg, subjectText } from '../../lib/subject'
import SectionTitle from '../SectionTitle'

export default function SubjectGrid() {
  const navigate = useNavigate()
  return (
    <section className="px-4 pt-5">
      <SectionTitle>ห้องเรียน</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {subjects.map((s) => (
          <button
            key={s.key}
            onClick={() => navigate(`/learn/${s.key}`)}
            className={`${subjectBg[s.key]} flex h-[72px] items-center justify-center rounded-card text-sm font-medium active:scale-95 ${subjectText[s.key]}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  )
}
