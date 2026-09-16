import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Play, Radio, Eye, Volume2, Maximize, Download, Bell,
  Send, Plus, X, MessageSquare, Flag, ArrowRight, Share2,
} from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'
import { thumb } from '../../data/media'
import type { SubjectKey } from '../../data/mock'

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
        <button onClick={onClose} aria-label="ปิด" className="text-ink-mute hover:text-ink"><X size={18} /></button>
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
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-soft"><Plus size={18} /></button>
        <input placeholder="Aa" className="flex-1 rounded-pill bg-surface-2 px-4 py-2 text-sm outline-none" />
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Send size={16} /></button>
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
          <button key={v.id} onClick={() => navigate(`/learn/${v.subject}/${v.subject === 'math' ? 'm1-1' : v.subject === 'english' ? 'e1-1' : v.subject === 'science' ? 's1-1' : 't1-1'}`)} className="flex w-full gap-2.5 text-left">
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <img src={thumb(v.id)} alt="" className="h-full w-full object-cover" />
              {v.isNew && <span className="absolute left-1 top-1 rounded bg-brand px-1 py-0.5 text-[8px] font-semibold text-white">New</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[11px] font-medium leading-snug text-ink">ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4 จำนวน...</p>
              <div className="mt-1 flex gap-1"><Tag>คณิตศาสตร์</Tag><Tag>ป.6</Tag></div>
            </div>
          </button>
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
          <button onClick={onBack} aria-label="ย้อนกลับ" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 hover:bg-black/60">
            <ChevronLeft size={18} />
          </button>
        )}
        <span className="flex items-center gap-1 rounded-pill bg-live px-2 py-1 text-[11px] font-semibold"><Radio size={11} /> Live</span>
        <span className="flex items-center gap-1 rounded-pill bg-black/40 px-2 py-1 text-[11px] font-medium"><Eye size={11} /> 18.2K</span>
      </span>
      <button className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/85"><Play size={28} className="ml-1 text-brand" fill="currentColor" /></button>
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
        <button className="flex shrink-0 items-center gap-1.5 rounded-pill bg-ink px-3 py-1.5 text-xs font-medium text-white">
          <Bell size={13} /> รับการแจ้งเตือนแล้ว (4) คนรออยู่
        </button>
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

  return (
    <div className="min-h-screen bg-surface-0">
      {/* ===== Web (tablet/desktop) ===== */}
      <div className="hidden md:block">
        <DesktopNav />
        <div className="lg:grid lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_330px]">
          {/* left: chat (desktop only) — เต็มจอ, input ปักล่าง */}
          <aside className="hidden h-[calc(100vh-112px)] border-r border-line xl:block">
            <ChatPanel fill />
          </aside>

          {/* center */}
          <div>
            <VideoArea onBack={() => navigate(-1)} />
            <div className="mx-auto max-w-5xl px-6 py-5">
              <Details />
              {/* tablet/≤lg: chat + goal + list ต่อท้าย */}
              <div className="mt-6 xl:hidden">
                <button onClick={() => setChatOpen(true)} className="flex w-full items-center justify-between rounded-card border border-line bg-surface-1 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink"><MessageSquare size={16} /> Live Chat</span>
                  <span className="rounded-pill bg-brand px-3 py-1 text-xs font-semibold text-white">Open Live Chat</span>
                </button>
                <GoalCta />
                <div className="mt-6"><VideoListPanel /></div>
              </div>
            </div>
          </div>

          {/* right: video list (scroll) + goal (ปักล่าง ไม่เลื่อน) */}
          <aside className="hidden h-[calc(100vh-112px)] flex-col border-l border-line px-4 py-4 xl:flex">
            <div className="min-h-0 flex-1">
              <VideoListPanel fill />
            </div>
            <GoalCta />
          </aside>
        </div>
      </div>

      {/* ===== Mobile ===== */}
      <div className="flex min-h-screen flex-col md:hidden">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface-0/95 px-3 py-3 backdrop-blur">
          <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ"><ChevronLeft size={20} className="text-ink" /></button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 4</p>
          <button aria-label="แชร์"><Share2 size={18} className="text-ink-soft" /></button>
        </header>
        <VideoArea />
        <div className="flex-1 px-4 py-4">
          <Details />
          <button onClick={() => setChatOpen(true)} className="mt-6 flex w-full items-center justify-between rounded-card border border-line bg-surface-1 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-ink"><MessageSquare size={16} /> Live Chat</span>
            <span className="rounded-pill bg-brand px-3 py-1 text-xs font-semibold text-white">Open Live Chat</span>
          </button>
          <GoalCta />
          <div className="mt-6"><VideoListPanel /></div>
        </div>
      </div>

      {/* chat drawer (tablet + mobile) */}
      {chatOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setChatOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-[360px] shadow-xl">
            <ChatPanel fill onClose={() => setChatOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
