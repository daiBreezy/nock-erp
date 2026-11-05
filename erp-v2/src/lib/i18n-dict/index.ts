export type Entry = { en: string; ja: string }

import { DASHBOARD } from "./dashboard"
import { REPORTS } from "./reports"
import { SETTINGS } from "./settings"
import { TODAY } from "./today"
import { AUTO } from "./auto"
import { VOCAB } from "./vocab"
import { BILLING_PROMO } from "./billing-promo"
import { SHELL } from "./shell"
import { COVERAGE } from "./coverage"

// one file per area, filled as each page is translated (owner 2026-10-07: Reports → Dashboard → Settings first)
export const DICT_PAGES: Record<string, Entry> = { ...AUTO, ...BILLING_PROMO, ...COVERAGE, ...VOCAB, ...REPORTS, ...DASHBOARD, ...SETTINGS, ...TODAY }

/** every phrase — pages + the shell (menu, top bar) */
export const DICTIONARY: Record<string, Entry> = { ...DICT_PAGES, ...SHELL }
