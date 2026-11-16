// Prototype-only sample notifications for the demo panel ("จำลอง Noti หลายใบ") — mock data, not UI text.
import type { NotiKind } from "@/components/app/noti"

/** a handful of different noti kinds at once, to see how they stack and scroll */
export const DEMO_NOTIS: { kind: NotiKind; title: string; body: string; action?: string }[] = [
  { kind: "exit", title: "นักเรียนแจ้งออก 2 คน ยังไม่ปิดเรื่อง", body: "น้องใบเตย · น้องภูมิ — โทรคุยกับผู้ปกครองแล้วปิดเรื่อง", action: "ดูรายชื่อ" },
  { kind: "leave", title: "ผู้ปกครองแจ้งลาหยุด · น้องนะโม", body: "คาบวันพุธ 16:00 · คณิต ป.4", action: "บันทึกลา" },
  { kind: "bus", title: "ขอเพิ่มรอบรถ · น้องทอฟฟี่", body: "เที่ยวไป-กลับ วันเสาร์ — ที่นั่งว่าง 3 ที่", action: "ดูคำขอ" },
  { kind: "message", title: "ข้อความใหม่จากผู้ปกครอง", body: "คุณแม่น้องปุณ: สอบถามเรื่องตารางเรียนช่วงปิดเทอมค่ะ" },
  { kind: "home", title: "ผู้ปกครองปักหมุดบ้านใหม่", body: "ครอบครัวสุขใจ — ตรวจที่อยู่ก่อนจัดรอบรถ", action: "ตรวจที่อยู่" },
  { kind: "return", title: "อยากกลับมาเรียน · น้องมิว", body: "เริ่มได้ตั้งแต่เดือนหน้า — ติดต่อกลับผู้ปกครอง" },
  { kind: "note", title: "บันทึกจากครู · น้องชิน", body: "ช่วงนี้สมาธิสั้นลง ควรคุยกับผู้ปกครอง" },
]
