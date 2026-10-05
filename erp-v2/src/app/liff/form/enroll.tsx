"use client"

// Enroll-now part of the parent form (owner 2026-10-05): a family that wants to start right away — no test / trial.
// The parent step is the same as Test/Trial; each child says what to study, which package, when it suits them,
// when to start, bus, and whether the teacher should check the level in the first class. TH / EN / JP.

import { CheckIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { EnrollCourseOption, EnrollPackage, FormLang } from "@/domain/types"
import { cn } from "@/lib/utils"

export const ENROLL_DICT = {
  th: {
    title: "ใบสมัครเรียน", sent: "ส่งใบสมัครเรียนแล้ว", sentSub: "ขอบคุณค่ะ แอดมินจะจัดคลาสและส่งใบแจ้งหนี้ให้ทาง LINE เร็วๆ นี้",
    studentSub: "ข้อมูลน้อง + คอร์สและเวลาที่สะดวก", subjects: "อยากเรียนวิชา", courses: "คอร์สที่สนใจ", coursesSub: "ไม่แน่ใจ เว้นไว้ได้ — แอดมินช่วยเลือกให้",
    pkg: "รูปแบบแพ็กเกจ", pkgs: { month: "รายเดือน", hour: "แพ็กชั่วโมง", week: "รายสัปดาห์ (คอร์สสั้น)", unsure: "ยังไม่แน่ใจ" } as Record<EnrollPackage, string>,
    times: "วัน-เวลาที่สะดวก", timesSub: "แตะได้หลายช่อง", periods: { am: "เช้า", pm: "บ่าย", eve: "เย็น" }, days: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    start: "อยากเริ่มเรียนวันที่", bus: "ต้องการรถรับส่ง", busSub: "ใช้ที่อยู่ในหน้าผู้ปกครอง", placement: "ให้ครูประเมินระดับในคาบแรก", placementSub: "แนะนำ — เพราะไม่ได้สอบวัดระดับก่อน",
    terms: "ยอมรับเงื่อนไขการเรียน การลา และการชำระเงินของสถาบัน", termsNeed: "กรุณายอมรับเงื่อนไขก่อนส่ง", perMonth: "/เดือน", hours: "ชม.", weeks: "สัปดาห์",
  },
  en: {
    title: "Enrolment form", sent: "Application sent", sentSub: "Thank you! Our staff will arrange the class and send the invoice on LINE shortly.",
    studentSub: "Your child + courses and times", subjects: "Subjects", courses: "Courses", coursesSub: "Not sure? Leave it — our staff will help",
    pkg: "Package", pkgs: { month: "Monthly", hour: "Hour pack", week: "Weekly (short course)", unsure: "Not sure yet" } as Record<EnrollPackage, string>,
    times: "Convenient times", timesSub: "Tap any that work", periods: { am: "Morning", pm: "Afternoon", eve: "Evening" }, days: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    start: "Preferred start date", bus: "School bus needed", busSub: "Uses the address on the parent step", placement: "Teacher checks the level in the first class", placementSub: "Recommended — there was no placement test",
    terms: "I accept the school's study, leave and payment terms", termsNeed: "Please accept the terms", perMonth: "/month", hours: "hrs", weeks: "weeks",
  },
  ja: {
    title: "入塾申込書", sent: "申込書を送信しました", sentSub: "ありがとうございます。担当者がクラスを手配し、LINEで請求書をお送りします。",
    studentSub: "お子様の情報・コースとご希望の時間", subjects: "希望科目", courses: "希望コース", coursesSub: "未定の場合は空欄で構いません",
    pkg: "プラン", pkgs: { month: "月謝制", hour: "時間パック", week: "短期（週単位）", unsure: "未定" } as Record<EnrollPackage, string>,
    times: "ご都合の良い時間", timesSub: "複数選択可", periods: { am: "午前", pm: "午後", eve: "夕方" }, days: ["日", "月", "火", "水", "木", "金", "土"],
    start: "開始希望日", bus: "送迎バス希望", busSub: "保護者情報の住所を使用", placement: "初回授業で講師がレベルを確認", placementSub: "おすすめ（事前テストなし）",
    terms: "授業・欠席・支払いの規約に同意します", termsNeed: "規約に同意してください", perMonth: "/月", hours: "時間", weeks: "週",
  },
}
export type EnrollT = (typeof ENROLL_DICT)["th"]

export interface EnrollFieldsValue { subjects: string[]; courseIds: string[]; pkg: EnrollPackage; times: string[]; startDate: string; bus: boolean; placement: boolean }

const PERIODS = ["am", "pm", "eve"] as const
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export const timeLabel = (key: string, t: EnrollT) => { const [d, p] = key.split("-"); return `${t.days[Number(d)]} ${t.periods[p as (typeof PERIODS)[number]]}` }
export const courseLine = (c: EnrollCourseOption, t: EnrollT) => `${c.unit === "month" ? `${c.price.toLocaleString()}฿${t.perMonth}` : c.unit === "hour" ? `${c.duration} ${t.hours} · ${c.price.toLocaleString()}฿` : `${c.duration} ${t.weeks} · ${c.price.toLocaleString()}฿`}`

/** a child is ready when they have a subject (or a course), at least one convenient time and a start date */
export const enrollValid = (v: EnrollFieldsValue) => (v.subjects.length > 0 || v.courseIds.length > 0) && v.times.length > 0 && !!v.startDate

export function EnrollFields({ t, lang, grade, subjects, subjectLabel, courses, value: v, onChange, minDate, busOffered }: {
  t: EnrollT; lang: FormLang; grade: string; subjects: string[]; subjectLabel: (s: string) => string; courses: EnrollCourseOption[]
  value: EnrollFieldsValue; onChange: (patch: Partial<EnrollFieldsValue>) => void; minDate: string; busOffered: boolean
}) {
  void lang
  // courses for this grade and the chosen subjects (or every subject when none picked yet)
  const fit = courses.filter((c) => (!c.grades.length || c.grades.includes(grade)) && (!v.subjects.length || c.subjects.some((s) => v.subjects.includes(s))))
  const toggle = <K extends "subjects" | "courseIds" | "times">(k: K, x: string) => onChange({ [k]: v[k].includes(x) ? v[k].filter((y) => y !== x) : [...v[k], x] } as Partial<EnrollFieldsValue>)
  return (
    <div className="space-y-3 border-t pt-3">
      <div>
        <p className="mb-1.5 text-sm font-semibold">{t.subjects} *</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {subjects.map((s) => { const on = v.subjects.includes(s); return (
            <label key={s} className={cn("flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm", on ? "border-primary bg-primary/10" : "text-muted-foreground")}>
              <Checkbox checked={on} onCheckedChange={() => toggle("subjects", s)} /> {subjectLabel(s)}
            </label>
          ) })}
        </div>
      </div>
      {fit.length > 0 && (
        <div>
          <p className="text-sm font-semibold">{t.courses}</p>
          <p className="mb-1.5 text-xs text-muted-foreground">{t.coursesSub}</p>
          <div className="space-y-1.5">
            {fit.map((c) => { const on = v.courseIds.includes(c.id); return (
              <button key={c.id} type="button" onClick={() => toggle("courseIds", c.id)}
                className={cn("flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm", on ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate">{c.name}</span><span className="block text-xs text-muted-foreground">{courseLine(c, t)}</span></span>
              </button>
            ) })}
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-sm font-semibold">{t.pkg}</p>
        <div className="flex flex-wrap gap-1.5">
          {(["month", "hour", "week", "unsure"] as EnrollPackage[]).map((k) => (
            <button key={k} type="button" onClick={() => onChange({ pkg: k })} className={cn("rounded-full border px-3 py-1.5 text-sm", v.pkg === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{t.pkgs[k]}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">{t.times} *</p>
        <p className="mb-1.5 text-xs text-muted-foreground">{t.timesSub}</p>
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-1 text-center text-xs">
          <span />
          {DAY_ORDER.map((d) => <span key={d} className="text-muted-foreground">{t.days[d]}</span>)}
          {PERIODS.map((p) => (
            <div key={p} className="contents">
              <span className="self-center text-left text-muted-foreground">{t.periods[p]}</span>
              {DAY_ORDER.map((d) => { const k = `${d}-${p}`, on = v.times.includes(k); return (
                <button key={k} type="button" aria-label={timeLabel(k, t)} aria-pressed={on} onClick={() => toggle("times", k)}
                  className={cn("grid h-9 place-items-center rounded-lg border", on ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{on && <CheckIcon className="size-3.5" />}</button>
              ) })}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1"><p className="text-sm font-semibold">{t.start} *</p><Input type="date" min={minDate} value={v.startDate} onChange={(e) => onChange({ startDate: e.target.value })} /></div>
      {busOffered && <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={v.bus} onCheckedChange={(x) => onChange({ bus: !!x })} /><span>{t.bus}<span className="block text-xs text-muted-foreground">{t.busSub}</span></span></label>}
      <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={v.placement} onCheckedChange={(x) => onChange({ placement: !!x })} /><span>{t.placement}<span className="block text-xs text-muted-foreground">{t.placementSub}</span></span></label>
    </div>
  )
}
