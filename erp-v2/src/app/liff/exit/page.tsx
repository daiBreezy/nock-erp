"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2Icon, FrownIcon, HeartHandshakeIcon, LaughIcon, LoaderCircleIcon, MehIcon, SendIcon, StarIcon, XCircleIcon } from "lucide-react"
import { IconChoices } from "../icon-choices"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { addDays, toDateStr } from "@/domain/dates"
import { reasonsForStudent } from "@/domain/rules/loss"
import type { ExitAnswers, ExitToken, FormLang } from "@/domain/types"
import { NativeSelect } from "@/components/app/native-select"
import { cn } from "@/lib/utils"

// The exit form a parent fills when a child stops studying (owner 2026-10-05) — TH / EN / JP, one page, mostly taps.
// Opens from the LINE link or a copied link: the one-time token is all it needs.

const LOCALE: Record<FormLang, string> = { th: "th-TH", en: "en-GB", ja: "ja-JP" }

const DICT = {
  th: {
    title: "แบบฟอร์มแจ้งหยุดเรียน", hello: (f: string) => `เรียน ${f}`, intro: "ขอบคุณที่ไว้วางใจให้เราดูแลน้องๆ ที่ผ่านมา รบกวนช่วยตอบสั้นๆ เพื่อให้เราปรับปรุงการสอนและบริการค่ะ (ประมาณ 2 นาที)",
    lastDay: "เรียนวันสุดท้าย", reason: "เหตุผลหลักที่หยุดเรียน", reasonSub: "เลือก 1 ข้อ", others: "มีเหตุผลอื่นด้วยไหม", othersSub: "เลือกได้หลายข้อ (ไม่บังคับ)",
    rate: "ให้คะแนนเรา", rateSub: "1 = ควรปรับปรุง · 5 = ดีมาก", scores: { teacher: "ครูผู้สอน", content: "เนื้อหาและการเรียน", admin: "การดูแลจากแอดมิน", value: "ความคุ้มค่า" },
    comeBack: "คิดว่าจะกลับมาเรียนกับเราไหม", cb: { yes: "กลับมาแน่นอน", maybe: "อาจจะ", no: "คงไม่" }, when: "ประมาณเดือนไหน",
    nps: "จะแนะนำเราให้เพื่อนไหม", npsOpts: ["ไม่แนะนำ", "อาจจะแนะนำ", "แนะนำแน่นอน"], comment: "อยากบอกอะไรเราไหม", commentPh: "คำชม สิ่งที่อยากให้ปรับปรุง หรืออะไรก็ได้ (ไม่บังคับ)",
    contact: "ยินดีให้ติดต่อเมื่อมีคอร์สหรือโปรโมชันใหม่", submit: "ส่งแบบฟอร์ม", sending: "กำลังส่ง…",
    done: "ได้รับแบบฟอร์มแล้ว", doneSub: "ขอบคุณมากค่ะ หวังว่าจะได้ดูแลน้องๆ อีกครั้งนะคะ 🙏",
    invalid: { invalid: "ลิงก์นี้ไม่ถูกต้อง", used: "ส่งแบบฟอร์มนี้ไปแล้ว ขอบคุณค่ะ", expired: "ลิงก์หมดอายุแล้ว — ติดต่อสถาบันเพื่อขอลิงก์ใหม่" }, needReason: "เลือกเหตุผลหลักก่อนส่ง", preview: "โหมดดูตัวอย่าง — ไม่ส่งข้อมูลจริง",
  },
  en: {
    title: "Leaving form", hello: (f: string) => `Dear ${f}`, intro: "Thank you for trusting us with your child. Please answer a few short questions to help us improve (about 2 minutes).",
    lastDay: "Last day of class", reason: "Main reason for stopping", reasonSub: "Pick one", others: "Any other reasons?", othersSub: "Pick any (optional)",
    rate: "Rate us", rateSub: "1 = needs work · 5 = excellent", scores: { teacher: "Teacher", content: "Lessons & content", admin: "Support from our staff", value: "Value for money" },
    comeBack: "Would you come back to study with us?", cb: { yes: "Yes", maybe: "Maybe", no: "Probably not" }, when: "Around which month?",
    nps: "Would you recommend us to a friend?", npsOpts: ["Would not", "Maybe", "Definitely"], comment: "Anything you'd like to tell us?", commentPh: "Compliments, suggestions, anything (optional)",
    contact: "You may contact me about new courses or offers", submit: "Send", sending: "Sending…",
    done: "Thank you!", doneSub: "We've received your form. We hope to see your child again 🙏",
    invalid: { invalid: "This link is not valid", used: "This form has already been sent. Thank you!", expired: "This link has expired — please contact the school for a new one" }, needReason: "Please pick the main reason", preview: "Preview — nothing is sent",
  },
  ja: {
    title: "退塾フォーム", hello: (f: string) => `${f} 様`, intro: "これまでお子様をお任せいただきありがとうございました。今後の改善のため、簡単なご質問にお答えください（約2分）。",
    lastDay: "最終受講日", reason: "退塾の主な理由", reasonSub: "1つお選びください", others: "その他の理由", othersSub: "複数選択可（任意）",
    rate: "評価", rateSub: "1 = 改善が必要 · 5 = とても良い", scores: { teacher: "講師", content: "授業内容", admin: "スタッフの対応", value: "費用対効果" },
    comeBack: "また通塾されるご予定はありますか", cb: { yes: "はい", maybe: "検討中", no: "いいえ" }, when: "何月頃ですか",
    nps: "お友達に当塾を勧めますか", npsOpts: ["勧めない", "どちらとも", "ぜひ勧める"], comment: "ご意見・ご感想", commentPh: "良かった点、改善点など（任意）",
    contact: "新しいコースやキャンペーンのご案内を受け取る", submit: "送信", sending: "送信中…",
    done: "送信しました", doneSub: "ご協力ありがとうございました。またお会いできることを願っています 🙏",
    invalid: { invalid: "無効なリンクです", used: "このフォームは送信済みです。ありがとうございました", expired: "リンクの有効期限が切れています。教室までご連絡ください" }, needReason: "主な理由をお選びください", preview: "プレビュー — 送信されません",
  },
}

type Phase = "init" | "invalid" | "ready" | "sending" | "done"

function previewToken(): ExitToken {
  return {
    token: "preview", kind: "exit", branchId: "br_thl", branchName: "ทองหล่อ", brand: "nockacademy", lang: "th", conversationId: null, familyName: "ครอบครัวสุขใจ",
    students: [{ id: "stu_1", nickname: "ใบเตย", grade: "ป.5" }], lastDate: addDays(toDateStr(new Date()), 10),
    reasons: reasonsForStudent(undefined).map(({ id, label, en, ja }) => ({ id, label, en, ja })), createdAt: "", expiresAt: "", used: false,
  }
}

export default function ExitFormPage() {
  return <Suspense fallback={<Centered><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></Centered>}><ExitForm /></Suspense>
}

function ExitForm() {
  const params = useSearchParams()
  const tokenStr = params.get("token") ?? ""
  const preview = params.get("preview") !== null
  const [phase, setPhase] = useState<Phase>("init")
  const [error, setError] = useState<"invalid" | "used" | "expired">("invalid")
  const [tok, setTok] = useState<ExitToken | null>(null)
  const [lang, setLang] = useState<FormLang>((params.get("lang") as FormLang) || "th")
  const [reasonId, setReasonId] = useState("")
  const [others, setOthers] = useState<string[]>([])
  const [scores, setScores] = useState<ExitAnswers["scores"]>({ teacher: null, content: null, admin: null, value: null })
  const [comeBack, setComeBack] = useState<ExitAnswers["comeBack"] | null>(null)
  const [month, setMonth] = useState("")
  const [nps, setNps] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [contactOk, setContactOk] = useState(true)
  const [tried, setTried] = useState(false)
  const t = DICT[lang]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (preview) { setTok(previewToken()); setPhase("ready"); return }
      const res = await fetch(`/api/parent-forms/token?token=${encodeURIComponent(tokenStr)}`).then((r) => r.json()).catch(() => ({ ok: false, error: "invalid" }))
      if (cancelled) return
      if (!res.ok) { setError(res.error ?? "invalid"); setPhase("invalid"); return }
      setTok(res.token)
      if (!params.get("lang")) setLang(res.token.lang)
      setPhase("ready")
    })()
    return () => { cancelled = true }
  }, [tokenStr, preview]) // eslint-disable-line react-hooks/exhaustive-deps

  const label = (r: ExitToken["reasons"][number]) => (lang === "en" ? r.en : lang === "ja" ? r.ja : undefined) || r.label
  const fmt = (d: string) => new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${d}T00:00:00`))
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` })
  const monthLabel = (m: string) => new Intl.DateTimeFormat(LOCALE[lang], { month: "short", year: "numeric" }).format(new Date(`${m}-01T00:00:00`))

  const submit = async () => {
    setTried(true)
    if (!reasonId || !comeBack) return
    if (preview) { setPhase("done"); return }
    setPhase("sending")
    const answers: ExitAnswers = { reasonId, otherReasonIds: others.filter((x) => x !== reasonId), scores, comeBack, comeBackMonth: comeBack !== "no" && month ? month : undefined, nps, comment: comment.trim(), contactOk, lang }
    const res = await fetch("/api/parent-forms/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tokenStr, answers }) }).then((r) => r.json()).catch(() => ({ ok: false, error: "invalid" }))
    if (!res.ok) { setError(res.error ?? "invalid"); setPhase("invalid"); return }
    setPhase("done")
  }

  if (phase === "init") return <Centered><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></Centered>
  if (phase === "invalid") return <Centered><XCircleIcon className="size-10 text-muted-foreground" /><p className="text-center text-sm">{t.invalid[error]}</p></Centered>
  if (phase === "done") return <Centered><CheckCircle2Icon className="size-12 text-emerald-600" /><p className="text-lg font-semibold">{t.done}</p><p className="max-w-xs text-center text-sm text-muted-foreground">{t.doneSub}</p></Centered>
  const tk = tok!
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-muted/40 pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <HeartHandshakeIcon className="size-5 text-primary" />
          <div className="min-w-0 flex-1"><p className="font-semibold">{t.title}</p><p className="truncate text-xs text-muted-foreground">{tk.brand === "liclass" ? "Liclass" : "NockAcademy"} · {tk.branchName}</p></div>
          {!preview && <NativeSelect className="w-32 shrink-0" value={lang} onChange={(e) => setLang(e.target.value as FormLang)} options={[{ value: "th", label: "ไทย" }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]} />}
        </div>
        {preview && <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1 text-center text-xs text-amber-900">{t.preview}</p>}
      </header>
      <main className="space-y-4 p-4">
        <Card>
          <p className="text-lg font-semibold">{t.hello(tk.familyName)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.intro}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{tk.students.map((s) => <span key={s.id} className="rounded-full bg-primary/10 px-2.5 py-1 text-sm text-primary">{s.nickname} · {s.grade}</span>)}</div>
          <p className="mt-2 text-sm"><span className="text-muted-foreground">{t.lastDay}:</span> {fmt(tk.lastDate)}</p>
        </Card>
        <Card title={t.reason} sub={t.reasonSub} error={tried && !reasonId ? t.needReason : undefined}>
          <div className="flex flex-wrap gap-2">{tk.reasons.map((r) => <Pick key={r.id} on={reasonId === r.id} onClick={() => setReasonId(r.id)}>{label(r)}</Pick>)}</div>
        </Card>
        {reasonId && (
          <Card title={t.others} sub={t.othersSub}>
            <div className="flex flex-wrap gap-2">{tk.reasons.filter((r) => r.id !== reasonId).map((r) => <Pick key={r.id} on={others.includes(r.id)} onClick={() => setOthers((o) => (o.includes(r.id) ? o.filter((x) => x !== r.id) : [...o, r.id]))}>{label(r)}</Pick>)}</div>
          </Card>
        )}
        <Card title={t.rate} sub={t.rateSub}>
          <div className="space-y-6">
            {(Object.keys(t.scores) as (keyof ExitAnswers["scores"])[]).map((k) => (
              <div key={k}>
                <p className="mb-3 text-base font-medium">{t.scores[k]}</p>
                <IconChoices cols={5} onPick={(v) => setScores((s) => ({ ...s, [k]: s[k] === Number(v) ? null : Number(v) }))}
                  choices={[1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: String(n), icon: StarIcon, fillIcon: true, active: (scores[k] ?? 0) >= n, on: "border-amber-400 bg-amber-400 text-white" }))} />
              </div>
            ))}
          </div>
        </Card>
        <Card title={t.comeBack} error={tried && !comeBack ? " " : undefined}>
          <IconChoices cols={3} onPick={(v) => setComeBack(v as ExitAnswers["comeBack"])} choices={[
            { key: "no", label: t.cb.no, icon: FrownIcon, active: comeBack === "no", on: "border-red-500 bg-red-500 text-white" },
            { key: "maybe", label: t.cb.maybe, icon: MehIcon, active: comeBack === "maybe", on: "border-amber-500 bg-amber-500 text-white" },
            { key: "yes", label: t.cb.yes, icon: LaughIcon, active: comeBack === "yes", on: "border-emerald-600 bg-emerald-600 text-white" },
          ]} />
          {comeBack && comeBack !== "no" && (
            <div className="mt-3"><p className="mb-1.5 text-sm text-muted-foreground">{t.when}</p>
              <div className="flex flex-wrap gap-1.5">{months.map((m) => <Pick key={m} on={month === m} onClick={() => setMonth(month === m ? "" : m)}>{monthLabel(m)}</Pick>)}</div></div>
          )}
        </Card>
        <Card title={t.nps}>
          <IconChoices cols={3} onPick={(v) => setNps(nps === Number(v) ? null : Number(v))} choices={[
            { key: "3", label: t.npsOpts[0], icon: FrownIcon, active: nps !== null && nps <= 6, on: "border-red-500 bg-red-500 text-white" },
            { key: "8", label: t.npsOpts[1], icon: MehIcon, active: nps !== null && nps >= 7 && nps <= 8, on: "border-amber-500 bg-amber-500 text-white" },
            { key: "10", label: t.npsOpts[2], icon: LaughIcon, active: nps !== null && nps >= 9, on: "border-emerald-600 bg-emerald-600 text-white" },
          ]} />
        </Card>
        <Card title={t.comment}><Textarea rows={5} className="text-base" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.commentPh} /></Card>
        <label className="flex items-center gap-2 px-1 text-sm"><Checkbox checked={contactOk} onCheckedChange={(v) => setContactOk(!!v)} />{t.contact}</label>
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {tried && (!reasonId || !comeBack) && <p className="mb-2 text-center text-xs text-red-600">{!reasonId ? t.needReason : t.comeBack}</p>}
          <Button className="h-12 w-full text-base" disabled={phase === "sending"} onClick={submit}><SendIcon /> {phase === "sending" ? t.sending : t.submit}</Button>
        </div>
      </div>
    </div>
  )
}

function Card({ title, sub, error, children }: { title?: string; sub?: string; error?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl bg-background p-5 shadow-sm ring-1 ring-foreground/5", error && "ring-2 ring-red-400")}>
      {title && <div className="mb-4"><p className="text-base font-semibold leading-snug">{title}</p>{sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}</div>}
      {children}
    </section>
  )
}

function Pick({ on, onClick, children, block }: { on: boolean; onClick: () => void; children: React.ReactNode; block?: boolean }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("min-h-11 rounded-full border px-4 py-2.5 text-base transition-colors", block && "w-full", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>{children}</button>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">{children}</div>
}
