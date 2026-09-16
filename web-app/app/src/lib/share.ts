import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

const SHARE_URL = 'https://nockacademy.com'
const SHARE_TEXT = 'มาเรียนกับ NockAcademy กันเถอะ!'

// บน native → เรียก native share sheet ของเครื่อง
// บน web → คืน false ให้ caller เปิด bottom-sheet เอง
export async function tryNativeShare(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  await Share.share({
    title: 'NockAcademy',
    text: SHARE_TEXT,
    url: SHARE_URL,
    dialogTitle: 'แชร์ผ่าน',
  })
  return true
}

export async function copyLink(): Promise<void> {
  await navigator.clipboard?.writeText(SHARE_URL)
}
