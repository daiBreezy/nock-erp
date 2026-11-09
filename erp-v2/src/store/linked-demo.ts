import { addDays, toDateStr } from "../domain/dates"
import type { Attendance, Branch, Course, CourseSummary, Entitlement, Family, Invoice, Klass, LessonSummary, Session, Student } from "../domain/types"

type Db = { branches: Branch[]; courses: Course[]; classes: Klass[]; sessions: Session[]; attendance: Attendance[]; summaries: LessonSummary[]; courseSummaries?: CourseSummary[]; families: Family[]; students: Student[]; entitlements: Entitlement[]; invoices: Invoice[] }

// owner 2026-11-09: session notes are LONG in real life (5-10 lines on a phone) - the demo ones are too, so the parent app's rows are judged at real length
const NOTES = [
  "วันนี้เรียนเรื่องเศษส่วนต่อจากคาบที่แล้ว น้องเข้าใจเรื่องการเปรียบเทียบเศษส่วนที่ตัวส่วนต่างกันได้ดีขึ้นมาก ทำแบบฝึกหัดหน้า 12–15 ได้ครบทุกข้อและตรวจคำตอบด้วยตัวเองก่อนส่ง\nช่วงกลางคาบมีโจทย์ปัญหาคำพูดที่ต้องแปลงเป็นเศษส่วนก่อน น้องอ่านโจทย์ช้าลงและขีดเส้นใต้ตัวเลขสำคัญ ซึ่งเป็นวิธีที่ครูแนะนำไว้ ได้ผลดีมากค่ะ\nสิ่งที่ยังต้องฝึกคือการทอนเศษส่วนให้เป็นอย่างต่ำ บางข้อยังลืมตรวจว่าหารต่อได้อีกไหม ฝากทบทวนที่บ้านวันละ 5 ข้อ\nการบ้านวันนี้: แบบฝึกหัดหน้า 16 ข้อ 1–10 และลองสร้างโจทย์เศษส่วนจากของใช้ในบ้านให้ครูดูหนึ่งข้อ\nโดยรวมวันนี้น้องตั้งใจเรียนมาก มีสมาธิตลอดคาบ และกล้าถามเมื่อไม่เข้าใจ",
  "คาบนี้ทบทวนคำศัพท์ Unit 4 และฝึกอ่านบทสั้นๆ เกี่ยวกับกิจวัตรประจำวัน น้องอ่านออกเสียงชัดขึ้นกว่าสัปดาห์ก่อนอย่างเห็นได้ชัด และกล้าตอบคำถามเป็นภาษาอังกฤษเต็มประโยค\nยังสะกดคำศัพท์ใหม่ผิดบ้าง เช่น vegetable และ breakfast ให้ลองเขียนซ้ำคำละ 5 รอบแล้วทดสอบตัวเอง\nช่วงท้ายคาบทำเกมทายคำศัพท์เป็นกลุ่ม น้องสนุกและช่วยเพื่อนในกลุ่มด้วย เป็นพฤติกรรมที่ดีมากค่ะ\nการบ้าน: Workbook หน้า 20–21 และท่องคำศัพท์ 15 คำที่ครูแจกให้",
  "วันนี้ฝึกทำโจทย์ปัญหาแบบหลายขั้นตอน น้องทำเองได้เกือบทุกข้อโดยไม่ต้องให้ครูช่วย ตรวจคำตอบละเอียดขึ้น และเริ่มอธิบายวิธีคิดของตัวเองให้ครูฟังได้\nช่วงท้ายคาบน้องเริ่มเหนื่อยและเสียสมาธิบ้าง ครูให้พักสั้นๆ แล้วกลับมาทำต่อได้ดี\nแนะนำให้นอนพักผ่อนให้เพียงพอก่อนวันเรียนค่ะ",
]

// owner 2026-11-09: a LONG course reading (about 14 lines on a phone) for the demo course summary
const COURSE_OVERALL = [
  "ตลอดคอร์สที่ผ่านมา น้องมีพัฒนาการที่ดีขึ้นอย่างต่อเนื่องทั้งความเข้าใจและความมั่นใจในการเรียน ช่วงแรกยังลังเลเวลาตอบคำถามในห้อง แต่ตอนนี้กล้ายกมือและอธิบายวิธีคิดของตัวเองให้เพื่อนฟังได้แล้วค่ะ",
  "ด้านคณิตศาสตร์ น้องเข้าใจเรื่องเศษส่วนและการเปรียบเทียบตัวเลขดีขึ้นมาก ทำโจทย์ปัญหาหลายขั้นตอนได้เองเกือบทุกข้อ และเริ่มตรวจคำตอบด้วยตัวเองก่อนส่งทุกครั้ง สิ่งที่ยังต้องฝึกคือการทอนเศษส่วนให้เป็นอย่างต่ำและการอ่านโจทย์ให้ครบก่อนลงมือคิด",
  "ด้านภาษาอังกฤษ น้องอ่านออกเสียงชัดขึ้นและจำคำศัพท์ได้เร็วขึ้น เล่นเกมคำศัพท์กับเพื่อนอย่างสนุก ยังสะกดคำศัพท์ยาวผิดบ้าง แต่แก้ได้เองเมื่อครูชี้ให้ดู ซึ่งเป็นสัญญาณที่ดี",
  "ด้านพฤติกรรมการเรียน น้องตั้งใจ มีสมาธิตลอดคาบส่วนใหญ่ ส่งงานครบเกือบทุกครั้ง และช่วยเพื่อนในกลุ่มเสมอ ช่วงท้ายคาบบางวันจะเริ่มเหนื่อย แนะนำให้นอนพักผ่อนให้เพียงพอ",
  "ครูแนะนำให้ต่อคอร์สถัดไปเพื่อต่อยอดความรู้ที่สร้างไว้ และเพิ่มการฝึกที่บ้านวันละ 10–15 นาที จะช่วยให้พัฒนาไปได้เร็วขึ้นอีกมากค่ะ",
].join("\n")

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
      return { id: `sum_demo_${s.id}`, sessionId: s.id, studentId: sid, text: NOTES[i % NOTES.length], level: 4, status: "sent", authorId: by, lastEditorId: by,
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
    const courseSummaries: CourseSummary[] = csEnt ? [{
      id: `cs_demo_${fam.id}`, entitlementId: csEnt.id, studentId: sid, status: "sent", authorId: "u_dai", lastEditorId: "u_dai",
      overallProgress: COURSE_OVERALL, strengths: "ตั้งใจเรียน มีสมาธิตลอดคาบ · กล้าถามเมื่อไม่เข้าใจ · ตรวจงานตัวเองก่อนส่ง", toImprove: "ฝึกทอนเศษส่วนให้เป็นอย่างต่ำ · ทบทวนคำศัพท์ใหม่ทุกวันก่อนนอน · อ่านบทความภาษาอังกฤษที่ยาวขึ้นสัปดาห์ละ 1–2 เรื่อง",
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
