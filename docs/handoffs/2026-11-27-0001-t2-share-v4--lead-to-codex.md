# Handoff: 0001-t2 — Share codec v4 — all pages (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t2, "Task 2")
- **Branch:** orch/0001-t2-share-v4 · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** f8c05d6 (main after #28 merged)
- **Port (if running a server):** 5212
- **Status:** open

## Goal
Implement plan **Task 2** exactly as written: its Files, Interfaces (exact names and signatures), and Steps, plus the plan's Global Constraints and any Review Focus item that names this task. Share codes must carry every page and section heading (v4) while v1–v3 codes still decode as single-page grooves.

## Context you need
- Plan: Global Constraints, Review Focus, Dispatch table, Task 2. Spec sections it cites.
- Test harness exists (Vitest + jsdom, `npm test`, setup in `src/test/setup.ts`) from 0001-t1 (#28).
- Another implementer is working on a parallel task right now with disjoint files — stay strictly inside your Owns.

## Scope
- **In:** everything in Task 2.
- **Out:** every other plan task.
- **Files you own:** `src/state/shareCodec.ts`, `src/state/shareCodec.test.ts`
- **Do not touch:** `docs/wip/LEDGER.md`, any file not listed above (note needed changes in your return handoff instead).

## Acceptance criteria
- [ ] Every test named in Task 2 exists with the plan's assertions and passes.
- [ ] Interfaces exist exactly as named/typed in the plan.
- [ ] App behaviour outside this task is unchanged (manual smoke on `npm run dev -- --host 0.0.0.0 --port 5212`).
- [ ] A v3 fixture code generated from the encoder at f8c05d6 (before your change) decodes to one page with identical steps (Review Focus 4).

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
