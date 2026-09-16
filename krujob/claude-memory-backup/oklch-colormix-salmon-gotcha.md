---
name: oklch-colormix-salmon-gotcha
description: "color-mix(in oklch, green, white) renders salmon/red — use in oklab instead"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 520e476c-a8a4-4d9a-8d2c-aaccf953593d
  modified: 2026-09-04T07:20:06.415Z
---

In CSS, `color-mix(in oklch, var(--primary), var(--background))` where primary is green and background is white/black renders **salmon/red**, not light-green. Reason: white/black are achromatic; oklch interpolates hue and treats them as hue 0 (red), so a green→white tint drags the hue from 150→0 through orange/red.

**Fix:** use `color-mix(in oklab, …)` for tints (or `in srgb`). oklab interpolates in a/b space with no hue wraparound, so green+white stays green.

**Why:** The user (Nock) was annoyed that KruJob's match-% chips looked "แดงๆ" (reddish). Root cause was every `color-mix(in oklab, --primary N%, --background)` tint. Replaced all 47 occurrences oklch→oklab in krujob-proto.html.

**How to apply:** When building shadcn/lime-themed prototypes with oklch tokens, always tint via `oklab` in color-mix. Relevant to [[krujob-redesign-project]].
