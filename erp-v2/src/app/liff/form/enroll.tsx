"use client"

// Enroll-now part of the parent form (owner 2026-10-05): a family that wants to start right away — no test / trial.
// The parent step is the same as Test/Trial; each child says what to study, which package, when it suits them,
// when to start, bus, and whether the teacher should check the level in the first class. TH / EN / JP.

import { CheckIcon, ImageIcon, XIcon } from "lucide-react"
import { slipDataUrl } from "@/lib/image"
import type { EnrollInvoiceSnap } from "@/domain/types"
import qrcode from "qrcode-generator"
import { promptPayPayload } from "@/domain/rules/documents"
import { slipsCheck, type PaySlip } from "@/domain/rules/form-hub"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { EnrollClassOffer, EnrollCourseOption, EnrollPackage, EnrollPlan, FormLang } from "@/domain/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export const ENROLL_DICT = {
  th: {
    invoice: "ใบแจ้งหนี้", itemKinds: { bus: "ค่ารถรับส่ง", book: "ค่าหนังสือ", discount: "ส่วนลด", credit: "เครดิตคอร์ส", rounding: "ปัดเศษ", other: "อื่นๆ" } as Record<string, string>, invoiceNo: "เลขที่", invoiceFor: "สำหรับ", invoiceTotal: "ยอดรวม", invoiceOwed: "ยอดที่ต้องชำระ", payTo: "โอนเงินเข้าบัญชี", promptPay: "พร้อมเพย์", attachSlip: "แนบสลิปการโอน", attachSlipSub: "จ่ายแล้วแนบสลิปได้เลย — แอดมินจะตรวจและยืนยันให้", slipPick: "เลือกรูปสลิป", slipChange: "เปลี่ยนรูป", slipRemove: "ลบ", slipRef: "Ref ID ของสลิป", slipAmount: "ยอดในสลิปนี้", slipAnother: "เพิ่มสลิปอีกใบ", slipSum: "ยอดสลิปรวม", slipNeedRef: "ใส่ Ref ID ให้ครบทุกสลิป", slipNeedSum: "ยอดสลิปรวมต้องเท่ากับยอดที่ต้องชำระ — โอนเพิ่มแล้วแนบสลิปใหม่ได้", invoicePaid: "ใบแจ้งหนี้นี้ชำระแล้ว",
    invoiceVoid: "ใบแจ้งหนี้นี้ถูกยกเลิกแล้ว — โปรดใช้ลิงก์ใหม่ที่แอดมินส่งให้",
    title: "ใบสมัครเรียน", sent: "ส่งใบสมัครเรียนแล้ว", sentSub: "ขอบคุณค่ะ แอดมินจะจัดคลาสและส่งใบแจ้งหนี้ให้ทาง LINE เร็วๆ นี้",
    studentSub: "ข้อมูลน้อง + คอร์สและเวลาที่สะดวก", subjects: "อยากเรียนวิชา", courses: "คอร์สที่สนใจ", coursesSub: "ไม่แน่ใจ เว้นไว้ได้ — แอดมินช่วยเลือกให้",
    pkg: "รูปแบบแพ็กเกจ", pkgs: { month: "รายเดือน", hour: "แพ็กชั่วโมง", week: "รายสัปดาห์ (คอร์สสั้น)", unsure: "ยังไม่แน่ใจ" } as Record<EnrollPackage, string>,
    times: "วัน-เวลาที่สะดวก", timesSub: "แตะได้หลายช่อง", periods: { am: "เช้า", pm: "บ่าย", eve: "เย็น" }, days: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"],
    start: "อยากเริ่มเรียนวันที่", bus: "ต้องการรถรับส่ง", busSub: "ใช้ที่อยู่ในหน้าผู้ปกครอง", placement: "ให้ครูประเมินระดับในคาบแรก", placementSub: "แนะนำ — เพราะไม่ได้สอบวัดระดับก่อน",
    terms: "ยอมรับเงื่อนไขการเรียน การลา และการชำระเงินของสถาบัน", termsNeed: "กรุณายอมรับเงื่อนไขก่อนส่ง", perMonth: "/เดือน", hours: "ชม.", weeks: "สัปดาห์",
    classes: "เลือกคลาสที่สะดวก", classesSub: "แอดมินเลือกคลาสเหล่านี้ไว้ให้แล้ว — เลือกได้หลายวัน", every: "ทุก", seats: "ว่าง", full: "เต็ม", picked: "คลาสที่เลือก",
    daysFull: ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"],
    plan: "คอร์สที่ตกลงกันไว้", periodsUnit: "งวด", busLegs: { both: "ไป-กลับ", pickup: "ขาไป (รับที่บ้าน)", dropoff: "ขากลับ (ส่งที่บ้าน)" },
  },
  en: {
    invoice: "Invoice", itemKinds: { bus: "School bus", book: "Books", discount: "Discount", credit: "Course credit", rounding: "Rounding", other: "Other" }, invoiceNo: "No.", invoiceFor: "For", invoiceTotal: "Total", invoiceOwed: "Amount due", payTo: "Transfer to", promptPay: "PromptPay", attachSlip: "Attach the transfer slip", attachSlipSub: "Paid already? Attach the slip — our staff will check and confirm", slipPick: "Choose slip image", slipChange: "Change", slipRemove: "Remove", slipRef: "Slip Ref ID", slipAmount: "Amount on this slip", slipAnother: "Add another slip", slipSum: "Slips total", slipNeedRef: "Enter a Ref ID for every slip", slipNeedSum: "The slips must add up to the amount due — transfer the rest and attach the new slip", invoicePaid: "This invoice has been paid",
    invoiceVoid: "This invoice was cancelled — please use the new link our staff sent you.",
    title: "Enrolment form", sent: "Application sent", sentSub: "Thank you! Our staff will arrange the class and send the invoice on LINE shortly.",
    studentSub: "Your child + courses and times", subjects: "Subjects", courses: "Courses", coursesSub: "Not sure? Leave it — our staff will help",
    pkg: "Package", pkgs: { month: "Monthly", hour: "Hour pack", week: "Weekly (short course)", unsure: "Not sure yet" } as Record<EnrollPackage, string>,
    times: "Convenient times", timesSub: "Tap any that work", periods: { am: "Morning", pm: "Afternoon", eve: "Evening" }, days: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    start: "Preferred start date", bus: "School bus needed", busSub: "Uses the address on the parent step", placement: "Teacher checks the level in the first class", placementSub: "Recommended — there was no placement test",
    terms: "I accept the school's study, leave and payment terms", termsNeed: "Please accept the terms", perMonth: "/month", hours: "hrs", weeks: "weeks",
    classes: "Choose the classes that suit you", classesSub: "Our staff picked these for you — choose as many days as you like", every: "Every", seats: "seats", full: "Full", picked: "Chosen classes",
    daysFull: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    plan: "The course we agreed", periodsUnit: "periods", busLegs: { both: "Both ways", pickup: "To school (pick-up)", dropoff: "Home (drop-off)" },
  },
  ja: {
    invoice: "請求書", itemKinds: { bus: "送迎バス", book: "教材費", discount: "割引", credit: "コースクレジット", rounding: "端数調整", other: "その他" }, invoiceNo: "番号", invoiceFor: "対象", invoiceTotal: "合計", invoiceOwed: "お支払い額", payTo: "振込先", promptPay: "プロンプトペイ", attachSlip: "振込明細を添付", attachSlipSub: "お支払い済みの場合は明細を添付してください — 担当者が確認します", slipPick: "画像を選択", slipChange: "変更", slipRemove: "削除", slipRef: "明細の参照番号", slipAmount: "この明細の金額", slipAnother: "明細を追加", slipSum: "明細の合計", slipNeedRef: "すべての明細に参照番号を入力してください", slipNeedSum: "明細の合計がお支払い額と一致する必要があります — 不足分を振込んで新しい明細を添付してください", invoicePaid: "この請求書は支払い済みです",
    invoiceVoid: "この請求書は取り消されました — 担当者から届く新しいリンクをご利用ください。",
    title: "入塾申込書", sent: "申込書を送信しました", sentSub: "ありがとうございます。担当者がクラスを手配し、LINEで請求書をお送りします。",
    studentSub: "お子様の情報・コースとご希望の時間", subjects: "希望科目", courses: "希望コース", coursesSub: "未定の場合は空欄で構いません",
    pkg: "プラン", pkgs: { month: "月謝制", hour: "時間パック", week: "短期（週単位）", unsure: "未定" } as Record<EnrollPackage, string>,
    times: "ご都合の良い時間", timesSub: "複数選択可", periods: { am: "午前", pm: "午後", eve: "夕方" }, days: ["日", "月", "火", "水", "木", "金", "土"],
    start: "開始希望日", bus: "送迎バス希望", busSub: "保護者情報の住所を使用", placement: "初回授業で講師がレベルを確認", placementSub: "おすすめ（事前テストなし）",
    terms: "授業・欠席・支払いの規約に同意します", termsNeed: "規約に同意してください", perMonth: "/月", hours: "時間", weeks: "週",
    classes: "ご都合の良いクラスを選択", classesSub: "担当者が選んだクラスです — 複数の曜日を選べます", every: "毎週", seats: "空き", full: "満席", picked: "選択したクラス",
    daysFull: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
    plan: "合意したコース", periodsUnit: "回", busLegs: { both: "往復", pickup: "行き（お迎え）", dropoff: "帰り（お送り）" },
  },
}
export type EnrollT = (typeof ENROLL_DICT)["th"]

export interface EnrollFieldsValue { subjects: string[]; courseIds: string[]; pkg: EnrollPackage; times: string[]; startDate: string; bus: boolean; placement: boolean; classIds?: string[]; busLeg?: "both" | "pickup" | "dropoff" }

const PERIODS = ["am", "pm", "eve"] as const
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export const timeLabel = (key: string, t: EnrollT) => { const [d, p] = key.split("-"); return `${t.days[Number(d)]} ${t.periods[p as (typeof PERIODS)[number]]}` }
export const courseLine = (c: EnrollCourseOption, t: EnrollT) => `${c.unit === "month" ? `${c.price.toLocaleString()}฿${t.perMonth}` : c.unit === "hour" ? `${c.duration} ${t.hours} · ${c.price.toLocaleString()}฿` : `${c.duration} ${t.weeks} · ${c.price.toLocaleString()}฿`}`

/** a child is ready when they have a subject (or a course), at least one convenient time and a start date */
export const enrollValid = (v: EnrollFieldsValue) => (v.subjects.length > 0 || v.courseIds.length > 0) && v.times.length > 0 && !!v.startDate

/** "ทุกวันจันทร์ 16:00–17:30" in the form's language */
export const classTimeLabel = (o: EnrollClassOffer, t: EnrollT) => {
  const [h, m] = o.start.split(":").map(Number), end = h * 60 + m + o.minutes
  return `${t.every}${t.every === "Every" ? " " : ""}${t.daysFull[o.weekday]} ${o.start}–${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`
}

export function EnrollFields({ t, lang, grade, subjects, subjectLabel, courses, classOffers, plan, value: v, onChange, minDate, busOffered }: {
  t: EnrollT; lang: FormLang; grade: string; subjects: string[]; subjectLabel: (s: string) => string; courses: EnrollCourseOption[]
  /** owner 2026-10-15: the admin offered real classes — the parent only picks those (+ start date), nothing else */
  classOffers?: EnrollClassOffer[]
  /** owner 2026-10-16: what the admin already agreed in the chat — shown, not asked */
  plan?: EnrollPlan
  value: EnrollFieldsValue; onChange: (patch: Partial<EnrollFieldsValue>) => void; minDate: string; busOffered: boolean
}) {
  void lang
  // classOffers present (even empty, owner 2026-10-16) = the new form: no subject / course / package / time grid
  if (classOffers) {
    const ids = v.classIds ?? []
    const bus = plan ? plan.bus : busOffered
    return (
      <div className="space-y-3 border-t pt-3">
        {plan && (
          <div className="rounded-2xl bg-muted/60 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{t.plan}</p>
            <p className="text-sm font-semibold">{plan.course.name}</p>
            <p className="text-xs text-muted-foreground">{courseLine(plan.course, t)}{plan.periods > 1 ? ` × ${plan.periods} ${t.periodsUnit}` : ""}</p>
          </div>
        )}
        {classOffers.length > 0 && <div>
          <p className="text-sm font-semibold">{t.classes} *</p>
          <p className="mb-1.5 text-xs text-muted-foreground">{t.classesSub}</p>
          <div className="space-y-1.5">
            {classOffers.map((o) => {
              const on = ids.includes(o.id), full = o.seatsLeft === 0 && !on
              return (
                <Button variant="row" size="inline" key={o.id} type="button" disabled={full} onClick={() => onChange({ classIds: on ? ids.filter((x) => x !== o.id) : [...ids, o.id] })}
                  className={cn("flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm disabled:opacity-50", on ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3.5" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{classTimeLabel(o, t)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{o.subjects.map(subjectLabel).join(" + ")}{o.teacher ? ` · ${o.teacher}` : ""}</span>
                  </span>
                  <span className={cn("shrink-0 text-xs", o.seatsLeft === 0 ? "text-danger" : "text-muted-foreground")}>{o.seatsLeft === 0 ? t.full : `${t.seats} ${o.seatsLeft}`}</span>
                </Button>
              )
            })}
          </div>
        </div>}
        <div className="space-y-1"><p className="text-sm font-semibold">{t.start} *</p><Input type="date" min={minDate} value={v.startDate} onChange={(e) => onChange({ startDate: e.target.value })} /></div>
        {bus && (
          <div className="space-y-1.5">
            <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={v.bus} onCheckedChange={(x) => onChange({ bus: !!x, busLeg: x ? v.busLeg ?? "both" : undefined })} /><span>{t.bus}<span className="block text-xs text-muted-foreground">{t.busSub}</span></span></label>
            {v.bus && (
              <div className="flex flex-wrap gap-1.5 pl-6">
                {(["both", "pickup", "dropoff"] as const).map((k) => (
                  <Button variant="chip" size="inline" key={k} type="button" aria-pressed={(v.busLeg ?? "both") === k} onClick={() => onChange({ busLeg: k })} className="px-3 py-1.5 text-xs">{t.busLegs[k]}</Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
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
              <Button variant="row" size="inline" key={c.id} type="button" onClick={() => toggle("courseIds", c.id)}
                className={cn("flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm", on ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate">{c.name}</span><span className="block text-xs text-muted-foreground">{courseLine(c, t)}</span></span>
              </Button>
            ) })}
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-sm font-semibold">{t.pkg}</p>
        <div className="flex flex-wrap gap-1.5">
          {(["month", "hour", "week", "unsure"] as EnrollPackage[]).map((k) => (
            <Button variant="chip" size="inline" key={k} type="button" onClick={() => onChange({ pkg: k })} aria-pressed={v.pkg === k} className="px-3 py-1.5 text-sm">{t.pkgs[k]}</Button>
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
                <Button variant="chip" size="inline" key={k} type="button" aria-label={timeLabel(k, t)} aria-pressed={on} onClick={() => toggle("times", k)}
                  className="h-9">{on && <CheckIcon className="size-3.5" />}</Button>
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

/** a sample invoice for the preview (/liff/form?preview=enroll) */
export const PREVIEW_INVOICE: EnrollInvoiceSnap = {
  invoiceId: "preview", number: "INV-LIS-TL-691119-004", status: "open", studentNickname: "ภูมิ",
  items: [{ name: "คณิต ป.5 รายเดือน", amount: 4400 }, { name: "ค่าสมัครแรกเข้า", amount: 500 }], total: 4900, owed: 4900,
  bank: { bank: "KBank", name: "บริษัท น็อค อะคาเดมี่ จำกัด", number: "123-4-56789-0" }, promptPayId: "0812345678",
}

/** owner 2026-11-19: the invoice that came with the form — what it is, where to transfer, and the slip to attach (nothing else to type) */
export function InvoicePay({ t, inv, slips, onSlips }: { t: EnrollT; inv: EnrollInvoiceSnap; slips: PaySlip[]; onSlips: (v: PaySlip[]) => void }) {
  const baht = (n: number) => `${n.toLocaleString()}฿`
  return (
    <section className="space-y-2.5">
      <p className="text-sm font-semibold">{t.invoice}</p>
      <div className="space-y-2 rounded-2xl bg-card p-3 ring-1 ring-foreground/5">
        <p className="text-xs text-muted-foreground">{t.invoiceNo} {inv.number}{inv.studentNickname ? ` · ${t.invoiceFor} ${inv.studentNickname}` : ""}</p>
        <ul className="space-y-1 text-sm">
          {inv.items.map((x, i) => <li key={i} className="flex gap-2"><span className="min-w-0 flex-1">{(x.kind && t.itemKinds[x.kind]) || x.name}</span><span className="tabular-nums">{baht(x.amount)}</span></li>)}
        </ul>
        <div className="flex items-baseline gap-2 border-t pt-2"><span className="flex-1 text-sm font-semibold">{inv.status === "paid" ? t.invoicePaid : t.invoiceOwed}</span><span className="text-lg font-semibold tabular-nums">{baht(inv.owed)}</span></div>
      </div>
      {inv.status === "open" && (
        <>
          <div className="space-y-0.5 rounded-2xl bg-muted/60 px-3 py-2.5 text-sm">
            <p className="text-xs text-muted-foreground">{t.payTo}</p>
            <p className="font-medium">{inv.bank.bank} · {inv.bank.number}</p>
            <p className="text-xs text-muted-foreground">{inv.bank.name}{inv.promptPayId ? ` · ${t.promptPay} ${inv.promptPayId}` : ""}</p>
            <PayQr inv={inv} />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">{t.attachSlip}</p>
            <p className="text-xs text-muted-foreground">{t.attachSlipSub}</p>
            {slips.map((sl, i) => (
              <div key={i} className="flex items-start gap-3 border-t pt-2.5 first:border-t-0 first:pt-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sl.image} alt="slip" className="h-20 w-auto rounded-xl border" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input value={sl.ref} placeholder={t.slipRef} aria-label={t.slipRef} onChange={(e) => onSlips(slips.map((x, k) => (k === i ? { ...x, ref: e.target.value } : x)))} />
                  <Input type="number" inputMode="decimal" value={sl.amount || ""} placeholder={t.slipAmount} aria-label={t.slipAmount} onChange={(e) => onSlips(slips.map((x, k) => (k === i ? { ...x, amount: Number(e.target.value) || 0 } : x)))} />
                </div>
                <Button type="button" size="xs" variant="outline" onClick={() => onSlips(slips.filter((_, k) => k !== i))}><XIcon /> {t.slipRemove}</Button>
              </div>
            ))}
            <label className="inline-flex"><Input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onSlips([...slips, { ref: "", amount: slips.length ? 0 : inv.owed, image: await slipDataUrl(f) }]); e.target.value = "" }} />
              <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm hover:bg-muted"><ImageIcon className="size-4" />{slips.length ? t.slipAnother : t.slipPick}</span></label>
            {slips.length > 0 && (() => { const c = slipsCheck(slips, inv.owed); return <p className={cn("text-xs", c.ok ? "text-muted-foreground" : "text-danger")}>{t.slipSum} {baht(c.sum)} / {baht(inv.owed)}{c.ok ? "" : ` · ${c.error === "ทุกสลิปต้องมี Ref ID" ? t.slipNeedRef : t.slipNeedSum}`}</p> })()}
          </div>
        </>
      )}
    </section>
  )
}

/** owner 2026-11-24: the payment QR comes from the system — the account's uploaded QR image, else one made from its PromptPay ID with the amount still owed (same as on the invoice) */
function PayQr({ inv }: { inv: EnrollInvoiceSnap }) {
  if (inv.qrImage) {
    // eslint-disable-next-line @next/next/no-img-element -- data URL / app file
    return <img src={inv.qrImage} alt="QR" className="mt-2 size-36 rounded-xl border bg-white object-contain p-1" />
  }
  const data = inv.promptPayId ? promptPayPayload(inv.promptPayId, inv.owed) : null
  if (!data) return null
  const q = qrcode(0, "M")
  q.addData(data)
  q.make()
  const n = q.getModuleCount()
  const cells = Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)] as const).filter(([x, y]) => q.isDark(y, x))
  return (
    <svg viewBox={`0 0 ${n + 2} ${n + 2}`} className="mt-2 size-36 rounded-xl border bg-white p-1" shapeRendering="crispEdges" aria-label="PromptPay">
      <rect width="100%" height="100%" fill="#fff" />
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="1" height="1" fill="#000" />)}
    </svg>
  )
}
