import type { StudentState, StudentStatus } from "@/domain/rules/attendance"
import { daysBetween, fmtDate } from "@/domain/dates"
import type { Tone } from "./badges"

export const STATUS_PILL: Record<StudentStatus, { tone: Tone; label: string }> = {
  active: { tone: "green", label: "Active" },
  renewal: { tone: "amber", label: "Renewal" },
  inactive: { tone: "gray", label: "Inactive" },
  archived: { tone: "red", label: "Archived" },
}

/** "Inactive · พักยาว · 24 วันแล้ว" */
export function stateDetail(st: StudentState, today: string): string {
  const ago = st.since ? daysBetween(st.since, today) : null
  const since = ago != null && ago > 0 ? ` · ${ago} วันแล้ว` : ""
  if (st.status === "inactive") return `${st.reason === "leave" ? "ลาพักยาว" : "ไม่มีแพ็กเกจที่ใช้อยู่"}${since}`
  if (st.status === "archived") return `เลิกเรียนแล้ว${since}`
  if (st.startsOn) return `จ่ายแล้ว · เริ่มเรียน ${fmtDate(st.startsOn)}`
  return ""
}
