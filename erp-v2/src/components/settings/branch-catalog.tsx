"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { durationsOf, GRADE_GROUPS, PRICE_UNIT_LABEL, priceOf, setPrice, sortGrades } from "@/domain/rules/settings"
import type { Branch, PriceUnit } from "@/domain/types"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { SaveRow, SettingsCard, useBranchDraft } from "./common"
import { durationText, tx } from "@/lib/i18n"

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
      {on && <CheckIcon className="size-3.5" />}{children}
    </button>
  )
}

const toggle = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x])

export function SubjectsTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["subjects"])
  const catalog = useStore((s) => s.system.subjects)
  return (
    <SettingsCard title={tx("วิชา (Subjects)")} hint={tx("วิชาที่สาขานี้สอน — กำหนดว่าวิชาไหนขึ้นในตารางราคา คอร์ส และคลาส · เพิ่ม/เปลี่ยนชื่อวิชาที่ Settings → System")}
      action={<Button size="xs" variant="outline" nativeButton={false} render={<Link href="/settings?view=system" />}>{tx("แคตตาล็อกวิชา")}</Button>}>
      <div className="flex flex-wrap gap-2">
        {catalog.map((s) => <Chip key={s} on={b.subjects.includes(s)} onClick={() => setB({ ...b, subjects: toggle(b.subjects, s) })}>{s}</Chip>)}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึกวิชาแล้ว"))} />
    </SettingsCard>
  )
}

export function GradesTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["grades"])
  return (
    <SettingsCard title={tx("ระดับชั้น (Grades)")} hint={tx("ระดับชั้นที่สาขานี้สอน")}>
      <div className="space-y-3">
        {GRADE_GROUPS.map((g) => (
          <div key={g.name}>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{tx(g.name)}</p>
              <button className="text-xs text-primary underline" onClick={() => setB({ ...b, grades: sortGrades([...new Set([...b.grades, ...g.grades])]) })}>{tx("เลือกทั้งหมด")}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.grades.map((gr) => <Chip key={gr} on={b.grades.includes(gr)} onClick={() => setB({ ...b, grades: sortGrades(toggle(b.grades, gr)) })}>{gr}</Chip>)}
            </div>
          </div>
        ))}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึกระดับชั้นแล้ว"))} />
    </SettingsCard>
  )
}

/** Packages (staging): Hour / Week / Month tabs · a list of offered durations · price chart
 *  subject × grade × duration. Reference prices that pre-fill Create Course (owner 2026-09-26). */
export function PackagesTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["packageDurations", "priceChart"])
  const [unit, setUnit] = useState<PriceUnit>("hour")
  const [subject, setSubject] = useState(branch.subjects[0] ?? "")
  const [newDur, setNewDur] = useState("")
  const durations = durationsOf(b, unit)
  const grades = sortGrades(b.grades)
  const groups = GRADE_GROUPS.map((g) => ({ name: g.name, grades: grades.filter((x) => g.grades.includes(x)) })).filter((g) => g.grades.length)

  const addDuration = () => {
    const d = Number(newDur)
    if (unit === "month" || !(d > 0) || b.packageDurations[unit].includes(d)) return
    setB({ ...b, packageDurations: { ...b.packageDurations, [unit]: [...b.packageDurations[unit], d] } })
    setNewDur("")
  }
  const removeDuration = (d: number) => {
    if (unit === "month") return
    setB({ ...b, packageDurations: { ...b.packageDurations, [unit]: b.packageDurations[unit].filter((x) => x !== d) }, priceChart: b.priceChart.filter((r) => !(r.unit === unit && r.duration === d)) })
  }

  return (
    <SettingsCard title={tx("แพ็กเกจ & ตารางราคา (Packages)")} hint={tx("ราคาแนะนำต่อ วิชา × ระดับชั้น × ระยะเวลา — ใช้เติมราคาอัตโนมัติตอนสร้างคอร์ส (แก้ราคาจริงที่คอร์สได้)")}>
      <div className="mb-3 inline-flex rounded-full bg-muted p-1">
        {(["hour", "week", "month"] as PriceUnit[]).map((u) => (
          <button key={u} onClick={() => setUnit(u)} className={cn("rounded-full px-4 py-1 text-sm", unit === u ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{tx(PRICE_UNIT_LABEL[u])}</button>
        ))}
      </div>

      {unit !== "month" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {durations.map((d) => (
            <span key={d} className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm">
              {durationText(unit, d)}
              <span className="text-xs text-muted-foreground">{unit === "hour" ? tx("· {0} นาที", [d * 60]) : tx("· หลายคลาส & ชั่วโมง")}</span>
              <button aria-label={tx("ลบระยะเวลา")} onClick={() => removeDuration(d)}><XIcon className="size-3.5" /></button>
            </span>
          ))}
          <span className="flex items-center gap-1">
            <Input className="h-8 w-20" type="number" min={1} step={unit === "hour" ? 0.5 : 1} value={newDur} onChange={(e) => setNewDur(e.target.value)} placeholder={unit === "hour" ? tx("ชม.") : tx("สัปดาห์")} />
            <Button size="xs" variant="outline" onClick={addDuration}><PlusIcon />  {tx("เพิ่ม")}</Button>
          </span>
        </div>
      )}

      {b.subjects.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{tx("เลือกวิชาที่แท็บ Subjects ก่อน")}</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {b.subjects.map((s) => <Chip key={s} on={subject === s} onClick={() => setSubject(s)}>{s}</Chip>)}
          </div>
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">{tx("ระดับชั้น")}</th>
                  {durations.map((d) => <th key={d} className="p-2 text-right font-medium">{unit === "month" ? tx("ราคา / เดือน") : durationText(unit, d)}</th>)}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <GradeGroupRows key={g.name} name={tx(g.name)} grades={g.grades} cols={durations.length}>
                    {(grade) => durations.map((d) => {
                      const v = priceOf(b, unit, d, subject, grade)
                      return (
                        <td key={d} className="p-1">
                          <Input className="h-8 min-w-24 text-right tabular-nums" type="number" min={0} step={50} value={v ?? ""} placeholder="—"
                            onChange={(e) => setB({ ...b, priceChart: setPrice(b.priceChart, { unit, duration: d, subject, grade }, e.target.value === "" ? null : Number(e.target.value)) })} />
                        </td>
                      )
                    })}
                  </GradeGroupRows>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึกตารางราคาแล้ว"))} label={tx("บันทึกราคา")} />
    </SettingsCard>
  )
}

function GradeGroupRows({ name, grades, cols, children }: { name: string; grades: string[]; cols: number; children: (grade: string) => React.ReactNode }) {
  return (
    <>
      <tr><td colSpan={cols + 1} className="bg-muted/30 px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{name}</td></tr>
      {grades.map((g) => (
        <tr key={g} className="border-t">
          <td className="p-2 font-medium">{g}</td>
          {children(g)}
        </tr>
      ))}
    </>
  )
}
