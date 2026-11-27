import type { Topic } from "./today"

/**
 * The Dashboard as a DESK (owner 2026-11-27): work is stacked in PILES by subject — classroom, money, customers, leads — instead of boxes by
 * kind. Inside a pile the rows are a STORY in the order it really happens (an invoice: waiting approval → sent, no answer → due soon → overdue …).
 * One kind of work lives in exactly ONE pile; urgent work is a red dot on its pile, never a second place. Pure — the page passes the topics in.
 */

export type PileKey = "classroom" | "finance" | "customer" | "lead" | "impact"

export interface PileDef { key: PileKey; title: string; /** topic keys in story order */ stages: string[]; /** SUGGESTIONS (owner 2026-11-27: e.g. writing a summary is not required): shown apart, never counted, never red */ hints?: string[] }

export const PILES: PileDef[] = [
  { key: "classroom", title: "ห้องเรียน", stages: ["no_teacher", "conflict", "teacher_leave", "leave7", "summary_approve"], hints: ["hint_lesson", "hint_student"] },
  { key: "finance", title: "การเงิน", stages: ["invoice_approve", "invoice_sent_waiting", "invoice_due_soon", "invoice_overdue", "unconfirmed", "creditnote_approve", "credit_open"] },
  { key: "customer", title: "Customer", stages: ["ending7", "renewal", "parent_requests", "form_waiting", "exiting", "survey_call", "longleave7"] },
  { key: "lead", title: "Lead", stages: ["lead_new", "lead_follow_again", "lead_quiet", "trial_idle"] },
  // Special Periods + the yearly grade change — rendered by the page (they have their own rows), listed here so the overview strip counts them
  { key: "impact", title: "ผลกระทบ", stages: [] },
]

/** work that is red on its own (the clock is running or someone is waiting on it) */
export const RED_KEYS = new Set(["no_teacher", "conflict", "parent_requests", "invoice_overdue"])

export interface PileStage { key: string; title: string; detail: string; count: number; urgent: number; red: boolean; href: string }
export interface Pile { key: PileKey; title: string; stages: PileStage[]; /** rows with nothing left in them — shown faded at the bottom (owner 2026-11-27), never dropped */ done: PileStage[]; /** suggestions with something to suggest — not part of `total` */ hints: PileStage[]; total: number; urgent: number; /** anything red inside */ red: boolean }

/** every pile this person has rows for — active rows first, finished rows (count 0) kept apart in `done`; `extra` = rows the page draws itself (periods / notices) so the pile still counts */
export function buildPiles(topics: Topic[], extra: Partial<Record<PileKey, number>> = {}): Pile[] {
  return PILES.map((def) => {
    const all: PileStage[] = def.stages
      .map((k) => topics.find((t) => t.key === k))
      .filter((t): t is Topic => !!t)
      .map((t) => ({ key: t.key, title: t.title, detail: t.detail, count: t.count, urgent: t.urgent ?? 0, red: t.count > 0 && (RED_KEYS.has(t.key) || !!t.urgent), href: t.href }))
    const stages = all.filter((x) => x.count > 0)
    const hints: PileStage[] = (def.hints ?? []).map((k) => topics.find((t) => t.key === k)).filter((t): t is Topic => !!t && t.count > 0).map((t) => ({ key: t.key, title: t.title, detail: t.detail, count: t.count, urgent: 0, red: false, href: t.href }))
    const more = extra[def.key] ?? 0
    return { key: def.key, title: def.title, stages, done: all.filter((x) => x.count === 0), hints, total: stages.reduce((n, x) => n + x.count, 0) + more, urgent: stages.reduce((n, x) => n + (x.red ? Math.max(x.urgent, 1) : 0), 0), red: stages.some((x) => x.red) }
  })
}

/**
 * Where each pile sits (owner 2026-11-27): ONE fixed order for everybody — row 1 การเงิน · Lead · Customer, row 2 ห้องเรียน · ผลกระทบ.
 * Same place for every role and every day, so the eye (and the hand) always finds a pile where it was.
 */
export const PILE_ORDER: PileKey[] = ["finance", "lead", "customer", "classroom", "impact"]
