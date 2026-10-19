"use client"

// "ควรเด้งเตือน" (owner 2026-10-14): a student who gave notice must not slip by. When someone opens the ERP:
//  · an unread แจ้งออก notification for them pops up once (teachers of that student get it too)
//  · the office team gets one reminder a day while any notice is still open (not talked through / not archived)
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { notify } from "@/components/app/noti"
import { exitPending } from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import { isUnread, visibleTo } from "@/domain/rules/notifications"
import { toDateStr } from "@/domain/dates"
import { useStore } from "@/store/store"
import { fetchParentRequests } from "@/lib/parent-requests"

const seen = new Set<string>()
const once = (key: string) => {
  if (seen.has(key)) return false
  seen.add(key)
  try { if (localStorage.getItem(key)) return false; localStorage.setItem(key, "1") } catch { /* private mode — once per page load */ }
  return true
}

export function ExitAlert() {
  const router = useRouter()
  const me = useStore((s) => s.me())
  const branchId = useStore((s) => s.branchId)
  const notifications = useStore((s) => s.notifications)
  const students = useStore((s) => s.students)
  const now = useStore((s) => s.now)

  useEffect(() => {
    const t = setTimeout(() => {
      const today = toDateStr(now())
      const open = () => router.push("/students?status=exiting")
      notifications.filter((n) => n.kind === "student_exit" && visibleTo(n, me) && isUnread(n, me)).slice(0, 3).forEach((n) => {
        if (once(`nockerp-exit-note:${me.id}:${n.id}`)) notify({ kind: "exit", title: n.title, body: n.body, sticky: true, action: { label: "ดูรายชื่อ", onClick: open } })
      })
      if (!can(me, "student.manage")) return
      const pending = students.filter((x) => x.branchId === branchId && exitPending(x, today))
      if (pending.length && once(`nockerp-exit-daily:${me.id}:${branchId}:${today}`)) {
        const late = pending.filter((x) => x.exit!.lastDate < today).length
        notify({
          kind: "exit", title: `นักเรียนแจ้งออก ${pending.length} คน ยังไม่ปิดเรื่อง`,
          body: `${pending.slice(0, 4).map((x) => x.nickname).join(", ")}${pending.length > 4 ? " …" : ""}${late ? ` · เลยวันสุดท้ายแล้ว ${late} คน` : ""} — คุยกับผู้ปกครอง หรือ Archive`,
          action: { label: "ดูรายชื่อ", onClick: open },
        })
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [me, branchId, notifications, students, now, router])
  return null
}

/**
 * แจ้งลา / แจ้งลาออก from parents in LINE (owner 2026-10-14: "ยิงเข้ามาที่ระบบ ให้ Admin ได้รับทราบ") — checked every
 * 20 s; a new one becomes a notification and pops up for the office team, with a button to handle it.
 */
export function ParentRequestWatcher() {
  const router = useRouter()
  const sync = useStore((s) => s.syncParentRequests)
  const canHandle = useStore((s) => can(s.me(), "student.manage"))
  useEffect(() => {
    let alive = true
    const tick = async () => {
      const reqs = await fetchParentRequests()
      if (!alive) return
      const fresh = sync(reqs)
      if (!canHandle) return
      fresh.slice(0, 3).forEach((r) => notify({
        kind: r.kind, sticky: r.kind !== "leave",
        title: r.kind === "leave" ? `ผู้ปกครองแจ้งลา · ${r.studentNickname} ${r.sessions?.length ?? 0} คาบ` : r.kind === "return" ? `ผู้ปกครองอยากกลับมาเรียน · ${r.studentNickname}`
          : r.kind === "bus" ? `ผู้ปกครองขอ / ยกเลิกรอบรถ · ${r.studentNickname}` : r.kind === "home" ? `ผู้ปกครองปักหมุดบ้านสำหรับรถรับส่ง · ${r.studentNickname}` : `ผู้ปกครองแจ้งลาออก · ${r.studentNickname}`,
        body: `${r.familyName} ส่งมาทาง LINE${r.note ? ` — "${r.note}"` : ""}`,
        action: { label: "จัดการ", onClick: () => router.push("/notifications?topic=requests") },
      }))
    }
    tick()
    const t = setInterval(tick, 20_000)
    return () => { alive = false; clearInterval(t) }
  }, [sync, canHandle, router])
  return null
}
