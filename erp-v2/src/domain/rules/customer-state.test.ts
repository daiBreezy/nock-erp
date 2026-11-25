import { describe, expect, it } from "vitest"
import { familyState, leadSets, studentState } from "./customer-state"

const base = () => ({
  students: [{ id: "s1", familyId: "f1" }, { id: "s2", familyId: "f1" }, { id: "s3", familyId: "f2" }, { id: "s4", familyId: null }],
  leads: [] as never[],
  invoices: [] as never[],
  entitlements: [] as never[],
})
const lead = (o: object) => ({ id: "l1", stage: "contacting", ...o }) as never

describe("Lead vs Customer (one record, two states)", () => {
  it("anything no Lead points at is a Customer (all existing data)", () => {
    const sets = leadSets(base())
    expect(familyState("f1", sets)).toBe("customer")
    expect(studentState("s1", sets)).toBe("customer")
  })
  it("a family a Lead points at is a Lead until the first confirmed payment", () => {
    const i = { ...base(), leads: [lead({ familyId: "f1", kids: [{ studentId: "s1" }] })] }
    expect(familyState("f1", leadSets(i))).toBe("lead")
    expect(studentState("s1", leadSets(i))).toBe("lead")
    expect(studentState("s3", leadSets(i))).toBe("customer")
    // a slip that is NOT confirmed yet is not money — still a Lead
    const waiting = { ...i, invoices: [{ studentId: "s1", payments: [{ id: "p" }] }] as never }
    expect(familyState("f1", leadSets(waiting))).toBe("lead")
    const paid = { ...i, invoices: [{ studentId: "s1", payments: [{ id: "p", confirmedBy: "u" }] }] as never }
    expect(familyState("f1", leadSets(paid))).toBe("customer")
    expect(studentState("s2", leadSets(paid))).toBe("customer")
  })
  it("a package alone makes a Customer; an enrolled Lead is a Customer", () => {
    const i = { ...base(), leads: [lead({ trialStudentId: "s3" })], entitlements: [{ studentId: "s3" }] as never }
    expect(familyState("f2", leadSets(i))).toBe("customer")
    expect(familyState("f2", leadSets({ ...base(), leads: [lead({ trialStudentId: "s3", stage: "enrolled" })] }))).toBe("customer")
  })
  it("a Lead's student with no family yet is a Lead student", () => {
    expect(studentState("s4", leadSets({ ...base(), leads: [lead({ trialStudentId: "s4" })] }))).toBe("lead")
  })
  it("a win-back Lead does not turn a former Customer into a Lead", () => {
    const i = { ...base(), leads: [lead({ winBackOf: "s1", kids: [{ studentId: "s1" }], familyId: "f1" })] }
    expect(familyState("f1", leadSets(i))).toBe("customer")
  })
  it("an archived (lost) Lead's family stays a Lead — it belongs to the CRM archive, not the Families page", () => {
    expect(familyState("f1", leadSets({ ...base(), leads: [lead({ familyId: "f1", stage: "archived" })] }))).toBe("lead")
  })
})

import { archiveBox, archivedOf } from "./crm"

describe("one Archived box for Leads and Customers", () => {
  const at = "2026-11-20T01:00:00Z"
  it("reads an older archived Lead (stage + close form only) as lead_lost", () => {
    const a = archivedOf({ stage: "archived", lost: { at, by: "u1" } as never, archiveReason: "ราคา", createdAt: "2026-11-01T00:00:00Z" })
    expect(a).toEqual({ at, by: "u1", reason: "ราคา", kind: "lead_lost" })
    expect(archivedOf({ stage: "contacting", createdAt: "2026-11-01T00:00:00Z" })).toBeUndefined()
  })
  it("lists Lead and Customer archives together, told apart by kind (customer_exit is the default)", () => {
    const box = archiveBox({
      leads: [{ id: "l1", name: "Lead A", stage: "archived", archiveReason: "ไม่ว่าง", createdAt: "2026-11-01T00:00:00Z", lost: { at, by: "u" } as never }],
      families: [{ id: "f1", name: "ครอบครัวB", archived: { at: "2026-11-22T00:00:00Z", by: "u", reason: "ย้ายบ้าน" } }],
      students: [{ id: "s1", name: "C", archived: { at: "2026-11-21T00:00:00Z", by: "u", reason: "จบ", kind: "customer_exit" } }],
    })
    expect(box.map((e) => `${e.type}:${e.kind}`)).toEqual(["family:customer_exit", "student:customer_exit", "lead:lead_lost"])
  })
})

import { kidsNeedingStudent, pullFromRecords, studentPatchFromKid } from "./crm"

describe("one place per fact — the Lead is a cache of the family / student records", () => {
  const base: Parameters<typeof pullFromRecords>[0] = { name: "old name", phone: "0800000000", lineId: "", childGrade: "ป.4", subject: "", subjects: [], childCount: 1, childGrades: ["ป.4"], interestCourseIds: [],
    kids: [{ id: "k1", name: "Joj", grade: "ป.4", subjects: [], courseIds: ["c1"], note: "n", studentId: "s1" }] }
  it("takes the main guardian's name and phone from the family file", () => {
    const out = pullFromRecords(base, { parents: [{ name: "แม่ใจดี", phone: "0811111111", primary: true }] }, [])
    expect([out.name, out.phone]).toEqual(["แม่ใจดี", "0811111111"])
  })
  it("takes the main guardian's LINE ID from the family file too", () => {
    expect(pullFromRecords(base, { parents: [{ name: "แม่", phone: "0811111111", lineId: "@mae", primary: true }] }, []).lineId).toBe("@mae")
  })
  it("takes a child's name, grade and target schools from the Student, keeping the sale's own fields", () => {
    const out = pullFromRecords(base, undefined, [{ id: "s1", name: "Jojo A", nickname: "Jojo", grade: "ป.5", targetSchools: [{ school: "สาธิต" }] }])
    expect(out.kids?.[0]).toMatchObject({ name: "Jojo", grade: "ป.5", courseIds: ["c1"], note: "n", targetSchools: [{ school: "สาธิต" }] })
    expect(out.childGrade).toBe("ป.5")
  })
  it("returns the same object when nothing changed (no update loops)", () => {
    expect(pullFromRecords(base, undefined, [])).toBe(base)
  })
  it("lists the kids that still need a Student (named + graded + not linked)", () => {
    const kids = [{ id: "a", name: "A", grade: "ป.1", subjects: [], courseIds: [], note: "" }, { id: "b", name: "", grade: "ป.1", subjects: [], courseIds: [], note: "" }, { id: "c", name: "C", grade: "ป.1", subjects: [], courseIds: [], note: "", studentId: "s9" }]
    expect(kidsNeedingStudent(kids, [{ id: "s9" }]).map((k) => k.id)).toEqual(["a"])
    expect(kidsNeedingStudent(kids, []).map((k) => k.id)).toEqual(["a", "c"])
  })
  it("writes a Lead-side kid edit to the Student (the full name only follows when it was the nickname)", () => {
    const kid = { id: "a", name: "Coco", grade: "ป.2", subjects: [], courseIds: [], note: "" }
    expect(studentPatchFromKid(kid, { name: "Joj", nickname: "Joj" })).toMatchObject({ name: "Coco", nickname: "Coco", grade: "ป.2" })
    expect(studentPatchFromKid(kid, { name: "ขนุน แก้วงาม", nickname: "ขนุน" })).toMatchObject({ name: "ขนุน แก้วงาม", nickname: "Coco" })
  })
})
