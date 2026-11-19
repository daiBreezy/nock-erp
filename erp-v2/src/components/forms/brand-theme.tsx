"use client"

// owner 2026-11-19: the parent forms wear their business's own colour — NockAcademy pink, Liclass blue (no logo on the form: "รก").
// Only the forms parents see (invoices / receipts keep the one company logo). The colour is the brand colour, set on the
// page's own scope so every Button / Checkbox / chip that reads `primary` follows it — nothing else in the app changes.

import type { CSSProperties } from "react"
import type { Brand, FormLang } from "@/domain/types"

export const BRAND_THEME: Record<Brand, { color: string; name: string; lang: FormLang }> = {
  nockacademy: { color: "#FF5A5E", name: "NockAcademy", lang: "th" },
  liclass: { color: "#069AE3", name: "Liclass", lang: "ja" },
}

/** the form opens in the business's own language (Liclass JP, NockAcademy TH) unless the link says otherwise */
export const brandLang = (brand: Brand | undefined): FormLang => BRAND_THEME[brand ?? "nockacademy"].lang

export function BrandScope({ brand, className, children }: { brand: Brand | undefined; className?: string; children: React.ReactNode }) {
  const b = BRAND_THEME[brand ?? "nockacademy"]
  const style = { "--primary": b.color, "--ring": b.color, "--primary-foreground": "#ffffff" } as CSSProperties
  return <div style={style} className={className}>{children}</div>
}
