import { promises as fs } from "fs"
import path from "path"
import type { ParentView } from "@/domain/rules/parent-view"
import { DATA_DIR } from "./data-dir"

// Parent app v1 (owner 2026-10-09): the ERP publishes each LINE-linked family's view here; the parent's phone reads it
// after LINE proves who they are. Same file approach as the parent forms — the real system reads Dev's database.

const DATA_FILE = path.join(DATA_DIR, "parent-app.json")

interface Store { views: ParentView[] }

let queue: Promise<unknown> = Promise.resolve()

async function read(): Promise<Store> {
  try {
    return { views: (JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Store).views ?? [] }
  } catch {
    return { views: [] }
  }
}

/** Replace the published views — families no longer linked to LINE drop out. */
export function publishViews(views: ParentView[]): Promise<number> {
  const result = queue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify({ views }, null, 2), "utf8")
    return views.length
  })
  queue = result.catch(() => undefined)
  return result
}

export async function viewForLineUser(userId: string): Promise<ParentView | null> {
  return (await read()).views.find((v) => v.lineUserIds.includes(userId)) ?? null
}
