import { promises as fs } from "fs"
import path from "path"
import type { ParentRequest } from "@/domain/types"
import { DATA_DIR } from "./data-dir"

// แจ้งลา / แจ้งลาออก from the parent app in LINE (owner 2026-10-14) — same file approach as the other parent forms;
// the real system keeps these in Dev's database.

const DATA_FILE = path.join(DATA_DIR, "parent-requests.json")

interface Store { requests: ParentRequest[] }

let queue: Promise<unknown> = Promise.resolve()

async function read(): Promise<Store> {
  try {
    return { requests: (JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Store).requests ?? [] }
  } catch {
    return { requests: [] }
  }
}

function mutate<T>(fn: (s: Store) => T): Promise<T> {
  const result = queue.then(async () => {
    const s = await read()
    const v = fn(s)
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(DATA_FILE, JSON.stringify(s, null, 2), "utf8")
    return v
  })
  queue = result.catch(() => undefined)
  return result
}

export async function listRequests(): Promise<ParentRequest[]> {
  return (await read()).requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addRequest(r: Omit<ParentRequest, "id" | "createdAt" | "status">): Promise<ParentRequest> {
  return mutate((s) => {
    const req: ParentRequest = { ...r, id: `pr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString(), status: "new" }
    s.requests.push(req)
    return req
  })
}

export function handleRequest(id: string, patch: Pick<ParentRequest, "status" | "result" | "handledBy">): Promise<ParentRequest | null> {
  return mutate((s) => {
    const r = s.requests.find((x) => x.id === id)
    if (!r) return null
    Object.assign(r, patch, { handledAt: new Date().toISOString() })
    return r
  })
}
