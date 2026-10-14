"use client"

// แจ้งลา / แจ้งลาออก from parents in LINE (owner 2026-10-14) — they live on the server; the ERP reads and closes them.
import type { ParentRequest } from "@/domain/types"

export async function fetchParentRequests(): Promise<ParentRequest[]> {
  const r = await fetch("/api/parent-requests").then((x) => x.json()).catch(() => null)
  return r?.ok ? r.requests : []
}

/** close a request — `reply` goes to the parent on LINE */
export async function closeParentRequest(input: { id: string; status: "done" | "declined"; result: string; by: string; reply?: string }): Promise<{ ok: boolean; sent?: boolean; error?: string }> {
  return fetch("/api/parent-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
    .then((x) => x.json()).catch(() => ({ ok: false, error: "บันทึกไม่สำเร็จ" }))
}
