"use client"

// Single app store. Every mutating action goes through a domain rule and returns a Result,
// so the UI can always show success or a human-readable error (no silent failures).

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { buildSeed, uid, type DB } from "@/data/seed"
import { toDateStr, weekdayOf } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import * as Bill from "@/domain/rules/billing"
import { can, require as requirePerm } from "@/domain/rules/permissions"
import * as Sch from "@/domain/rules/scheduling"
import * as Sum from "@/domain/rules/summaries"
import type { AttendanceStatus, ID, Invoice, Klass, LessonSummary, Result, Session, Staff } from "@/domain/types"

export interface UIState {
  userId: ID
  branchId: ID
  /** demo clock: ms added to the real time */
  clockOffset: number
}

type Store = DB & UIState & {
  now: () => Date
  me: () => Staff
  setUser: (id: ID) => void
  setBranch: (id: ID) => void
  setClockOffset: (ms: number) => void
  resetData: () => void

  createClass: (d: Sch.ClassDraft & { name: string; grades: string[] }) => Result<{ klass: Klass; sessions: number }>
  updateClass: (id: ID, patch: Partial<Pick<Klass, "teacherId" | "roomId" | "start" | "minutes" | "weekday" | "name">>) => Result<{ changed: number; kept: number }>
  deactivateClass: (id: ID, reason: string) => Result<{ cancelled: number }>
  addSession: (s: Omit<Session, "id" | "customized" | "cancelled">) => Result<Session>
  editSession: (id: ID, patch: Partial<Pick<Session, "date" | "start" | "minutes" | "teacherId" | "roomId">>) => Result
  cancelSession: (id: ID, reason: string) => Result<{ students: number }>

  mark: (sessionId: ID, studentId: ID, status: AttendanceStatus) => Result
  clearMark: (sessionId: ID, studentId: ID) => Result
  removeStudentFromClass: (classId: ID, studentId: ID) => Result<{ removedFrom: number }>

  saveSummary: (sessionId: ID, studentId: ID, text: string, submit: boolean) => Result
  requestSummaryChanges: (id: ID, note: string) => Result
  approveSummary: (id: ID) => Result
  sendSummary: (id: ID) => Result<{ delivered: boolean }>

  saveInvoice: (inv: Invoice) => Result<Invoice>
  generatePdf: (id: ID) => Result<{ number: string }>
  approveInvoice: (id: ID) => Result
  sendInvoice: (id: ID, note: string) => Result<{ delivered: boolean }>
  voidInvoice: (id: ID, reason: string) => Result
  recordPayment: (id: ID, p: { amount: number; method: "transfer" | "cash"; reference: string }) => Result
  confirmPayment: (invoiceId: ID, paymentId: ID) => Result<{ paid: boolean }>
}

const OK = { ok: true as const, value: undefined }
const fail = (error: string) => ({ ok: false as const, error })
const ctxOf = (s: DB, branchId: ID) => ({
  branch: s.branches.find((b) => b.id === branchId)!,
  courses: s.courses, packages: s.packages, classes: s.classes, holidays: s.holidays,
})

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      userId: "u_nock",
      branchId: "br_thl",
      clockOffset: 0,

      now: () => new Date(Date.now() + get().clockOffset),
      me: () => get().staff.find((s) => s.id === get().userId)!,
      setUser: (userId) => {
        const u = get().staff.find((s) => s.id === userId)!
        set({ userId, branchId: u.branchIds.includes(get().branchId) ? get().branchId : u.branchIds[0] })
      },
      setBranch: (branchId) => set({ branchId }),
      setClockOffset: (clockOffset) => set({ clockOffset }),
      resetData: () => set({ ...buildSeed(), clockOffset: 0 }),

      // ---------------- classes & sessions ----------------
      createClass: (d) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        const branch = s.branches.find((b) => b.id === d.branchId)!
        const issues = Sch.validateClass(d, { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, now: s.now() })
        if (!Sch.canSave(issues, d.overrideReason)) return fail(issues.find((i) => i.level !== "warn")?.message ?? "ตรวจสอบข้อมูลอีกครั้ง")
        const klass: Klass = {
          id: uid("cl"), branchId: d.branchId, name: d.name.trim() || `${d.subject} ${d.grades.join(", ")}`, subject: d.subject,
          grades: d.grades, kind: d.kind, type: d.type, teacherId: d.teacherId, roomId: d.roomId, weekday: d.weekday,
          start: d.start, minutes: d.minutes, startDate: d.startDate, active: true, studentIds: d.studentIds,
        }
        const sessions = Sch.generateSessions(klass, s.holidays, () => uid("se"))
        set({ classes: [...s.classes, klass], sessions: [...s.sessions, ...sessions] })
        return { ok: true, value: { klass, sessions: sessions.length } }
      },

      updateClass: (id, patch) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        const k = s.classes.find((c) => c.id === id)
        if (!k) return fail("ไม่พบคลาส")
        const { name, ...schedule } = patch
        const merged = { ...k, ...schedule }
        const branch = s.branches.find((b) => b.id === k.branchId)!
        const issues = Sch.validateClass({ ...merged, startDate: toDateStr(s.now()) }, { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, ignoreClassId: id })
          .filter((i) => i.level === "block")
        if (issues.length) return fail(issues[0].message)
        const r = Sch.applyClassEdit(k, schedule, s.sessions, s.now(), s.attendance)
        set({ classes: s.classes.map((c) => (c.id === id ? { ...r.klass, name: name ?? c.name } : c)), sessions: r.sessions })
        return { ok: true, value: { changed: r.changed, kept: r.kept } }
      },

      // A11: deactivating cancels future sessions and removes them from reschedule targets
      deactivateClass: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("กรอกเหตุผล")
        let cancelled = 0
        const now = s.now()
        const sessions = s.sessions.map((x) => {
          if (x.classId !== id || Sch.sessionState(x, now) !== "upcoming") return x
          cancelled++
          return { ...x, cancelled: true, cancelReason: reason }
        })
        set({ classes: s.classes.map((c) => (c.id === id ? { ...c, active: false } : c)), sessions })
        return { ok: true, value: { cancelled } }
      },

      addSession: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const branch = s.branches.find((b) => b.id === input.branchId)!
        const issues = Sch.validateClass(
          { ...input, kind: "other", type: "group", weekday: weekdayOf(input.date), startDate: input.date, overrideReason: "session" },
          { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays },
        ).filter((i) => i.level === "block")
        if (issues.length) return fail(issues[0].message)
        const session: Session = { ...input, id: uid("se"), customized: true, cancelled: false }
        set({ sessions: [...s.sessions, session] })
        return { ok: true, value: session }
      },

      editSession: (id, patch) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const cur = s.sessions.find((x) => x.id === id)
        if (!cur) return fail("ไม่พบคาบเรียน")
        if (Sch.sessionState(cur, s.now()) !== "upcoming") return fail("แก้ได้เฉพาะคาบที่ยังไม่เริ่ม")
        const next = Sch.editSingleSession(cur, patch)
        const branch = s.branches.find((b) => b.id === cur.branchId)!
        const clash = Sch.findConflicts([...s.sessions.filter((x) => x.id !== id), next], branch, s.staff).find((c) => c.sessionIds.includes(id))
        if (clash) return fail(clash.message)
        set({ sessions: s.sessions.map((x) => (x.id === id ? next : x)) })
        return OK
      },

      cancelSession: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("กรอกเหตุผลการยกเลิก")
        const cur = s.sessions.find((x) => x.id === id)!
        if (Sch.sessionState(cur, s.now()) !== "upcoming") return fail("ยกเลิกได้เฉพาะคาบที่ยังไม่เริ่ม")
        set({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, cancelled: true, cancelReason: reason } : x)),
          notifications: [
            { id: uid("no"), at: s.now().toISOString(), kind: "session_cancelled", title: "ยกเลิกคาบเรียน", body: `${cur.subject} ${cur.date} ${cur.start} · นักเรียน ${cur.studentIds.length} คน · ${reason}`, read: false, roles: ["director", "manager", "admin"] },
            ...s.notifications,
          ],
        })
        return { ok: true, value: { students: cur.studentIds.length } }
      },

      // ---------------- attendance ----------------
      mark: (sessionId, studentId, status) => {
        const s = get()
        const me = s.me()
        if (!can(me, "attendance.mark")) return fail("คุณไม่มีสิทธิ์เช็คชื่อ")
        const se = s.sessions.find((x) => x.id === sessionId)!
        if (!can(me, "session.manage") && se.teacherId !== me.id) return fail("เช็คชื่อได้เฉพาะคาบที่คุณสอน")
        const r = Att.canMark(se, status, s.now())
        if (!r.ok) return r
        const rest = s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId))
        // C3: summaries only exist for present students; keep text as draft instead of deleting silently
        set({ attendance: [...rest, { sessionId, studentId, status, markedBy: me.id, markedAt: s.now().toISOString() }] })
        return OK
      },

      clearMark: (sessionId, studentId) => {
        const s = get()
        const se = s.sessions.find((x) => x.id === sessionId)!
        const r = Att.canClear(se, s.now())
        if (!r.ok) return r
        set({ attendance: s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId)) })
        return OK
      },

      removeStudentFromClass: (classId, studentId) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        const k = s.classes.find((c) => c.id === classId)!
        const r = Att.removeFromClass(k, studentId, s.sessions, s.now())
        set({ classes: s.classes.map((c) => (c.id === classId ? r.klass : c)), sessions: r.sessions })
        return { ok: true, value: { removedFrom: r.removedFrom } }
      },

      // ---------------- summaries ----------------
      saveSummary: (sessionId, studentId, text, submit) => {
        const s = get()
        const me = s.me()
        if (!text.trim() && submit) return fail("เขียนสรุปก่อนส่ง")
        const existing = s.summaries.find((x) => x.sessionId === sessionId && x.studentId === studentId)
        if (existing) {
          const r = Sum.canEdit(existing, me)
          if (!r.ok) return r
        } else if (!can(me, "summary.write") && !can(me, "summary.approve")) return fail("คุณไม่มีสิทธิ์เขียนสรุป")
        const at = s.now().toISOString()
        const next: LessonSummary = existing
          ? { ...existing, text, lastEditorId: me.id, status: submit ? "submitted" : existing.status === "changes_requested" ? "changes_requested" : "draft", history: [...existing.history, { at, by: me.id, action: submit ? "submit" : "edit" }] }
          : { id: uid("sm"), sessionId, studentId, text, status: submit ? "submitted" : "draft", authorId: me.id, lastEditorId: me.id, history: [{ at, by: me.id, action: submit ? "submit" : "write" }] }
        set({ summaries: existing ? s.summaries.map((x) => (x.id === existing.id ? next : x)) : [...s.summaries, next] })
        return OK
      },

      requestSummaryChanges: (id, note) => {
        const s = get()
        const me = s.me()
        if (!can(me, "summary.approve")) return fail("คุณไม่มีสิทธิ์")
        if (!note.trim()) return fail("บอกครูว่าต้องแก้อะไร")
        const cur = s.summaries.find((x) => x.id === id)!
        if (cur.status === "sent") return fail("ส่งถึงผู้ปกครองแล้ว ขอแก้ไม่ได้")
        set({ summaries: s.summaries.map((x) => (x.id === id ? { ...x, status: "changes_requested", history: [...x.history, { at: s.now().toISOString(), by: me.id, action: "request_changes", note }] } : x)) })
        return OK
      },

      approveSummary: (id) => {
        const s = get()
        const cur = s.summaries.find((x) => x.id === id)!
        const r = Sum.canApprove(cur, s.me())
        if (!r.ok) return r
        set({ summaries: s.summaries.map((x) => (x.id === id ? { ...x, status: "approved", history: [...x.history, { at: s.now().toISOString(), by: s.userId, action: "approve" }] } : x)) })
        return OK
      },

      sendSummary: (id) => {
        const s = get()
        const cur = s.summaries.find((x) => x.id === id)!
        const stu = s.students.find((x) => x.id === cur.studentId)!
        const parents = s.families.find((f) => f.id === stu.familyId)?.parents ?? []
        const r = Sum.canSend(cur, parents)
        if (!r.ok) return r
        if (!r.value.delivered) return fail("ผู้ปกครองยังไม่ได้ผูก LINE — ยังไม่ได้ส่ง (สรุปยังอยู่สถานะอนุมัติแล้ว)")
        set({ summaries: s.summaries.map((x) => (x.id === id ? { ...x, status: "sent", history: [...x.history, { at: s.now().toISOString(), by: s.userId, action: "send" }] } : x)) })
        return { ok: true, value: { delivered: true } }
      },

      // ---------------- billing ----------------
      saveInvoice: (inv) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const existing = s.invoices.find((x) => x.id === inv.id)
        if (existing && existing.status !== "draft" && existing.status !== "pending_approval") return fail("แก้ได้เฉพาะใบที่ยังไม่อนุมัติ")
        const totals = Bill.invoiceTotals(inv, ctxOf(s, inv.branchId))
        const errs = Bill.validateInvoiceDraft(inv, totals)
        if (errs.length) return fail(errs[0])
        // editing a generated invoice sends it back to draft (needs new PDF + approval)
        const next: Invoice = existing && existing.status === "pending_approval" ? { ...inv, status: "draft", pdf: "none" } : { ...inv, status: "draft" }
        set({ invoices: existing ? s.invoices.map((x) => (x.id === inv.id ? next : x)) : [next, ...s.invoices] })
        return { ok: true, value: next }
      },

      generatePdf: (id) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === id)!
        if (inv.status !== "draft") return fail("สร้าง PDF ได้จากใบร่างเท่านั้น")
        const branch = s.branches.find((b) => b.id === inv.branchId)!
        const today = toDateStr(s.now())
        const number = inv.number ?? Bill.nextInvoiceNumber("INV", branch, today, s.invoices.map((x) => x.number))
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, number, pdf: "generating" } : x)) })
        setTimeout(() => {
          const ok = Math.random() > 0.1
          set((st) => ({
            invoices: st.invoices.map((x) => (x.id === id ? { ...x, pdf: ok ? "ready" : "failed", status: ok ? "pending_approval" : "draft" } : x)),
            notifications: ok
              ? [{ id: uid("no"), at: new Date().toISOString(), kind: "approval_needed", title: "ใบแจ้งหนี้รออนุมัติ", body: `${number} รอคนอนุมัติ (ไม่ใช่คนสร้าง)`, read: false, roles: ["director", "manager", "admin"] }, ...st.notifications]
              : st.notifications,
          }))
        }, 1800)
        return { ok: true, value: { number } }
      },

      approveInvoice: (id) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === id)!
        const r = Bill.canApprove(inv, s.me())
        if (!r.ok) return r
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: "approved", approvedBy: s.userId } : x)) })
        return OK
      },

      sendInvoice: (id, note) => {
        const s = get()
        const inv = { ...s.invoices.find((x) => x.id === id)!, noteToParent: note }
        const r = Bill.canSend(inv)
        if (!r.ok) return r
        const stu = s.students.find((x) => x.id === inv.studentId)!
        const delivered = (s.families.find((f) => f.id === stu.familyId)?.parents ?? []).some((p) => p.lineLinked) && s.branches.find((b) => b.id === inv.branchId)!.lineOaConnected
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...inv, status: "sent", sentAt: s.now().toISOString(), delivery: delivered ? "delivered" : "no_line" } : x)) })
        return { ok: true, value: { delivered } }
      },

      voidInvoice: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const inv = s.invoices.find((x) => x.id === id)!
        const r = Bill.canVoid(inv, reason)
        if (!r.ok) return r
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: "void", voidReason: reason } : x)) })
        return OK
      },

      recordPayment: (id, p) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const inv = s.invoices.find((x) => x.id === id)!
        const total = Bill.invoiceTotals(inv, ctxOf(s, inv.branchId)).total
        const r = Bill.canRecordPayment(inv, p.amount, total)
        if (!r.ok) return r
        const pay = { id: uid("pay"), ...p, recordedBy: s.userId, recordedAt: s.now().toISOString() }
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, payments: [...x.payments, pay] } : x)) })
        return OK
      },

      confirmPayment: (invoiceId, paymentId) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === invoiceId)!
        const pay = inv.payments.find((p) => p.id === paymentId)!
        const r = Bill.canConfirmPayment(pay, s.me())
        if (!r.ok) return r
        const payments = inv.payments.map((p) => (p.id === paymentId ? { ...p, confirmedBy: s.userId } : p))
        const ctx = ctxOf(s, inv.branchId)
        const totals = Bill.invoiceTotals(inv, ctx)
        const paid = payments.filter((p) => p.confirmedBy).reduce((a, p) => a + p.amount, 0) >= totals.total
        let next: Invoice = { ...inv, payments }
        let { entitlements, classes, sessions } = s
        if (paid) {
          const today = toDateStr(s.now())
          next = { ...next, status: "paid", receiptNumber: Bill.nextInvoiceNumber("RC", ctx.branch, today, s.invoices.map((x) => x.receiptNumber)) }
          // auto-claim: entitlement covers exactly the paid window (BL-19) and the student joins the class sessions in it
          if (inv.course && totals.quote) {
            const q = totals.quote
            const pkg = s.packages.find((p) => p.id === s.courses.find((c) => c.id === inv.course!.courseId)?.packageId)
            entitlements = [...entitlements, { id: uid("en"), studentId: inv.studentId, courseId: inv.course.courseId, classId: inv.course.classId, invoiceId: inv.id, kind: pkg?.unit === "hours" ? "sessions" : "subscription", from: q.from, to: q.to, sessionsTotal: q.sessions.length }]
            classes = classes.map((c) => (c.id === inv.course!.classId && !c.studentIds.includes(inv.studentId) ? { ...c, studentIds: [...c.studentIds, inv.studentId] } : c))
            sessions = sessions.map((x) => (x.classId === inv.course!.classId && q.sessions.includes(x.date) && !x.studentIds.includes(inv.studentId) ? { ...x, studentIds: [...x.studentIds, inv.studentId] } : x))
          }
        }
        set({ invoices: s.invoices.map((x) => (x.id === invoiceId ? next : x)), entitlements, classes, sessions })
        return { ok: true, value: { paid } }
      },
    }),
    {
      name: "nockerp-v2",
      version: 1,
      // persist data + UI state only, never the action functions
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")) as Partial<Store>,
    },
  ),
)

/** Convenience: current user */
export const useMe = () => useStore((s) => s.staff.find((x) => x.id === s.userId)!)
