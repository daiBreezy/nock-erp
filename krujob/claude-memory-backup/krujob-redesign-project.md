---
name: krujob-redesign-project
description: "KruJob teacher job-board redesign — interactive HTML prototype, goals & decisions"
metadata: 
  node_type: memory
  type: project
  originSessionId: 520e476c-a8a4-4d9a-8d2c-aaccf953593d
  modified: 2026-09-04T07:20:30.458Z
---

Nock is redesigning **krujob.com** (a Thai teacher job board) from scratch. Separate from NockERP. Built as a single-file interactive HTML prototype (`~/Documents/krujob-proto.html`, also a Claude Artifact) — vanilla HTML/CSS/JS, mobile-first, shadcn **Lime** theme (oklch tokens), Inter font, TH/EN i18n, light/dark.

**Phasing:** (1) Job board + Teacher/School profiles → (2) Professional network → (3) Marketplace (สอนแทน/substitute gigs). Teacher side is priority #1. Solo builder, no dev team — go incrementally.

**Key product decisions:** teachers free (optional Boost); schools pay (subscription to search teachers + Boost); Verification = incentive/ranking not requirement; LINE is core channel (login + daily match digest); support ALL teachers/schools incl foreign (full i18n, any language); Location is the #1 match factor (current + target/relocation); Feed is bidirectional (schools post jobs / teachers post "looking for work"); search always ranks by Match% first.

**Built & verified:** Feed (2-panel master-detail), Map view (schematic + Google Maps iframe), Search, Job Detail (+JD), School Profile (4 tabs + rating + map box), My Jobs (Match/New/Saved/Applied + paywall blur → Pricing), Schools directory, Register, progressive Onboarding, Teacher Profile, CV autofill + multi-CV/default, Settings (theme/lang hidden here), avatar dropdown menu. Bottom nav was removed at user's request.

**Still to build:** School-side (post jobs + ATS), Messages/Chat, Notifications, Verification center, Boost.

Gotchas: [[oklch-colormix-salmon-gotcha]] (use oklab for tints). Google Maps iframes work in local Chrome but are blocked in the Artifact viewer (CSP frame-src) → schematic fallback.
