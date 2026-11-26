import { familyDisplay } from "@/domain/rules/people"

/**
 * owner 2026-11-26: a family is STORED as "[name] Family" ("ครอบครัวสมใจ" → "สมใจ Family"). Older saved data, the demo seed and the
 * names restored from the LINE link store still carry the Thai word — this brings them to the same form (safe to run again), and the
 * chat of a linked family follows its family's name.
 */
export function withFamilyNames<T extends { families?: { id: string; name: string }[]; conversations?: { familyId?: string | null; name: string }[] }>(db: T): T {
  if (!db.families) return db
  const families = db.families.map((f) => { const name = familyDisplay(f.name); return name === f.name ? f : { ...f, name } })
  const byId = new Map(families.map((f) => [f.id, f.name]))
  const conversations = db.conversations?.map((c) => { const n = c.familyId ? byId.get(c.familyId) : undefined; return n && n !== c.name ? { ...c, name: n } : c })
  return { ...db, families, ...(conversations ? { conversations } : {}) }
}
