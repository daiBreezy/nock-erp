import type { ReactNode } from 'react'

export default function SectionTitle({
  children,
  subtitle,
  right,
}: {
  children: ReactNode
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{children}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-mute">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
