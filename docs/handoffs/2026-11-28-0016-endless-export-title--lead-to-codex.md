# Handoff: 0016 — [quick] Endless SVG/PNG downloads: no mid-strip title (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0016 · **Spec:** none (quick; follow-up from PR #53 review) · **Plan:** none
- **Branch:** orch/0016-endless-export-title · **Worktree:** created by T3
- **Base commit:** ebeb9ff
- **Status:** open

## Goal
After #53 the Endless strip on screen has no title, but **Endless** SVG/PNG downloads still put "Drumlet notation" in the middle of the strip once per render chunk (4 copies for a 230-bar score), because `src/notation/renderStaff.ts` stores the removed title for `src/notation/notationExport.ts` to put back. Lead decision: Endless downloads match the screen — **no title** — and the hidden renderer→export title hand-off is removed (the reviewer estimates this collapses the #53 fix to a one-line clear, ~14 lines less). **Paged (wrapped) downloads keep their title exactly as now.**

## Files you own
`src/notation/**`, `src/components/NotationView.tsx` (only if the export call site needs it), their tests.

## Acceptance criteria
- [ ] Test: Endless SVG export (short and chunked/long score) contains no title text; Paged SVG export still contains it once.
- [ ] Chromium: download SVG and PNG in Endless and Paged, light and dark — Endless has no title anywhere, Paged unchanged (compare with main).
- [ ] On-screen behaviour identical to main after #53 (no title in Endless; Paged unchanged; stepPositions/playhead unchanged).
- [ ] `npm run build:lib && npm run verify:lib && npm run check:embed` pass.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run build:lib && npm run verify:lib && npm run check:embed
```
Chromium: executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
