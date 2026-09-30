// Book / Lesson Topic catalog for lesson summaries (owner 2026-09-30). No inventory yet, so teachers type a book or a
// topic the first time and everyone in the branch picks it after — the same thing is never created twice because of
// upper/lower case, spacing or a small typo.

import type { ID, LessonBook, LessonSummary, LessonTopic, Staff } from "../types"
import { can } from "./permissions"
import { inBranch } from "./permissions"

/** "  Hello   English 1 " → "hello english 1" */
export const normalizeName = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase()

export const cleanName = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ")

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

export function findSame<T extends { name: string }>(list: T[], name: string): T | undefined {
  const n = normalizeName(name)
  return list.find((x) => normalizeName(x.name) === n)
}

/** Near misses ("Hello Englsh 1" for "Hello English 1") — asked about before creating a new one. */
export function findSimilar<T extends { name: string }>(list: T[], name: string): T[] {
  const n = normalizeName(name)
  if (n.length < 3) return []
  const room = n.length > 8 ? 2 : 1
  return list.filter((x) => { const m = normalizeName(x.name); return m !== n && distance(m, n) <= room })
}

export function validateCatalogName(name: string): string | null {
  const n = cleanName(name)
  if (!n) return "พิมพ์ชื่อก่อน"
  if (n.length > 80) return "ชื่อยาวเกิน 80 ตัวอักษร"
  return null
}

/** Teachers create and tidy the catalog themselves — anyone who writes summaries in that branch (owner 2026-09-30). */
export function canUseCatalog(user: Staff, branchId: ID) {
  return (can(user, "summary.write") || can(user, "summary.approve")) && inBranch(user, branchId)
}

/** Topics of a book in the order they were added (books are taught front to back). */
export const topicsOf = (bookId: ID, topics: LessonTopic[]) => topics.filter((t) => t.bookId === bookId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))

/** Next summary starts where this student left off: same book, the topic after the last one written. */
export function suggestLesson(studentId: ID, summaries: LessonSummary[], sessionsDate: Map<ID, string>, topics: LessonTopic[]): { bookId?: ID; topicId?: ID } {
  const last = summaries
    .filter((s) => s.studentId === studentId && s.bookId)
    .sort((a, b) => (sessionsDate.get(b.sessionId) ?? "").localeCompare(sessionsDate.get(a.sessionId) ?? ""))[0]
  if (!last?.bookId) return {}
  const list = topicsOf(last.bookId, topics)
  const i = list.findIndex((t) => t.id === last.topicId)
  return { bookId: last.bookId, topicId: list[i + 1]?.id ?? last.topicId }
}

export const booksOf = (branchId: ID, books: LessonBook[]) => books.filter((b) => b.branchId === branchId).sort((a, b) => a.name.localeCompare(b.name, "th"))
