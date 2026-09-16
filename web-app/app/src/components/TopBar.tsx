import { CalendarDays } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-0/90 px-5 py-3 backdrop-blur">
      <h1 className="text-lg font-semibold text-ink">เซนเซย์</h1>
      <button
        aria-label="ตารางเรียน"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-1 text-ink-soft active:scale-95"
      >
        <CalendarDays size={20} />
      </button>
    </header>
  )
}
