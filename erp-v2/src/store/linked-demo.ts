import { addDays, toDateStr } from "../domain/dates"
import { entitlementRounds } from "../domain/rules/summaries"
import { sampleCourseTexts, sampleSessionNote } from "../data/course-sample-texts"
import type { Attendance, Branch, Course, CourseSummary, Entitlement, Family, Invoice, Klass, LessonSummary, Session, Student } from "../domain/types"

type Db = { branches: Branch[]; courses: Course[]; classes: Klass[]; sessions: Session[]; attendance: Attendance[]; summaries: LessonSummary[]; courseSummaries?: CourseSummary[]; families: Family[]; students: Student[]; entitlements: Entitlement[]; invoices: Invoice[] }

/**
 * Owner 2026-10-19 ("ใส่ Mockup data … อยากเห็นว่าเวลาเปิดแล้วเห็นว่ามี Class เรียนไหมบ้าง"): a family linked to a real
 * LINE account (the owner's own phone) whose children have no class coming up gets one active demo child — enrolled in
 * two real weekly classes with a package, past check-ins, sent session notes and (Liclass) bus days — so the parent app
 * opened from the Rich Menu shows a real schedule. Runs after every reseed, only for LINE-linked families.
 */
export function withLinkedFamilyDemo<T extends Db>(db: T, now = new Date()): T {
  const today = toDateStr(now)
  let out = db
  for (const fam of db.families.filter((f) => f.lineUserId)) {
    const kids = out.students.filter((s) => s.familyId === fam.id)
    const busy = kids.some((k) => !k.archived && out.sessions.some((s) => s.date >= today && s.studentIds.includes(k.id)))
    if (busy) continue
    const branch = out.branches.find((b) => b.id === kids[0]?.branchId) ?? out.branches[0]
    // two weekly classes on different days, with sessions ahead and a free seat
    const ahead = (k: Klass) => out.sessions.filter((s) => s.classId === k.id && s.date >= today && !s.cancelled).length
    const pool = out.classes.filter((k) => k.branchId === branch.id && k.active && k.kind === "learning" && !k.periodId && k.courseId && ahead(k) >= 2 && k.studentIds.length < 8)
    const first = pool[0]
    if (!first) continue
    const second = pool.find((k) => k.weekday !== first.weekday && k.subject !== first.subject) ?? pool.find((k) => k.weekday !== first.weekday)
    const picked = [first, ...(second ? [second] : [])]
    const sid = `stu_demo_${fam.id}`
    const surname = fam.parents[0]?.name.split(" ").slice(1).join(" ") || fam.name.replace(/^ครอบครัว/, "")
    const liclass = branch.brand === "liclass"
    const child: Student = {
      id: sid, familyId: fam.id, branchId: branch.id, name: `ด.ญ. ใบเฟิร์น ${surname}`.trim(), nickname: "ใบเฟิร์น", nicknameEn: "Fern", nameEn: "Fern",
      grade: first.grades[0] ?? "ป.5", usesBus: liclass, createdAt: `${addDays(today, -40)}T10:00:00.000Z`, createdBranchId: branch.id,
    }
    const from = addDays(today, -35), to = addDays(today, 55)
    const ids = new Set(picked.map((k) => k.id))
    const sessions = out.sessions.map((s) => (s.classId && ids.has(s.classId) && s.date >= from && !s.studentIds.includes(sid) ? { ...s, studentIds: [...s.studentIds, sid] } : s))
    const mine = sessions.filter((s) => s.classId && ids.has(s.classId) && s.date >= from && !s.cancelled).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    const past = mine.filter((s) => s.date < today)
    const attendance: Attendance[] = past.map((s, i) => ({ sessionId: s.id, studentId: sid, status: i === past.length - 3 ? "leave" : "present", markedBy: "u_ploy", markedAt: `${s.date}T12:00:00.000Z` }))
    const summaries: LessonSummary[] = past.filter((_, i) => i !== past.length - 3).slice(-6).map((s, i) => {
      const by = s.teacherId ?? "u_dai", at = `${s.date}T13:00:00.000Z`
      return { id: `sum_demo_${s.id}`, sessionId: s.id, studentId: sid, text: sampleSessionNote(s.subject, i), level: 4, status: "sent", authorId: by, lastEditorId: by,
        history: [{ at, by, action: "submit" }, { at, by: "u_nock", action: "approve" }, { at, by: "u_ploy", action: "send" }] }
    })
    const invoices: Invoice[] = [], entitlements: Entitlement[] = []
    picked.forEach((k, i) => {
      const course = out.courses.find((c) => c.id === k.courseId)
      if (!course) return
      const invId = `inv_demo_${fam.id}_${i}`
      // the bus on the first class's days only — the other days are open to ask for a ride (owner 2026-10-19)
      const bus = liclass && i === 0 ? mine.filter((s) => s.date >= today && s.classId === k.id).map((s) => ({ date: s.date, pickup: true, dropoff: true })) : []
      invoices.push({
        id: invId, branchId: branch.id, studentId: sid, number: null, lines: [{ id: `ln_demo_${fam.id}_${i}`, courseId: course.id, classIds: [k.id], startDate: from, periods: 3 }],
        bus, busFeeId: liclass ? branch.fees.find((f) => f.kind === "bus")?.id ?? null : null, bookFee: 0, advance: [], concession: null, noteToParent: "",
        status: "paid", pdf: "ready", createdBy: "u_ploy", createdAt: `${addDays(from, -2)}T10:00:00.000Z`, approvedBy: "u_nock", sentAt: `${addDays(from, -2)}T10:00:00.000Z`, delivery: "delivered",
        payments: [{ id: `pay_demo_${fam.id}_${i}`, amount: course.price * 3, method: "transfer", reference: "", recordedBy: "u_ploy", recordedAt: `${addDays(from, -1)}T11:00:00.000Z`, confirmedBy: "u_nock" }],
      })
      entitlements.push({ id: `en_demo_${fam.id}_${i}`, studentId: sid, courseId: course.id, subjects: course.subjects, classIds: [k.id], invoiceId: invId,
        kind: course.unit === "hour" ? "sessions" : "subscription", from, to, sessionsTotal: 12 })
    })
    // owner 2026-11-09: a SENT course summary with a long reading, so the parent app's course-summary page can be seen at real length
    const csEnt = entitlements[0]
    const demoTexts = sampleCourseTexts(out.courses.find((c) => c.id === csEnt?.courseId)?.subjects[0])
    const courseSummaries: CourseSummary[] = csEnt ? [{
      id: `cs_demo_${fam.id}`, entitlementId: csEnt.id, studentId: sid, status: "sent", authorId: "u_dai", lastEditorId: "u_dai",
      overallProgress: demoTexts.overall, strengths: demoTexts.strengths, toImprove: demoTexts.improve,
      history: [{ at: `${today}T09:00:00.000Z`, by: "u_dai", action: "submit" }, { at: `${today}T10:00:00.000Z`, by: "u_nock", action: "approve" }, { at: `${today}T11:00:00.000Z`, by: "u_ploy", action: "send" }],
    }] : []
    out = {
      ...out, sessions,
      courseSummaries: [...(out.courseSummaries ?? []), ...courseSummaries],
      classes: out.classes.map((k) => (ids.has(k.id) ? { ...k, studentIds: [...k.studentIds, sid] } : k)),
      students: [...out.students, child],
      attendance: [...out.attendance, ...attendance],
      summaries: [...out.summaries, ...summaries],
      invoices: [...out.invoices, ...invoices],
      entitlements: [...out.entitlements, ...entitlements],
    }
  }
  return out
}

/**
 * Owner 2026-11-09 ("ทำให้ครอบครัว Breezy ที่กู Link กับไลน์ไว้ มี Course Summary ให้หน่อย"): every family linked to a real LINE account
 * gets ONE sent, long Course Summary — on its newest FINISHED course round, else its newest running one — so the parent app opened from
 * the Rich Menu shows the page. Saved data is kept (this runs on load, idempotent): a family that already has a sent summary is left alone,
 * a not-yet-sent summary on the chosen round is replaced.
 */
export function withLinkedCourseSummary<T extends { families: Family[]; students: Student[]; entitlements: Entitlement[]; courses?: Course[]; courseSummaries?: CourseSummary[] }>(db: T, now = new Date()): T {
  const textsFor = (courseId?: string) => sampleCourseTexts(db.courses?.find((c) => c.id === courseId)?.subjects[0])
  const today = toDateStr(now)
  const made: CourseSummary[] = []
  const replace = new Set<string>()
  const refreshed = new Map<string, CourseSummary>()
  for (const fam of db.families.filter((f) => f.lineUserId)) {
    const kids = db.students.filter((x) => x.familyId === fam.id && !x.archived)
    const kidIds = new Set(kids.map((k) => k.id))
    const sentOnes = (db.courseSummaries ?? []).filter((c) => c.status === "sent" && kidIds.has(c.studentId))
    if (sentOnes.length) {
      // the demo one follows the current sample texts; a real, teacher-written one is never touched
      const demo = sentOnes.find((c) => c.id === `cs_demo_${fam.id}`)
      const tx = demo ? textsFor(db.entitlements.find((e) => e.id === demo.entitlementId)?.courseId) : null
      if (demo && tx && (demo.overallProgress !== tx.overall || demo.strengths !== tx.strengths || demo.toImprove !== tx.improve)) refreshed.set(demo.id, { ...demo, overallProgress: tx.overall, strengths: tx.strengths, toImprove: tx.improve })
      continue
    }
    const rounds = kids.flatMap((k) => entitlementRounds(db.entitlements.filter((e) => e.studentId === k.id)))
    const newest = (a: { to: string }, b: { to: string }) => b.to.localeCompare(a.to)
    const pick = rounds.filter((r) => r.to < today).sort(newest)[0] ?? [...rounds].sort(newest)[0]
    if (!pick) continue
    replace.add(pick.representativeId)
    made.push({
      id: `cs_demo_${fam.id}`, entitlementId: pick.representativeId, studentId: pick.studentId, status: "sent", authorId: "u_dai", lastEditorId: "u_dai",
      overallProgress: textsFor(pick.courseId).overall, strengths: textsFor(pick.courseId).strengths, toImprove: textsFor(pick.courseId).improve,
      history: [{ at: `${today}T09:00:00.000Z`, by: "u_dai", action: "submit" }, { at: `${today}T10:00:00.000Z`, by: "u_nock", action: "approve" }, { at: `${today}T11:00:00.000Z`, by: "u_ploy", action: "send" }],
    })
  }
  if (!made.length && !refreshed.size) return db
  return { ...db, courseSummaries: [...(db.courseSummaries ?? []).map((c) => refreshed.get(c.id) ?? c).filter((c) => !replace.has(c.entitlementId) && !made.some((m) => m.id === c.id)), ...made] }
}
