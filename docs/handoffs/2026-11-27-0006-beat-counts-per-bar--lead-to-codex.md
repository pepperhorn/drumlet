# Handoff: 0006 — [quick] Notation beat counts restart each bar (lead → codex)

- **Date:** 2026-11-27
- **Type:** quick
- **Ledger:** 0006 · **Spec:** none (quick; owner accepted ledger suggestion S18) · **Plan:** none
- **Branch:** orch/0006-beat-counts-per-bar · **Worktree:** created by T3
- **Base commit:** 080505d
- **Status:** open

## Goal
In `NotationCounts` (src/components/NotationView.tsx ~122-145) beat numbers run on across the whole score (`labelFn(beat + 1)`), so bar 2 counts from "5" and long endless strips reach 3-digit counts. Counts must restart every bar: `labelFn((beat % beatsPerBar) + 1)` (pass `beatsPerBar` through; compound meters follow the existing beat definition). Extract the label computation into a pure helper so it's testable.

## Files you own
`src/components/NotationView.tsx` (NotationCounts block and the prop passed to it only), new `src/components/notationCounts.ts` + `src/components/notationCounts.test.ts`. **Not** `src/notation/renderStaff.test.ts` (owned by 0007).

Parallel work right now: 0001-t7 owns `src/App.tsx`, `src/components/PageTabs.tsx`, `src/components/Transport.tsx`; 0001-t8 owns `src/player/**`; the other two quick items own the files listed in their handoffs. Touch nothing else — note it in your return handoff instead.

## Acceptance criteria
- [ ] 4/4, 16th subdivision, 2 bars: labels go `1 e & a … 4 e & a` then `1 e & a …` again (test).
- [ ] 3/4 and 6/8 restart correctly (tests); wrapped and endless layouts both show per-bar counts.
- [ ] Contextual class names first on any new element (CLAUDE.md); no behaviour change outside the goal.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

---
## Receiver ack

Codex will restart the displayed count at 1 in each measure, using the existing meter and subdivision. Both notation layouts will share a pure count helper. I will cover two bars of 4/4, 3/4, and 6/8 in the owned test file and leave the staff renderer untouched. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
