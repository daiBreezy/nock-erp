// Role permissions — enforced for menus AND actions (G1–G6).

import type { Result, Role, Staff } from "../types"

export type Permission =
  | "calendar.view"
  | "class.manage"
  | "session.manage"
  | "attendance.mark"
  | "attendance.leave_override"
  | "summary.write"
  | "summary.approve"
  | "student.view"
  | "student.manage"
  | "student.export"
  | "family.manage"
  | "staff.view"
  | "staff.manage"
  | "course.manage"
  | "billing.view"
  | "billing.manage"
  | "billing.approve"
  | "settings.manage"
  | "dashboard.view"
  | "lead.manage"
  | "inbox.manage"

const ALL: Permission[] = [
  "calendar.view", "class.manage", "session.manage", "attendance.mark", "attendance.leave_override", "summary.write", "summary.approve",
  "student.view", "student.manage", "student.export", "family.manage", "staff.view", "staff.manage",
  "course.manage", "billing.view", "billing.manage", "billing.approve", "settings.manage", "dashboard.view", "lead.manage", "inbox.manage",
]

const MANAGER: Permission[] = ALL.filter((p) => p !== "settings.manage")

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  director: ALL,
  // same powers as a Manager, but across every branch they are assigned to (see crossBranch)
  area_manager: MANAGER,
  manager: MANAGER,
  // Admin sees the day-to-day CRM pipeline but not the executive Dashboard (matches Reports gate)
  admin: ["calendar.view", "class.manage", "session.manage", "attendance.mark", "attendance.leave_override", "summary.approve", "student.view", "student.manage", "family.manage", "staff.view", "course.manage", "billing.view", "billing.manage", "billing.approve", "lead.manage", "inbox.manage"],
  // G2/G3: no billing at all (owner 2026-09-26: teachers never create invoices), no export
  teacher: ["calendar.view", "attendance.mark", "summary.write", "student.view", "staff.view"],
}

export function can(user: Staff | undefined, p: Permission): boolean {
  return !!user?.active && user.roles.some((r) => ROLE_PERMISSIONS[r].includes(p))
}

export function require(user: Staff | undefined, p: Permission): Result {
  return can(user, p) ? { ok: true, value: undefined } : { ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" }
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  director: "Director",
  area_manager: "Area Manager",
  manager: "Manager",
  admin: "Admin",
  teacher: "Teacher",
}

/** Office roles that receive branch-wide operational notifications. */
export const OFFICE_ROLES: Role[] = ["super_admin", "director", "area_manager", "manager", "admin"]

/** Area Manager and above act on any branch; everyone else only on branches in their own branchIds. */
export function crossBranch(user: Staff | undefined) {
  return !!user?.roles.some((r) => r === "super_admin" || r === "director" || r === "area_manager")
}

export function inBranch(user: Staff | undefined, branchId: string) {
  return crossBranch(user) || !!user?.branchIds.includes(branchId)
}

/**
 * Personal work queues (Today, Notifications, Summaries) show only a teacher's own sessions.
 * Calendar and Sessions list show every session to everyone — teachers filter down to theirs
 * (owner 2026-09-26, reverses the earlier G4 assumption).
 */
export function seesAllSessions(user: Staff | undefined) {
  return can(user, "session.manage")
}

/** S6: never leave the system without an active director; nobody deletes themselves. */
export function canDeactivateStaff(target: Staff, actor: Staff, all: Staff[]): Result {
  if (target.id === actor.id) return { ok: false, error: "ปิดบัญชีตัวเองไม่ได้" }
  if (target.roles.includes("director") && all.filter((s) => s.active && s.roles.includes("director")).length <= 1)
    return { ok: false, error: "ต้องมี Director อย่างน้อย 1 คน" }
  return { ok: true, value: undefined }
}
