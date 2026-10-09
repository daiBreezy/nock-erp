import { redirect } from "next/navigation"

// The parent app runs at the LIFF endpoint (/liff/form?app=parent) — LIFF only starts under its registered URL.
export default function ParentPage() {
  redirect("/liff/form?app=parent")
}
