# Handoff: 0014 — [quick] Paged→Endless notation leaves the old score on screen (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0014 · **Spec:** none (quick; bug found in PR #50 review, pre-existing on main) · **Plan:** none
- **Branch:** orch/0014-notation-layout-switch · **Worktree:** created by T3
- **Base commit:** 4252c85
- **Status:** open

## Goal
Repro (Opus, #50 review, on main): open notation in **Paged**, switch to **Endless** → the old wrapped score stays rendered above the endless strip; count labels and the playhead then draw over the stale score. Switching back to Paged clears it. Likely cause: `src/components/NotationView.tsx` ~552-557 (layout-dependent container) together with the render effect ~311-334 (the `prevDataRef`/`dataKey` short-circuit doesn't include `layout`, or the old container's SVG isn't cleared). Fix so switching layout in either direction, while stopped or playing, always shows exactly one correct score and the counts/playhead align with it.

## Files you own
`src/components/NotationView.tsx`, `src/notation/**`, their tests. A parallel item (0011, PR #51) owns `src/App.tsx` (prefetch block) and `src/components/notationPrefetch.ts` — don't touch those.

## Acceptance criteria
- [ ] Test: render NotationView wrapped, rerender with `layout="endless"` (and back) → exactly one rendered score SVG in the DOM, of the right layout.
- [ ] Chromium: Paged→Endless→Paged while stopped and while playing, light and dark, 412 and 1280 px — no stale score, counts and playhead aligned (screenshots).
- [ ] `npm run check:embed` still passes (notation is bundled in the player).

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run build:lib && npm run verify:lib && npm run check:embed
```
Chromium: executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell.

---
## Receiver ack

I’ll fix the Paged ↔ Endless switch within notation so one score owns its counts and playhead in either direction. I’ll add a round-trip regression test, verify stopped and playing in Chromium at both widths and themes, and run the embed gate. No open scope questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
