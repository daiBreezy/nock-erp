"use client"

import { useState } from "react"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FormShell, useInPanel } from "./form-shell"
import { DICT } from "@/app/liff/form/i18n"
import { emptyFamilyDraft, emptyParentDraft, FamilyFields, ParentFields, parentDraftOf, parentInputOf, type FamilyDraft, type ParentDraft } from "@/components/people/person-fields"
import { familyNameFor, validateFamily } from "@/domain/rules/people"
import type { Family, Parent } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

const t = DICT.th

/** each parent being edited + the stored record it came from (keeps its LINE link when rows are removed / reordered) */
type Row = { draft: ParentDraft; stored?: Parent }

/**
 * Shared with families/page.tsx and the Inbox "create family from this conversation" flow.
 * owner 2026-10-15: exactly the fields of the parent's LINE form (components/people/person-fields) — what an admin
 * types for a walk-in lands where a form answer would. The family is named after the main parent's surname unless typed.
 */
export function FamilyForm({ family, initialName, initialParent, onClose, onSaved }: { family?: Family; initialName?: string; initialParent?: { name: string; phone?: string }; onClose: () => void; onSaved?: (f: Family) => void }) {
  const save = useStore((s) => s.saveFamily)
  const [rows, setRows] = useState<Row[]>(() =>
    family?.parents.length
      ? family.parents.map((p) => ({ draft: parentDraftOf(p), stored: p }))
      : [{ draft: { ...emptyParentDraft(initialParent?.name), phones: [initialParent?.phone ?? ""] } }],
  )
  const [primaryIdx, setPrimaryIdx] = useState(() => Math.max(0, family?.parents.findIndex((p) => p.primary) ?? 0))
  const [fam, setFam] = useState<FamilyDraft>(() => family ? {
    name: family.name, nameEn: family.nameEn ?? "", acquisitions: family.sources ?? [],
    address: family.address ?? "", province: family.province ?? "", postcode: family.postcode ?? "", location: family.location, addressNote: family.addressNote ?? "",
    wantTax: !!family.taxInfo, tax: family.taxInfo ?? { customerName: "", taxId: "", address: "" },
  } : { ...emptyFamilyDraft(), name: initialName ?? "" })
  const [touched, setTouched] = useState(false)
  const [newId] = useState(() => uid("fa"))

  const built: Family = {
    ...(family ?? { id: newId }),
    name: familyNameFor(fam.name, rows[primaryIdx]?.draft.last),
    nameEn: fam.nameEn.trim() || undefined,
    parents: rows.map(({ draft, stored }, i) => {
      const p = parentInputOf(draft, i === primaryIdx)
      return { ...stored, name: p.name, nameEn: p.nameEn, phone: p.phone, altPhones: p.altPhones?.length ? p.altPhones : undefined, email: p.email, relationship: p.relationship, birthDate: p.birthDate, primary: i === primaryIdx, lineLinked: stored?.lineLinked ?? false }
    }),
    sources: fam.acquisitions.length ? fam.acquisitions : undefined,
    address: fam.address.trim() || undefined, province: fam.province.trim() || undefined, postcode: fam.postcode.trim() || undefined,
    location: fam.location, addressNote: fam.addressNote.trim() || undefined,
    taxInfo: fam.wantTax && (fam.tax.customerName.trim() || fam.tax.taxId.trim()) ? fam.tax : undefined,
  }
  const errs = validateFamily(built)
  const err = (field: string) => (touched && errs.find((e) => e.field === field)?.message) || undefined
  const setDraft = (i: number, patch: Partial<ParentDraft>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, draft: { ...r.draft, ...patch } } : r)))

  const inPanel = useInPanel()
  const submit = () => {
    setTouched(true)
    const r = save(built)
    if (report(r, "บันทึกครอบครัวแล้ว")) {
      onSaved?.(r.value)
      if (!inPanel) onClose()
    }
  }

  return (
    <FormShell className="max-h-[92vh] sm:max-w-xl" onClose={onClose} title={family ? `แก้ไข ${family.name}` : "เพิ่มครอบครัว"}
      description="ช่องเดียวกับฟอร์มที่ผู้ปกครองกรอกใน LINE — ข้อมูลเก็บที่เดียวกัน"
      footer={<><Button variant="ghost" onClick={onClose}>ยกเลิก</Button><Button onClick={submit}>{family ? "บันทึก" : "เพิ่มครอบครัว"}</Button></>}>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t.parentTitle}</p>
          <Button size="xs" variant="secondary" onClick={() => setRows((rs) => [...rs, { draft: emptyParentDraft() }])}><PlusIcon /> {t.addParent}</Button>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="space-y-3 rounded-2xl border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{t.parentN(i + 1)}</p>
              <div className="flex items-center gap-2">
                {rows.length > 1 && <label className="flex items-center gap-1.5 text-xs"><Checkbox checked={primaryIdx === i} onCheckedChange={() => setPrimaryIdx(i)} /> {t.primaryParent}</label>}
                <Button size="icon-xs" variant="ghost" className="text-red-600" disabled={rows.length === 1} aria-label={t.remove}
                  onClick={() => { setRows((rs) => rs.filter((_, j) => j !== i)); setPrimaryIdx((p) => (p === i ? 0 : p > i ? p - 1 : p)) }}><TrashIcon /></Button>
              </div>
            </div>
            <ParentFields t={t} value={r.draft} onChange={(patch) => setDraft(i, patch)} linked={r.stored?.lineLinked ? r.stored.name : undefined}
              errors={{ name: err(`parent${i}.name`), phone: err(`parent${i}.phone`) }} />
          </div>
        ))}
        {err("parents") && <p className="text-xs text-red-700">{err("parents")}</p>}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold">{t.family}</p>
        <div className="rounded-2xl border p-3">
          <FamilyFields t={t} value={fam} onChange={(patch) => setFam((x) => ({ ...x, ...patch }))} parentLast={rows[primaryIdx]?.draft.last ?? ""}
            errors={{ name: err("name"), postcode: err("postcode") }} />
        </div>
      </section>
    </FormShell>
  )
}
