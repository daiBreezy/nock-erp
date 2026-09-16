import { Copy } from "lucide-react"
import type { ReactNode } from "react"

export function CopyText({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group/c inline-flex items-center gap-1.5">
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); try { navigator.clipboard?.writeText(text) } catch { /* noop */ } }}
        className="text-muted-foreground opacity-0 transition-opacity group-hover/c:opacity-60 hover:!opacity-100"
        title="คัดลอก"
      >
        <Copy className="size-3" />
      </button>
    </span>
  )
}
