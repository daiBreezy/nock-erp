"use client"
/* eslint-disable no-restricted-syntax -- ds-exception: phone frame mock-up, not themed UI */

// One layout for both tabs of ฟอร์มผู้ปกครอง (owner 2026-11-06, so it's the same wherever you open it):
// the picker as a switch + its controls + เริ่มใหม่ on one row; the phone on the left, what it is on the right.
import { RotateCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PreviewLayout({ picker, controls, onRestart, phone, info }: {
  picker: React.ReactNode
  /** extra controls after the picker (language, brand, open in a new tab) */
  controls?: React.ReactNode
  onRestart: () => void
  phone: React.ReactNode
  info: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 [&>button]:whitespace-nowrap">
        {picker}
        {controls}
        <Button variant="outline" onClick={onRestart}><RotateCwIcon /> เริ่มใหม่</Button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[390px_1fr]">
        <div className="mx-auto h-190 w-97.5 max-w-full overflow-hidden rounded-[2.5rem] border-8 border-zinc-800 bg-zinc-800 shadow-xl">{phone}</div>
        <section className="h-190 max-h-190 space-y-4 overflow-y-auto rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">{info}</section>
      </div>
    </div>
  )
}
