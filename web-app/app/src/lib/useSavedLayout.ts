import { useDefaultLayout } from 'react-resizable-panels'

// localStorage อาจใช้ไม่ได้ (private mode / ถูกบล็อก) — ถ้าใช้ไม่ได้ก็แค่ไม่จำขนาด
const safeStorage = {
  getItem: (key: string) => {
    try { return window.localStorage.getItem(key) } catch { return null }
  },
  setItem: (key: string, value: string) => {
    try { window.localStorage.setItem(key, value) } catch { /* ไม่จำ */ }
  },
}

/** จำขนาดจอแบ่ง (Resizable) ที่ผู้ใช้ลากไว้ — ใส่ผลลัพธ์ลง ResizablePanelGroup ตรงๆ (`{...useSavedLayout('id')}`) */
export function useSavedLayout(id: string, panelIds?: string[]) {
  return useDefaultLayout({ id: `nock-split:${id}`, panelIds, storage: safeStorage, onlySaveAfterUserInteractions: true })
}
