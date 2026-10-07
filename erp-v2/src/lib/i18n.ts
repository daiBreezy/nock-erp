"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

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
  persist((set) => ({ lang: "th", setLang: (lang) => set({ lang }) }), { name: "nockerp-ui-lang" }),
)

type Entry = { en: string; ja: string }

// shell: menu groups, menu items, top bar, sidebar cards
const DICT: Record<string, Entry> = {
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

/** translate a Thai UI phrase into the chosen language (unknown phrases stay Thai) */
export function translate(th: string, lang: UiLang) {
  return lang === "th" ? th : DICT[th]?.[lang] ?? th
}

export function useT() {
  const lang = useUiLang((s) => s.lang)
  return (th: string) => translate(th, lang)
}
