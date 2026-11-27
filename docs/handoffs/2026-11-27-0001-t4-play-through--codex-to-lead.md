# Handoff for 0001-t4 — transport play-through, loop, seek, and global step

- Date: 2026-11-27
- Type: return (Codex → lead)
- Ledger: 0001
- Branch: `orch/0001-t4-play-through`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-eeb54834-d9f137a9d21066a6`
- PR: [draft PR for this branch](https://github.com/pepperhorn/drumlet/pulls?q=is%3Apr+head%3Aorch%2F0001-t4-play-through)
- Base: `f8c05d6` plus dispatch docs at `a947869`
- Status: ready for review

## Goal and context

Add whole-groove playback, looping or natural stop, and global-step seeking and reporting. Keep the app's paged loop and chain behavior. See the [spec](../specs/0001-drumlet-player.md), [plan and Task 4](../plans/0001-drumlet-player.md#task-4-transport-play-through-loop-seek-global-step), and [dispatch and receiver acknowledgment](2026-11-27-0001-t4-play-through--lead-to-codex.md).

## Scope

- Owned: `src/audio/playPosition.ts`, `src/audio/playPosition.test.ts`, `src/audio/useTransport.ts`, `src/audio/useTransport.test.tsx`, and the two playback fields and actions in `src/state/sequencerReducer.ts`.
- Out of scope: share, serialization, app controls, audio engine changes, and the ledger.

## Acceptance and verification

- Six position tests cover page boundaries, chain off/on, groove repeat/end, and global-step conversion.
- Eight hook and reducer tests cover playback modes, seeking, natural end, state defaults, and cleanup. One test unmounts during playback and asserts that both timers clear and no more notes are submitted. A second unmounts while the context is still resuming.
- In the app at port 5214, loaded the four-bar Basic 8th-Note Rock groove in paged mode. In chain mode the selected bar went 1 → 2 → 3 → 4 → 1. With chain off, Bar 2 stayed selected through two bar lengths while the playhead moved. Stop cleared the playhead. This checks browser behavior, not listening quality.

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
npm run dev -- --host 0.0.0.0 --port 5214 --strictPort
```

Post-cleanup verification exited 0. Lint reported two existing hook warnings in `AuthModal.tsx`. Vite built with chunk-size and Verovio compatibility warnings.

```text
added 271 packages, and audited 272 packages in 21s
✖ 2 problems (0 errors, 2 warnings)
✓ built in 3.32s
 Test Files  3 passed (3)
      Tests  106 passed (106)
```

## Decisions made

- The lead approved optional `playMode?: PlayMode` and `loopGroove?: boolean` so existing state constructors and saved states need no changes. The reducer factories set `'page'` and `true`, and the transport applies those same defaults when either field is absent. Task 4 does not depend on Task 2.
- Groove playback starts on page zero unless a seek has set a start position. It uses the audio clock for the playhead and calls `onEnded` at the end of the last step, not when the scheduler first submits that step. In paged mode the app still follows the page-advance callback.
- Seek changes the next scheduled position. Stop and unmount prevent further submissions. The engine does not expose handles for retracting notes already submitted in the lookahead window.
- GBrain: unavailable (MCP transport closed). This return note holds the decision for the lead.

## Return

- Outcome: implementation complete.
- Receiver acknowledgment: `387341f`.
- Implementation: `0bcc158`.
- Open questions: none. Tasks 7 and 8 own the app/player wiring. Groove playback callers need instruments loaded for all playable pages.
