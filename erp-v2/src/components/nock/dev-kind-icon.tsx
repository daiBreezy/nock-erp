import { BugIcon, CircleHelpIcon, LifeBuoyIcon, LightbulbIcon, type LucideIcon } from "lucide-react"
import type { DevTicketKind } from "@/domain/types"

/** one icon per kind of เรื่องถึง Dev */
export const DEV_KIND_ICON: Record<DevTicketKind, LucideIcon> = { bug: BugIcon, help: LifeBuoyIcon, idea: LightbulbIcon, question: CircleHelpIcon }
