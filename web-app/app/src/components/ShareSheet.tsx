import { Mail, MessageSquare, Copy, X } from 'lucide-react'
import type { ComponentType } from 'react'
import { shareTargets } from '../data/mock'
import { FacebookIcon, LineIcon, MessengerIcon } from './BrandIcons'

type IconProps = { size?: number; className?: string }

const iconMap: Record<string, ComponentType<IconProps>> = {
  facebook: FacebookIcon,
  line: LineIcon,
  messenger: MessengerIcon,
  email: Mail,
  sms: MessageSquare,
  copy: Copy,
}

// แต่ละแบรนด์ใช้สีจริงของตัวเอง (วงพื้นอ่อน + ไอคอนสีแบรนด์)
const tone: Record<string, string> = {
  facebook: 'bg-[#E7F0FE] text-[#1877F2]',
  line: 'bg-[#E4F5E4] text-[#06C755]',
  messenger: 'bg-[#EAF0FF] text-[#0A7CFF]',
  email: 'bg-subject-math text-subject-math-ink',
  sms: 'bg-subject-thai text-subject-thai-ink',
  copy: 'bg-surface-2 text-ink-soft',
}

export default function ShareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-30 mx-auto max-w-[440px] transition ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface-1 p-5 pb-8 transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-base font-medium text-ink">แชร์ผ่าน</p>
            <p className="mt-0.5 text-xs text-ink-soft">ชวนเพื่อนมาเรียนกับ NockAcademy</p>
          </div>
          <button onClick={onClose} aria-label="ปิด" className="text-ink-mute">
            <X size={22} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {shareTargets.map((t) => {
            const Icon = iconMap[t.key]
            return (
              <button key={t.key} onClick={onClose} className="flex flex-col items-center gap-1.5 active:scale-95">
                <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${tone[t.key]}`}>
                  <Icon size={24} />
                </span>
                <span className="text-[11px] text-ink-soft">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
