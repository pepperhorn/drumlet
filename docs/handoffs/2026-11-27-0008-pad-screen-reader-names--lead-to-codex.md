# Handoff: 0008 — [quick] Screen-reader names for step pads (lead → codex)

- **Date:** 2026-11-27
- **Type:** quick
- **Ledger:** 0008 · **Spec:** none (quick; owner accepted ledger suggestion S11) · **Plan:** none
- **Branch:** orch/0008-pad-screen-reader-names · **Worktree:** created by T3
- **Base commit:** 080505d
- **Status:** open

## Goal
Step pads (`src/components/Cell.tsx`) announce only their velocity letter ("H") or nothing. Give every pad an accessible name with track, step and state, e.g. "Kick, bar 2 beat 3, step 11, hard" / "… empty", and expose on/off via `aria-pressed`. Split cells and sub-steps get names too ("… sub-step 2 of 3"). Both the paged grid (TrackRow) and the endless grid (EndlessGrid) pass what Cell needs. Keep memoisation intact (EndlessGrid's one-commit-per-step budget from #32 must hold — pass stable primitives, not new objects).

## Files you own
`src/components/Cell.tsx`, `src/components/TrackRow.tsx`, `src/components/EndlessGrid.tsx` (props to Cell only), their tests (`*.test.tsx` next to them; create `Cell.test.tsx`), and `src/components/Grid.tsx` — **one prop only** (pass the musical beat size to TrackRow), added by lead after implementer question.

Parallel work right now: 0001-t7 owns `src/App.tsx`, `src/components/PageTabs.tsx`, `src/components/Transport.tsx`; 0001-t8 owns `src/player/**`; the other two quick items own the files listed in their handoffs. Touch nothing else — note it in your return handoff instead.

## Acceptance criteria
- [ ] Tests assert names for empty, soft/medium/hard (per velMode) and split-master pads in both grids; sub-step buttons are tested where they already render (paged grid expanded split) — no new endless interaction needed.
- [ ] EndlessGrid still renders 1 commit per playhead step (existing test still passes; re-measure the 8×8 fixture and report the worst step time).
- [ ] Contextual class names first on any new element (CLAUDE.md); no behaviour change outside the goal.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

---
## Receiver ack

I will name existing pads in both grids and expose their pressed state. Grid will pass the musical beat size separately from its display grouping. I will test split masters in both grids and expanded sub-steps only in the paged grid, then measure the 8×8 endless grid.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
