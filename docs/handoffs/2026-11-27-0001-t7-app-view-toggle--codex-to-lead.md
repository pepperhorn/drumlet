# Handoff: 0001-t7 — App Paged / Endless toggle (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#endless-view) · [Task 7](../plans/0001-drumlet-player.md#task-7-app-paged--endless-toggle)
- Branch: `orch/0001-t7-app-view-toggle`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-4cbaa03a-006b175ef1b3a193`
- PR: Draft against `main` from the branch above
- Base: `d9291cc` (implementation) · `9024a38` (dispatch checkout)
- Port: 5217
- Status: ready for review

## Goal and scope

Switch the app between the existing Paged view and an editable Endless grid or Endless notation. The [dispatch handoff](2026-11-27-0001-t7-app-view-toggle--lead-to-codex.md) owns the constraints. The branch changes `App.tsx`, `PageTabs.tsx`, `Transport.tsx`, the view preference helper, the App wiring test, and the two handoffs. It does not change the player, audio scheduler, sequencer reducer, notation, auto-follow, or ledger.

## Decisions made

- The app applies the stored view preference to the scheduler state on every render. The scheduler receives `playMode: 'groove'` in Endless and `'page'` in Paged. The app does not dispatch the history-producing `SET_PLAY_MODE` action. A pattern load or undo cannot reset the view, and a view change does not add an undo entry.
- The existing `TOGGLE_CELL` action addresses the selected page. An Endless pad click selects the pad's page before dispatching that action. Page selection does not add an undo entry, so the edit takes one undo.
- The app selects the audible bar when returning to Paged, before the scheduler reconciles its cursor. Paged Grid suppresses the playhead when the audio position belongs to another page. Both Endless renderers get `-1` when stopped.
- The Endless loop button changes `loopGroove` without changing Paged chain mode. Whole-groove playback preloads one instrument per track ID across all pages. The legacy iframe stays Paged because it has no view toggle.

## Acceptance and evidence

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
