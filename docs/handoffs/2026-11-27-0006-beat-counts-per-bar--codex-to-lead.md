# Handoff: 0006 — Notation beat counts restart each bar (Codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0006 · Spec and plan: none (quick item S18)
- Branch: `orch/0006-beat-counts-per-bar`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-93fdfb4d-6e73e0bc7bf9b500`
- Base commit: `080505d`
- Status: open for review

## Goal

Restart the notation count at 1 in each bar in wrapped and endless layouts.

## Context

[Dispatch handoff](2026-11-27-0006-beat-counts-per-bar--lead-to-codex.md) · [Ledger item and S18](../wip/LEDGER.md)

## Scope

- In: the `NotationCounts` overlay and its call site in `src/components/NotationView.tsx`, plus `src/components/notationCounts.ts` and `src/components/notationCounts.test.ts`.
- Out: staff engraving, positions, styling, playback, and the renderer test owned by 0007.

## Acceptance criteria

- [x] Two bars of 4/4 at sixteenth-note subdivision repeat `1 e & a 2 e & a 3 e & a 4 e & a`.
- [x] Two-bar tests cover 3/4 and 6/8 using Drumlet's existing beat definition.
- [x] A jsdom check with stubbed staff geometry confirmed the same counts in two wrapped systems and one endless strip.
- [x] No elements or classes changed. The three owned source files account for 48 changed lines.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npx eslint src && npm run build
npm test
# If tests hit the default five-second limit:
npm test -- --testTimeout=30000
```

## Decisions made

The count helper takes the zero-based beat index and uses the view's `beatsPerBar`. Only the displayed number wraps. Positioning still uses the absolute beat index, and subdivision syllables stay the same.

GBrain project context: `projects/drumlet`. The task scope comes from the repository handoff.

## Open questions

None for 0006. Task 0007 owns the renderer-test timeout. On the final default-timeout run, three staff-renderer tests and one notation-loading test timed out. No assertion failed in the new count tests.

## Return

- Outcome: done
- PR: draft against `main`, linked in the handback
- Commits: `9687fbf` acknowledgement, `8e170ce` implementation
- Verification output after `orch-deslop` (no code cleanup needed):

```text
npm ci: added 271 packages
tsc --noEmit: exit 0
eslint . and eslint src: 0 errors, 2 existing AuthModal warnings each
vite build: ✓ built in 5.75s
vitest run --testTimeout=30000:
 Test Files  13 passed (13)
      Tests  197 passed (197)
```

The separate layout check passed all five tests, including the three count cases and the two DOM checks. Its temporary fixture is not part of the diff.
