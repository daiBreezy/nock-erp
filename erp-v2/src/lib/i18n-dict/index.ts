export type Entry = { en: string; ja: string }

import { DASHBOARD } from "./dashboard"
import { REPORTS } from "./reports"
import { SETTINGS } from "./settings"
import { TODAY } from "./today"
import { AUTO } from "./auto"
import { VOCAB } from "./vocab"
import { KIT } from "./kit"
import { BILLING_PROMO } from "./billing-promo"
import { SHELL } from "./shell"
import { COVERAGE } from "./coverage"
import { TEACHING } from "./teaching"
import { EXAMS } from "./exams"
import { CHECKLIST_DICT } from "./checklist"
import { FORM_HUB } from "./form-hub"
import { PERIOD_IMPACT } from "./period-impact"

// one file per area, filled as each page is translated (owner 2026-10-07: Reports → Dashboard → Settings first)
export const DICT_PAGES: Record<string, Entry> = { ...AUTO, ...FORM_HUB, ...PERIOD_IMPACT, ...EXAMS, ...CHECKLIST_DICT, ...BILLING_PROMO, ...KIT, ...COVERAGE, ...TEACHING, ...VOCAB, ...REPORTS, ...DASHBOARD, ...SETTINGS, ...TODAY }

/** every phrase — pages + the shell (menu, top bar) */
export const DICTIONARY: Record<string, Entry> = { ...DICT_PAGES, ...SHELL }
