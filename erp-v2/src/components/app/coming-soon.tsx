import { HourglassIcon } from "lucide-react"

/** Placeholder for a menu whose spec is not agreed yet — the route exists so the sidebar matches the design. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
      <HourglassIcon className="size-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{title} · เร็วๆ นี้</h2>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  )
}
