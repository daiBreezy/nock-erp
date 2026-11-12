import { redirect } from "next/navigation"

// owner 2026-11-12: the chat-card preview moved into ฟอร์มผู้ปกครอง (a tab) — keep the old link working
export default function InboxCardsRedirect() {
  redirect("/forms")
}
