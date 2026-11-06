"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AngryIcon, CheckCircle2Icon, FrownIcon, LaughIcon, LoaderCircleIcon, MehIcon, SendIcon, SmileIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { FormLang, SurveyAnswers, SurveyImprove, SurveyReason, SurveyToken, SurveyTopic } from "@/domain/types"
import { NativeSelect } from "@/components/app/native-select"
import { cn } from "@/lib/utils"

// Yearly satisfaction survey for parents (owner 2026-10-05) — one per family, TH / EN / JP.
// owner 2026-10-21: the questions are the school's real survey (Google Form, NockAcademy Bangna) so years compare —
// Q1 subjects and Q2 grade are known from the enrolment and shown, not asked.


const DICT = {
  th: {
    title: (y: number) => `แบบสำรวจความคิดเห็นและความพึงพอใจของผู้ปกครอง ปี ${y + 543}`, hello: (f: string) => `เรียน ${f}`, intro: "ขอเวลาประมาณ 3 นาที ทุกความเห็นช่วยให้เราดูแลน้องๆ ได้ดีขึ้นค่ะ",
    kids: "วิชาที่เรียน / ระดับชั้น", nps: "ผู้ปกครองมีแนวโน้มที่จะแนะนำ NockAcademy ให้กับผู้อื่นมากน้อยเพียงใด?", npsOpts: ["ไม่แนะนำ", "อาจจะแนะนำ", "แนะนำแน่นอน"],
    reasons: "อะไรคือเหตุผลที่ทำให้ให้คะแนนดังกล่าว? (เลือกได้มากกว่า 1 ข้อ)",
    r: { content: "เนื้อหาบทเรียนตรงตามหลักสูตรและเข้าใจง่าย", teaching: "เทคนิคการสอนของครูช่วยให้เด็กมีพัฒนาการที่ดีขึ้น", feedback: "ระบบ Feedback รายงานผลการเรียนที่ชัดเจนและสม่ำเสมอ", schedule: "ตารางเรียนที่สถาบันจัดไว้ให้มีความเหมาะสม", value: "ความคุ้มค่าของค่าเล่าเรียนเมื่อเทียบกับคุณภาพ", other: "อื่นๆ" },
    scores: "ระดับความพึงพอใจต่อประสบการณ์การเรียนที่ NockAcademy ในแต่ละด้าน",
    t: { teacher: "คุณครูผู้สอน", content: "คุณภาพหลักสูตรและเนื้อหาการสอน", feedback: "ระบบการให้ Feedback", value: "ความคุ้มค่าของค่าเล่าเรียน", place: "ห้องเรียน อาคารสถานที่" },
    scale: { 5: "มากที่สุด", 4: "มาก", 3: "ปานกลาง", 2: "น้อย", 1: "ไม่พอใจ" } as Record<number, string>,
    improve: "ท่านอยากให้เราปรับปรุงหรือเพิ่มเติมเรื่องใดมากที่สุด?",
    i: { exam: "เพิ่มความเข้มข้นของเนื้อหาเพื่อการสอบแข่งขัน", challenge: "เพิ่มจำนวนโจทย์ท้าทายและคลังข้อสอบเก่า", activities: "เพิ่มกิจกรรมเสริมทักษะนอกเหนือจากวิชาหลัก", one_on_one: "เพิ่มการสื่อสารหรือการให้คำปรึกษาแบบตัวต่อตัวกับครูผู้สอน", school: "เนื้อหาที่ตรงกับหลักสูตรของโรงเรียนมากขึ้น", facility: "ความเรียบร้อยของอาคารสถานที่รวมถึงความสะอาดของสถาบัน", other: "อื่นๆ" },
    otherPh: "โปรดระบุ", courses: "คอร์สที่อยากให้ NockAcademy School เปิดสอนเพิ่มเติม", optional: "ไม่บังคับ",
    message: "ท่านมีข้อความใดอยากบอกครูทุกท่านและสถาบัน แนะนำ ติชม ความคิดเห็นเกี่ยวกับคอร์สเรียน หรือสิ่งที่ต้องการแจ้งโรงเรียน",
    submit: "ส่งแบบสอบถาม", sending: "กำลังส่ง…", need: "กรุณาตอบข้อที่มี * ให้ครบก่อนส่ง",
    done: "ขอบคุณมากค่ะ", doneSub: "เราได้รับคำตอบแล้ว และจะนำไปปรับปรุงให้ดียิ่งขึ้น 🙏",
    invalid: { invalid: "ลิงก์นี้ไม่ถูกต้อง", used: "ตอบแบบสอบถามนี้แล้ว ขอบคุณค่ะ", expired: "หมดเวลาตอบแบบสอบถามปีนี้แล้ว ขอบคุณค่ะ" }, preview: "โหมดดูตัวอย่าง — ไม่ส่งข้อมูลจริง",
  },
  en: {
    title: (y: number) => `Parent feedback & satisfaction survey ${y}`, hello: (f: string) => `Dear ${f}`, intro: "About 3 minutes — every answer helps us take better care of your child.",
    kids: "Subjects / grade", nps: "How likely are you to recommend NockAcademy to others?", npsOpts: ["Would not", "Maybe", "Definitely"],
    reasons: "What are the reasons for your score? (pick any)",
    r: { content: "Lessons follow the curriculum and are easy to understand", teaching: "Teachers' techniques help my child improve", feedback: "Clear, regular feedback on progress", schedule: "The class schedule suits us", value: "Good value for the quality", other: "Other" },
    scores: "How satisfied are you with each part of learning at NockAcademy?",
    t: { teacher: "Teachers", content: "Curriculum and teaching content", feedback: "Feedback system", value: "Value for money", place: "Classrooms and building" },
    scale: { 5: "Very satisfied", 4: "Satisfied", 3: "Neutral", 2: "Slightly", 1: "Dissatisfied" } as Record<number, string>,
    improve: "What would you most like us to improve or add?",
    i: { exam: "More in-depth content for competitive exams", challenge: "More challenging problems and past papers", activities: "Activities beyond the core subjects", one_on_one: "More one-to-one talks with the teacher", school: "Content closer to my child's school curriculum", facility: "Tidier, cleaner building and classrooms", other: "Other" },
    otherPh: "Please specify", courses: "Courses you'd like NockAcademy School to open", optional: "Optional",
    message: "Any message for our teachers and school — suggestions, compliments, comments on the course, or anything you'd like to tell us",
    submit: "Send", sending: "Sending…", need: "Please answer every question marked *",
    done: "Thank you!", doneSub: "We've received your answers and will use them to improve 🙏",
    invalid: { invalid: "This link is not valid", used: "You've already answered — thank you!", expired: "This year's survey has closed — thank you!" }, preview: "Preview — nothing is sent",
  },
  ja: {
    title: (y: number) => `${y}年度 保護者アンケート（ご意見・満足度）`, hello: (f: string) => `${f} 様`, intro: "約3分で終わります。いただいたご意見はより良い指導のために活用します。",
    kids: "受講科目・学年", nps: "NockAcademy を他の方に勧める可能性はどのくらいですか？", npsOpts: ["勧めない", "どちらとも", "ぜひ勧める"],
    reasons: "その点数をつけた理由は何ですか？（複数選択可）",
    r: { content: "カリキュラムに沿い分かりやすい内容", teaching: "講師の指導で子どもが成長している", feedback: "学習報告が明確で定期的", schedule: "時間割が合っている", value: "質に対して授業料が見合っている", other: "その他" },
    scores: "NockAcademy での学習について、各項目の満足度をお答えください",
    t: { teacher: "担当講師", content: "カリキュラム・指導内容", feedback: "フィードバック", value: "授業料の費用対効果", place: "教室・施設" },
    scale: { 5: "とても満足", 4: "満足", 3: "普通", 2: "やや不満", 1: "不満" } as Record<number, string>,
    improve: "最も改善・追加してほしいことは何ですか？",
    i: { exam: "受験向けの内容を充実", challenge: "難問・過去問を増やす", activities: "主要科目以外の活動を増やす", one_on_one: "講師との個別相談を増やす", school: "学校のカリキュラムに合わせる", facility: "施設の整頓・清潔さ", other: "その他" },
    otherPh: "具体的にご記入ください", courses: "NockAcademy School に開講してほしいコース", optional: "任意",
    message: "講師・スクールへのメッセージ（ご提案・ご感想・コースについてのご意見・連絡事項など）",
    submit: "送信", sending: "送信中…", need: "* の質問にすべてお答えください",
    done: "ありがとうございました", doneSub: "ご回答を受け付けました。今後の改善に活かします 🙏",
    invalid: { invalid: "無効なリンクです", used: "回答済みです。ありがとうございました", expired: "今年度のアンケートは終了しました" }, preview: "プレビュー — 送信されません",
  },
}

type Phase = "init" | "invalid" | "ready" | "sending" | "done"
type Score = number | null
const REASONS: SurveyReason[] = ["content", "teaching", "feedback", "schedule", "value", "other"]
const TOPICS: SurveyTopic[] = ["teacher", "content", "feedback", "value", "place"]
const IMPROVES: SurveyImprove[] = ["exam", "challenge", "activities", "one_on_one", "school", "facility", "other"]

const previewToken = (): SurveyToken => ({
  token: "preview", kind: "survey", campaignId: "sv", year: new Date().getFullYear(), familyId: "f", familyName: "ครอบครัวสุขใจ", branchId: "b", branchName: "ทองหล่อ", brand: "nockacademy", lang: "th", usesBus: true,
  children: [{ id: "a", nickname: "ใบเตย", grade: "ป.5", teacherIds: [], teacherNames: ["ครูได"], subjects: ["คณิต"] }, { id: "b", nickname: "ภูผา", grade: "ม.1", teacherIds: [], teacherNames: ["ครูแพร", "ครูมิ้นท์"], subjects: ["อังกฤษ", "วิทย์"] }],
  conversationId: null, createdAt: "", expiresAt: "", used: false,
})

export default function SurveyPage() {
  return <Suspense fallback={<Centered><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></Centered>}><Survey /></Suspense>
}

function Survey() {
  const params = useSearchParams()
  const tokenStr = params.get("token") ?? ""
  const preview = params.get("preview") !== null
  const [phase, setPhase] = useState<Phase>("init")
  const [error, setError] = useState<"invalid" | "used" | "expired">("invalid")
  const [tk, setTk] = useState<SurveyToken | null>(null)
  const [lang, setLang] = useState<FormLang>((params.get("lang") as FormLang) || "th")
  const [npsV, setNps] = useState<Score>(null)
  const [reasons, setReasons] = useState<SurveyReason[]>([])
  const [reasonOther, setReasonOther] = useState("")
  const [scores, setScores] = useState<Record<SurveyTopic, Score>>({ teacher: null, content: null, feedback: null, value: null, place: null })
  const [improve, setImprove] = useState<SurveyImprove | null>(null)
  const [improveOther, setImproveOther] = useState("")
  const [courses, setCourses] = useState("")
  const [message, setMessage] = useState("")
  const [tried, setTried] = useState(false)
  const t = DICT[lang]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = preview ? { ok: true, token: previewToken() } : await fetch(`/api/parent-forms/survey?token=${encodeURIComponent(tokenStr)}`).then((r) => r.json()).catch(() => ({ ok: false, error: "invalid" }))
      if (cancelled) return
      if (!res.ok) { setError(res.error ?? "invalid"); setPhase("invalid"); return }
      setTk(res.token)
      if (!params.get("lang")) setLang(res.token.lang)
      setPhase("ready")
    })()
    return () => { cancelled = true }
  }, [tokenStr, preview]) // eslint-disable-line react-hooks/exhaustive-deps

  // required as on the real form: Q3–Q6 and Q8 ("other" needs its words)
  const missing = {
    nps: npsV === null,
    reasons: !reasons.length || (reasons.includes("other") && !reasonOther.trim()),
    scores: TOPICS.some((k) => scores[k] === null),
    improve: !improve || (improve === "other" && !improveOther.trim()),
    message: !message.trim(),
  }
  const submit = async () => {
    setTried(true)
    if (Object.values(missing).some(Boolean)) return
    if (preview) { setPhase("done"); return }
    setPhase("sending")
    const answers: SurveyAnswers = { nps: npsV, reasons, reasonOther: reasons.includes("other") ? reasonOther.trim() : "", scores, improve, improveOther: improve === "other" ? improveOther.trim() : "", wantCourses: courses.trim(), message: message.trim(), lang }
    const res = await fetch("/api/parent-forms/survey-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tokenStr, answers }) }).then((r) => r.json()).catch(() => ({ ok: false, error: "invalid" }))
    if (!res.ok) { setError(res.error ?? "invalid"); setPhase("invalid"); return }
    setPhase("done")
  }

  if (phase === "init") return <Centered><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></Centered>
  if (phase === "invalid") return <Centered><XCircleIcon className="size-10 text-muted-foreground" /><p className="text-center text-sm">{t.invalid[error]}</p></Centered>
  if (phase === "done") return <Centered><CheckCircle2Icon className="size-12 text-emerald-600" /><p className="text-lg font-semibold">{t.done}</p><p className="max-w-xs text-center text-sm text-muted-foreground">{t.doneSub}</p></Centered>
  const token = tk!
  const chip = (on: boolean) => cn("min-h-12 rounded-2xl border px-4 py-3 text-left text-base leading-snug", on ? "border-primary bg-primary text-primary-foreground" : "bg-background")
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-muted/40 pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <SmileIcon className="size-5 text-primary" />
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{t.title(token.year)}</p><p className="truncate text-xs text-muted-foreground">{token.brand === "liclass" ? "Liclass" : "NockAcademy"} · {token.branchName}</p></div>
          {!preview && <NativeSelect className="w-32 shrink-0" value={lang} onChange={(e) => setLang(e.target.value as FormLang)} options={[{ value: "th", label: "ไทย" }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]} />}
        </div>
        {preview && <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-center text-xs text-amber-900">{t.preview}</p>}
      </header>
      <main className="space-y-4 p-4">
        <Card><p className="text-lg font-semibold">{t.hello(token.familyName)}</p><p className="mt-1.5 text-sm text-muted-foreground">{t.intro}</p></Card>
        {/* Q1–Q2: from the enrolment */}
        <Card title={t.kids}>
          <ul className="space-y-1.5 text-base">{token.children.map((c) => <li key={c.id}><span className="font-medium">{c.nickname}</span> · {c.grade}{c.subjects?.length ? ` · ${c.subjects.join(", ")}` : ""}</li>)}</ul>
        </Card>
        <Card title={`${t.nps} *`} error={tried && missing.nps}>
          <div className="grid grid-cols-3">{NPS_CHOICES.map(({ value, Face, on }, i) => (
            <button key={value} type="button" aria-pressed={npsV !== null && npsBucket(npsV) === i} onClick={() => setNps(value)} className="flex flex-col items-center gap-1.5">
              <span className={cn("grid size-14 place-items-center rounded-full border-2 transition-colors", npsV !== null && npsBucket(npsV) === i ? on : "border-border bg-background text-muted-foreground/50")}><Face className="size-7" strokeWidth={1} /></span>
              <span className={cn("text-sm leading-tight", npsV !== null && npsBucket(npsV) === i ? "font-semibold text-foreground" : "text-muted-foreground")}>{t.npsOpts[i]}</span>
            </button>
          ))}</div>
        </Card>
        <Card title={`${t.reasons} *`} error={tried && missing.reasons}>
          <div className="grid gap-2.5">{REASONS.map((k) => (
            <button key={k} type="button" onClick={() => setReasons((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))} className={chip(reasons.includes(k))}>{t.r[k]}</button>
          ))}</div>
          {reasons.includes("other") && <Input className="mt-2" placeholder={t.otherPh} value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} />}
        </Card>
        <Card title={`${t.scores} *`} error={tried && missing.scores}>
          <div className="space-y-6">{TOPICS.map((k) => (
            <div key={k}>
              <p className="mb-3 text-base font-medium">{t.t[k]}</p>
              <div className="grid grid-cols-5">{[1, 2, 3, 4, 5].map((n) => {
                const Face = FACES[n], on = scores[k] === n
                return (
                  <button key={n} type="button" aria-pressed={on} onClick={() => setScores((x) => ({ ...x, [k]: n }))} className="flex flex-col items-center gap-1.5">
                    <span className={cn("grid size-14 place-items-center rounded-full border-2 transition-colors", on ? FACE_ON(n) : "border-border bg-background text-muted-foreground/50")}><Face className="size-7" strokeWidth={1} /></span>
                    <span className={cn("text-xs leading-tight", on ? "font-semibold text-foreground" : "text-muted-foreground")}>{t.scale[n]}</span>
                  </button>
                )
              })}</div>
            </div>
          ))}</div>
        </Card>
        <Card title={`${t.improve} *`} error={tried && missing.improve}>
          <div className="grid gap-2.5">{IMPROVES.map((k) => (
            <button key={k} type="button" onClick={() => setImprove(k)} className={chip(improve === k)}>{t.i[k]}</button>
          ))}</div>
          {improve === "other" && <Input className="mt-2" placeholder={t.otherPh} value={improveOther} onChange={(e) => setImproveOther(e.target.value)} />}
        </Card>
        <Card title={t.courses} sub={t.optional}><Textarea rows={3} className="text-base" value={courses} onChange={(e) => setCourses(e.target.value)} /></Card>
        <Card title={`${t.message} *`} error={tried && missing.message}><Textarea rows={5} className="text-base" value={message} onChange={(e) => setMessage(e.target.value)} /></Card>
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {tried && Object.values(missing).some(Boolean) && <p className="mb-2 text-center text-xs text-red-600">{t.need}</p>}
          <Button className="h-12 w-full text-base" disabled={phase === "sending"} onClick={submit}><SendIcon /> {phase === "sending" ? t.sending : t.submit}</Button>
        </div>
      </div>
    </div>
  )
}

// owner 2026-11-06: three choices instead of 0–10 — stored as a representative NPS score (detractor 0–6 → 3, passive 7–8 → 8, promoter 9–10 → 10)
const NPS_CHOICES = [
  { value: 3, Face: FrownIcon, on: "border-red-500 bg-red-500 text-white" },
  { value: 8, Face: MehIcon, on: "border-amber-500 bg-amber-500 text-white" },
  { value: 10, Face: LaughIcon, on: "border-emerald-600 bg-emerald-600 text-white" },
]
const npsBucket = (n: number) => (n <= 6 ? 0 : n <= 8 ? 1 : 2)
const FACES: Record<number, typeof SmileIcon> = { 5: LaughIcon, 4: SmileIcon, 3: MehIcon, 2: FrownIcon, 1: AngryIcon }
const FACE_ON = (n: number) => (n <= 2 ? "border-red-500 bg-red-500 text-white" : n === 3 ? "border-amber-500 bg-amber-500 text-white" : "border-emerald-600 bg-emerald-600 text-white")

function Card({ title, sub, error, children }: { title?: string; sub?: string; error?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-background p-5 shadow-sm ring-1 ring-foreground/5", error && "ring-2 ring-red-400")}>
      {title && <div className="mb-4"><p className="text-base font-semibold leading-snug">{title}</p>{sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}</div>}
      {children}
    </section>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">{children}</div>
}
