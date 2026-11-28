# Handoff 0013 — Theme-aware notation (Codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0013, quick item with no spec or plan
- Branch: `orch/0013-dark-notation-glyphs`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-e26f3adc-be586698ef7ddd83`
- Base: `aea44ca`. The dispatch handoff is in `b4780a1`.
- PR: https://github.com/pepperhorn/drumlet/pull/50
- Status: ready for review

## Goal and scope

[Dispatch handoff](./2026-11-28-0013-dark-notation-glyphs--lead-to-codex.md)

Uncoloured notation follows the theme text token in wrapped and Endless views. Color On keeps the track palette. SVG and PNG use dark ink on white regardless of the app theme. Changes stay in `src/notation/**`, `src/components/NotationView.tsx`, and the two 0013 handoffs. Layout, playback and prefetch behaviour are out of scope.

## What changed

Verovio sets `color="black"` on the inner SVG. Remove that attribute so neutral strokes inherit the notation container’s colour, and set the score’s default fill to `currentColor` for filled glyphs. Section labels and uncoloured drum key labels inherit the same ink. The export clone sets navy ink and a white background so standalone files do not rely on app CSS.

GBrain context: `projects/drumlet`. No write-back from the implementer.

## Acceptance and verification

- [x] A real Verovio render test checks the title, clef and time signature for fixed black paint or colour overrides in both layouts. It also checks Color On retains the track fill and Color Off removes it.
- [x] Chromium checked the computed paint of title, clef, time signature, staff lines, bar lines, rest and section text, plus monochrome stems, beams and drum key. All resolved to the theme text token. Color On retained all three track fills.
- [x] The SVG and PNG buttons downloaded readable files from Dark Studio in both layouts. Chromium reopened the SVGs and resolved neutral glyphs to navy and noteheads to their track colours. The PNG pixels contained navy ink, white paper and track colour.
- [x] No new app elements or layout changes.

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

The full command passed twice. The orch-deslop pass shortened the test assertions and added checks for six-digit black paint. The second run reported:

```text
added 279 packages
✖ 2 problems (0 errors, 2 warnings)
✓ 217 modules transformed.
✓ built in 2.37s
 Test Files  21 passed (21)
      Tests  258 passed (258)
```

Both lint warnings are in unchanged `AuthModal.tsx`. Full output: `/home/shaun/.t3/artifacts/drumlet-0013/verify.log`.

Chromium used the executable from the dispatch handoff. Artifacts are under `/home/shaun/.t3/artifacts/drumlet-0013/`.

| Viewport and theme | Wrapped | Endless |
|---|---|---|
| 412 px Light | `412-light-wrapped.png` | `412-light-endless.png`, `412-light-endless-scrolled.png` |
| 412 px Dark Studio | `412-dark-wrapped.png` | `412-dark-endless.png`, `412-dark-endless-scrolled.png` |
| 1280 px Light | `1280-light-wrapped.png` | `1280-light-endless.png` |
| 1280 px Dark Studio | `1280-dark-wrapped.png` | `1280-dark-endless.png` |

Exports are `export-wrapped.svg`, `export-wrapped.png`, `export-endless.svg` and `export-endless.png` in the same directory. The scrolled 412 px captures show the Endless title, which is centred on the full strip.

## Follow-up

Switching from a rendered Paged score to Endless left the old SVG as a direct child of `.notation-score-wrap`. Opening notation after choosing Endless showed one strip with one system. The layout switch is out of scope and unchanged.

No open question for this fix.
