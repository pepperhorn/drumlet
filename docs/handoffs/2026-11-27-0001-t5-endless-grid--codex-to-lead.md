# Handoff: 0001-t5 — Endless grid + auto-follow (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#endless-view) · [Task 5 plan](../plans/0001-drumlet-player.md#task-5-endless-grid--auto-follow) · [Dispatch](2026-11-27-0001-t5-endless-grid--lead-to-codex.md)
- Branch: `orch/0001-t5-endless-grid`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-39830e8f-8bfb427f8dedb40a`
- Base: `aa29ff2` (transport) · `95c8916` (dispatch)
- Port: 5215 (stopped)
- PR: [#32](https://github.com/pepperhorn/drumlet/pull/32)
- Status: open for re-review

## Goal and scope

`EndlessGrid` renders every page in one horizontal strip. Track labels stay pinned at the left and the grid uses the existing silicone `Cell` unchanged. Clicks route to page/track/step toggles in editable mode and global-step seeks in read-only mode. The grid follows the audio-clock playhead until manual input.

Changed only `src/components/EndlessGrid.tsx`, `src/components/EndlessGrid.test.tsx`, `src/components/useAutoFollow.ts`, `src/components/useAutoFollow.test.ts`, two page-join selectors in `src/styles/hardware.css`, and the two Task 5 handoffs. App, player, notation, transport, reducer, and ledger are unchanged.

## Acceptance and evidence

- The three-page fixture renders 96 cells, two track labels, and two joins. The tests check `onToggleStep(1, 1, 4)` and `onSeek(20)`, split-cell rendering, and global playhead placement.
- The hook tests check both follow edges, programmatic scroll recognition, pause on wheel, pointerdown and manual scroll, resume, next-play reset, and custom margins.
- A standalone Chromium fixture at widths of 360px and 1024px (2× device scale) checked all 96 cells, 2px join alignment, and stationary label left edges after scroll offsets of 691px and 377px. It also checked manual pause, tap to resume and seek, and a return to the first pad without it going under the label. This exercised the component, not app wiring or audio playback.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npx eslint src
```

The orch-deslop pass moved the shared sticky-label classes out of the render and grouped the playhead test with the grid suite. Typecheck and both lint commands passed, with the two existing AuthModal warnings.

```text
added 271 packages, and audited 272 packages in 43s
✖ 2 problems (0 errors, 2 warnings)
✓ built in 6.05s
Test Files  6 passed (6)
Tests  136 passed (136)
```

## Decisions made

- Use a section heading at step zero as the page join label when present. Otherwise use the page name.
- Measure the playhead from the rendered pad. On narrow grids, the sticky column plus half a pad can exceed the default quarter-width margin. Use the larger inset to keep the full pad visible when the playhead moves left.
- `useAutoFollow` compares scroll events with the actual offset after its own write, including browser rounding and clamping. At the original head, a wheel, pointerdown, or unmatched scroll suspended follow. The review fix below changes pointerdown to a drag threshold. In the grid, clicking the active pad resumes follow and still runs the mode's click action.
- GBrain project context: [default:projects/drumlet]. The repository plan and spec govern Task 5.

## Open questions and follow-ups

No open questions for Task 5. Task 6 can use the hook as exported. For Task 7, the existing reducer's `TOGGLE_CELL` still targets `currentPageIndex`; pass the grid's page index through an explicit page-aware edit path so a click on an off-page cell cannot edit the selected page.

## Review fix

The [first review](https://github.com/pepperhorn/drumlet/pull/32#pullrequestreview-6084204776) found three full-grid commits per playhead step and ordinary taps that suspended follow.

- Memoized track-page blocks and pad wrappers. On a playhead step, only the old and new playhead pads render. One stable click handler on the grid reads page and track indices from the DOM. `Cell` is unchanged.
- Measure the active pad in a layout effect and write the scroll offset directly. The measurement never enters React state. One ResizeObserver per mounted scroller tracks changes to the viewport and strip.
- A pointerdown records the starting position and whether follow was active. A click leaves follow as it was. Wheel, a 6px drag, or an unowned scroll suspends follow. A tap on the playhead or the next play resumes it. A click generated at the end of a drag does not activate the pad.
- Each track has one tab stop. Left/Right cross page joins, Home/End move to the first/last pad, and the horizontal scroll padding equals the sticky label width. Chromium verified Tab reaches track 2 and left-arrow focus stays clear of the label at both widths. The grid test restores its layout spies.

### Production profile

Used React's production profiling build in a scratch Vite harness on headless Chromium 158 at 2× scale. The same 8 pages × 16 steps × 8 tracks fixture, with rests, lit pads, and splits, ran on the reviewed head and this fix. After 10 warm-up steps, captured 32 step updates per width, including page joins and wraparound. Render time sums the Profiler's `actualDuration` across a step's commits. Sync time also includes the synchronous work around the update, such as layout and scroll.

| Width | Commits per step, before → after | Render median / p95 / max before | Render median / p95 / max after | Sync max before → after |
|---|---:|---:|---:|---:|
| 1024px | 3 → 1 | 13.8 / 18.7 / 21.2 ms | 0.6 / 1.1 / 6.4 ms | 30.4 → 17.6 ms |
| 360px | 3 → 1 | 16.5 / 29.1 / 34.3 ms | 0.7 / 1.2 / 1.8 ms | 49.1 → 13.1 ms |

Every measured step met the one-commit and 10ms render targets. Chromium also verified edit and seek taps keep following, wheel pauses, and a playhead tap resumes. These are fixture measurements, not app or audio timing tests.

### Verification after cleanup

The cleanup kept scroll bounds named and removed render-time measurement state. Ran the full Verify block and `npx eslint src` after the cleanup.

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 1.86s
 Test Files  6 passed (6)
      Tests  141 passed (141)
```

Both lint commands reported only the two existing AuthModal warnings. The player-specific pad-size container breakpoints remain a Task 9 follow-up because `Cell` is outside Task 5 ownership.

## Return

- Outcome: done, ready for review
- Acknowledgement: `e3b93df`
- Implementation: `1d19cf3`
