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
