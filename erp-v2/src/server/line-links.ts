import { promises as fs } from "fs"
import path from "path"
import { DATA_DIR } from "./data-dir"

// Which LINE account belongs to which family (owner 2026-10-20: "ต้องมาสั่งนายทุกรอบเลยหรอ" — the link lived only in the
// browser, so clearing it unlinked the family and the parent app showed nothing). Kept here as well; the ERP puts it
// back by itself when its own copy is gone. Only ever added to / moved — a browser with no links never wipes it.
// The real system keeps this in Dev's database.

const FILE = path.join(DATA_DIR, "line-links.json")

export interface LineLink { lineUserId: string; familyId: string; familyName: string; at: string }

export async function readLinks(): Promise<LineLink[]> {
  try { return (JSON.parse(await fs.readFile(FILE, "utf8")) as { links?: LineLink[] }).links ?? [] } catch { return [] }
}

let queue: Promise<unknown> = Promise.resolve()
/** add or move links (one family per LINE account — the newest wins); returns how many changed */
export function upsertLinks(input: Omit<LineLink, "at">[]): Promise<number> {
  const result = queue.then(async () => {
    const links = await readLinks()
    let changed = 0
    for (const l of input) {
      if (!l.lineUserId || !l.familyId) continue
      const cur = links.find((x) => x.lineUserId === l.lineUserId)
      if (cur && cur.familyId === l.familyId && cur.familyName === l.familyName) continue
      const next = { lineUserId: l.lineUserId, familyId: l.familyId, familyName: l.familyName, at: new Date().toISOString() }
      if (cur) Object.assign(cur, next)
      else links.push(next)
      changed++
    }
    if (changed) {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(FILE, JSON.stringify({ links }, null, 2), "utf8")
    }
    return changed
  })
  queue = result.catch(() => undefined)
  return result
}
