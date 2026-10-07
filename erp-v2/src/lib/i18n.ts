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

import { DICT_PAGES } from "./i18n-dict"

export type Entry = { en: string; ja: string }

// shell: menu groups, menu items, top bar, sidebar cards
const SHELL: Record<string, Entry> = {
  "หลัก": { en: "Main", ja: "メイン" },
  "คน": { en: "People", ja: "人" },
  "งานสอน": { en: "Teaching", ja: "授業" },
  "การเงิน & แอดมิน": { en: "Finance & Admin", ja: "経理・管理" },
  "ระบบ": { en: "System", ja: "システム" },
  "Dashboard": { en: "Dashboard", ja: "ダッシュボード" },
  "CRM (ลีด)": { en: "CRM (Leads)", ja: "CRM（リード）" },
  "Inbox": { en: "Inbox", ja: "受信箱" },
  "ฟอร์มผู้ปกครอง": { en: "Parent forms", ja: "保護者フォーム" },
  "ปฏิทิน": { en: "Calendar", ja: "カレンダー" },
  "นักเรียน": { en: "Students", ja: "生徒" },
  "ครอบครัว": { en: "Families", ja: "家族" },
  "บุคลากร": { en: "Staff", ja: "スタッフ" },
  "คอร์ส": { en: "Courses", ja: "コース" },
  "คลาส": { en: "Classes", ja: "クラス" },
  "คาบเรียน & เช็คชื่อ": { en: "Sessions & attendance", ja: "授業・出欠" },
  "รายงานเข้าเรียน": { en: "Attendance report", ja: "出席レポート" },
  "สรุปการเรียน": { en: "Lesson summaries", ja: "学習まとめ" },
  "ใบแจ้งหนี้ & รับเงิน": { en: "Invoices & payments", ja: "請求・入金" },
  "Tasks": { en: "Tasks", ja: "タスク" },
  "Reports": { en: "Reports", ja: "レポート" },
  "ตั้งค่า": { en: "Settings", ja: "設定" },
  "Logs & Timeline": { en: "Logs & Timeline", ja: "ログ・履歴" },
  "แจ้งเตือน": { en: "Notifications", ja: "通知" },
  "เร็วๆ นี้": { en: "Soon", ja: "近日" },
  "สาขา": { en: "Branch ", ja: "校舎 " },
  "ค้นหา": { en: "Search", ja: "検索" },
  "ค้นหานักเรียน / ครอบครัว / Lead": { en: "Search students / families / leads", ja: "生徒・家族・リードを検索" },
  "เรื่องยังไม่อ่าน": { en: "unread", ja: "件未読" },
  "ไม่มีเรื่องใหม่": { en: "Nothing new", ja: "新着なし" },
  "เลือกสาขา": { en: "Choose branch", ja: "校舎を選択" },
  "ปิด": { en: "Closed", ja: "閉鎖" },
  "ช่วง": { en: "Period", ja: "期間" },
  "ถึง": { en: "until", ja: "まで" },
  "ไม่มีสิทธิ์เข้าหน้านี้": { en: "You can't open this page", ja: "このページへのアクセス権がありません" },
  "บทบาทของคุณไม่ได้รับสิทธิ์ใช้งานส่วนนี้ ติดต่อผู้จัดการสาขาถ้าต้องการสิทธิ์เพิ่ม": { en: "Your role doesn't include this section. Ask your branch manager if you need access.", ja: "この機能を使う権限がありません。必要な場合は校舎マネージャーに連絡してください。" },
  "ภาษา": { en: "Language", ja: "言語" },
}

const DICT: Record<string, Entry> = { ...DICT_PAGES, ...SHELL }

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
  if (!name || useUiLang.getState().lang === "th") return name ?? ""
  const b = useStore.getState().branches.find((x) => x.name === name)
  return b?.nameEn?.trim() || romanizeName(name)
}

/** a branch with its province code, e.g. "ทองหล่อ · BKK" → "Thonglor · BKK" */
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
