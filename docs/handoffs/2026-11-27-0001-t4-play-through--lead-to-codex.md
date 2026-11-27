# Handoff: 0001-t4 — Transport play-through, loop, seek, global step (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t4, "Task 4")
- **Branch:** orch/0001-t4-play-through · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** f8c05d6 (main after #28 merged)
- **Port (if running a server):** 5214
- **Status:** open

## Goal
Implement plan **Task 4** exactly as written: its Files, Interfaces (exact names and signatures), and Steps, plus the plan's Global Constraints and any Review Focus item that names this task. Groove mode plays through all pages with loop/stop-at-end; page mode keeps today's chain behaviour exactly.

## Context you need
- Plan: Global Constraints, Review Focus, Dispatch table, Task 4. Spec sections it cites.
- Test harness exists (Vitest + jsdom, `npm test`, setup in `src/test/setup.ts`) from 0001-t1 (#28).
- Another implementer is working on a parallel task right now with disjoint files — stay strictly inside your Owns.

## Scope
- **In:** everything in Task 4.
- **Out:** every other plan task.
- **Files you own:** `src/audio/playPosition.ts`, `src/audio/playPosition.test.ts`, `src/audio/useTransport.ts`, `src/audio/useTransport.test.tsx`, `src/state/sequencerReducer.ts` (new fields `playMode`, `loopGroove` + actions `SET_PLAY_MODE`, `SET_LOOP_GROOVE` only)
- **Do not touch:** `docs/wip/LEDGER.md`, any file not listed above (note needed changes in your return handoff instead).

## Acceptance criteria
- [ ] Every test named in Task 4 exists with the plan's assertions and passes.
- [ ] Interfaces exist exactly as named/typed in the plan.
- [ ] App behaviour outside this task is unchanged (manual smoke on `npm run dev -- --host 0.0.0.0 --port 5214`).
- [ ] Unmount during playback clears the scheduler and rAF; no notes after unmount (Review Focus 3).
- [ ] Paged mode with chain on/off behaves exactly as before.

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

## Known gotchas / decisions already made
- Plan amendments land on main; if the plan text and this handoff disagree, the plan on main wins — say so in your return handoff.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
