import {
  BellIcon, BookOpenIcon, FileTextIcon, CalendarDaysIcon, ClipboardCheckIcon, ClockIcon, InboxIcon, LayoutDashboardIcon, NotebookPenIcon, ReceiptIcon,
  HistoryIcon, SettingsIcon, SquareLibraryIcon, ChartColumnIcon, ListTodoIcon, UserCogIcon, UserSearchIcon, UsersIcon, GraduationCapIcon, type LucideIcon,
} from "lucide-react"
import type { Permission } from "@/domain/rules/permissions"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** visible when the user has any of these */
  perm: Permission | Permission[]
  /** route is a Coming-soon placeholder — spec not agreed yet */
  soon?: boolean
}

/** Order + grouping follow Dev staging's sidebar (owner 2026-09-29). Extra pages staging doesn't have yet
 *  (Dashboard, Inbox/CRM live) sit where staging will put them. Notifications moved up next to search. */
export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "หลัก",
    items: [
      // owner 2026-10-06: the old executive-only "/dashboard" and the universal "/" "วันนี้" merged into one
      // page — everyone lands here, with dashboard.view gating the KPI/week/month content inside it
      { href: "/", label: "Dashboard", icon: LayoutDashboardIcon, perm: "calendar.view" },
      { href: "/crm", label: "CRM (ลีด)", icon: UserSearchIcon, perm: "lead.manage" },
      { href: "/inbox", label: "Inbox", icon: InboxIcon, perm: "inbox.manage" },
      { href: "/forms", label: "ฟอร์มผู้ปกครอง", icon: FileTextIcon, perm: "lead.manage" },
      { href: "/calendar", label: "ปฏิทิน", icon: CalendarDaysIcon, perm: "calendar.view" },
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
    group: "งานสอน",
    items: [
      { href: "/courses", label: "คอร์ส", icon: BookOpenIcon, perm: "course.manage" },
      { href: "/classes", label: "คลาส", icon: SquareLibraryIcon, perm: "class.manage" },
      { href: "/sessions", label: "คาบเรียน & เช็คชื่อ", icon: ClockIcon, perm: ["attendance.mark"] },
      { href: "/attendance", label: "รายงานเข้าเรียน", icon: ClipboardCheckIcon, perm: "session.manage" },
      { href: "/summaries", label: "สรุปการเรียน", icon: NotebookPenIcon, perm: ["summary.write", "summary.approve"] },
    ],
  },
  {
    group: "การเงิน & แอดมิน",
    items: [
      { href: "/billing", label: "ใบแจ้งหนี้ & รับเงิน", icon: ReceiptIcon, perm: "billing.view" },
      { href: "/tasks", label: "Tasks", icon: ListTodoIcon, perm: "calendar.view", soon: true },
      { href: "/reports", label: "Reports", icon: ChartColumnIcon, perm: "reports.view" },
    ],
  },
  {
    group: "ระบบ",
    items: [
      { href: "/settings", label: "ตั้งค่า", icon: SettingsIcon, perm: ["settings.manage", "holiday.manage"] },
      { href: "/logs", label: "Logs & Timeline", icon: HistoryIcon, perm: "dashboard.view", soon: true },
    ],
  },
]

/** not in the menu body (it lives at the top of the sidebar) but still a titled route */
export const NOTIFICATIONS_NAV: NavItem = { href: "/notifications", label: "แจ้งเตือน", icon: BellIcon, perm: "calendar.view" }

export const ALL_NAV = [...NAV.flatMap((g) => g.items), NOTIFICATIONS_NAV]

export function navFor(pathname: string) {
  return [...ALL_NAV].sort((a, b) => b.href.length - a.href.length).find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))
}
