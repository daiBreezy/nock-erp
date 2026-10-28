import { useEffect, useRef, useState } from 'react'
import { Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Msg = { name?: string; text: string; teacher?: boolean; me?: boolean }

const initial: Msg[] = [
  { name: 'ครูดาว', text: 'สวัสดีค่ะทุกคน วันนี้ตะลุยโจทย์กันนะคะ', teacher: true },
  { name: 'จอย', text: 'หนูตอบข้อ B ค่ะ' },
  { name: 'May', text: 'ตอบข้อ A ค่ะ' },
  { name: 'เนย', text: 'สวัสดีค่ะ ชื่อเนยนะคะ' },
  { name: 'มาร์กเกอร์', text: 'สวัสดีครับ ครูดาว' },
  { text: 'สวัสดีครับ', me: true },
  { text: 'มีคำถามครับผม', me: true },
]

/**
 * แผงแชทสด — สะอาดแบบแอปแชท AI (แบบเดียวกับแชทบน Landing)
 * ไม่มีเส้นคั่นหัว/ช่องพิมพ์ · คนอื่น = ชื่อตัวเล็ก + ข้อความ · ของเรา = ฟองเทาชิดขวา · พิมพ์แล้วส่งได้ (ยังไม่ต่อระบบจริง)
 */
export default function LiveChatPanel({ onClose }: { onClose?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs.length])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const m = text.trim()
    if (!m) return
    setMsgs((x) => [...x, { text: m, me: true }])
    setText('')
  }

  return (
    <div className="flex h-full flex-col bg-surface-1 text-ink">
      <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
        <p className="flex items-center gap-2 text-[15px] font-bold">
          <span className="size-2 animate-pulse rounded-full bg-live" /> แชทสด
        </p>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="ปิดแชท" className="h-8 w-8 rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink [&_svg]:size-[18px]">
            <X size={18} />
          </Button>
        )}
      </div>
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-3">
        <p className="mt-auto text-center text-[12px] text-ink-mute">ยินดีต้อนรับสู่แชทสด พูดคุยอย่างสุภาพ และไม่แชร์ข้อมูลส่วนตัวนะ</p>
        {msgs.map((m, i) =>
          m.me ? (
            <p key={i} className="max-w-[85%] self-end break-words rounded-2xl rounded-br-md bg-surface-2 px-3.5 py-2 text-[14px] leading-relaxed">{m.text}</p>
          ) : (
            <div key={i} className="text-[14px] leading-relaxed">
              <p className={`text-[12px] font-semibold ${m.teacher ? 'text-brand' : 'text-ink-mute'}`}>
                {m.name}
                {m.teacher && <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-px text-[10.5px] font-bold text-brand">ครู</span>}
              </p>
              <p className="mt-0.5 break-words">{m.text}</p>
            </div>
          ),
        )}
      </div>
      <form onSubmit={send} className="p-4 pt-2">
        <div className="flex items-center gap-2 rounded-[22px] bg-surface-2 py-2 pl-4 pr-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ถามครูได้เลย..."
            aria-label="พิมพ์ข้อความ"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-mute"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="ส่งข้อความ"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white transition disabled:bg-ink-mute/30"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
