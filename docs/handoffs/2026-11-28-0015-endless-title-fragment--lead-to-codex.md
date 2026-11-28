# Handoff: 0015 — [quick] Endless notation shows a clipped "Dru…" title fragment (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0015 · **Spec:** none (quick; pre-existing bug found in PR #52 review) · **Plan:** none
- **Branch:** orch/0015-endless-title-fragment · **Worktree:** created by T3
- **Base commit:** 8d6c287
- **Status:** open

## Goal
In the **Endless** notation strip a clipped fragment of the score title ("Dru…" from "Drumlet notation") appears near the start of page 2. The title comes from the MEI `<titleStmt><title>Drumlet notation</title>` in `src/notation/renderStaff.ts:~277`, which verovio renders as a page header — in endless layout (and its chunked rendering) the header lands mid-strip. Fix: the endless strip shows no title fragments anywhere — either suppress the verovio page header in endless layout (e.g. `header: 'none'` for endless only) or render the title once at the very start of the strip. Wrapped layout and SVG/PNG exports keep the title exactly as now.

## Files you own
`src/notation/**`, `src/components/NotationView.tsx`, their tests.

## Acceptance criteria
- [ ] Test: an endless render (including a long score that chunks) contains no title/header text except optionally once at the start; a wrapped render still contains the title.
- [ ] Chromium: endless at 412 and 1280 px, light and dark, short and 8-bar grooves — no "Dru…" fragment; wrapped unchanged (before/after screenshots); stepPositions/playhead unchanged.
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
