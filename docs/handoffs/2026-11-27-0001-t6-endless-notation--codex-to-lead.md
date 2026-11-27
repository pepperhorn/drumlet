# Handoff: 0001-t6 — Endless notation (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#endless-view) · [Task 6 plan](../plans/0001-drumlet-player.md#task-6-endless-notation) · [Dispatch](2026-11-27-0001-t6-endless-notation--lead-to-codex.md)
- Branch: `orch/0001-t6-endless-notation`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-69c401c9-856a968687d76c84`
- PR: [Branch comparison](https://github.com/pepperhorn/drumlet/compare/main...orch/0001-t6-endless-notation). The draft PR body links this handoff.
- Base: `e480679` (code), `9e28762` (dispatch)
- Port: 5216, stopped
- Status: ready for review

## Goal and scope

Add an endless staff and global playhead to `NotationView`. Changes are limited to `src/components/NotationView.tsx`, `src/notation/renderStaff.ts`, `src/notation/renderStaff.test.ts`, and the two handoffs. App wiring, notation prefetch, the player, and the ledger are unchanged.

## Acceptance and evidence

- The new renderer tests failed against the base with 2 wrapped systems instead of 1 for eight bars and 57 systems instead of 4 for 225 bars. They now pass with an x for every step and strictly increasing x across each join.
- Chromium rendered eight 16-step pages as one system, with seven page joins, a section name overriding the second page name, eight split tuplets, and 32 count labels. A 430 px viewport had a 380 px score scroller around a 1,862 px strip. The toolbar stayed outside the scroll strip.
- Chromium checked that the global playhead follows across pages, vertical wheel preserves follow, horizontal wheel pauses it, playhead activation resumes it, and a stop/restart restores follow. An explicit global step of -1 hid the playhead even when the legacy page-local step was 7. The SVG download included all eight bars and the section name. Switching to the default layout restored the wrapped Auto control.
- A 225-bar Chromium fixture rendered four aligned systems, 225 measures, and 3,600 increasing step positions. Measured note centers differed from the reported x by at most 0.002 CSS px. All 11 existing test files and the expanded notation tests passed.

## Render cost

Headless Chromium with the React production profiling bundle. Each run measured 381 active playhead updates on the same eight-bar, four-track groove, paced one per animation frame in a 430 px viewport. Every measured step committed once. The score SVG and count layer retained their DOM nodes.

| Run | React render p50 / p95 / max | Synchronous update p50 / p95 / max |
| --- | --- | --- |
| 1 | 0.1 / 0.3 / 16.5 ms | 0.6 / 7.6 / 21.9 ms |
| 2 | 0.1 / 0.4 / 9.7 ms | 0.6 / 4.0 / 12.2 ms |

The second run met the 10 ms render target at the maximum. The first run did not. Synchronous update time includes React commit and the layout effect that follows the playhead. The loop excludes score engraving, startup, and paint.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
git diff main...HEAD --check
```

After orch-deslop:

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 4.96s
 Test Files  11 passed (11)
      Tests  190 passed (190)
```

The two lint warnings are in `AuthModal.tsx`. npm reported 19 audit findings. The build reported Verovio's browser externalization and chunk-size warnings. No dependency files changed. The scratch browser harness, logs, and screenshot are under `/tmp/drumlet-t6.IqbMNb` on this machine.

## Decisions and known gotchas

- Verovio's `pageWidth` option tops out at 100,000. Above the estimated width limit, engrave chunks of at most 64 bars. Preserve global event IDs, align the staff lines, and compose one outer SVG so downloads keep the whole strip.
- The score and its count labels stay stable as the playhead advances. The t5 measured auto-follow hook reads the step x in its layout effect. A nonnegative global step acts as its active signal. Stop passes -1. If a future caller distinguishes a stopped seek from playback, it may also need an explicit playback signal.
- Endless page names fall back to the page name when no step-zero heading exists. Missing track steps remain silent without shifting later pages.
- GBrain: `projects/drumlet` confirms the protected-main workflow. The spec, plan, and dispatch govern this task.

## Open questions

None for Task 6. Task 7 owns wiring in the app. Physical touch devices and Safari were not tested.

## Return

- Outcome: done, ready for review.
- Commits: `e4539e6` acknowledgement, `14d2dce` implementation, `88dcd4d` cleanup.
- Follow-up: review the draft before dispatching the app toggle.
