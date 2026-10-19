// Translation coverage (owner 2026-10-16 "เรื่องภาษา ทำต่อเลย"): every Thai phrase the staff UI shows must have an
// EN + JA entry the screen translator can use. This scans the source, so a new Thai text without a translation
// fails the test suite instead of showing up as Thai on the English / Japanese screen.
// `npm run i18n:check` writes the missing list to i18n-missing.json · `npm run i18n:export` writes i18n-export/{th,en,ja}.json
// for Dev (source-text keys, gettext-style: the Thai phrase is the id, {0} {1} are the placeholders).
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"
import { DICTIONARY } from "./i18n-dict"
import { translateScreenText } from "./screen-translate"

const ROOT = join(__dirname, "..")
// Thai letters (฿ alone is a currency sign, not text to translate)
const THAI = /[\u0E01-\u0E3A\u0E40-\u0E5B]/

/** not staff UI: the dictionaries, tests, demo data, parent-facing pages (own language picker), server code, printed
 *  documents (Thai by law), LINE messages to parents, and the Thai name spellers */
const SKIP = [
  /^lib\/i18n-dict\//, /\.test\.tsx?$/, /^data\//, /^app\/liff\//, /^app\/api\//, /^server\//, /^app\/print\//,
  /^components\/parent\//, /^domain\/rules\/messages\.ts$/, /^domain\/rules\/romanize\.ts$/, /^lib\/screen-translate\.ts$/,
  /^domain\/rules\/documents\.ts$/, /^store\/linked-demo\.ts$/, /^lib\/sales-tax-export\.ts$/, /^proxy\.ts$/, /^app\/inbox\/cards\//,
]

/** Thai on purpose — sent to parents in LINE, typed sample chat, Nock's search words / AI prompt, parsing helpers */
const NOT_UI = [
  /ค่ะ|นะคะ|ครับ/, /^📝 /, /^- \[\{0\}\]/, /^กฎ: /, /^คำตอบที่ทีมเคยเขียนไว้/, /^ถาม Nock ว่า:/,
  /^(จดโน้ต|note ถาวร|note ชั่วคราว|ลบโน้ต|แก้โน้ต|ปิด nock|เปิด nock|ปิด ai|ซ่อน nock|ภาระงาน|ป)$/,
]

function files(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) files(p, out)
    else if (/\.tsx?$/.test(f) && !SKIP.some((re) => re.test(relative(ROOT, p)))) out.push(p)
  }
  return out
}

/** Thai texts in one file: string literals, JSX text, and templates as "{0}" patterns (the dictionary's own form) */
export function thaiTexts(src: string, name = "x.tsx"): string[] {
  const sf = ts.createSourceFile(name, src, ts.ScriptTarget.Latest, true, name.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out: string[] = []
  const add = (s: string) => { const t = s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); if (THAI.test(t) && !NOT_UI.some((re) => re.test(t))) out.push(t) }
  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n)) return
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      // a property name / record key ("ทองหล่อ": …) is data, not text on screen
      if (!(ts.isPropertyAssignment(n.parent) && n.parent.name === n) && !ts.isLiteralTypeNode(n.parent)) add(n.text)
    } else if (ts.isJsxText(n)) add(n.text)
    else if (ts.isTemplateExpression(n)) {
      add(n.head.text + n.templateSpans.map((sp, i) => `{${i}}${sp.literal.text}`).join(""))
      n.templateSpans.forEach((sp) => visit(sp.expression))
      return
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return out
}

/** a phrase the translator can render: whole, or each Thai piece around the pattern holes */
const known = (s: string) => {
  if (translateScreenText(s, "en") !== s) return true
  // "{0} คาบ" style: try the template with sample values too (the screen sees it filled in)
  if (/\{\d+\}/.test(s)) return translateScreenText(s.replace(/\{\d+\}/g, "3"), "en") !== s.replace(/\{\d+\}/g, "3")
  return false
}

describe("translations", () => {
  it("every Thai text in the staff UI has EN + JA", () => {
    const missing = new Map<string, string[]>()
    for (const f of files(ROOT)) {
      for (const t of thaiTexts(readFileSync(f, "utf8"), f)) {
        if (known(t)) continue
        const where = relative(ROOT, f)
        missing.set(t, [...(missing.get(t) ?? []), where])
      }
    }
    if (process.env.I18N_REPORT) writeFileSync(join(ROOT, "..", "i18n-missing.json"), JSON.stringify(Object.fromEntries(missing), null, 1))
    expect([...missing.keys()].slice(0, 40)).toEqual([])
  })
})

if (process.env.I18N_EXPORT) {
  it("exports the dictionary for Dev", () => {
    const dir = join(ROOT, "..", "i18n-export")
    mkdirSync(dir, { recursive: true })
    const keys = Object.keys(DICTIONARY).sort((a, b) => a.localeCompare(b, "th"))
    const pick = (f: (k: string) => string) => JSON.stringify(Object.fromEntries(keys.map((k) => [k, f(k)])), null, 1) + "\n"
    writeFileSync(join(dir, "th.json"), pick((k) => k))
    writeFileSync(join(dir, "en.json"), pick((k) => DICTIONARY[k].en))
    writeFileSync(join(dir, "ja.json"), pick((k) => DICTIONARY[k].ja))
    expect(keys.length).toBeGreaterThan(0)
  })
}
