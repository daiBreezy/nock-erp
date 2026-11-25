"use client"

import { CakeIcon, MailIcon, MessageCircleIcon, PhoneIcon, StarIcon, UserPlusIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FamilyKidsList, FamilyProfile, InfoGrid, NotSet, PhoneValue } from "@/components/app/family-tabs"
import { fmtDate } from "@/domain/dates"
import { can } from "@/domain/rules/permissions"
import { parentHasLine, parentIndexOfAccount } from "@/domain/rules/people"
import type { Family, ID, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-25: Lead and Customer are one record — this is the ONE "ข้อมูลครอบครัว" body (family · guardians · children), used by the
 * Customer's family panel and by the Lead's panel alike. Only the state (Lead / Customer) differs, not what we know about the family.
 */
export function FamilyInfoTab({ f, kids, onOpenStudent, onAddParent, onGoBilling }: { f: Family; kids: Student[]; onOpenStudent: (id: ID | "new") => void; /** owner 2026-11-25: adding a guardian is as close at hand as adding a child */ onAddParent?: () => void; onGoBilling: () => void }) {
  const lineConvs = useStore((s) => s.conversations)
  const me = useStore((s) => s.me())
  const saveFamily = useStore((s) => s.saveFamily)
  const manage = can(me, "family.manage")
  const setStudentOpen = onOpenStudent
  // LINE shows by itself, per person — the ID the guardian typed, else the name they show in LINE; linked with neither = "linked"
  const lineOf = (p: Family["parents"][number], i: number): React.ReactNode => {
    const account = p.lineUserId ?? (f.lineUserId && parentIndexOfAccount(f, f.lineUserId) === i ? f.lineUserId : undefined)
    const name = account ? lineConvs.find((c) => c.id === `line_${account}`)?.lineName : undefined
    if (p.lineId) return <>{p.lineId}{name && <span className="text-muted-foreground"> · {name}</span>}</>
    if (name) return name
    return p.lineLinked || account ? <span className="text-success-ink">{tx("เชื่อม LINE แล้ว")}</span> : <NotSet what="LINE" />
  }
  return (
    <>
                <section className="space-y-2"><h3 className="text-sm font-semibold">ครอบครัว</h3>
                <FamilyProfile family={f} kids={kids} onGoBilling={onGoBilling} />
                </section>
                {/* owner 2026-11-20: the divider separates the HEADINGS (ครอบครัว | ผู้ปกครอง | นักเรียน), not the people inside one */}
                <section className="space-y-2 border-t pt-4">
                  <div className="flex items-center"><h3 className="text-sm font-semibold">{tx("ผู้ปกครอง")}</h3>{onAddParent && manage && <Button size="xs" variant="ghost" className="ml-auto" onClick={onAddParent}><UserPlusIcon /> {tx("เพิ่มผู้ปกครอง")}</Button>}</div>
                  <div className="space-y-3">
                    {f.parents.map((p, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{p.name}{p.nameEn && <span className="ml-1.5 font-normal text-muted-foreground">({p.nameEn})</span>}</span>{p.primary && <StarIcon className="size-3.5 fill-muted-foreground/40 text-muted-foreground/60" aria-label={tx("ผู้ปกครองหลัก")}><title>{tx("ผู้ปกครองหลัก")}</title></StarIcon>}
                        </div>
                        <InfoGrid rows={[
                          { icon: UsersIcon, label: tx("ความสัมพันธ์"), value: p.relationship || <NotSet what="ความสัมพันธ์" /> },
                          { icon: PhoneIcon, label: tx("โทร"), value: <PhoneValue numbers={[p.phone, ...(p.altPhones ?? [])]} /> },
                          { icon: MessageCircleIcon, label: "LINE", value: lineOf(p, i) },
                          { icon: MailIcon, label: tx("อีเมล"), value: p.email || <NotSet what="อีเมล" /> },
                          { icon: CakeIcon, label: tx("วันเกิด"), value: p.birthDate ? fmtDate(p.birthDate, { year: true }) : <NotSet what="วันเกิด" /> },
                        ]} />
                        {/* owner 2026-11-20: who gets the Summaries on LINE — only a guardian with a LINE account can be ticked */}
                        {(() => {
                          const has = parentHasLine(f, i)
                          return (
                            <label className={cn("flex w-fit items-center gap-2 text-xs", has && manage ? "cursor-pointer" : "cursor-not-allowed text-muted-foreground")} title={has ? undefined : tx("ผูก LINE ก่อนถึงเลือกได้")}>
                              <Checkbox checked={has && p.summaryViaLine !== false} disabled={!has || !manage}
                                onCheckedChange={(v) => report(saveFamily({ ...f, parents: f.parents.map((x, k) => (k === i ? { ...x, summaryViaLine: !!v } : x)) }), v ? `${p.name} ${tx("รับ Summary ผ่าน LINE")}` : `${p.name} ${tx("ไม่รับ Summary ผ่าน LINE")}`)} />
                              {tx("รับ Summary ผ่าน LINE")}
                            </label>
                          )
                        })()}
                      </div>
                    ))}
                  </div>
                  {!f.parents.some((p) => p.lineLinked) && <p className="text-xs text-muted-foreground">{tx("ยังไม่ผูก LINE — ให้ผู้ปกครองแอด LINE OA แล้วดึงแชทเข้าครอบครัวนี้จาก Inbox ระบบจะเชื่อมให้ทันที")}</p>}
                </section>
                <section className="space-y-2 border-t pt-4">
                  <div className="flex items-center"><h3 className="text-sm font-semibold">{tx("นักเรียน")} ({kids.length})</h3><Button size="xs" variant="ghost" className="ml-auto" onClick={() => setStudentOpen("new")}><UserPlusIcon /> {tx("เพิ่มลูก")}</Button></div>
                  <FamilyKidsList kids={kids} onOpen={setStudentOpen} plain />
                </section>
    </>
  )
}
