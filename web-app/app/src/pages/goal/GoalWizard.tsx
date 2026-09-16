import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, ArrowRight, ArrowLeft, Sparkles, ThumbsUp, Target, TrendingUp, Play, Rocket } from 'lucide-react'
import { goalSubjects, targetSchools, grades, moods, buildGoalTest, aiSummary, playlist, planDurations, planTimes, type GoalType } from '../../data/goal'

type StepType = 'goal' | 'subjects' | 'school' | 'grade' | 'confidence' | 'question' | 'cutscene' | 'result' | 'plan'
type Phase = 'setup' | 'test' | 'result'
type Step = { phase: Phase; type: StepType; n?: number; title?: string; detail?: string }

const PHASE_LABEL: Record<Phase, { num: number; label: string }> = {
  setup: { num: 1, label: 'วางเป้าหมาย' },
  test: { num: 2, label: 'เริ่มทดสอบ' },
  result: { num: 3, label: 'ผลวิเคราะห์' },
}

const test = buildGoalTest(6)

export default function GoalWizard() {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)
  const [goal, setGoal] = useState<GoalType | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [school, setSchool] = useState<string | null>(null)
  const [grade, setGrade] = useState<string | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [duration, setDuration] = useState<string | null>(null)
  const [minutes, setMinutes] = useState(30)
  const [slots, setSlots] = useState<string[]>([])

  // สร้างลำดับ step ตาม goal (cut-scene แทรกเป็น step ปกติ ไม่ใช่ popup)
  const steps: Step[] = useMemo(() => {
    const setup: Step[] = [
      { phase: 'setup', type: 'goal' },
      goal === 'improve' ? { phase: 'setup', type: 'subjects' } : { phase: 'setup', type: 'school' },
      { phase: 'setup', type: 'grade' },
      { phase: 'setup', type: 'confidence' },
    ]
    const t: Step[] = [
      { phase: 'test', type: 'question', n: 1 },
      { phase: 'test', type: 'question', n: 2 },
      { phase: 'test', type: 'question', n: 3 },
      { phase: 'test', type: 'cutscene', title: 'ระบบเริ่มเห็นแนวทางแล้ว', detail: 'ทำต่ออีกนิด เราจะวิเคราะห์จุดแข็ง-จุดอ่อนได้แม่นขึ้น' },
      { phase: 'test', type: 'question', n: 4 },
      { phase: 'test', type: 'question', n: 5 },
      { phase: 'test', type: 'question', n: 6 },
    ]
    const result: Step[] = [{ phase: 'result', type: 'result' }, { phase: 'result', type: 'plan' }]
    return [...setup, ...t, ...result]
  }, [goal])

  const step = steps[Math.min(idx, steps.length - 1)]
  const total = steps.length
  const phase = PHASE_LABEL[step.phase]

  const goNext = () => setIdx((i) => Math.min(steps.length - 1, i + 1))
  const goBack = () => setIdx((i) => Math.max(0, i - 1))
  const cancel = () => navigate('/goals')
  const pick = (fn: () => void) => { fn(); setTimeout(goNext, 200) }

  const complete = (() => {
    switch (step.type) {
      case 'goal': return goal !== null
      case 'subjects': return subjects.length > 0
      case 'school': return school !== null
      case 'grade': return grade !== null
      case 'confidence': return mood !== null
      case 'question': return answers[step.n!] != null
      case 'plan': return duration !== null && slots.length > 0
      default: return true
    }
  })()

  const toggleSubject = (k: string) => setSubjects((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
  const toggleSlot = (s: string) => setSlots((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))
  const isLast = step.type === 'plan'

  return (
    <div className="min-h-screen bg-[#FBEEF0]">
      <div className="mx-auto max-w-[720px] px-4 py-6 md:py-10">
        {/* outer header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Flag size={22} /></span>
          <div>
            <p className="text-xl font-extrabold text-ink">Set your Goal!</p>
            <p className="text-sm text-ink-soft">Step {phase.num}: {phase.label}</p>
          </div>
        </div>

        {/* card */}
        <div className="rounded-3xl bg-surface-1 p-6 shadow-sm md:p-8">
          {/* progress */}
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm">🏃</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
            </div>
            <span className="shrink-0 text-sm font-medium text-ink-soft">{idx + 1}/{total}</span>
          </div>

          {/* content */}
          <div className="mt-7 min-h-[300px]">
            {step.type === 'goal' && (
              <>
                <h1 className="text-3xl font-extrabold text-ink">เป้าหมายคืออะไร?</h1>
                <p className="mt-1.5 text-ink-soft">เพื่อปรับคำแนะนำให้เหมาะกับคุณ</p>
                <div className="mt-6 space-y-3">
                  {[
                    { v: 'improve' as GoalType, i: 1, label: 'เพิ่มคะแนนสอบ', desc: 'ดึงคะแนนในวิชาที่ต้องการพัฒนา' },
                    { v: 'entrance' as GoalType, i: 2, label: 'สอบเข้า', desc: 'เตรียมสอบเข้าโรงเรียนเป้าหมาย' },
                  ].map((o) => (
                    <NumberOption key={o.v} n={o.i} active={goal === o.v} title={o.label} desc={o.desc} onClick={() => pick(() => setGoal(o.v))} />
                  ))}
                </div>
              </>
            )}

            {step.type === 'subjects' && (
              <>
                <h1 className="text-3xl font-extrabold text-ink">เลือกวิชาที่อยากพัฒนา</h1>
                <p className="mt-1.5 text-ink-soft">เลือกได้หลายวิชา แล้วกดถัดไป</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {goalSubjects.map((s) => (
                    <button key={s.key} onClick={() => toggleSubject(s.key)} className={`rounded-pill px-5 py-2.5 text-sm font-medium ${subjects.includes(s.key) ? 'bg-brand text-white' : 'border border-line bg-surface-1 text-ink-soft hover:border-brand/50'}`}>{s.label}</button>
                  ))}
                </div>
              </>
            )}

            {step.type === 'school' && (
              <>
                <h1 className="text-3xl font-extrabold text-ink">โรงเรียนเป้าหมาย</h1>
                <p className="mt-1.5 text-ink-soft">เลือกโรงเรียนที่อยากสอบเข้า</p>
                <div className="mt-6 space-y-3">
                  {targetSchools.map((s, i) => (
                    <NumberOption key={s} n={i + 1} active={school === s} title={s} onClick={() => pick(() => setSchool(s))} />
                  ))}
                </div>
              </>
            )}

            {step.type === 'grade' && (
              <>
                <h1 className="text-3xl font-extrabold text-ink">ระดับชั้น</h1>
                <p className="mt-1.5 text-ink-soft">ตอนนี้เรียนอยู่ชั้นไหน</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {grades.map((g) => (
                    <button key={g} onClick={() => pick(() => setGrade(g))} className={`rounded-pill px-5 py-2.5 text-sm font-medium ${grade === g ? 'bg-brand text-white' : 'border border-line bg-surface-1 text-ink-soft hover:border-brand/50'}`}>{g}</button>
                  ))}
                </div>
              </>
            )}

            {step.type === 'confidence' && (
              <>
                <h1 className="text-3xl font-extrabold text-ink">คุณมั่นใจแค่ไหน?</h1>
                <p className="mt-1.5 text-ink-soft">ช่วยให้เราปรับแผนให้เหมาะกับคุณ</p>
                <div className="mt-8 flex justify-between">
                  {moods.map((m) => (
                    <button key={m.v} onClick={() => pick(() => setMood(m.v))} className={`flex flex-col items-center gap-2 rounded-2xl p-3 ${mood === m.v ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}>
                      <span className="text-4xl">{m.emoji}</span>
                      <span className={`text-xs ${mood === m.v ? 'font-medium text-brand' : 'text-ink-mute'}`}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step.type === 'question' && (
              <>
                <p className="text-sm font-medium text-brand">คำถามที่ {step.n}</p>
                <h1 className="mt-2 text-2xl font-bold text-ink">ข้อ {step.n}: เลือกคำตอบที่ถูกต้องที่สุด</h1>
                <div className="mt-6 space-y-3">
                  {test[step.n! - 1].choices.map((c, i) => {
                    const active = answers[step.n!] === i
                    return (
                      <button key={i} onClick={() => pick(() => setAnswers((a) => ({ ...a, [step.n!]: i })))} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left ${active ? 'border-premium bg-premium/10' : 'border-line bg-surface-1 hover:border-premium/40'}`}>
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${active ? 'bg-premium text-white' : 'bg-surface-2 text-ink-soft'}`}>{['ก', 'ข', 'ค', 'ง'][i]}</span>
                        <span className="text-sm text-ink">{c}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {step.type === 'cutscene' && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-subject-science text-subject-science-ink"><Sparkles size={30} /></span>
                <h1 className="mt-4 text-2xl font-bold text-ink">{step.title}</h1>
                <p className="mt-2 max-w-sm text-ink-soft">{step.detail}</p>
              </div>
            )}

            {step.type === 'result' && <ResultContent />}

            {step.type === 'plan' && (
              <>
                <h1 className="text-2xl font-bold text-ink">สร้างแผนการเรียน</h1>
                <p className="mt-1.5 text-ink-soft">เลือกระยะเวลาและช่วงเวลาที่สะดวก แล้วเริ่มเรียนได้เลย</p>
                <div className="mt-6 space-y-6">
                  <div>
                    <h2 className="mb-3 text-sm font-semibold text-ink">ระยะเวลา</h2>
                    <div className="space-y-2.5">
                      {planDurations.map((d) => (
                        <button key={d} onClick={() => setDuration(d)} className={`w-full rounded-2xl border p-4 text-left text-sm font-medium ${duration === d ? 'border-brand bg-brand-soft text-ink' : 'border-line bg-surface-1 text-ink-soft hover:border-brand/50'}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h2 className="mb-3 text-sm font-semibold text-ink">เวลาเรียน/วัน · <span className="text-brand">{minutes} นาที</span></h2>
                    <input type="range" min={10} max={120} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full accent-brand" />
                  </div>
                  <div>
                    <h2 className="mb-3 text-sm font-semibold text-ink">ช่วงเวลาที่สะดวก</h2>
                    <div className="flex flex-wrap gap-2">
                      {planTimes.map((t) => (
                        <button key={t} onClick={() => toggleSlot(t)} className={`rounded-pill px-4 py-2 text-sm font-medium ${slots.includes(t) ? 'bg-brand text-white' : 'border border-line bg-surface-1 text-ink-soft hover:border-brand/50'}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* footer */}
          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <button onClick={cancel} className="text-sm font-semibold text-brand hover:underline">ยกเลิก</button>
            <div className="flex items-center gap-2.5">
              {idx > 0 && (
                <button onClick={goBack} className="flex items-center gap-1.5 rounded-pill bg-brand-soft px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand-soft/70">
                  <ArrowLeft size={16} /> ย้อนกลับ
                </button>
              )}
              {isLast ? (
                <button onClick={() => navigate('/', { replace: true })} disabled={!complete} className="flex items-center gap-1.5 rounded-pill bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40">
                  <Rocket size={16} /> เริ่มเรียนเลย
                </button>
              ) : (
                <button onClick={goNext} disabled={!complete} className="flex items-center gap-1.5 rounded-pill bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40">
                  {step.type === 'result' ? 'สร้างแผนการเรียน' : 'ถัดไป'} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NumberOption({ n, active, title, desc, onClick }: { n: number; active: boolean; title: string; desc?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${active ? 'border-brand bg-brand-soft' : 'border-line bg-surface-1 hover:border-brand/50'}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold ${active ? 'bg-brand text-white' : 'bg-premium/15 text-premium'}`}>{n}</span>
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        {desc && <span className="mt-0.5 block text-sm text-ink-soft">{desc}</span>}
      </span>
    </button>
  )
}

function ResultContent() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">ผลประเมินจากแบบทดสอบ</h1>
      <p className="mt-1.5 text-sm text-ink-soft">จากแบบทดสอบวัดระดับ เราวิเคราะห์จุดแข็ง-จุดอ่อน และตั้งเป้าหมายให้คุณ</p>
      {/* baseline vs target */}
      <div className="mt-5 rounded-2xl border border-line p-4">
        <div className="flex items-end justify-between">
          <div><p className="text-xs text-ink-mute">คะแนนวัดระดับวันนี้</p><p className="text-3xl font-extrabold text-ink">{aiSummary.current}%</p></div>
          <TrendingUp size={22} className="mb-1 text-success" />
          <div className="text-right"><p className="text-xs text-ink-mute">เป้าหมาย</p><p className="text-3xl font-extrabold text-success">{aiSummary.target}%</p></div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand" style={{ width: `${aiSummary.current}%` }} />
        </div>
        <p className="mt-2.5 text-xs text-ink-mute">นี่คือจุดเริ่มต้นของคุณ — เริ่มเรียนตามแผนเพื่อไปให้ถึงเป้าหมาย</p>
      </div>
      {/* AI cards */}
      <div className="mt-5 space-y-2.5">
        {[
          { Icon: ThumbsUp, label: 'จุดแข็ง', text: aiSummary.strength },
          { Icon: Target, label: 'จุดที่ต้องพัฒนา', text: aiSummary.weak },
          { Icon: TrendingUp, label: 'คำแนะนำ', text: aiSummary.improve },
        ].map(({ Icon, label, text }) => (
          <div key={label} className="flex gap-3 rounded-2xl border border-line p-4">
            <Icon size={18} className="mt-0.5 shrink-0 text-brand" />
            <div><p className="text-sm font-semibold text-ink">{label}</p><p className="mt-0.5 text-sm text-ink-soft">{text}</p></div>
          </div>
        ))}
      </div>
      {/* playlist */}
      <p className="mt-6 text-sm font-semibold text-ink">วิดีโอแนะนำสำหรับคุณ</p>
      <div className="mt-2 space-y-2">
        {playlist.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand"><Play size={14} fill="currentColor" /></span>
            <span className="flex-1 text-sm text-ink">{p.title}</span>
            <span className="text-xs text-ink-mute">{p.duration}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
