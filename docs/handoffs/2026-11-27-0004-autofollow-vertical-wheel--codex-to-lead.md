# Handoff 0004 — Auto-follow ignores vertical wheel (Codex → lead)

- Date: 2026-11-27
- Type: Return
- Ledger: 0004 · Spec and plan: none (quick)
- Dispatch: [Lead-to-Codex handoff](2026-11-27-0004-autofollow-vertical-wheel--lead-to-codex.md)
- Branch: `orch/0004-autofollow-vertical-wheel`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-678e31e8-3545aa54bf523224`
- Base: `b5a04bb`
- Outcome: Ready for review

## Goal and scope

Scrolling the host page vertically over Drumlet no longer pauses auto-follow. The wheel handler pauses when `|deltaX| > |deltaY|` or when Shift is held and `deltaY` is nonzero. Arrow-key focus, pointer, and scroll handling are unchanged.

Changed `useAutoFollow.ts`, its unit tests, and the wheel fixtures in `EndlessGrid.test.tsx`. The old integration fixture sent no deltas. It now sends horizontal-dominant input and still checks pause and resume. The new vertical-only case checks that the next playhead step advances the scroll offset from 95 to 135.

## Verification

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

Install, typecheck, lint, and build passed. Lint reported two existing warnings in `AuthModal.tsx`.

```text
✖ 2 problems (0 errors, 2 warnings)
Test Files  7 passed (7)
     Tests  157 passed (157)
```

`orch-deslop` removed the resolved blocker from this handoff and found no code cleanup needed. Full verification passed again.

## Open questions

None. GBrain [default:projects/drumlet] records the protected-main PR workflow. Use the dispatch handoff for the current verify command.
