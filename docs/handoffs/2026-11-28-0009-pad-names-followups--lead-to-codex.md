# Handoff: 0009 — [quick] Pad-name follow-ups: global bar numbers, aria-expanded (lead → codex)

- **Date:** 2026-11-28
- **Type:** quick
- **Ledger:** 0009 · **Spec:** none (quick; ledger S20 + S21 from PR #40 review) · **Plan:** none
- **Branch:** orch/0009-pad-names-followups · **Worktree:** created by T3
- **Base commit:** 3af5989
- **Status:** open

## Goal
Two small accessibility fixes to the pad names merged in #40:
1. **Paged grid bar numbers** count within the page, so on page 3 a pad announces "bar 1" while the tab says "Bar 3". Pass the page offset (current page index × bars per page, or the first global step of the page) from `src/App.tsx` through `Grid` → `TrackRow` → `Cell` so names use the global bar number, matching the endless grid.
2. **Split-pad master** opens/closes its sub-steps rather than toggling a note: use `aria-expanded` (true when expanded) instead of `aria-pressed` on the split master. Normal pads keep `aria-pressed`.

## Files you own
`src/App.tsx` (one prop passed to Grid only), `src/components/Grid.tsx`, `src/components/TrackRow.tsx`, `src/components/Cell.tsx`, and their tests. A parallel task (0001-t8b) owns `src/audio/useAudioEngine.ts` and `src/player/**` — don't touch those.

## Acceptance criteria
- [ ] On page 3 of a 4-bar stock groove (16 steps/page), the first pad announces bar 3 (test + Chromium check with role queries).
- [ ] Split master exposes `aria-expanded`, not `aria-pressed`; sub-step buttons and normal pads unchanged (tests).
- [ ] Cell memoisation intact (pass primitives only); EndlessGrid unaffected.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

---
## Receiver ack

I will pass a primitive bar offset through the paged grid so pad names match the bar tabs. The split master will expose its expanded state, and normal pads, sub-steps, and EndlessGrid will keep their existing behavior. I will verify page 3 of a four-bar stock groove with tests and Chromium role queries. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
