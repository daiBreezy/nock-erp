// Sidebar badges (owner 2026-09-29): each menu shows how many things wait for *this* person in *this* branch,
// so nobody has to open every page to find out what needs doing. One function, same numbers everywhere.

import type { Attendance, Conversation, ID, Invoice, Lead, LessonSummary, Session, Staff } from "../types"
import * as Bill from "./billing"
import * as Sum from "./summaries"
import { workState } from "./scheduling"

export interface BadgeData {
  conversations: Conversation[]
  leads: Lead[]
  sessions: Session[]
  attendance: Attendance[]
  summaries: LessonSummary[]
  invoices: Invoice[]
}

/** href → count (0 = no badge) */
export function navBadges(d: BadgeData, me: Staff, branchId: ID, now: Date): Record<string, number> {
  const mine = (s: Session) => s.teacherId === me.id || s.coTeacherIds.includes(me.id)
  const office = me.roles.some((r) => r !== "teacher")
  const branchSessions = d.sessions.filter((s) => s.branchId === branchId && (office || mine(s)))
  const sessionIds = new Set(d.sessions.filter((s) => s.branchId === branchId).map((s) => s.id))
  const invoices = d.invoices.filter((i) => i.branchId === branchId)
  return {
    // chats with a parent message nobody opened yet
    "/inbox": d.conversations.filter((c) => c.branchId === branchId && c.unread).length,
    // leads nobody has contacted yet
    "/crm": d.leads.filter((l) => l.branchId === branchId && l.stage === "new").length,
    // classes already over that still need attendance or summaries
    "/sessions": branchSessions.filter((s) => {
      const w = workState(s, now, d.attendance, d.summaries).state
      return w === "needs_attendance" || w === "needs_summary"
    }).length,
    // summaries waiting for my approval + mine sent back for changes
    "/summaries": d.summaries.filter((x) => sessionIds.has(x.sessionId) && ((x.status === "submitted" && Sum.canApprove(x, me).ok) || (x.status === "changes_requested" && x.authorId === me.id))).length,
    // invoices I can approve, payments I can confirm, invoices LINE could not deliver
    "/billing": invoices.filter((i) =>
      Bill.canApprove(i, me).ok || i.payments.some((p) => !p.confirmedBy && Bill.canConfirmPayment(p, me, i.branchId).ok) || i.delivery === "failed",
    ).length,
  }
}
