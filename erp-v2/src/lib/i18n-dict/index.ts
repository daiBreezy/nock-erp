import type { Entry } from "../i18n"
import { DASHBOARD } from "./dashboard"
import { REPORTS } from "./reports"
import { SETTINGS } from "./settings"

// one file per area, filled as each page is translated (owner 2026-10-07: Reports → Dashboard → Settings first)
export const DICT_PAGES: Record<string, Entry> = { ...REPORTS, ...DASHBOARD, ...SETTINGS }
