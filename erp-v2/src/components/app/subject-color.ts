import { nm, useUiLang } from "@/lib/i18n"
import { useStore } from "@/store/store"
// One colour per subject so a day can be scanned at a glance.
// Class strings are written out in full so Tailwind can see them.

export interface SubjectColor {
  soft: string // card background + border
  bar: string // left accent / dot
  text: string // title colour on soft background
  strong: string // live card (filled)
  chip: string
}

/** owner 2026-10-12: every subject gets a colour picked in Settings → System (`system.subjectColors`) */
export const SUBJECT_PALETTE: Record<string, SubjectColor & { label: string; swatch: string }> = {
  rose: { label: "แดง", swatch: "bg-rose-500", soft: "bg-rose-50 border-rose-200", bar: "bg-rose-500", text: "text-rose-900", strong: "bg-rose-700 border-rose-800 text-white", chip: "bg-rose-100 text-rose-800" },
  orange: { label: "ส้ม", swatch: "bg-orange-500", soft: "bg-orange-50 border-orange-200", bar: "bg-orange-500", text: "text-orange-900", strong: "bg-orange-700 border-orange-800 text-white", chip: "bg-orange-100 text-orange-800" },
  amber: { label: "เหลือง", swatch: "bg-amber-500", soft: "bg-amber-50 border-amber-200", bar: "bg-amber-500", text: "text-amber-900", strong: "bg-amber-700 border-amber-800 text-white", chip: "bg-amber-100 text-amber-900" },
  lime: { label: "เขียวอ่อน", swatch: "bg-lime-500", soft: "bg-lime-50 border-lime-200", bar: "bg-lime-500", text: "text-lime-900", strong: "bg-lime-700 border-lime-800 text-white", chip: "bg-lime-100 text-lime-900" },
  emerald: { label: "เขียว", swatch: "bg-emerald-500", soft: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", text: "text-emerald-900", strong: "bg-emerald-700 border-emerald-800 text-white", chip: "bg-emerald-100 text-emerald-800" },
  teal: { label: "เขียวน้ำทะเล", swatch: "bg-teal-500", soft: "bg-teal-50 border-teal-200", bar: "bg-teal-500", text: "text-teal-900", strong: "bg-teal-700 border-teal-800 text-white", chip: "bg-teal-100 text-teal-800" },
  sky: { label: "ฟ้า", swatch: "bg-sky-500", soft: "bg-sky-50 border-sky-200", bar: "bg-sky-500", text: "text-sky-900", strong: "bg-sky-700 border-sky-800 text-white", chip: "bg-sky-100 text-sky-800" },
  indigo: { label: "คราม", swatch: "bg-indigo-500", soft: "bg-indigo-50 border-indigo-200", bar: "bg-indigo-500", text: "text-indigo-900", strong: "bg-indigo-700 border-indigo-800 text-white", chip: "bg-indigo-100 text-indigo-800" },
  violet: { label: "ม่วง", swatch: "bg-violet-500", soft: "bg-violet-50 border-violet-200", bar: "bg-violet-500", text: "text-violet-900", strong: "bg-violet-700 border-violet-800 text-white", chip: "bg-violet-100 text-violet-800" },
  pink: { label: "ชมพู", swatch: "bg-pink-500", soft: "bg-pink-50 border-pink-200", bar: "bg-pink-500", text: "text-pink-900", strong: "bg-pink-700 border-pink-800 text-white", chip: "bg-pink-100 text-pink-800" },
  slate: { label: "เทา", swatch: "bg-slate-500", soft: "bg-slate-50 border-slate-200", bar: "bg-slate-500", text: "text-slate-900", strong: "bg-slate-700 border-slate-800 text-white", chip: "bg-slate-100 text-slate-800" },
}
const KEYS = Object.keys(SUBJECT_PALETTE)
const FIXED: Record<string, string> = { คณิต: "rose", อังกฤษ: "sky", วิทย์: "emerald", ไทย: "amber", สังคม: "violet" }

/** the colour key for a subject: the one picked in Settings, else a fixed / hashed default */
export function subjectColorKey(subject: string): string {
  const picked = useStore.getState().system?.subjectColors?.[subject]
  if (picked && picked in SUBJECT_PALETTE) return picked
  if (subject in FIXED) return FIXED[subject]
  let h = 0
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return KEYS[h % KEYS.length]
}

export function subjectColor(subject: string): SubjectColor {
  return SUBJECT_PALETTE[subjectColorKey(subject)]
}

/** Grade chip colour by school level */
export function gradeTone(grade: string) {
  if (/^ม\.[4-6]/.test(grade)) return "bg-pink-100 text-pink-800"
  if (/^ม\./.test(grade)) return "bg-violet-100 text-violet-800"
  if (/^ป\.[4-6]/.test(grade)) return "bg-sky-100 text-sky-800"
  if (/^ป\./.test(grade)) return "bg-emerald-100 text-emerald-800"
  return "bg-muted text-muted-foreground"
}

/** First visible letter of a Thai/English name (skips "ครู" and leading vowels เ แ โ ใ ไ) */
export function initial(name: string) {
  // English / Japanese UI: the first letter of the romanized name (owner 2026-10-07)
  const n = (useUiLang.getState().lang === "th" ? name.replace(/^ครู/, "") : nm(name.replace(/^ครู/, ""))).trim()
  return /^[เแโใไ]/.test(n) ? n.slice(1, 2) : n.slice(0, 1)
}

const AVATAR = ["bg-rose-200 text-rose-900", "bg-sky-200 text-sky-900", "bg-emerald-200 text-emerald-900", "bg-amber-200 text-amber-900", "bg-violet-200 text-violet-900", "bg-teal-200 text-teal-900"]
export function avatarTone(key: string) {
  let h = 0
  for (const ch of key) h = (h * 17 + ch.charCodeAt(0)) >>> 0
  return AVATAR[h % AVATAR.length]
}
