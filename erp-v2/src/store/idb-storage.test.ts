import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StorageValue } from "zustand/middleware"

// a tiny in-memory IndexedDB — only what idb-storage.ts uses (open → transaction → get / put / delete)
function fakeIndexedDB(data: Map<string, unknown>) {
  const later = (fn?: () => void) => setTimeout(() => fn?.(), 0)
  return {
    open: () => {
      const req: { result?: unknown; onsuccess?: () => void; onupgradeneeded?: () => void; onerror?: () => void } = {}
      later(() => {
        const db = {
          createObjectStore: () => undefined,
          transaction: () => {
            const tx: { oncomplete?: () => void; onerror?: () => void; objectStore?: () => unknown } = {}
            const done = () => later(() => tx.oncomplete?.())
            tx.objectStore = () => ({
              get: (k: string) => { done(); return { result: data.get(k) } },
              put: (v: unknown, k: string) => { data.set(k, v); done(); return { result: k } },
              delete: (k: string) => { data.delete(k); done(); return { result: undefined } },
            })
            return tx
          },
        }
        req.result = db
        req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
  }
}

const wait = (ms = 30) => new Promise((r) => setTimeout(r, ms))
type S = { n: number }
const value = (n: number): StorageValue<S> => ({ state: { n }, version: 1 })

let data: Map<string, unknown>
let local: Map<string, string>
let mod: typeof import("./idb-storage")

beforeEach(async () => {
  vi.resetModules()
  data = new Map()
  local = new Map()
  vi.stubGlobal("indexedDB", fakeIndexedDB(data))
  vi.stubGlobal("localStorage", { getItem: (k: string) => local.get(k) ?? null, setItem: (k: string, v: string) => local.set(k, v), removeItem: (k: string) => local.delete(k) })
  mod = await import("./idb-storage")
})

describe("IndexedDB storage for the ERP data (owner 2026-11-18)", () => {
  it("writes nothing until the saved data has been read (a change made meanwhile can never overwrite it)", async () => {
    const s = mod.createIdbStorage<S>({ disabled: () => false })
    await s.storage.setItem("k", value(1))
    await wait(260)
    expect(data.has("k")).toBe(false)
    s.enableWrites()
    await s.storage.setItem("k", value(2))
    await wait(260)
    expect(data.get("k")).toEqual(value(2))
  })

  it("batches quick changes — the newest state is what gets saved", async () => {
    const s = mod.createIdbStorage<S>({ disabled: () => false })
    s.enableWrites()
    for (let n = 1; n <= 5; n++) await s.storage.setItem("k", value(n))
    await wait(260)
    expect(data.get("k")).toEqual(value(5))
  })

  it("flush() writes what is waiting right away (page hidden / closed)", async () => {
    const s = mod.createIdbStorage<S>({ disabled: () => false })
    s.enableWrites()
    await s.storage.setItem("k", value(7))
    await s.flush()
    expect(data.get("k")).toEqual(value(7))
  })

  it("moves an old localStorage copy over once, then deletes it (that frees the space it filled)", async () => {
    local.set("k", JSON.stringify(value(3)))
    const s = mod.createIdbStorage<S>({ disabled: () => false })
    expect(await s.storage.getItem("k")).toEqual(value(3))
    expect(data.get("k")).toEqual(value(3))
    expect(local.has("k")).toBe(false)
    // the second read comes from IndexedDB
    expect(await s.storage.getItem("k")).toEqual(value(3))
  })

  it("prefers what IndexedDB already holds over a stale localStorage copy", async () => {
    data.set("k", value(9))
    local.set("k", JSON.stringify(value(1)))
    const s = mod.createIdbStorage<S>({ disabled: () => false })
    expect(await s.storage.getItem("k")).toEqual(value(9))
  })

  it("the parent pages in LINE neither read nor write staff data", async () => {
    data.set("k", value(9))
    const s = mod.createIdbStorage<S>({ disabled: () => true })
    s.enableWrites()
    expect(await s.storage.getItem("k")).toBeNull()
    await s.storage.setItem("k", value(2))
    await wait(260)
    expect(data.get("k")).toEqual(value(9))
  })
})
