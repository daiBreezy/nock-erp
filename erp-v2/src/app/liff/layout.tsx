import type { Viewport } from "next"
import { Noto_Sans_JP } from "next/font/google"

// แอปผู้ปกครองบน LINE มีภาษาญี่ปุ่น — โหลด Noto Sans JP เฉพาะใต้ /liff (ไฟล์ใหญ่ ฝั่ง Staff ไม่ต้องโหลด)
// ลำดับ: ละติน → ไทย → ญี่ปุ่น (ตัวแปร --font-latin / --font-thai มาจาก app/layout.tsx)
const jp = Noto_Sans_JP({ variable: "--font-jp", subsets: ["latin"], preload: false })

// owner 2026-11-18: draw under the iPhone's home-indicator strip so the bottom bars can leave room for it (env(safe-area-inset-bottom))
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={jp.variable} style={{ fontFamily: "var(--font-latin), var(--font-thai), var(--font-jp), system-ui, sans-serif" }}>
      {children}
    </div>
  )
}
