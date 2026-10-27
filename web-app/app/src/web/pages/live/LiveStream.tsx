import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopNav from '@/web/components/DesktopNav'
import { thumb } from '@/data/media'
import { teacherOf } from '@/data/watch'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import WatchPlayer from '@/components/watch/WatchPlayer'
import LiveChatPanel from '@/components/watch/LiveChatPanel'
import RelatedVideos from '@/components/watch/RelatedVideos'
import { DocumentsRow, LiveChatCard, WatchMeta, WatchTitle } from '@/components/watch/WatchInfo'
import { useSavedLayout } from '@/lib/useSavedLayout'
import { useMediaQuery } from '@/lib/useMediaQuery'

const TITLE = 'ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น. (เสริม)'
const SUBJECT = 'math' as const

/**
 * หน้าไลฟ์ (Web) — โครงแบบ YouTube
 * จอกว้าง (≥1024): วิดีโอ + รายละเอียด | แชทสดด้านขวา (ลากปรับขนาดได้) · ปุ่มมุมมองบนตัวเล่น: ปกติ = มีแชทข้าง / โรงภาพยนตร์ = ซ่อนแชท วิดีโอเต็มกว้าง
 * จอแคบกว่า: คอลัมน์เดียว — วิดีโอ · ชื่อ · ครู + ปุ่ม · รายละเอียด | การ์ดแชท · เอกสาร · วิดีโอที่เกี่ยวข้อง · แชทเปิดเป็นแผงด้านข้าง
 */
export default function LiveStream() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [sidePanel, setSidePanel] = useState(true)
  const [sheet, setSheet] = useState(false)
  const split = useSavedLayout('web-live-chat')
  const teacher = teacherOf[SUBJECT]
  const chatBeside = wide && sidePanel

  const main = (
    <>
      <WatchPlayer
        src={thumb('live-main')} live onBack={() => navigate(-1)} fitHeight
        viewMode={wide ? { theater: !sidePanel, onToggle: () => setSidePanel((v) => !v) } : undefined}
      />
      <div className="mx-auto max-w-[1280px] space-y-4 px-4 pb-12 pt-4 md:px-6">
        <WatchTitle>[LIVE] {TITLE}</WatchTitle>
        <WatchMeta teacher={teacher} when="เริ่มไลฟ์เมื่อ 21 นาทีที่แล้ว" subject={SUBJECT} grades={['ป.5', 'ป.6']} />
        {!chatBeside && <LiveChatCard onOpen={() => (wide ? setSidePanel(true) : setSheet(true))} />}
        <DocumentsRow subject={SUBJECT} teacher={teacher} />
        <RelatedVideos subject={SUBJECT} grade="ป.6" className="pt-2" />
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-surface-0">
      <DesktopNav />
      {chatBeside ? (
        <ResizablePanelGroup {...split} orientation="horizontal" className="!h-[calc(100vh-112px)]">
          <ResizablePanel id="main" minSize="50%">
            <div className="h-full overflow-y-auto">{main}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="chat" defaultSize={400} minSize={300} maxSize="40%">
            <LiveChatPanel onClose={() => setSidePanel(false)} />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        main
      )}

      {/* จอแคบ: แชทสดเป็นแผงเลื่อนจากขวา */}
      <Sheet open={sheet && !wide} onOpenChange={setSheet}>
        <SheetContent side="right" hideClose className="w-[90%] max-w-[400px] p-0 sm:max-w-[400px]">
          <SheetTitle className="sr-only">แชทสด</SheetTitle>
          <LiveChatPanel onClose={() => setSheet(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
