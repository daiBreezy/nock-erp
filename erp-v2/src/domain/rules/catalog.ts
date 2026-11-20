import type { CatalogCourse, Course, EnrollClassOffer, ID, Klass, PriceUnit } from "../types"
import { enrollClassOffers } from "./forms"

// Course catalog (owner 2026-10-22): the admin sends it (or the parent opens it from the LINE Rich Menu); the parent
// filters by grade / subject, sees each course's starting price and the classes that teach it (day, time, seats left),
// and taps "สนใจ" / "ขอนัดทดลองเรียน" (lands in the admin's chat) or "สมัครเรียน" (the enroll form for that class).

/** a class teaches a course when it is linked to it; a course with no linked class borrows the classes of the same
 *  subjects / format that share a grade with it (and belong to no other course) */
export function classesOfCourse(course: Pick<Course, "id" | "subjects" | "grades" | "format">, classes: Pick<Klass, "id" | "courseId" | "subject" | "subjects" | "grades" | "type">[]): ID[] {
  const linked = classes.filter((k) => k.courseId === course.id)
  if (linked.length) return linked.map((k) => k.id)
  const subs = (k: (typeof classes)[number]) => (k.subjects?.length ? k.subjects : [k.subject])
  return classes.filter((k) => !k.courseId && k.type === course.format && subs(k).length === course.subjects.length && course.subjects.every((s) => subs(k).includes(s)) && k.grades.some((g) => course.grades.includes(g))).map((k) => k.id)
}

/** the catalog's courses + classes for a branch — active learning courses still on sale, their classes with seats */
export function buildCatalog(courses: Course[], classes: Klass[], branchId: ID, today: string, teacherName: (id: ID) => string): { courses: CatalogCourse[]; classes: EnrollClassOffer[] } {
  const offers = enrollClassOffers(classes, branchId, teacherName)
  const live = classes.filter((k) => offers.some((o) => o.id === k.id))
  const list = courses
    .filter((c) => c.branchId === branchId && c.active && (!c.to || c.to >= today) && !c.periodId)
    .map((c) => ({ id: c.id, name: c.name, subjects: c.subjects, grades: c.grades, format: c.format, unit: c.unit, duration: c.duration, price: c.price + (c.courseFee ?? 0), classIds: classesOfCourse(c, live) }))
    .sort((a, b) => a.subjects[0].localeCompare(b.subjects[0], "th") || a.price - b.price)
  return { courses: list, classes: offers }
}

/** what the parent picked as filters → the courses to show (a grade matches when the course teaches it) */
export function filterCatalog(courses: CatalogCourse[], f: { grade?: string; subject?: string }) {
  return courses.filter((c) => (!f.grade || c.grades.includes(f.grade)) && (!f.subject || c.subjects.includes(f.subject)))
}

const UNIT_LABEL: Record<PriceUnit, (n: number) => string> = { hour: (n) => `${n} ชม.`, week: (n) => `${n} สัปดาห์`, month: () => "เดือน" }
/** "เริ่มต้น 4,350 บาท / เดือน" */
export const priceLabel = (c: Pick<CatalogCourse, "price" | "unit" | "duration">) => `เริ่มต้น ${c.price.toLocaleString("en-US")} บาท / ${UNIT_LABEL[c.unit](c.duration)}`

export const DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
export const endTime = (start: string, minutes: number) => { const m = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) + minutes; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` }
/** "ทุก ส. 10:00–11:30" */
export const classWhen = (k: Pick<EnrollClassOffer, "weekday" | "start" | "minutes">) => `ทุก ${DAY[k.weekday]} ${k.start}–${endTime(k.start, k.minutes)}`

/** the line that lands in the admin's chat when the parent taps a button */
export function requestText(action: "interest" | "trial", k: Pick<EnrollClassOffer, "name" | "weekday" | "start" | "minutes">, course?: Pick<CatalogCourse, "name">) {
  return `${action === "trial" ? "📅 ขอนัดทดลองเรียน" : "📚 สนใจคลาสนี้"}: ${k.name} · ${classWhen(k)}${course ? ` (${course.name})` : ""}`
}

/** one thing a parent tapped "interested" on in the catalog — what the Lead panel keeps (owner 2026-11-19) */
export interface CatalogInterest {
  id: string
  at: string
  action: "interest" | "trial"
  subjects: string[]
  grades: string[]
  /** the course (package) — "" when the parent tapped a class that has none */
  course: string
  /** the class and when it meets — "" when the course has no class yet */
  className: string
  when: string
  /** owner 2026-11-20: the ids — so the Lead panel can tick several and send ONE form, and the course list can mark what the parent asked about */
  courseId: string | null
  classId: string | null
}

/**
 * Every catalog tap in a conversation, newest first. Tapping the same class (or course) again is one line (the latest tap), a Trial request
 * beats an "interested". Grades/course come from the message, or — for older messages — from the school's classes + courses.
 */
export function catalogInterests(
  messages: ReadonlyArray<{ id: string; at: string; meta?: unknown }>,
  lookup: { classes: ReadonlyArray<{ id: string; grades: string[]; courseId: string | null }>; courses: ReadonlyArray<{ id: string; name: string; grades: string[] }> },
): CatalogInterest[] {
  const out = new Map<string, CatalogInterest>()
  for (const m of [...messages].sort((a, b) => a.at.localeCompare(b.at))) {
    const meta = m.meta as { formKind?: string; action?: "interest" | "trial"; classId?: string; courseId?: string; className?: string; subjects?: string[]; grades?: string[]; when?: string } | undefined
    if (meta?.formKind !== "catalog_request") continue
    const k = lookup.classes.find((c) => c.id === meta.classId)
    const course = lookup.courses.find((c) => c.id === (meta.courseId || k?.courseId))
    const key = meta.classId || `course:${meta.courseId ?? meta.className}`
    const prev = out.get(key)
    const action = prev?.action === "trial" || meta.action === "trial" ? "trial" : "interest"
    out.set(key, {
      id: m.id, at: m.at, action, subjects: meta.subjects ?? [], grades: meta.grades?.length ? meta.grades : k?.grades ?? course?.grades ?? [],
      course: course?.name ?? (meta.classId ? "" : meta.className ?? ""), className: meta.classId ? meta.className ?? "" : "", when: meta.classId ? meta.when ?? "" : "",
      courseId: course?.id ?? null, classId: meta.classId ?? null,
    })
  }
  return [...out.values()].sort((a, b) => b.at.localeCompare(a.at))
}
