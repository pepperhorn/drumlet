# Handoff: 0001-t6 — Endless notation (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t6, "Task 6")
- **Branch:** orch/0001-t6-endless-notation · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** e480679 (main after #33 and #34)
- **Port (if running a server):** 5216
- **Status:** open

## Goal
Implement plan **Task 6** exactly as written on main (including the note added from the t5 review): `NotationView` gains `layout?: 'wrapped' | 'endless'` and `currentGlobalStep?`; endless renders all pages as one horizontal system (or ≤ 64-bar chunks laid side by side if verovio's page width caps out), with playhead auto-follow via the existing `useAutoFollow`.

## Context you need
- Plan Task 6 + its t5-review note (memoised blocks, playhead target located in a `useLayoutEffect`, one commit per playhead step; measure render cost per step on an 8-bar groove and report it).
- **New on main since the plan was written (0003, #33):** notation is built from onsets via `src/notation/beatToEvents.ts` (each hit lasts until the next hit within its beat); `stepPositions` has an x for every grid step (interpolated inside longer notes); "Auto" bars/line fits the container width; a `NotationLoading` panel covers engine/render/slow/error. Keep all of that working in both layouts. In endless, bars/line and Auto don't apply (single system) — hide or disable those chips in endless.
- `useAutoFollow` (src/components/useAutoFollow.ts) now ignores vertical wheel (0004, #34); arrow-key focus moves still pause (owner decision).
- `EndlessGrid` (#32) is the reference for the auto-follow wiring and page-join labels; match its look for page/section labels where notation shows them.

## Scope
- **In:** everything in plan Task 6.
- **Out:** the app's Paged/Endless toggle (t7), the player component (t8). Don't wire endless into App.tsx.
- **Files you own:** `src/components/NotationView.tsx`, `src/notation/**` (incl. tests).
- **Do not touch:** `docs/wip/LEDGER.md`, `src/App.tsx`, `src/components/notationPrefetch.ts` (a parallel quick item edits those), any other file.

## Acceptance criteria
- [ ] Plan Task 6 test passes: 8 pages × 16 in `'endless'` → one system (or side-by-side chunks), `stepPositions` x strictly increasing across page joins.
- [ ] `layout` defaults to `'wrapped'`; wrapped output unchanged (existing notation tests still pass).
- [ ] Endless follows the playhead with `useAutoFollow`; `currentGlobalStep === -1` shows no playhead.
- [ ] Render cost per playhead step on an 8-bar groove reported in the return handoff (target: 1 commit/step, ≤ 10 ms).

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```
Headless Chromium for a visual check: playwright-core at /home/shaun/piano-invaders/node_modules/playwright-core, executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell (mount NotationView with layout="endless" in a scratch harness outside the worktree).

## Known gotchas / decisions already made
- If the plan and this handoff disagree, the plan on main wins — say so in your return handoff.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
