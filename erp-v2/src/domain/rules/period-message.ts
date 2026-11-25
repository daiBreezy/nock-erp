import { fmtDate } from "../dates"
import type { DateStr, PeriodParentMsg, SpecialPeriod } from "../types"
import type { InvoiceState } from "./session-credit"

/**
 * owner 2026-11-25 — the message to parents about a Special Period. The Admin sends it from the Impact Center: ONE message per FAMILY (every affected child),
 * built from the period's editable set: an intro, one paragraph per child by GROUP (hourly · weekly/monthly · weekly/monthly with an unpaid invoice), an outro.
 * No baht amounts in the text (the Admin may still change how the money is handled). Always Thai — it goes to the parent whatever language the screen is in.
 */
export type MsgGroup = "hourly" | "subscription" | "unpaid"

export const DEFAULT_PARENT_MSG: PeriodParentMsg = {
  intro: "เรียนผู้ปกครอง {ครอบครัว}\nโรงเรียนขอแจ้งว่า ช่วง {ช่วง} ({วันที่ช่วง}) คลาสปกติจะหยุดทั้งช่วง",
  hourly: "• {ชื่อลูก}: คาบที่หยุด {คาบที่หยุด} — วันจบแพ็กเกจจะเลื่อนออกไปให้เองเป็นวันที่ {วันจบใหม่} ไม่ต้องทำอะไรเพิ่มค่ะ",
  subscription: "• {ชื่อลูก}: คาบที่หยุด {คาบที่หยุด} — ได้รับ Credit {จำนวนคาบ} คาบ ทางโรงเรียนจะติดต่อเพื่อตกลงเรื่องคืนเงินหรือนัดเรียนชดเชยค่ะ",
  unpaid: "• {ชื่อลูก}: คาบที่หยุด {คาบที่หยุด} — ใบแจ้งหนี้ที่ส่งไปก่อนหน้านี้ ทางโรงเรียนกำลังปรับยอดให้ตรงกับคาบที่หยุด กรุณายังไม่ต้องชำระตามยอดเดิม จะส่งใบใหม่ให้ค่ะ",
  outro: "ขออภัยในความไม่สะดวก หากมีข้อสงสัยติดต่อโรงเรียนได้ตลอดเวลาค่ะ",
}
export const PARENT_MSG_FIELDS: { key: keyof PeriodParentMsg; label: string; hint: string }[] = [
  { key: "intro", label: "ข้อความเปิด", hint: "{ครอบครัว} {ช่วง} {วันที่ช่วง}" },
  { key: "hourly", label: "กลุ่มรายชั่วโมง", hint: "{ชื่อลูก} {คาบที่หยุด} {วันจบใหม่} {ช่วง} {วันที่ช่วง}" },
  { key: "subscription", label: "กลุ่มรายสัปดาห์ / รายเดือน", hint: "{ชื่อลูก} {คาบที่หยุด} {จำนวนคาบ} {ช่วง} {วันที่ช่วง}" },
  { key: "unpaid", label: "กลุ่มใบแจ้งหนี้ยังไม่จ่าย", hint: "{ชื่อลูก} {คาบที่หยุด} {จำนวนคาบ} {ช่วง} {วันที่ช่วง}" },
  { key: "outro", label: "ข้อความปิดท้าย", hint: "{ครอบครัว} {ช่วง}" },
]
export const parentMsgOf = (p: Pick<SpecialPeriod, "parentMsg">): PeriodParentMsg => ({ ...DEFAULT_PARENT_MSG, ...(p.parentMsg ?? {}) })

export const fillTemplate = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{([^{}]+)\}/g, (m, k: string) => vars[k] ?? m)

/** which paragraph a child gets: a weekly / monthly package with an invoice not yet paid → the "unpaid" text */
export function groupOf(kind: "sessions" | "subscription", invoice: InvoiceState): MsgGroup {
  if (kind === "sessions") return "hourly"
  return invoice === "unpaid" || invoice === "draft" ? "unpaid" : "subscription"
}

export interface MsgKid { name: string; group: MsgGroup; dates: DateStr[]; /** hourly: the new end date */ newEnd?: DateStr; /** weekly / monthly: credits */ credits?: number }

const datesText = (dates: DateStr[]) => [...new Set(dates)].sort().map((d) => fmtDate(d, { weekday: true })).join(", ")

export function composeFamilyMessage(period: Pick<SpecialPeriod, "name" | "from" | "to" | "parentMsg">, family: string, kids: MsgKid[]): string {
  const tpl = parentMsgOf(period)
  const base = { "ครอบครัว": family, "ช่วง": period.name, "วันที่ช่วง": `${fmtDate(period.from, { year: true })} – ${fmtDate(period.to, { year: true })}` }
  const kidText = (k: MsgKid) => fillTemplate(tpl[k.group], { ...base, "ชื่อลูก": k.name, "คาบที่หยุด": datesText(k.dates), "จำนวนคาบ": String(k.credits ?? k.dates.length), "วันจบใหม่": k.newEnd ? fmtDate(k.newEnd, { year: true }) : "—" })
  return [fillTemplate(tpl.intro, base), kids.map(kidText).join("\n"), fillTemplate(tpl.outro, base)].filter((x) => x.trim()).join("\n\n")
}
