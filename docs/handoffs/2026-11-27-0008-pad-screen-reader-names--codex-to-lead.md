# Handoff 0008 — Screen-reader names for step pads (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0008 · [Dispatch](2026-11-27-0008-pad-screen-reader-names--lead-to-codex.md)
- Branch: `orch/0008-pad-screen-reader-names`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-3a765015-e6e6ca0b90898655`
- Base: `080505d` · Dispatch checkout: `3939539` · Acknowledgement: `b176456`
- Status: blocked · PR: none

## Goal and scope

Name each existing step pad with its track, bar, beat, step and state. Expose on/off with `aria-pressed` and keep EndlessGrid at one commit per playhead step. The dispatch limits edits to `Cell.tsx`, `TrackRow.tsx`, `EndlessGrid.tsx` (props to Cell only), their adjacent tests, and the task handoffs. No behavior changes outside naming and state exposure.

## Blockers

1. [Grid](../../src/components/Grid.tsx#L160-L167) computes `realStepsPerBeat` from the beat and step note values but [passes TrackRow](../../src/components/Grid.tsx#L566-L573) a different `stepsPerBeat` for its existing display grouping. At 4/4 with eighth-note steps and 2/4 with sixteenth-note steps, both cases pass `stepsPerBar=8` and `stepsPerBeat=1`, yet there are two and four steps per musical beat respectively. TrackRow cannot infer the right beat from its props. Passing `realStepsPerBeat` separately is a one-line change to `Grid.tsx`, which the dispatch does not authorize. The existing visual grouping can stay as-is.
2. [EndlessGrid](../../src/components/EndlessGrid.tsx#L35-L45) only renders collapsed split masters. [Cell](../../src/components/Cell.tsx#L108-L150) only renders sub-step buttons in the expanded branch. The acceptance criterion calls for sub-step pad assertions in both grids, but exposing those buttons in EndlessGrid would add an interaction outside the dispatch. Keep split-master assertions in both grids and sub-step assertions in Cell and the paged grid if the goal is to name existing pads only.

## Open questions

Can this task add one prop at the Grid → TrackRow call site and limit sub-step tests to Cell and the paged grid? That resolves both blockers without changing existing interactions.

## Verification

No implementation or tests were changed. The acceptance checks and timing measurement have not run. After scope is clarified, run the dispatch command and remeasure the 8 pages × 8 tracks × 16 steps fixture used in [Task 5](2026-11-27-0001-t5-endless-grid--codex-to-lead.md#production-profile).

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```

GBrain context: [default:projects/drumlet] confirms the project setup. The dispatch and source govern this task.
