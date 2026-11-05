import type { Entry } from "./index"

// billing: void notice, promotions (family / bonus hours), refund by session, partial time (owner 2026-11-05)
export const BILLING_PROMO: Record<string, Entry> = {
  "ใบนี้ถูกยกเลิก — ระบบไม่ได้แจ้งผู้ปกครองให้อัตโนมัติ": { en: "This invoice is void — the parent was not told automatically", ja: "この請求書は取消済み — 保護者には自動通知されていません" },
  "แจ้งผู้ปกครองแล้ว": { en: "Parent notified", ja: "保護者に通知済み" },
  "แจ้งผู้ปกครองว่ายกเลิกใบนี้": { en: "Tell the parent this invoice was cancelled", ja: "保護者にこの請求書の取消を連絡" },
  "ส่งข้อความแจ้งผู้ปกครองแล้ว": { en: "Message sent to the parent", ja: "保護者にメッセージを送信しました" },
  "แถม": { en: "Bonus", ja: "追加" },
  "ชม.": { en: "h", ja: "時間" },
  "แถมชั่วโมงเรียน (ไม่ลดเงิน)": { en: "Bonus hours (no money off)", ja: "無料レッスン時間（値引きなし）" },
  "จำนวนชั่วโมงที่แถม": { en: "Free hours added", ja: "追加する無料時間" },
  "โปรโมชัน · {0} — แถมเวลาเรียนเพิ่ม {1} ชม. (ไม่เพิ่มราคา)": { en: "Promotion · {0} — {1} h of extra class time (price unchanged)", ja: "キャンペーン · {0} — {1}時間追加（価格据え置き）" },
  "คืนเงิน (Refund)": { en: "Refund", ja: "返金" },
  "คืนเงิน (Refund) · ใบลดหนี้ อ้างถึง": { en: "Refund · credit note for", ja: "返金・クレジットノート（対象）" },
}
