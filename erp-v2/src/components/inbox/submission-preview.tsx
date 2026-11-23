"use client"

import { Fragment, useEffect, useState } from "react"
import { CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate, fmtDateTime } from "@/domain/dates"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import { BUS_USE_LABEL, GENDER_LABEL, PDPA_LABEL } from "@/domain/rules/people"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormSubmission } from "@/domain/types"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"


/**
 * owner 2026-11-20: "Preview Form" on the approval card — everything the parent filled in, laid out in the same groups as the form they saw
 * (name · general · contact · address · …), read only. The card itself only shows the gist; this is the whole answer sheet.
 */
export function SubmissionPreviewDialog({ sub, onClose, editable = false, onSaved, onApprove, onReject, approveBusy, approveBlocked, approveLabel = "อนุมัติ" }: {
  sub: FormSubmission; onClose: () => void; editable?: boolean; onSaved?: () => void
  /** owner 2026-11-20: decide right from the preview — the card's own approve / reject (same checks); `approveBlocked` = why it can't be approved yet */
  onApprove?: () => void; onReject?: () => void; approveBusy?: boolean; approveBlocked?: string; approveLabel?: string
}) {
  const [editing, setEditing] = useState(false)
  if (editing) return <SubmissionEditDialog sub={sub} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onSaved?.() }} />
  const mapUrl = sub.familyLocation ? `https://www.google.com/maps?q=${sub.familyLocation.lat},${sub.familyLocation.lng}` : ""
  const groups: { title: string; rows: [string, React.ReactNode][] }[] = [
    { title: "ชื่อ", rows: [
      ["ชื่อ-นามสกุล", sub.studentName], ["ชื่อเล่น", sub.studentNickname], ["ชื่อ (อังกฤษ)", sub.studentNameEn], ["ชื่อเล่น (อังกฤษ)", sub.studentNicknameEn],
      ["ชื่อครอบครัว", sub.familyName], ["ชื่อครอบครัว (อังกฤษ)", sub.familyNameEn],
    ] },
    { title: "ข้อมูลทั่วไป", rows: [
      ["เพศ", sub.studentGender && GENDER_LABEL[sub.studentGender]], ["ชั้น", sub.studentGrade], ["วันเกิด", sub.studentBirthDate && fmtDate(sub.studentBirthDate, { year: true })],
      ["โรงเรียน", sub.studentSchool], ["โรงเรียนที่อยากสอบเข้า", sub.studentTargetSchools?.map((x, i) => `${i + 1}. ${x.school}`).join(" · ")], ["รหัสนักเรียน", sub.studentSchoolId], ["หมายเหตุ", sub.studentNote],
    ] },
    ...sub.parents.map((p, i) => ({
      title: p.primary ? tx("{0} (ติดต่อหลัก)", [parentTitle(sub.parents.length, i)]) : parentTitle(sub.parents.length, i),
      rows: [
        ["ชื่อ-นามสกุล", p.name], ["ชื่อ (อังกฤษ)", p.nameEn], ["ความสัมพันธ์", p.relationship], ["เบอร์โทร", p.phone], ["เบอร์อื่น", p.altPhones?.join(", ")],
        ["อีเมล", p.email], ["LINE ID", p.lineId], ["วันเกิด", p.birthDate && fmtDate(p.birthDate, { year: true })],
      ] as [string, React.ReactNode][],
    })),
    { title: "ที่อยู่", rows: [
      ["ที่อยู่", sub.familyAddress], ["จังหวัด", sub.familyProvince], ["รหัสไปรษณีย์", sub.familyPostcode], ["วิธีหาบ้าน", sub.familyAddressNote],
      ["แผนที่", mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer" className="text-info hover:underline">เปิดหมุดบ้าน</a>],
    ] },
    { title: "อื่นๆ", rows: [
      ["รถรับส่ง", sub.familyBusLeg ? BUS_USE_LABEL[sub.familyBusLeg] : undefined],
      ["รู้จักเราจาก", [...(sub.acquisitions ?? []).map((a) => LEAD_SOURCE_LABEL[a]), ...(sub.acquisitionLabels ?? [])].join(", ")],
      ["ใครแนะนำ", sub.referral], ["PDPA (ถ่ายภาพ)", sub.pdpa && PDPA_LABEL[sub.pdpa]],
      ["ใบกำกับภาษี", sub.taxInfo && `${sub.taxInfo.customerName} · ${sub.taxInfo.taxId} · ${sub.taxInfo.address}`],
    ] },
    { title: tx("{0} — เวลาที่เลือก", [FORM_TYPE_LABEL[sub.type]]), rows: sub.picks.map((p) => [p.chosenSubject, p.chosenSlot.source === "class" ? tx("{0} {1} น. (คลาสเดิม)", [fmtDate(p.chosenSlot.date, { weekday: true }), p.chosenSlot.start]) : tx("{0} {1} น.", [fmtDate(p.chosenSlot.date, { weekday: true }), p.chosenSlot.start])] as [string, React.ReactNode]) },
  ]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-3 lg:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx("ฟอร์ม{0} — {1}", [FORM_TYPE_LABEL[sub.type], sub.studentName])}</DialogTitle>
          <DialogDescription>{tx("ส่งเมื่อ {0} · สรุปสิ่งที่ผู้ปกครองกรอก", [fmtDateTime(sub.submittedAt)])}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
          {groups.map((g) => {
            const rows = g.rows.filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false)
            if (!rows.length) return null
            return (
              <section key={g.title} className="space-y-1.5 border-t pt-3 first:border-t-0 first:pt-0">
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
                  {rows.map(([k, v], i) => (
                    <Fragment key={`${k}${i}`}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="min-w-0 break-words">{v}</dd></Fragment>
                  ))}
                </dl>
              </section>
            )
          })}
        </div>
        {approveBlocked && editable && <p className="text-center text-xs text-warning-ink">{approveBlocked}</p>}
        <div className="flex items-center gap-2">
          {/* owner 2026-11-20: แก้ไข on the left · ปฏิเสธ / อนุมัติ on the right (only while it still waits for approval); ✕ closes */}
          {editable ? <Button variant="outline" onClick={() => setEditing(true)}><PencilIcon /> แก้ไข</Button> : <Button variant="outline" onClick={onClose}>ปิด</Button>}
          {editable && onReject && <Button variant="outline" className="ml-auto text-danger" disabled={approveBusy} onClick={onReject}><XIcon /> ปฏิเสธ</Button>}
          {editable && onApprove && <Button className={onReject ? "" : "ml-auto"} disabled={approveBusy || !!approveBlocked} onClick={onApprove}><CheckIcon /> {approveLabel}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const parentTitle = (n: number, i: number) => (n > 1 ? tx("ผู้ปกครอง {0}", [i + 1]) : "ผู้ปกครอง")

/**
 * owner 2026-11-20: "แก้ไข" opens the REAL parent form — the page the parent got from the link, brand colours and steps included — filled with
 * their answers. The admin changes what is wrong and presses บันทึก; the page tells this dialog (postMessage) so it can close and refresh.
 */
function SubmissionEditDialog({ sub, onClose, onSaved }: { sub: FormSubmission; onClose: () => void; onSaved: () => void }) {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === "nock-submission-saved") { report({ ok: true, value: undefined }, "แก้ไขคำตอบแล้ว"); onSaved() }
      else if (e.data?.type === "nock-submission-cancel") onClose()
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [onClose, onSaved])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] flex-col gap-0 overflow-hidden p-0 lg:max-w-lg" showCloseButton>
        <DialogTitle className="sr-only">{tx("แก้ไขฟอร์ม{0} — {1}", [FORM_TYPE_LABEL[sub.type], sub.studentName])}</DialogTitle>
        <iframe src={`/liff/form?submission=${encodeURIComponent(sub.id)}`} title={tx("แก้ไขฟอร์ม{0} — {1}", [FORM_TYPE_LABEL[sub.type], sub.studentName])} className="min-h-0 w-full flex-1 bg-white" />
      </DialogContent>
    </Dialog>
  )
}
