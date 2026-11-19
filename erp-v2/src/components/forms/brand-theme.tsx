"use client"

// owner 2026-11-19: the parent forms wear their business's own look — NockAcademy pink, Liclass blue, each with its own logo.
// Only the forms parents see (invoices / receipts keep the one company logo). The colour is the brand colour, set on the
// page's own scope so every Button / Checkbox / chip that reads `primary` follows it — nothing else in the app changes.

import type { CSSProperties } from "react"
import type { Brand, FormLang } from "@/domain/types"

export const BRAND_THEME: Record<Brand, { color: string; logo: string; name: string; lang: FormLang }> = {
  nockacademy: { color: "#FF5A5E", logo: "/brand/logo-full.png", name: "NockAcademy", lang: "th" },
  liclass: { color: "#069AE3", logo: "/brand/liclass-logo.svg", name: "Liclass", lang: "ja" },
}

/** the form opens in the business's own language (Liclass JP, NockAcademy TH) unless the link says otherwise */
export const brandLang = (brand: Brand | undefined): FormLang => BRAND_THEME[brand ?? "nockacademy"].lang

export function BrandScope({ brand, className, children }: { brand: Brand | undefined; className?: string; children: React.ReactNode }) {
  const b = BRAND_THEME[brand ?? "nockacademy"]
  const style = { "--primary": b.color, "--ring": b.color, "--primary-foreground": "#ffffff" } as CSSProperties
  return <div style={style} className={className}>{children}</div>
}

export function BrandLogo({ brand, className }: { brand: Brand | undefined; className?: string }) {
  const b = BRAND_THEME[brand ?? "nockacademy"]
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={b.logo} alt={b.name} className={className ?? "h-7 w-auto"} />
}
