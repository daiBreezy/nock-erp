// One colour per subject so a day can be scanned at a glance.
// Class strings are written out in full so Tailwind can see them.

export interface SubjectColor {
  soft: string // card background + border
  bar: string // left accent / dot
  text: string // title colour on soft background
  strong: string // live card (filled)
  chip: string
}

const PALETTE: SubjectColor[] = [
  { soft: "bg-rose-50 border-rose-200", bar: "bg-rose-500", text: "text-rose-900", strong: "bg-rose-700 border-rose-800 text-white", chip: "bg-rose-100 text-rose-800" },
  { soft: "bg-sky-50 border-sky-200", bar: "bg-sky-500", text: "text-sky-900", strong: "bg-sky-700 border-sky-800 text-white", chip: "bg-sky-100 text-sky-800" },
  { soft: "bg-emerald-50 border-emerald-200", bar: "bg-emerald-500", text: "text-emerald-900", strong: "bg-emerald-700 border-emerald-800 text-white", chip: "bg-emerald-100 text-emerald-800" },
  { soft: "bg-amber-50 border-amber-200", bar: "bg-amber-500", text: "text-amber-900", strong: "bg-amber-700 border-amber-800 text-white", chip: "bg-amber-100 text-amber-900" },
  { soft: "bg-violet-50 border-violet-200", bar: "bg-violet-500", text: "text-violet-900", strong: "bg-violet-700 border-violet-800 text-white", chip: "bg-violet-100 text-violet-800" },
  { soft: "bg-orange-50 border-orange-200", bar: "bg-orange-500", text: "text-orange-900", strong: "bg-orange-700 border-orange-800 text-white", chip: "bg-orange-100 text-orange-800" },
  { soft: "bg-indigo-50 border-indigo-200", bar: "bg-indigo-500", text: "text-indigo-900", strong: "bg-indigo-700 border-indigo-800 text-white", chip: "bg-indigo-100 text-indigo-800" },
]

const FIXED: Record<string, number> = { คณิต: 0, อังกฤษ: 1, วิทย์: 2, ไทย: 3, สังคม: 4 }

export function subjectColor(subject: string): SubjectColor {
  if (subject in FIXED) return PALETTE[FIXED[subject]]
  let h = 0
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[5 + (h % 2)]
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
  const n = name.replace(/^ครู/, "").trim()
  return /^[เแโใไ]/.test(n) ? n.slice(1, 2) : n.slice(0, 1)
}

const AVATAR = ["bg-rose-200 text-rose-900", "bg-sky-200 text-sky-900", "bg-emerald-200 text-emerald-900", "bg-amber-200 text-amber-900", "bg-violet-200 text-violet-900", "bg-teal-200 text-teal-900"]
export function avatarTone(key: string) {
  let h = 0
  for (const ch of key) h = (h * 17 + ch.charCodeAt(0)) >>> 0
  return AVATAR[h % AVATAR.length]
}
