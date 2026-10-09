// Role permissions — enforced for menus AND actions (G1–G6).

import type { ID, Result, Role, Staff, StaffAssignment, Weekday } from "../types"

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
  /** branch holidays: create own + choose which company holidays the branch closes on (Admin/Manager and up) */
  | "holiday.manage"
  /** Reports (owner 2026-10-01): Director / Area Manager / Manager — not Admin, not teachers */
  | "reports.view"

const ALL: Permission[] = [
  "calendar.view", "class.manage", "session.manage", "attendance.mark", "attendance.leave_override", "summary.write", "summary.approve",
  "student.view", "student.manage", "student.export", "family.manage", "staff.view", "staff.manage",
  "course.manage", "billing.view", "billing.manage", "billing.approve", "settings.manage", "dashboard.view", "lead.manage", "inbox.manage", "holiday.manage", "reports.view",
]

const MANAGER: Permission[] = ALL.filter((p) => p !== "settings.manage")

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  director: ALL,
  // same powers as a Manager, but across every branch they are assigned to (see crossBranch)
  area_manager: MANAGER,
  manager: MANAGER,
  // Admin sees the day-to-day CRM pipeline but not the executive Dashboard (matches Reports gate)
  // owner 2026-10-09 (G3): Admin and up may export students
  admin: ["calendar.view", "class.manage", "session.manage", "attendance.mark", "attendance.leave_override", "summary.approve", "student.view", "student.manage", "student.export", "family.manage", "staff.view", "course.manage", "billing.view", "billing.manage", "billing.approve", "lead.manage", "inbox.manage", "holiday.manage"],
  // G2/G3: no billing at all (owner 2026-09-26: teachers never create invoices), no export
  teacher: ["calendar.view", "attendance.mark", "summary.write", "student.view", "staff.view"],
}

// ---------- roles per branch (owner 2026-10-09) ----------

/** company-wide roles — never tied to one branch */
export const GLOBAL_ROLES: Role[] = ["super_admin", "director", "area_manager"]
/** roles given per branch */
export const BRANCH_ROLES: Role[] = ["manager", "admin", "teacher"]

/** This person's assignment at a branch (older records without assignments: one built from roles / subjects). */
export function assignmentAt(s: Staff, branchId: ID): StaffAssignment | null {
  if (!s.assignments?.length) return s.branchIds.includes(branchId) ? { branchId, roles: s.roles.filter((r) => BRANCH_ROLES.includes(r)), subjects: s.subjects, weekdays: [] } : null
  return s.assignments.find((a) => a.branchId === branchId) ?? null
}

/** Roles in force while working at this branch: company-wide roles + that branch's roles. */
export function rolesAt(s: Staff, branchId: ID): Role[] {
  if (!s.assignments?.length) return s.roles
  return [...new Set([...s.roles.filter((r) => GLOBAL_ROLES.includes(r)), ...(assignmentAt(s, branchId)?.roles ?? [])])]
}

/** Subjects this person teaches at this branch */
export function subjectsAt(s: Staff, branchId: ID): string[] {
  return s.assignments?.length ? assignmentAt(s, branchId)?.subjects ?? [] : s.subjects
}

/** Works at this branch on this weekday? (no days set = any day) */
export function worksOn(s: Staff, branchId: ID, weekday: Weekday): boolean {
  const a = assignmentAt(s, branchId)
  return !!a && (!a.weekdays.length || a.weekdays.includes(weekday))
}

/** The person as seen at a branch — roles / subjects of that branch. Same object back when nothing changes. */
export function staffAt(s: Staff, branchId: ID): Staff {
  if (!s.assignments?.length) return s
  return { ...s, roles: rolesAt(s, branchId), subjects: subjectsAt(s, branchId) }
}

/** Keep the flat fields (roles / branchIds / subjects) as the union of the assignments — older code reads them. */
export function withAssignments(s: Staff, assignments: StaffAssignment[]): Staff {
  if (!assignments.length) return { ...s, assignments: undefined }
  return {
    ...s, assignments,
    roles: [...new Set([...s.roles.filter((r) => GLOBAL_ROLES.includes(r)), ...assignments.flatMap((a) => a.roles)])],
    branchIds: [...new Set(assignments.map((a) => a.branchId))],
    subjects: [...new Set(assignments.flatMap((a) => a.subjects))],
  }
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

/** Class blocks of a branch (owner 2026-10-01): its Admin / Manager (and anyone above who can reach the branch). */
export function canEditBlocks(user: Staff | undefined, branchId: string) {
  return !!user && inBranch(user, branchId) && user.roles.some((r) => r === "admin" || r === "manager" || r === "area_manager" || r === "director" || r === "super_admin")
}

/** Reports scope (owner 2026-10-01): Director sees every branch and can compare them; an Area Manager the branches of
 *  their area (their branchIds); a Manager only their own branch, without the branch comparison. */
export function reportBranchIds(user: Staff | undefined, all: { id: string }[]) {
  if (!user) return []
  if (user.roles.some((r) => r === "super_admin" || r === "director")) return all.map((b) => b.id)
  return all.filter((b) => user.branchIds.includes(b.id)).map((b) => b.id)
}
export const canCompareBranches = (user: Staff | undefined) => !!user?.roles.some((r) => r === "super_admin" || r === "director" || r === "area_manager")
