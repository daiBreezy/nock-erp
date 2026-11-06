// Sample trips for the staff preview of the driver app (owner 2026-11-06) — today's date, nothing is sent anywhere
import { today } from "@/lib/today"
interface Stop { key: string; nickname: string; name: string; grade: string; leg: "pickup" | "dropoff"; adult: boolean; phone: string; address?: string; addressNote?: string; loc?: { lat: number; lng: number }; eta: string | null }
export interface Trip { tripId: string; driverName: string; branchName: string; date: string; kind: "pickup" | "dropoff" | "both"; time: string; name?: string; depart: string; finish: string; vehicle: { name: string; plate: string } | null; seats: number; used: number; km?: number; stops: Stop[] }

/** staff preview (owner 2026-11-06): sample trips for today and taps kept in memory only — nothing is sent anywhere */
export function demoTrips(): Trip[] {
  const stop = (key: string, nickname: string, name: string, grade: string, leg: Stop["leg"], eta: string, address: string, adult = false): Stop =>
    ({ key, nickname, name, grade, leg, adult, phone: "081-234-5678", address, addressNote: "", loc: { lat: 13.73, lng: 100.58 }, eta })
  const base = { driverName: "น้าสมชาย", branchName: "ทองหล่อ", date: today(), vehicle: { name: "รถตู้ 1", plate: "ฮษ 3456" }, seats: 9 }
  return [
    { ...base, tripId: "demo-1", kind: "pickup", time: "15:30", name: "สายสุขุมวิท", depart: "14:50", finish: "15:35", used: 3, km: 12,
      stops: [stop("d1a", "ใบเตย", "ด.ญ. ใบเตย ศรีสุข", "ป.5", "pickup", "15:05", "ซ.สุขุมวิท 55 (ทองหล่อ 10)"), stop("d1b", "ภูผา", "ด.ช. ภูผา ชัยมงคล", "ม.1", "pickup", "15:15", "ซ.สุขุมวิท 49", true), stop("d1c", "น้ำฝน", "ด.ญ. น้ำฝน ใจดี", "ป.3", "pickup", "15:25", "ซ.สุขุมวิท 39")] },
    { ...base, tripId: "demo-2", kind: "dropoff", time: "19:00", name: "สายสุขุมวิท", depart: "19:05", finish: "19:50", used: 2, km: 10,
      stops: [stop("d2a", "ภูผา", "ด.ช. ภูผา ชัยมงคล", "ม.1", "dropoff", "19:25", "ซ.สุขุมวิท 49"), stop("d2b", "ใบเตย", "ด.ญ. ใบเตย ศรีสุข", "ป.5", "dropoff", "19:40", "ซ.สุขุมวิท 55 (ทองหล่อ 10)")] },
  ]
}

export const DEMO_DRIVER = "น้าสมชาย"
