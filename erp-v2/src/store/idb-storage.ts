// Where the ERP's data lives in the browser (owner 2026-11-18: "ทุกครั้งที่ build ข้อมูลหาย ต้องสร้าง Lead ใหม่").
//
// It used to be ONE localStorage entry — 5.8 MB of JSON, over the ~5 MB a browser gives localStorage. A write that did not fit was
// skipped without a word, so what was created since the last write that did fit lived only on screen and vanished on the next
// reload. IndexedDB has no such small cap, takes the data as it is (no JSON string of 6 MB on every change) and writes off the
// main thread — and what an old localStorage copy holds is moved over by itself the first time.
//
// Two rules keep it safe:
//  · nothing is written until the saved data has been read back (`enableWrites`) — a change made while the read is still running
//    can never overwrite what was saved;
//  · writes are batched (the newest state wins) and flushed when the page is hidden or closed.

import type { PersistStorage, StorageValue } from "zustand/middleware"

const DB_NAME = "nockerp"
const STORE = "kv"
const DEBOUNCE_MS = 200

let dbPromise: Promise<IDBDatabase> | null = null
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is not available"))
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    dbPromise.catch(() => { dbPromise = null })
  }
  return dbPromise
}

const idbRequest = <T,>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = run(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = tx.onabort = () => reject(tx.error ?? req.error)
  }))

/** a copy an older version kept in localStorage — moved to IndexedDB once, then deleted (that frees the space it filled) */
function legacyCopy<S>(name: string): StorageValue<S> | null {
  try {
    const raw = localStorage.getItem(name)
    return raw ? (JSON.parse(raw) as StorageValue<S>) : null
  } catch { return null }
}

export interface IdbStorage<S> {
  storage: PersistStorage<S>
  /** call once the saved data has been read — from then on every change is saved */
  enableWrites: () => void
  /** write what is waiting right now (page hidden / closed) */
  flush: () => Promise<void>
}

/**
 * A zustand `PersistStorage` over IndexedDB. One per store instance (so a hot-reloaded store starts with writes off again).
 * `disabled` = the parent pages in LINE: they never read or write staff data.
 */
export function createIdbStorage<S>({ disabled, onSaveError }: { disabled: () => boolean; onSaveError?: (e: unknown) => void }): IdbStorage<S> {
  let writesOn = false
  let pending: { name: string; value: StorageValue<S> } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let failing = false

  const flush = async () => {
    if (timer) { clearTimeout(timer); timer = null }
    const job = pending
    if (!job) return
    pending = null
    try {
      await idbRequest("readwrite", (s) => s.put(job.value, job.name))
      failing = false
    } catch (e) {
      // not saved: say so once (not on every change), keep the newest state to retry with the next change
      if (!pending) pending = job
      if (!failing) { failing = true; onSaveError?.(e) }
    }
  }

  const storage: PersistStorage<S> = {
    getItem: async (name) => {
      if (disabled()) return null
      try {
        const saved = await idbRequest<StorageValue<S> | undefined>("readonly", (s) => s.get(name))
        if (saved) return saved
        const old = legacyCopy<S>(name)
        if (old) {
          await idbRequest("readwrite", (s) => s.put(old, name))
          try { localStorage.removeItem(name) } catch { /* ignore */ }
        }
        return old
      } catch {
        // IndexedDB unusable (private window …): fall back to what localStorage has, read-only
        return legacyCopy<S>(name)
      }
    },
    setItem: (name, value) => {
      if (disabled() || !writesOn) return
      pending = { name, value }
      if (!timer) timer = setTimeout(() => { void flush() }, DEBOUNCE_MS)
    },
    removeItem: async (name) => {
      pending = null
      try { await idbRequest("readwrite", (s) => s.delete(name)) } catch { /* ignore */ }
    },
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => { void flush() })
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void flush() })
  }

  return { storage, enableWrites: () => { writesOn = true }, flush }
}
