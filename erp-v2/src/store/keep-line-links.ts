import type { Conversation, Family } from "../domain/types"

/** A reseed (persist version bump) rebuilds the demo data — but a family linked to a real LINE chat stays linked,
 *  with what the office typed for it (owner 2026-10-15). Matched by family id, else by a unique name. */
export function keepLineLinks<T extends { families: Family[]; conversations: Conversation[] }>(old: { families?: Family[]; conversations?: Conversation[] } | undefined, fresh: T): T {
  // owner 2026-10-15: a family linked to a real LINE chat keeps everything the office typed for it (name, parents,
  // address…) — a reseed used to bring the sample name back ("กลายเป็นครอบครัวแสงใหญ่อีกละ นี่มันฉันเอง")
  const links = (old?.families ?? []).filter((f) => f.lineUserId).map((f) => ({ id: f.id, name: f.name, lineUserId: f.lineUserId!, fam: f }))
  if (!links.length) return fresh
  // the same family id first; else the name — only when one family carries it (several "ครอบครัวแสงใหญ่" exist)
  const unique = (name: string) => fresh.families.filter((f) => f.name === name).length === 1
  const target = new Map(links.map((l) => [fresh.families.some((f) => f.id === l.id) ? l.id : unique(l.name) ? fresh.families.find((f) => f.name === l.name)!.id : "", l]))
  const families = fresh.families.map((f) => {
    const l = target.get(f.id)
    if (!l) return f
    const parents = (l.fam.parents?.length ? l.fam.parents : f.parents).map((p, i) => (i === 0 ? { ...p, lineLinked: true } : p))
    return { ...f, ...l.fam, id: f.id, lineUserId: l.lineUserId, parents }
  })
  const famOf = new Map(families.filter((f) => f.lineUserId).map((f) => [`line_${f.lineUserId}`, f]))
  // the LINE chats themselves come back from the server on the next poll; keep their family link with them
  const oldConvs = (old?.conversations ?? []).filter((c) => famOf.has(c.id) && !fresh.conversations.some((x) => x.id === c.id))
  const conversations = [...fresh.conversations, ...oldConvs].map((c) => { const f = famOf.get(c.id); return f ? { ...c, familyId: f.id, leadId: null, name: f.name } : c })
  return { ...fresh, families, conversations }
}

/**
 * Owner 2026-10-20 ("ต้องมาสั่งนายทุกรอบเลยหรอ"): put back LINE ↔ family links the server kept, after this browser lost
 * them. Only a family with no LINE yet, and only a LINE account no other family has — what the office linked here wins.
 * The family's chat (line_<id>) joins it again. `restored` = how many came back.
 */
export function restoreLinks<T extends { families: Family[]; conversations: Conversation[] }>(db: T, links: { lineUserId: string; familyId: string; familyName?: string }[]): T & { restored: number } {
  const taken = new Set(db.families.map((f) => f.lineUserId).filter(Boolean))
  // same family, same LINE account, but the server holds a newer name (every rename is pushed up at once) → take the server's name,
  // so a stale browser never shows the sample name again and never pushes it back over the real one
  const renamed = new Map(links.filter((l) => l.familyName?.trim()).map((l) => [`${l.familyId}|${l.lineUserId}`, l.familyName!.trim()]))
  const renames = db.families.filter((f) => f.lineUserId && renamed.has(`${f.id}|${f.lineUserId}`) && renamed.get(`${f.id}|${f.lineUserId}`) !== f.name)
  if (renames.length) {
    const nm = new Map(renames.map((f) => [f.id, renamed.get(`${f.id}|${f.lineUserId}`)!]))
    db = { ...db, families: db.families.map((f) => (nm.has(f.id) ? { ...f, name: nm.get(f.id)! } : f)), conversations: db.conversations.map((c) => (c.familyId && nm.has(c.familyId) ? { ...c, name: nm.get(c.familyId)! } : c)) }
  }
  const back = links.filter((l) => !taken.has(l.lineUserId) && db.families.some((f) => f.id === l.familyId && !f.lineUserId))
    .filter((l, i, a) => a.findIndex((x) => x.familyId === l.familyId) === i)
  if (!back.length) return { ...db, restored: renames.length }
  const byFam = new Map(back.map((l) => [l.familyId, l.lineUserId]))
  // the name the office gave the family travels with the link — a restore must not bring the sample name back (owner 2026-11-06: "ต้องเห็นเป็น Breezy")
  const nameOf = new Map(back.filter((l) => l.familyName?.trim()).map((l) => [l.familyId, l.familyName!.trim()]))
  const byConv = new Map(back.map((l) => [`line_${l.lineUserId}`, l.familyId]))
  const families = db.families.map((f) => (byFam.has(f.id) ? { ...f, name: nameOf.get(f.id) ?? f.name, lineUserId: byFam.get(f.id), parents: f.parents.map((p, i) => (i === 0 ? { ...p, lineLinked: true } : p)) } : f))
  const conversations = db.conversations.map((c) => {
    const fid = byConv.get(c.id)
    return fid && !c.familyId ? { ...c, familyId: fid, leadId: null, name: families.find((f) => f.id === fid)?.name ?? c.name } : c
  })
  return { ...db, families, conversations, restored: back.length }
}

