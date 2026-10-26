import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-0/90 px-5 py-3 backdrop-blur">
      <h1 className="text-lg font-semibold text-ink">เซนเซย์</h1>
      <Button
        variant="outline"
        size="icon"
        aria-label="ตารางเรียน"
        className="h-10 w-10 rounded-full border-line bg-surface-1 text-ink-soft hover:text-brand active:scale-95"
      >
        <CalendarDays size={20} />
      </Button>
    </header>
  )
}
