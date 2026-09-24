"use client"

import { toast } from "sonner"
import type { Result } from "@/domain/types"

/** Every action result becomes visible feedback (UX rule #1: nothing is ever silent). */
export function report<T>(r: Result<T>, success: string | ((v: T) => string)): r is { ok: true; value: T } {
  if (r.ok) {
    toast.success(typeof success === "function" ? success(r.value) : success)
    r.warnings?.forEach((w) => toast.warning(w))
    return true
  }
  toast.error(r.error)
  return false
}
