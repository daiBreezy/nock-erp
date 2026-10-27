import { Send, Smile, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const messages = [
  { name: 'จอย', text: 'หนูตอบข้อ B ค่ะ' },
  { name: 'May', text: 'ตอบข้อ A ค่ะ' },
  { name: 'เนย', text: 'สวัสดีค่ะ ชื่อเนยนะคะ' },
  { name: 'มาร์กเกอร์', text: 'สวัสดีครับ ครูดาว' },
  { name: 'ฉัน', text: 'สวัสดีครับ', me: true },
  { name: 'ฉัน', text: 'มีคำถามครับผม', me: true },
]

/** แผงแชทสด (แบบ YouTube) — หัว · ข้อความ (ชื่อ + ข้อความบรรทัดเดียวกัน) · ช่องพิมพ์ */
export default function LiveChatPanel({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-full flex-col border-line bg-surface-1">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink">แชทสด</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="ปิดแชท" className="h-8 w-8 rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink [&_svg]:size-[18px]">
            <X size={18} />
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-y-auto px-4 py-3">
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-ink-soft">ยินดีต้อนรับสู่แชทสด! พูดคุยอย่างสุภาพ และไม่แชร์ข้อมูลส่วนตัวนะ</p>
        {messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <Avatar className="h-6 w-6">
              <AvatarFallback className={`text-[10px] ${m.me ? 'bg-brand text-white' : 'bg-surface-2 text-ink-soft'}`}>{m.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <p className="min-w-0 leading-snug">
              <span className={`mr-1.5 font-medium ${m.me ? 'text-brand' : 'text-ink-mute'}`}>{m.name}</span>
              <span className="text-ink">{m.text}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3 py-3">
        <Input placeholder="แชท..." className="h-9 flex-1 rounded-pill border-0 bg-surface-2 px-4 text-sm shadow-none focus-visible:ring-0" />
        <Button variant="ghost" size="icon" aria-label="อีโมจิ" className="h-9 w-9 shrink-0 rounded-full text-ink-soft hover:bg-surface-2 [&_svg]:size-5"><Smile size={20} /></Button>
        <Button size="icon" aria-label="ส่ง" className="h-9 w-9 shrink-0 rounded-full bg-brand text-white hover:bg-brand-dark"><Send size={16} /></Button>
      </div>
    </div>
  )
}
