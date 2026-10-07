import type { AttentionItem, Tr } from "./reports"

/**
 * Dashboard "ต้องจัดการ" board + "AI สรุปงานวันนี้" (owner 2026-10-07). The dashboard used to show the same work
 * three times (งานที่รอคุณ, รอต่อคอร์ส, ลีดใหม่, Need Attention) as long lists — now every kind of work is one
 * topic with a count, the list itself lives on its own page (opened with `?focus=<key>` so that page highlights it),
 * and the brief below puts the topics in the order worth doing them. Pure — the page passes the counts in.
 */

export type TopicGroup = "today" | "customers" | "money" | "students" | "teaching" | "sales"

export interface Topic {
  key: string
  group: TopicGroup
  title: string
  detail: string
  count: number
  /** the page holding the list — `focusHref` adds ?focus=<key> */
  href: string
  /** how many of `count` are urgent (e.g. package ends within 2 days) */
  urgent?: number
}

export const TOPIC_GROUP_LABEL: Record<TopicGroup, string> = {
  today: "งานประจำวัน",
  customers: "ลูกค้า",
  money: "เงิน",
  students: "นักเรียนและข้อมูล",
  teaching: "ครูและการสอน",
  sales: "ขาย (CRM)",
}

/** left / right columns of the board — the people-facing work on the left, teaching + data on the right */
export const TOPIC_COLUMNS: TopicGroup[][] = [["today", "customers", "sales", "money"], ["teaching", "students"]]

/** Need Attention keys the dashboard's own topics already cover (same work, counted once) */
export const COVERED_ATTENTION = new Set(["summaries", "unmarked", "conflicts", "lead_idle", "expiring"])

/** `/students?status=renewal` + focus=renewal → `/students?status=renewal&focus=renewal` */
export function focusHref(href: string, key: string) {
  return `${href}${href.includes("?") ? "&" : "?"}focus=${encodeURIComponent(key)}`
}

/** attention items → board topics (trend items are facts, not work — they go to the brief's notes) */
export function attentionTopics(items: AttentionItem[]): Topic[] {
  return items
    .filter((x) => x.group !== "trend" && !COVERED_ATTENTION.has(x.key))
    .map((x) => ({ key: x.key, group: x.group as TopicGroup, title: x.title, detail: x.detail, count: x.count, href: x.href }))
}

type When = "now" | "today" | "soon"

/**
 * What to do first and why. Rank = how much it costs to wait: work that blocks other work or a class about to
 * start first, then money / customers that can walk away, then approvals someone is waiting on, then housekeeping.
 */
const PRIORITY: Record<string, { rank: number; when: When; why: string }> = {
  no_teacher: { rank: 10, when: "now", why: "หาครูแทนก่อนถึงเวลาเรียน" },
  conflict: { rank: 11, when: "now", why: "แก้ก่อนถึงเวลาเรียน ไม่งั้นห้อง/ครูชนกันจริง" },
  unmarked: { rank: 12, when: "now", why: "เช็คชื่อตัดโควตาแพ็กเกจและใช้ออกใบแจ้งหนี้ ยิ่งช้ายิ่งจำผิด" },
  renewal_urgent: { rank: 20, when: "today", why: "แพ็กหมดภายใน 2 วัน ถ้าไม่ต่อนักเรียนจะหลุด" },
  lead_new: { rank: 22, when: "today", why: "ติดต่อลีดภายใน 24 ชม. ปิดการขายได้มากกว่า" },
  survey_call: { rank: 24, when: "today", why: "ผู้ปกครองไม่พอใจ ควรโทรภายใน 3 วัน" },
  summary_approve: { rank: 30, when: "today", why: "ครูรออยู่ อนุมัติแล้วจึงส่งผู้ปกครองได้" },
  invoice_approve: { rank: 31, when: "today", why: "อนุมัติแล้วจึงส่งใบให้ผู้ปกครองได้" },
  summary_write: { rank: 32, when: "today", why: "เขียนวันนี้ขณะยังจำรายละเอียดได้" },
  unconfirmed: { rank: 34, when: "today", why: "เงินเข้าแล้ว ยืนยันเพื่อออกใบเสร็จ" },
  unpaid: { rank: 36, when: "today", why: "ตามเงินค้างก่อนค้างนานขึ้น" },
  teacher_leave: { rank: 40, when: "soon", why: "จัดครูแทนล่วงหน้า" },
  renewal: { rank: 42, when: "soon", why: "ทักไว้ก่อนแพ็กหมด" },
  trial_idle: { rank: 44, when: "soon", why: "ทดลองแล้วยังไม่สมัคร ยิ่งนานยิ่งเย็น" },
  lead_follow_again: { rank: 45, when: "soon", why: "ถึงวันที่ตั้งไว้ตอนปิดลีด" },
  lead_quiet: { rank: 46, when: "soon", why: "ตัดสินใจปิดหรือเปลี่ยนช่องทาง" },
  often_leave: { rank: 48, when: "soon", why: "ลาบ่อยมักหลุดเป็นรายต่อไป ทักผู้ปกครองก่อน" },
  small_class: { rank: 55, when: "soon", why: "รวมคลาสหรือหาเพื่อนเรียนเพิ่ม" },
  no_family: { rank: 60, when: "soon", why: "ข้อมูลไม่ครบ ทำตอนว่าง" },
  no_line: { rank: 61, when: "soon", why: "ข้อมูลไม่ครบ ทำตอนว่าง" },
  no_address: { rank: 62, when: "soon", why: "ข้อมูลไม่ครบ ทำตอนว่าง" },
}
const DEFAULT_PRIORITY = { rank: 50, when: "soon" as When, why: "" }

export interface BriefStep { key: string; title: string; count: number; why: string; when: When; href: string }

export interface DailyBrief {
  headline: string
  steps: BriefStep[]
  /** topics with work beyond the top steps */
  more: number
  /** time / workload notes, then trend facts */
  notes: { text: string; href?: string }[]
}

export interface BriefInput {
  topics: Topic[]
  /** attention items of group "trend" with count > 0 */
  trend: AttentionItem[]
  /** today's sessions (not cancelled) in the user's scope, with their state right now */
  sessions: { start: string; minutes: number; state: string }[]
  /** "HH:MM" */
  nowTime: string
  /** how many steps to show (default 5) */
  limit?: number
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
const plain: Tr = (th, vars) => (vars ? th.replace(/\{(\d+)\}/g, (m, k) => String(vars[Number(k)] ?? m)) : th)

export function dailyBrief(input: BriefInput, tr: Tr = plain): DailyBrief {
  // split renewals: the urgent ones are "today" work, the rest can wait a few days
  const work: { key: string; title: string; count: number; href: string }[] = []
  for (const t of input.topics) {
    if (t.count <= 0) continue
    if (t.key === "renewal" && t.urgent) {
      work.push({ key: "renewal_urgent", title: tr("ต่อคอร์สด่วน"), count: t.urgent, href: t.href })
      if (t.count > t.urgent) work.push({ key: "renewal", title: t.title, count: t.count - t.urgent, href: t.href })
    } else work.push({ key: t.key, title: t.title, count: t.count, href: t.href })
  }
  const ranked = work
    .map((w) => ({ ...w, p: PRIORITY[w.key] ?? DEFAULT_PRIORITY }))
    .sort((a, b) => a.p.rank - b.p.rank || b.count - a.count)
  const limit = input.limit ?? 5
  const steps: BriefStep[] = ranked.slice(0, limit).map((w) => ({ key: w.key, title: w.title, count: w.count, why: w.p.why && tr(w.p.why), when: w.p.when, href: focusHref(w.href, w.key === "renewal_urgent" ? "renewal" : w.key) }))
  // the headline counts today's work only — housekeeping (data gaps, small classes…) stays on the board
  const todayWork = ranked.filter((w) => w.p.when !== "soon").reduce((n, w) => n + w.count, 0)
  const urgent = ranked.filter((w) => w.p.when === "now" || w.key === "renewal_urgent").reduce((n, w) => n + w.count, 0)

  const now = toMin(input.nowTime)
  const live = input.sessions.filter((s) => s.state === "live").length
  const upcoming = input.sessions.filter((s) => s.state === "upcoming").sort((a, b) => a.start.localeCompare(b.start))
  const parts = [tr("วันนี้มี {0} คาบ", [input.sessions.length])]
  if (live) parts.push(tr("กำลังเรียน {0}", [live]))
  parts.push(todayWork ? (urgent ? tr("งานวันนี้ {0} เรื่อง (ด่วน {1})", [todayWork, urgent]) : tr("งานวันนี้ {0} เรื่อง", [todayWork])) : ranked.length ? tr("ไม่มีงานด่วนวันนี้") : tr("ไม่มีงานค้าง"))
  let headline = parts.join(" · ")
  if (steps[0]) headline += tr(" — เริ่มที่ {0}", [steps[0].title])

  const notes: DailyBrief["notes"] = []
  const next = upcoming[0]
  if (live) notes.push({ text: tr("มี {0} คาบกำลังเรียน — ทีมสอนไม่ว่าง งานโทร/อนุมัติทำได้เลย", [live]) })
  else if (next) {
    const gap = toMin(next.start) - now
    if (gap >= 45) notes.push({ text: tr("ว่างอีก {0} ก่อนคาบ {1} — เหมาะเคลียร์ข้อ 1–{2}", [gap >= 60 ? tr("{0} ชม. {1} นาที", [Math.floor(gap / 60), gap % 60]) : tr("{0} นาที", [gap]), next.start, Math.max(1, Math.min(steps.length, Math.floor(gap / 30)))]) })
    else if (gap > 0) notes.push({ text: tr("คาบถัดไป {0} อีก {1} นาที — เตรียมห้อง/รายชื่อให้พร้อม", [next.start, gap]) })
  } else if (input.sessions.length) notes.push({ text: tr("คาบวันนี้จบหมดแล้ว — เช็คชื่อและสรุปให้ครบก่อนกลับ") })
  for (const t of input.trend) notes.push({ text: `${t.title} · ${t.detail}`, href: t.href })

  return { headline, steps, more: Math.max(0, ranked.length - steps.length), notes }
}
