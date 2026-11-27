# Handoff: 0001-t5 — Endless grid + auto-follow (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t5, "Task 5")
- **Branch:** orch/0001-t5-endless-grid · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** aa29ff2 (main after #29 and #30 merged)
- **Port (if running a server):** 5215
- **Status:** open

## Goal
Implement plan **Task 5** exactly as written on main (Files, Interfaces with exact names/signatures, Steps), plus the plan's Global Constraints and any Review Focus item naming this task. All pages render side by side in one horizontal row with page-join markers, and the playhead auto-scrolls to stay in view until the user scrolls manually.

## Context you need
- Plan: Global Constraints, Review Focus, Dispatch table, Task 5. Spec sections it cites.
- Already on main: Vitest harness (`npm test`), format-aware kit loader (t1), share codec v4 with shared track table + stable track ids (t2), transport groove play-through with `currentGlobalStep`, `currentPlayPage`, `seek(globalStep)`, `toGlobalStep`/`fromGlobalStep` in `src/audio/playPosition.ts`, optional `playMode`/`loopGroove` read as `?? 'page'` / `?? true` (t4).
- Another implementer is working on a parallel task right now with disjoint files — stay strictly inside your Owns.
- Review notes from t4 for you: drive the playhead from `currentGlobalStep` (already audio-clock timed); a value of -1 means no playhead yet.

## Scope
- **In:** everything in Task 5.
- **Out:** every other plan task.
- **Files you own:** `src/components/EndlessGrid.tsx`, `src/components/EndlessGrid.test.tsx`, `src/components/useAutoFollow.ts`, `src/components/useAutoFollow.test.ts`, `src/styles/hardware.css` (page-join marker styles only)
- **Do not touch:** `docs/wip/LEDGER.md`, any file not listed above (note needed changes in your return handoff instead).

## Acceptance criteria
- [ ] Every test named in Task 5 exists with the plan's assertions and passes.
- [ ] Interfaces exist exactly as named/typed in the plan.
- [ ] App behaviour outside this task is unchanged.
- [ ] Reuses the existing `Cell` component (silicone pads, playhead flare) unchanged.
- [ ] Track labels stay visible (sticky left column) while the row scrolls horizontally.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

## Known gotchas / decisions already made
- If the plan text and this handoff disagree, the plan on main wins — say so in your return handoff.
- Every JSX element gets a contextual kebab-case class name first (CLAUDE.md); visuals follow DESIGN.md and `src/styles/hardware.css`.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

I will render all pages in one strip with sticky track labels, page joins, and the existing silicone cells. The audio-clock global step drives the playhead. Manual input pauses auto-follow until resume or the next play. I will test editing and read-only seek, stay within the Task 5 files, and leave app and player wiring to later tasks. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
