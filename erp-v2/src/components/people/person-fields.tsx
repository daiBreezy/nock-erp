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
import { reverseGeocode } from "@/lib/reverse-geocode"
import { MultiPick } from "@/components/app/multi-pick"
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
import { addressPartsOf, composeAddress } from "@/domain/rules/address"
import { joinName, splitName } from "@/domain/rules/people"
import type { AddressParts, BusUse, FormParentInput, Gender, LeadSource, PdpaChoice } from "@/domain/types"
import { cn } from "@/lib/utils"

export type FieldsDict = (typeof DICT)["th"]
type Errors = Partial<Record<string, string | false | undefined>>

// ---------- drafts: what the fields edit ----------

export interface ParentDraft { /** surname first (Liclass, owner 2026-11-19) */ sf?: boolean; first: string; last: string; nameEn: string; phones: string[]; email: string; rel: RelKey | ""; birthDate: string }
export interface StudentDraft { /** surname first + no nickname (Liclass, owner 2026-11-19) */ sf?: boolean; first: string; last: string; nameEn: string; nickname: string; nicknameEn: string; gender: Gender | ""; grade: string; birthDate: string; school: string; schoolId?: string; note: string }
export interface FamilyDraft {
  name: string; nameEn: string; acquisitions: LeadSource[]
  address: string; parts: AddressParts; province: string; postcode: string; location?: { lat: number; lng: number }; addressNote: string
  wantTax: boolean; tax: { customerName: string; taxId: string; address: string }
  /** owner 2026-11-19 (parent form): "Bus use?" — ticked = the location block shows + one of the legs · referral = free text · pdpa = photo consent */
  busUse: boolean; busLeg: BusUse; referral: string; pdpa: PdpaChoice | ""
  /** the names ticked from the branch's own source list (owner 2026-11-19) */
  sourceLabels: string[]
}

export const emptyParentDraft = (name = "", sf = false): ParentDraft => ({ sf, ...splitName(name, sf), nameEn: "", phones: [""], email: "", rel: "", birthDate: "" })
export const emptyStudentDraft = (grade = "", sf = false): StudentDraft => ({ sf, first: "", last: "", nameEn: "", nickname: "", nicknameEn: "", gender: "", grade, birthDate: "", school: "", note: "" })
export { addressPartsOf }

/** a branch's own channel names → the standard channel they stand for (same name as a standard one), else "other" — so Reports keep counting */
export function sourceKeysOf(labels: string[], t: FieldsDict): LeadSource[] {
  const std = Object.entries(t.src).map(([k, v]) => [k as LeadSource, String(v).toLowerCase()] as const)
  return [...new Set(labels.map((l) => std.find(([, v]) => v === l.trim().toLowerCase())?.[0] ?? ("other" as LeadSource)))]
}

export const emptyFamilyDraft = (): FamilyDraft => ({ name: "", nameEn: "", acquisitions: [], address: "", parts: {}, province: "", postcode: "", addressNote: "", wantTax: false, tax: { customerName: "", taxId: "", address: "" }, busUse: false, busLeg: "both", referral: "", pdpa: "", sourceLabels: [] })

/** a stored parent (family on file or a form answer) → the fields */
export function parentDraftOf(p: { name: string; nameEn?: string; phone: string; altPhones?: string[]; email?: string; relationship?: string; birthDate?: string }, sf = false): ParentDraft {
  return { sf, ...splitName(p.name, sf), nameEn: p.nameEn ?? "", phones: [p.phone, ...(p.altPhones ?? [])], email: p.email ?? "", rel: relFromStored(p.relationship), birthDate: p.birthDate ?? "" }
}
/** the fields → what a form sends / what a family stores for this parent */
export function parentInputOf(d: ParentDraft, primary: boolean): FormParentInput {
  const phones = d.phones.map((x) => x.trim()).filter(Boolean)
  return {
    name: joinName(d), nameEn: d.nameEn.trim() || undefined, phone: phones[0] ?? "", altPhones: phones.slice(1),
    email: d.email.trim() || undefined, relationship: d.rel ? relToStored(d.rel) : undefined, birthDate: d.birthDate || undefined, primary,
  }
}
export function studentDraftOf(s: { name: string; nameEn?: string; nickname?: string; nicknameEn?: string; gender?: Gender; grade: string; birthDate?: string; school?: string; schoolId?: string; note?: string }, sf = false): StudentDraft {
  return { sf, ...splitName(s.name, sf), nameEn: s.nameEn ?? "", nickname: s.nickname ?? "", nicknameEn: s.nicknameEn ?? "", gender: s.gender ?? "", grade: s.grade, birthDate: s.birthDate ?? "", school: s.school ?? "", schoolId: s.schoolId, note: s.note ?? "" }
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

export function ParentFields({ t, value: p, onChange, linked, errors = {}, bareName }: { t: FieldsDict; value: ParentDraft; onChange: (patch: Partial<ParentDraft>) => void; linked?: string; errors?: Errors
  /** the parent form: the section card above already says who this is, so the first group carries no heading of its own */
  bareName?: boolean }) {
  const autoEn = /[฀-๿]/.test(joinName(p)) ? romanizeName(joinName(p)) : ""
  const basic = (
    <div className="grid grid-cols-2 gap-2">
      <F label={t.relationship}>
        <NativeSelect value={p.rel} onChange={(e) => onChange({ rel: e.target.value as RelKey | "" })} placeholder={t.select} options={REL_KEYS.map((k) => ({ value: k, label: t.rel[k] }))} />
      </F>
      <F label={optional(t, t.birthDate)}><Input type="date" value={p.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} /></F>
    </div>
  )
  const emailField = <F label={optional(t, t.email)} error={errors.email}><Input type="email" value={p.email} onChange={(e) => onChange({ email: e.target.value })} /></F>
  return (
    // owner 2026-11-09: ONE field per line, each group under a small heading (name · general · contact)
    <div className="space-y-4">
      <Group title={bareName ? undefined : t.grpName} first>
        {p.sf && <F label={t.lastName}><Input value={p.last} onChange={(e) => onChange({ last: e.target.value })} /></F>}
        <F label={`${t.firstName} *`} error={errors.name}><Input value={p.first} onChange={(e) => onChange({ first: e.target.value })} /></F>
        {!p.sf && <F label={t.lastName}><Input value={p.last} onChange={(e) => onChange({ last: e.target.value })} /></F>}
      </Group>
      {!p.sf && <Group>
        <F label={optional(t, t.nameEn)}><Input lang="en" value={p.nameEn} placeholder={autoEn || "English"} onChange={(e) => onChange({ nameEn: e.target.value })} /></F>
      </Group>}
      <Group title={t.grpBasic}>{basic}</Group>
      <Group title={t.grpContact}>
        {/* LINE is linked by opening the form in LINE (or from the Inbox) — nobody types a LINE ID (owner 2026-10-15) */}
        {linked && <p className="flex items-center gap-1.5 rounded-3xl bg-success-soft/60 px-3 py-2 text-sm text-success-ink"><CheckIcon className="size-4" />{t.lineLinked(linked)}</p>}
        {emailField}
        <div data-invalid={errors.phone ? "" : undefined} className="min-w-0 space-y-1.5">
          <Label className="text-xs">{t.phone} *</Label>
          {p.phones.map((ph, k) => (
            <div key={k} className="flex items-center gap-1.5">
              <Input inputMode="tel" aria-invalid={k === 0 && !!errors.phone} value={ph} placeholder="0812345678" onChange={(e) => onChange({ phones: p.phones.map((x, j) => (j === k ? e.target.value : x)) })} />
              {k === 0 ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-2xs text-primary">{t.defaultTag}</span> : (
                <>
                  <Button size="xs" variant="ghost" className="shrink-0" onClick={() => onChange({ phones: [ph, ...p.phones.filter((_, j) => j !== k)] })}>{t.makeDefault}</Button>
                  <Button size="icon-xs" variant="ghost" className="shrink-0 text-danger" aria-label={t.remove} onClick={() => onChange({ phones: p.phones.filter((_, j) => j !== k) })}><TrashIcon /></Button>
                </>
              )}
            </div>
          ))}
          {errors.phone && <p className="text-xs text-danger">{errors.phone}</p>}
          <Button size="xs" variant="secondary" onClick={() => onChange({ phones: [...p.phones, ""] })}><PlusIcon /> {t.addPhone}</Button>
        </div>
      </Group>
    </div>
  )
}

export function FamilyFields({ t, value: f, onChange, parentLast, errors = {}, hideName, busOffered, extras, sourceOptions }: {
  t: FieldsDict; value: FamilyDraft; onChange: (patch: Partial<FamilyDraft>) => void; parentLast: string; errors?: Errors
  /** owner 2026-11-19: the branch runs a bus → "Bus use?" decides whether the location block shows (no bus = the address block is always there) */
  busOffered?: boolean
  /** the parent's form only: who told you about us (free text) + the PDPA photo question */
  extras?: boolean
  /** owner 2026-11-19: this branch's own "how did you hear about us" list — unset = the standard channels */
  sourceOptions?: string[]
  /** the parent's form (owner 2026-11-18): the family is named after the parent's surname, so nobody is asked for it — the admin panels still show it */
  hideName?: boolean
}) {
  const parts = { t, f, onChange, errors, sourceOptions, extras, busOffered }
  return (
    // owner 2026-11-09: ONE field per line (province and postcode too), every group under its heading
    <div className="space-y-4">
      {!hideName && <Group title={t.grpFamily} first>
        <F label={optional(t, t.familyName)} hint={t.familyNameSub} error={errors.name}><Input value={f.name} placeholder={t.familyNamePh(parentLast.trim())} onChange={(e) => onChange({ name: e.target.value })} /></F>
        <F label={optional(t, t.familyNameEn)}><Input lang="en" value={f.nameEn} placeholder="English" onChange={(e) => onChange({ nameEn: e.target.value })} /></F>
      </Group>}
      <FamilyAcquisition {...parts} first={hideName} />
      <FamilyBus {...parts} />
      <FamilyPdpa t={t} f={f} onChange={onChange} />
      <FamilyTax t={t} f={f} onChange={onChange} />
    </div>
  )
}

type PartProps = { t: FieldsDict; f: FamilyDraft; onChange: (patch: Partial<FamilyDraft>) => void }

/** owner 2026-11-20: the parent form shows each of these as its own numbered section card, so they are separate pieces */
export function FamilyAcquisition({ t, f, onChange, sourceOptions, extras, first }: PartProps & { sourceOptions?: string[]; extras?: boolean; first?: boolean }) {
  return (
    <>
      {/* owner 2026-11-18: a dropdown you can tick several in — saves the space the 7 boxes took */}
      <Group title={t.acquisition} sub={t.acquisitionSub} first={first}>
        {sourceOptions?.length
          ? <MultiPick value={f.sourceLabels} onChange={(sourceLabels) => onChange({ sourceLabels, acquisitions: sourceKeysOf(sourceLabels, t) })} placeholder={t.select} options={sourceOptions.map((x) => ({ value: x, label: x }))} />
          : <MultiPick value={f.acquisitions} onChange={(acquisitions) => onChange({ acquisitions })} placeholder={t.select} options={SOURCE_KEYS.map((k) => ({ value: k, label: t.src[k] }))} />}
      </Group>
      {extras && (
        <Group title={t.referral}>
          <Input value={f.referral} placeholder={t.referralPh} onChange={(e) => onChange({ referral: e.target.value })} />
        </Group>
      )}
    </>
  )
}

export function FamilyBus({ t, f, onChange, errors = {}, busOffered, first }: PartProps & { errors?: Errors; busOffered?: boolean; first?: boolean }) {
  return (
    <>
      {busOffered && (
        <Group first={first}>
          <label className="flex items-start gap-2 text-sm"><Checkbox checked={f.busUse} onCheckedChange={(v) => onChange({ busUse: !!v })} className="mt-0.5" /><span><span className="font-semibold">{t.busUse}</span><span className="block text-xs text-muted-foreground">{t.busUseSub}</span></span></label>
          {f.busUse && (
            <div className="flex flex-wrap gap-1.5 pl-6">
              {(["pickup", "dropoff", "both"] as const).map((k) => (
                <Button variant="chip" size="inline" key={k} type="button" aria-pressed={f.busLeg === k} onClick={() => onChange({ busLeg: k })} className="px-3 py-1.5 text-sm">{t.busLeg[k]}</Button>
              ))}
            </div>
          )}
        </Group>
      )}
      {(!busOffered || f.busUse) && (
        <Group title={optional(t, t.address)} sub={t.pinSub} first={first && !busOffered}>
          <AddressFields t={t} value={f} onChange={onChange} errors={errors} />
        </Group>
      )}
    </>
  )
}

export function FamilyPdpa({ t, f, onChange, noTitle }: PartProps & { /** the section card above already carries the title */ noTitle?: boolean }) {
  return (
        <Group title={noTitle ? undefined : t.pdpaTitle} sub={t.pdpaSub} first={noTitle}>
          <div className="space-y-1.5">
            {(["allow", "blur", "deny"] as const).map((k) => (
              <Button variant="row" size="inline" key={k} type="button" aria-pressed={f.pdpa === k} onClick={() => onChange({ pdpa: k })}
                className={cn("flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm", f.pdpa === k ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border", f.pdpa === k && "border-primary bg-primary text-primary-foreground")}>{f.pdpa === k && <CheckIcon className="size-3.5" />}</span>
                <span className="min-w-0 flex-1">{t.pdpa[k]}</span>
              </Button>
            ))}
          </div>
        </Group>
  )
}

export function FamilyTax({ t, f, onChange, first }: PartProps & { first?: boolean }) {
  return (
    <>
      {/* the checkbox's own label is this group's heading — no second title above it */}
      <Group first={first}>
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={f.wantTax} onCheckedChange={(v) => onChange({ wantTax: !!v })} className="mt-0.5" /><span><span className="font-semibold">{t.tax}</span><span className="block text-xs text-muted-foreground">{t.taxSub}</span></span></label>
        {f.wantTax && (
          <div className="space-y-3">
            <F label={t.taxName}><Input value={f.tax.customerName} onChange={(e) => onChange({ tax: { ...f.tax, customerName: e.target.value } })} /></F>
            <F label={t.taxId}><Input inputMode="numeric" value={f.tax.taxId} onChange={(e) => onChange({ tax: { ...f.tax, taxId: e.target.value } })} /></F>
            <F label={t.taxAddress}><Input value={f.tax.address} onChange={(e) => onChange({ tax: { ...f.tax, address: e.target.value } })} /></F>
          </div>
        )}
      </Group>
    </>
  )
}

export function StudentFields({ t, value: s, onChange, grades, gradeLabel = (g) => g, province, maxBirth, lastPh, errors = {}, bareName }: {
  /** the parent form: the section card above already says who this is, so the first group carries no heading of its own */
  bareName?: boolean
  t: FieldsDict; value: StudentDraft; onChange: (patch: Partial<StudentDraft>) => void; grades: string[]; gradeLabel?: (g: string) => string
  /** the branch's province — its schools come first in the school list */
  province?: string; maxBirth?: string; errors?: Errors
  /** the parent's surname, shown faded in the surname box (owner 2026-11-18) — the form uses it when the box is left empty */
  lastPh?: string
}) {
  const age = ageOf(s.birthDate)
  const full = joinName(s)
  const autoEn = /[฀-๿]/.test(full) ? romanizeName(full) : ""
  const autoNickEn = /[฀-๿]/.test(s.nickname) ? romanizeName(s.nickname) : ""
  const nameEns = (
    <>
      {!s.sf && <F label={optional(t, t.nameEn)}><Input lang="en" value={s.nameEn} placeholder={autoEn || "English"} onChange={(e) => onChange({ nameEn: e.target.value })} /></F>}
      {!s.sf && <F label={optional(t, t.nicknameEn)}><Input lang="en" value={s.nicknameEn} placeholder={autoNickEn || "English"} onChange={(e) => onChange({ nicknameEn: e.target.value })} /></F>}
    </>
  )
  const genderField = (
      <F label={optional(t, t.gender)}>
        <NativeSelect value={s.gender} onChange={(e) => onChange({ gender: e.target.value as Gender | "" })} options={[...(["male", "female"] as const).map((g) => ({ value: g, label: t.genders[g] })), { value: "", label: t.genderNone }]} />
      </F>
  )
  const birthField = (
      <F label={`${optional(t, t.birthDate)}${age !== null ? ` · ${t.age(age)}` : ""}`} error={errors.birthDate}><Input type="date" max={maxBirth} value={s.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} /></F>
  )
  const schoolNote = (
    <>
      <Group title={optional(t, t.school)}>
        <SchoolPicker value={s.school} schoolId={s.schoolId} province={province} onChange={(v) => onChange({ school: v.school ?? "", schoolId: v.schoolId })} />
      </Group>
      <Group title={t.note}>
        <Textarea rows={2} maxLength={250} value={s.note} onChange={(e) => onChange({ note: e.target.value })} placeholder={t.notePh} />
      </Group>
    </>
  )
  return (
    // owner 2026-11-09: ONE field per line, each group under a small heading (name · general · school · note)
    <div className="space-y-4">
      <Group title={bareName ? undefined : t.grpStudentName} first>
        {s.sf && <F label={t.lastName}><Input value={s.last} placeholder={lastPh} onChange={(e) => onChange({ last: e.target.value })} /></F>}
        <F label={`${t.firstName} *`} error={errors.name}><Input value={s.first} onChange={(e) => onChange({ first: e.target.value })} /></F>
        {!s.sf && <F label={t.lastName}><Input value={s.last} placeholder={lastPh} onChange={(e) => onChange({ last: e.target.value })} /></F>}
        {/* owner 2026-11-19: Japanese children have no nickname — Liclass asks for none (the given name stands in) */}
        {!s.sf && <F label={t.nickname} error={errors.nickname}><Input value={s.nickname} placeholder={s.first} onChange={(e) => onChange({ nickname: e.target.value })} /></F>}
      </Group>
      {!s.sf && <Group>{nameEns}</Group>}
      <Group title={t.grpBasic}>
        {/* owner 2026-11-20: grade and gender share a line */}
        <div className="grid grid-cols-2 gap-2">
          <F label={`${t.grade} *`} error={errors.grade}>
            <NativeSelect value={s.grade} onChange={(e) => onChange({ grade: e.target.value })} placeholder={t.select} options={grades.map((g) => ({ value: g, label: gradeLabel(g) }))} />
          </F>
          {genderField}
        </div>
        {birthField}
      </Group>
      {schoolNote}
    </div>
  )
}

export type AddressDraft = Pick<FamilyDraft, "address" | "parts" | "province" | "postcode" | "location" | "addressNote">

/** map pin + the lean address fields (owner 2026-11-09): province → postcode → address line → sub-district / district → directions.
 *  The LINE form, the admin family panel AND the parent app's "pin home" page all use this one block. `address` is recomposed from the parts. */
export function AddressFields({ t, value: f, onChange, errors = {} }: { t: FieldsDict; value: AddressDraft; onChange: (patch: Partial<AddressDraft>) => void; errors?: Errors }) {
  const setPart = (k: keyof AddressParts, v: string) => { const parts = { ...f.parts, [k]: v }; onChange({ parts, address: composeAddress(parts) }) }
  // owner 2026-11-18: "ใช้ตำแหน่งปัจจุบัน" fills province / postcode / address / area from the pin — what the map cannot know stays for the parent
  const fill = async (ll: { lat: number; lng: number }) => {
    const a = await reverseGeocode(ll.lat, ll.lng)
    if (!a) return
    const parts = { ...f.parts, ...(a.line ? { line: a.line } : {}), ...(a.area ? { area: a.area } : {}) }
    onChange({ ...(a.province ? { province: a.province } : {}), ...(a.postcode ? { postcode: a.postcode } : {}), parts, address: composeAddress(parts) })
  }
  return (
    <>
      <MapPin value={f.location} onChange={(location) => onChange({ location })} onLocate={fill} locateLabel={t.locate} />
      <F label={t.province}><Input value={f.province} onChange={(e) => onChange({ province: e.target.value })} /></F>
      <F label={t.postcode} error={errors.postcode}><Input inputMode="numeric" maxLength={5} value={f.postcode} onChange={(e) => onChange({ postcode: e.target.value })} /></F>
      <F label={t.addrPart.line}><Input value={f.parts.line ?? ""} placeholder={t.addrLinePh} onChange={(e) => setPart("line", e.target.value)} /></F>
      <F label={t.addrPart.area}><Input value={f.parts.area ?? ""} placeholder={t.addrAreaPh} onChange={(e) => setPart("area", e.target.value)} /></F>
      <F label={t.addressNote}><Textarea rows={2} value={f.addressNote} onChange={(e) => onChange({ addressNote: e.target.value })} placeholder={t.addressNotePh} /></F>
    </>
  )
}

/** a group of fields under a small heading (the first one has no rule above it) — the same heading look as the rest of the forms */
function Group({ title, sub, first, children }: { title?: string; sub?: string; first?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("space-y-2.5", !first && "border-t pt-4")}>
      {title && <div><p className="text-sm font-semibold">{title}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>}
      {children}
    </section>
  )
}

function F({ label, hint, error, className, children }: { label: string; hint?: string; error?: string | false; className?: string; children: React.ReactNode }) {
  return (
    // owner 2026-11-20: a field with a problem gets a red outline + the reason in words (data-invalid lets the form scroll to the first one)
    <div data-invalid={error ? "" : undefined} className={cn("min-w-0 space-y-1", error && "[&_input]:border-destructive [&_input]:ring-3 [&_input]:ring-destructive/20 [&_button[role=combobox]]:border-destructive [&_button[role=combobox]]:ring-3 [&_button[role=combobox]]:ring-destructive/20", className)}>
      {/* owner 2026-10-13: no grey helper lines under fields — the explanation sits behind an ⓘ */}
      <Label className="text-xs">{label}{hint && <InfoTip text={hint} className="-my-1" />}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
