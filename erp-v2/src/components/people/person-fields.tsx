"use client"

// owner 2026-10-15: "การสร้าง นักเรียน หรือผู้ปกครอง ใช้รูปแบบเดียวกันกับ Form" — one set of fields for the parent's
// LINE form (/liff/form) AND the admin's create / edit panels, so what an admin types by hand lands exactly where a
// form answer would. Add or change a field HERE and both sides change together.
//   ParentFields  — one parent: name (first + surname), English name, relationship, birthday, email, phones
//   FamilyFields  — the household: family name, how they found us, address + map pin, tax invoice
//   StudentFields — one child: name, nickname, English names, gender, grade, birthday, school, note
// Labels come from the form's dictionary (TH / EN / JP) — the admin panels use the Thai one.

import { PlusIcon, TrashIcon, CheckIcon } from "lucide-react"
import { MapPin } from "@/app/liff/form/map-pin"
import { DICT, REL_KEYS, relFromStored, relToStored, SOURCE_KEYS, type RelKey } from "@/app/liff/form/i18n"
import { InfoTip } from "@/components/app/info-tip"
import { NativeSelect } from "@/components/app/native-select"
import { SchoolPicker } from "@/components/app/school-picker"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { romanizeName } from "@/domain/rules/romanize"
import { joinName, splitName } from "@/domain/rules/people"
import type { FormParentInput, Gender, LeadSource } from "@/domain/types"
import { cn } from "@/lib/utils"

export type FieldsDict = (typeof DICT)["th"]
type Errors = Partial<Record<string, string | false | undefined>>

// ---------- drafts: what the fields edit ----------

export interface ParentDraft { first: string; last: string; nameEn: string; phones: string[]; email: string; rel: RelKey | ""; birthDate: string }
export interface StudentDraft { first: string; last: string; nameEn: string; nickname: string; nicknameEn: string; gender: Gender | ""; grade: string; birthDate: string; school: string; schoolId?: string; note: string }
export interface FamilyDraft {
  name: string; nameEn: string; acquisitions: LeadSource[]
  address: string; province: string; postcode: string; location?: { lat: number; lng: number }; addressNote: string
  wantTax: boolean; tax: { customerName: string; taxId: string; address: string }
}

export const emptyParentDraft = (name = ""): ParentDraft => ({ ...splitName(name), nameEn: "", phones: [""], email: "", rel: "", birthDate: "" })
export const emptyStudentDraft = (grade = ""): StudentDraft => ({ first: "", last: "", nameEn: "", nickname: "", nicknameEn: "", gender: "", grade, birthDate: "", school: "", note: "" })
export const emptyFamilyDraft = (): FamilyDraft => ({ name: "", nameEn: "", acquisitions: [], address: "", province: "", postcode: "", addressNote: "", wantTax: false, tax: { customerName: "", taxId: "", address: "" } })

/** a stored parent (family on file or a form answer) → the fields */
export function parentDraftOf(p: { name: string; nameEn?: string; phone: string; altPhones?: string[]; email?: string; relationship?: string; birthDate?: string }): ParentDraft {
  return { ...splitName(p.name), nameEn: p.nameEn ?? "", phones: [p.phone, ...(p.altPhones ?? [])], email: p.email ?? "", rel: relFromStored(p.relationship), birthDate: p.birthDate ?? "" }
}
/** the fields → what a form sends / what a family stores for this parent */
export function parentInputOf(d: ParentDraft, primary: boolean): FormParentInput {
  const phones = d.phones.map((x) => x.trim()).filter(Boolean)
  return {
    name: joinName(d), nameEn: d.nameEn.trim() || undefined, phone: phones[0] ?? "", altPhones: phones.slice(1),
    email: d.email.trim() || undefined, relationship: d.rel ? relToStored(d.rel) : undefined, birthDate: d.birthDate || undefined, primary,
  }
}
export function studentDraftOf(s: { name: string; nameEn?: string; nickname?: string; nicknameEn?: string; gender?: Gender; grade: string; birthDate?: string; school?: string; schoolId?: string; note?: string }): StudentDraft {
  return { ...splitName(s.name), nameEn: s.nameEn ?? "", nickname: s.nickname ?? "", nicknameEn: s.nicknameEn ?? "", gender: s.gender ?? "", grade: s.grade, birthDate: s.birthDate ?? "", school: s.school ?? "", schoolId: s.schoolId, note: s.note ?? "" }
}
/** the fields → a child as a form sends it / a student stores it (nickname empty = the first name) */
export function studentInputOf(d: StudentDraft) {
  return {
    name: joinName(d), nickname: d.nickname.trim() || d.first.trim(), nameEn: d.nameEn.trim() || undefined, nicknameEn: d.nicknameEn.trim() || undefined,
    gender: d.gender || undefined, grade: d.grade, birthDate: d.birthDate || undefined, school: d.school.trim() || undefined, schoolId: d.school.trim() ? d.schoolId : undefined, note: d.note.trim() || undefined,
  }
}

const ageOf = (birth: string) => { if (!birth) return null; const b = new Date(birth), n = new Date(); return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0) }
const optional = (t: FieldsDict, label: string) => `${label} · ${t.optional}`

// ---------- the fields ----------

export function ParentFields({ t, value: p, onChange, linked, errors = {} }: { t: FieldsDict; value: ParentDraft; onChange: (patch: Partial<ParentDraft>) => void; linked?: string; errors?: Errors }) {
  const autoEn = /[฀-๿]/.test(joinName(p)) ? romanizeName(joinName(p)) : ""
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <F label={`${t.firstName} *`} error={errors.name}><Input value={p.first} onChange={(e) => onChange({ first: e.target.value })} /></F>
        <F label={t.lastName}><Input value={p.last} onChange={(e) => onChange({ last: e.target.value })} /></F>
        <F label={optional(t, t.nameEn)} className="col-span-2"><Input lang="en" value={p.nameEn} placeholder={autoEn || "English"} onChange={(e) => onChange({ nameEn: e.target.value })} /></F>
        <F label={t.relationship}>
          <NativeSelect value={p.rel} onChange={(e) => onChange({ rel: e.target.value as RelKey | "" })} placeholder={t.select} options={REL_KEYS.map((k) => ({ value: k, label: t.rel[k] }))} />
        </F>
        <F label={t.birthDate}><Input type="date" value={p.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} /></F>
        <F label={t.email} className="col-span-2"><Input type="email" value={p.email} onChange={(e) => onChange({ email: e.target.value })} /></F>
      </div>
      {/* LINE is linked by opening the form in LINE (or from the Inbox) — nobody types a LINE ID (owner 2026-10-15) */}
      {linked && <p className="flex items-center gap-1.5 rounded-3xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckIcon className="size-4" />{t.lineLinked(linked)}</p>}
      <div className="space-y-1.5">
        <Label className="text-xs">{t.phone} *</Label>
        {p.phones.map((ph, k) => (
          <div key={k} className="flex items-center gap-1.5">
            <Input inputMode="tel" value={ph} placeholder="0812345678" onChange={(e) => onChange({ phones: p.phones.map((x, j) => (j === k ? e.target.value : x)) })} />
            {k === 0 ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary">{t.defaultTag}</span> : (
              <>
                <Button size="xs" variant="ghost" className="shrink-0" onClick={() => onChange({ phones: [ph, ...p.phones.filter((_, j) => j !== k)] })}>{t.makeDefault}</Button>
                <Button size="icon-xs" variant="ghost" className="shrink-0 text-red-600" aria-label={t.remove} onClick={() => onChange({ phones: p.phones.filter((_, j) => j !== k) })}><TrashIcon /></Button>
              </>
            )}
          </div>
        ))}
        {errors.phone && <p className="text-xs text-red-700">{errors.phone}</p>}
        <Button size="xs" variant="secondary" onClick={() => onChange({ phones: [...p.phones, ""] })}><PlusIcon /> {t.addPhone}</Button>
      </div>
    </div>
  )
}

export function FamilyFields({ t, value: f, onChange, parentLast, errors = {} }: { t: FieldsDict; value: FamilyDraft; onChange: (patch: Partial<FamilyDraft>) => void; parentLast: string; errors?: Errors }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <F label={optional(t, t.familyName)} hint={t.familyNameSub} error={errors.name}><Input value={f.name} placeholder={t.familyNamePh(parentLast.trim())} onChange={(e) => onChange({ name: e.target.value })} /></F>
        <F label={optional(t, t.familyNameEn)}><Input lang="en" value={f.nameEn} placeholder="English" onChange={(e) => onChange({ nameEn: e.target.value })} /></F>
      </div>
      <div className="border-t pt-3">
        <p className="text-sm font-semibold">{t.acquisition}</p>
        <p className="mb-2 text-xs text-muted-foreground">{t.acquisitionSub}</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {SOURCE_KEYS.map((k) => {
            const on = f.acquisitions.includes(k)
            return (
              <label key={k} className={cn("flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm", on ? "border-primary bg-primary/10" : "text-muted-foreground")}>
                <Checkbox checked={on} onCheckedChange={() => onChange({ acquisitions: on ? f.acquisitions.filter((x) => x !== k) : [...f.acquisitions, k] })} /> {t.src[k]}
              </label>
            )
          })}
        </div>
      </div>
      <div className="space-y-2 border-t pt-3">
        <div><p className="text-sm font-semibold">{t.address}</p><p className="text-xs text-muted-foreground">{t.addressSub} · {t.pinSub}</p></div>
        <MapPin value={f.location} onChange={(location) => onChange({ location })} locateLabel={t.locate} />
        <Input value={f.address} onChange={(e) => onChange({ address: e.target.value })} placeholder={t.addressLine} />
        <div className="grid grid-cols-2 gap-2">
          <Input value={f.province} onChange={(e) => onChange({ province: e.target.value })} placeholder={t.province} />
          <div>
            <Input inputMode="numeric" maxLength={5} value={f.postcode} onChange={(e) => onChange({ postcode: e.target.value })} placeholder={t.postcode} />
            {errors.postcode && <p className="mt-0.5 text-xs text-red-700">{errors.postcode}</p>}
          </div>
        </div>
        <F label={t.addressNote}><Textarea rows={2} value={f.addressNote} onChange={(e) => onChange({ addressNote: e.target.value })} placeholder={t.addressNotePh} /></F>
      </div>
      <div className="border-t pt-3">
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={f.wantTax} onCheckedChange={(v) => onChange({ wantTax: !!v })} className="mt-0.5" /><span><span className="font-semibold">{t.tax}</span><span className="block text-xs text-muted-foreground">{t.taxSub}</span></span></label>
        {f.wantTax && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <F label={t.taxName}><Input value={f.tax.customerName} onChange={(e) => onChange({ tax: { ...f.tax, customerName: e.target.value } })} /></F>
            <F label={t.taxId}><Input inputMode="numeric" value={f.tax.taxId} onChange={(e) => onChange({ tax: { ...f.tax, taxId: e.target.value } })} /></F>
            <F label={t.taxAddress} className="col-span-2"><Input value={f.tax.address} onChange={(e) => onChange({ tax: { ...f.tax, address: e.target.value } })} /></F>
          </div>
        )}
      </div>
    </div>
  )
}

export function StudentFields({ t, value: s, onChange, grades, gradeLabel = (g) => g, province, maxBirth, errors = {} }: {
  t: FieldsDict; value: StudentDraft; onChange: (patch: Partial<StudentDraft>) => void; grades: string[]; gradeLabel?: (g: string) => string
  /** the branch's province — its schools come first in the school list */
  province?: string; maxBirth?: string; errors?: Errors
}) {
  const age = ageOf(s.birthDate)
  const full = joinName(s)
  const autoEn = /[฀-๿]/.test(full) ? romanizeName(full) : ""
  const autoNickEn = /[฀-๿]/.test(s.nickname) ? romanizeName(s.nickname) : ""
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <F label={`${t.firstName} *`} error={errors.name}><Input value={s.first} onChange={(e) => onChange({ first: e.target.value })} /></F>
        <F label={t.lastName}><Input value={s.last} onChange={(e) => onChange({ last: e.target.value })} /></F>
        <F label={t.nickname} error={errors.nickname}><Input value={s.nickname} placeholder={s.first} onChange={(e) => onChange({ nickname: e.target.value })} /></F>
        <F label={`${t.grade} *`} error={errors.grade}>
          <NativeSelect value={s.grade} onChange={(e) => onChange({ grade: e.target.value })} placeholder={t.select} options={grades.map((g) => ({ value: g, label: gradeLabel(g) }))} />
        </F>
        <F label={optional(t, t.nameEn)}><Input lang="en" value={s.nameEn} placeholder={autoEn || "English"} onChange={(e) => onChange({ nameEn: e.target.value })} /></F>
        <F label={optional(t, t.nicknameEn)}><Input lang="en" value={s.nicknameEn} placeholder={autoNickEn || "English"} onChange={(e) => onChange({ nicknameEn: e.target.value })} /></F>
        <F label={optional(t, t.gender)}>
          <NativeSelect value={s.gender} onChange={(e) => onChange({ gender: e.target.value as Gender | "" })} placeholder={t.select} options={(["male", "female"] as const).map((g) => ({ value: g, label: t.genders[g] }))} />
        </F>
        <F label={`${t.birthDate}${age !== null ? ` · ${t.age(age)}` : ""}`} error={errors.birthDate}><Input type="date" max={maxBirth} value={s.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} /></F>
        <F label={t.school} className="col-span-2"><SchoolPicker value={s.school} schoolId={s.schoolId} province={province} onChange={(v) => onChange({ school: v.school ?? "", schoolId: v.schoolId })} /></F>
      </div>
      <F label={t.note}><Textarea rows={2} maxLength={250} value={s.note} onChange={(e) => onChange({ note: e.target.value })} placeholder={t.notePh} /></F>
    </div>
  )
}

function F({ label, hint, error, className, children }: { label: string; hint?: string; error?: string | false; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      {/* owner 2026-10-13: no grey helper lines under fields — the explanation sits behind an ⓘ */}
      <Label className="text-xs">{label}{hint && <InfoTip text={hint} className="-my-1" />}</Label>
      {children}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
