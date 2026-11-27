# Handoff: 0007 — Stop renderStaff test timing out (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0007 (quick)
- Branch: `orch/0007-flaky-renderstaff-test`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-42a01f58-9c0aacdc8552f57c`
- Base: `7e2626c` (amended dispatch)
- Implementation: `c047ad6`
- Outcome: Done. Ready for review.
- PR: Draft to open after the branch is pushed.

## What changed

[Amended dispatch handoff](2026-11-27-0007-flaky-renderstaff-test--lead-to-codex.md)

- `src/notation/renderStaff.test.ts` renders one empty bar in a 30-second `beforeAll`. It reuses the cached Verovio toolkit and Petaluma font. The onset test keeps a 15-second timeout. The endless cases get 30 seconds because the 225-bar case took 17.65 seconds during the blocked round.
- `src/components/NotationBoundary.test.tsx` advances the Retry deadline with fake timers, then waits for React to commit the resolved view with a real-timer DOM query. Its import-error test clears sequencer storage after unmount so the reopen assertion checks the notation cache without racing the one-second autosave.
- `vitest.config.ts` gives tests a 15-second default under parallel load. Tests keep their original expectations.

Only those three files and the two handoffs changed. The diff contains 39 changed lines outside `docs/`. No product code or `EndlessGrid.test.tsx` changed.

## Verification

```bash
npx vitest run --pool=threads --maxWorkers=4
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

The four-worker command passed 10 times in a row on 12 logical CPUs.

```text
 21:54:22 up 16:12,  0 user,  load average: 55.23, 57.77, 56.13
Run 01 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  50.30s
Run 02 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  53.84s
Run 03 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  44.96s
Run 04 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  41.48s
Run 05 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  47.63s
Run 06 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  53.81s
Run 07 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  54.64s
Run 08 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  40.05s
Run 09 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  18.62s
Run 10 PASS | Test Files  13 passed (13) | Tests  197 passed (197) | Duration  21.38s
10/10 consecutive runs passed
 22:02:04 up 16:20,  0 user,  load average: 47.82, 60.88, 58.60
```

Full verification passed before and after `orch-deslop`. The final pass kept the tested code unchanged and trimmed the handoff prose.

```text
added 271 packages, and audited 272 packages in 19s
> tsc --noEmit
> eslint .
✖ 2 problems (0 errors, 2 warnings)
> vite build
✓ built in 3.82s
> vitest run
 Test Files  13 passed (13)
      Tests  197 passed (197)
```

Lint reported two existing React hook warnings in `AuthModal.tsx`. The first attempt on the amended scope failed when autosave persisted page 2 before remount. The final series started from run 1 after the storage fix.

## Follow-ups

None. The amended scope and verification supersede the earlier blocked return.

GBrain project context: `projects/drumlet`. The dispatch handoff and test output supply the task-specific evidence.
