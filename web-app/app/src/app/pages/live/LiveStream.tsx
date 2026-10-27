import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppLayout } from '@/app/layout'
import { thumb } from '@/data/media'
import { teacherOf } from '@/data/watch'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import WatchPlayer from '@/components/watch/WatchPlayer'
import LiveChatPanel from '@/components/watch/LiveChatPanel'
import RelatedVideos from '@/components/watch/RelatedVideos'
import { DocumentsRow, LiveChatCard, WatchMeta, WatchTitle } from '@/components/watch/WatchInfo'
import { useSavedLayout } from '@/lib/useSavedLayout'

const TITLE = 'ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น. (เสริม)'
const SUBJECT = 'math' as const

/**
 * หน้าไลฟ์ (App) — โครงแบบ YouTube app
 * มือถือ / Tablet แนวตั้ง: วิดีโอค้างด้านบน · รายละเอียดเลื่อนใต้ · แชทเปิดเป็นแผงจากล่าง
 * Tablet แนวนอน (แบบ ค): วิดีโอ + รายละเอียด | แชทสดค้างขวา (ลากปรับขนาดได้)
 */
export default function LiveStream() {
  const navigate = useNavigate()
  const layout = useAppLayout()
  const [chatOpen, setChatOpen] = useState(false)
  const [theater, setTheater] = useState(false)
  const split = useSavedLayout('app-live')
  const teacher = teacherOf[SUBJECT]
  const landscape = layout === 'tablet-landscape'

  const details = (
    <div className="space-y-4 px-4 pb-10 pt-3">
      <WatchTitle>[LIVE] {TITLE}</WatchTitle>
      <WatchMeta teacher={teacher} when="เริ่มไลฟ์เมื่อ 21 นาทีที่แล้ว" subject={SUBJECT} grades={['ป.5', 'ป.6']} />
      {(!landscape || theater) && <LiveChatCard onOpen={() => (landscape ? setTheater(false) : setChatOpen(true))} />}
      <DocumentsRow subject={SUBJECT} teacher={teacher} />
      <RelatedVideos subject={SUBJECT} grade="ป.6" />
    </div>
  )

  if (landscape) {
    // Tablet แนวนอน: ปุ่มมุมมองบนตัวเล่น — ปกติ = แชทข้าง / โรงภาพยนตร์ = ซ่อนแชท วิดีโอเต็มกว้าง
    const player = (
      <WatchPlayer
        src={thumb('live-main')} live onBack={() => navigate(-1)} fitHeight
        viewMode={{ theater, onToggle: () => setTheater((v) => !v) }}
      />
    )
    if (theater) return <div className="min-h-[100dvh] bg-surface-0">{player}{details}</div>
    return (
      <ResizablePanelGroup {...split} orientation="horizontal" className="!h-[100dvh] bg-surface-0">
        <ResizablePanel id="main" minSize="45%">
          <div className="h-full overflow-y-auto">{player}{details}</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="chat" defaultSize={340} minSize={260} maxSize="50%">
          <LiveChatPanel onClose={() => setTheater(true)} />
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-surface-0">
      <WatchPlayer src={thumb('live-main')} live onBack={() => navigate(-1)} className="sticky top-0 z-20" />
      {details}

      {/* แชทสด — แผงเลื่อนขึ้นจากล่าง ใต้วิดีโอ (แบบ YouTube app) */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="bottom" hideClose className="h-[65dvh] rounded-t-2xl p-0">
          <SheetTitle className="sr-only">แชทสด</SheetTitle>
          <LiveChatPanel onClose={() => setChatOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
