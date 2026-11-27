# Handoff: 0007 — [quick] Stop renderStaff test timing out (lead → codex)

- **Date:** 2026-11-27
- **Type:** quick
- **Ledger:** 0007 · **Spec:** none (quick; owner accepted ledger suggestion S15) · **Plan:** none
- **Branch:** orch/0007-flaky-renderstaff-test · **Worktree:** created by T3
- **Base commit:** 080505d
- **Status:** open

## Goal
`src/notation/renderStaff.test.ts` (the "engraves onsets…" case, ~line 30) sometimes exceeds Vitest's 5 s default under parallel load because each run boots the verovio WASM toolkit; it passes on rerun (seen by two implementers and a reviewer). Make it reliable: share one toolkit instance across the file (e.g. warm it in `beforeAll` with its own generous timeout) and give the slow case an explicit timeout; don't just raise the global timeout.

## Files you own
`src/notation/renderStaff.test.ts`, and `vitest.config.ts` only if a per-project setting is genuinely needed (explain why).

Parallel work right now: 0001-t7 owns `src/App.tsx`, `src/components/PageTabs.tsx`, `src/components/Transport.tsx`; 0001-t8 owns `src/player/**`; the other two quick items own the files listed in their handoffs. Touch nothing else — note it in your return handoff instead.

## Acceptance criteria
- [ ] `npx vitest run --pool=threads --maxWorkers=4` passes 10 times in a row (loop it; paste the tally).
- [ ] No test assertions weakened.
- [ ] Contextual class names first on any new element (CLAUDE.md); no behaviour change outside the goal.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
