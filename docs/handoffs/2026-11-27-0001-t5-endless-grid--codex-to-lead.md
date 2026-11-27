# Handoff: 0001-t5 — Endless grid + auto-follow (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#endless-view) · [Task 5 plan](../plans/0001-drumlet-player.md#task-5-endless-grid--auto-follow) · [Dispatch](2026-11-27-0001-t5-endless-grid--lead-to-codex.md)
- Branch: `orch/0001-t5-endless-grid`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-39830e8f-8bfb427f8dedb40a`
- Base: `aa29ff2` (transport) · `95c8916` (dispatch)
- Port: 5215 (stopped)
- Status: open for review

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
- `useAutoFollow` compares scroll events with the actual offset after its own write, including browser rounding and clamping. A wheel, pointerdown, or unmatched scroll suspends follow. In the grid, clicking the active pad resumes follow and still runs the mode's click action.
- GBrain project context: [default:projects/drumlet]. The repository plan and spec govern Task 5.

## Open questions and follow-ups

No open questions for Task 5. Task 6 can use the hook as exported. For Task 7, the existing reducer's `TOGGLE_CELL` still targets `currentPageIndex`; pass the grid's page index through an explicit page-aware edit path so a click on an off-page cell cannot edit the selected page.

## Return

- Outcome: done, ready for review
- Acknowledgement: `e3b93df`
- Implementation: `1d19cf3`
