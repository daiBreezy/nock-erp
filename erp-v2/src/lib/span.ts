import { tx } from "./i18n"

/**
 * owner 2026-11-25: ONE compact way to say "how many days away / ago / left" everywhere (chips, countdowns, tables): ว / ด / ป in Thai, d / m / y in English, 日 / ヶ月 / 年 in
 * Japanese. Under 60 days it counts days, then months (up to 2 years), then years — "40 ว" · "3 ด" · "2 ป". Words around it (อีก · เหลือ · เลย · ที่แล้ว) stay as words.
 * Staff screens only — the parent app keeps full words.
 */
export function fmtSpan(days: number): string {
  const n = Math.max(0, Math.round(days))
  if (n < 60) return tx("{0} ว", [n])
  if (n < 730) return tx("{0} ด", [Math.floor(n / 30.4)])
  return tx("{0} ป", [Math.floor(n / 365)])
}
