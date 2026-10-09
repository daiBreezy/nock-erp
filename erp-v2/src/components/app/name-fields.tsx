"use client"

// Names in two languages (owner 2026-10-09): NockAcademy types TH + EN, Liclass types JP + EN. English is optional —
// empty = the automatic romanization, shown as the placeholder.
import { Input } from "@/components/ui/input"
import { romanizeName } from "@/domain/rules/romanize"
import type { Brand } from "@/domain/types"
import { Field } from "./student-form"

/** "ชื่อเล่น (TH) *" / "ชื่อเล่น (JP) *" — the language the main name field is typed in */
export const nativeLabel = (brand: Brand, label: string, required = true) => `${label} (${brand === "liclass" ? "JP" : "TH"})${required ? " *" : ""}`

export function EnNameField({ label, native, value, onChange, className }: { label: string; native: string; value: string | undefined; onChange: (v: string | undefined) => void; className?: string }) {
  const auto = /[฀-๿]/.test(native) ? romanizeName(native) : ""
  return (
    <Field label={`${label} (EN) · ไม่บังคับ`} className={className}>
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} placeholder={auto || "English"} lang="en" />
    </Field>
  )
}
