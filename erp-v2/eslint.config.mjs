import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design System guard rails (2026-11-10, Design System › กฎหน้าจอและด่านกันพลาด). Warnings for now — the existing
// code still has spots to clean up; turn them into "error" once a rule reaches zero.
// 2026-11-11: status colours / px / breakpoints reached 0 → no-restricted-syntax is now "error" (don't let it regress).
// no-raw-controls moved to react/forbid-elements (still "warn", 329 left) → becomes "error" when it reaches 0.
// A real exception: `// eslint-disable-next-line no-restricted-syntax -- ds-exception: <why>` (count them with
// `grep -rn ds-exception src`; the same exception on 3 pages → move it into the shared component instead).
const PX = "/-\\[\\d+(\\.\\d+)?px\\]/"
const ADHOC_BP = "/(^|\\s|:)(md|xl|2xl):/"
const STATUS = "/\\b(bg|text|border|ring)-(emerald|green|red|rose|amber|yellow|sky|blue)-\\d{2,3}\\b/"
const dsRules = [
  { selector: `Literal[value=${PX}]`, message: "Design System: no px sizes — text-2xs / text-xs / … and the spacing scale (no-px-text)." },
  { selector: `TemplateElement[value.raw=${PX}]`, message: "Design System: no px sizes — text-2xs / text-xs / … and the spacing scale (no-px-text)." },
  { selector: `Literal[value=${ADHOC_BP}]`, message: "Design System: three breakpoints only — base / sm: / lg: (no md: or xl:) (no-adhoc-breakpoints)." },
  { selector: `TemplateElement[value.raw=${ADHOC_BP}]`, message: "Design System: three breakpoints only — base / sm: / lg: (no md: or xl:) (no-adhoc-breakpoints)." },
  { selector: `Literal[value=${STATUS}]`, message: "Design System: status colours come from Pill tone / tagChip() / success-·warning-·danger-·info- tokens (no-hardcoded-status-color)." },
  { selector: "JSXOpeningElement[name.name='SearchIcon'] JSXAttribute[name.name='className'] Literal[value=/absolute/]", message: "Design System: use <SearchBox> — no hand-placed search icon (no-search-icon)." },
]

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    // primitives and the shared layer are where these things are allowed to live
    ignores: ["src/components/ui/**", "src/components/app/tags.ts", "src/components/app/badges.tsx", "src/components/app/kpi.tsx", "src/components/app/page-layout.tsx"],
    rules: {
      // px / breakpoints / status colours / search icon reached 0 → locked as errors (2026-11-11)
      "no-restricted-syntax": ["error", ...dsRules],
      // raw controls still being cleaned (DESIGN-SYSTEM.md topic 2) — own rule so it can stay "warn" until 0
      "react/forbid-elements": ["warn", { forbid: ["button", "input", "textarea", "select"].map((element) => ({ element, message: `Design System: use Button / Input / Textarea / NativeSelect instead of raw <${element}> (no-raw-controls).` })) }],
      "no-restricted-imports": ["warn", { paths: [{ name: "@/components/ui/select", message: "Design System: use NativeSelect (components/app/native-select) — works better on iPad / phones." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
