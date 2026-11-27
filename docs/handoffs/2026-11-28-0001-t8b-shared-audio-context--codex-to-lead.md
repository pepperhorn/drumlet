# Handoff: 0001-t8b — One shared AudioContext per page (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Task 8b](../plans/0001-drumlet-player.md#task-8b-one-shared-audiocontext-per-page-added-2026-11-27-from-t8-review)
- Dispatch: [Lead handoff](2026-11-28-0001-t8b-shared-audio-context--lead-to-codex.md)
- Branch: `orch/0001-t8b-shared-audio-context`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-923c1466-b5e9140f861de063`
- PR: [Draft for this branch](https://github.com/pepperhorn/drumlet/pulls?q=is%3Apr%20head%3Aorch%2F0001-t8b-shared-audio-context)
- Base: `3af5989` (player code), `d9f23f2` (dispatch)
- Port: 5219 (stopped)
- Status: ready for review
- Commits: `f25a8a9` acknowledgment, `1479438` implementation

## Goal and scope

App and player engines acquire one AudioContext on first audio use. Each engine has a master gain and its own reverb. The player still uses the existing one-player-at-a-time claim.

Only the two handoffs, `src/audio/useAudioEngine.ts`, `src/audio/sharedAudioContext.ts` and its test, plus `src/player/usePlayerPlayback.ts` and its tests changed. The ledger, app and transport call sites, components, notation, packaging, and demo stay unchanged.

## Acceptance and evidence

- [x] Eight engines acquire one lazy context. Player stop and natural end deactivate that engine. The final acquisition holder's unmount closes the context.
- [x] Chromium 158.0.8127.18 started eight real players in turn. The patched constructor counted one context and the graph had eight separate master gains. The context was suspended after the last stop and closed after all players unmounted.
- [x] Chromium measured a nonzero signal from B after stopping and removing A. A's master disconnected without a context suspend. A separate run played the app and a player on one context and measured the app signal after the player stopped and unmounted.
- [x] Chromium drove the actual app controls. Stop halted note scheduling. A Sound Source preview produced a nonzero signal. A dropped 0.2 s WAV decoded, appeared in Pads mode, and played a nonzero signal.

## Verify with

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test
node /tmp/drumlet-t8b.NA6bz9/audio.mjs
```

Run from the worktree root. The scratch harness starts its own local Vite server on 5219 and uses the Chromium and playwright-core paths from the dispatch. It intercepts the test document, blocks external requests, and measures native audio nodes.

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 1.04s
 Test Files  20 passed (20)
      Tests  249 passed (249)
8 players: 1 context, 8 master gains, idle: suspended
After unmount: [ 'closed' ]
App and player: { contexts: 1, decodedWavSeconds: 0.2, final: 'closed' }
```

Lint still reports two `AuthModal.tsx` hook warnings. Vite still reports Verovio's browser externalization and large chunks. The first scratch run emitted Vite console-forwarding errors with WebSocket disabled. Disabling console forwarding in the scratch server fixed that without a repo config change.

The orch-deslop pass removed a redundant transition field and guard and wrapped the queued load call. The full verify block passed again.

## Decisions made

- Track context ownership separately from active playback. A stopped player retains its lease and decoded instruments for replay. Stop mutes the engine's master and stops its voices. Unmount disconnects that graph and releases its lease.
- Route both dry output and the engine's reverb return through the same master. The context can stay running without leaving a stopped player's reverb audible.
- Submit resume before the first await on Play, including when suspend is pending. The engine awaits that transition before scheduling.
- The app keeps its existing audio readiness after Tap to Start. Its transport stops scheduling, but the app's engine stays active for edits and previews until app unmount. Player stop never withdraws the app's active ID.
- Skip deferred kit loads for an unmounted player and discard instruments that finish loading after their engine releases its graph.

## Known gotchas and follow-ups

GBrain: `[default:projects/drumlet]` records Drumlet's protected-main PR workflow. The repo plan governs the audio lifecycle.

No open scope questions. The Chromium checks measure the graph, not playback on physical hardware or Safari. The scratch harness tests the app and player sharing source modules. The packaged host build and embed checks remain Tasks 9 and 10.
