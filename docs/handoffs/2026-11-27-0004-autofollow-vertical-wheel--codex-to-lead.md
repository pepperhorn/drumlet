# Handoff 0004 — Auto-follow ignores vertical wheel (Codex → lead)

- **Date** 2026-11-27
- **Type** Return
- **Ledger** 0004 · **Spec and plan** None (quick)
- **Dispatch** [Lead-to-Codex handoff](2026-11-27-0004-autofollow-vertical-wheel--lead-to-codex.md)
- **Branch** `orch/0004-autofollow-vertical-wheel`
- **Worktree** `/home/shaun/.t3/worktrees/drumlet/t3-678e31e8-3545aa54bf523224`
- **Base** `6a6cac0` · **Implementation** `6198ae4`
- **Status** Blocked. Branch is local. No draft PR opened.

## Goal and scope

Keep auto-follow active while a vertical wheel scrolls past the embedded player. Pause on horizontal-dominant input or Shift plus nonzero vertical input. Only `src/components/useAutoFollow.ts` and `src/components/useAutoFollow.test.ts` are owned. Arrow-key focus, pointer, and scroll handling are unchanged.

## Acceptance and verification

- [x] Vertical input leaves auto-follow active, and the next playhead update still scrolls the strip.
- [x] Horizontal-dominant input and Shift plus vertical input pause following.
- [ ] Existing tests still pass. The hook's 9 tests pass, but an integration fixture needs an out-of-scope edit.

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm test -- src/components/useAutoFollow.test.ts
```

Install, typecheck, lint, and build passed. Lint emitted two warnings in `AuthModal.tsx`. The full test suite reported:

```text
FAIL  src/components/EndlessGrid.test.tsx > EndlessGrid > keeps the moving playhead in view until manual input, then follows again after a playhead tap
AssertionError: expected 135 to be 95
Test Files  1 failed | 6 passed (7)
     Tests  1 failed | 155 passed (156)
```

The new tests reproduced four failures against the old handler. All nine hook tests passed with the fix. The full-suite failure is at [the assertion in EndlessGrid.test.tsx](../../src/components/EndlessGrid.test.tsx#L98). Its fixture calls `fireEvent.wheel(scrollEl)` with both deltas defaulting to zero. The playhead now keeps following that no-motion event, so the offset advances from 95 to 135.

## Open question

May the implementer update [the wheel fixture](../../src/components/EndlessGrid.test.tsx#L95) to `fireEvent.wheel(scrollEl, { deltaX: 20 })`? This keeps the test's original manual-scroll intent and leaves its assertions intact. After that, rerun verification, run `orch-deslop`, rerun verification, then push and open the draft PR.

## Known gotchas

GBrain [default:projects/drumlet] documents the protected-main PR workflow. The dispatch handoff supplies the current verify command, including Vitest.
