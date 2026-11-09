// Parent-facing LINE texts (E2E 2026-09-28: invoices, receipts and summaries used to be "sent" only as a flag —
// now they go out as real LINE messages). One builder per document so every screen sends the same words.
//
// Language (owner 2026-11-09): Liclass parents are Japanese → Japanese + English, NEVER Thai. NockAcademy → Thai + English.
// Every builder writes the message once per language and joins the two. Words typed by staff (the invoice note, the
// teacher's summary text) are theirs and go out once, as written.

import { fmtMoney, fromMinutes, toMinutes, weekdayOf } from "../dates"
import { parseDate } from "../dates"
import type { Branch, Brand, Course, CourseSummary, DateStr, Entitlement, Invoice, LessonSummary, Session, Student } from "../types"
import type { InvoiceTotals } from "./billing"
import { leaveQuotaFor } from "./settings"
import { romanizeName, SUBJECTS } from "./romanize"

export type MsgLang = "th" | "ja" | "en"
/** the two languages a brand's parents get, in this order */
export const messageLangs = (brand: Brand = "nockacademy"): [MsgLang, MsgLang] => (brand === "liclass" ? ["ja", "en"] : ["th", "en"])
const SEP = "\n\n———\n\n"
const both = (brand: Brand | undefined, build: (l: MsgLang) => string) => messageLangs(brand).map(build).join(SEP)

const MON_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY: Record<MsgLang, string[]> = {
  th: ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"],
  ja: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
}
/** a date in the message's own language, independent of the staff screen language */
export function dateIn(l: MsgLang, s: DateStr, o: { weekday?: boolean; year?: boolean } = {}): string {
  const d = parseDate(s)
  const m = d.getMonth(), day = d.getDate(), y = d.getFullYear()
  const wd = o.weekday ? DAY[l][d.getDay()] : ""
  if (l === "ja") return `${o.year ? `${y}年` : ""}${m + 1}月${day}日${wd ? `（${wd[0]}）` : ""}`
  if (l === "en") return `${wd ? `${wd.slice(0, 3)} ` : ""}${day} ${MON_EN[m]}${o.year ? ` ${y}` : ""}`
  return `${wd ? `${wd}ที่ ` : ""}${day} ${MON_TH[m]}${o.year ? ` ${(y + 543) % 100}` : ""}`
}

/** the fixed words of every message, per language */
const W: Record<MsgLang, Record<string, string>> = {
  th: {
    invoice: "📄 ใบแจ้งค่าเรียน", student: "นักเรียน", sessions: "คาบ", bus: "ค่ารถ", busExtra: "ค่ารถเพิ่ม (รอบก่อน {0})", discount: "ส่วนลด",
    bonus: "🎁 {0}: แถมเวลาเรียนเพิ่ม {1} ชม.", credit: "หักเครดิตคอร์ส", due: "ยอดชำระ", transfer: "โอนเข้า", counter: "ชำระที่เคาน์เตอร์สาขา",
    slip: "ชำระแล้วส่งรูปสลิปในแชทนี้ได้เลยค่ะ 🙏", invoiceBundle: "📄 ใบแจ้งค่าเรียน (รวม {0} ใบ)", dueAll: "ยอดชำระรวมทั้งหมด", slipBundle: "ชำระแล้วส่งรูปสลิปในแชทนี้ได้เลยค่ะ (สลิปเดียวสำหรับทุกใบได้) 🙏",
    void1: "ขออภัยค่ะ ใบแจ้งหนี้ {0} ของ {1} ถูกยกเลิกแล้ว", void2: "ไม่ต้องชำระใบนี้ค่ะ — ทางโรงเรียนจะส่งใบใหม่ให้หากมีการเปลี่ยนแปลง", thanks: "ขอบคุณค่ะ 🙏",
    receipt: "🧾 ใบเสร็จรับเงิน", paid: "ได้รับชำระ {0} สำหรับ {1} เรียบร้อยแล้วค่ะ", paidAll: "ได้รับชำระ {0} เรียบร้อยแล้วค่ะ", startOn: "เริ่มเรียน {0} เวลา {1} น.", thanks2: "ขอบคุณค่ะ 😊",
    hours: "{0} ชั่วโมง ({1} ครั้ง)", from: "เริ่มเรียน {0} · จบคอร์ส {1}", closed: "วันหยุดสถาบัน {0}", leaves: "ลาได้ {0} ครั้ง",
  },
  ja: {
    invoice: "📄 ご請求書", student: "生徒", sessions: "回", bus: "バス代", busExtra: "追加バス代（前回分 {0}）", discount: "割引",
    bonus: "🎁 {0}：授業時間を{1}時間追加", credit: "コースクレジット控除", due: "お支払い金額", transfer: "お振込先", counter: "各校の窓口でお支払いください",
    slip: "お支払い後、このチャットに振込スリップの写真をお送りください 🙏", invoiceBundle: "📄 ご請求書（{0}件まとめ）", dueAll: "お支払い金額（合計）", slipBundle: "お支払い後、このチャットに振込スリップの写真をお送りください（スリップ1枚で全件OK）🙏",
    void1: "申し訳ございません。{1}さんの請求書 {0} は取り消されました。", void2: "こちらの請求書のお支払いは不要です。変更がある場合は、改めて新しい請求書をお送りします。", thanks: "よろしくお願いいたします 🙏",
    receipt: "🧾 領収書", paid: "{1} のお支払い {0} を確かに受け取りました。", paidAll: "お支払い {0} を確かに受け取りました。", startOn: "授業開始：{0} {1}", thanks2: "ありがとうございます 😊",
    hours: "{0}時間（{1}回）", from: "開始日 {0} · 終了日 {1}", closed: "休校日 {0}", leaves: "お休み可能回数 {0}回",
  },
  en: {
    invoice: "📄 Invoice", student: "Student", sessions: "sessions", bus: "Bus fee", busExtra: "Extra bus days (earlier: {0})", discount: "Discount",
    bonus: "🎁 {0}: +{1} extra hours", credit: "Course credit", due: "Amount due", transfer: "Transfer to", counter: "Please pay at the branch counter",
    slip: "After paying, please send the slip photo in this chat 🙏", invoiceBundle: "📄 Invoices ({0} combined)", dueAll: "Total amount due", slipBundle: "After paying, please send the slip photo in this chat (one slip for all is fine) 🙏",
    void1: "Sorry — invoice {0} for {1} has been cancelled.", void2: "You do not need to pay this invoice. We will send a new one if anything changes.", thanks: "Thank you 🙏",
    receipt: "🧾 Receipt", paid: "We have received {0} for {1}.", paidAll: "We have received {0}.", startOn: "First class: {0} at {1}", thanks2: "Thank you 😊",
    hours: "{0} hours ({1} sessions)", from: "Starts {0} · Ends {1}", closed: "School closed: {0}", leaves: "{0} leaves allowed",
  },
}
/** names that live in the data (student, course, class, fee) — a Thai name never goes to a parent who reads Japanese / English:
 *  subjects get their Japanese name, everything else Latin letters. (Better: staff type Japanese / English names in Settings.) */
const dn = (l: MsgLang, t: string): string => (l === "th" ? t : l === "ja" && SUBJECTS[t] ? SUBJECTS[t].ja : romanizeName(t))
const f = (l: MsgLang, k: string, ...a: (string | number)[]) => a.reduce<string>((t, v, i) => t.replace(`{${i}}`, String(v)), W[l][k])
const sess = (l: MsgLang, n: number) => (l === "ja" ? `${n}${W.ja.sessions}` : `${n} ${W[l].sessions}`)

const bankLine = (l: MsgLang, b: Branch) =>
  b.bankAccount.number ? `${W[l].transfer}${l === "ja" ? "：" : " "}${dn(l, b.bankAccount.bank)} ${b.bankAccount.number} (${dn(l, b.bankAccount.name)})` : W[l].counter

/** the invoice's own lines, up to and including what to pay */
function invoiceBody(l: MsgLang, inv: Invoice, totals: InvoiceTotals, ctx: { student: Student }): (string | null)[] {
  return [
    `${W[l].invoice} ${inv.number ?? ""}`.trim(),
    `${W[l].student}${l === "ja" ? "：" : ": "}${dn(l, ctx.student.nickname)} (${dn(l, ctx.student.name)}) · ${dn(l, ctx.student.grade)}`,
    // owner Row 35 (2026-10-28): show BOTH the course name and the class(es) it runs on
    ...totals.lines.map((x) => (x.course && x.quote ? `${dn(l, x.course.name)}${x.klasses.length ? ` · ${x.klasses.map((k) => dn(l, k.name)).join(" + ")}` : ""} · ${dateIn(l, x.quote.from)} – ${dateIn(l, x.quote.to, { year: true })} · ${sess(l, x.quote.sessions.length)}` : null)),
    totals.bus ? `${W[l].bus} ${fmtMoney(totals.bus)}` : null,
    totals.busExtra ? `${f(l, "busExtra", (inv.busExtras ?? []).map((x) => dateIn(l, x.date)).join(", "))} ${fmtMoney(totals.busExtra)}` : null,
    ...inv.advance.map((a) => `${dn(l, a.name)} ${fmtMoney(a.amount)}`),
    ...totals.lines.filter((x) => x.promotion).map((x) => `${W[l].discount} ${dn(l, x.promotionName ?? "Promotion")} -${fmtMoney(x.promotion)}`),
    ...totals.lines.filter((x) => x.bonusMinutes).map((x) => f(l, "bonus", dn(l, x.bonusName ?? "Promotion"), x.bonusMinutes / 60)),
    totals.credit ? `${W[l].credit} -${fmtMoney(totals.credit)}` : null,
    `${W[l].due} ${fmtMoney(totals.total)}`,
  ]
}

export function invoiceMessage(inv: Invoice, totals: InvoiceTotals, ctx: { student: Student; branch: Branch }): string {
  const note = inv.noteToParent.trim()
  const [first] = messageLangs(ctx.branch.brand)
  // the staff note is theirs — once, in the first language block
  return both(ctx.branch.brand, (l) => [...invoiceBody(l, inv, totals, ctx), bankLine(l, ctx.branch), l === first ? note || null : null, W[l].slip].filter(Boolean).join("\n"))
}

/** Siblings' invoices linked together (owner 2026-11-05): ONE message — each child's invoice, the grand total, the bank
 *  once, and the sender's note. */
export function invoiceBundleMessage(items: { inv: Invoice; totals: InvoiceTotals; student: Student }[], ctx: { branch: Branch }): string {
  const total = items.reduce((a, x) => a + x.totals.total, 0)
  const [first] = messageLangs(ctx.branch.brand)
  return both(ctx.branch.brand, (l) => [
    f(l, "invoiceBundle", items.length),
    // each child's own message sits under that child's invoice (owner 2026-11-05)
    ...items.flatMap((x) => ["", ...invoiceBody(l, x.inv, x.totals, x), l === first && x.inv.noteToParent.trim() ? `📝 ${x.inv.noteToParent.trim()}` : null]),
    "",
    `${W[l].dueAll} ${fmtMoney(total)}`,
    bankLine(l, ctx.branch),
    W[l].slipBundle,
  ].filter((x) => x !== null).join("\n"))
}

/** Sent only when staff press "notify the parent" — voiding an invoice never messages anyone by itself (owner 2026-11-05, #52). */
export function voidMessage(inv: Invoice, ctx: { student: Student; brand?: Brand }): string {
  return both(ctx.brand, (l) => [f(l, "void1", inv.number ?? "", dn(l, ctx.student.nickname)).replace("  ", " "), W[l].void2, W[l].thanks].join("\n"))
}

/** Sheet row 60 (Dear, 8 Nov): what the parent needs to know once the payment is in — per course: hours, the days and
 *  times, start and end, the days the school is closed, and how many leaves they get. */
function courseSummaryBlock(l: MsgLang, totals: InvoiceTotals, branch: Branch): string[] {
  return totals.lines.flatMap((x) => {
    if (!x.course || !x.quote || !x.quote.slots.length) return []
    const q = x.quote
    // one "day time-time" per distinct class (a day can have two classes)
    const when = [...new Map(q.slots.map((s) => [`${weekdayOf(s.date)}|${s.start}|${s.minutes}`, s])).values()]
      .map((s) => `${DAY[l][weekdayOf(s.date)]} ${s.start}-${fromMinutes(toMinutes(s.start) + s.minutes)}`)
    const leaves = leaveQuotaFor(branch, x.course.unit, x.course.duration, x.line.periods, q.sessions.length)
    return [
      "",
      `✅ ${dn(l, x.course.name)}`,
      `✅ ${f(l, "hours", q.hours, q.sessions.length)}`,
      `✅ ${when.join(" · ")}`,
      `✅ ${f(l, "from", dateIn(l, q.from, { year: true }), dateIn(l, q.to, { year: true }))}`,
      q.skipped.length ? `✅ ${f(l, "closed", q.skipped.map((d) => dateIn(l, d, { year: true })).join(", "))}` : null,
      `✅ ${f(l, "leaves", leaves)}`,
    ].filter((v): v is string => v !== null)
  })
}
/** kept for callers/tests that want the Thai block alone */
export const courseSummaryLines = (totals: InvoiceTotals, branch: Branch): string[] => courseSummaryBlock("th", totals, branch)

export function receiptMessage(inv: Invoice, total: number, ctx: { student: Student; firstSession?: Pick<Session, "date" | "start">; totals?: InvoiceTotals; branch?: Branch; brand?: Brand }): string {
  const brand = ctx.branch?.brand ?? ctx.brand
  return both(brand, (l) => [
    `${W[l].receipt} ${inv.receiptNumber ?? ""}`.trim(),
    f(l, "paid", fmtMoney(total), inv.number ?? ""),
    `${W[l].student}${l === "ja" ? "：" : ": "}${dn(l, ctx.student.nickname)} (${dn(l, ctx.student.name)})`,
    ctx.firstSession ? f(l, "startOn", dateIn(l, ctx.firstSession.date, { weekday: true }), ctx.firstSession.start) : null,
    ...(ctx.totals && ctx.branch ? courseSummaryBlock(l, ctx.totals, ctx.branch) : []),
    "",
    W[l].thanks2,
  ].filter((x) => x !== null).join("\n"))
}

/** one slip for several children → one receipt message listing each invoice */
export function familyReceiptMessage(receiptNumber: string, rows: { number: string; total: number; student: Pick<Student, "nickname"> }[], brand?: Brand): string {
  return both(brand, (l) => [
    `${W[l].receipt} ${receiptNumber}`,
    f(l, "paidAll", fmtMoney(rows.reduce((a, r) => a + r.total, 0))),
    ...rows.map((r) => `• ${dn(l, r.student.nickname)} · ${r.number} · ${fmtMoney(r.total)}`),
    W[l].thanks2,
  ].join("\n"))
}

/** Parents get the whole lesson (owner 2026-09-30): Book, Topic, Lesson Detail and the per-session feedback.
 *  The teacher's own text goes out once; the labels around it carry both languages of the brand. */
export function summaryMessage(sum: LessonSummary, ctx: { student: Student; session: Pick<Session, "subject" | "date" | "start">; book?: string; topic?: string; brand?: Brand }): string {
  const [a, b] = messageLangs(ctx.brand)
  const L: Record<MsgLang, { head: string; book: string; topic: string; detail: string }> = {
    th: { head: "สรุปการเรียน", book: "หนังสือ", topic: "บทเรียน", detail: "รายละเอียด" },
    ja: { head: "授業のまとめ", book: "教材", topic: "単元", detail: "詳細" },
    en: { head: "Lesson summary", book: "Book", topic: "Topic", detail: "Details" },
  }
  const two = (k: keyof (typeof L)["th"]) => `${L[a][k]} / ${L[b][k]}`
  return [
    `📝 ${two("head")} ${dn(a, ctx.student.nickname)} · ${dn(a, ctx.session.subject)}`,
    `${dateIn(a, ctx.session.date, { weekday: true })} · ${dateIn(b, ctx.session.date, { weekday: true })} ${ctx.session.start}`,
    "",
    ctx.book ? `📚 ${two("book")}: ${ctx.book}` : null,
    ctx.topic ? `📖 ${two("topic")}: ${ctx.topic}` : null,
    sum.detail?.trim() ? `📝 ${two("detail")}: ${sum.detail.trim()}` : null,
    ctx.book || ctx.topic || sum.detail ? "" : null,
    sum.text.trim(),
  ].filter((x) => x !== null).join("\n")
}

/** The teacher's whole-course report, sent once per purchase round (owner 2026-10-06). */
/** `link` (owner 2026-10-14) = the parent app in LINE, opened straight on this summary with its progress charts */
export function courseSummaryMessage(cs: CourseSummary, ctx: { student: Student; course: Pick<Course, "name">; entitlement: Pick<Entitlement, "from" | "to">; brand?: Brand }, link?: string): string {
  const [a, b] = messageLangs(ctx.brand)
  const L: Record<MsgLang, { head: string; overall: string; strong: string; improve: string; chart: string }> = {
    th: { head: "สรุปจบคอร์ส", overall: "ภาพรวมพัฒนาการ", strong: "จุดแข็ง", improve: "สิ่งที่ควรฝึกเพิ่ม", chart: "ดูสรุปและกราฟพัฒนาการ" },
    ja: { head: "コース修了のまとめ", overall: "全体の成長", strong: "強み", improve: "今後の課題", chart: "まとめと成長グラフはこちら" },
    en: { head: "Course summary", overall: "Overall progress", strong: "Strengths", improve: "To work on", chart: "See the summary and progress charts" },
  }
  const two = (k: keyof (typeof L)["th"]) => `${L[a][k]} / ${L[b][k]}`
  return [
    `🎓 ${two("head")} ${dn(a, ctx.student.nickname)} · ${dn(a, ctx.course.name)}`,
    `${dateIn(a, ctx.entitlement.from)} – ${dateIn(a, ctx.entitlement.to, { year: true })}`,
    "",
    `📈 ${two("overall")}: ${cs.overallProgress.trim()}`,
    cs.strengths.trim() ? `✅ ${two("strong")}: ${cs.strengths.trim()}` : null,
    cs.toImprove.trim() ? `🎯 ${two("improve")}: ${cs.toImprove.trim()}` : null,
    link ? "" : null,
    link ? `📊 ${two("chart")}: ${link}` : null,
  ].filter((x) => x !== null).join("\n")
}
