// Wraps displayed names in nm(…) and subjects in sj(…) (owner 2026-10-07: names in Latin letters for EN / JP).
//   node scripts/i18n-names.mjs <file...>
// Wraps `x.name`, `x.nickname`, `x?.name ?? "—"` and `x.subject` where they are shown: inside JSX {…}, or as the
// `label` / `name` / `title` / `text` of an object literal, or inside a template literal shown on screen.
// Leaves keys, values, comparisons and anything already wrapped alone.
import fs from "node:fs"
import ts from "typescript"

const NAME_PROPS = new Set(["name", "nickname"])
const SHOW_KEYS = new Set(["label", "name", "title", "text", "detail"])

for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, "utf8")
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const edits = []
  const kindOf = (e) => {
    let x = e
    if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) x = x.left
    while (ts.isParenthesizedExpression(x)) x = x.expression
    if (ts.isNonNullExpression(x)) x = x.expression
    const p = ts.isPropertyAccessExpression(x) ? x.name.text : null
    if (p && NAME_PROPS.has(p)) return "nm"
    if (p === "subject") return "sj"
    return null
  }
  const wrapped = (n) => { const p = n.parent; return p && ts.isCallExpression(p) && ts.isIdentifier(p.expression) && ["nm", "sj", "tx"].includes(p.expression.text) }
  const shown = (n) => {
    const p = n.parent
    if (!p) return false
    if (ts.isJsxExpression(p) && !ts.isJsxAttribute(p.parent)) return true // {x.name} as a child
    if (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent) && ["title", "label", "placeholder", "aria-label"].includes(p.parent.name.getText())) return true
    if (ts.isPropertyAssignment(p) && p.initializer === n && SHOW_KEYS.has(p.name.getText())) return true
    if (ts.isTemplateSpan(p)) {
      // a template shown on screen (JSX child / attribute), not an id or href
      for (let q = p.parent?.parent; q; q = q.parent) {
        if (ts.isJsxAttribute(q)) return ["title", "label", "aria-label"].includes(q.name.getText())
        if (ts.isJsxExpression(q)) return true
        if (ts.isPropertyAssignment(q)) return SHOW_KEYS.has(q.name.getText())
        if (ts.isCallExpression(q) || ts.isVariableDeclaration(q) || ts.isReturnStatement(q)) return false
      }
    }
    if (ts.isArrayLiteralExpression(p) && ts.isCallExpression(p.parent) && ts.isIdentifier(p.parent.expression) && p.parent.expression.text === "tx") return true // tx("…{0}…", [x.name])
    return false
  }
  const visit = (n) => {
    const k = ts.isExpression(n) ? kindOf(n) : null
    if (k && shown(n) && !wrapped(n)) {
      edits.push({ start: n.getStart(), end: n.getEnd(), text: `${k}(${src.slice(n.getStart(), n.getEnd())})` })
      return
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  if (!edits.length) { console.log(`${f}: nothing`); continue }
  edits.sort((a, b) => b.start - a.start)
  let out = src
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  const need = ["nm", "sj"].filter((fn) => edits.some((e) => e.text.startsWith(fn + "(")))
  const m = out.match(/import \{([^}]*)\} from "@\/lib\/i18n"/)
  if (m) {
    const names = new Set(m[1].split(",").map((x) => x.trim()).filter(Boolean))
    need.forEach((x) => names.add(x))
    out = out.replace(m[0], `import { ${[...names].join(", ")} } from "@/lib/i18n"`)
  } else {
    const lines = out.split("\n"); let last = -1
    lines.forEach((l, i) => { if (/^import /.test(l)) last = i })
    lines.splice(last + 1, 0, `import { ${need.join(", ")} } from "@/lib/i18n"`)
    out = lines.join("\n")
  }
  fs.writeFileSync(f, out)
  console.log(`${f}: wrapped ${edits.length}`)
}
