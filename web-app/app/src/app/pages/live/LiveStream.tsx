import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppLayout } from '@/app/layout'
import {
  ChevronLeft, Play, Radio, Eye, Volume2, Maximize, Download, Bell,
  Send, Plus, X, MessageSquare, Flag, ArrowRight, Share2,
} from 'lucide-react'
import { thumb } from '@/data/media'
import type { SubjectKey } from '@/data/mock'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useSavedLayout } from '@/lib/useSavedLayout'
import { Input } from '@/components/ui/input'

const messages = [
  { name: 'จอย', text: 'หนูตอบข้อ B ค่ะ', me: false },
  { name: 'May', text: 'ตอบข้อ A ค่ะ', me: false },
  { name: 'เนย', text: 'สวัสดีค่ะ ชื่อเนยนะคะ', me: false },
  { name: 'มาร์กเกอร์', text: 'สวัสดีครับ ครูดาว', me: false },
  { name: 'ฉัน', text: 'สวัสดีครับ', me: true },
  { name: 'ฉัน', text: 'มีคำถามครับผม', me: true },
]

const videoList = Array.from({ length: 8 }, (_, i) => ({
  id: `v${i}`,
  subject: (['math', 'english', 'science', 'thai'] as SubjectKey[])[i % 4],
  isNew: i < 3,
}))

/* ---------- panels ---------- */

function ChatPanel({ onClose, fill = false }: { onClose?: () => void; fill?: boolean }) {
  return (
    <div className={`flex flex-col bg-surface-1 ${fill ? 'h-full' : ''}`}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-semibold text-ink">Live Chat</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="ปิด" className="h-8 w-8 text-ink-mute hover:bg-transparent hover:text-ink"><X size={18} /></Button>
      </div>
      <div className={`flex flex-col gap-3 px-4 py-4 ${fill ? 'flex-1 justify-end overflow-y-auto' : ''}`}>
        {messages.map((m, i) => (
          <div key={i} className={m.me ? 'text-right' : ''}>
            {!m.me && <p className="mb-0.5 text-[11px] text-ink-mute">{m.name}</p>}
            <span
              className={`inline-block max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                m.me ? 'bg-brand text-white' : 'bg-surface-2 text-ink'
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3 py-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full bg-surface-2 text-ink-soft hover:bg-surface-2"><Plus size={18} /></Button>
        <Input placeholder="Aa" className="h-auto flex-1 rounded-pill border-0 bg-surface-2 px-4 py-2 text-sm shadow-none focus-visible:ring-0" />
        <Button size="icon" className="h-9 w-9 shrink-0 rounded-full bg-brand text-white hover:bg-brand-dark"><Send size={16} /></Button>
      </div>
    </div>
  )
}

function VideoListPanel({ fill = false }: { fill?: boolean }) {
  const navigate = useNavigate()
  return (
    <div className={`flex flex-col ${fill ? 'h-full' : ''}`}>
      <h2 className="mb-3 font-semibold text-ink">Video List</h2>
      <div className={`space-y-3 pr-1 ${fill ? 'flex-1 overflow-y-auto' : ''}`}>
        {videoList.map((v) => (
          <Button key={v.id} variant="ghost" onClick={() => navigate(`/learn/${v.subject}/${v.subject === 'math' ? 'm1-1' : v.subject === 'english' ? 'e1-1' : v.subject === 'science' ? 's1-1' : 't1-1'}`)} className="flex h-auto w-full justify-start gap-2.5 p-0 text-left hover:bg-transparent">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <img src={thumb(v.id)} alt="" className="h-full w-full object-cover" />
              {v.isNew && <span className="absolute left-1 top-1 rounded bg-brand px-1 py-0.5 text-[8px] font-semibold text-white">New</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[11px] font-medium leading-snug text-ink">ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวน...</p>
              <div className="mt-1 flex gap-1"><Tag>คณิตศาสตร์</Tag><Tag>ป.6</Tag></div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}

function GoalCta() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/goal')} className="mt-4 flex w-full shrink-0 items-center justify-between rounded-card bg-brand p-4 text-left text-white">
      <div className="flex items-center gap-2">
        <Flag size={18} />
        <div>
          <p className="font-bold">Set your Goal!</p>
          <p className="text-xs opacity-90">ตั้งเป้าหมายเพื่อวางแผน และกระตุ้นการเรียนของคุณเอง!</p>
        </div>
      </div>
      <ArrowRight size={18} />
    </button>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-pill bg-brand-soft px-1.5 py-0.5 text-[9px] font-medium text-brand">{children}</span>
}

function VideoArea({ onBack }: { onBack?: () => void }) {
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-ink md:rounded-none">
      <img src={thumb('live-main')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <span className="absolute left-3 top-3 z-10 flex items-center gap-2 text-white">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="ย้อนกลับ" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white [&_svg]:size-[18px]">
            <ChevronLeft size={18} />
          </Button>
        )}
        <span className="flex items-center gap-1 rounded-pill bg-live px-2 py-1 text-[11px] font-semibold"><Radio size={11} /> Live</span>
        <span className="flex items-center gap-1 rounded-pill bg-black/40 px-2 py-1 text-[11px] font-medium"><Eye size={11} /> 18.2K</span>
      </span>
      <Button variant="ghost" size="icon" aria-label="เล่น" className="relative z-10 h-16 w-16 rounded-full bg-white/85 hover:bg-white [&_svg]:size-7"><Play size={28} className="ml-1 text-brand" fill="currentColor" /></Button>
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-white">
        <span className="flex items-center gap-2 text-sm"><Play size={16} /> 14:06:14</span>
        <div className="flex items-center gap-3"><Volume2 size={18} /><Maximize size={18} /></div>
      </div>
    </div>
  )
}

function Details() {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-ink-soft">วันนี้ 19:00 - 19:30</p>
        <Button className="h-auto shrink-0 gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/90 [&_svg]:size-[13px]">
          <Bell size={13} /> รับการแจ้งเตือนแล้ว (4) คนรออยู่
        </Button>
      </div>
      <h1 className="mt-1 text-lg font-bold leading-snug text-ink md:text-xl">
        ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวนเฉพาะ ห.ร.ม.และ ค.ร.น. (เสริม)
      </h1>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['คณิตศาสตร์', 'ป.5', 'ป.6'].map((t) => (
          <span key={t} className="rounded-pill bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{t}</span>
        ))}
      </div>
      <h2 className="mt-6 text-sm font-semibold text-ink">เอกสารประกอบการเรียน</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {['จำนวนเต็ม (เอกสาร)', 'จำนวนเต็ม (สไลด์)'].map((d) => (
          <button key={d} className="flex items-center gap-3 rounded-card bg-brand-soft/70 p-3 text-left hover:bg-brand-soft">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand">📄</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-ink-mute">คณิตศาสตร์</p>
              <p className="truncate text-sm font-medium text-ink">{d}</p>
              <p className="text-[11px] text-ink-mute">ครูพี่ดาว · ป.6</p>
            </div>
            <Download size={18} className="text-ink-soft" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- page ---------- */

export default function LiveStream() {
  const navigate = useNavigate()
  const [chatOpen, setChatOpen] = useState(false)
  const layout = useAppLayout()
  const split = useSavedLayout('app-live')

  // Tablet แนวนอน (แบบ ค): วิดีโอ + รายละเอียดซ้าย | แชทสดค้างไว้ขวา
  if (layout === 'tablet-landscape') {
    return (
      <ResizablePanelGroup {...split} orientation="horizontal" className="!h-[100dvh] bg-surface-0">
        <ResizablePanel id="main" minSize="45%">
          <div className="h-full overflow-y-auto">
            <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface-0/95 px-4 py-3 backdrop-blur">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent [&_svg]:size-5"><ChevronLeft size={20} /></Button>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4</p>
              <Button variant="ghost" size="icon" aria-label="แชร์" className="h-8 w-8 text-ink-soft hover:bg-transparent [&_svg]:size-[18px]"><Share2 size={18} /></Button>
            </header>
            <VideoArea />
            <div className="px-6 py-5">
              <Details />
              <GoalCta />
              <div className="mt-6"><VideoListPanel /></div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="chat" defaultSize={340} minSize={260} maxSize="50%">
          <ChatPanel fill />
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* ===== Mobile ===== */}
      <div className="flex min-h-[100dvh] flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface-0/95 px-3 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent [&_svg]:size-5"><ChevronLeft size={20} /></Button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4</p>
          <Button variant="ghost" size="icon" aria-label="แชร์" className="h-8 w-8 text-ink-soft hover:bg-transparent [&_svg]:size-[18px]"><Share2 size={18} /></Button>
        </header>
        <VideoArea />
        <div className="flex-1 px-4 py-4">
          <Details />
          <Button variant="outline" onClick={() => setChatOpen(true)} className="mt-6 h-auto w-full justify-between rounded-card border-line bg-surface-1 px-4 py-3 shadow-none hover:bg-surface-2">
            <span className="flex items-center gap-2 text-sm font-medium text-ink"><MessageSquare size={16} /> Live Chat</span>
            <span className="rounded-pill bg-brand px-3 py-1 text-xs font-semibold text-white">Open Live Chat</span>
          </Button>
          <GoalCta />
          <div className="mt-6"><VideoListPanel /></div>
        </div>
      </div>

      {/* chat drawer (tablet + mobile) */}
      {chatOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setChatOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-[360px] shadow-xl">
            <ChatPanel fill onClose={() => setChatOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
