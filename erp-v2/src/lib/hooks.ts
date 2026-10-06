"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toDateStr } from "@/domain/dates"
import { resolveEntitlements } from "@/domain/rules/attendance"
import { useStore } from "@/store/store"

/**
 * A useState whose value also lives in the URL query string, so a reload or a shared link keeps the filter.
 * Reads `window.location.search` directly (same approach as the inbox `?conversation=` deep link) instead of
 * `useSearchParams`, so pages don't need a Suspense boundary just to filter.
 */
export function useQueryState<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get(key)
    if (v) setValue(v as T) // eslint-disable-line react-hooks/set-state-in-effect
  }, [key])
  const set = useCallback((v: T) => {
    setValue(v)
    const params = new URLSearchParams(window.location.search)
    if (v === initial) params.delete(key)
    else params.set(key, v)
    const qs = params.toString()
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname)
  }, [key, initial])
  return [value, set]
}

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
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  // real end dates: long leave + one extra class per quota leave (owner 2026-09-29)
  return useMemo(() => resolveEntitlements(ents, leaves, { sessions, attendance, classes, holidays }), [ents, leaves, sessions, attendance, classes, holidays])
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
