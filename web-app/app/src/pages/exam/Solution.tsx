import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, PlayCircle, Check } from 'lucide-react'
import { getExam, getSet } from '../../data/exam'

export default function Solution() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const setId = (location.state as { setId?: string })?.setId
  const exam = getExam(id)
  const set = getSet(exam, setId)
  const count = set?.questionCount ?? 20

  // แบ่งเป็นกลุ่มละ 5 ข้อ
  const groups: { from: number; to: number }[] = []
  for (let i = 1; i <= count; i += 5) groups.push({ from: i, to: Math.min(i + 4, count) })

  const [open, setOpen] = useState<number>(0)

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-ink">เฉลยข้อสอบ</h1>
      </header>

      <div className="space-y-3 p-4">
        {groups.map((g, gi) => {
          const isOpen = open === gi
          return (
            <div key={gi} className="overflow-hidden rounded-card border border-line bg-surface-1">
              <button
                onClick={() => setOpen(isOpen ? -1 : gi)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-semibold text-ink">เฉลยข้อ {g.from}–{g.to}</span>
                <ChevronDown size={20} className={`text-ink-mute transition ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-line p-4">
                  {/* วิดีโอเฉลยของกลุ่ม */}
                  <div className="flex aspect-video items-center justify-center rounded-xl bg-ink/90">
                    <PlayCircle size={48} className="text-white/90" />
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">วิดีโอเฉลยข้อ {g.from}–{g.to}</p>

                  {/* เฉลยรายข้อ */}
                  <div className="mt-4 space-y-2.5">
                    {Array.from({ length: g.to - g.from + 1 }, (_, k) => {
                      const no = g.from + k
                      return (
                        <div key={no} className="flex items-start gap-2.5 rounded-xl bg-surface-2 p-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                            <Check size={14} />
                          </span>
                          <div className="text-sm">
                            <p className="font-medium text-ink">ข้อ {no} · ตอบ ก</p>
                            <p className="mt-0.5 text-xs text-ink-soft">คำอธิบายแนวคิดการแก้โจทย์ข้อนี้แบบย่อ</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
