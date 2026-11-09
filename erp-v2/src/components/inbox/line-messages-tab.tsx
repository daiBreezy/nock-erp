"use client"

// owner 2026-11-09: "ฉันจะดูตัวอย่างข้อความ LINE ได้จากไหน" — the texts the system sends to parents, built by the SAME
// functions the store uses (domain/rules/messages.ts), from a real invoice of the demo data. Nothing is sent from here.
import { useMemo, useState } from "react"
import { Segmented } from "@/components/app/page-layout"
import { invoiceTotals } from "@/domain/rules/billing"
import { invoiceMessage, receiptMessage, voidMessage } from "@/domain/rules/messages"
import { useStore } from "@/store/store"

function Bubble({ title, hint, text }: { title: string; hint: string; text: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <div><p className="text-sm font-semibold leading-tight">{title}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      <div className="rounded-3xl bg-[#8CABD9]/25 p-4">
        <div className="ml-auto w-fit max-w-full whitespace-pre-line break-words rounded-2xl rounded-tr-sm bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">{text}</div>
      </div>
    </div>
  )
}

export function LineMessagesTab() {
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const [brand, setBrand] = useState<"nockacademy" | "liclass">("liclass")

  const sample = useMemo(() => {
    const inv = invoices.filter((i) => i.status !== "void" && i.lines.length > 0 && branches.find((b) => b.id === i.branchId)?.brand === brand)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    const branch = inv && branches.find((b) => b.id === inv.branchId)
    const student = inv && students.find((x) => x.id === inv.studentId)
    if (!inv || !branch || !student) return null
    const totals = invoiceTotals(inv, { branch, courses, classes, holidays })
    return { inv: { ...inv, number: inv.number ?? "INV-SAMPLE-001" }, branch, student, totals }
  }, [invoices, students, branches, courses, classes, holidays, brand])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={brand} onChange={setBrand} label="แบรนด์" options={[{ value: "liclass", label: "Liclass" }, { value: "nockacademy", label: "NockAcademy" }]} />
        <p className="text-sm text-muted-foreground">ข้อความจริงที่ระบบส่งให้ผู้ปกครอง · Liclass = ญี่ปุ่น + อังกฤษ · NockAcademy = ไทย + อังกฤษ — ดูอย่างเดียว ไม่ส่งจริง</p>
      </div>
      {!sample ? (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">ยังไม่มีใบแจ้งหนี้ของแบรนด์นี้ให้ทำตัวอย่าง</p>
      ) : (
        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-foreground/5">
          <div className="grid items-start gap-6 lg:grid-cols-3">
            <Bubble title="ส่งใบแจ้งหนี้" hint="Admin กดส่งใบที่อนุมัติแล้ว" text={invoiceMessage(sample.inv, sample.totals, { student: sample.student, branch: sample.branch })} />
            <Bubble title="ออกใบเสร็จ + สรุปคอร์ส" hint="หลังยืนยันยอดเงิน — มีสรุปคอร์สต่อท้าย (วัน-เวลาเรียน วันเริ่ม/จบ วันหยุด ลาได้กี่ครั้ง)"
              text={receiptMessage({ ...sample.inv, receiptNumber: sample.inv.number.replace("INV", "RC") }, sample.totals.total, { student: sample.student, totals: sample.totals, branch: sample.branch })} />
            <Bubble title="ยกเลิกใบแจ้งหนี้ (Void)" hint={"ส่งเมื่อ Admin กด “แจ้งผู้ปกครอง” เท่านั้น — ไม่ส่งเอง"} text={voidMessage(sample.inv, { student: sample.student })} />
          </div>
        </div>
      )}
    </div>
  )
}
