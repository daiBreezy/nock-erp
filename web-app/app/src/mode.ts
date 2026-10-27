import { Capacitor } from '@capacitor/core'

/**
 * Web/Learn หรือ Mobile App — เลือกครั้งเดียวตอนเปิด
 * - แอปจาก Store (Capacitor native) = App เสมอ
 * - browser = Web · ดู App บน browser ได้ด้วย ?app (จำไว้ใน session) · กลับด้วย ?web
 */
export type Mode = 'web' | 'app'

const KEY = 'nock-mode'

export function detectMode(): Mode {
  if (Capacitor.isNativePlatform()) return 'app'
  const q = new URLSearchParams(window.location.search)
  try {
    if (q.has('app')) sessionStorage.setItem(KEY, 'app')
    if (q.has('web')) sessionStorage.removeItem(KEY)
    return sessionStorage.getItem(KEY) === 'app' ? 'app' : 'web'
  } catch {
    return q.has('app') ? 'app' : 'web'
  }
}
