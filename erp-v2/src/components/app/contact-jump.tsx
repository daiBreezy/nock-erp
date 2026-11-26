"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCapIcon, MessagesSquareIcon, UserSearchIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { can } from "@/domain/rules/permissions"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-26 — the round button at the foot of a person's panel is "go to where this person lives", never "go to where you already are":
 *  · on Inbox (or on another person page, e.g. a child's panel opened inside a family) → that person's own page: Lead → CRM · family → ครอบครัว · child → นักเรียน
 *  · on the person's own page, or any other page (Billing, Transport …) → the chat in Inbox (disabled while they have no LINE chat)
 * One component for the Lead / family / student panels — the chat icon is always the two-bubble MessagesSquareIcon.
 */
const HOME = {
  lead: { href: "/crm", icon: UserSearchIcon, perm: "lead.manage", label: "เปิดใน CRM", title: "เปิด Lead นี้ในหน้า CRM" },
  family: { href: "/families", icon: UsersIcon, perm: "family.manage", label: "เปิดในหน้าครอบครัว", title: "เปิดครอบครัวนี้ในหน้าครอบครัว" },
  student: { href: "/students", icon: GraduationCapIcon, perm: "student.view", label: "เปิดในหน้านักเรียน", title: "เปิดนักเรียนคนนี้ในหน้านักเรียน" },
} as const
const PERSON_PAGES = ["/crm", "/families", "/students"]

export function ContactJump({ kind, id, conversationId, className }: { kind: keyof typeof HOME; id: string; conversationId?: string | null; className?: string }) {
  const pathname = usePathname() ?? ""
  const me = useStore((s) => s.me())
  const home = HOME[kind]
  const Icon = home.icon
  const onHome = pathname.startsWith(home.href)
  const onInbox = pathname.startsWith("/inbox")
  const onOtherPersonPage = !onHome && PERSON_PAGES.some((p) => pathname.startsWith(p))
  const allowed = can(me, home.perm)
  if ((onInbox || onOtherPersonPage) && allowed) {
    return <Button size="icon" variant="outline" className={className ?? "rounded-full"} aria-label={tx(home.label)} title={tx(home.title)} nativeButton={false} render={<Link href={`${home.href}?open=${encodeURIComponent(id)}`} />}><Icon /></Button>
  }
  // already looking at the chat itself — nothing to jump to
  if (onInbox) return null
  return conversationId
    ? <Button size="icon" variant="outline" className={className ?? "rounded-full"} aria-label={tx("เปิดแชทใน Inbox")} title={tx("เปิดแชทใน Inbox")} nativeButton={false} render={<Link href={`/inbox?conversation=${conversationId}`} />}><MessagesSquareIcon /></Button>
    : <Button size="icon" variant="outline" className={className ?? "rounded-full"} disabled aria-label={tx("ยังไม่มีแชท")} title={tx("ยังไม่มีแชท LINE ใน Inbox")}><MessagesSquareIcon /></Button>
}
