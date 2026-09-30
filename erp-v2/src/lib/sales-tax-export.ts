"use client"

// Sales Tax Report as .xlsx, laid out like the owner's file ("Sales Tax report.xlsx"): one tab per month named
// "26-08", company header, ลำดับ / วันที่ / เลขที่ใบกำกับ / ชื่อผู้ซื้อสินค้า/ผู้รับบริการ / มูลค่าสินค้าเต็ม, a total and
// a total per business line. Rows come from salesTaxRows() so the file and the screen never disagree.

import { BUSINESS_LABEL, salesTaxTotals, type SalesTaxRow } from "@/domain/rules/documents"
import type { CompanyInfo } from "@/domain/types"

const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]

export async function downloadSalesTaxReport(months: { month: string; rows: SalesTaxRow[] }[], company: CompanyInfo, branchName: (id: string) => string) {
  const ExcelJS = (await import("exceljs")).default
  const wb = new ExcelJS.Workbook()
  wb.creator = "NockERP"
  for (const { month, rows } of months) {
    const [y, m] = month.split("-").map(Number)
    const ws = wb.addWorksheet(`${String(y).slice(2)}-${String(m).padStart(2, "0")}`)
    ws.columns = [{ width: 8 }, { width: 13 }, { width: 26 }, { width: 42 }, { width: 18 }, { width: 14 }, { width: 14 }, { width: 24 }]
    ws.addRow(["รายงานภาษีขาย"]).font = { bold: true, size: 14 }
    ws.addRow([`เดือนภาษี ${TH_MONTHS[m - 1]} ปี ${y + 543}`])
    ws.addRow([`ชื่อผู้ประกอบการ ${company.nameTh}`])
    const r4 = ws.addRow([`เลขที่ประจำตัวผู้เสียภาษี ${company.taxId}`])
    r4.getCell(5).value = company.office.split("/")[0].trim()
    ws.addRow([`เลขที่  ${company.addressTh}`])
    const head = ws.addRow(["ลำดับ", "วันที่", "เลขที่ใบกำกับ", "ชื่อผู้ซื้อสินค้า/ผู้รับบริการ", "มูลค่าสินค้าเต็ม", "ธุรกิจ", "สาขา", "อ้างอิงใบแจ้งหนี้"])
    head.font = { bold: true }
    head.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } }; c.border = { bottom: { style: "thin" } } })
    rows.forEach((r, i) => {
      const row = ws.addRow([i + 1, new Date(`${r.date}T00:00:00`), r.number, r.customer, r.amount, BUSINESS_LABEL[r.business], branchName(r.branchId), r.ref ?? ""])
      row.getCell(2).numFmt = "dd/mm/yyyy"
      row.getCell(5).numFmt = "#,##0.00;[Red]-#,##0.00"
    })
    const t = salesTaxTotals(rows)
    ws.addRow([])
    const total = ws.addRow(["", "", "", "รวม", t.total])
    total.font = { bold: true }
    total.getCell(5).numFmt = "#,##0.00"
    for (const b of t.byBusiness) {
      const row = ws.addRow(["", "", BUSINESS_LABEL[b.business], "", b.amount])
      row.getCell(5).numFmt = "#,##0.00"
    }
  }
  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
  const a = document.createElement("a")
  const span = months.length > 1 ? `${months[0].month} ถึง ${months[months.length - 1].month}` : months[0]?.month
  a.href = url
  a.download = `Sales Tax report ${span}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
