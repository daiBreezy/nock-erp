"use client"

// owner 2026-11-19: an invoice that travelled with an enroll form — when it is paid or voided the form's link must say so (no double pay, no
// money for a dead invoice). Watches the invoices and tells the server only when one CHANGES to paid / void; the server touches just the links carrying it.
import { useEffect, useRef } from "react"
import { syncEnrollInvoice } from "@/lib/forms"
import { useStore } from "@/store/store"

/** owner 2026-11-25: a family set is "paid" for the parent's link only when every invoice of the set is */
const setPaid = (invoices: { id: string; status: string; bundleId?: string }[], id: string) => {
  const b = invoices.find((i) => i.id === id)?.bundleId
  return !b || invoices.filter((i) => i.bundleId === b && i.status !== "void").every((i) => i.status === "paid")
}

export function EnrollInvoiceSync() {
  const invoices = useStore((s) => s.invoices)
  const seen = useRef<Map<string, string> | null>(null)
  useEffect(() => {
    const now = new Map(invoices.map((i) => [i.id, i.status as string]))
    if (seen.current) {
      for (const [id, status] of now) {
        const before = seen.current.get(id)
        if (before && before !== status && (status === "paid" || status === "void")) void syncEnrollInvoice(id, status, status === "paid" ? setPaid(invoices, id) : undefined)
        else if (before === "void" || before === "paid") { if (status !== before && status !== "paid" && status !== "void") void syncEnrollInvoice(id, "open") }
      }
    }
    seen.current = now
  }, [invoices])
  return null
}
