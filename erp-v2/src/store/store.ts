"use client"

// Single app store. Every mutating action goes through a domain rule and returns a Result,
// so the UI can always show success or a human-readable error (no silent failures).

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { buildSeed, uid, type DB } from "@/data/seed"
import { at, fmtDate, fmtMoney, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import * as Bill from "@/domain/rules/billing"
import * as CRM from "@/domain/rules/crm"
import * as Inbox from "@/domain/rules/inbox"
import { can, canDeactivateStaff, inBranch, OFFICE_ROLES, require as requirePerm } from "@/domain/rules/permissions"
import * as Sch from "@/domain/rules/scheduling"
import * as Sum from "@/domain/rules/summaries"
import * as People from "@/domain/rules/people"
import * as Forms from "@/domain/rules/forms"
import * as CourseR from "@/domain/rules/course"
import * as Notif from "@/domain/rules/notifications"
import * as Cfg from "@/domain/rules/settings"
import type { AttendanceStatus, Branch, ChatMessage, Conversation, Course, DateStr, Family, FormSubmission, Holiday, ID, Invoice, Klass, Lead, LeadStage, LessonSummary, LogCategory, Result, Session, Staff, Student, SystemConfig } from "@/domain/types"

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
  /** Create New Class (owner design): one form → one class per row of weekday + start–end time */
  createClasses: (base: Omit<Sch.ClassDraft, "weekday" | "start" | "minutes"> & { name: string; grades: string[] }, rows: { weekday: Klass["weekday"]; start: string; minutes: number }[]) => Result<{ classes: number; sessions: number }>
  updateClass: (id: ID, patch: Partial<Pick<Klass, "teacherId" | "coTeacherIds" | "roomId" | "start" | "minutes" | "weekday" | "name">>) => Result<{ changed: number; kept: number }>
  moveSession: (id: ID, target: Sch.MoveTarget, scope: Sch.MoveScope) => Result<{ moved: number; kept: number }>
  deactivateClass: (id: ID, reason: string) => Result<{ cancelled: number }>
  addSession: (s: Omit<Session, "id" | "customized" | "cancelled">) => Result<Session>
  editSession: (id: ID, patch: Partial<Pick<Session, "date" | "start" | "minutes" | "teacherId" | "roomId">>) => Result
  cancelSession: (id: ID, reason: string) => Result<{ students: number }>
  updateSessionTeachers: (id: ID, teacherId: ID | null, coTeacherIds: ID[], scope: Sch.MoveScope) => Result<{ changed: number; kept: number }>
  addStudentToSession: (id: ID, studentId: ID, scope: Sch.MoveScope) => Result<{ changed: number }>

  /** branchId null = company holiday (System, Director) · branchId set = that branch's own holiday (Admin/Manager of the branch) */
  addHoliday: (h: Omit<Holiday, "id">, cancelAffected: boolean) => Result<{ affected: number }>
  updateHoliday: (id: ID, patch: Pick<Holiday, "name" | "date" | "category">) => Result
  removeHoliday: (id: ID) => Result
  /** per-branch toggle on a company holiday: open = the branch works that day */
  setHolidayOpen: (holidayId: ID, branchId: ID, open: boolean, cancelAffected: boolean) => Result<{ affected: number }>
  saveFamily: (f: Family) => Result<Family>
  generateLineCode: (familyId: ID) => Result<{ code: string }>
  simulateLineLink: (familyId: ID, parentIndex: number) => Result
  saveStudent: (s: Student) => Result<Student>
  /** left the school for good (manual) — Active/Inactive is automatic */
  archiveStudent: (id: ID, reason: string) => Result
  restoreStudent: (id: ID) => Result
  addStudentNote: (studentId: ID, text: string) => Result
  saveStaff: (s: Staff) => Result<Staff>
  deactivateStaff: (id: ID, replacementId: ID | null) => Result<{ reassigned: number }>
  reactivateStaff: (id: ID) => Result
  saveCourse: (c: Course) => Result<Course>
  duplicateCourse: (id: ID) => Result<Course>
  saveBranch: (b: Branch) => Result
  addBranch: (input: { name: string; code: string; brand: Branch["brand"] }) => Result<Branch>
  setBranchActive: (id: ID, active: boolean) => Result
  saveSystem: (sys: SystemConfig) => Result
  /** renames a subject in the global catalog and every record that uses it (display name only changes) */
  renameSubject: (from: string, to: string) => Result
  /** marks as read for the current user only */
  markNotificationsRead: (ids?: ID[]) => void
  sendTeamMessage: (target: Notif.MessageTarget, title: string, body: string) => Result
  /** synced from GET /api/line/status, not a user edit — bypasses the Settings draft/save flow */
  setLineOaConnected: (branchId: ID, connected: boolean) => void

  mark: (sessionId: ID, studentId: ID, status: AttendanceStatus) => Result
  clearMark: (sessionId: ID, studentId: ID) => Result
  saveStudentLeave: (input: { id?: ID; studentId: ID; from: DateStr; to: DateStr; reason: string }) => Result
  removeStudentFromClass: (classId: ID, studentId: ID) => Result<{ removedFrom: number }>

  saveSummary: (sessionId: ID, studentId: ID, text: string, submit: boolean) => Result
  requestSummaryChanges: (id: ID, note: string) => Result
  /** forceRemark set = Force Approve (skip maker–checker) */
  approveSummary: (id: ID, forceRemark?: string) => Result
  sendSummary: (id: ID) => Result<{ delivered: boolean }>

  saveInvoice: (inv: Invoice) => Result<Invoice>
  generatePdf: (id: ID) => Result<{ number: string }>
  approveInvoice: (id: ID, forceRemark?: string) => Result
  sendInvoice: (id: ID, note: string) => Result<{ delivered: boolean }>
  voidInvoice: (id: ID, reason: string) => Result
  recordPayment: (id: ID, p: { amount: number; method: "transfer" | "cash"; reference: string }) => Result
  confirmPayment: (invoiceId: ID, paymentId: ID, forceRemark?: string) => Result<{ paid: boolean }>

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
/** Company holidays = Director (settings.manage); a branch's own holidays = Admin/Manager of that branch. */
const holidayPerm = (s: DB & { userId: ID }, branchId: ID | null) => {
  const me = s.staff.find((x) => x.id === s.userId)
  if (branchId === null) return requirePerm(me, "settings.manage")
  const r = requirePerm(me, "holiday.manage")
  if (!r.ok) return r
  return inBranch(me, branchId) ? r : fail("จัดการวันหยุดได้เฉพาะสาขาของตัวเอง")
}

/** A10: a day turning into a holiday — optionally cancel its sessions, always tell the office. */
const closeDay = (s: DB & { userId: ID; now: () => Date }, affected: Session[], name: string, date: DateStr, cancel: boolean, branchId: ID | null) => {
  if (!affected.length) return {}
  const ids = new Set(affected.map((x) => x.id))
  return {
    sessions: cancel ? s.sessions.map((x) => (ids.has(x.id) ? { ...x, cancelled: true, cancelReason: `วันหยุด: ${name}` } : x)) : s.sessions,
    notifications: [
      Notif.notify({ id: uid("no"), at: s.now(), kind: "holiday_impact", title: `วันหยุด ${name} กระทบ ${affected.length} คาบ`, body: `${date} · ${cancel ? "ยกเลิกคาบแล้ว — แจ้งผู้ปกครอง / นัดชดเชย" : "คาบยังอยู่ — ต้องตัดสินใจย้ายหรือยกเลิก"}`, fromId: s.userId, audience: { roles: OFFICE_ROLES, branchId: branchId ?? undefined } }),
      ...s.notifications,
    ],
  }
}

/** Force Approve always tells the whole branch + every Director who skipped the check and why. */
const forceNotice = (s: DB & { userId: ID; now: () => Date }, branchId: ID, what: string, detail: string, remark: string) => {
  const actor = s.staff.find((x) => x.id === s.userId)
  return Notif.notify({
    id: uid("no"), at: s.now(), kind: "force_approved", fromId: s.userId,
    title: `Force Approve · ${what}`,
    body: `${actor?.nickname ?? "?"} อนุมัติงานของตัวเองโดยข้ามผู้ตรวจ — ${detail} · เหตุผล: ${remark.trim()}`,
    audience: Notif.forceAudience(branchId, s.staff),
  })
}
const ctxOf = (s: DB, branchId: ID) => ({
  branch: s.branches.find((b) => b.id === branchId)!,
  courses: s.courses, classes: s.classes, holidays: s.holidays,
})

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** append to the audit trail — every change touching a student goes through here */
      const log = (category: LogCategory, studentIds: ID[], action: string, detail: string, system = false) =>
        set((st) => ({ logs: [{ id: uid("lg"), at: st.now().toISOString(), by: system ? null : st.userId, category, studentIds, action, detail }, ...st.logs] }))
      /** the lead's family: reuse one already on the same LINE (siblings), else create it from the lead;
       *  the lead's chats become that family's chats so invoices/summaries reach the same LINE */
      const ensureLeadFamily = (lead: Lead, child: { studentName: string; parentName?: string; parentPhone?: string }): ID => {
        const st = get()
        const existing = lead.lineUserId ? st.families.find((f) => f.lineUserId === lead.lineUserId) : undefined
        const family = existing ?? People.familyFromLead(lead, child, uid("fam"))
        set((cur) => ({
          families: existing ? cur.families : [...cur.families, family],
          conversations: cur.conversations.map((c) => (c.leadId === lead.id || (lead.lineUserId && c.id === `line_${lead.lineUserId}`) ? { ...c, familyId: family.id } : c)),
        }))
        return family.id
      }
      return {
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
          id: uid("cl"), branchId: d.branchId, name: d.name.trim() || `${Sch.subjectsOf(d).join(" + ")} ${d.grades.join(", ")}`.trim(), subject: d.subject,
          subjects: d.subjects && d.subjects.length > 1 ? d.subjects : undefined, grades: d.grades, kind: d.kind, type: d.type, courseId: d.courseId ?? null, teacherId: d.teacherId, coTeacherIds: d.coTeacherIds ?? [], roomId: d.roomId, weekday: d.weekday,
          start: d.start, minutes: d.minutes, startDate: d.startDate, active: true, studentIds: d.studentIds,
        }
        const sessions = Sch.generateSessions(klass, s.holidays, () => uid("se"))
        set({ classes: [...s.classes, klass], sessions: [...s.sessions, ...sessions] })
        if (klass.studentIds.length) log("class", klass.studentIds, "เข้าคลาส", `${klass.name} (สร้างคลาสใหม่)`)
        return { ok: true, value: { klass, sessions: sessions.length } }
      },

      createClasses: (base, rows) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        if (!rows.length) return fail("เพิ่มวันและเวลาอย่างน้อย 1 แถว")
        const clash = Sch.overlappingRows(rows)[0]
        if (clash) return fail(`แถว ${clash[0] + 1} กับแถว ${clash[1] + 1} เป็นวันเดียวกันและเวลาทับกัน`)
        const branch = s.branches.find((b) => b.id === base.branchId)!
        // validate every row first — nothing is created unless all rows pass (or carry an override reason)
        for (const [i, r] of rows.entries()) {
          const issues = Sch.validateClass({ ...base, ...r }, { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, now: s.now() })
          if (!Sch.canSave(issues, base.overrideReason)) return fail(`แถว ${i + 1}: ${issues.find((x) => x.level !== "warn")?.message ?? "ตรวจสอบข้อมูลอีกครั้ง"}`)
        }
        let sessions = 0
        for (const r of rows) {
          const res = get().createClass({ ...base, ...r })
          if (!res.ok) return res
          sessions += res.value.sessions
        }
        return { ok: true, value: { classes: rows.length, sessions } }
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
        const allowed = Sch.canChangeTeachers(src, now)
        if (!allowed.ok) return allowed
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
        log("class", [studentId], scope === "following" && klass ? "เข้าคลาส" : "เข้าคาบ", `${klass?.name ?? src.subject} · ${fmtDate(src.date)} ${src.start}${r.changedIds.length > 1 ? ` · ${r.changedIds.length} คาบ` : ""}${src.trial ? " · ทดลองเรียน" : ""}`)
        return { ok: true, value: { changed: r.changedIds.length }, warnings }
      },

      // A10: adding a holiday shows affected sessions and can cancel them in one go
      addHoliday: (h, cancelAffected) => {
        const s = get()
        const perm = holidayPerm(s, h.branchId)
        if (!perm.ok) return perm
        const err = Cfg.validateHoliday(h)
        if (err) return fail(err)
        if (s.holidays.some((x) => x.date === h.date && x.branchId === h.branchId)) return fail("มีวันหยุดวันนี้แล้ว")
        const affected = Sch.holidayImpact(h.date, h.branchId, s.sessions, h.openBranchIds)
        set({ holidays: [...s.holidays, { ...h, name: h.name.trim(), id: uid("hol") }], ...closeDay(s, affected, h.name, h.date, cancelAffected, h.branchId) })
        return { ok: true, value: { affected: affected.length } }
      },

      updateHoliday: (id, patch) => {
        const s = get()
        const cur = s.holidays.find((h) => h.id === id)
        if (!cur) return fail("ไม่พบวันหยุด")
        const perm = holidayPerm(s, cur.branchId)
        if (!perm.ok) return perm
        const next = { ...cur, ...patch, name: patch.name.trim() }
        const err = Cfg.validateHoliday(next)
        if (err) return fail(err)
        if (s.holidays.some((x) => x.id !== id && x.date === next.date && x.branchId === next.branchId)) return fail("มีวันหยุดวันนี้แล้ว")
        set({ holidays: s.holidays.map((h) => (h.id === id ? next : h)) })
        return OK
      },

      removeHoliday: (id) => {
        const s = get()
        const cur = s.holidays.find((h) => h.id === id)
        if (!cur) return fail("ไม่พบวันหยุด")
        const perm = holidayPerm(s, cur.branchId)
        if (!perm.ok) return perm
        set({ holidays: s.holidays.filter((h) => h.id !== id) })
        return OK
      },

      setHolidayOpen: (holidayId, branchId, open, cancelAffected) => {
        const s = get()
        const perm = holidayPerm(s, branchId)
        if (!perm.ok) return perm
        const h = s.holidays.find((x) => x.id === holidayId)
        if (!h || h.branchId !== null) return fail("เปิด/ปิดได้เฉพาะวันหยุดของบริษัท — วันหยุดของสาขาให้ลบแทน")
        const openIds = open ? [...new Set([...(h.openBranchIds ?? []), branchId])] : (h.openBranchIds ?? []).filter((x) => x !== branchId)
        // closing again: the day's sessions at this branch are hit, same as adding a holiday
        const affected = open ? [] : Sch.holidayImpact(h.date, branchId, s.sessions)
        set({ holidays: s.holidays.map((x) => (x.id === holidayId ? { ...x, openBranchIds: openIds } : x)), ...closeDay(s, affected, h.name, h.date, cancelAffected, branchId) })
        return { ok: true, value: { affected: affected.length } }
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
        const prev = s.students.find((x) => x.id === st.id)
        set({ students: prev ? s.students.map((x) => (x.id === st.id ? st : x)) : [...s.students, st] })
        if (!prev) log("profile", [st.id], "สร้างนักเรียน", `${st.nickname} · ${st.grade} · สาขา${s.branches.find((b) => b.id === st.createdBranchId)?.name ?? ""}`)
        else {
          const changes = People.studentChanges(prev, st, (id) => s.families.find((f) => f.id === id)?.name ?? "—")
          if (changes.length) log("profile", [st.id], "แก้ข้อมูล", changes.join(" · "))
        }
        return { ok: true, value: st }
      },

      archiveStudent: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("ใส่เหตุผลที่นักเรียนเลิกเรียน")
        const stu = s.students.find((x) => x.id === id)
        if (!stu) return fail("ไม่พบนักเรียน")
        const today = toDateStr(s.now())
        // leaving: out of every class and every session that hasn't started — history stays
        let { classes, sessions } = s
        classes.filter((k) => k.studentIds.includes(id)).forEach((k) => {
          const r = Att.removeFromClass(k, id, sessions, s.now())
          classes = classes.map((c) => (c.id === k.id ? r.klass : c))
          sessions = r.sessions
        })
        sessions = sessions.map((x) => (x.date >= today && x.studentIds.includes(id) && Sch.sessionState(x, s.now()) === "upcoming" ? { ...x, studentIds: x.studentIds.filter((y) => y !== id) } : x))
        set({ students: s.students.map((x) => (x.id === id ? { ...x, archived: { at: s.now().toISOString(), by: s.userId, reason: reason.trim() } } : x)), classes, sessions })
        log("profile", [id], "Archive (เลิกเรียน)", reason.trim())
        return OK
      },

      restoreStudent: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        set({ students: s.students.map((x) => (x.id === id ? { ...x, archived: undefined } : x)) })
        log("profile", [id], "กลับมาเรียน", "ยกเลิก Archive — เพิ่มเข้าคลาสใหม่ได้จากปฏิทิน/ใบแจ้งหนี้")
        return OK
      },

      addStudentNote: (studentId, text) => {
        const s = get()
        if (!can(s.me(), "student.view")) return fail("คุณไม่มีสิทธิ์")
        if (!text.trim()) return fail("พิมพ์โน้ตก่อน")
        set({ notes: [...s.notes, { id: uid("nt"), studentId, by: s.userId, at: s.now().toISOString(), text: text.trim() }] })
        log("note", [studentId], "เพิ่มโน้ต", text.trim().slice(0, 80))
        return OK
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

      saveCourse: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "course.manage")
        if (!perm.ok) return perm
        const branch = s.branches.find((b) => b.id === input.branchId)!
        // blank name → "[Subject + Grade]" default, like staging
        const c: Course = { ...input, name: input.name.trim() || CourseR.defaultCourseName(input.subjects, input.grades), duration: input.unit === "month" ? 1 : input.duration }
        if (!CourseR.needsPriceReason(branch, c)) delete c.priceReason
        const err = CourseR.validateCourse(branch, c)
        if (err) return fail(err)
        set({ courses: s.courses.some((x) => x.id === c.id) ? s.courses.map((x) => (x.id === c.id ? c : x)) : [...s.courses, c] })
        return { ok: true, value: c }
      },

      duplicateCourse: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "course.manage")
        if (!perm.ok) return perm
        const src = s.courses.find((c) => c.id === id)
        if (!src) return fail("ไม่พบคอร์ส")
        const copy: Course = { ...src, id: uid("co"), name: `${src.name} (สำเนา)` }
        set({ courses: [...s.courses, copy] })
        return { ok: true, value: copy }
      },

      saveBranch: (b) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        const err = Cfg.validateBranchInfo(b) ?? Cfg.validateHours(b.hours) ?? Cfg.validateSpecialPeriods(b.specialPeriods) ?? Cfg.validateDurations([...b.packageDurations.hour, ...b.packageDurations.week])
        if (err) return fail(err)
        if (s.branches.some((x) => x.id !== b.id && x.code === b.code)) return fail(`รหัสสาขา ${b.code} ถูกใช้แล้ว`)
        const removedRooms = s.branches.find((x) => x.id === b.id)!.rooms.filter((r) => !b.rooms.some((n) => n.id === r.id))
        const inUse = removedRooms.find((r) => s.sessions.some((x) => x.roomId === r.id && !x.cancelled && x.date >= toDateStr(s.now())))
        if (inUse) return fail(`ลบ${inUse.name}ไม่ได้ — ยังมีคาบที่ใช้ห้องนี้`)
        set({ branches: s.branches.map((x) => (x.id === b.id ? b : x)) })
        return OK
      },

      addBranch: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        const code = input.code.trim().toUpperCase()
        const base = s.branches.find((b) => b.id === s.branchId)!
        const b: Branch = {
          ...base, id: uid("br"), code, name: input.name.trim(), brand: input.brand, active: true,
          email: "", address: "", phones: [], socials: [], rooms: [{ id: uid("rm"), name: "ห้อง 1" }],
          specialPeriods: [], fees: [], promotions: [], priceChart: [], subjects: [], grades: [],
          bankAccount: { bank: "", branchName: "", name: "", number: "" }, lineOaConnected: false, lineOa: { channelId: "", botBasicId: "", addFriendUrl: "" },
        }
        const err = Cfg.validateBranchInfo(b)
        if (err) return fail(err)
        if (s.branches.some((x) => x.code === code)) return fail(`รหัสสาขา ${code} ถูกใช้แล้ว`)
        // the creator must be able to open the new branch from the switcher
        set({ branches: [...s.branches, b], staff: s.staff.map((x) => (x.id === s.userId ? { ...x, branchIds: [...x.branchIds, b.id] } : x)) })
        return { ok: true, value: b }
      },

      setBranchActive: (id, active) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (!active && s.branches.filter((b) => b.active).length <= 1) return fail("ต้องมีสาขาที่เปิดอยู่อย่างน้อย 1 สาขา")
        if (!active && s.sessions.some((x) => x.branchId === id && !x.cancelled && x.date >= toDateStr(s.now()))) return fail("ยังมีคาบในอนาคตที่สาขานี้ — ย้ายหรือยกเลิกก่อนปิดสาขา")
        const next = s.branches.map((b) => (b.id === id ? { ...b, active } : b))
        const fallback = next.find((b) => b.active && s.me().branchIds.includes(b.id))
        set({ branches: next, branchId: !active && s.branchId === id && fallback ? fallback.id : s.branchId })
        return OK
      },

      saveSystem: (sys) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (sys.subjects.some((x) => !x.trim())) return fail("ชื่อวิชาว่างไม่ได้")
        if (new Set(sys.subjects).size !== sys.subjects.length) return fail("มีชื่อวิชาซ้ำ")
        const settings = sys.settings
        if (!(settings.lowSessionThreshold >= 0) || !(settings.renewalDaysBefore >= 0) || !(settings.summaryDeadlineHours > 0)) return fail("ตัวเลขการแจ้งเตือนไม่ถูกต้อง")
        set({ system: sys })
        return OK
      },

      renameSubject: (from, to) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        const name = to.trim()
        if (!name) return fail("ชื่อวิชาว่างไม่ได้")
        if (name !== from && s.system.subjects.includes(name)) return fail(`มีวิชา ${name} อยู่แล้ว`)
        const r = (x: string) => (x === from ? name : x)
        set({
          system: { ...s.system, subjects: s.system.subjects.map(r) },
          branches: s.branches.map((b) => ({ ...b, subjects: b.subjects.map(r), priceChart: b.priceChart.map((p) => ({ ...p, subject: r(p.subject) })) })),
          staff: s.staff.map((x) => ({ ...x, subjects: x.subjects.map(r) })),
          courses: s.courses.map((x) => ({ ...x, subjects: x.subjects.map(r) })),
          classes: s.classes.map((x) => ({ ...x, subject: r(x.subject) })),
          sessions: s.sessions.map((x) => ({ ...x, subject: r(x.subject) })),
          entitlements: s.entitlements.map((x) => ({ ...x, subjects: x.subjects.map(r) })),
          leads: s.leads.map((x) => ({ ...x, subject: r(x.subject) })),
        })
        return OK
      },

      markNotificationsRead: (ids) =>
        set((s) => ({ notifications: s.notifications.map((n) => ((!ids || ids.includes(n.id)) && !n.readBy.includes(s.userId) ? { ...n, readBy: [...n.readBy, s.userId] } : n)) })),

      sendTeamMessage: (target, title, body) => {
        const s = get()
        const err = Notif.validateMessage(target, body)
        if (err) return fail(err)
        const me = s.me()
        const n = Notif.notify({ id: uid("no"), at: s.now(), kind: "message", title: title.trim() || `ข้อความจาก ${me.nickname}`, body: body.trim(), fromId: me.id, audience: Notif.messageAudience(target, s.branchId) })
        set({ notifications: [n, ...s.notifications] })
        return OK
      },
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
            Notif.notify({ id: uid("no"), at: s.now(), kind: "session_cancelled", title: "ยกเลิกคาบเรียน", body: `${cur.subject} ${cur.date} ${cur.start} · นักเรียน ${cur.studentIds.length} คน · ${reason}`, fromId: s.userId, audience: { roles: OFFICE_ROLES, branchId: cur.branchId, staffIds: Sch.teachersOf(cur) } }),
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
        if (!can(me, "session.manage") && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("เช็คชื่อได้เฉพาะคาบที่คุณสอน")
        const r = Att.canMark(se, status, s.now())
        if (!r.ok) return r
        const rest = s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId))
        // C3: summaries only exist for present students; keep text as draft instead of deleting silently
        set({ attendance: [...rest, { sessionId, studentId, status, markedBy: me.id, markedAt: s.now().toISOString() }] })
        const before = s.attendance.find((a) => a.sessionId === sessionId && a.studentId === studentId)
        const L = { present: "มา", absent: "ขาด", leave: "ลา" } as const
        log("attendance", [studentId], before ? "แก้การเช็คชื่อ" : "เช็คชื่อ", `${se.subject} ${fmtDate(se.date)} ${se.start} · ${before ? `${L[before.status]} → ` : ""}${L[status]}`)
        // C5: leave beyond quota is allowed but flagged (quota rule awaiting owner confirmation)
        if (status === "leave") {
          const ent = Att.coveringEntitlement(studentId, se, s.entitlements)
          if (ent && Att.leavesUsed(ent, s.sessions, s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId)), s.leaves) >= Att.leaveQuota(ent))
            return { ok: true, value: undefined, warnings: [`ลาเกินโควตาแล้ว (โควตา ${Att.leaveQuota(ent)} ครั้ง) — แจ้งผู้ปกครองเรื่องการชดเชย`] }
        }
        return OK
      },

      saveStudentLeave: (input) => {
        const s = get()
        const me = s.me()
        const r = Att.canSaveLeave(me, input.from, input.to, input.reason)
        if (!r.ok) return r
        const stu = s.students.find((x) => x.id === input.studentId)
        if (!stu) return fail("ไม่พบนักเรียน")
        const now = s.now()
        const editing = input.id ? s.leaves.find((l) => l.id === input.id) : undefined
        const rec = editing
          ? { ...editing, from: input.from, to: input.to, reason: input.reason.trim(), updatedBy: me.id, updatedAt: now.toISOString() }
          : { id: uid("lv"), studentId: input.studentId, from: input.from, to: input.to, reason: input.reason.trim(), createdBy: me.id, createdAt: now.toISOString() }
        const teacherIds = People.teachersOfStudent(input.studentId, s.sessions, toDateStr(now))
        set({
          leaves: editing ? s.leaves.map((l) => (l.id === rec.id ? rec : l)) : [rec, ...s.leaves],
          notifications: [
            Notif.notify({
              id: uid("no"), at: now, kind: "student_leave",
              title: editing ? "แก้ไขการลาไม่หักโควตา" : "บันทึกการลาไม่หักโควตา",
              body: `${stu.nickname} ลา ${fmtDate(input.from)} – ${fmtDate(input.to)} · ${input.reason.trim()}`,
              fromId: me.id, audience: { roles: ["manager"], branchId: stu.branchId, staffIds: teacherIds },
            }),
            ...s.notifications,
          ],
        })
        log("attendance", [input.studentId], editing ? "แก้ลาพักยาว" : "บันทึกลาพักยาว", `${fmtDate(input.from)} – ${fmtDate(input.to, { year: true })} · ${input.reason.trim()}`)
        return OK
      },

      clearMark: (sessionId, studentId) => {
        const s = get()
        const me = s.me()
        const se = s.sessions.find((x) => x.id === sessionId)!
        if (!can(me, "session.manage") && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("แก้การเช็คชื่อได้เฉพาะคาบที่คุณสอน")
        const r = Att.canClear(se, s.now())
        if (!r.ok) return r
        set({ attendance: s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId)) })
        log("attendance", [studentId], "ล้างการเช็คชื่อ", `${se.subject} ${fmtDate(se.date)} ${se.start}`)
        return OK
      },

      removeStudentFromClass: (classId, studentId) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        const k = s.classes.find((c) => c.id === classId)!
        const r = Att.removeFromClass(k, studentId, s.sessions, s.now())
        set({ classes: s.classes.map((c) => (c.id === classId ? r.klass : c)), sessions: r.sessions })
        log("class", [studentId], "ออกจากคลาส", `${k.name} · ${r.removedFrom} คาบที่ยังไม่เริ่ม`)
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
        const se = s.sessions.find((x) => x.id === sessionId)
        if (!can(me, "session.manage") && se && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("เขียนสรุปได้เฉพาะคาบที่คุณสอน")
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

      approveSummary: (id, forceRemark) => {
        const s = get()
        const cur = s.summaries.find((x) => x.id === id)!
        const forced = forceRemark !== undefined
        const r = forced ? Sum.canForceApprove(cur, s.me(), forceRemark) : Sum.canApprove(cur, s.me())
        if (!r.ok) return r
        const event = { at: s.now().toISOString(), by: s.userId, action: forced ? ("force_approve" as const) : ("approve" as const), note: forced ? forceRemark.trim() : undefined }
        const se = s.sessions.find((x) => x.id === cur.sessionId)
        const stu = s.students.find((x) => x.id === cur.studentId)
        set({
          summaries: s.summaries.map((x) => (x.id === id ? { ...x, status: "approved", history: [...x.history, event] } : x)),
          notifications: forced && se
            ? [forceNotice(s, se.branchId, "สรุปการเรียน", `${stu?.nickname ?? ""} · ${se.subject} ${fmtDate(se.date)}`, forceRemark), ...s.notifications]
            : s.notifications,
        })
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
        log("attendance", [cur.studentId], "ส่งสรุปการเรียน", "ส่งถึงผู้ปกครองทาง LINE")
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
        log("billing", [inv.studentId], existing ? "แก้ใบแจ้งหนี้" : "สร้างใบแจ้งหนี้", `${inv.number ?? "ร่าง"} · ${fmtMoney(totals.total)}`)
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
              ? [Notif.notify({ id: uid("no"), at: new Date(), kind: "approval_needed", title: "ใบแจ้งหนี้รออนุมัติ", body: `${number} รอคนอนุมัติ (ไม่ใช่คนสร้าง)`, fromId: inv.createdBy, audience: { roles: Bill.APPROVER_ROLES, branchId: inv.branchId } }), ...st.notifications]
              : st.notifications,
          }))
        }, 1800)
        return { ok: true, value: { number } }
      },

      approveInvoice: (id, forceRemark) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === id)!
        const forced = forceRemark !== undefined
        const r = forced ? Bill.canForceApprove(inv, s.me(), forceRemark) : Bill.canApprove(inv, s.me())
        if (!r.ok) return r
        set({
          invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: "approved", approvedBy: s.userId, forced: forced ? { by: s.userId, at: s.now().toISOString(), remark: forceRemark.trim() } : undefined } : x)),
          notifications: forced ? [forceNotice(s, inv.branchId, "ใบแจ้งหนี้", inv.number ?? "", forceRemark), ...s.notifications] : s.notifications,
        })
        log("billing", [inv.studentId], forced ? "Force Approve ใบแจ้งหนี้" : "อนุมัติใบแจ้งหนี้", `${inv.number}${forced ? ` · เหตุผล: ${forceRemark!.trim()}` : ""}`)
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
        log("billing", [inv.studentId], "ส่งใบแจ้งหนี้", `${inv.number} · ${delivered ? "ส่งทาง LINE แล้ว" : "ยังไม่ถึงผู้ปกครอง (ไม่มี LINE)"}`)
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
        log("billing", [inv.studentId], "ยกเลิกใบแจ้งหนี้", `${inv.number ?? "ร่าง"} · ${reason}`)
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

      confirmPayment: (invoiceId, paymentId, forceRemark) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === invoiceId)!
        const pay = inv.payments.find((p) => p.id === paymentId)!
        const forced = forceRemark !== undefined
        const r = forced ? Bill.canForceConfirmPayment(pay, s.me(), inv.branchId, forceRemark) : Bill.canConfirmPayment(pay, s.me(), inv.branchId)
        if (!r.ok) return r
        const payments = inv.payments.map((p) =>
          p.id === paymentId ? { ...p, confirmedBy: s.userId, forced: forced ? { by: s.userId, at: s.now().toISOString(), remark: forceRemark.trim() } : undefined } : p,
        )
        if (forced) set({ notifications: [forceNotice(s, inv.branchId, "ยืนยันยอดเงิน", `${inv.number ?? ""} · ${fmtMoney(pay.amount)}`, forceRemark), ...s.notifications] })
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
            const co = s.courses.find((c) => c.id === inv.course!.courseId)!
            // hour packs are counted; week and month packs are a window with any number of sessions
            entitlements = [...entitlements, { id: uid("en"), studentId: inv.studentId, courseId: co.id, subjects: co.subjects, classId: inv.course.classId, invoiceId: inv.id, kind: co.unit === "hour" ? "sessions" : "subscription", from: q.from, to: q.to, sessionsTotal: q.sessions.length }]
            classes = classes.map((c) => (c.id === inv.course!.classId && !c.studentIds.includes(inv.studentId) ? { ...c, studentIds: [...c.studentIds, inv.studentId] } : c))
            sessions = sessions.map((x) => (x.classId === inv.course!.classId && q.sessions.includes(x.date) && !x.studentIds.includes(inv.studentId) ? { ...x, studentIds: [...x.studentIds, inv.studentId] } : x))
          }
        }
        set({ invoices: s.invoices.map((x) => (x.id === invoiceId ? next : x)), entitlements, classes, sessions })
        log("billing", [inv.studentId], forced ? "Force ยืนยันยอดเงิน" : "ยืนยันยอดเงิน", `${inv.number} · ${fmtMoney(pay.amount)}${forced ? ` · เหตุผล: ${forceRemark!.trim()}` : ""}`)
        if (paid) log("billing", [inv.studentId], "ชำระครบ", `${inv.number} · ออกใบเสร็จ ${next.receiptNumber}${inv.course ? " · ระบบเพิ่มเข้าคลาสอัตโนมัติ" : ""}`, true)
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
        const trial = lead.trialStudentId ? s.students.find((x) => x.id === lead.trialStudentId) : undefined
        let studentId: ID
        if (trial) {
          // reuse the Student created at test/trial approval time instead of creating a duplicate
          studentId = trial.id
          if (!trial.familyId) {
            const familyId = ensureLeadFamily(lead, { studentName: trial.name })
            set((cur) => ({ students: cur.students.map((x) => (x.id === trial.id ? { ...x, familyId } : x)) }))
          }
        } else {
          const student: Student = { id: uid("stu"), familyId: null, branchId: lead.branchId, name: lead.name, nickname: People.nicknameFrom(lead.name), grade: lead.childGrade, usesBus: false, createdAt: s.now().toISOString(), createdBranchId: lead.branchId }
          const errs = People.validateStudent(student, toDateStr(s.now()))
          if (errs.length) return fail(errs[0].message)
          student.familyId = ensureLeadFamily(lead, { studentName: lead.name })
          studentId = student.id
          set((cur) => ({ students: [...cur.students, student] }))
        }
        set((cur) => ({ leads: cur.leads.map((x) => (x.id === id ? { ...x, stage: "enrolled", convertedStudentId: studentId } : x)) }))
        log("profile", [studentId], "แปลงจาก Lead", `${lead.name} · ${lead.phone}`)
        return { ok: true, value: { studentId } }
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
          const student: Student = { id: uid("stu"), familyId: null, branchId: lead.branchId, name: primary.studentName, nickname: People.nicknameFrom(primary.studentName), grade: primary.studentGrade, usesBus: false, createdAt: s.now().toISOString(), createdBranchId: lead.branchId }
          const errs = People.validateStudent(student, toDateStr(s.now()))
          if (errs.length) return fail(errs[0].message)
          student.familyId = ensureLeadFamily(lead, primary)
          studentId = student.id
          set((cur) => ({ students: [...cur.students, student] }))
          log("profile", [student.id], "สร้างนักเรียน", `จากฟอร์ม${Forms.FORM_TYPE_LABEL[primary.type]} · Lead ${lead.name} · ${student.grade}`)
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
    }
    },
    {
      name: "nockerp-v2",
      // bump when the data model changes; older saved data is replaced by fresh sample data
      version: 26,
      migrate: () => ({ ...buildSeed(), userId: "u_nock", branchId: "br_thl", clockOffset: 0 }) as unknown as Store,
      // persist data + UI state only, never the action functions
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")) as Partial<Store>,
    },
  ),
)

/** Convenience: current user */
export const useMe = () => useStore((s) => s.staff.find((x) => x.id === s.userId)!)
