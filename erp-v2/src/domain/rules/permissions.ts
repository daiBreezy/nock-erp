// Role permissions — enforced for menus AND actions (G1–G6).

import type { Result, Role, Staff } from "../types"

export type Permission =
  | "calendar.view"
  | "class.manage"
  | "session.manage"
  | "attendance.mark"
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

const ALL: Permission[] = [
  "calendar.view", "class.manage", "session.manage", "attendance.mark", "summary.write", "summary.approve",
  "student.view", "student.manage", "student.export", "family.manage", "staff.view", "staff.manage",
  "course.manage", "billing.view", "billing.manage", "billing.approve", "settings.manage",
]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  director: ALL,
  manager: ALL.filter((p) => p !== "settings.manage"),
  admin: ["calendar.view", "class.manage", "session.manage", "attendance.mark", "summary.approve", "student.view", "student.manage", "family.manage", "staff.view", "course.manage", "billing.view", "billing.manage", "billing.approve"],
  // G2/G3: no billing, no export
  teacher: ["calendar.view", "attendance.mark", "summary.write", "student.view", "staff.view"],
}

export function can(user: Staff | undefined, p: Permission): boolean {
  return !!user?.active && user.roles.some((r) => ROLE_PERMISSIONS[r].includes(p))
}

export function require(user: Staff | undefined, p: Permission): Result {
  return can(user, p) ? { ok: true, value: undefined } : { ok: false, error: "คุณไม่มีสิทธิ์ทำรายการนี้" }
}

export const ROLE_LABEL: Record<Role, string> = {
  director: "Director",
  manager: "Manager",
  admin: "Admin",
  teacher: "Teacher",
}

/** Teachers only see their own sessions by default (G4). */
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
