# Handoff: 0001-t8b — One shared AudioContext per page (lead → codex)

- **Date:** 2026-11-28
- **Type:** dispatch
- **Ledger:** 0001 · **Spec:** docs/specs/0001-drumlet-player.md · **Plan:** docs/plans/0001-drumlet-player.md (task t8b, "Task 8b")
- **Branch:** orch/0001-t8b-shared-audio-context · **Worktree:** created by T3
- **PR:** <open as draft when done>
- **Base commit:** 3af5989 (main after #37, #38, #40, #41)
- **Port (if running a server):** 5219
- **Status:** open

## Goal
Implement plan **Task 8b** exactly as written on main: `acquireAudioContext` / `releaseAudioContext` / `setAudioActive` in new `src/audio/sharedAudioContext.ts`; `useAudioEngine` uses the one page context with its own master GainNode (+ reverb send) per engine; the player's suspend/resume/close call sites (added in #38's `usePlayerPlayback.ts`) go through the ref-counted API instead of touching the context directly.

## Context you need
- Plan Task 8b (Why, Owns, Interfaces, Tests). Spec: project stack "single shared AudioContext".
- #38 review r2 measured the current behaviour: contexts created on first Play, suspended on stop/takeover/end, closed on unmount; at most one running at a time. Keep all of that true for the shared context: it runs only while some engine is active, and closes when the last holder releases.
- The Drumlet app (`src/App.tsx` → `useAudioEngine()`) must keep working unchanged, including the custom-sample upload path and previews.
- SSR: nothing may create an AudioContext at module load; `acquireAudioContext()` is only called from Play / first sound.

## Scope
- **In:** plan Task 8b.
- **Out:** packaging (t9), demo/Playwright checks (t10), anything else.
- **Files you own:** `src/audio/useAudioEngine.ts`, `src/audio/sharedAudioContext.ts` (+ test), `src/player/**` (only the AudioContext call sites and their tests).
- **Do not touch:** `docs/wip/LEDGER.md`, `src/App.tsx`, `src/components/**` (a parallel quick item owns Cell/TrackRow/Grid there), `src/notation/**`.

## Acceptance criteria
- [ ] Plan Task 8b tests pass: 8 engines → 1 context; releasing all closes it; one active holder keeps it running while others stop; unmounting one player doesn't silence another; app engine and a player engine coexist.
- [ ] Chromium: a page with 8 `<DrumletPlayer>`s played in turn creates exactly 1 AudioContext (count via a patched `window.AudioContext` constructor in a scratch harness); it's `suspended` when nothing plays, `closed` after all unmount.
- [ ] Per-player volume/teardown isolated: stopping or unmounting player A never cuts player B's currently sounding notes.
- [ ] App: play, stop, preview a sound, upload a custom sample — all still work (manual check).

## Verify with
```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
```
Chromium via playwright-core at /home/shaun/piano-invaders/node_modules/playwright-core, executablePath ~/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell (scratch harness outside the worktree).

## Known gotchas / decisions already made
- If the plan and this handoff disagree, the plan on main wins — say so.
- iOS Safari is stricter about contexts and gestures: resume must stay inside the user gesture (the #38 code calls resume synchronously before its first await — keep that).
- GBrain: `projects/drumlet`.

## Open questions
None.

---
## Receiver ack

---
## Return (implementer → lead; fill in when done, or in a separate …-to-lead.md)
