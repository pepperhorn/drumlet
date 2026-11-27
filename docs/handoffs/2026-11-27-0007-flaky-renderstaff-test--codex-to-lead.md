# Handoff: 0007 — Stop renderStaff test timing out (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0007 (quick)
- Branch: `orch/0007-flaky-renderstaff-test`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-42a01f58-9c0aacdc8552f57c`
- Base: `3939539` (dispatch handoff, based on `080505d`)
- Acknowledgement: `4b6dd14`
- Status: blocked on full-suite verification
- PR: none

## Goal and scope

[Dispatch handoff](2026-11-27-0007-flaky-renderstaff-test--lead-to-codex.md)

Keep the Verovio cold start out of the onset test's deadline. The patch in `src/notation/renderStaff.test.ts` renders one empty bar in a 30-second `beforeAll`. The renderer already caches the toolkit and Petaluma font. The onset test has a 15-second timeout and the endless rendering cases have a 30-second timeout. The 225-bar case took 17.65 seconds in the first stress series, so it needed more than the original local 15-second budget.

The patch stays in the worktree. `orch-deslop` shortened the warmup comment and called for a full rerun before committing. No production code, other tests, or Vitest config changed. An assertion-line comparison against the base found no changes.

## Verification

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npx vitest run --pool=threads --maxWorkers=4
```

| Run | Result |
| --- | --- |
| Initial full verification, default worker count | Typecheck, lint, and build passed. 193/194 tests passed. `NotationBoundary` hit its 5-second timeout. |
| Full verification before cleanup, `VITEST_MAX_WORKERS=4` | 12/12 files and 194/194 tests passed. |
| Full verification after cleanup, `VITEST_MAX_WORKERS=4` | Typecheck, lint, and build passed. 192/194 tests passed. `NotationBoundary` and `EndlessGrid` timed out. |
| First four-thread series | Run 1 passed (194/194). Run 2 failed (191/194) on the 225-bar renderer test and the two unchanged cases. The onset test passed both times. |
| Final full verification, `VITEST_MAX_WORKERS=2` | Typecheck, lint, and build passed. All four renderer tests passed. 193/194 tests passed overall. `NotationBoundary` timed out at 5 seconds. |
| Final four-thread series | Run 1 failed (191/194), so the series stopped at 0 consecutive passes. All four renderer tests passed. `EndlessGrid` timed out, and `NotationBoundary` had a timeout and a Retry assertion failure. |

Final full verification output:

```text
added 271 packages, and audited 272 packages in 2m
> tsc --noEmit
> eslint .
✖ 2 problems (0 errors, 2 warnings)
> vite build
✓ built in 14.77s
> vitest run
 Test Files  1 failed | 11 passed (12)
      Tests  1 failed | 193 passed (194)
```

Lint warnings are the existing hook warnings in `AuthModal.tsx`. The host's load average exceeded 50 on 12 logical CPUs during verification. The unchanged failures reproduce with standard test deadlines, so changing those deadlines is outside this patch.

## Follow-up

Rerun the full verification and the ten-run four-thread series on a quieter runner before committing the test patch and opening a PR. If the unchanged failures recur there, assign follow-up work for `NotationBoundary.test.tsx` and `EndlessGrid.test.tsx` separately. The current task does not own those files.

GBrain project context: `projects/drumlet`. The dispatch handoff and suite output supply the task-specific evidence.
