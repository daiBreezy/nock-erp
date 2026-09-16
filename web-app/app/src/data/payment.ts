export type PayMethodKey = 'iap' | 'promptpay' | 'bank' | 'card' | 'paylater'

export type PayMethod = {
  key: PayMethodKey
  label: string
  desc: string
  needsSlip: boolean // ต้องอัปสลิป + รอ verify ไหม
}

export const payMethods: PayMethod[] = [
  { key: 'promptpay', label: 'PromptPay', desc: 'สแกน QR แล้วอัปโหลดสลิป', needsSlip: true },
  { key: 'bank', label: 'โอนผ่านธนาคาร', desc: 'โอนเข้าบัญชีแล้วอัปโหลดสลิป', needsSlip: true },
  { key: 'card', label: 'บัตรเครดิต / เดบิต', desc: 'ตัดบัตรอัตโนมัติ ใช้งานได้ทันที', needsSlip: false },
  { key: 'paylater', label: 'จ่ายทีหลัง / ผ่อน', desc: 'แบ่งจ่ายเป็นงวด', needsSlip: false },
  { key: 'iap', label: 'In-App Purchase', desc: 'จ่ายผ่าน App Store / Google Play', needsSlip: false },
]

// บัญชีปลายทาง (mock)
export const payeeBank = {
  bank: 'ธนาคารกสิกรไทย',
  accountName: 'บริษัท นอคอคาเดมี จำกัด',
  accountNo: '123-4-56789-0',
}
