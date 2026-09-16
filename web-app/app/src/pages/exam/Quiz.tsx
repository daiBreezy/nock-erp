import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ListChecks, Clock, ArrowRight, BookOpenCheck, Check, X, Trophy, RotateCcw } from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'

type Choice = { n: number; text?: string }
type Question = {
  n: number
  text: string
  image?: boolean
  imageChoices?: boolean
  choices: Choice[]
  correct: number
}

const QTEXT = 'จากแผนภูมิแท่ง จงตอบคำถามต่อไปนี้ จำนวนร้อยละ ของผู้สูงอายุเพศหญิง ส่วนใหญ่มีมูลค่า การออมเป็นเท่าใด'
const CHOICES: Choice[] = [
  { n: 1, text: 'Placerat pellentesque erat phasellus nisi.' },
  { n: 2, text: 'Mattis placerat pellentesque erat phasellus nisi.' },
  { n: 3, text: 'Mi mattis placerat pellentesque erat phasellus nisi. Mi mattis placerat pellentesque erat phasellus nisi.' },
  { n: 4, text: 'Lorem ipsum dolor sit amet consectetur.' },
]

const questions: Question[] = [
  { n: 1, text: QTEXT, choices: CHOICES, correct: 2 },
  { n: 2, text: QTEXT, image: true, choices: CHOICES, correct: 2 },
  { n: 3, text: QTEXT, imageChoices: true, choices: CHOICES, correct: 1 },
  { n: 4, text: QTEXT, choices: CHOICES, correct: 4 },
  { n: 5, text: QTEXT, choices: CHOICES, correct: 3 },
  { n: 6, text: QTEXT, image: true, choices: CHOICES, correct: 2 },
]

const TOTAL = 36

/* ---------- choices ---------- */

type CState = 'idle' | 'selected' | 'correct' | 'wrong'

function stateOf(cn: number, selected: number | undefined, correct: number, submitted: boolean): CState {
  if (!submitted) return selected === cn ? 'selected' : 'idle'
  if (cn === correct) return 'correct'
  if (cn === selected) return 'wrong'
  return 'idle'
}

const borderCls: Record<CState, string> = {
  idle: 'border-line',
  selected: 'border-premium bg-premium/10',
  correct: 'border-success bg-success/10',
  wrong: 'border-live bg-live/10',
}

function Bullet({ n, s }: { n: number; s: CState }) {
  if (s === 'correct') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white"><Check size={13} /></span>
  if (s === 'wrong') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-live text-white"><X size={13} /></span>
  return <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s === 'selected' ? 'bg-premium text-white' : 'bg-surface-2 text-ink-soft'}`}>{n}</span>
}

function ChoiceList({ q, selected, submitted, onSelect }: { q: Question; selected?: number; submitted: boolean; onSelect: (n: number) => void }) {
  if (q.imageChoices) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {q.choices.map((c) => {
          const s = stateOf(c.n, selected, q.correct, submitted)
          return (
            <button key={c.n} disabled={submitted} onClick={() => onSelect(c.n)} className={`overflow-hidden rounded-xl border-2 p-2 text-left ${borderCls[s]}`}>
              <div className="mb-2"><Bullet n={c.n} s={s} /></div>
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[#8FD3F4] to-[#84FAB0]" />
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div className="space-y-2.5">
      {q.choices.map((c) => {
        const s = stateOf(c.n, selected, q.correct, submitted)
        return (
          <button key={c.n} disabled={submitted} onClick={() => onSelect(c.n)} className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${borderCls[s]} ${!submitted && s === 'idle' ? 'hover:border-premium/50' : ''}`}>
            <Bullet n={c.n} s={s} />
            <span className="text-sm text-ink">{c.text}</span>
          </button>
        )
      })}
    </div>
  )
}

function QuestionCard({ q, selected, submitted, onSelect }: { q: Question; selected?: number; submitted: boolean; onSelect: (n: number) => void }) {
  return (
    <div className="flex h-full flex-col rounded-card border border-line bg-surface-1 p-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-premium/15 text-sm font-semibold text-premium">{q.n}</span>
      <p className="mt-3 text-sm leading-relaxed text-ink">{q.text}</p>
      {q.image && <div className="mt-3 aspect-[16/9] rounded-xl bg-gradient-to-br from-[#243B55] to-[#141E30]" />}
      <div className="mt-auto pt-4"><ChoiceList q={q} selected={selected} submitted={submitted} onSelect={onSelect} /></div>
    </div>
  )
}

function IntroCard({ onStart }: { onStart: () => void }) {
  const [timed, setTimed] = useState(true)
  return (
    <div className="flex flex-col rounded-card bg-brand-soft p-5">
      <p className="text-sm leading-relaxed text-ink">ก่อนเริ่มสอบ ลองหลับตา แล้วหายใจ เข้า - ออกลึกๆ ก่อนเริ่มสอบ จะช่วยให้มีสมาธิมากขึ้นนะ!</p>
      <p className="mt-4 text-lg font-bold text-ink">แต่ถ้าพร้อมแล้ว ก็ไปลุยกันเลย</p>
      <label className="mt-4 flex items-center gap-2 text-sm text-ink">
        <button onClick={() => setTimed((v) => !v)} className={`flex h-5 w-5 items-center justify-center rounded ${timed ? 'bg-brand text-white' : 'border border-ink-mute'}`}>{timed && <Check size={13} />}</button>
        จับเวลาการสอบด้วย
      </label>
      <button onClick={onStart} className="mt-4 flex items-center justify-center gap-1.5 rounded-pill bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"><ArrowRight size={16} /> เริ่มทำข้อสอบเลย</button>
    </div>
  )
}

function SubmitCard({ onSubmit }: { onSubmit: () => void }) {
  return (
    <div className="flex flex-col rounded-card bg-[#8FE3C4] p-5 text-[#0F5C40]">
      <p className="text-lg font-bold">เรียบร้อยแล้ว ส่งคำตอบเลยดีกว่า</p>
      <p className="mt-1 text-sm">กดส่งคำตอบ แล้วดูเฉลยกันเถอะ</p>
      <button onClick={onSubmit} className="mt-5 flex items-center justify-center gap-1.5 rounded-pill bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"><Check size={16} /> ส่งคำตอบ</button>
    </div>
  )
}

function ScoreCard({ correct, total, pct, onRetry, onFinish, onRank }: { correct: number; total: number; pct: number; onRetry: () => void; onFinish: () => void; onRank: () => void }) {
  return (
    <div className="flex flex-col rounded-card bg-[#8FE3C4] p-5 text-[#0F5C40]">
      <p className="text-4xl font-extrabold leading-none">{correct}<span className="text-2xl">/{total}</span></p>
      <div className="mt-2 flex items-center justify-between text-sm"><span>คะแนน</span><span className="text-lg font-bold">{pct}%</span></div>
      <div className="mt-1 flex items-center gap-1.5 text-sm"><Clock size={14} /> 00:53:51</div>
      <p className="mt-4 text-base font-bold">เรียบร้อยแล้ว ดูเฉลยรายข้อได้เลย</p>
      <button onClick={onRank} className="mt-4 flex items-center justify-center gap-1.5 rounded-pill bg-white/50 py-2 text-sm font-medium"><Trophy size={15} /> ดูอันดับ</button>
      <button onClick={onRetry} className="mt-2 flex items-center justify-center gap-1.5 rounded-pill bg-white/50 py-2 text-sm font-medium"><RotateCcw size={15} /> ลองอีกครั้ง</button>
      <button onClick={onFinish} className="mt-2 flex items-center justify-center gap-1.5 rounded-pill bg-success py-2.5 text-sm font-semibold text-white"><Check size={16} /> เสร็จสิ้น</button>
    </div>
  )
}

function Navigator({ current, answers, submitted, onJump }: { current: number; answers: Record<number, number>; submitted: boolean; onJump: (i: number) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {Array.from({ length: TOTAL }, (_, i) => {
        const n = i + 1
        const q = questions[i]
        let cls = 'border border-line text-ink-soft'
        if (submitted && q) cls = answers[n] === q.correct ? 'bg-success/15 text-success' : 'bg-live/15 text-live'
        else if (i === current) cls = 'bg-premium text-white'
        else if (answers[n] != null) cls = 'bg-premium/15 text-premium'
        return (
          <button key={n} onClick={() => i < questions.length && onJump(i)} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${cls} ${i >= questions.length ? 'cursor-not-allowed opacity-40' : ''}`}>{n}</button>
        )
      })}
    </div>
  )
}

/* ---------- page ---------- */

export default function Quiz() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<Record<number, number>>({ 1: 2, 2: 2, 3: 3, 4: 4, 5: 1, 6: 2 })
  const [current, setCurrent] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const select = (qn: number, cn: number) => setAnswers((a) => ({ ...a, [qn]: cn }))

  const correctCount = questions.filter((q) => answers[q.n] === q.correct).length
  const pct = Math.round((correctCount / questions.length) * 100)
  const retry = () => { setAnswers({}); setSubmitted(false); setCurrent(0) }

  // กดเลขข้อ → เด้งไปการ์ดข้อนั้น (desktop scroll, mobile เปลี่ยนการ์ด)
  const jumpTo = (i: number) => {
    setCurrent(i)
    requestAnimationFrame(() =>
      document.getElementById(`q-${i + 1}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }),
    )
  }

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={22} /></button>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-subject-english text-subject-english-ink"><BookOpenCheck size={18} /></span>
        <div>
          <h1 className="text-base font-bold leading-tight text-ink md:text-lg">เตรียมสอบเข้า รร.ดัง (จุฬาภร, เตรียมอุดมฯ, สวนกุหลาบ)</h1>
          <div className="mt-1 flex gap-1.5">{['คณิต', 'ป.5', 'ป.6'].map((t) => (<span key={t} className="rounded-pill bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">{t}</span>))}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1 rounded-pill bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-soft"><ListChecks size={13} /> 100 ข้อ</span>
        <span className="flex items-center gap-1 rounded-pill bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-soft"><Clock size={13} /> 00:01:07</span>
      </div>
    </div>
  )

  const endCard = submitted
    ? <ScoreCard correct={correctCount} total={questions.length} pct={pct} onRetry={retry} onFinish={() => navigate('/exam')} onRank={() => navigate('/profile/ranking')} />
    : <SubmitCard onSubmit={() => setSubmitted(true)} />

  return (
    <div className="min-h-screen bg-surface-0">
      {/* ===== Web ===== */}
      <div className="hidden md:block">
        <DesktopNav />
        <div className="px-8 py-6">
          {header}
          <div className="mt-5"><Navigator current={current} answers={answers} submitted={submitted} onJump={jumpTo} /></div>
          <div className="mt-6 flex min-h-[calc(100vh-260px)] items-stretch gap-5 overflow-x-auto pb-4">
            {!submitted && <div className="w-[300px] shrink-0 self-start"><IntroCard onStart={() => setCurrent(0)} /></div>}
            {questions.map((q, i) => (
              <div key={q.n} id={`q-${q.n}`} className={`w-[440px] shrink-0 ${i === current && !submitted ? 'rounded-card ring-2 ring-premium/40' : ''}`}>
                <QuestionCard q={q} selected={answers[q.n]} submitted={submitted} onSelect={(cn) => select(q.n, cn)} />
              </div>
            ))}
            <div className="w-[300px] shrink-0 self-start">{endCard}</div>
          </div>
        </div>
      </div>

      {/* ===== Mobile ===== */}
      <div className="flex min-h-screen flex-col bg-surface-0 md:hidden">
        <div className="border-b border-line px-4 py-3">{header}</div>
        <div className="border-b border-line px-4 py-3"><Navigator current={current} answers={answers} submitted={submitted} onJump={jumpTo} /></div>
        <div className="flex-1 space-y-4 px-4 py-4">
          {submitted && (
            <ScoreCard correct={correctCount} total={questions.length} pct={pct} onRetry={retry} onFinish={() => navigate('/exam')} onRank={() => navigate('/profile/ranking')} />
          )}
          <QuestionCard q={questions[current]} selected={answers[questions[current].n]} submitted={submitted} onSelect={(cn) => select(questions[current].n, cn)} />
        </div>
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface-1 px-4 py-3">
          <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-soft disabled:opacity-40"><ChevronLeft size={18} /></button>
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-brand py-2.5 text-sm font-semibold text-white">ข้อถัดไป <ChevronRight size={16} /></button>
          ) : submitted ? (
            <button onClick={() => navigate('/exam')} className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-success py-2.5 text-sm font-semibold text-white"><Check size={16} /> เสร็จสิ้น</button>
          ) : (
            <button onClick={() => setSubmitted(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-pill bg-brand py-2.5 text-sm font-semibold text-white"><Check size={16} /> ส่งคำตอบ</button>
          )}
        </div>
      </div>
    </div>
  )
}
