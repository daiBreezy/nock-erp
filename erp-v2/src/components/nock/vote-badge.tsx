import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** One icon for the votes (owner 2026-10-13): more likes → green thumb up with the likes, more dislikes → red thumb down
 *  with the dislikes, a tie → grey thumb up, no votes → a dash */
export function VoteBadge({ up, down, className }: { up: number; down: number; className?: string }) {
  if (!up && !down) return <span className="text-muted-foreground">—</span>
  const Icon = down > up ? ThumbsDownIcon : ThumbsUpIcon
  return (
    <span title={`ช่วยได้ ${up} · ไม่ช่วย ${down}`} className={cn("inline-flex items-center gap-1 text-xs font-medium tabular-nums", up > down ? "text-emerald-700" : down > up ? "text-red-700" : "text-muted-foreground", className)}>
      <Icon className="size-3.5" />{down > up ? down : up}
    </span>
  )
}
