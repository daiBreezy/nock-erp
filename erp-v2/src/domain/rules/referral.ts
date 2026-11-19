// Referral (owner 2026-11-19): a new parent types, as best they remember, who told them about the school — a parent's or a
// student's name. The system SUGGESTS who that probably is; the admin confirms (or searches by hand). Once the new family
// has paid, the teachers of the courses the referrer's children study share ONE point: 1 referral = 1 point, split equally
// (3 teachers = 0.33 each). A teacher on several of the family's courses still counts once.
// Pure functions — the store and the review card both call these.

import type { Family, ID, Klass, Student } from "../types"

/** one point earned by a referral — kept so the same family never pays out twice */
export interface RefAward { id: ID; newFamilyId: ID; referrerFamilyId: ID; teacherIds: ID[]; share: number; at: string }

const norm = (x: string) => x.toLowerCase().replace(/[\s.\-_/]+/g, "")
/** a title / kinship word in front of a name ("คุณสมชาย", "พี่ใบเตย") is not part of the name */
const stripTitle = (t: string) => t.replace(/^(คุณ|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|พี่|ป้า|น้า|ลุง|อา|ครู)/, "")
const tokens = (text: string) => text.toLowerCase().split(/[\s,;/|]+/).map((t) => stripTitle(t.replace(/[.\-_]/g, ""))).filter((t) => t.length >= 2)

export interface ReferrerSuggestion { family: Family; why: string; score: number }

/** families that the typed words probably mean — by family name, a parent's name or a student's (full or nickname). Best first, capped. */
export function suggestReferrers(text: string, families: Family[], students: Student[], exceptFamilyId?: ID, limit = 5): ReferrerSuggestion[] {
  const words = tokens(text)
  if (!words.length) return []
  const kids = new Map<ID, Student[]>()
  for (const s of students) if (s.familyId) kids.set(s.familyId, [...(kids.get(s.familyId) ?? []), s])
  const out: ReferrerSuggestion[] = []
  for (const f of families) {
    if (f.id === exceptFamilyId || f.archived) continue
    const labelled: { label: string; hay: string }[] = [
      { label: f.name, hay: norm(`${f.name} ${f.nameEn ?? ""}`) },
      ...f.parents.map((p) => ({ label: p.name, hay: norm(`${p.name} ${p.nameEn ?? ""}`) })),
      ...(kids.get(f.id) ?? []).map((s) => ({ label: s.nickname || s.name, hay: norm(`${s.name} ${s.nickname} ${s.nameEn ?? ""} ${s.nicknameEn ?? ""}`) })),
    ]
    let best = { score: 0, why: "" }
    for (const l of labelled) {
      const hit = words.filter((w) => l.hay.includes(norm(w))).length
      if (hit > best.score) best = { score: hit, why: l.label }
    }
    if (best.score > 0) out.push({ family: f, why: best.why, score: best.score })
  }
  return out.sort((a, b) => b.score - a.score || a.family.name.localeCompare(b.family.name)).slice(0, limit)
}

/** every teacher (lead + co-teachers) of the classes any child of this family sits in — each once */
export function teachersOfFamily(familyId: ID, students: Student[], classes: Klass[]): ID[] {
  const kids = new Set(students.filter((s) => s.familyId === familyId).map((s) => s.id))
  const ids = new Set<ID>()
  for (const k of classes) {
    if (!k.studentIds.some((id) => kids.has(id))) continue
    if (k.teacherId) ids.add(k.teacherId)
    for (const t of k.coTeacherIds) ids.add(t)
  }
  return [...ids]
}

/** 1 point shared equally; no teacher = nobody to pay */
export const refShare = (teacherCount: number) => (teacherCount > 0 ? 1 / teacherCount : 0)

/** the award for a family that just paid — null when it has no referrer, is already awarded, or the referrer has no teachers */
export function awardFor(newFamilyId: ID, families: Family[], students: Student[], classes: Klass[], awards: RefAward[], id: ID, at: string): RefAward | null {
  const fam = families.find((f) => f.id === newFamilyId)
  const from = fam?.referredByFamilyId
  if (!from || awards.some((a) => a.newFamilyId === newFamilyId)) return null
  const teacherIds = teachersOfFamily(from, students, classes)
  if (!teacherIds.length) return null
  return { id, newFamilyId, referrerFamilyId: from, teacherIds, share: refShare(teacherIds.length), at }
}

/** points per teacher across all awards */
export function pointsByTeacher(awards: RefAward[]): Map<ID, number> {
  const m = new Map<ID, number>()
  for (const a of awards) for (const t of a.teacherIds) m.set(t, (m.get(t) ?? 0) + a.share)
  return m
}
