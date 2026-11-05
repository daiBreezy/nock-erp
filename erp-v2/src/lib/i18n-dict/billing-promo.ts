import type { Entry } from "./index"

// billing: void notice, promotions (family / bonus hours), refund by session, partial time (owner 2026-11-05)
export const BILLING_PROMO: Record<string, Entry> = {
  "ใบนี้ถูกยกเลิก — ระบบไม่ได้แจ้งผู้ปกครองให้อัตโนมัติ": { en: "This invoice is void — the parent was not told automatically", ja: "この請求書は取消済み — 保護者には自動通知されていません" },
  "แจ้งผู้ปกครองแล้ว": { en: "Parent notified", ja: "保護者に通知済み" },
  "แจ้งผู้ปกครองว่ายกเลิกใบนี้": { en: "Tell the parent this invoice was cancelled", ja: "保護者にこの請求書の取消を連絡" },
  "ส่งข้อความแจ้งผู้ปกครองแล้ว": { en: "Message sent to the parent", ja: "保護者にメッセージを送信しました" },
}
