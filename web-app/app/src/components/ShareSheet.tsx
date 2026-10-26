import { Mail, MessageSquare, Copy } from 'lucide-react'
import type { ComponentType } from 'react'
import { shareTargets } from '../data/mock'
import { FacebookIcon, LineIcon, MessengerIcon } from './BrandIcons'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet'

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
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="mx-auto max-w-[440px] rounded-t-3xl p-5 pb-8">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="text-base font-medium text-ink">แชร์ผ่าน</SheetTitle>
          <SheetDescription className="text-xs text-ink-soft">ชวนเพื่อนมาเรียนกับ NockAcademy</SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {shareTargets.map((t) => {
            const Icon = iconMap[t.key]
            return (
              <SheetClose asChild key={t.key}>
                <button className="flex flex-col items-center gap-1.5 active:scale-95">
                  <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-full ${tone[t.key]}`}>
                    <Icon size={24} />
                  </span>
                  <span className="text-[11px] text-ink-soft">{t.label}</span>
                </button>
              </SheetClose>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
