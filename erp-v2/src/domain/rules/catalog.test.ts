import { describe, expect, it } from "vitest"
import type { Course, Klass } from "../types"
import { buildCatalog, classWhen, classesOfCourse, filterCatalog, priceLabel, requestText } from "./catalog"

const course = (id: string, o: Partial<Course> = {}) =>
  ({ id, branchId: "b", name: id, kind: "learning", format: "group", subjects: ["Math"], grades: ["P4"], unit: "month", duration: 1, price: 4000, courseFee: 0, active: true, ...o }) as Course
const klass = (id: string, o: Partial<Klass> = {}) =>
  ({ id, branchId: "b", name: id, subject: "Math", grades: ["P4"], kind: "learning", type: "group", courseId: null, teacherId: null, coTeacherIds: [], roomId: null, weekday: 6, start: "10:00", minutes: 90, startDate: "2026-10-01", active: true, studentIds: [], ...o }) as Klass

describe("course catalog (owner 2026-10-22)", () => {
  it("a course shows its linked classes; without links it borrows same subject / format / grade classes", () => {
    const ks = [klass("linked", { courseId: "c1" }), klass("same"), klass("other-grade", { grades: ["M1"] }), klass("single", { type: "single" }), klass("two", { subjects: ["Math", "Sci"] })]
    expect(classesOfCourse(course("c1"), ks)).toEqual(["linked"])
    expect(classesOfCourse(course("c2"), ks)).toEqual(["same"])
  })

  it("only active, on-sale learning courses of the branch; price includes the course fee", () => {
    const cs = [course("ok", { courseFee: 350 }), course("off", { active: false }), course("ended", { to: "2026-01-01" }), course("other", { branchId: "x" }), course("camp", { periodId: "p" } as Partial<Course>)]
    const r = buildCatalog(cs, [klass("k")], "b", "2026-10-22", () => "")
    expect(r.courses.map((c) => c.id)).toEqual(["ok"])
    expect(r.courses[0]).toMatchObject({ price: 4350, classIds: ["k"] })
    expect(r.classes[0].seatsLeft).toBeGreaterThan(0)
  })

  it("filters by grade and subject; labels", () => {
    const cs = buildCatalog([course("m"), course("s", { subjects: ["Sci"], grades: ["M1"] })], [], "b", "2026-10-22", () => "").courses
    expect(filterCatalog(cs, { grade: "M1" }).map((c) => c.id)).toEqual(["s"])
    expect(filterCatalog(cs, { subject: "Math" }).map((c) => c.id)).toEqual(["m"])
    expect(filterCatalog(cs, {})).toHaveLength(2)
    expect(priceLabel({ price: 4350, unit: "month", duration: 1 })).toBe("เริ่มต้น 4,350 บาท / เดือน")
    expect(priceLabel({ price: 6000, unit: "hour", duration: 10 })).toBe("เริ่มต้น 6,000 บาท / 10 ชม.")
    expect(classWhen({ weekday: 6, start: "10:00", minutes: 90 })).toBe("ทุก ส. 10:00–11:30")
    expect(requestText("trial", { name: "Math P4", weekday: 6, start: "10:00", minutes: 90 })).toBe("📅 ขอนัดทดลองเรียน: Math P4 · ทุก ส. 10:00–11:30")
  })
})
