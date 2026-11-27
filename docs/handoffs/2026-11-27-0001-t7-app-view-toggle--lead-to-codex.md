# Handoff: 0001-t7 — App Paged / Endless toggle (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t7, "Task 7")
- **Branch:** orch/0001-t7-app-view-toggle · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** d9291cc (main after #35 and #36)
- **Port (if running a server):** 5217
- **Status:** open

## Goal
Implement plan **Task 7** exactly as written on main, including its notes: a Paged / Endless keycap pair beside the notation toggle; Endless sets `playMode:'groove'` and renders `EndlessGrid` (editable) or `NotationView layout="endless"`; Paged restores today's UI; persisted under localStorage `drumlet-view-mode`; in Endless the chain button becomes the loop button (`loopGroove`).

## Context you need
- On main already: `EndlessGrid` (src/components/EndlessGrid.tsx), `NotationView` with `layout` + `currentGlobalStep` (#36), notation loads through `NotationBoundary` / `notationPrefetch` (#33, #35), transport `currentGlobalStep` / `currentPlayPage` / `seek` and mode-switch rules (#30: groove→page jumps the view to the cursor's page, page→groove continues from `currentPageIndex`).
- Notes collected from reviews (all apply to you):
  - Pass `currentGlobalStep = -1` to NotationView and EndlessGrid whenever the transport is stopped (t6 review).
  - Hide the stray paged-grid playhead when the playing page isn't the visible one, using `currentPlayPage` (t4 review).
  - Arrow-key focus moves in the endless grid pause auto-follow — owner decision, keep it.
- Visual rules: DESIGN.md and `src/styles/hardware.css`; keycaps use `.hw-btn` (+ `.hw-btn-accent` for the selected mode, `aria-pressed`), contextual class names first, ≥12 px desktop / ≥14 px mobile labels. Toggle must fit the mobile page-tabs bar at 360 px.

## Scope
- **In:** plan Task 7.
- **Out:** the player component (t8 runs in parallel), any change to EndlessGrid/NotationView/useAutoFollow internals.
- **Files you own:** `src/App.tsx`, `src/components/PageTabs.tsx`, `src/components/Transport.tsx`, plus new tests next to them (e.g. `src/appViewMode.test.tsx`) and an optional tiny helper `src/state/viewMode.ts` (+ test) for the persisted setting.
- **Do not touch:** `docs/wip/LEDGER.md`, `src/player/**`, `src/components/EndlessGrid.tsx`, `src/components/NotationView.tsx`, `src/components/useAutoFollow.ts`, `src/notation/**`.

## Acceptance criteria
- [ ] Toggle Paged ⇄ Endless in grid and in notation; choice persists across reload (try/catch around storage).
- [ ] Endless: a 4-bar stock groove plays bars 1→4, the view follows, loops (or stops when loop is off); editing a pad in endless changes the right page/step; undo works.
- [ ] Switching to Paged while playing lands on the page under the playhead; stopped → no playhead anywhere.
- [ ] Mobile 360 px: toggle fits, no horizontal overflow of the bar.
- [ ] Tests for the persisted setting and for the mode wiring (playMode dispatched, loop button maps to `loopGroove` in endless).

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```
Headless Chromium screenshots at 360 and 1280 px in both themes (playwright-core at /home/shaun/piano-invaders/node_modules/playwright-core, executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell) — list paths in the return handoff.

## Known gotchas / decisions already made
- If the plan and this handoff disagree, the plan on main wins — say so.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

I will add the persisted App view toggle, wire Endless to groove playback, editing and looping, and keep Paged aligned with the playing bar when switching back. I will verify both renderers and the mobile bar without changing the player or shared rendering internals. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
