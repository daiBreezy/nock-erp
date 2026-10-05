"use client"

// Reports as .xlsx (owner 2026-10-01: Export = xlsx + PDF). One sheet per block of the page, numbers straight from
// useReports() so the file and the screen never disagree.

import { fmtDate } from "@/domain/dates"
import type { ReportData } from "@/components/reports/use-reports"

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export async function downloadReports(d: ReportData, opts: { scope: string; periodLabel: string; compare: boolean; nameOf: (studentId: string) => string; branchOf: (id: string) => string }) {
  const ExcelJS = (await import("exceljs")).default
  const wb = new ExcelJS.Workbook()
  wb.creator = "NockERP"
  const money = "#,##0;[Red]-#,##0"
  const sheet = (name: string, head: string[], rows: (string | number | null)[][], moneyCols: number[] = [], pctCols: number[] = []) => {
    const ws = wb.addWorksheet(name)
    ws.addRow([`${name} · ${opts.scope} · ${opts.periodLabel} (${fmtDate(d.range.from)} – ${fmtDate(d.range.to)})`]).font = { bold: true }
    const h = ws.addRow(head)
    h.font = { bold: true }
    h.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } } })
    rows.forEach((r) => {
      const row = ws.addRow(r)
      moneyCols.forEach((i) => (row.getCell(i).numFmt = money))
      pctCols.forEach((i) => (row.getCell(i).numFmt = "0.0%"))
    })
    ws.columns.forEach((c, i) => (c.width = i === 0 ? 28 : 16))
  }

  sheet("สรุป", ["ตัวชี้วัด", "ค่า"], [
    ["รายได้ (เงินเข้า หักใบลดหนี้)", d.kpi.revenue], ["นักเรียน Active วันนี้", d.kpi.active], ["Pause (ลาพักยาว)", d.kpi.paused],
    ["คาบสัปดาห์นี้", d.kpi.weekSessions], ["อัตราเข้าเรียน", d.kpi.attendance], ["Need Attention", d.kpi.attention],
    ["นักเรียนใหม่", d.studentFlow.newCount], ["กลับมาเรียน", d.studentFlow.returning], ["Lost", d.studentFlow.lost], ["อัตราต่อคอร์ส", d.studentFlow.renewal],
  ])
  sheet("รายได้ตามช่วง", ["ช่วง", "ตั้งแต่", "ถึง", "รายได้", "เปลี่ยนแปลง %", "เทียบกับ"],
    d.strip.map((p) => [p.label, fmtDate(p.range.from), fmtDate(p.range.to), p.value, p.change, p.vs]), [4])
  sheet("รายได้รายเดือน", ["เดือน", `ปี ${d.monthly.year + 543}`, `ปี ${d.monthly.year + 542}`],
    TH_MONTHS.map((m, i) => [m, d.monthly.thisYear[i], d.monthly.lastYear[i]]), [2, 3])
  sheet("ประเภทรายได้", ["ประเภท", "ช่วงนี้", "ช่วงก่อน"], [
    ["ค่าเรียน", d.rev.tuition, d.revPrev.tuition], ["ค่ารถ", d.rev.bus, d.revPrev.bus], ["ค่าแรกเข้า/ค่าธรรมเนียม", d.rev.advance, d.revPrev.advance],
    ["ค่าหนังสือ", d.rev.book, d.revPrev.book], ["ใบลดหนี้ (หัก)", -d.rev.credit, -d.revPrev.credit], ["รวม", d.rev.total, d.revPrev.total],
  ], [2, 3])
  if (opts.compare) sheet("รายได้ตามสาขา", ["สาขา", "รายได้", "สัดส่วน"], d.byBranch.map((b) => [b.name, b.amount, b.share]), [2], [3])
  sheet("รายได้ตามวิชา", ["วิชา", "รายได้", "สัดส่วน"], d.bySubject.map((x) => [x.subject, x.amount, x.share]), [2], [3])
  sheet("แพ็กเกจ", ["แพ็กเกจ", "จำนวนที่ขาย", "รายได้", "สัดส่วน"], d.packages.map((x) => [x.label, x.units, x.amount, x.share]), [3], [4])
  sheet("ครอบครัว", ["ครอบครัว", "อายุลูกค้า (เดือน)", "ยอดในช่วง", "ใบแจ้งหนี้", "ลูก"], d.families.map((f) => [f.name, f.tenureMonths, f.amount, f.invoices, f.kids]), [3])
  sheet("นักเรียนตามสาขา", ["สาขา", "Active", "ใหม่", "กลับมาเรียน", "Lost", "Pause", "Net"],
    d.perBranch.map((b) => [b.name, b.active, b.newCount, b.returning, b.lost, b.pauses, b.newCount + b.returning - b.lost]))
  sheet("ความเคลื่อนไหวนักเรียน", ["วันที่", "นักเรียน", "สาขา", "เหตุการณ์"],
    d.events.filter((e) => e.kind !== "renewed" && e.date >= d.range.from && e.date <= d.range.to)
      .map((e) => [fmtDate(e.date), opts.nameOf(e.studentId), opts.branchOf(e.branchId), { new: "ใหม่", returning: "กลับมาเรียน", lost: "Lost", renewed: "ต่อคอร์ส" }[e.kind]]))
  // R2
  sheet("การเข้าเรียนตามสาขา", ["สาขา", "คาบ", "มา", "ลา", "ลาไม่หักโควตา", "อัตรา"], d.attendanceTab.byBranch.map((r) => [r.name, r.sessions, r.present, r.leave, r.noQuota, r.rate]), [], [6])
  sheet("การเข้าเรียนตามวิชา", ["วิชา", "คาบ", "มา", "ลา", "อัตรา"], d.attendanceTab.bySubject.map((r) => [r.key, r.sessions, r.present, r.leave, r.rate]), [], [5])
  sheet("นักเรียนลาบ่อย", ["นักเรียน", "มา", "ลา", "ไม่หักโควตา", "อัตรา"], d.attendanceTab.leavers.map((x) => [opts.nameOf(x.studentId), x.present, x.leave, x.noQuota, x.rate]), [], [5])
  sheet("ครู", ["ครู", "Part-time", "คาบ", "ชั่วโมง", "นักเรียน", "อัตราเข้าเรียน", "ยังไม่เช็คชื่อ", "สรุปค้าง", "สรุปตรงเวลา", "สอนแทน", "ลา (คาบ)"],
    d.operations.teachers.map((t) => [t.staff?.nickname ?? t.teacherId, t.staff?.partTime ? "ใช่" : "", t.sessions, Math.round((t.minutes / 60) * 10) / 10, t.students, t.rate, t.unmarked, t.summariesPending, t.summariesOnTime, t.coverFor, t.awaySessions]), [], [6, 9])
  sheet("การใช้ห้อง", ["สาขา", "ห้อง", "ชั่วโมงที่มีคาบ", "ชั่วโมงเปิด", "อัตรา"],
    d.operations.rooms.flatMap((b) => b.rooms.map((r) => [b.name, r.name, Math.round(r.booked / 6) / 10, Math.round(r.open / 6) / 10, r.rate])), [], [5])
  sheet("ความเต็มของคลาส", ["คลาส", "สาขา", "นักเรียน", "ขนาดแนะนำ", "ความเต็ม"], d.operations.fill.map((c) => [c.name, opts.branchOf(c.branchId), c.students, c.capacity, c.fill]), [], [5])
  sheet("Need Attention", ["เรื่อง", "รายละเอียด", "จำนวน"], d.attention.map((a) => [a.title, a.detail, a.count]))

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `Reports ${opts.scope} ${d.range.from} ถึง ${d.range.to}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
