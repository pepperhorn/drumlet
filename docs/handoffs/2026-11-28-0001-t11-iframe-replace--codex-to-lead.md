# Handoff: 0001-t11 — Replace the iframe embed (codex → lead)

- Date: 2026-11-28
- Type: return
- Ledger: 0001 · [Spec](../specs/0001-drumlet-player.md#replacing-the-iframe-embed) · [Task 11](../plans/0001-drumlet-player.md#task-11-replace-the-iframe-embed) · [Dispatch](2026-11-28-0001-t11-iframe-replace--lead-to-codex.md)
- Branch: `orch/0001-t11-iframe-replace`
- Worktree: `/home/shaun/.t3/worktrees/drumlet/t3-3f7aa9be-0fbe799fa197d659`
- Base: `f2cfd53` (player package build) · `1c1a370` (dispatch)
- Commits: `4885890` (ack) · `f7e3322` (implementation) · `f8a4b78` (round 2)
- Port: 5211 (stopped)
- PR: [#45](https://github.com/pepperhorn/drumlet/pull/45) · [Round 1 review](https://github.com/pepperhorn/drumlet/pull/45#pullrequestreview-6095555958)
- Status: draft, round 2.

## Goal and scope

Plain `?embed=1#s=…` links open a read-only DrumletPlayer with full chrome and endless view. Invalid and unknown-version share codes show the player's error. Plugin and challenge shares still mount App. The Share modal keeps its share link and embed URL and gives the React/npm and iframe snippets separate copy buttons.

The diff stays within the two handoffs, `src/main.tsx`, `src/player/EmbedPage.tsx` and its test, `src/components/ShareModal.tsx`, the snippet builders and shared hash parser in `src/state/shareCodec.ts` and their tests, `scripts/embed-route.check.mjs`, and one script key in `package.json`. Task 10 files, package build, and ledger are unchanged.

## Round 2

- Route malformed and unknown-version share codes to DrumletPlayer. Both fixtures show the existing error alert, with no App request or uncaught exception. The challenge fixture proves the request matcher can see App.
- Reuse `readShareCode` for both routes. The React snippet uses the README's `npm install` command, imports and punctuation, with the current pattern's share code.
- Start the App import immediately for non-embed loads, in parallel with React DOM. The entry JS shrank from 197 kB in round 1 to 19 kB uncompressed. App still follows the entry.

### Normal app startup

Compared production builds of main `46917daa71628f47ea1cf219ce7ada1492899fce` and round 2 at `/`. The table uses the quieter confirmation run, with 10 fresh, alternating Chromium pairs per profile after two warmup pairs. The server sent gzip, cache was off, external requests were blocked, and the viewport was 1280×800. Commit measures DOM insertion of `.drumlet-app`. Render uses the second animation-frame callback after insertion as a proxy for the first rendered frame. FCP is Chromium's first contentful paint.

| Profile | Variant | App DOM commit | First rendered frame | FCP | Critical JS request start → end |
| --- | --- | ---: | ---: | ---: | --- |
| Loopback | Main | 299 ms | 398 ms | 488 ms | App in entry 11 → 27 ms |
| Loopback | Round 2 | 305 ms | 414 ms | 498 ms | Entry 12 → 20 ms, App 49 → 63 ms, React DOM client 51 → 71 ms |
| 40 ms latency, 30 Mbps | Main | 601 ms | 688 ms | 762 ms | App in entry 51 → 382 ms |
| 40 ms latency, 30 Mbps | Round 2 | 608 ms | 694 ms | 766 ms | Entry 51 → 101 ms, App 111 → 428 ms, React DOM client 114 → 242 ms |

Values are medians. The per-pair median commit/render/FCP moved +8/+7/+2 ms on loopback and +8/+7/+8 ms on the shaped network. An earlier 14-pair run under heavy CPU contention measured +340 ms paired FCP on the shaped network. The size of that delta did not reproduce, but both runs show the same extra request hop. The bootstrap does not meet the no-extra-hop startup requirement. A generated, conditional preload in HTML or the Vite build would let the normal route request App before the entry executes. Both files were left untouched as directed. The script and raw runs are `/tmp/drumlet-t11-startup.mjs`, `/tmp/drumlet-t11-startup-measurements.json` (confirmation), and `/tmp/drumlet-t11-startup-contended.json`.

## Acceptance and verification

```bash
npm ci && npm run typecheck && npm run lint && npm run build && npm test && npm run check:embed-route
```

Round 2 output after orch-deslop:

```text
✖ 2 problems (0 errors, 2 warnings)
✓ built in 1.11s
Test Files  21 passed (21)
     Tests  256 passed (256)
PASS v3 mounts the player, loads the local kick and advances playback
PASS v4 renders all three pages and 48 steps in the endless view
PASS 360×400 iframe is filled and only the grid scrolls horizontally
PASS embed defaults to light on a dark system and accepts ?theme=dark
PASS challenge metadata opens the full app’s challenge setup
PASS garbage and unknown-version codes show the player error without requesting App
PASS both Share modal embed buttons copy their snippets at 360×500
```

The browser check fetched the local acoustic1 kick with HTTP 200, observed at least two buffer starts in a running AudioContext, and saw the playhead reach step 5. Unit tests cover v1 and v2 read-only grids and both snippet builders. Lint reports the two existing `AuthModal` hook warnings. The build reports Verovio externalization and large chunks.

## Decisions and known gotchas

- The dispatch amendments win. EmbedPage omits `assetBaseUrl` to use the app’s `/samples/` path. Task 11 owns `check:embed-route`.
- App and EmbedPage load separately. Plain embeds do not need the full App chunk. Load order still gives valid `#dottl=` links precedence.
- The theme query applies to the iframe document and player without changing the saved app theme. Missing or unrecognized values use light.
- Chromium uses the repository’s playwright-core when present and the handoff’s sibling install otherwise. Set `CHROMIUM_PATH` to override the pinned browser executable.
- GBrain: `projects/drumlet` records the protected-main PR workflow. The dispatch governs Task 11.

## Return

Outcome: routing and snippet fixes ready for exact-head review. Normal startup still has a hop and measured slower under the shaped profile. Removing the hop needs a lead-owned change to the HTML or Vite build. The lead can promote the shared sample-path decision to GBrain if it is useful for other hosts.
