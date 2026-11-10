import { Noto_Sans_JP } from "next/font/google"

// แอปผู้ปกครองบน LINE มีภาษาญี่ปุ่น — โหลด Noto Sans JP เฉพาะใต้ /liff (ไฟล์ใหญ่ ฝั่ง Staff ไม่ต้องโหลด)
// ลำดับ: ละติน → ไทย → ญี่ปุ่น (ตัวแปร --font-latin / --font-thai มาจาก app/layout.tsx)
const jp = Noto_Sans_JP({ variable: "--font-jp", subsets: ["latin"], preload: false })

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={jp.variable} style={{ fontFamily: "var(--font-latin), var(--font-thai), var(--font-jp), system-ui, sans-serif" }}>
      {children}
    </div>
  )
}
