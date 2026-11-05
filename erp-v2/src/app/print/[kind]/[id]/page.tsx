"use client"

import { useParams } from "next/navigation"
import { PrintDocument, type Kind } from "@/components/billing/print-document"

export default function Page() {
  const { kind, id } = useParams<{ kind: Kind; id: string }>()
  return <PrintDocument kind={kind} id={id} />
}
