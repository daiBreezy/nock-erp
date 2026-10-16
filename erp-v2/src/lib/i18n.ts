"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { setDateLocale } from "@/domain/dates"
import { romanizeName, SUBJECTS } from "@/domain/rules/romanize"
import { useStore } from "@/store/store"

/**
 * Staff UI language (owner 2026-10-07): a chip in the top bar — ไทย / English / 日本語. A per-person preference,
 * so it lives in this browser (not the shared ERP data). Parent-facing forms keep their own language setting.
 *
 * Prototype approach: the Thai text IS the key — `t("ปฏิทิน")` looks the phrase up and falls back to Thai, so pages
 * can be translated one at a time without renaming anything. Dev: move to proper message ids in the real system.
 */
export type UiLang = "th" | "en" | "ja"

export const UI_LANGS: { key: UiLang; label: string; short: string }[] = [
  { key: "en", label: "English", short: "EN" },
  { key: "th", label: "ไทย", short: "TH" },
  { key: "ja", label: "日本語", short: "JP" },
]

export const useUiLang = create<{ lang: UiLang; setLang: (l: UiLang) => void }>()(
  persist((set) => ({ lang: "th", setLang: (lang) => { setDateLocale(lang); set({ lang }) } }), {
    name: "nockerp-ui-lang",
    onRehydrateStorage: () => (st) => { if (st) setDateLocale(st.lang) },
  }),
)

import { DICTIONARY as DICT } from "./i18n-dict"

export type { Entry } from "./i18n-dict"

/** every phrase we have — the screen translator reads it too (kept in i18n-dict so tests can load it without the store) */
export const DICTIONARY = DICT

/** fill {0} {1} … with the values (same placeholders in every language) */
const fill = (text: string, vars?: (string | number)[]) => (vars ? text.replace(/\{(\d+)\}/g, (m, i) => (vars[Number(i)] ?? m).toString()) : text)

/** translate a Thai UI phrase into the chosen language (unknown phrases stay Thai) */
export function translate(th: string, lang: UiLang, vars?: (string | number)[]) {
  return fill(lang === "th" ? th : DICT[th]?.[lang] ?? th, vars)
}

/**
 * Plain function, usable anywhere in UI code. The shell re-mounts the page when the language changes
 * (keyed on it), so every tx() call re-runs — no hook needed.
 */
export function tx(th: string, vars?: (string | number)[]) {
  return translate(th, useUiLang.getState().lang, vars)
}

/** the chosen language right now (for helpers that take a lang, e.g. loss reasons, parent-form labels) */
export const uiLang = () => useUiLang.getState().lang

export function useT() {
  const lang = useUiLang((s) => s.lang)
  return (th: string, vars?: (string | number)[]) => translate(th, lang, vars)
}

/** "12 ชม." / "12 hrs" / "12時間" — package durations in the chosen language */
export const durationText = (unit: "hour" | "week" | "month", d: number) => tx(unit === "hour" ? "{0} ชม." : unit === "week" ? "{0} สัปดาห์" : "{0} เดือน", [d])

/**
 * Names in the chosen language (owner 2026-10-07): Thai as typed; English / Japanese = Latin letters — a branch's
 * English name from Settings first, else the standard place spelling, else the rule-based romanization.
 */
export function nm(name: string | null | undefined): string {
  const lang = useUiLang.getState().lang
  if (!name || lang === "th") return name ?? ""
  // Liclass names are typed in Japanese — the Japanese screen shows them as typed (owner 2026-10-09)
  if (lang === "ja" && JAPANESE.test(name)) return name
  const own = englishNames().get(name)
  if (own) return own
  const b = useStore.getState().branches.find((x) => x.name === name)
  return b?.nameEn?.trim() || romanizeName(name)
}

const JAPANESE = /[\u3040-\u30ff\u4e00-\u9fff]/

/** typed name → its English name (students, staff, families, parents) — rebuilt only when that data changes */
let namesCache: { key: unknown[]; map: Map<string, string> } | null = null
function englishNames(): Map<string, string> {
  const { students, staff, families } = useStore.getState()
  if (namesCache && namesCache.key[0] === students && namesCache.key[1] === staff && namesCache.key[2] === families) return namesCache.map
  const map = new Map<string, string>()
  const put = (native: string | undefined, en: string | undefined) => { if (native && en?.trim() && !map.has(native)) map.set(native, en.trim()) }
  for (const x of [...students, ...staff]) { put(x.name, x.nameEn); put(x.nickname, x.nicknameEn) }
  for (const f of families) { put(f.name, f.nameEn); f.parents.forEach((p) => put(p.name, p.nameEn)) }
  namesCache = { key: [students, staff, families], map }
  return map
}

/** a branch with its province code, e.g. "ทองหล่อ · BKK" → "Thonglor · BKK" */
/** owner 2026-10-12: the one way a branch is named in the shell — business first, then the branch: "LIS · ทองหล่อ" */
export const branchShort = (b: { name: string; brand?: "nockacademy" | "liclass" }) => [b.brand ? (b.brand === "liclass" ? "LIS" : "NAS") : null, nm(b.name)].filter(Boolean).join(" · ")
export const branchText = (b: { name: string; province?: string; brand?: "nockacademy" | "liclass" }) => [nm(b.name), b.brand ? (b.brand === "liclass" ? "LIS" : "NAS") : null, b.province].filter(Boolean).join(" · ")

/** subject names: Settings › System (English / 日本語 columns) first, else the standard names; `short` = Eng / Sci / Jpn */
export function sj(subject: string | null | undefined, short = false): string {
  const lang = useUiLang.getState().lang
  if (!subject || lang === "th") return subject ?? ""
  const own = useStore.getState().system.subjectNames?.[subject]?.[lang]
  if (own && !short) return own
  const std = SUBJECTS[subject]
  if (std) return lang === "ja" ? std.ja : short ? std.short : std.en
  return own || romanizeName(subject)
}
