// Internal notifications — one central place that decides WHO sees a notification and whether
// it is still unread for them. Every store action builds notifications through `notify()`, and
// every screen (bell, notifications page) filters through `visibleTo()` — never inline.

import type { AppNotification, ID, NotificationKind, Role, Staff } from "../types"
import { inBranch } from "./permissions"

export const ALL_ROLES: Role[] = ["super_admin", "director", "area_manager", "manager", "admin", "teacher"]

export interface Audience {
  /** roles that see it (within branchId when set) */
  roles?: Role[]
  /** limit to one branch — Area Manager and above still see it (inBranch) */
  branchId?: ID
  /** specific people, regardless of role or branch */
  staffIds?: ID[]
}

export function notify(input: { kind: NotificationKind; title: string; body: string; audience: Audience; fromId?: ID; at: Date; id: ID }): AppNotification {
  return {
    id: input.id,
    at: input.at.toISOString(),
    kind: input.kind,
    title: input.title,
    body: input.body,
    readBy: input.fromId ? [input.fromId] : [],
    fromId: input.fromId,
    roles: input.audience.roles ?? [],
    branchId: input.audience.branchId,
    staffIds: input.audience.staffIds,
  }
}

export function visibleTo(n: AppNotification, me: Staff): boolean {
  if (n.staffIds?.includes(me.id)) return true
  return n.roles.some((r) => me.roles.includes(r)) && (!n.branchId || inBranch(me, n.branchId))
}

export const isUnread = (n: AppNotification, me: Staff) => !n.readBy.includes(me.id)

/** Force Approve: everyone at the branch + every Director (in any branch), always. */
export function forceAudience(branchId: ID, staff: Staff[]): Audience {
  return { roles: ALL_ROLES, branchId, staffIds: staff.filter((s) => s.active && s.roles.includes("director")).map((s) => s.id) }
}

/** Team message recipients chosen in the compose box. */
export type MessageTarget = { kind: "branch" } | { kind: "role"; role: Role } | { kind: "people"; staffIds: ID[] }

export function messageAudience(target: MessageTarget, branchId: ID): Audience {
  if (target.kind === "branch") return { roles: ALL_ROLES, branchId }
  if (target.kind === "role") return { roles: [target.role], branchId }
  return { staffIds: target.staffIds }
}

export function validateMessage(target: MessageTarget, body: string): string | null {
  if (!body.trim()) return "พิมพ์ข้อความก่อนส่ง"
  if (target.kind === "people" && !target.staffIds.length) return "เลือกผู้รับอย่างน้อย 1 คน"
  return null
}

/** Remark rule shared by every Force action. */
export function requireForceRemark(remark: string): string | null {
  return remark.trim() ? null : "Force Approve ต้องใส่เหตุผลทุกครั้ง"
}
