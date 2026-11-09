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


// ---------- notices: form links, announcements, automatic replies (owner 2026-11-09: same two-language rule) ----------

type Arg = string | number | ((l: MsgLang) => string)
/** an argument that is a name from the data (student, course, form) — written in each message language */
export const nameArg = (t: string): Arg => (l) => dn(l, t)
/** an argument that is a date — written in each message language */
export const dateArg = (d: DateStr, o: { weekday?: boolean; year?: boolean } = {}): Arg => (l) => dateIn(l, d, o)

const N: Record<MsgLang, Record<string, string>> = {
  th: {
    formLink: "กรุณากรอกแบบฟอร์ม{0}ที่ลิงก์นี้ค่ะ 🙏 ({1})\n{2}",
    exitForm: "รบกวนผู้ปกครองช่วยตอบแบบฟอร์มสั้นๆ เรื่องการหยุดเรียนของ{0}ค่ะ 🙏 (ประมาณ 2 นาที)\n{1}",
    enrollGeneral: "กรอกใบสมัครเรียนได้ที่ลิงก์นี้เลยค่ะ 🙏 แอดมินจะจัดคลาสและส่งใบแจ้งหนี้ให้ทันที\n{0}",
    enrollPick: "กรอกใบสมัครเรียน และเลือกคลาสที่สะดวกได้ที่ลิงก์นี้เลยค่ะ 🙏 แอดมินจะส่งใบแจ้งหนี้ให้ทันที\n{0}",
    enrollPlan: "กรอกข้อมูลสมัครเรียนได้ที่ลิงก์นี้เลยค่ะ 🙏 ได้รับแล้วแอดมินจะส่งใบแจ้งหนี้ตามที่คุยกันไว้ให้ค่ะ\n{0}",
    survey: "ขอเวลา 3 นาทีช่วยตอบแบบสอบถามความพึงพอใจประจำปีหน่อยนะคะ 🙏 ทุกความเห็นช่วยให้เราดูแลน้องๆ ได้ดีขึ้น\n{0}",
    surveyRemind: "แจ้งเตือนอีกครั้งค่ะ — ",
    customForm: "รบกวนผู้ปกครองช่วยตอบแบบฟอร์ม “{0}” ค่ะ 🙏\n{1}",
    catalog: "ดูคอร์สและตารางเรียนทั้งหมดของสาขาได้ที่ลิงก์นี้เลยค่ะ 📚 เลือกระดับชั้น / วิชาที่สนใจ แล้วกด \"สนใจ\" ได้เลยนะคะ\n{0}",
    holiday: "แจ้งวันหยุด: {0} ({1}) สถาบันปิดทำการค่ะ{2} 🙏",
    holidayCancelled: " คาบเรียนวันนั้นงดเรียน แอดมินจะติดต่อเพื่อนัดเรียนชดเชยนะคะ",
    firstClass: "พรุ่งนี้เป็นวันเรียนวันแรกของ{0}ค่ะ 🎉 {1} เวลา {2} น. · {3}\nแล้วพบกันนะคะ 😊",
    renewal: "คอร์ส {1} ของ{0}เหลืออีก {2} คาบ (ถึง {3}) ค่ะ หากต้องการเรียนต่อ แจ้งแอดมินได้เลยนะคะ 🙏",
    pinAsk: "สวัสดีค่ะ รบกวนช่วยปักหมุดบ้านสำหรับรถรับส่งของ{0}ให้หน่อยนะคะ กดลิงก์นี้แล้วแตะแผนที่ตรงบ้านได้เลยค่ะ 🙏\n{1}",
    reqReturn: "ได้รับเรื่องอยากกลับมาเรียนของ{0}แล้วค่ะ ดีใจมากเลย 😊 แอดมินจะติดต่อกลับเพื่อจัดคลาสให้นะคะ",
    reqLeave: "ได้รับแจ้งลาของ{0} {1} คาบแล้วค่ะ แอดมินจะยืนยันกลับอีกครั้ง 🙏",
    reqBus: "ได้รับคำขอเรื่องรถรับส่งของ{0}แล้วค่ะ แอดมินจะเช็ครอบรถแล้วยืนยันกลับนะคะ 🙏",
    reqHome: "ได้รับตำแหน่งบ้านสำหรับรถรับส่งของ{0}แล้วค่ะ แอดมินจะตรวจแล้วจัดรถให้นะคะ 🙏",
    reqExit: "ได้รับแจ้งหยุดเรียนของ{0}แล้วค่ะ แอดมินจะติดต่อกลับเพื่อคุยรายละเอียดนะคะ 🙏",
    doneLeave: "บันทึกการลาของ{0}แล้วค่ะ {1} 🙏",
    doneExit: "รับเรื่องการหยุดเรียนของ{0}แล้วค่ะ แอดมินจะติดต่อกลับเร็วๆ นี้ 🙏",
    doneReturn: "ยินดีต้อนรับ{0}กลับมาค่ะ 😊 แอดมินจะติดต่อกลับเพื่อจัดคลาสให้นะคะ",
    doneHome: "บันทึกตำแหน่งบ้านสำหรับรถรับส่งของ{0}เรียบร้อยแล้วค่ะ 🙏",
    doneBus: "{0}ของ{1}เรียบร้อยแล้วค่ะ 🙏",
    busWith: "ผู้ปกครองนั่งรถไปด้วย {0} วัน (ไม่มีค่าใช้จ่าย)", busAdd: "เพิ่มรถรับส่ง {0} เที่ยว ({1} รวมในใบแจ้งหนี้รอบถัดไป)", busCancel: "ยกเลิกรถ {0} เที่ยว", and: " และ",
    typeTest: "สอบวัดระดับ", typeTrial: "ทดลองเรียน",
  },
  ja: {
    formLink: "{0}のフォームを、こちらのリンクからご記入ください 🙏（{1}）\n{2}",
    exitForm: "{0}さんのご退会について、短いアンケートにご協力をお願いします 🙏（約2分）\n{1}",
    enrollGeneral: "こちらのリンクから入会申込書をご記入ください 🙏 クラスを手配し、すぐに請求書をお送りします\n{0}",
    enrollPick: "入会申込書のご記入と、ご都合のよいクラスのご選択をこちらからお願いします 🙏 すぐに請求書をお送りします\n{0}",
    enrollPlan: "こちらから入会情報をご記入ください 🙏 受け取り次第、ご相談どおりの請求書をお送りします\n{0}",
    survey: "年に一度の満足度アンケートにご協力ください（約3分）🙏 いただいたご意見は、お子さまへのより良いサポートに活かします\n{0}",
    surveyRemind: "再度のご案内です — ",
    customForm: "フォーム「{0}」へのご回答をお願いします 🙏\n{1}",
    catalog: "各校のコースと時間割はこちらからご覧いただけます 📚 学年・教科をお選びのうえ「興味あり」を押してください\n{0}",
    holiday: "休校のお知らせ：{0}（{1}）は休校日です。{2} 🙏",
    holidayCancelled: "当日の授業はお休みです。振替日程は改めてご連絡します。",
    firstClass: "明日は{0}さんの初回授業です 🎉 {1} {2}・{3}\nお会いできるのを楽しみにしています 😊",
    renewal: "{0}さんの{1}は残り{2}回（{3}まで）です。ご継続をご希望の場合は、お知らせください 🙏",
    pinAsk: "{0}さんの送迎バス用に、ご自宅の位置情報（ピン）の登録をお願いします。こちらのリンクを開き、地図でご自宅をタップしてください 🙏\n{1}",
    reqReturn: "{0}さんの復学のご希望を受け付けました。とても嬉しいです 😊 クラスの手配のため、担当よりご連絡します。",
    reqLeave: "{0}さんの欠席連絡（{1}回分）を受け付けました。担当から改めて確認のご連絡をします 🙏",
    reqBus: "{0}さんの送迎バスのご依頼を受け付けました。便を確認のうえ、ご連絡します 🙏",
    reqHome: "{0}さんの送迎用のご自宅位置を受け取りました。確認のうえ、バスを手配します 🙏",
    reqExit: "{0}さんの退会のご連絡を受け付けました。詳細について担当からご連絡します 🙏",
    doneLeave: "{0}さんの欠席を記録しました。{1} 🙏",
    doneExit: "{0}さんの退会のご連絡を受け付けました。担当から近日中にご連絡します 🙏",
    doneReturn: "{0}さんのお戻りを歓迎します 😊 クラスの手配のため、担当よりご連絡します。",
    doneHome: "{0}さんの送迎用のご自宅位置を登録しました 🙏",
    doneBus: "{1}さんの{0}を完了しました 🙏",
    busWith: "保護者の方が{0}日間バスに同乗（無料）", busAdd: "送迎バスを{0}便追加（{1}、次回の請求書に含みます）", busCancel: "送迎バスを{0}便キャンセル", and: "、",
    typeTest: "レベルテスト", typeTrial: "体験授業",
  },
  en: {
    formLink: "Please fill in the {0} form at this link 🙏 ({1})\n{2}",
    exitForm: "Could you please answer a short form about {0} leaving the school 🙏 (about 2 minutes)\n{1}",
    enrollGeneral: "Please fill in the enrolment form at this link 🙏 We will arrange the class and send the invoice right away\n{0}",
    enrollPick: "Please fill in the enrolment form and pick the classes that suit you 🙏 We will send the invoice right away\n{0}",
    enrollPlan: "Please fill in the enrolment details at this link 🙏 Once received, we will send the invoice as we discussed\n{0}",
    survey: "Could you spare 3 minutes for our yearly satisfaction survey? 🙏 Every comment helps us care for the children better\n{0}",
    surveyRemind: "A gentle reminder — ",
    customForm: "Please answer the form “{0}” 🙏\n{1}",
    catalog: "You can see all courses and timetables of the branch at this link 📚 Pick a grade / subject and tap \"Interested\"\n{0}",
    holiday: "Holiday notice: {0} ({1}) — the school is closed.{2} 🙏",
    holidayCancelled: " Classes that day are cancelled; we will contact you to arrange make-up classes.",
    firstClass: "Tomorrow is {0}'s first class 🎉 {1} at {2} · {3}\nSee you then 😊",
    renewal: "{0}'s course {1} has {2} sessions left (until {3}). If you would like to continue, please let us know 🙏",
    pinAsk: "Hello! Could you please pin your home location for {0}'s school bus? Open this link and tap your house on the map 🙏\n{1}",
    reqReturn: "We received the request for {0} to come back. We are so happy 😊 The admin will contact you to arrange a class.",
    reqLeave: "We received the leave notice for {0} ({1} sessions). The admin will confirm shortly 🙏",
    reqBus: "We received the bus request for {0}. The admin will check the bus rounds and confirm 🙏",
    reqHome: "We received the home location for {0}'s bus. The admin will check it and arrange the bus 🙏",
    reqExit: "We received the notice that {0} will stop studying. The admin will contact you about the details 🙏",
    doneLeave: "Leave recorded for {0}: {1} 🙏",
    doneExit: "We received the notice that {0} will stop studying. The admin will contact you soon 🙏",
    doneReturn: "Welcome back, {0}! 😊 The admin will contact you to arrange a class.",
    doneHome: "The home location for {0}'s bus has been saved 🙏",
    doneBus: "Done for {1}: {0} 🙏",
    busWith: "a parent rides along for {0} days (free)", busAdd: "added {0} bus trips ({1}, included in the next invoice)", busCancel: "cancelled {0} bus trips", and: " and ",
    typeTest: "placement test", typeTrial: "trial class",
  },
}
export type NoticeKey = Exclude<keyof (typeof N)["th"], "and" | "typeTest" | "typeTrial" | "holidayCancelled" | "surveyRemind" | "busWith" | "busAdd" | "busCancel">
const fill = (l: MsgLang, text: string, args: Arg[]) => text.replace(/\{(\d)\}/g, (_, i) => { const a = args[Number(i)]; return typeof a === "function" ? a(l) : String(a ?? "") })

/** a notice in both languages of the brand; args can be plain values or per-language functions (nameArg, dateArg) */
export function notice(brand: Brand | undefined, key: NoticeKey, ...args: Arg[]): string {
  return both(brand, (l) => fill(l, N[l][key], args))
}
/** the Test / Trial form link — the type word and the subjects in each language */
export const formLinkMessage = (brand: Brand | undefined, type: "test" | "trial", subjects: string[], url: string) =>
  both(brand, (l) => fill(l, N[l].formLink, [N[l][type === "test" ? "typeTest" : "typeTrial"], subjects.map((x) => dn(l, x)).join(", "), url]))
/** yearly survey link; `remind` = the one reminder 7 days later */
export const surveyMessage = (brand: Brand | undefined, url: string, remind = false) =>
  both(brand, (l) => `${remind ? N[l].surveyRemind : ""}${fill(l, N[l].survey, [url])}`)
export const holidayMessage = (brand: Brand | undefined, name: string, date: DateStr, cancelled: boolean) =>
  both(brand, (l) => fill(l, N[l].holiday, [dn(l, name), dateIn(l, date, { weekday: true }), cancelled ? N[l].holidayCancelled : ""]))
export const customFormMessage = (brand: Brand | undefined, formName: string, url: string) => both(brand, (l) => fill(l, N[l].customForm, [dn(l, formName), url]))
/** what the admin's bus approval tells the parent: parts = [parent rides along days, trips added + amount, trips cancelled] */
export function busDoneMessage(brand: Brand | undefined, nickname: string, p: { withDays?: number; addTrips?: number; amount?: number; cancelTrips?: number }) {
  return both(brand, (l) => {
    const parts = [
      p.withDays ? fill(l, N[l].busWith, [p.withDays]) : null,
      p.addTrips ? fill(l, N[l].busAdd, [p.addTrips, fmtMoney(p.amount ?? 0)]) : null,
      p.cancelTrips ? fill(l, N[l].busCancel, [p.cancelTrips]) : null,
    ].filter((x): x is string => !!x)
    return fill(l, N[l].doneBus, [parts.join(N[l].and), dn(l, nickname)])
  })
}
/** the leave the admin recorded: each day + time written in the message language */
export const leaveDoneMessage = (brand: Brand | undefined, nickname: string, days: { date: DateStr; start: string }[]) =>
  both(brand, (l) => fill(l, N[l].doneLeave, [dn(l, nickname), days.map((d) => `${dateIn(l, d.date, { weekday: true })} ${d.start}`).join(", ")]))
