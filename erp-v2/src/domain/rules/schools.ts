/**
 * Schools (owner 2026-10-07): the national school list of the Ministry of Education — open data,
 * exchange-api.moe.go.th GetopenData49 (one row per school, refreshed each academic year). The prototype ships
 * Bangkok + Chonburi (where our branches are) as public/data/schools-bkk-cbr.json; Dev: import the whole country
 * into the database and refresh it yearly, same fields.
 */
export interface SchoolRef {
  /** Ministry school code */
  id: string
  name: string
  /** province code, same as Branch.province (BKK / CBR) */
  p: string
  /** district (เขต / อำเภอ) */
  d: string
  /** who runs it: สพฐ. / เอกชน / กทม. / อปท. / อาชีวะ / อว. / พระปริยัติธรรม */
  a: string
  ll?: [number, number]
}

/** "โรงเรียนสาธิต จุฬาฯ" and "สาธิตจุฬาฯ" match the same way — no "โรงเรียน"/"รร.", spaces, quotes or case */
export const normSchool = (x: string) => x.toLowerCase().replace(/^(โรงเรียน|รร\.)/, "").replace(/["'“”\s.()\-]/g, "")

/**
 * Search as you type: every word must appear; names starting with the text first, then the branch's own province,
 * then shorter names. Capped (default 30) so the list stays quick however big the national list gets.
 */
export function searchSchools(list: SchoolRef[], q: string, opts: { province?: string; limit?: number } = {}): SchoolRef[] {
  const words = q.trim().split(/\s+/).map(normSchool).filter(Boolean)
  const limit = opts.limit ?? 30
  if (!words.length) return list.filter((x) => !opts.province || x.p === opts.province).slice(0, limit)
  const hits: { x: SchoolRef; score: number }[] = []
  for (const x of list) {
    const n = normSchool(x.name)
    const hay = `${n} ${normSchool(x.d)}`
    if (!words.every((w) => hay.includes(w))) continue
    const score = (n.startsWith(words[0]) ? 0 : 100) + (opts.province && x.p !== opts.province ? 50 : 0) + n.length / 100
    hits.push({ x, score })
  }
  return hits.sort((a, b) => a.score - b.score).slice(0, limit).map((h) => h.x)
}

/** the key reports group students by: the Ministry code, else the typed name normalised */
export const schoolKey = (s: { school?: string; schoolId?: string }) => s.schoolId || (s.school?.trim() ? `name:${normSchool(s.school)}` : "")
