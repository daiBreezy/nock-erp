"use client"

import { Suspense, useMemo } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { catalogSnapshot } from "@/lib/forms"
import { useStore } from "@/store/store"

// client only — the language / data come from this browser (no server render to mismatch), like /liff/form
const CatalogApp = dynamic(() => import("./catalog-app").then((m) => m.CatalogApp), { ssr: false })

// The course catalog outside LINE (owner 2026-10-22): a copied link, or ?preview=<branchId> — the admin's own look
// at what parents will see, built from this browser's data (nothing is sent).
export default function CatalogPage() {
  return <Suspense fallback={null}><Catalog /></Suspense>
}

function Catalog() {
  const params = useSearchParams()
  const previewBranch = params.get("preview")
  const branchId = useStore((s) => s.branchId)
  const preview = useMemo(() => {
    if (previewBranch === null) return undefined
    const now = new Date().toISOString()
    return { token: "preview", kind: "catalog" as const, ...catalogSnapshot(previewBranch || branchId), createdAt: now, updatedAt: now }
  }, [previewBranch, branchId])
  return <CatalogApp token={params.get("token") ?? ""} preview={preview} />
}
