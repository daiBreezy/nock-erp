import type { Attendance, CreditNote, FormSend, ID, Invoice, Lead, ParentRequest, Session, Student } from "../types"
import { fmtMoney } from "../dates"
import type { Tr } from "./reports"

/**
 * One activity feed for the whole system (owner 2026-11-27): the Dashboard shows it for the branch, a student / family panel shows the SAME
 * events narrowed to that person — one list, cut down where it is shown. Pure: pass the data in, get the events (newest first).
 */

export type ActivityKind = "payment" | "attendance" | "invoice" | "lead" | "request" | "credit_note" | "form"
export type ActivityTone = "green" | "blue" | "red" | "amber" | "gray"

export interface ActivityEvent {
  id: string
  at: string
  kind: ActivityKind
  tone: ActivityTone
  text: string
  branchId: ID
  studentId?: ID
  familyId?: ID | null
  href?: string
  /** attendance only: the session — a branch-wide feed folds one session's marks into a single line */
  sessionId?: ID
}

export interface ActivityInput {
  students: Pick<Student, "id" | "nickname" | "familyId" | "branchId">[]
  invoices: Pick<Invoice, "id" | "branchId" | "studentId" | "number" | "createdAt" | "payments">[]
  attendance: Pick<Attendance, "sessionId" | "studentId" | "status" | "markedAt">[]
  sessions: Pick<Session, "id" | "branchId" | "subject">[]
  leads: Pick<Lead, "id" | "branchId" | "name" | "createdAt">[]
  parentRequests: Pick<ParentRequest, "id" | "kind" | "branchId" | "studentId" | "studentNickname" | "familyId" | "createdAt">[]
  creditNotes: Pick<CreditNote, "id" | "branchId" | "studentId" | "number" | "status" | "createdAt">[]
  formSends: Pick<FormSend, "id" | "familyId" | "title" | "sentAt" | "studentIds">[]
  tr: Tr
}

export interface ActivityScope {
  branchIds?: ID[]
  studentId?: ID
  familyId?: ID
}

const REQUEST_LABEL: Record<ParentRequest["kind"], string> = { leave: "แจ้งลา", exit: "แจ้งหยุดเรียน", return: "ขอกลับมาเรียน", bus: "ขอปรับรถ", home: "ปักหมุดบ้าน" }

export function buildActivity(i: ActivityInput, scope: ActivityScope = {}, limit = 60): ActivityEvent[] {
  const { tr } = i
  const stu = new Map(i.students.map((s) => [s.id, s]))
  const ses = new Map(i.sessions.map((s) => [s.id, s]))
  const nick = (id: ID) => stu.get(id)?.nickname ?? "-"
  const out: ActivityEvent[] = []

  for (const inv of i.invoices) {
    const s = stu.get(inv.studentId)
    if (inv.createdAt) out.push({ id: `inv-${inv.id}`, at: inv.createdAt, kind: "invoice", tone: "gray", text: tr("สร้างใบแจ้งหนี้ · {0}", [nick(inv.studentId)]), branchId: inv.branchId, studentId: inv.studentId, familyId: s?.familyId, href: "/billing" })
    for (const p of inv.payments.filter((x) => x.confirmedBy)) {
      out.push({ id: `pay-${p.id}`, at: p.recordedAt, kind: "payment", tone: "green", text: tr("ชำระเงิน · {0} · {1}", [nick(inv.studentId), fmtMoney(p.amount)]), branchId: inv.branchId, studentId: inv.studentId, familyId: s?.familyId, href: "/billing" })
    }
  }
  for (const a of i.attendance) {
    if (a.status === "leave") continue
    const se = ses.get(a.sessionId); const s = stu.get(a.studentId)
    if (!se || !s) continue
    out.push({ id: `att-${a.sessionId}-${a.studentId}`, at: a.markedAt, kind: "attendance", tone: a.status === "present" ? "blue" : "red", text: `${a.status === "present" ? tr("เข้าเรียน") : tr("ขาดเรียน")} · ${s.nickname} · ${se.subject}`, branchId: se.branchId, studentId: s.id, familyId: s.familyId, sessionId: a.sessionId })
  }
  for (const l of i.leads) out.push({ id: `lead-${l.id}`, at: l.createdAt, kind: "lead", tone: "amber", text: tr("ลีดใหม่ · {0}", [l.name]), branchId: l.branchId, href: "/crm?view=table" })
  for (const r of i.parentRequests) {
    const s = stu.get(r.studentId)
    out.push({ id: `req-${r.id}`, at: r.createdAt, kind: "request", tone: "amber", text: `${tr(REQUEST_LABEL[r.kind])} · ${r.studentNickname}`, branchId: r.branchId ?? s?.branchId ?? "", studentId: r.studentId, familyId: r.familyId, href: "/inbox" })
  }
  for (const c of i.creditNotes) {
    const s = stu.get(c.studentId)
    out.push({ id: `cn-${c.id}`, at: c.createdAt, kind: "credit_note", tone: c.status === "void" ? "gray" : "amber", text: tr("ใบลดหนี้ · {0}", [nick(c.studentId)]), branchId: c.branchId, studentId: c.studentId, familyId: s?.familyId, href: "/billing" })
  }
  for (const f of i.formSends) {
    const kid = f.studentIds[0] ? stu.get(f.studentIds[0]) : i.students.find((s) => s.familyId === f.familyId)
    out.push({ id: `form-${f.id}`, at: f.sentAt, kind: "form", tone: "blue", text: tr("ส่งฟอร์ม · {0}", [f.title]), branchId: kid?.branchId ?? "", studentId: f.studentIds[0], familyId: f.familyId })
  }

  const inScope = out.filter((e) =>
    (!scope.branchIds || !e.branchId || scope.branchIds.includes(e.branchId))
    && (!scope.studentId || e.studentId === scope.studentId)
    && (!scope.familyId || e.familyId === scope.familyId))
  // a whole branch / role feed folds one class's marks into ONE line ("จบคาบ · คณิต · มา 4"); a student / family feed keeps each child's own line
  const folded = scope.studentId || scope.familyId ? inScope : foldAttendance(inScope, ses, tr)
  return folded.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

function foldAttendance(events: ActivityEvent[], ses: Map<ID, Pick<Session, "id" | "branchId" | "subject">>, tr: Tr): ActivityEvent[] {
  const rest = events.filter((e) => e.kind !== "attendance")
  const by = new Map<ID, ActivityEvent[]>()
  for (const e of events.filter((x) => x.kind === "attendance" && x.sessionId)) by.set(e.sessionId!, [...(by.get(e.sessionId!) ?? []), e])
  for (const [sid, list] of by) {
    const absent = list.filter((e) => e.tone === "red").length
    const present = list.length - absent
    const at = list.map((e) => e.at).sort().at(-1)!
    rest.push({ id: `att-${sid}`, at, kind: "attendance", tone: absent ? "red" : "blue", sessionId: sid, branchId: list[0].branchId,
      text: absent ? tr("จบคาบ · {0} · มา {1} · ขาด {2}", [ses.get(sid)?.subject ?? "", present, absent]) : tr("จบคาบ · {0} · มา {1}", [ses.get(sid)?.subject ?? "", present]) })
  }
  return rest
}
