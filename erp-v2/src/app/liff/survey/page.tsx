"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2Icon, LoaderCircleIcon, SendIcon, SmileIcon, StarIcon, XCircleIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { FormLang, SurveyAnswers, SurveyToken } from "@/domain/types"
import { cn } from "@/lib/utils"

// Yearly satisfaction survey for parents (owner 2026-10-05) — one per family, a few taps per child, TH / EN / JP.
// The core questions stay the same every year so the school can compare years.

const LANGS: { key: FormLang; label: string }[] = [{ key: "th", label: "TH" }, { key: "en", label: "EN" }, { key: "ja", label: "JP" }]

const DICT = {
  th: {
    title: (y: number) => `แบบสอบถามความพึงพอใจ ปี ${y + 543}`, hello: (f: string) => `เรียน ${f}`, intro: "ขอเวลาประมาณ 3 นาที ทุกความเห็นช่วยให้เราดูแลน้องๆ ได้ดีขึ้นค่ะ",
    nps: "จะแนะนำเราให้เพื่อนหรือคนรู้จักไหม", npsLow: "ไม่แนะนำ", npsHigh: "แนะนำแน่นอน", overall: "ความพึงพอใจโดยรวม",
    child: (n: string) => `สำหรับน้อง${n}`, teachers: "ครูผู้สอน", c: { teacher: "ครูผู้สอน", progress: "พัฒนาการของลูก", level: "เนื้อหาเหมาะกับระดับของลูก" },
    service: "บริการของเรา", s: { admin: "การติดต่อแอดมิน", summary: "สรุปการเรียนที่ส่งให้", schedule: "ตารางเรียน / ความยืดหยุ่น", place: "สถานที่", bus: "รถรับส่ง", value: "ความคุ้มค่า" },
    cont: "ปีหน้าจะให้ลูกเรียนกับเราต่อไหม", cn: { yes: "เรียนต่อ", maybe: "ยังไม่แน่ใจ", no: "ไม่เรียนต่อ" }, wants: "อยากให้เราเปิดอะไรเพิ่ม", wantsSub: "เลือกได้หลายข้อ (ไม่บังคับ)",
    praise: "สิ่งที่ประทับใจ", improve: "สิ่งที่อยากให้ปรับปรุง", optional: "ไม่บังคับ", submit: "ส่งแบบสอบถาม", sending: "กำลังส่ง…", need: "กรุณาตอบ 2 ข้อที่มี * ก่อนส่ง",
    done: "ขอบคุณมากค่ะ", doneSub: "เราได้รับคำตอบแล้ว และจะนำไปปรับปรุงให้ดียิ่งขึ้น 🙏",
    invalid: { invalid: "ลิงก์นี้ไม่ถูกต้อง", used: "ตอบแบบสอบถามนี้แล้ว ขอบคุณค่ะ", expired: "หมดเวลาตอบแบบสอบถามปีนี้แล้ว ขอบคุณค่ะ" }, preview: "โหมดดูตัวอย่าง — ไม่ส่งข้อมูลจริง",
    times: { "เสาร์เช้า": "เสาร์เช้า", "เสาร์บ่าย": "เสาร์บ่าย", "อาทิตย์": "อาทิตย์", "เย็นวันธรรมดา": "เย็นวันธรรมดา" } as Record<string, string>,
  },
  en: {
    title: (y: number) => `Parent satisfaction survey ${y}`, hello: (f: string) => `Dear ${f}`, intro: "About 3 minutes — every answer helps us take better care of your child.",
    nps: "Would you recommend us to a friend?", npsLow: "Not likely", npsHigh: "Very likely", overall: "Overall satisfaction",
    child: (n: string) => `About ${n}`, teachers: "Teacher", c: { teacher: "Teacher", progress: "Your child's progress", level: "Content fits your child's level" },
    service: "Our service", s: { admin: "Talking to our staff", summary: "Lesson summaries", schedule: "Schedule / flexibility", place: "Facilities", bus: "School bus", value: "Value for money" },
    cont: "Will your child continue with us next year?", cn: { yes: "Yes", maybe: "Not sure", no: "No" }, wants: "What should we add?", wantsSub: "Pick any (optional)",
    praise: "What you liked", improve: "What we could do better", optional: "Optional", submit: "Send", sending: "Sending…", need: "Please answer the 2 questions marked *",
    done: "Thank you!", doneSub: "We've received your answers and will use them to improve 🙏",
    invalid: { invalid: "This link is not valid", used: "You've already answered — thank you!", expired: "This year's survey has closed — thank you!" }, preview: "Preview — nothing is sent",
    times: { "เสาร์เช้า": "Saturday morning", "เสาร์บ่าย": "Saturday afternoon", "อาทิตย์": "Sunday", "เย็นวันธรรมดา": "Weekday evenings" } as Record<string, string>,
  },
  ja: {
    title: (y: number) => `${y}年度 保護者満足度アンケート`, hello: (f: string) => `${f} 様`, intro: "約3分で終わります。いただいたご意見はより良い指導のために活用します。",
    nps: "当塾をお友達に勧めますか", npsLow: "勧めない", npsHigh: "ぜひ勧める", overall: "総合満足度",
    child: (n: string) => `${n}さんについて`, teachers: "担当講師", c: { teacher: "講師", progress: "お子様の成長", level: "内容がレベルに合っている" },
    service: "サービス", s: { admin: "スタッフの対応", summary: "授業レポート", schedule: "時間割・柔軟さ", place: "教室環境", bus: "送迎バス", value: "費用対効果" },
    cont: "来年度も継続されますか", cn: { yes: "継続する", maybe: "検討中", no: "継続しない" }, wants: "追加してほしいもの", wantsSub: "複数選択可（任意）",
    praise: "良かった点", improve: "改善してほしい点", optional: "任意", submit: "送信", sending: "送信中…", need: "* の2問にお答えください",
    done: "ありがとうございました", doneSub: "ご回答を受け付けました。今後の改善に活かします 🙏",
    invalid: { invalid: "無効なリンクです", used: "回答済みです。ありがとうございました", expired: "今年度のアンケートは終了しました" }, preview: "プレビュー — 送信されません",
    times: { "เสาร์เช้า": "土曜午前", "เสาร์บ่าย": "土曜午後", "อาทิตย์": "日曜", "เย็นวันธรรมดา": "平日夕方" } as Record<string, string>,
  },
}

type Phase = "init" | "invalid" | "ready" | "sending" | "done"
type Score = number | null

const previewToken = (): SurveyToken => ({
  token: "preview", kind: "survey", campaignId: "sv", year: new Date().getFullYear(), familyId: "f", familyName: "ครอบครัวสุขใจ", branchId: "b", branchName: "ทองหล่อ", brand: "nockacademy", lang: "th", usesBus: true,
  children: [{ id: "a", nickname: "ใบเตย", grade: "ป.5", teacherIds: [], teacherNames: ["ครูได"] }, { id: "b", nickname: "ภูผา", grade: "ม.1", teacherIds: [], teacherNames: ["ครูแพร", "ครูมิ้นท์"] }],
  wantOptions: ["คณิต", "อังกฤษ", "วิทย์", "เสาร์เช้า", "อาทิตย์", "เย็นวันธรรมดา"], conversationId: null, createdAt: "", expiresAt: "", used: false,
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
  const [overall, setOverall] = useState<Score>(null)
  const [kids, setKids] = useState<SurveyAnswers["children"]>([])
  const [service, setService] = useState<SurveyAnswers["service"]>({ admin: null, summary: null, schedule: null, place: null, bus: null, value: null })
  const [cont, setCont] = useState<SurveyAnswers["continueNext"]>(null)
  const [wants, setWants] = useState<string[]>([])
  const [praise, setPraise] = useState("")
  const [improve, setImprove] = useState("")
  const [tried, setTried] = useState(false)
  const t = DICT[lang]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = preview ? { ok: true, token: previewToken() } : await fetch(`/api/parent-forms/survey?token=${encodeURIComponent(tokenStr)}`).then((r) => r.json()).catch(() => ({ ok: false, error: "invalid" }))
      if (cancelled) return
      if (!res.ok) { setError(res.error ?? "invalid"); setPhase("invalid"); return }
      setTk(res.token)
      setKids(res.token.children.map((c: SurveyToken["children"][number]) => ({ studentId: c.id, teacher: null, progress: null, level: null })))
      if (!params.get("lang")) setLang(res.token.lang)
      setPhase("ready")
    })()
    return () => { cancelled = true }
  }, [tokenStr, preview]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setTried(true)
    if (npsV === null || !cont) return
    if (preview) { setPhase("done"); return }
    setPhase("sending")
    const answers: SurveyAnswers = { nps: npsV, overall, children: kids, service: { ...service, bus: tk?.usesBus ? service.bus : null }, continueNext: cont, wants, praise: praise.trim(), improve: improve.trim(), lang }
    const res = await fetch("/api/parent-forms/survey-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tokenStr, answers }) }).then((r) => r.json()).catch(() => ({ ok: false, error: "invalid" }))
    if (!res.ok) { setError(res.error ?? "invalid"); setPhase("invalid"); return }
    setPhase("done")
  }

  if (phase === "init") return <Centered><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></Centered>
  if (phase === "invalid") return <Centered><XCircleIcon className="size-10 text-muted-foreground" /><p className="text-center text-sm">{t.invalid[error]}</p></Centered>
  if (phase === "done") return <Centered><CheckCircle2Icon className="size-12 text-emerald-600" /><p className="text-lg font-semibold">{t.done}</p><p className="max-w-xs text-center text-sm text-muted-foreground">{t.doneSub}</p></Centered>
  const token = tk!
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-muted/40 pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <SmileIcon className="size-5 text-primary" />
          <div className="min-w-0 flex-1"><p className="truncate font-semibold">{t.title(token.year)}</p><p className="truncate text-xs text-muted-foreground">{token.brand === "liclass" ? "Liclass" : "NockAcademy"} · {token.branchName}</p></div>
          <div className="flex rounded-full bg-muted p-0.5">{LANGS.map((l) => <button key={l.key} type="button" onClick={() => setLang(l.key)} className={cn("rounded-full px-2.5 py-1 text-xs", lang === l.key ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{l.label}</button>)}</div>
        </div>
        {preview && <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-center text-xs text-amber-900">{t.preview}</p>}
      </header>
      <main className="space-y-3 p-4">
        <Card><p className="font-medium">{t.hello(token.familyName)}</p><p className="mt-1 text-sm text-muted-foreground">{t.intro}</p></Card>
        <Card title={`${t.nps} *`} error={tried && npsV === null}>
          <div className="grid grid-cols-11 gap-1">{Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" onClick={() => setNps(n)} className={cn("h-9 rounded-lg border text-sm tabular-nums", npsV === n ? (n <= 6 ? "border-red-500 bg-red-500 text-white" : n <= 8 ? "border-amber-500 bg-amber-500 text-white" : "border-emerald-600 bg-emerald-600 text-white") : "bg-background")}>{n}</button>
          ))}</div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{t.npsLow}</span><span>{t.npsHigh}</span></div>
        </Card>
        <Card title={t.overall}><Stars value={overall} onChange={setOverall} big /></Card>
        {token.children.map((c, i) => (
          <Card key={c.id} title={t.child(c.nickname)} sub={c.teacherNames.filter(Boolean).length ? `${t.teachers}: ${c.teacherNames.filter(Boolean).join(", ")}` : undefined}>
            <div className="space-y-2">{(Object.keys(t.c) as (keyof typeof t.c)[]).map((k) => (
              <Row key={k} label={t.c[k]}><Stars value={kids[i]?.[k] ?? null} onChange={(v) => setKids((ks) => ks.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} /></Row>
            ))}</div>
          </Card>
        ))}
        <Card title={t.service}>
          <div className="space-y-2">{(Object.keys(t.s) as (keyof typeof t.s)[]).filter((k) => k !== "bus" || token.usesBus).map((k) => (
            <Row key={k} label={t.s[k]}><Stars value={service[k]} onChange={(v) => setService((s) => ({ ...s, [k]: v }))} /></Row>
          ))}</div>
        </Card>
        <Card title={`${t.cont} *`} error={tried && !cont}>
          <div className="grid grid-cols-3 gap-2">{(["yes", "maybe", "no"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setCont(k)} className={cn("rounded-full border px-3 py-2 text-sm", cont === k ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{t.cn[k]}</button>
          ))}</div>
        </Card>
        <Card title={t.wants} sub={t.wantsSub}>
          <div className="flex flex-wrap gap-2">{token.wantOptions.map((w) => (
            <button key={w} type="button" onClick={() => setWants((x) => (x.includes(w) ? x.filter((y) => y !== w) : [...x, w]))} className={cn("rounded-full border px-3 py-1.5 text-sm", wants.includes(w) ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{t.times[w] ?? w}</button>
          ))}</div>
        </Card>
        <Card title={t.praise} sub={t.optional}><Textarea rows={3} value={praise} onChange={(e) => setPraise(e.target.value)} /></Card>
        <Card title={t.improve} sub={t.optional}><Textarea rows={3} value={improve} onChange={(e) => setImprove(e.target.value)} /></Card>
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {tried && (npsV === null || !cont) && <p className="mb-2 text-center text-xs text-red-600">{t.need}</p>}
          <Button className="h-11 w-full" disabled={phase === "sending"} onClick={submit}><SendIcon /> {phase === "sending" ? t.sending : t.submit}</Button>
        </div>
      </div>
    </div>
  )
}

function Stars({ value, onChange, big }: { value: Score; onChange: (v: Score) => void; big?: boolean }) {
  return (
    <div className="flex shrink-0 gap-0.5">{[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" aria-label={`${n}`} onClick={() => onChange(value === n ? null : n)}>
        <StarIcon className={cn(big ? "size-9" : "size-7", (value ?? 0) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
      </button>
    ))}</div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-2"><span className="min-w-0 flex-1 text-sm">{label}</span>{children}</div>
}

function Card({ title, sub, error, children }: { title?: string; sub?: string; error?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-background p-4 shadow-sm ring-1 ring-foreground/5", error && "ring-2 ring-red-400")}>
      {title && <div className="mb-3"><p className="font-medium">{title}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>}
      {children}
    </section>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">{children}</div>
}
