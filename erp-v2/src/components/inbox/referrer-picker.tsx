"use client"

// owner 2026-11-19: "who told you about us" is free text on the parent form — the system suggests the family, the admin confirms
// (or searches by hand). Shared by the Test/Trial review card and the enroll review dialog. 1 point is shared by that family's
// teachers once the new family has paid — see domain/rules/referral.ts.
import { familyDisplay } from "@/domain/rules/people"
import { useState } from "react"
import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { suggestReferrers } from "@/domain/rules/referral"
import type { ID } from "@/domain/types"
import { useStore } from "@/store/store"

export function ReferrerPicker({ text, exceptFamilyId, value, onChange }: { text: string; exceptFamilyId?: ID; value: ID | null; onChange: (id: ID | null) => void }) {
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const [q, setQ] = useState("")
  const words = (q || text).trim()
  const suggestions = words ? suggestReferrers(words, families, students, exceptFamilyId) : []
  const referrer = families.find((f) => f.id === value)
  return (
    <div className="space-y-1.5 rounded-lg border bg-background p-2 text-xs">
      <p><span className="text-muted-foreground">ใครแนะนำ (ผู้ปกครองพิมพ์):</span> <b>{text}</b></p>
      {referrer ? (
        <p className="flex items-center gap-1.5"><CheckIcon className="size-3 text-success" /> ตรงกับ <b>{referrer.name}</b><Button variant="link" size="inline" type="button" onClick={() => onChange(null)}>เปลี่ยน</Button></p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((x) => (
              <Button key={x.family.id} variant="chip" size="inline" type="button" className="px-2.5 py-1 text-xs" onClick={() => onChange(x.family.id)}>{familyDisplay(x.family.name)}<span className="ml-1 text-muted-foreground">· {x.why}</span></Button>
            ))}
            {!suggestions.length && <span className="text-muted-foreground">ยังเดาไม่ได้ — ค้นหาเอง</span>}
          </div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อผู้ปกครอง / นักเรียน" className="h-8 text-xs" />
        </>
      )}
      <p className="text-2xs text-muted-foreground">ครูของคอร์สที่ครอบครัวนั้นเรียนได้คะแนนคนละเท่าๆ กัน (รวม 1 คะแนน) เมื่อครอบครัวใหม่ชำระเงินแล้ว</p>
    </div>
  )
}
