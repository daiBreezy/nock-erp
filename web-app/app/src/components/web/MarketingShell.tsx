import type { ReactNode } from 'react'
import { Construction } from 'lucide-react'
import DesktopNav from './DesktopNav'
import AppShowcase from './AppShowcase'
import MarketingFooter from './MarketingFooter'

/**
 * โครงหน้า marketing กลาง — Nav + [เนื้อหา] + Download + Footer
 * ใช้กับทุกหน้า marketing: ส่ง children เข้ามาเมื่อพร้อมเติมเนื้อหา
 * ไม่ส่ง children = โชว์ placeholder "กำลังพัฒนา"
 */
export default function MarketingShell({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-surface-1 text-ink">
      <DesktopNav />
      {children ?? (
        <main className="mx-auto flex max-w-[1200px] flex-col items-center justify-center px-5 py-24 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Construction size={30} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">หน้านี้กำลังพัฒนา — เตรียมโครงไว้แล้ว รอเติมเนื้อหา</p>
        </main>
      )}
      <AppShowcase />
      <MarketingFooter />
    </div>
  )
}
