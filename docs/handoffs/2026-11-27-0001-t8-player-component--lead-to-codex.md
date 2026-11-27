# Handoff: 0001-t8 — DrumletPlayer component (lead → codex)

- **Date:** 2026-11-27
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t8, "Task 8")
- **Branch:** orch/0001-t8-player-component · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** d9291cc (main after #35 and #36)
- **Port (if running a server):** 5218
- **Status:** open

## Goal
Implement plan **Task 8** exactly as written on main: `src/player/DrumletPlayer.tsx` (forwardRef handle `play/stop/seek`), `src/player/chrome.ts` (`resolveChrome`), `src/player/claimPlayback.ts`, `src/player/index.ts`, with the plan's props, defaults and tests. This is the component only — packaging/scoped CSS is t9.

## Context you need
- Spec §§ Component API, Chrome presets, Endless view, Default kit; spec "Calls made after builder review" (default theme light; endless always plays every page; loop = repeat whole groove).
- On main already: `resolveGroove` / `resolveGrooveAsync` / `GrooveError` (src/player/resolveGroove.ts, #31); `EndlessGrid` + `useAutoFollow` (#32, #34); `NotationView` with `layout="endless"` and `currentGlobalStep` (#36); notation lazy loading via `src/components/notationPrefetch.ts` (`loadNotation`) and `NotationBoundary` + `NotationLoading` (#33, #35); transport `useTransport(stateRef, engine, { onEnded })` with `currentGlobalStep`, `seek` (#30); kit loader `setKitBaseUrl` (#28).
- Notes collected from reviews (all apply to you):
  - Pass `currentGlobalStep = -1` to NotationView / EndlessGrid when stopped (t6 review).
  - Notation must stay a lazy chunk: import it only via `loadNotation` / `NotationBoundary`; `chrome="none"` and grid display must never fetch it (Global Constraints).
  - `assetBaseUrl` → `setKitBaseUrl(\`${assetBaseUrl}/kits/\`)`; default kit base stays as on main until t9 sets the jsDelivr default.
  - Don't import anything that touches `window`/`document`/`localStorage`/`AudioContext` at module load (SSR-safe; resolve the groove in an effect).
- Visuals: reuse the app's hardware materials (`.hw-btn`, `.hw-btn-accent`, Knob, pads) and DESIGN.md; root `<div className="drumlet-player …" data-theme=…>`. Global player constraints (no viewport units, no `position: fixed`, no viewport media queries in player code) apply to everything you write; `Cell`'s `md:`/`lg:` breakpoints are a known t9 issue — leave Cell alone.

## Scope
- **In:** plan Task 8 (component, chrome presets, claimPlayback, index exports, tests).
- **Out:** package build, scoped CSS, kit copying, jsDelivr default (t9); demo page and Playwright embed checks (t10); iframe replacement (t11); App.tsx (t7 runs in parallel).
- **Files you own:** `src/player/**` except `src/player/resolveGroove.ts` (read-only; if it needs a change, note it in your return handoff).
- **Do not touch:** `docs/wip/LEDGER.md`, `src/App.tsx`, `src/components/**`, `src/audio/**`, `src/state/**`, `src/notation/**`.

## Acceptance criteria
- [ ] All plan Task 8 tests pass: `resolveChrome` table; `claimPlayback` A then B stops A once; `chrome="minimal"` → exactly one `.drumlet-player-play-btn` and no `.transport-bar`; `chrome="none"` → `useAudioEngine` never invoked; invalid groove → `onError(GrooveError)` + `.drumlet-player-empty`, no throw; `theme="dark"` → `data-theme="dark"`.
- [ ] Review Focus 1–3: empty/garbage groove handled; two players → second stops first; unmount mid-play stops scheduling.
- [ ] `full` chrome: play/stop, BPM, loop, grid ⇄ notation, endless ⇄ paged; `view` defaults to `endless`, `display` to `grid`, `theme` to `light`.
- [ ] Importing `src/player/index.ts` in a DOM-less environment doesn't throw (test with vitest `environment: 'node'` for that one file).

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```
Mount it in a scratch page outside the worktree and screenshot `full` / `minimal` / `none` in both themes at 360 and 1024 px (playwright-core as in other handoffs); list paths in the return handoff.

## Known gotchas / decisions already made
- If the plan and this handoff disagree, the plan on main wins — say so.
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
