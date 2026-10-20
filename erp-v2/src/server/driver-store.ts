import { promises as fs } from "fs"
import path from "path"
import { DATA_DIR } from "./data-dir"

// Driver app (owner 2026-10-19: "เชื่อมกับ Line หรือสร้าง Web/App ใหม่ สำหรับ Driver"): the ERP publishes the trips it
// approved; the driver's phone reads its own trips by the secret in its link and reports start / each stop / finish.
// Same file approach as the parent app — the real system keeps this in Dev's database.

const DATA_FILE = path.join(DATA_DIR, "driver.json")
/** owner 2026-10-20: the approved trips, per ERP browser — apart from the drivers' taps, so a publish never rewrites them */
const TRIPS_FILE = path.join(DATA_DIR, "driver-trips.json")
/** a browser that stopped publishing (closed) drops out after this long — open ones re-send every 30 s */
const SOURCE_TTL_MS = 10 * 60_000

export interface DriverStop { key: string; nickname: string; name: string; grade: string; leg: "pickup" | "dropoff"; adult: boolean; phone: string; address?: string; addressNote?: string; loc?: { lat: number; lng: number }; eta: string | null }
export interface DriverTrip {
  tripId: string; token: string; driverName: string; branchName: string; date: string
  kind: "pickup" | "dropoff" | "both"; time: string; name?: string; depart: string; finish: string
  vehicle: { name: string; plate: string } | null; seats: number; used: number; km?: number; stops: DriverStop[]
}
export interface DriverEventRec { id: string; tripId: string; type: "start" | "arrive" | "done" | "noshow" | "finish"; stopKey?: string; at: string }

interface Store { trips: DriverTrip[]; events: DriverEventRec[] }
let queue: Promise<unknown> = Promise.resolve()

async function read(): Promise<Store> {
  try {
    const j = JSON.parse(await fs.readFile(DATA_FILE, "utf8")) as Partial<Store>
    return { trips: [], events: j.events ?? [] }
  } catch {
    return { trips: [], events: [] }
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

// Each ERP browser keeps its own data in the prototype (owner 2026-10-20: the trips vanished from the driver app — Chrome
// had the ERP open too, with nothing approved, and its empty list replaced the other browser's). So every browser's list
// is kept on its own and the drivers see them together: one with nothing approved can't wipe another's.
interface Sources { [source: string]: { trips: DriverTrip[]; at: number } }
async function readSources(): Promise<Sources> {
  try { return (JSON.parse(await fs.readFile(TRIPS_FILE, "utf8")) as { sources?: Sources }).sources ?? {} } catch { return {} }
}
let tripsQueue: Promise<unknown> = Promise.resolve()

/** one ERP browser's approved trips — replaced as a whole for that browser (a trip no longer approved drops out) */
export function publishTrips(trips: DriverTrip[], source = "default"): Promise<number> {
  const result = tripsQueue.then(async () => {
    const now = Date.now()
    const sources = Object.fromEntries(Object.entries(await readSources()).filter(([, v]) => now - v.at < SOURCE_TTL_MS))
    if (trips.length) sources[source] = { trips, at: now }
    else delete sources[source]
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(TRIPS_FILE, JSON.stringify({ sources }), "utf8")
    return trips.length
  })
  tripsQueue = result.catch(() => undefined)
  return result
}

/** every open browser's approved trips together — the newest copy of a trip wins */
async function allTrips(): Promise<DriverTrip[]> {
  const now = Date.now()
  const live = Object.values(await readSources()).filter((v) => now - v.at < SOURCE_TTL_MS).sort((a, b) => a.at - b.at)
  const byId = new Map<string, DriverTrip>()
  for (const v of live) for (const t of v.trips) byId.set(t.tripId, t)
  return [...byId.values()]
}

export async function tripsForToken(token: string): Promise<{ trips: DriverTrip[]; events: DriverEventRec[] }> {
  const trips = (await allTrips()).filter((t) => t.token === token)
  const ids = new Set(trips.map((t) => t.tripId))
  return { trips, events: (await read()).events.filter((e) => ids.has(e.tripId)) }
}

export const allEvents = async () => (await read()).events

/** a driver's tap — per stop one check in ("arrive") and one check out ("done" / "noshow"), a new one replaces its own
 *  kind; "undo" takes back the stop's last mark (check out first, then check in) */
export function addEvent(token: string, e: { tripId: string; type: DriverEventRec["type"] | "undo"; stopKey?: string }): Promise<DriverEventRec | "forbidden" | "cleared"> {
  return allTrips().then((trips) => mutate((s) => {
    const trip = trips.find((t) => t.tripId === e.tripId)
    if (!trip || trip.token !== token) return "forbidden" as const
    if (e.stopKey) {
      const mine = (x: DriverEventRec) => x.tripId === e.tripId && x.stopKey === e.stopKey
      if (e.type === "undo") {
        const last = s.events.filter(mine).sort((a, b) => a.at.localeCompare(b.at)).at(-1)
        s.events = s.events.filter((x) => x !== last)
        return "cleared" as const
      }
      const slot = (t: string) => (t === "arrive" ? "in" : "out")
      s.events = s.events.filter((x) => !(mine(x) && slot(x.type) === slot(e.type)))
    }
    if (e.type === "undo") return "cleared" as const
    if (!e.stopKey) s.events = s.events.filter((x) => !(x.tripId === e.tripId && !x.stopKey && x.type === e.type))
    const rec: DriverEventRec = { id: `de_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, tripId: e.tripId, type: e.type, stopKey: e.stopKey, at: new Date().toISOString() }
    s.events.push(rec)
    // keep the file small: a month of events
    const cutoff = new Date(Date.now() - 31 * 86400000).toISOString()
    s.events = s.events.filter((x) => x.at >= cutoff)
    return rec
  }))
}
