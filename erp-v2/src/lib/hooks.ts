"use client"

import { useEffect, useMemo, useState } from "react"
import { toDateStr } from "@/domain/dates"
import { resolveEntitlements } from "@/domain/rules/attendance"
import { useStore } from "@/store/store"

/** Current (demo-adjustable) time, re-rendering every 30 s so session states update live. */
export function useNow(intervalMs = 30_000) {
  const offset = useStore((s) => s.clockOffset)
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return useMemo(() => new Date(tick + offset), [tick, offset])
}

export function useToday() {
  return toDateStr(useNow())
}

export function useBranch() {
  const branchId = useStore((s) => s.branchId)
  const branches = useStore((s) => s.branches)
  return branches.find((b) => b.id === branchId)!
}

/** Entitlements with `to` pushed out by any active no-quota leave — the one place coverage/balance/status math should read from. */
export function useEntitlements() {
  const ents = useStore((s) => s.entitlements)
  const leaves = useStore((s) => s.leaves)
  return useMemo(() => resolveEntitlements(ents, leaves), [ents, leaves])
}

export function useLookup() {
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const branch = useBranch()
  return useMemo(
    () => ({
      // F2/F6: removed staff keep their name, flagged instead of showing an id
      teacher: (id: string | null) => {
        if (!id) return { label: "ยังไม่มีครู", missing: true }
        const t = staff.find((x) => x.id === id)
        if (!t) return { label: "ครู (ไม่พบข้อมูล)", missing: true }
        return { label: t.active ? t.nickname : `${t.nickname} (ออกแล้ว)`, missing: !t.active }
      },
      room: (id: string | null) => branch.rooms.find((r) => r.id === id)?.name ?? "ยังไม่ระบุห้อง",
      student: (id: string) => students.find((s) => s.id === id),
    }),
    [staff, students, branch],
  )
}
