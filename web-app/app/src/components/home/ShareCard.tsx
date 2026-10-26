import { Share2, ChevronRight } from 'lucide-react'
import SectionTitle from '../SectionTitle'
import { tryNativeShare } from '../../lib/share'
import { Card } from '@/components/ui/card'

export default function ShareCard({ onOpen }: { onOpen: () => void }) {
  const handleClick = async () => {
    const sharedNatively = await tryNativeShare()
    if (!sharedNatively) onOpen()
  }
  return (
    <section className="px-4 pb-6 pt-5">
      <SectionTitle>ชวนเพื่อน</SectionTitle>
      <Card asChild className="rounded-card border-line bg-surface-1 shadow-none">
        <button
          onClick={handleClick}
          className="flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99]"
        >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
          <Share2 size={24} className="text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink">ชวนเพื่อนมาเรียนด้วยกัน</p>
          <p className="mt-0.5 text-xs text-ink-soft">แชร์แอปให้เพื่อน</p>
        </div>
          <ChevronRight size={20} className="text-ink-mute" />
        </button>
      </Card>
    </section>
  )
}
