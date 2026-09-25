"use client"

// Single app store. Every mutating action goes through a domain rule and returns a Result,
// so the UI can always show success or a human-readable error (no silent failures).

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { buildSeed, uid, type DB } from "@/data/seed"
import { at, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import * as Bill from "@/domain/rules/billing"
import * as CRM from "@/domain/rules/crm"
import * as Inbox from "@/domain/rules/inbox"
import { can, canDeactivateStaff, require as requirePerm } from "@/domain/rules/permissions"
import * as Sch from "@/domain/rules/scheduling"
import * as Sum from "@/domain/rules/summaries"
import * as People from "@/domain/rules/people"
import * as Forms from "@/domain/rules/forms"
import type { AttendanceStatus, Branch, ChatMessage, Conversation, Course, Family, FormSubmission, Holiday, ID, Invoice, Klass, Lead, LeadStage, LessonSummary, Package, Result, Session, Staff, Student } from "@/domain/types"

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
  updateClass: (id: ID, patch: Partial<Pick<Klass, "teacherId" | "coTeacherIds" | "roomId" | "start" | "minutes" | "weekday" | "name">>) => Result<{ changed: number; kept: number }>
  moveSession: (id: ID, target: Sch.MoveTarget, scope: Sch.MoveScope) => Result<{ moved: number; kept: number }>
  deactivateClass: (id: ID, reason: string) => Result<{ cancelled: number }>
  addSession: (s: Omit<Session, "id" | "customized" | "cancelled">) => Result<Session>
  editSession: (id: ID, patch: Partial<Pick<Session, "date" | "start" | "minutes" | "teacherId" | "roomId">>) => Result
  cancelSession: (id: ID, reason: string) => Result<{ students: number }>
  updateSessionTeachers: (id: ID, teacherId: ID | null, coTeacherIds: ID[], scope: Sch.MoveScope) => Result<{ changed: number; kept: number }>
  addStudentToSession: (id: ID, studentId: ID, scope: Sch.MoveScope) => Result<{ changed: number }>

  addHoliday: (h: Omit<Holiday, "id">, cancelAffected: boolean) => Result<{ affected: number }>
  removeHoliday: (id: ID) => Result
  saveFamily: (f: Family) => Result<Family>
  generateLineCode: (familyId: ID) => Result<{ code: string }>
  simulateLineLink: (familyId: ID, parentIndex: number) => Result
  saveStudent: (s: Student) => Result<Student>
  saveStaff: (s: Staff) => Result<Staff>
  deactivateStaff: (id: ID, replacementId: ID | null) => Result<{ reassigned: number }>
  reactivateStaff: (id: ID) => Result
  savePackage: (p: Package) => Result<Package>
  saveCourse: (c: Course) => Result<Course>
  saveBranch: (b: Branch) => Result
  markNotificationsRead: (ids?: ID[]) => void
  /** synced from GET /api/line/status, not a user edit — bypasses the Settings draft/save flow */
  setLineOaConnected: (branchId: ID, connected: boolean) => void

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

  saveLead: (l: Lead) => Result<Lead>
  moveLeadStage: (id: ID, stage: LeadStage) => Result
  addLeadNote: (id: ID, text: string) => Result
  archiveLead: (id: ID, reason: string) => Result
  convertLeadToStudent: (id: ID) => Result<{ studentId: ID }>
  /** books an approved Test/Trial submission's chosen slot as a real, conflict-checked Session (or joins an existing class's session);
   *  pass 2+ same-lead, same-date/time, generic-source submissions together to merge them into one shared 2-hour room block */
  approveTestTrialSubmission: (subs: FormSubmission[]) => Result<{ sessionId: ID; studentId: ID }>

  openConversation: (id: ID) => void
  assignConversation: (id: ID, staffId: ID | null) => Result
  sendChatMessage: (conversationId: ID, raw: string) => Result
  startConversation: (input: { familyId?: ID; leadId?: ID; channel: Conversation["channel"]; text: string }) => Result<{ conversationId: ID }>
  /** prototype only: pretend the parent replied, so the unread badge + send-flow can be demoed end to end */
  simulateParentReply: (conversationId: ID, text?: string) => Result
  /** upserts conversations/messages polled from the real LINE webhook (server-side store) into local state */
  mergeLiveConversations: (conversations: Conversation[], messages: ChatMessage[]) => void
  /** attaches an unlinked (LINE-only) conversation to an existing Family, and records that family's real LINE identity */
  linkConversationToFamily: (conversationId: ID, familyId: ID) => Result
  linkConversationToLead: (conversationId: ID, leadId: ID) => Result
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
          grades: d.grades, kind: d.kind, type: d.type, teacherId: d.teacherId, coTeacherIds: d.coTeacherIds ?? [], roomId: d.roomId, weekday: d.weekday,
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
        if (Sch.isHoliday(input.date, input.branchId, s.holidays)) return fail("วันนั้นเป็นวันหยุด")
        const issues = Sch.validateClass(
          { ...input, kind: "other", type: "group", weekday: weekdayOf(input.date), startDate: input.date, overrideReason: "session" },
          { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, now: s.now() },
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
        const after = s.sessions.map((x) => (x.id === id ? next : x))
        const clash = Sch.introducedConflicts(s.sessions, after, [id], branch, s.staff).added[0]
        if (clash) return fail(clash.message)
        set({ sessions: s.sessions.map((x) => (x.id === id ? next : x)) })
        return OK
      },

      // drag & drop: validates the resulting schedule before saving
      moveSession: (id, target, scope) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const src = s.sessions.find((x) => x.id === id)
        if (!src) return fail("ไม่พบคาบเรียน")
        const now = s.now()
        if (Sch.sessionState(src, now) !== "upcoming") return fail("ย้ายได้เฉพาะคาบที่ยังไม่เริ่ม")
        const branch = s.branches.find((b) => b.id === src.branchId)!
        const moved = { ...src, date: target.date, start: target.start }
        if (at(target.date, target.start) < now) return fail("ย้ายไปเวลาที่ผ่านมาแล้วไม่ได้")
        const hours = branch.hours[weekdayOf(target.date)]
        if (!hours) return fail("สาขาปิดวันนั้น")
        if (toMinutes(target.start) < toMinutes(hours.open) || toMinutes(target.start) + moved.minutes > toMinutes(hours.close)) return fail(`อยู่นอกเวลาเปิดสาขา (${hours.open}–${hours.close})`)
        if (Sch.isHoliday(target.date, branch.id, s.holidays)) return fail("วันนั้นเป็นวันหยุด")
        const r = Sch.moveSession(s.sessions, id, target, scope, now, s.attendance)
        const { added, remaining } = Sch.introducedConflicts(s.sessions, r.sessions, r.movedIds, branch, s.staff)
        if (added[0]) return fail(`ย้ายไม่ได้ — ${added[0].message}`)
        set({
          sessions: r.sessions,
          classes: r.classPatch && src.classId ? s.classes.map((c) => (c.id === src.classId ? { ...c, ...r.classPatch } : c)) : s.classes,
        })
        return { ok: true, value: { moved: r.movedIds.length, kept: r.kept }, warnings: [...new Set(remaining.map((c) => `ยังชนอยู่ (ปัญหาเดิม): ${c.message}`))] }
      },

      updateSessionTeachers: (id, teacherId, coTeacherIds, scope) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const src = s.sessions.find((x) => x.id === id)
        if (!src) return fail("ไม่พบคาบเรียน")
        const now = s.now()
        if (Sch.sessionState(src, now) !== "upcoming") return fail("เปลี่ยนครูได้เฉพาะคาบที่ยังไม่เริ่ม")
        if (!teacherId && coTeacherIds.length) return fail("เลือกครูหลักก่อน")
        const co = coTeacherIds.filter((t) => t !== teacherId)
        const inactive = [teacherId, ...co].map((t) => s.staff.find((x) => x.id === t)).find((t) => t && !t.active)
        if (inactive) return fail(`${inactive.nickname} ไม่ได้ทำงานแล้ว`)
        const r = Sch.applyToSessions(s.sessions, id, scope, (x) => ({ ...x, teacherId, coTeacherIds: co }), (x) => Sch.editableByClass(x, now, s.attendance))
        const branch = s.branches.find((b) => b.id === src.branchId)!
        const clash = Sch.introducedConflicts(s.sessions, r.sessions, r.changedIds, branch, s.staff, ["teacher"]).added[0]
        if (clash) return fail(`เปลี่ยนไม่ได้ — ${clash.message}`)
        set({
          sessions: r.sessions,
          classes: scope === "following" && src.classId ? s.classes.map((c) => (c.id === src.classId ? { ...c, teacherId, coTeacherIds: co } : c)) : s.classes,
        })
        return { ok: true, value: { changed: r.changedIds.length, kept: r.kept } }
      },

      addStudentToSession: (id, studentId, scope) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const src = s.sessions.find((x) => x.id === id)!
        const now = s.now()
        if (Sch.sessionState(src, now) === "closed" || src.cancelled) return fail("คาบนี้ปิดหรือยกเลิกแล้ว")
        if (src.studentIds.includes(studentId)) return fail("นักเรียนอยู่ในคาบนี้แล้ว")
        const klass = s.classes.find((c) => c.id === src.classId)
        const cap = klass ? Sch.CAPACITY[klass.type] : Sch.CAPACITY.group
        if (src.studentIds.length >= cap) return fail(`คาบนี้เต็มแล้ว (${cap} คน)`)
        const stu = s.students.find((x) => x.id === studentId)!
        const r = Sch.applyToSessions(
          s.sessions, id, scope,
          (x) => ({ ...x, studentIds: [...x.studentIds, studentId] }),
          (x) => Sch.sessionState(x, now) === "upcoming" && !x.studentIds.includes(studentId) && x.studentIds.length < cap,
        )
        const warnings: string[] = []
        if (klass && Att.gradeMismatch(stu, klass)) warnings.push(`เกรด ${stu.grade} ไม่ตรงกับคลาส (${klass.grades.join(", ")})`)
        if (!src.trial && !Att.coveringEntitlement(studentId, src, s.entitlements))
          warnings.push(`${stu.nickname} ยังไม่ได้จ่ายค่าเรียนสำหรับคาบนี้ — ออกใบแจ้งหนี้ที่หน้าการเงิน`)
        if (r.kept) warnings.push(`ข้าม ${r.kept} คาบที่เต็มหรือเริ่มไปแล้ว`)
        set({
          sessions: r.sessions,
          classes: scope === "following" && klass ? s.classes.map((c) => (c.id === klass.id && !c.studentIds.includes(studentId) ? { ...c, studentIds: [...c.studentIds, studentId] } : c)) : s.classes,
        })
        return { ok: true, value: { changed: r.changedIds.length }, warnings }
      },

      // A10: adding a holiday shows affected sessions and can cancel them in one go
      addHoliday: (h, cancelAffected) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (!h.name.trim()) return fail("ใส่ชื่อวันหยุด")
        if (s.holidays.some((x) => x.date === h.date && x.branchId === h.branchId)) return fail("มีวันหยุดวันนี้แล้ว")
        const affected = Sch.holidayImpact(h.date, h.branchId, s.sessions)
        const ids = new Set(affected.map((x) => x.id))
        const reason = `วันหยุด: ${h.name}`
        set({
          holidays: [...s.holidays, { ...h, id: uid("hol") }],
          sessions: cancelAffected ? s.sessions.map((x) => (ids.has(x.id) ? { ...x, cancelled: true, cancelReason: reason } : x)) : s.sessions,
          notifications: affected.length
            ? [{ id: uid("no"), at: s.now().toISOString(), kind: "holiday_impact", title: `วันหยุด ${h.name} กระทบ ${affected.length} คาบ`, body: `${h.date} · ${cancelAffected ? "ยกเลิกคาบแล้ว — แจ้งผู้ปกครอง / นัดชดเชย" : "คาบยังอยู่ — ต้องตัดสินใจย้ายหรือยกเลิก"}`, read: false, roles: ["director", "manager", "admin"] }, ...s.notifications]
            : s.notifications,
        })
        return { ok: true, value: { affected: affected.length } }
      },

      removeHoliday: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        set({ holidays: s.holidays.filter((h) => h.id !== id) })
        return OK
      },

      saveFamily: (f) => {
        const s = get()
        const perm = requirePerm(s.me(), "family.manage")
        if (!perm.ok) return perm
        const errs = People.validateFamily(f)
        if (errs.length) return fail(errs[0].message)
        const clean = { ...f, parents: f.parents.map((p) => ({ ...p, phone: People.formatPhone(p.phone) })) }
        set({ families: s.families.some((x) => x.id === f.id) ? s.families.map((x) => (x.id === f.id ? clean : x)) : [...s.families, clean] })
        return { ok: true, value: clean }
      },

      generateLineCode: (familyId) => {
        const s = get()
        const perm = requirePerm(s.me(), "family.manage")
        if (!perm.ok) return perm
        const code = People.newLineCode(s.now())
        set({ families: s.families.map((f) => (f.id === familyId ? { ...f, lineCode: code } : f)) })
        return { ok: true, value: { code: code.code } }
      },

      // prototype only: pretend the parent sent the code to the LINE OA
      simulateLineLink: (familyId, parentIndex) => {
        const s = get()
        const f = s.families.find((x) => x.id === familyId)!
        const r = People.lineCodeValid(f, s.now())
        if (!r.ok) return r
        set({ families: s.families.map((x) => (x.id === familyId ? { ...x, lineCode: undefined, parents: x.parents.map((p, i) => (i === parentIndex ? { ...p, lineLinked: true } : p)) } : x)) })
        return OK
      },

      saveStudent: (st) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        const errs = People.validateStudent(st, toDateStr(s.now()))
        if (errs.length) return fail(errs[0].message)
        set({ students: s.students.some((x) => x.id === st.id) ? s.students.map((x) => (x.id === st.id ? st : x)) : [...s.students, st] })
        return { ok: true, value: st }
      },

      saveStaff: (st) => {
        const s = get()
        const perm = requirePerm(s.me(), "staff.manage")
        if (!perm.ok) return perm
        const errs = People.validateStaff(st, s.staff, st.id)
        if (errs.length) return fail(errs[0].message)
        const clean = st.canLogin ? st : { ...st, email: st.email || undefined }
        set({ staff: s.staff.some((x) => x.id === st.id) ? s.staff.map((x) => (x.id === st.id ? clean : x)) : [...s.staff, clean] })
        return { ok: true, value: clean }
      },

      // F2 + S6: hand over future sessions first, never lock the school out
      deactivateStaff: (id, replacementId) => {
        const s = get()
        const perm = requirePerm(s.me(), "staff.manage")
        if (!perm.ok) return perm
        const target = s.staff.find((x) => x.id === id)!
        const guard = canDeactivateStaff(target, s.me(), s.staff)
        if (!guard.ok) return guard
        const future = People.futureSessionsOf(id, s.sessions, toDateStr(s.now()))
        if (future.length && replacementId === undefined) return fail(`ยังมี ${future.length} คาบในอนาคต — เลือกครูแทนก่อน`)
        const ids = new Set(future.map((x) => x.id))
        const swap = (x: { teacherId: ID | null; coTeacherIds: ID[] }) => ({
          teacherId: x.teacherId === id ? replacementId : x.teacherId,
          coTeacherIds: x.coTeacherIds.filter((c) => c !== id && c !== replacementId),
        })
        set({
          staff: s.staff.map((x) => (x.id === id ? { ...x, active: false } : x)),
          sessions: s.sessions.map((x) => (ids.has(x.id) ? { ...x, ...swap(x) } : x)),
          classes: s.classes.map((c) => (c.teacherId === id || c.coTeacherIds.includes(id) ? { ...c, ...swap(c) } : c)),
        })
        return { ok: true, value: { reassigned: future.length } }
      },

      reactivateStaff: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "staff.manage")
        if (!perm.ok) return perm
        set({ staff: s.staff.map((x) => (x.id === id ? { ...x, active: true } : x)) })
        return OK
      },

      savePackage: (p) => {
        const s = get()
        const perm = requirePerm(s.me(), "course.manage")
        if (!perm.ok) return perm
        if (!(p.price > 0)) return fail("ราคาต้องมากกว่า 0")
        if (p.unit === "hours" && !(p.hours && p.hours > 0)) return fail("ใส่จำนวนชั่วโมงของแพ็กเกจ")
        if (!p.grades.length) return fail("เลือกเกรดอย่างน้อย 1")
        set({ packages: s.packages.some((x) => x.id === p.id) ? s.packages.map((x) => (x.id === p.id ? p : x)) : [...s.packages, p] })
        return { ok: true, value: p }
      },

      saveCourse: (c) => {
        const s = get()
        const perm = requirePerm(s.me(), "course.manage")
        if (!perm.ok) return perm
        if (!c.name.trim()) return fail("ใส่ชื่อคอร์ส")
        const pkg = s.packages.find((p) => p.id === c.packageId)
        if (!pkg) return fail("เลือกแพ็กเกจราคา")
        if (pkg.subject !== c.subject) return fail("วิชาของคอร์สต้องตรงกับแพ็กเกจ")
        if (!c.grades.length) return fail("เลือกเกรดอย่างน้อย 1")
        const outside = c.grades.filter((g) => !pkg.grades.includes(g))
        if (outside.length) return fail(`แพ็กเกจนี้ไม่มีราคาสำหรับ ${outside.join(", ")}`)
        set({ courses: s.courses.some((x) => x.id === c.id) ? s.courses.map((x) => (x.id === c.id ? c : x)) : [...s.courses, c] })
        return { ok: true, value: c }
      },

      saveBranch: (b) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (!b.name.trim()) return fail("ใส่ชื่อสาขา")
        if (!b.rooms.length) return fail("ต้องมีห้องอย่างน้อย 1 ห้อง")
        for (const [, h] of Object.entries(b.hours)) if (h && toMinutes(h.open) >= toMinutes(h.close)) return fail("เวลาปิดต้องหลังเวลาเปิด")
        const removedRooms = s.branches.find((x) => x.id === b.id)!.rooms.filter((r) => !b.rooms.some((n) => n.id === r.id))
        const inUse = removedRooms.find((r) => s.sessions.some((x) => x.roomId === r.id && !x.cancelled && x.date >= toDateStr(s.now())))
        if (inUse) return fail(`ลบ${inUse.name}ไม่ได้ — ยังมีคาบที่ใช้ห้องนี้`)
        set({ branches: s.branches.map((x) => (x.id === b.id ? b : x)) })
        return OK
      },

      markNotificationsRead: (ids) => set((s) => ({ notifications: s.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) })),
      setLineOaConnected: (branchId, connected) => set((s) => ({ branches: s.branches.map((b) => (b.id === branchId ? { ...b, lineOaConnected: connected } : b)) })),

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
        // C5: leave beyond quota is allowed but flagged (quota rule awaiting owner confirmation)
        if (status === "leave") {
          const ent = Att.coveringEntitlement(studentId, se, s.entitlements)
          if (ent && Att.leavesUsed(ent, s.sessions, s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId))) >= Att.leaveQuota(ent))
            return { ok: true, value: undefined, warnings: [`ลาเกินโควตาแล้ว (โควตา ${Att.leaveQuota(ent)} ครั้ง) — แจ้งผู้ปกครองเรื่องการชดเชย`] }
        }
        return OK
      },

      clearMark: (sessionId, studentId) => {
        const s = get()
        const me = s.me()
        const se = s.sessions.find((x) => x.id === sessionId)!
        if (!can(me, "session.manage") && se.teacherId !== me.id) return fail("แก้การเช็คชื่อได้เฉพาะคาบที่คุณสอน")
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
            entitlements = [...entitlements, { id: uid("en"), studentId: inv.studentId, courseId: inv.course.courseId, subject: s.courses.find((c) => c.id === inv.course!.courseId)!.subject, classId: inv.course.classId, invoiceId: inv.id, kind: pkg?.unit === "hours" ? "sessions" : "subscription", from: q.from, to: q.to, sessionsTotal: q.sessions.length }]
            classes = classes.map((c) => (c.id === inv.course!.classId && !c.studentIds.includes(inv.studentId) ? { ...c, studentIds: [...c.studentIds, inv.studentId] } : c))
            sessions = sessions.map((x) => (x.classId === inv.course!.classId && q.sessions.includes(x.date) && !x.studentIds.includes(inv.studentId) ? { ...x, studentIds: [...x.studentIds, inv.studentId] } : x))
          }
        }
        set({ invoices: s.invoices.map((x) => (x.id === invoiceId ? next : x)), entitlements, classes, sessions })
        return { ok: true, value: { paid } }
      },

      // ---------------- CRM ----------------
      saveLead: (l) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const err = CRM.validateLead(l)
        if (err) return fail(err)
        set({ leads: s.leads.some((x) => x.id === l.id) ? s.leads.map((x) => (x.id === l.id ? l : x)) : [l, ...s.leads] })
        return { ok: true, value: l }
      },

      moveLeadStage: (id, stage) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        const guard = CRM.canSetStage(lead.stage, stage)
        if (!guard.ok) return guard
        set({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage } : x)) })
        return OK
      },

      addLeadNote: (id, text) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        if (!text.trim()) return fail("เขียนโน้ตก่อนบันทึก")
        set({ leads: s.leads.map((x) => (x.id === id ? { ...x, notes: [...x.notes, { at: s.now().toISOString(), by: s.userId, text }] } : x)) })
        return OK
      },

      archiveLead: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("กรอกเหตุผลที่เก็บเข้าคลัง")
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        if (lead.stage === "archived") return fail("เก็บเข้าคลังไปแล้ว")
        set({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage: "archived", archivedFrom: x.stage, archiveReason: reason } : x)) })
        return OK
      },

      convertLeadToStudent: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        if (lead.stage === "enrolled") return fail("แปลงเป็นนักเรียนไปแล้ว")
        if (lead.trialStudentId) {
          // reuse the Student created at test/trial approval time instead of creating a duplicate
          set({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage: "enrolled", convertedStudentId: lead.trialStudentId! } : x)) })
          return { ok: true, value: { studentId: lead.trialStudentId } }
        }
        const student: Student = { id: uid("stu"), familyId: null, branchId: lead.branchId, name: lead.name, nickname: lead.name, grade: lead.childGrade, usesBus: false }
        const errs = People.validateStudent(student, toDateStr(s.now()))
        if (errs.length) return fail(errs[0].message)
        set({
          students: [...s.students, student],
          leads: s.leads.map((x) => (x.id === id ? { ...x, stage: "enrolled", convertedStudentId: student.id } : x)),
        })
        return { ok: true, value: { studentId: student.id } }
      },

      approveTestTrialSubmission: (subs) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const primary = subs[0]
        const lead = s.leads.find((x) => x.id === primary.leadId)
        if (!lead) return fail("ไม่พบ Lead นี้")

        // reuse the one Student per lead, created lazily on first approval — persisted immediately
        // so the addStudentToSession/addSession calls below see it via their own get()
        let studentId = lead.trialStudentId
        if (!studentId) {
          const student: Student = { id: uid("stu"), familyId: null, branchId: lead.branchId, name: primary.studentName, nickname: primary.studentName, grade: primary.studentGrade, usesBus: false }
          const errs = People.validateStudent(student, toDateStr(s.now()))
          if (errs.length) return fail(errs[0].message)
          studentId = student.id
          set({ students: [...s.students, student] })
        }

        let sessionId: ID
        if (subs.length >= 2) {
          // 2+ subjects picked for the same date+time — one shared 2-hour room block, not one per subject
          const branch = s.branches.find((b) => b.id === lead.branchId)!
          const draft = Forms.buildCombinedSessionDraft(subs.map((sub) => ({ subject: sub.chosenSubject, slot: sub.chosenSlot })), lead.branchId, studentId, branch, s.sessions)
          if (!draft) return fail("รวมช่วงเวลานี้เป็นคาบเดียวไม่ได้")
          const r = get().addSession(draft)
          if (!r.ok) return r
          sessionId = r.value.id
        } else if (primary.chosenSlot.source === "class") {
          const r = get().addStudentToSession(primary.chosenSlot.sessionId!, studentId, "one")
          if (!r.ok) return r
          sessionId = primary.chosenSlot.sessionId!
        } else {
          const draft = Forms.buildSessionDraftFromSlot(primary.chosenSlot, primary.chosenSubject, lead.branchId, studentId)
          const r = get().addSession(draft)
          if (!r.ok) return r
          sessionId = r.value.id
        }

        const stage = Forms.APPROVE_STAGE[primary.type]
        const guard = CRM.canSetStage(lead.stage, stage)
        set((cur) => ({
          leads: cur.leads.map((x) => (x.id === lead.id ? { ...x, trialStudentId: studentId, stage: guard.ok ? stage : x.stage } : x)),
        }))
        return { ok: true, value: { sessionId, studentId } }
      },

      // ---------------- Inbox ----------------
      openConversation: (id) => set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, unread: false } : c)) })),

      assignConversation: (id, staffId) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        set({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, assigneeId: staffId } : c)) })
        return OK
      },

      sendChatMessage: (conversationId, raw) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        const { isNote, text } = Inbox.parseComposerInput(raw)
        if (!text) return fail("พิมพ์ข้อความก่อน")
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const at = s.now().toISOString()
        const author: "internal" | "staff" = isNote ? "internal" : "staff"
        const message = { id: uid("msg"), conversationId, author, senderId: s.userId, text, at }
        set({
          messages: [...s.messages, message],
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: at } : c)),
        })
        return OK
      },

      startConversation: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        if (!input.text.trim()) return fail("พิมพ์ข้อความก่อน")
        if (!input.familyId && !input.leadId) return fail("เลือกครอบครัวหรือ Lead ก่อน")
        const existing = s.conversations.find((c) => (input.familyId && c.familyId === input.familyId) || (input.leadId && c.leadId === input.leadId))
        const at = s.now().toISOString()
        const family = input.familyId ? s.families.find((f) => f.id === input.familyId) : undefined
        const lead = input.leadId ? s.leads.find((l) => l.id === input.leadId) : undefined
        const branchId = family ? s.students.find((st) => st.familyId === family.id)?.branchId ?? s.branchId : (lead?.branchId ?? s.branchId)
        const conv: Conversation = existing ?? {
          id: uid("cv"), branchId, name: family?.name ?? lead?.name ?? "บทสนทนาใหม่",
          familyId: input.familyId ?? null, leadId: input.leadId ?? null, channel: input.channel, assigneeId: s.userId, lastMessageAt: at, unread: false,
        }
        const message = { id: uid("msg"), conversationId: conv.id, author: "staff" as const, senderId: s.userId, text: input.text, at }
        set({
          conversations: existing ? s.conversations.map((c) => (c.id === conv.id ? { ...c, lastMessageAt: at } : c)) : [conv, ...s.conversations],
          messages: [...s.messages, message],
        })
        return { ok: true, value: { conversationId: conv.id } }
      },

      simulateParentReply: (conversationId, text) => {
        const s = get()
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const at = s.now().toISOString()
        const message = { id: uid("msg"), conversationId, author: "parent" as const, senderId: null, text: text?.trim() || "ขอบคุณค่ะ/ครับ", at }
        set({
          messages: [...s.messages, message],
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: at, unread: true } : c)),
        })
        return OK
      },

      mergeLiveConversations: (conversations, messages) => {
        const s = get()
        const convMap = new Map(s.conversations.map((c) => [c.id, c] as const))
        let changed = false
        conversations.forEach((server) => {
          const local = convMap.get(server.id)
          if (local) {
            // the server only knows raw LINE state (unread/lastMessageAt) — familyId/leadId/assigneeId/name
            // are business data linked locally (see linkConversationToFamily) and must survive every poll
            if (local.unread !== server.unread || local.lastMessageAt !== server.lastMessageAt) {
              convMap.set(server.id, { ...local, unread: server.unread, lastMessageAt: server.lastMessageAt })
              changed = true
            }
          } else {
            convMap.set(server.id, { ...server, branchId: s.branchId })
            changed = true
          }
        })
        const seen = new Set(s.messages.map((m) => m.id))
        const fresh = messages.filter((m) => !seen.has(m.id))
        if (!fresh.length && !changed) return
        set({ conversations: Array.from(convMap.values()), messages: fresh.length ? [...s.messages, ...fresh] : s.messages })
      },

      linkConversationToFamily: (conversationId, familyId) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const family = s.families.find((f) => f.id === familyId)
        if (!family) return fail("ไม่พบครอบครัวนี้")
        const lineUserId = conversationId.startsWith("line_") ? conversationId.slice(5) : undefined
        set({
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, familyId, leadId: null, name: family.name } : c)),
          families: lineUserId
            ? s.families.map((f) => (f.id === familyId ? { ...f, lineUserId, parents: f.parents.map((p, i) => (i === 0 ? { ...p, lineLinked: true } : p)) } : f))
            : s.families,
        })
        return OK
      },

      linkConversationToLead: (conversationId, leadId) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const lead = s.leads.find((l) => l.id === leadId)
        if (!lead) return fail("ไม่พบ Lead นี้")
        const lineUserId = conversationId.startsWith("line_") ? conversationId.slice(5) : undefined
        set({
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, leadId, familyId: null, name: lead.name } : c)),
          leads: lineUserId ? s.leads.map((l) => (l.id === leadId ? { ...l, lineUserId } : l)) : s.leads,
        })
        return OK
      },
    }),
    {
      name: "nockerp-v2",
      // bump when the data model changes; older saved data is replaced by fresh sample data
      version: 14,
      migrate: () => ({ ...buildSeed(), userId: "u_nock", branchId: "br_thl", clockOffset: 0 }) as unknown as Store,
      // persist data + UI state only, never the action functions
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")) as Partial<Store>,
    },
  ),
)

/** Convenience: current user */
export const useMe = () => useStore((s) => s.staff.find((x) => x.id === s.userId)!)
