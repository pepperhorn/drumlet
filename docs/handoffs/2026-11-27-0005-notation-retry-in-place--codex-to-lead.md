# Handoff: 0005 — Notation Retry without page reload (codex → lead)

- **Date:** 2026-11-27
- **Type:** return
- **Ledger:** 0005 (quick)
- **Branch:** `orch/0005-notation-retry-in-place`
- **Worktree:** `/home/shaun/.t3/worktrees/drumlet/t3-6bb80683-a6b24001507b175a`
- **PR:** [#35](https://github.com/pepperhorn/drumlet/pull/35) (draft)
- **Base:** `9e28762` (includes the dispatch handoff, based on `e480679`)
- **Implementation:** `88652679844ae2e79b9bb88ce7b2e6e326f2c591`
- **Outcome:** Done. Ready for review.

## Goal and scope

[Dispatch handoff](2026-11-27-0005-notation-retry-in-place--lead-to-codex.md)

Retry resets the notation boundary and its 15-second timer without remounting the sequencer. A failed chunk import is evicted. A pending import stays shared so Retry does not discard the download.

- **Owned files changed:** `src/App.tsx` (notation loader only), `src/components/NotationBoundary.tsx`, `src/components/NotationBoundary.test.tsx`, `src/components/notationPrefetch.ts`, `src/components/notationPrefetch.test.ts`, and both 0005 handoffs.
- **Out of scope:** `src/components/NotationView.tsx` and `src/notation/**` were left to the parallel task.

## Acceptance and verification

- [x] A failing-then-succeeding import preserves an edited step, the selected page, and undo in a jsdom test using the real sequencer provider.
- [x] The loader evicts a rejected promise and shares the next promise across concurrent calls.
- [x] Retry at 15 seconds resets the loading timer and accepts the result of the shared import.

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

The cleanup rerun passed with `VITEST_MAX_WORKERS=2` after an unchanged renderer test timed out under concurrent load. No timeout or test configuration changed.

```text
added 271 packages, and audited 272 packages in 18s

> tsc --noEmit
> eslint .
✖ 2 problems (0 errors, 2 warnings)
> vite build
✓ 206 modules transformed.
✓ built in 1.77s
> vitest run
 Test Files  12 passed (12)
      Tests  191 passed (191)
```

The cleanup pass simplified the mock fixture. Lint reported two existing warnings in `AuthModal.tsx`. The build kept a separate `NotationView` chunk.

## Review fix

[PR #35 review](https://github.com/pepperhorn/drumlet/pull/35#pullrequestreview-6085520653)

Each mount created a fresh lazy component, which suspended even when the import promise had already resolved. Reopening now reuses the module-level component. Retry from the error card replaces it. Retry from the slow card restarts the 15-second timer and keeps the pending component and download.

The reopen test reproduced the engine flash on the reviewed head. It now checks that notes render immediately after a remount and the loader is called only once. The error-path test also checks that reopening uses the recovered component.

The cleanup pass removed repeated mock setup. The full verify command passed again with `VITEST_MAX_WORKERS=2`. Only the notation boundary, its test, and this handoff changed in this round.

```text
> tsc --noEmit
> eslint .
✖ 2 problems (0 errors, 2 warnings)
> vite build
✓ built in 1.58s
> vitest run
 Test Files  12 passed (12)
      Tests  192 passed (192)
```

## Decisions and limits

- Retry remounts only the notation loader. The app no longer calls `location.reload()` or writes a retry flag to browser history.
- The test mocks an import failure. Browsers that cache failed module fetches may reject the same URL again, and Retry cannot recover a chunk removed during a deployment. [Vite troubleshooting](https://vite.dev/guide/troubleshooting.html#failed-to-fetch-dynamically-imported-module-error)
- GBrain project context: `default:projects/drumlet`. The repository handoff governs this change.

## Open questions

None. The diff exceeds the small auto-merge line limit. Send it for review and owner approval.
