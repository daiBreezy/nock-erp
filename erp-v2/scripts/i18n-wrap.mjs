// Wraps Thai UI text in t(...) so a page can be translated (owner 2026-10-07: TH / EN / JP chip).
//   node scripts/i18n-wrap.mjs <file...>          → rewrites the files, prints what it could not wrap
//   node scripts/i18n-wrap.mjs --keys <file...>   → prints every t("…") key used (JSON) for the dictionary
// Rules: JSX text, JSX string attributes, string literals and template literals inside functions become t("…")
// (templates keep their ${…} as {0}, {1} … → t("…{0}…", [a])). Left alone: comments, regexes, module-level
// constants (evaluated once — reported for a manual fix), comparisons and string-matching calls (data, not UI).
import fs from "node:fs"
import ts from "typescript"

const THAI = /[฀-๿]/
const args = process.argv.slice(2)
const FN = process.env.I18N_FN || "tx"
const keysOnly = args[0] === "--keys"
const files = keysOnly ? args.slice(1) : args

if (keysOnly) {
  const keys = new Set()
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8")
    const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && [FN, "tx"].includes(n.expression.text) && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && THAI.test(n.arguments[0].text)) keys.add(n.arguments[0].text)
      ts.forEachChild(n, visit)
    }
    visit(sf)
  }
  console.log(JSON.stringify([...keys], null, 1))
  process.exit(0)
}

const MATCH_CALLS = new Set(["startsWith", "endsWith", "includes", "indexOf", "localeCompare", "test", "match", "replace", "split", "has", "get", "set", "t", "tx", "T", "TR", "translate"])

for (const f of files) {
  const src = fs.readFileSync(f, "utf8")
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = [] // {start, end, text}
  const skipped = []
  const inFunction = (n) => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return true; return false }
  const q = (s) => JSON.stringify(s)
  const dataUse = (n) => {
    const p = n.parent
    if (!p) return false
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true
    if (ts.isCaseClause(p)) return true
    if (ts.isCallExpression(p) && p.arguments.includes(n)) {
      const callee = p.expression
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : ""
      if (MATCH_CALLS.has(name)) return true
    }
    if (ts.isPropertyAssignment(p) && p.name === n) return true
    if (ts.isElementAccessExpression(p) && p.argumentExpression === n) return true
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true
    return false
  }
  const where = (n) => `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`

  const visit = (n) => {
    if (ts.isJsxText(n) && THAI.test(n.text)) {
      const raw = n.text
      const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0]
      const core = raw.slice(lead.length, raw.length - trail.length)
      edits.push({ start: n.getStart(), end: n.getEnd(), text: `${lead}{${FN}(${q(core.replace(/\s+/g, " "))})}${trail}` })
      return
    }
    if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer) && THAI.test(n.initializer.text)) {
      edits.push({ start: n.initializer.getStart(), end: n.initializer.getEnd(), text: `{${FN}(${q(n.initializer.text)})}` })
      return
    }
    if (ts.isStringLiteral(n) && THAI.test(n.text)) {
      if (dataUse(n)) return
      if (!inFunction(n)) { skipped.push(`${where(n)}  module-level ${q(n.text)}`); return }
      edits.push({ start: n.getStart(), end: n.getEnd(), text: `${FN}(${q(n.text)})` })
      return
    }
    if (ts.isNoSubstitutionTemplateLiteral(n) && THAI.test(n.text)) {
      if (dataUse(n)) return
      if (!inFunction(n)) { skipped.push(`${where(n)}  module-level template`); return }
      edits.push({ start: n.getStart(), end: n.getEnd(), text: `${FN}(${q(n.text)})` })
      return
    }
    if (ts.isTemplateExpression(n)) {
      const parts = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)]
      if (parts.some((p) => THAI.test(p))) {
        if (dataUse(n)) return
        if (!inFunction(n)) { skipped.push(`${where(n)}  module-level template`); return }
        const key = n.head.text + n.templateSpans.map((s, i) => `{${i}}${s.literal.text}`).join("")
        const exprs = n.templateSpans.map((s) => src.slice(s.expression.getStart(), s.expression.getEnd()))
        // nested templates inside the ${} are left as they are (rare) — flagged for a look
        if (n.templateSpans.some((s) => /`/.test(src.slice(s.expression.getStart(), s.expression.getEnd())))) skipped.push(`${where(n)}  nested template — check`)
        edits.push({ start: n.getStart(), end: n.getEnd(), text: `${FN}(${q(key)}, [${exprs.join(", ")}])` })
        return
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  if (!edits.length) { console.log(`${f}: nothing to wrap`); continue }
  edits.sort((a, b) => b.start - a.start)
  let out = src
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  if (process.env.I18N_NOIMPORT) {
    // caller provides the function (e.g. domain rules take a translator)
  } else if (!/from "@\/lib\/i18n"/.test(out)) {
    // after the last import line
    const lines = out.split("\n")
    let last = -1
    lines.forEach((l, i) => { if (/^import /.test(l)) last = i })
    lines.splice(last + 1, 0, 'import { tx } from "@/lib/i18n"')
    out = lines.join("\n")
  } else if (!/import \{[^}]*\btx\b[^}]*\} from "@\/lib\/i18n"/.test(out)) {
    out = out.replace(/import \{([^}]*)\} from "@\/lib\/i18n"/, (m, g) => `import {${g.trimEnd()}, tx } from "@/lib/i18n"`)
  }
  fs.writeFileSync(f, out)
  console.log(`${f}: wrapped ${edits.length}`)
  for (const s of skipped) console.log("  SKIP " + s)
}
