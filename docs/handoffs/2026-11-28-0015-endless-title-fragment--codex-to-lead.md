# 0015 return handoff — Remove the title from Endless notation

- Date: 2026-11-28
- Type: return
- Ledger: 0015. No spec or plan (quick).
- Dispatch: [Lead → Codex](2026-11-28-0015-endless-title-fragment--lead-to-codex.md)
- Branch: `orch/0015-endless-title-fragment`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-f6b943d1-40eb5741bfb4a37e`
- Base: `8d6c287`
- Implementation commit: `c6e65e2`
- PR: [Draft for this branch](https://github.com/pepperhorn/drumlet/pulls?q=is%3Apr+head%3Aorch%2F0015-endless-title-fragment)
- Outcome: Implementation complete. Draft PR for review.

## Scope and decision

Endless removes the contents of every Verovio page header after engraving. This preserves the score dimensions and step positions, including across chunks. The renderer keeps the removed nodes with the strip and restores them only in the clone used by SVG and PNG downloads. Wrapped notation, page names, playback and the MEI title are unchanged.

Only `src/notation/notationExport.ts`, `src/notation/renderStaff.ts`, `src/notation/renderStaff.test.ts` and the 0015 handoffs changed. GBrain context: `[default:projects/drumlet]` records the original Endless notation work.

## Acceptance and verification

- [x] Verovio tests cover one and eight bars, plus 225 bars across four chunks. All three Endless cases failed on header text before the fix. Wrapped still renders “Drumlet notation.”
- [x] Chromium tested one- and eight-bar grooves at 412 and 1280 px in light and dark. It found no title text in Endless, including after switching from Paged. All eight before/after Paged screenshot pairs are pixel-identical. Score and count geometry matched exactly, and the active playhead was within 0.36 px of the engraved step.
- [x] Chromium downloaded SVG and PNG in both layouts for both groove lengths at 1280 px. SVG title text matched the baseline and all four before/after PNG pairs are pixel-identical.
- [x] The full verification chain passed before and after orch-deslop. The cleanup simplified the theme glyph selector and runs Wrapped after Endless on the shared toolkit.

```bash
export PLAYWRIGHT_CORE_PATH=/home/shaun/piano-invaders/node_modules/playwright-core
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run build:lib && npm run verify:lib && npm run check:embed
```

```text
✖ 2 problems (0 errors, 2 warnings)
Test Files  22 passed (22)
Tests  267 passed (267)
dist OK: scoped CSS, lazy notation, declarations and 28 matching acoustic1 samples.
SSR import passed with browser globals unavailable.
Grid / notation: 0 engine requests in grid, switch fetches chunk and renders SVG
Shared audio: 8 players, 1 AudioContext, suspended at idle
```

The two lint warnings are the existing AuthModal hook warnings.

## Evidence

- `/tmp/drumlet-0015-evidence/chromium-evidence.zip` contains the before/after screenshots, downloaded files, fixture, pixel comparison and geometry logs.
- `/tmp/drumlet-0015-evidence/before-412-light-8bar-endless-header-location.png` and `/tmp/drumlet-0015-evidence/after-412-light-8bar-endless-header-location.png` show the title location before and after.
- `/tmp/drumlet-0015-evidence/verify-final.log` has the full verification output.

## Open questions and follow-ups

None for implementation. Review the draft PR at its reported head.
