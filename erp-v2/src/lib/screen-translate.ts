// Translate the whole staff screen (owner 2026-10-14: "แปลภาษาทุกหน้า"). Pages written in Thai are translated where
// they are shown: every Thai text on screen (and placeholder / title / aria-label) is looked up in the dictionary —
// exact phrases first, then patterns with numbers or names in them ("{0} คาบ"). Anything not in the dictionary stays
// Thai, and people's own data (names, notes) never matches, so it is left as typed.
// Prototype approach on top of tx(): Dev should move to message ids in the real system.
import { DICTIONARY, type UiLang } from "./i18n"
import { romanizeName } from "@/domain/rules/romanize"

const THAI = /[฀-๿]/

interface Pattern { re: RegExp; en: string; ja: string; weight: number; key: string }

/** patterns whose {0} is a person's name — an unknown Thai name is spelled in Latin letters there */
const NAME_PATTERNS = new Set(["ครู{0}", "{0} (ออกแล้ว)", "ครู{0} · {1} {2}", "ครูร่วม: {0}"])
let patterns: Pattern[] | null = null
let built: unknown = null

const esc = (s: string) => s.replace(/[.*+?^$()|[\]\\]/g, "\\$&")

function compile(): Pattern[] {
  if (patterns && built === DICTIONARY) return patterns
  patterns = Object.entries(DICTIONARY)
    .filter(([k]) => /\{\d+\}/.test(k))
    .map(([k, v]) => {
      const parts = k.split(/(\{\d+\})/)
      const literal = parts.filter((p) => !/^\{\d+\}$/.test(p)).join("")
      // a template that is only placeholders + punctuation would match anything — skip it
      if (!THAI.test(literal)) return null
      const order: number[] = []
      const src = parts.map((p) => { const m = p.match(/^\{(\d+)\}$/); if (m) { order.push(Number(m[1])); return "([\\s\\S]+?)" } return esc(p) }).join("")
      return { re: new RegExp(`^${src}$`), en: v.en, ja: v.ja, weight: literal.length, order, key: k } as Pattern & { order: number[] }
    })
    .filter((x): x is Pattern & { order: number[] } => !!x)
    .sort((a, b) => b.weight - a.weight)
  built = DICTIONARY
  return patterns
}

const cache = new Map<string, string | null>()

/** the phrase in `lang`, or null when we don't know it */
function phrase(core: string, lang: Exclude<UiLang, "th">, depth = 0): string | null {
  const entry = DICTIONARY[core]
  if (entry) return entry[lang]
  if (depth > 3) return null
  // "A · B" — pieces translated one by one (a date or number piece passes through) when every Thai piece is known
  for (const sep of [" · ", " — ", ": ", " / "]) {
    if (!core.includes(sep)) continue
    const bits = core.split(sep).map((b) => (THAI.test(b) ? phrase(b.trim(), lang, depth + 1) : b))
    if (bits.every((b) => b !== null)) return bits.join(sep)
  }
  for (const p of compile() as (Pattern & { order: number[] })[]) {
    const m = core.match(p.re)
    if (!m) continue
    const vals: string[] = []
    // an unknown Thai piece in a name pattern is a name ("ครู{0}" → "T. Mint") — spelled in Latin letters
    const isName = NAME_PATTERNS.has(p.key)
    p.order.forEach((n, i) => { const v = m[i + 1]; vals[n] = THAI.test(v) ? phrase(v.trim(), lang, depth + 1) ?? (isName ? romanizeName(v.trim()) : v) : v })
    return (lang === "en" ? p.en : p.ja).replace(/\{(\d+)\}/g, (x, i) => vals[Number(i)] ?? x)
  }
  // trailing ":" / "*" / "?" kept as is
  const tail = core.match(/^(.*?)([:：*?！!…]+)$/)
  if (tail && tail[1]) { const t = phrase(tail[1].trim(), lang, depth + 1); if (t) return t + tail[2] }
  return null
}

export function translateScreenText(text: string, lang: UiLang): string {
  if (lang === "th" || !THAI.test(text)) return text
  const key = `${lang}\u0000${text}`
  if (cache.has(key)) return cache.get(key) ?? text
  const lead = text.match(/^\s*/)![0], trail = text.match(/\s*$/)![0]
  const t = phrase(text.trim(), lang)
  const out = t === null ? null : lead + t + trail
  if (cache.size > 20000) cache.clear()
  cache.set(key, out)
  return out ?? text
}

const ATTRS = ["placeholder", "title", "aria-label"] as const
const SKIP = "input, textarea, script, style, [contenteditable=true], [data-no-translate]"

function translateNode(node: Node, lang: UiLang) {
  if (node.nodeType === Node.TEXT_NODE) {
    const v = node.nodeValue
    if (!v || !THAI.test(v)) return
    if ((node.parentElement)?.closest(SKIP)) return
    const t = translateScreenText(v, lang)
    if (t !== v) node.nodeValue = t
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as Element
  if (el.matches(SKIP) && !el.matches("input, textarea")) return
  for (const a of ATTRS) {
    const v = el.getAttribute(a)
    if (v && THAI.test(v)) { const t = translateScreenText(v, lang); if (t !== v) el.setAttribute(a, t) }
  }
  if (el.matches("input, textarea")) return
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let n = walker.nextNode()
  while (n) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      const e = n as Element
      for (const a of ATTRS) { const v = e.getAttribute(a); if (v && THAI.test(v)) { const t = translateScreenText(v, lang); if (t !== v) e.setAttribute(a, t) } }
    } else translateNode(n, lang)
    n = walker.nextNode()
  }
}

/** watch the page and keep it translated while React changes it; returns a stop function */
export function startScreenTranslation(lang: UiLang): () => void {
  if (lang === "th" || typeof document === "undefined") return () => {}
  translateNode(document.body, lang)
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") translateNode(r.target, lang)
      else if (r.type === "attributes") translateNode(r.target, lang)
      else r.addedNodes.forEach((n) => translateNode(n, lang))
    }
  })
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] })
  return () => mo.disconnect()
}
