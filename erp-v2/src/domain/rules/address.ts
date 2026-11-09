import type { AddressParts } from "../types"

const BKK = /กรุงเทพ|bangkok/i
/** Compose the one-line address from the parts (house no. · building · ซอย · ถนน · แขวง/ตำบล · เขต/อำเภอ).
 *  Prefixes are added when the parent typed only the name; province / postcode stay their own fields. */
export function composeAddress(parts: AddressParts | undefined, province = ""): string {
  if (!parts) return ""
  const bkk = BKK.test(province)
  const pre = (v: string | undefined, re: RegExp, word: string) => { const t = (v ?? "").trim(); return !t ? "" : re.test(t) ? t : `${word} ${t}` }
  return [
    (parts.houseNo ?? "").trim(), (parts.building ?? "").trim(),
    pre(parts.soi, /^(ซอย|ซ\.|soi)/i, "ซอย"), pre(parts.road, /^(ถนน|ถ\.|road|rd)/i, "ถนน"),
    pre(parts.subdistrict, /^(แขวง|ตำบล|ต\.|khwaeng|tambon|subdistrict)/i, bkk ? "แขวง" : "ตำบล"),
    pre(parts.district, /^(เขต|อำเภอ|อ\.|khet|amphoe|district)/i, bkk ? "เขต" : "อำเภอ"),
  ].filter(Boolean).join(" ")
}
