import { tx } from "./i18n"

/**
 * owner 2026-11-25: ONE compact way to say "how many days away / ago / left" in staff screens: "40 ว" (Thai) · "40d" (English) · "40日" (Japanese). DAYS ONLY — there is no
 * month / year unit: a span longer than about a month is shown as a DATE where one is known (the hover adds it too). Words around it (อีก · เหลือ · เลย · ที่แล้ว) stay as words.
 * Staff screens only — the parent app keeps full words, and the hover shows the full word ("40 วัน").
 */
export const fmtSpan = (days: number): string => tx("{0} ว", [Math.max(0, Math.round(days))])

/** the same span in full words for the hover */
export const fmtSpanFull = (days: number): string => tx("{0} วัน", [Math.max(0, Math.round(days))])
