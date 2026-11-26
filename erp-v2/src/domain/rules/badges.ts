// Sidebar badges (owner 2026-09-29): each menu shows how many things wait for *this* person in *this* branch,
// so nobody has to open every page to find out what needs doing. One function, same numbers everywhere.

import type { Attendance, Conversation, ID, Invoice, Lead, LessonSummary, Session, Staff } from "../types"
import * as Bill from "./billing"
import * as Sum from "./summaries"

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
  const sessionIds = new Set(d.sessions.filter((s) => s.branchId === branchId).map((s) => s.id))
  const invoices = d.invoices.filter((i) => i.branchId === branchId)
  return {
    // chats with a parent message nobody opened yet
    "/inbox": d.conversations.filter((c) => c.branchId === branchId && c.unread).length,
    // leads nobody has contacted yet
    "/crm": d.leads.filter((l) => l.branchId === branchId && l.stage === "new").length,
    // owner 2026-11-26: attendance defaults to present and summaries are optional — a session has no pending work
    "/sessions": 0,
    // summaries waiting for my approval + mine sent back for changes
    // + approved but not sent with the 7-day send deadline 2 days away or already passed
    "/summaries": d.summaries.filter((x) => {
      if (!sessionIds.has(x.sessionId)) return false
      if (x.status === "submitted") return Sum.canApprove(x, me).ok
      if (x.status === "changes_requested") return x.authorId === me.id
      const se = d.sessions.find((y) => y.id === x.sessionId)
      return x.status === "approved" && office && !!se && Sum.sendDeadline(se, now).daysLeft <= 2
    }).length,
    // invoices I can approve, payments I can confirm, invoices LINE could not deliver
    "/billing": invoices.filter((i) =>
      Bill.canApprove(i, me).ok || i.payments.some((p) => !p.confirmedBy && Bill.canConfirmPayment(p, me, i.branchId).ok) || i.delivery === "failed",
    ).length,
  }
}
