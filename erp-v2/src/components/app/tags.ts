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
  red: { chip: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", hex: "#ef4444" },
  orange: { chip: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200", hex: "#f97316" },
  amber: { chip: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200", hex: "#f59e0b" },
  lime: { chip: "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200", hex: "#84cc16" },
  emerald: { chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200", hex: "#10b981" },
  teal: { chip: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200", hex: "#14b8a6" },
} as const
export type Hue = keyof typeof HUE

/** every tag family and the hue of each of its tags */
export const TAG_HUE = {
  /** CRM stage groups (board columns / stage chips) */
  leadStage: { contact: "sky", test: "violet", trial: "amber", closing: "orange", enrolled: "emerald", archived: "gray" },
  /** staff roles */
  role: { super_admin: "slate", director: "rose", area_manager: "orange", manager: "violet", admin: "amber", teacher: "sky", developer: "teal", driver: "lime" },
  /** a student's status (students list) */
  studentStatus: { active: "emerald", renewal: "amber", inactive: "gray", archived: "red" },
  /** a session by time */
  sessionState: { upcoming: "sky", live: "emerald", ended: "gray", closed: "gray", cancelled: "red" },
  /** a check-in */
  attendance: { present: "emerald", absent: "red", leave: "sky" },
  /** how a student / course moves (Reports) — the student-status hues: studying emerald, waiting to renew amber, on a
   *  long break gray, gone red; new = the students page's "new this month" sky */
  /** an NPS answer's group (0–6 / 7–8 / 9–10) */
  npsGroup: { promoter: "emerald", passive: "amber", detractor: "red" },
  studentFlow: { start: "emerald", new: "sky", returning: "violet", active: "emerald", paused: "gray", grace: "amber", future: "indigo", lost: "red" },
} as const satisfies Record<string, Record<string, Hue>>
export type TagFamily = keyof typeof TAG_HUE

const hueOf = <F extends TagFamily>(family: F, key: keyof (typeof TAG_HUE)[F] & string): Hue => (TAG_HUE[family] as Record<string, Hue>)[key] ?? "gray"
/** a tag's chip classes */
export const tagChip = <F extends TagFamily>(family: F, key: keyof (typeof TAG_HUE)[F] & string) => HUE[hueOf(family, key)].chip
/** a tag's solid colour — for chart marks that stand for that tag */
export const tagHex = <F extends TagFamily>(family: F, key: keyof (typeof TAG_HUE)[F] & string) => HUE[hueOf(family, key)].hex
