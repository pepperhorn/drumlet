# Handoff: 0001-t7 — App Paged / Endless toggle (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#endless-view) · [Task 7](../plans/0001-drumlet-player.md#task-7-app-paged--endless-toggle)
- Branch: `orch/0001-t7-app-view-toggle`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-4cbaa03a-006b175ef1b3a193`
- PR: [#37](https://github.com/pepperhorn/drumlet/pull/37)
- Base: `d9291cc` (implementation) · `9024a38` (dispatch checkout)
- Port: 5217
- Status: ready for review

## Review round 2

- [Review](https://github.com/pepperhorn/drumlet/pull/37#pullrequestreview-6086873301) found that the new keycaps made the desktop PageTabs bar wrap.
- The bar and page list use one row from 768 px up. At 768 px the bar still scrolls horizontally. Compact keycaps make the complete row fit at 1280 px. Below 768 px, the view keycaps keep their text and the page list can wrap.
- Clicking a tab or pressing 1–9 selects that page and moves the Endless strip. The move pauses auto-follow without seeking playback, even if the strip is already at that offset. The app uses the grid's page headings and the score's page joins. If notation is still drawing, it waits for the join before moving.
- Clear targets the selected page. A Split armed from the toolbar applies to the next clicked pad on its page. Steps still sets the existing pattern-wide steps-per-page value.

Chromium measurements with Basic 8th-Note Rock, four bars, light theme. Both Paged and Endless had the same heights and widths.

| Viewport | Main bar height (review baseline) | Updated height | Updated client / scroll width |
| ---: | ---: | ---: | ---: |
| 1280 px | 54 px | 54 px | 1214 / 1214 px |
| 768 px | 50 px | 50 px | 718 / 1077 px |
| 360 px | 240 px | 196 px | 334 / 334 px |

Round 2 screenshots and Chromium check are under `/tmp/drumlet-0001-t7-r2/`. Each viewport has `{width}-paged.png` and `{width}-endless.png`.

At 360 px, Chromium jumped to Bar 3 at scroll offsets of 1263 px in the grid and 446 px in notation. The 1 key returned both to zero. Jumping to Bar 4 during playback held each viewport at its chosen offset while the playhead advanced. The App test covers tab selection, keyboard jumps, Clear, and Split.

Verification after orch-deslop:

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

Node 22.23.5. Install, typecheck, lint, and build passed. The default test timeout hit two cases in `renderStaff.test.ts` and one in `NotationBoundary.test.tsx`. Neither file changed. The full retry passed with `VITEST_MAX_WORKERS=2 npm test -- --testTimeout=60000`.

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 10.49s
Test Files  13 passed (13)
     Tests  199 passed (199)
```

## Goal and scope

Switch the app between the existing Paged view and an editable Endless grid or Endless notation. The [dispatch handoff](2026-11-27-0001-t7-app-view-toggle--lead-to-codex.md) owns the constraints. The branch changes `App.tsx`, `PageTabs.tsx`, `Transport.tsx`, the view preference helper, the App wiring test, and the two handoffs. It does not change the player, audio scheduler, sequencer reducer, notation, auto-follow, or ledger.

## Decisions made

- The app applies the stored view preference to the scheduler state on every render. The scheduler receives `playMode: 'groove'` in Endless and `'page'` in Paged. The app does not dispatch the history-producing `SET_PLAY_MODE` action. A pattern load or undo cannot reset the view, and a view change does not add an undo entry.
- The existing `TOGGLE_CELL` action addresses the selected page. An Endless pad click selects the pad's page before dispatching that action. Page selection does not add an undo entry, so the edit takes one undo.
- The app selects the audible bar when returning to Paged, before the scheduler reconciles its cursor. Paged Grid suppresses the playhead when the audio position belongs to another page. Both Endless renderers get `-1` when stopped.
- The Endless loop button changes `loopGroove` without changing Paged chain mode. Whole-groove playback preloads one instrument per track ID across all pages. The legacy iframe stays Paged because it has no view toggle.

## Original acceptance and evidence

- Chromium loaded Basic 8th-Note Rock from the stock Library. It followed bars 1→2→3→4→1. Scroll moved from 0 to 1717 px and back to 0. The browser scheduled 55 audio buffer starts during this pass.
- The Paged switch selected Bar 2 while it played. A Bar 2 pad edit and undo restored its original value. With Loop groove off, playback stopped after Bar 4.
- Chromium switched between grid and notation in both layouts, hid the stopped playhead, and kept Endless selected after reload.
- At 360 px the PageTabs client and scroll widths were both 334 px in both modes and themes. At 1280 px both were 1214 px. Both labels were 14 px. The mobile BPM and Save controls fit with the loop button displayed.

Screenshots under `/tmp/drumlet-0001-t7/`:

| Width and theme | Paged | Endless grid | Endless notation |
| --- | --- | --- | --- |
| 360 light | `360-light-paged.png` | `360-light-endless.png` | `360-light-notation.png` |
| 360 dark | `360-dark-paged.png` | `360-dark-endless.png` | `360-dark-notation.png` |
| 1280 light | `1280-light-paged.png` | `1280-light-endless.png` | `1280-light-notation.png` |
| 1280 dark | `1280-dark-paged.png` | `1280-dark-endless.png` | `1280-dark-notation.png` |

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test -- --maxWorkers=2 --testTimeout=30000
npm run preview -- --host 0.0.0.0 --port 5217 --strictPort
node /tmp/drumlet-0001-t7/check.cjs
node /tmp/drumlet-0001-t7/playback.cjs
```

Verified with Node 22.23.5. The test flags keep verification stable on the loaded host. The default run timed out in both the new App tests and the unchanged notation suite.

```text
added 276 packages, and audited 277 packages
> tsc --noEmit
✖ 2 problems (0 errors, 2 warnings)
✓ built in 13.60s
Test Files  13 passed (13)
     Tests  198 passed (198)
```

## Open questions and follow-ups

None. Headless Chromium measured browser playback and layout. No physical-device or listening check was performed.

GBrain project reference: `projects/drumlet`. The repository spec, plan, and dispatch govern this task.
