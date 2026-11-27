# Handoff: 0001-t3 — Groove input resolver (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#component-api) · [Task 3 plan](../plans/0001-drumlet-player.md#task-3-groove-input-resolver)
- Branch: `orch/0001-t3-groove-resolver`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-530fb0b0-98c68d0755ed593d`
- PR: [#31](https://github.com/pepperhorn/drumlet/pull/31) (draft)
- Base: `aa29ff2` (Task 4 merge) and `95c8916` (dispatch)
- Status: ready for review

## Goal and scope

Resolve a stock ID, a `.dottl` project, or a share code or URL to a complete `SequencerState`, and report failures through `GrooveError`. This branch changes only the two resolver files and the handoffs. The app, stock catalog, codecs, and ledger are unchanged. See the [dispatch handoff](2026-11-27-0001-t3-groove-resolver--lead-to-codex.md) for the owned files and scope.

## Acceptance and evidence

- The named interfaces are exported. The 10 resolver tests cover stock bar count and track IDs, both share forms and the embed URL, a `.dottl` export of the Funky Drummer preset, and the three error codes.
- A v4 share with no pages or no tracks and a `.dottl` project with no pages or no tracks each throw `GrooveError` with code `empty`.
- An isolated Vite build put the stock JSON in a dynamic chunk. The built resolver imported in Node without browser globals. After removing that chunk, a raw share code, a wrapped share code, and a `.dottl` project still resolved. Loading a stock ID returned a typed error.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npx eslint src && npm run build && npm test
```

After orch-deslop:

```text
typecheck: tsc --noEmit (exit 0)
lint: 2 problems (0 errors, 2 warnings)
eslint src: 2 problems (0 errors, 2 warnings)
build: 202 modules transformed, build passed
Test Files  5 passed (5)
     Tests  137 passed (137)
```

The lint warnings are in AuthModal. Vite reports Verovio externalization and large chunks. npm reports 19 audit findings. No dependencies changed.

## Decisions made

- `resolveGrooveAsync` loads the catalog for explicit stock inputs and bare strings that match the stock generator's ID grammar. `resolveGroove` can look up stock IDs after `loadStockRhythms()` has finished. An unknown explicit stock ID is `not-found`. An untagged string that matches neither format is `invalid`.
- The plan refers to `initialState`. This branch uses the reducer's exported `createInitialState()` factory. The bundled presets are legacy entries, so the test converts Funky Drummer through the existing preset loader and serializer before passing it to the resolver.
- GBrain: `projects/drumlet` confirms the protected-main workflow. The spec, plan, and dispatch govern this task.

## Return

- Outcome: done, ready for review
- Receiver acknowledgment: `3e7cebd`
- Implementation: `eb89f00` and `2bbe476`
- Orch-deslop removed duplicate empty-state handling and made the missing-ID test compare tagged and untagged inputs directly. The full verification passed again.
- Out of scope: the existing `.dottl` serializer omits custom kit IDs and sample keys. The resolver cannot recover fields absent from the file.
- Follow-ups: Task 8 should use `resolveGrooveAsync` and report typed failures through its empty state and `onError`. Task 9 owns SPDX headers for existing shared sources and should verify the chunk split again at the package entry.
- Open questions: none
