# Handoff: 0001-t3 — Groove input resolver (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t3, "Task 3")
- **Branch:** orch/0001-t3-groove-resolver · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** aa29ff2 (main after #29 and #30 merged)
- **Port (if running a server):** 5213
- **Status:** open

## Goal
Implement plan **Task 3** exactly as written on main (Files, Interfaces with exact names/signatures, Steps), plus the plan's Global Constraints and any Review Focus item naming this task. Any of the three groove formats (stock id, .dottl object, share code or share URL) resolves to a complete SequencerState, or throws a typed GrooveError.

## Context you need
- Plan: Global Constraints, Review Focus, Dispatch table, Task 3. Spec sections it cites.
- Already on main: Vitest harness (`npm test`), format-aware kit loader (t1), share codec v4 with shared track table + stable track ids (t2), transport groove play-through with `currentGlobalStep`, `currentPlayPage`, `seek(globalStep)`, `toGlobalStep`/`fromGlobalStep` in `src/audio/playPosition.ts`, optional `playMode`/`loopGroove` read as `?? 'page'` / `?? true` (t4).
- Another implementer is working on a parallel task right now with disjoint files — stay strictly inside your Owns.


## Scope
- **In:** everything in Task 3.
- **Out:** every other plan task.
- **Files you own:** `src/player/resolveGroove.ts`, `src/player/resolveGroove.test.ts`, `src/state/stockRhythms.ts` (lazy-load helper only)
- **Do not touch:** `docs/wip/LEDGER.md`, any file not listed above (note needed changes in your return handoff instead).

## Acceptance criteria
- [ ] Every test named in Task 3 exists with the plan's assertions and passes.
- [ ] Interfaces exist exactly as named/typed in the plan.
- [ ] App behaviour outside this task is unchanged.
- [ ] A v4 share payload with zero pages, and a dottl with zero tracks, both throw `GrooveError` code `empty` (Review Focus 1; t2 review left zero-page handling to this task).
- [ ] The stock-rhythm manifest is not in the module graph of `resolveGroove.ts` except via dynamic `import()`.

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

I’ll resolve stock IDs, .dottl projects, and share codes or URLs into complete sequencer state. The synchronous resolver will use an already-loaded stock catalog. The asynchronous resolver will load it on demand, and both will reject invalid or empty grooves with typed errors. I’ll change only the resolver, its tests, and the stock loader helper. No open questions.

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
