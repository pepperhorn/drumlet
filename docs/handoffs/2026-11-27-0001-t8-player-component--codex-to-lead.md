# Handoff: 0001-t8 — DrumletPlayer component (codex → lead)

- Date: 2026-11-27
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md) · [Task 8 plan](../plans/0001-drumlet-player.md#task-8-drumletplayer-component) · [Dispatch](2026-11-27-0001-t8-player-component--lead-to-codex.md)
- Branch: `orch/0001-t8-player-component`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-420cbbfc-51ed2bd0b49a27aa`
- PR: [#38](https://github.com/pepperhorn/drumlet/pull/38)
- Base: `d9291cc` (code), `9024a38` (dispatch)
- Port: 5218, stopped
- Status: ready for review

## Goal and scope

Render and play a supplied groove without the app shell. The diff adds the player entry, its controls and playback lifecycle, and tests under `src/player/`. It changes only those files and the two task handoffs. The groove resolver, app, audio engine, shared components, ledger, and package build are unchanged.

## Acceptance and evidence

- Full chrome has playback, tempo, loop, Grid/Notation and Endless/Paged. Minimal has one play keycap. None mounts no audio engine. It defaults to grid and shows a static score when the host requests notation.
- Tests cover empty projects, invalid share codes, the environment without DOM globals, theme placement, ref controls, one-player ownership during playback and sample preparation, retry after an audio error, whole-groove end, and scheduler cleanup on unmount.
- Headless Chromium rendered the default endless grid in all 12 combinations of chrome, theme and width. At 360 px the grid was 334 px inside a 336 px player. At 1024 px it was 998 px inside a 1000 px player. The horizontal strip did not widen the host document. All 12 grid mounts fetched neither kit nor notation files.
- Chromium rendered the real wrapped and endless scores, loaded acoustic samples from the custom and default paths (HTTP 200), and recorded two-way playback takeover with no new sample starts from the previous player. Unmount closed the first player's active context. This was a browser graph check, not a listening test.
- The scratch page set the document theme so it could use the app's current hardware styles. Independent host/player CSS is Task 9 and was not verified here.

### Screenshots

Files are on this machine under `/tmp/drumlet-t8.xHjCJb/`.

| Chrome / theme | 360 px | 1024 px |
|---|---|---|
| Full light | `full-light-360.png` | `full-light-1024.png` |
| Full dark | `full-dark-360.png` | `full-dark-1024.png` |
| Minimal light | `minimal-light-360.png` | `minimal-light-1024.png` |
| Minimal dark | `minimal-dark-360.png` | `minimal-dark-1024.png` |
| None light | `none-light-360.png` | `none-light-1024.png` |
| None dark | `none-dark-360.png` | `none-dark-1024.png` |

## Verify with

```bash
export VITEST_MAX_WORKERS=2
npm ci && npm run typecheck && npm run lint && npm run build && npm test -- --testTimeout=30000
git diff --check main...HEAD
```

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 12.15s
Test Files  15 passed (15)
Tests  213 passed (213)
```

The default 5-second timeout failed in the existing notation suite under host load. The retry used two workers and a 30-second timeout. The minimal-chrome test now preloads the stock catalog so its UI assertion cannot race a cold import. Vitest configuration is unchanged. Lint reports the two existing `AuthModal.tsx` warnings. The build reports the existing Verovio externalization and chunk-size warnings.

Orch-deslop removed unused callback forwarding, combined the track split into one pass, and replaced the cast empty-project fixture with a serialized one.

## Review round 2

[Round 1 review](https://github.com/pepperhorn/drumlet/pull/38#pullrequestreview-6086841176) reproduced playback stopping on the first host render with an inline groove object.

- The regression tests cover equal inline stock and share wrappers, a Dottl project with reordered keys, host state updates from `onStep`, and reloading a different groove. The original head failed the equality and step-update tests.
- Chromium kept the inline share playing through both step-driven and unrelated host updates. It observed the previous context suspend on takeover and resume on replay. A different groove fired `onReady` again and closed the old context.
- Chromium created no AudioContext and fetched no kit for either static display. Grid fetched no notation. Explicit notation rendered a score without a transport or playhead. The screenshot is at `/tmp/drumlet-t8-r2.q2qzz3/none-notation.png`.

Orch-deslop separated the key type from the input type and tightened the host-step assertion. Typecheck, lint, build, and all 220 tests passed against the unchanged dependency install. The suite used the same worker and timeout flags as round 1. Only the existing warnings remained.

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 11.13s
Test Files  15 passed (15)
Tests  220 passed (220)
```

## Decisions and known gotchas

- The player keys resolution by groove value. Stock and share wrappers use their values and Dottl uses JSON with sorted object keys. A host can create equal inputs in render without restarting playback.
- Stop, takeover, and natural end suspend the instance context. Play requests resume on the user gesture, even if the previous suspend has not settled.
- Lead decision for `chrome="none"` overrides the original no-notation wording. Default grid makes no notation request. Explicit `display="notation"` lazily loads a static score without an audio engine or transport.
- The audio hook mounts only for full and minimal. Playback starts after instruments from all pages are ready. A request loses the right to start as soon as a second player claims playback, even if the first is still loading samples.
- Paged grid uses the shared read-only EndlessGrid with one visible page. It follows the playing page and exposes page buttons. The view toggle changes display, not playback order or loop scope.
- Smplr's default stop raised a non-finite release error on acoustic samples in Chromium. The player uses `stop({ time: 0 })` before takeover, end, and disconnect. The rerun stopped the samples and started the next player.
- The kit loader uses a module-level base for both manifest and sample lookup. The player queues kit preparation and restores the previous base after its loads settle. This coordinates two players, not an independent app caller of the kit loader.
- GBrain: `projects/drumlet` confirms the repository and protected-main workflow. The dispatch, plan and spec govern this task.

## Open questions and follow-ups

- Task 0009 owns the shared AudioContext work. Task 8 leaves the engine unchanged and manages private contexts. When switching to shared audio, move suspend and close ownership out of the individual player so an old player cannot suspend or close the active shared context.
- Task 9 owns scoped styles, package verification, and the default kit CDN URL. Task 10 owns package-level browser checks. Safari and physical devices were not tested.

## Return

- Outcome: Round 1 findings addressed, ready for re-review.
- Commits: `397fd9e` acknowledgement and `5f386b0` implementation, and `87d4c4a` cleanup.
