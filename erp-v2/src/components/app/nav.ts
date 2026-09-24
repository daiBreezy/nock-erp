import {
  BellIcon, BookOpenIcon, CalendarDaysIcon, ClipboardCheckIcon, ClockIcon, HomeIcon, NotebookPenIcon, ReceiptIcon,
  SettingsIcon, SquareLibraryIcon, UserCogIcon, UsersIcon, GraduationCapIcon, type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/domain/rules/permissions"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** visible when the user has any of these */
  perm: Permission | Permission[]
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "งานประจำวัน",
    items: [
      { href: "/", label: "วันนี้", icon: HomeIcon, perm: "calendar.view" },
      { href: "/calendar", label: "ปฏิทิน", icon: CalendarDaysIcon, perm: "calendar.view" },
      { href: "/sessions", label: "คาบเรียน & เช็คชื่อ", icon: ClockIcon, perm: ["attendance.mark"] },
      { href: "/summaries", label: "สรุปการเรียน", icon: NotebookPenIcon, perm: ["summary.write", "summary.approve"] },
    ],
  },
  {
    group: "การเรียน",
    items: [
      { href: "/classes", label: "คลาส", icon: SquareLibraryIcon, perm: "class.manage" },
      { href: "/attendance", label: "รายงานเข้าเรียน", icon: ClipboardCheckIcon, perm: "session.manage" },
      { href: "/courses", label: "คอร์ส & ราคา", icon: BookOpenIcon, perm: "course.manage" },
    ],
  },
  {
    group: "คน",
    items: [
      { href: "/students", label: "นักเรียน", icon: GraduationCapIcon, perm: "student.view" },
      { href: "/families", label: "ครอบครัว", icon: UsersIcon, perm: "family.manage" },
      { href: "/staff", label: "บุคลากร", icon: UserCogIcon, perm: "staff.view" },
    ],
  },
  {
    group: "การเงิน",
    items: [{ href: "/billing", label: "ใบแจ้งหนี้ & รับเงิน", icon: ReceiptIcon, perm: "billing.view" }],
  },
  {
    group: "ระบบ",
    items: [
      { href: "/notifications", label: "แจ้งเตือน", icon: BellIcon, perm: "calendar.view" },
      { href: "/settings", label: "ตั้งค่าสาขา", icon: SettingsIcon, perm: "settings.manage" },
    ],
  },
]

export const ALL_NAV = NAV.flatMap((g) => g.items)

export function navFor(pathname: string) {
  return [...ALL_NAV].sort((a, b) => b.href.length - a.href.length).find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))
}
