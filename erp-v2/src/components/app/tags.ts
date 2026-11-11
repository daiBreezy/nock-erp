// owner 2026-10-21: a tag is one component with one colour wherever it shows up — a Trial is amber on the CRM board,
// in a lead's panel and in Reports' charts alike. Every tag family names its colour here (a Tailwind hue); chips take
// the hue's classes, charts take the hue's solid colour. Change a tag's colour here and it changes everywhere.

/** the hues tags use — chip classes (light + dark) and the solid colour for chart marks */
export const HUE = {
  gray: { chip: "bg-muted text-muted-foreground", hex: "#9ca3af" },
  slate: { chip: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200", hex: "#64748b" },
  sky: { chip: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200", hex: "#0ea5e9" },
  indigo: { chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200", hex: "#6366f1" },
  violet: { chip: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200", hex: "#8b5cf6" },
  pink: { chip: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200", hex: "#ec4899" },
  rose: { chip: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200", hex: "#f43f5e" },
  red: { chip: "bg-danger-soft text-danger-ink", hex: "#ef4444" },
  orange: { chip: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200", hex: "#f97316" },
  amber: { chip: "bg-warning-soft text-warning-ink", hex: "#f59e0b" },
  lime: { chip: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200", hex: "#84cc16" },
  emerald: { chip: "bg-success-soft text-success-ink", hex: "#10b981" },
  teal: { chip: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200", hex: "#14b8a6" },
} as const
export type Hue = keyof typeof HUE

/** every tag family and the hue of each of its tags */
export const TAG_HUE = {
  /** CRM stage groups (board columns / stage chips) */
  leadStage: { contact: "sky", test: "violet", trial: "amber", closing: "orange", enrolled: "emerald", archived: "gray" },
  /** staff roles */
  role: { super_admin: "slate", director: "pink", area_manager: "indigo", manager: "violet", admin: "teal", teacher: "sky", developer: "gray", driver: "slate" },
  /** a student's status (students list) */
  studentStatus: { active: "emerald", renewal: "amber", inactive: "gray", archived: "red" },
  /** a session by time */
  sessionState: { upcoming: "sky", live: "emerald", ended: "gray", closed: "gray", cancelled: "red" },
  /** a check-in */
  attendance: { present: "emerald", absent: "red", leave: "amber" },
  /** how a student / course moves (Reports) — the student-status hues: studying emerald, waiting to renew amber, on a
   *  long break gray, gone red; new = the students page's "new this month" sky */
  /** an NPS answer's group (0–6 / 7–8 / 9–10) */
  npsGroup: { promoter: "emerald", passive: "amber", detractor: "red" },
  /** whom a company holiday closes (owner 2026-11-09): NockAcademy only · Liclass only · both brands */
  holidayBrand: { na: "sky", li: "violet", both: "indigo" },
  /** a 1–5 satisfaction answer (parent survey) — unsatisfied red → very satisfied emerald */
  satisfaction: { l1: "red", l2: "orange", l3: "amber", l4: "lime", l5: "emerald" },
  /** a bus leg (owner 2026-11-11): none of the system colours red / yellow / green — pickup sky · drop-off violet · both slate; a guardian riding along teal */
  busLeg: { pickup: "sky", dropoff: "violet", both: "slate", adult: "teal" },
  studentFlow: { start: "emerald", new: "sky", returning: "violet", active: "emerald", paused: "gray", grace: "amber", future: "indigo", lost: "red" },
} as const satisfies Record<string, Record<string, Hue>>
export type TagFamily = keyof typeof TAG_HUE

const hueOf = <F extends TagFamily>(family: F, key: keyof (typeof TAG_HUE)[F] & string): Hue => (TAG_HUE[family] as Record<string, Hue>)[key] ?? "gray"
/** a tag's chip classes */
export const tagChip = <F extends TagFamily>(family: F, key: keyof (typeof TAG_HUE)[F] & string) => HUE[hueOf(family, key)].chip
/** a tag's solid colour — for chart marks that stand for that tag */
export const tagHex = <F extends TagFamily>(family: F, key: keyof (typeof TAG_HUE)[F] & string) => HUE[hueOf(family, key)].hex

// ── identity palettes (DS round 16) ─ colours that tell things apart (which van · which bundle · which weekday ·
// whose brand), not status. They live here, next to the tag families, so no page needs a `ds-exception` for them.

/** a solid dot / bar per hue — zone dots, legend swatches */
export const HUE_DOT: Record<Hue, string> = {
  gray: "bg-muted-foreground/60", slate: "bg-slate-500", sky: "bg-sky-500", indigo: "bg-indigo-500", violet: "bg-violet-500", pink: "bg-pink-500",
  rose: "bg-rose-500", red: "bg-danger", orange: "bg-orange-500", amber: "bg-warning", lime: "bg-lime-500", emerald: "bg-success", teal: "bg-teal-500",
}

/** "one colour each" cycle for things that have no meaning of their own (vans, sibling invoice bundles) */
const CYCLE: Hue[] = ["sky", "violet", "emerald", "amber", "rose", "teal"]
/** the n-th item's chip classes (wraps around) */
export const cycleChip = (n: number) => HUE[CYCLE[((n % CYCLE.length) + CYCLE.length) % CYCLE.length]].chip
/** a stable colour for an id — the same id is always the same chip */
export const idChip = (id: string) => cycleChip([...id].reduce((a, c) => a + c.charCodeAt(0), 0))

/** how a holiday shows on the calendar, by whom it closes (tags.ts `holidayBrand` hues; slate = one branch only) */
export const HOLIDAY_TONE = {
  na: { text: "text-sky-700", bg: "bg-sky-50", bar: "bg-sky-400", swatch: "bg-sky-200" },
  li: { text: "text-violet-700", bg: "bg-violet-50", bar: "bg-violet-400", swatch: "bg-violet-200" },
  both: { text: "text-indigo-700", bg: "bg-indigo-50", bar: "bg-indigo-400", swatch: "bg-indigo-200" },
  branch: { text: "text-slate-700", bg: "bg-slate-100", bar: "bg-slate-400", swatch: "bg-indigo-200" },
} as const

/** Thai weekday colours, Sunday first (อา. แดง · จ. เหลือง · อ. ชมพู · พ. เขียว · พฤ. ส้ม · ศ. ฟ้า · ส. ม่วง) — light normally,
 *  strong for today, lighter still once the day has passed (owner 2026-09-30) */
export const WEEKDAY_TONE: { soft: string; strong: string; faded: string }[] = [
  { soft: "bg-red-100 text-red-900", strong: "bg-red-600 text-white", faded: "bg-red-50 text-red-900/50" },
  { soft: "bg-yellow-100 text-yellow-900", strong: "bg-yellow-500 text-yellow-950", faded: "bg-yellow-50 text-yellow-900/50" },
  { soft: "bg-pink-100 text-pink-900", strong: "bg-pink-600 text-white", faded: "bg-pink-50 text-pink-900/50" },
  { soft: "bg-green-100 text-green-900", strong: "bg-green-600 text-white", faded: "bg-green-50 text-green-900/50" },
  { soft: "bg-orange-100 text-orange-900", strong: "bg-orange-500 text-white", faded: "bg-orange-50 text-orange-900/50" },
  { soft: "bg-sky-100 text-sky-900", strong: "bg-sky-600 text-white", faded: "bg-sky-50 text-sky-900/50" },
  { soft: "bg-purple-100 text-purple-900", strong: "bg-purple-600 text-white", faded: "bg-purple-50 text-purple-900/50" },
]
