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
import { ChannelRow, DescriptionBox, DocumentsRow, GoalCta, LiveChatCard, WatchTitle } from '@/components/watch/WatchInfo'
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
  const split = useSavedLayout('app-live')
  const teacher = teacherOf[SUBJECT]
  const landscape = layout === 'tablet-landscape'

  const details = (
    <div className="space-y-4 px-4 pb-10 pt-3">
      <WatchTitle>[LIVE] {TITLE}</WatchTitle>
      <ChannelRow teacher={teacher} />
      <DescriptionBox stats="86 คนกำลังดู · เริ่มไลฟ์เมื่อ 21 นาทีที่แล้ว" subject={SUBJECT} grades={['ป.5', 'ป.6']}>
        {`ไลฟ์ติวสด ${TITLE}\nทบทวนจำนวนเฉพาะ การหา ห.ร.ม. และ ค.ร.น. พร้อมตะลุยโจทย์ข้อสอบเข้า ม.1 ปีล่าสุด\nถามครูได้เลยในแชทสด`}
      </DescriptionBox>
      {!landscape && <LiveChatCard onOpen={() => setChatOpen(true)} />}
      <DocumentsRow subject={SUBJECT} teacher={teacher} />
      <GoalCta />
      <RelatedVideos subject={SUBJECT} grade="ป.6" />
    </div>
  )

  if (landscape) {
    return (
      <ResizablePanelGroup {...split} orientation="horizontal" className="!h-[100dvh] bg-surface-0">
        <ResizablePanel id="main" minSize="45%">
          <div className="h-full overflow-y-auto">
            <WatchPlayer src={thumb('live-main')} live viewers="86" onBack={() => navigate(-1)} fitHeight />
            {details}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="chat" defaultSize={340} minSize={260} maxSize="50%">
          <LiveChatPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-surface-0">
      <WatchPlayer src={thumb('live-main')} live viewers="86" onBack={() => navigate(-1)} className="sticky top-0 z-20" />
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
