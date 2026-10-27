import { createContext, useContext, useEffect, useState } from 'react'

/**
 * หน้าตา Mobile App ตามเครื่อง + การถือ
 * - phone             มือถือ (ทั้งแนวตั้ง/นอน)          → BottomNav
 * - tablet-portrait   Tablet แนวตั้ง  = แบบ ก          → BottomNav + เนื้อหากว้างขึ้น 2 คอลัมน์
 * - tablet-landscape  Tablet แนวนอน  = แบบ ข + ค       → แถบเมนูข้าง (Navigation Rail) + รายการ | รายละเอียด
 */
export type AppLayout = 'phone' | 'tablet-portrait' | 'tablet-landscape'

const TABLET_MIN = 600 // ด้านสั้นของจอ ≥ 600px = Tablet

export function layoutFor(w: number, h: number): AppLayout {
  if (Math.min(w, h) < TABLET_MIN) return 'phone'
  return w > h ? 'tablet-landscape' : 'tablet-portrait'
}

export function useLayoutFromWindow(): AppLayout {
  const read = () => layoutFor(window.innerWidth, window.innerHeight)
  const [layout, setLayout] = useState<AppLayout>(read)
  useEffect(() => {
    const on = () => setLayout(read())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return layout
}

export const AppLayoutContext = createContext<AppLayout>('phone')

export const useAppLayout = () => useContext(AppLayoutContext)
